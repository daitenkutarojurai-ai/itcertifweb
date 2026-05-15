#!/usr/bin/env node
/**
 * scripts/gen-paths.js
 *
 * Generates Duolingo-style learning paths from existing question packs.
 * Reads /data/free/<pack>.json, groups questions by their primary tag,
 * picks top 5-7 tags as chapters, fills each chapter with concept +
 * quiz + sub-boss nodes, ends with a final-boss mock exam.
 *
 * Output: /data/paths/<pack>.json
 *
 * Run:  node scripts/gen-paths.js
 * Re-runs are idempotent: existing paths are overwritten cleanly.
 */
const fs = require('fs');
const path = require('path');
const { buildYesNoPrompt, canYesNoify } = require('../src/yesno-prompt.js');

const PACKS_DIR = path.join(__dirname, '..', 'data', 'free');
const OUT_DIR = path.join(__dirname, '..', 'data', 'paths');
const CONCEPT_LIB_PATH = path.join(__dirname, '..', 'data', 'concept-library.json');

/* Hand-authored teaching content keyed by primary chapter tag.
   Missing tag → falls back to auto-derived flashcards (full question
   stem + explanation, no truncation). See data/concept-library.json
   for the source. */
let CONCEPT_LIBRARY = {};
try {
  const raw = JSON.parse(fs.readFileSync(CONCEPT_LIB_PATH, 'utf8'));
  delete raw._meta;
  CONCEPT_LIBRARY = raw;
} catch (e) {
  console.warn('  ⚠ concept-library.json missing or invalid — using auto-derived only');
}

const TARGET_CHAPTERS = 6;        // 5-7 is the sweet spot
const QUIZ_NODE_SIZE = 5;         // questions per quiz node
const SUBBOSS_NODE_SIZE = 12;     // sub-boss = harder, more questions
const MIN_QS_PER_CHAPTER = 6;     // need at least this many to form a chapter
const FINAL_BOSS_MAX = 30;        // hard ceiling — final boss caps at 30 Qs
const FINAL_BOSS_PCT = 0.30;      // soft target — ~30% of the pack
const FINAL_BOSS_MIN = 15;        // need at least this many to feel like a boss

function loadPack(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`  skip (parse error): ${path.basename(file)}`);
    return null;
  }
}

function groupByPrimaryTag(questions) {
  const groups = new Map();
  for (const q of questions) {
    const primary = (q.tags && q.tags[0]) || 'fundamentals';
    if (!groups.has(primary)) groups.set(primary, []);
    groups.get(primary).push(q);
  }
  return groups;
}

function pickChapters(groups, allQuestions) {
  // First attempt: tag-based chapters
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const chapters = [];
  const overflow = [];
  for (const [tag, qs] of sorted) {
    if (chapters.length < TARGET_CHAPTERS && qs.length >= MIN_QS_PER_CHAPTER) {
      chapters.push({ tag, questions: qs });
    } else {
      overflow.push(...qs);
    }
  }
  if (overflow.length >= MIN_QS_PER_CHAPTER) {
    chapters.push({ tag: 'mixed-topics', questions: overflow });
  }

  // Fallback: tags too sparse (everything ends in one chapter) → split
  // questions into N even chunks so the path still feels chapter-y
  if (chapters.length < 2 && allQuestions.length >= 12) {
    const targetChunks = allQuestions.length >= 30 ? 4 : 3;
    const chunkSize = Math.ceil(allQuestions.length / targetChunks);
    const fallback = [];
    for (let i = 0; i < allQuestions.length; i += chunkSize) {
      const slice = allQuestions.slice(i, i + chunkSize);
      if (slice.length >= 4) {
        fallback.push({
          tag: `part-${fallback.length + 1}`,
          questions: slice
        });
      }
    }
    return fallback;
  }

  return chapters;
}

function tagToTitle(tag) {
  return tag
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(Aws|Cli|Iam|Sql|Vpc|Ec2|S3|Rds|Kms|Sso|Rbac|Cidr|Vlan|Tcp|Udp|Bgp|Ospf|Dns|Tls|Ssl|Mfa|Ddos|Api|Cors|Csrf|Xss|Url|Cdn|Cpu|Gpu|Ram|Ssd|Os|Kvm|Vm|Tcp|Udp|Saml|Oidc|Aes|Rsa|Sha|Md5)\b/gi, m => m.toUpperCase());
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildChapter(chap, chapIndex) {
  const title = tagToTitle(chap.tag);
  const nodes = [];

  // 1) Concept-card node introducing the chapter.
  //
  // Preference order:
  //   (a) Hand-authored content from data/concept-library.json. We first
  //       try the chapter's primary tag (chap.tag). If that doesn't hit,
  //       we count tag occurrences across every question in the chapter
  //       (including secondary/tertiary tags) and pick the most-frequent
  //       tag that has a library entry. This lets authored content for
  //       "dns" surface on a chapter primarily tagged "networking" if
  //       most of its questions also carry "dns" as a secondary tag.
  //   (b) Fallback: derive from the first few questions in the chapter,
  //       using the FULL question stem (no 80-char slice — that was
  //       cutting off in the middle of words like "...build, train, and
  //       de?"). The explanation is the back of the card.
  let libEntry = CONCEPT_LIBRARY[chap.tag];
  let matchedTag = libEntry ? chap.tag : null;
  if (!libEntry) {
    const tagFreq = {};
    for (const q of chap.questions) {
      for (const t of (q.tags || [])) {
        if (CONCEPT_LIBRARY[t]) tagFreq[t] = (tagFreq[t] || 0) + 1;
      }
    }
    const sortedTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]);
    if (sortedTags.length) {
      matchedTag = sortedTags[0][0];
      libEntry = CONCEPT_LIBRARY[matchedTag];
    }
  }
  let conceptNode;
  if (libEntry && Array.isArray(libEntry.flashcards) && libEntry.flashcards.length) {
    conceptNode = {
      id: `c${chapIndex + 1}-concept`,
      type: 'concept',
      title: `${libEntry.title || title}: Key Ideas`,
      content: libEntry.intro || `Quick primer on ${title}.`,
      flashcards: libEntry.flashcards.slice(0, 4).map(c => ({
        front: c.front,
        back: c.back,
      })),
      // Marker so the renderer / audit can tell authored vs auto-derived
      source: 'concept-library',
      // Which library tag won — useful for coverage analytics
      sourceTag: matchedTag,
    };
  } else {
    conceptNode = {
      id: `c${chapIndex + 1}-concept`,
      type: 'concept',
      title: `${title}: Key Ideas`,
      content: `Quick primer on ${title}. Tap to flip cards covering the most-asked exam ideas in this domain.`,
      flashcards: chap.questions.slice(0, 4).map(q => ({
        front: (q.question || '').trim() || 'See exam guide',
        back: q.explanation || q.options[q.correct] || 'See exam guide',
      })),
      source: 'auto-derived',
    };
  }
  nodes.push(conceptNode);

  // 2) Quiz nodes — 5 Qs each, easy/medium difficulty first
  const sorted = [...chap.questions].sort((a, b) => {
    const da = (a.difficulty === 'hard') ? 2 : (a.difficulty === 'medium') ? 1 : 0;
    const db = (b.difficulty === 'hard') ? 2 : (b.difficulty === 'medium') ? 1 : 0;
    return da - db;
  });
  // reserve hardest QSUBBOSS for the sub-boss
  const easierBatch = sorted.slice(0, sorted.length - Math.min(SUBBOSS_NODE_SIZE, sorted.length));
  const quizChunks = chunk(easierBatch, QUIZ_NODE_SIZE);
  quizChunks.forEach((qs, i) => {
    nodes.push({
      id: `c${chapIndex + 1}-quiz${i + 1}`,
      type: 'quiz',
      title: `${title} — Drill ${i + 1}`,
      questionIds: qs.map(q => q.id)
    });
  });

  // 3) Mini-game node — Yes/No declarative drill (Phase 5.13, 2026-05-15).
  //
  // History: TF generator concatenated stem + option as "True or false?"
  // → broken English for any non-statement stem. v2 swapped to a "Q: … /
  // A: … — Is this the right answer?" card → user complaint that it read
  // as a riddle. v3 (this version): synthesise a SINGLE DECLARATIVE
  // sentence per card via src/yesno-prompt.js. If the stem can't be
  // turned into a clean statement (scenario stems, "what should you do"
  // stems, negative-framed stems), the question is excluded from the
  // pool. If fewer than 3 eligible questions remain, the chapter gets
  // NO mini-game node — honest > confusing.
  const POOL_PRESELECT = sorted
    .filter(q => {
      const ci = Array.isArray(q.correct) ? q.correct[0] : q.correct;
      return canYesNoify(q.question) && buildYesNoPrompt(q.question, q.options[ci] || '');
    });
  if (POOL_PRESELECT.length >= 3) {
    const CARDS_PER_GAME = 6;
    const TARGET_CORRECT = 3;
    const pool = POOL_PRESELECT.slice(0, Math.min(CARDS_PER_GAME, POOL_PRESELECT.length));
    const pairs = pool.map((q, i) => {
      const showCorrect = i < TARGET_CORRECT;
      const correctIdx = Array.isArray(q.correct) ? q.correct[0] : q.correct;
      let optionIdx;
      if (showCorrect) {
        optionIdx = correctIdx;
      } else {
        const wrongOptions = q.options
          .map((_, oi) => oi)
          .filter(oi => Array.isArray(q.correct) ? !q.correct.includes(oi) : oi !== correctIdx);
        optionIdx = wrongOptions.length
          ? wrongOptions[(chapIndex + i) % wrongOptions.length]
          : correctIdx;
      }
      const option = q.options[optionIdx] || '';
      const prompt = buildYesNoPrompt(q.question, option);
      // POOL_PRESELECT only includes questions where buildYesNoPrompt
      // succeeded for the CORRECT option. For wrong options, the
      // synthesiser may still return null (different option, different
      // syntactic fit). Guard with a fallback that mirrors the correct
      // option's prompt structure: if null, swap option text in the
      // correct prompt — produces a plausible-sounding wrong statement.
      const safePrompt = prompt
        || (function () {
            const fallbackOpt = q.options[correctIdx] || '';
            const seed = buildYesNoPrompt(q.question, fallbackOpt);
            return seed ? seed.replace(fallbackOpt, option) : null;
          })();
      return {
        qid:     q.id,
        prompt:  safePrompt,
        correct: optionIdx === correctIdx
      };
    }).filter(p => p.prompt);
    // Deterministic shuffle so each chapter has a different correct/wrong order.
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = ((chapIndex + 1) * 31 + i * 17) % (i + 1);
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    if (pairs.length >= 3) {
      nodes.push({
        id: `c${chapIndex + 1}-game`,
        type: 'minigame',
        gameType: 'yesno',
        title: `${title} — Quick Drill`,
        pairs,
        timePerQ: 10
      });
    }
  }

  // 4) Sub-boss
  if (sorted.length >= 4) {
    const bossPool = sorted.slice(-Math.min(SUBBOSS_NODE_SIZE, sorted.length));
    nodes.push({
      id: `c${chapIndex + 1}-boss`,
      type: 'subboss',
      title: `Boss: ${title}`,
      questionIds: bossPool.map(q => q.id)
    });
  }

  // 5) Treasure chest (reward for clearing the chapter)
  nodes.push({
    id: `c${chapIndex + 1}-chest`,
    type: 'chest',
    title: 'Treasure Chest',
    rewardXp: 30,
    /* cosmetic key may unlock a new hat from /data/cosmetics.json */
    cosmeticKey: `chapter-${chapIndex + 1}`
  });

  return { id: `ch${chapIndex + 1}`, title, tag: chap.tag, nodes };
}

function buildPath(packId, pack) {
  const questions = pack.questions || [];
  if (questions.length < 12) {
    console.warn(`  skip ${packId}: only ${questions.length} questions, need >=12`);
    return null;
  }

  const grouped = groupByPrimaryTag(questions);
  const chapters = pickChapters(grouped, questions);
  if (chapters.length < 2) {
    console.warn(`  skip ${packId}: only ${chapters.length} viable chapter(s)`);
    return null;
  }

  const builtChapters = chapters.map((c, i) => buildChapter(c, i));
  const allQuestionIds = questions.map(q => q.id);
  // Final boss caps at FINAL_BOSS_MAX so it doesn't trivialize the pack —
  // the previous 50%/40-question target meant a 20-Q pack got a 20-Q final
  // boss which leaked the entire bank into the boss fight.
  const finalMockSize = Math.min(
    FINAL_BOSS_MAX,
    Math.max(FINAL_BOSS_MIN, Math.floor(allQuestionIds.length * FINAL_BOSS_PCT))
  );

  /* Pack metadata is nested: { meta: { name, vendor, … }, questions: [] } */
  const meta = pack.meta || {};
  const title = meta.name || pack.title || pack.name || packId;
  const brandName = meta.vendor || pack.brand || pack.brandName || '';
  /* Map vendors → brand colors (matches the homepage cert-card palette) */
  const BRAND_COLORS = {
    'Amazon': '#FF9900', 'AWS': '#FF9900',
    'Microsoft': '#0078D4',
    'Cisco': '#1D63ED',
    'CompTIA': '#C7173F',
    'Linux Foundation': '#22c55e', 'Linux': '#22c55e', 'Docker': '#2496ED',
    'HashiCorp': '#7B42BC',
    'Red Hat': '#EE0000', 'Fortinet': '#EF3E25', 'Palo Alto Networks': '#FA582D',
    'ServiceNow': '#62D84E', 'Splunk': '#65A637',
    'Google': '#4285F4', 'Google Cloud': '#4285F4',
    'ISC2': '#7c3aed', 'Snowflake': '#29B5E8', 'GitHub': '#8b5cf6'
  };
  return {
    packId,
    title,
    brandName,
    brandColor: pack.brandColor || BRAND_COLORS[brandName] || '#60a5fa',
    chapters: builtChapters,
    finalBoss: {
      id: 'final-boss',
      type: 'finalboss',
      title: `Final Exam: ${title}`,
      questionCount: finalMockSize,
      timeMinutes: Math.ceil(finalMockSize * 1.5)
    },
    meta: {
      generatedAt: new Date().toISOString(),
      totalNodes: builtChapters.reduce((s, c) => s + c.nodes.length, 0) + 1,
      totalQuestions: questions.length,
      nodeTypes: ['concept', 'quiz', 'minigame', 'subboss', 'finalboss']
    }
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json')).sort();
  console.log(`Found ${files.length} pack files in ${PACKS_DIR}\n`);

  let ok = 0;
  const index = [];
  const skipped = []; /* structured skip report so we can see WHY each pack was dropped */
  for (const file of files) {
    const packId = file.replace(/\.json$/, '');
    const raw = (() => {
      try { return fs.readFileSync(path.join(PACKS_DIR, file), 'utf8'); }
      catch (e) { return null; }
    })();
    const pack = raw ? (() => { try { return JSON.parse(raw); } catch (_) { return null; } })() : null;
    if (!pack) {
      skipped.push({ packId, reason: 'parse-error' });
      console.warn(`  ✗ ${packId}  parse-error (probably an unresolved merge conflict)`);
      continue;
    }
    const qCount = (pack.questions || []).length;
    if (qCount < 12) {
      skipped.push({ packId, reason: 'too-few-questions', questionCount: qCount });
      continue;
    }
    const built = buildPath(packId, pack);
    if (!built) {
      skipped.push({ packId, reason: 'no-viable-chapters', questionCount: qCount });
      continue;
    }
    const outFile = path.join(OUT_DIR, file);
    fs.writeFileSync(outFile, JSON.stringify(built, null, 2));
    console.log(`  ✓ ${packId}  → ${built.meta.totalNodes} nodes, ${built.chapters.length} chapters`);
    index.push({
      packId,
      title: built.title,
      brandName: built.brandName,
      brandColor: built.brandColor,
      totalNodes: built.meta.totalNodes,
      chapters: built.chapters.length
    });
    ok++;
  }
  fs.writeFileSync(path.join(OUT_DIR, '_index.json'), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, '_skipped.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalPacks: files.length,
    generated: ok,
    skipped: skipped.length,
    reasons: skipped
  }, null, 2));
  console.log(`\nGenerated ${ok} path(s). Skipped ${skipped.length}.`);
  if (skipped.length) {
    const byReason = skipped.reduce((acc, s) => { acc[s.reason] = (acc[s.reason] || 0) + 1; return acc; }, {});
    console.log('  Reasons:', Object.entries(byReason).map(([k, v]) => `${k}=${v}`).join(', '));
  }
  console.log('Index → data/paths/_index.json');
  console.log('Skips → data/paths/_skipped.json');
}

main();
