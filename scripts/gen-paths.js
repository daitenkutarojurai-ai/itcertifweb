#!/usr/bin/env node
/**
 * scripts/gen-paths.js
 *
 * Generates Duolingo-style learning paths from existing question packs.
 * Reads /data/free/<pack>.json, groups questions by their primary tag,
 * picks up to TARGET_CHAPTERS tags as chapters, fills each chapter with
 * concept + quiz drills + optional mid-checkpoint + minigame + subboss + chest,
 * ends with a final-boss mock exam.
 *
 * Output: /data/paths/<pack>.json
 *
 * Run:  node scripts/gen-paths.js
 * Re-runs are idempotent: existing paths are overwritten cleanly.
 *
 * v0.17 changes (2026-05-23):
 *   Phase 1 — Deeper paths: TARGET_CHAPTERS 6→8, MIN_QS_PER_CHAPTER 6→4,
 *              SUBBOSS_NODE_SIZE 12→8 with a guaranteed quiz-node floor,
 *              mid-chapter checkpoint when a chapter has ≥3 quiz drills.
 *   Phase 2 — Game variety: per-chapter rotation across true-false-blitz /
 *              lightning-round / match-pair / acronym-decoder.
 */
const fs = require('fs');
const path = require('path');
const { buildYesNoPrompt, canYesNoify } = require('../src/yesno-prompt.js');

const PACKS_DIR = path.join(__dirname, '..', 'data', 'free');
const OUT_DIR = path.join(__dirname, '..', 'data', 'paths');
const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');
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

const TARGET_CHAPTERS = 8;        // was 6 — more structure per path
const QUIZ_NODE_SIZE = 5;         // questions per quiz drill node
const SUBBOSS_NODE_SIZE = 8;      // was 12 — leave more questions for quiz drills
const MIN_SUBBOSS_SIZE = 3;       // skip subboss if pool is smaller than this
const MIN_QS_PER_CHAPTER = 4;     // was 6 — more tags qualify as chapters
const MID_SUBBOSS_THRESHOLD = 3;  // insert a mid-checkpoint when chapter has >= N drills
const FINAL_BOSS_MAX = 30;
const FINAL_BOSS_PCT = 0.30;
const FINAL_BOSS_MIN = 15;

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

// ── Game mode builders ───────────────────────────────────────────────────────

// Mode 1: True / False Blitz (existing logic, refactored).
// Synthesises declarative statements from yes/no-eligible questions.
function tryBuildTrueFalseBlitz(chap, chapIndex, sorted, qsByIdMap, title) {
  const POOL_PRESELECT = sorted.filter(q => {
    const ci = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    return canYesNoify(q.question) && buildYesNoPrompt(q.question, q.options[ci] || '');
  });
  if (POOL_PRESELECT.length < 3) return null;

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
    const safePrompt = prompt || (function () {
      const fallbackOpt = q.options[correctIdx] || '';
      const seed = buildYesNoPrompt(q.question, fallbackOpt);
      return seed ? seed.replace(fallbackOpt, option) : null;
    })();
    return { qid: q.id, prompt: safePrompt, correct: optionIdx === correctIdx };
  }).filter(p => p.prompt);

  // Deterministic shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = ((chapIndex + 1) * 31 + i * 17) % (i + 1);
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  if (pairs.length < 3) return null;

  const statements = pairs.map(p => {
    const q = (qsByIdMap || {})[p.qid] || {};
    return {
      id: p.qid,
      text: p.prompt,
      isTrue: p.correct,
      explanation: q.explanation || (p.correct
        ? 'Correct — this statement is true.'
        : 'Incorrect — this statement is false.')
    };
  });

  return {
    id: `c${chapIndex + 1}-game`,
    type: 'minigame',
    gameType: 'yesno',
    pairs,
    timePerQ: 10,
    mode: 'true-false-blitz',
    data: { statements },
    title: `${title} — Quick Drill`,
  };
}

// Mode 2: Lightning Round — rapid-fire multiple choice with a timer.
// Always eligible: any pool of ≥ 3 questions works.
function tryBuildLightningRound(chap, chapIndex, title) {
  const pool = [...chap.questions];
  if (pool.length < 3) return null;
  const taken = pool.slice(0, Math.min(8, pool.length));
  return {
    id: `c${chapIndex + 1}-game`,
    type: 'minigame',
    gameType: 'lightning',
    mode: 'lightning-round',
    data: {
      secondsPerQuestion: 7,
      livesAllowed: 3,
      questions: taken.map(q => {
        const node = {
          q: q.question,
          choices: q.options,
          correctIndex: Array.isArray(q.correct) ? q.correct[0] : q.correct,
        };
        if (q.explanation) node.explanation = q.explanation;
        return node;
      })
    },
    title: `${title} — Lightning Round`,
  };
}

// Mode 3: Match the Pair — match a description (left) to a short term/service (right).
// Eligible when the correct option is ≤ 4 words (service/concept names, not sentences).
function tryBuildMatchPair(chap, chapIndex, title) {
  const MAX_OPT_WORDS = 4;
  const eligible = chap.questions.filter(q => {
    const ci = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    const opt = (q.options[ci] || '').trim();
    return opt && opt.split(/\s+/).length <= MAX_OPT_WORDS && opt.length <= 40;
  });
  if (eligible.length < 3) return null;

  const seen = new Set();
  const pairs = [];
  for (const q of eligible.slice(0, 8)) {
    const ci = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    const right = q.options[ci].trim();
    if (seen.has(right)) continue;
    seen.add(right);
    // Trim question to a clean description (strip trailing "?" etc.)
    const left = q.question.replace(/\?$/, '').trim().slice(0, 80);
    pairs.push({ left, right });
    if (pairs.length >= 6) break;
  }
  if (pairs.length < 3) return null;

  return {
    id: `c${chapIndex + 1}-game`,
    type: 'minigame',
    gameType: 'match-pair',
    mode: 'match-pair',
    data: { pairs },
    title: `${title} — Match the Pair`,
  };
}

// Mode 4: Acronym Decoder — given an acronym, pick its correct expansion.
// Eligible when at least one question contains "stand for" / "abbreviated" / "acronym"
// and has an all-caps acronym in the stem plus enough wrong options as distractors.
function tryBuildAcronymDecoder(chap, chapIndex) {
  const STAND_FOR_RE = /(?:stand for|full form|abbreviat|full name of|acronym for)/i;
  const ACRONYM_RE = /\b([A-Z]{2,7})\b/;

  const candidate = chap.questions.find(q => {
    const stem = q.question || '';
    if (!STAND_FOR_RE.test(stem)) return false;
    if (!ACRONYM_RE.test(stem)) return false;
    const ci = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    const wrongCount = q.options.filter((_, oi) =>
      Array.isArray(q.correct) ? !q.correct.includes(oi) : oi !== ci
    ).length;
    return wrongCount >= 3;
  });
  if (!candidate) return null;

  const stem = candidate.question;
  const match = stem.match(ACRONYM_RE);
  const acronym = match ? match[1] : null;
  if (!acronym) return null;

  const ci = Array.isArray(candidate.correct) ? candidate.correct[0] : candidate.correct;
  const correctFull = (candidate.options[ci] || '').trim();
  const distractorTexts = candidate.options
    .map((opt, oi) => ({ opt, oi }))
    .filter(({ oi }) => Array.isArray(candidate.correct) ? !candidate.correct.includes(oi) : oi !== ci)
    .map(({ opt }) => opt.trim());
  const useCase = candidate.explanation ? candidate.explanation.slice(0, 120) : '';

  return {
    id: `${candidate.chapPrefix || `c${chapIndex + 1}`}-game`,
    type: 'minigame',
    gameType: 'acronym',
    mode: 'acronym-decoder',
    data: {
      acronym,
      correct: { fullName: correctFull, useCase },
      distractors: distractorTexts.slice(0, 3).map(fullName => ({ fullName, useCase: '' }))
    },
    title: `Decode: ${acronym}`,
  };
}

// Pick the best-fitting minigame mode for this chapter by rotating the
// preferred mode across chapter indices. Falls back down the rotation
// until one is eligible, or returns null (no minigame this chapter).
// LightningRound is placed last because it is always eligible — the other
// three modes are more interesting but have eligibility gates, so they
// get first pick in rotation before the guaranteed fallback.
function buildMinigame(chap, chapIndex, sorted, qsByIdMap, title) {
  const MODES = [
    () => tryBuildTrueFalseBlitz(chap, chapIndex, sorted, qsByIdMap, title),
    () => tryBuildMatchPair(chap, chapIndex, title),
    () => tryBuildAcronymDecoder(chap, chapIndex),
    () => tryBuildLightningRound(chap, chapIndex, title),
  ];
  const startAt = chapIndex % MODES.length;
  for (let i = 0; i < MODES.length; i++) {
    const node = MODES[(startAt + i) % MODES.length]();
    if (node) {
      // Ensure the id uses the right chapter prefix regardless of which builder ran.
      node.id = `c${chapIndex + 1}-game`;
      return node;
    }
  }
  return null;
}

// ── Chapter builder ──────────────────────────────────────────────────────────

function buildChapter(chap, chapIndex, qsByIdMap) {
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
  //       cutting off in the middle of words). The explanation is the
  //       back of the card.
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
      source: 'concept-library',
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

  // 2) Quiz nodes + optional mid-chapter checkpoint.
  //
  // Reserve the hardest questions for the end-subboss, but always leave
  // at least QUIZ_NODE_SIZE questions for quiz drills so small chapters
  // aren't starved of drill content.
  const sorted = [...chap.questions].sort((a, b) => {
    const da = (a.difficulty === 'hard') ? 2 : (a.difficulty === 'medium') ? 1 : 0;
    const db = (b.difficulty === 'hard') ? 2 : (b.difficulty === 'medium') ? 1 : 0;
    return da - db;
  });

  const subbossReserve = Math.min(
    SUBBOSS_NODE_SIZE,
    Math.max(0, sorted.length - QUIZ_NODE_SIZE)
  );
  const easierBatch = sorted.slice(0, sorted.length - subbossReserve);
  const bossPool    = sorted.slice(-subbossReserve);

  // For long chapters (≥ MID_SUBBOSS_THRESHOLD quiz drills), split the boss
  // pool into a mid-chapter checkpoint and the end subboss.
  let midBossPool = [];
  let endBossPool = bossPool;
  if (bossPool.length >= MIN_SUBBOSS_SIZE * 2) {
    const midCount = Math.floor(bossPool.length / 2);
    midBossPool = bossPool.slice(0, midCount);
    endBossPool = bossPool.slice(midCount);
  }

  const quizChunks = chunk(easierBatch, QUIZ_NODE_SIZE);
  const useMidBoss = quizChunks.length >= MID_SUBBOSS_THRESHOLD && midBossPool.length >= MIN_SUBBOSS_SIZE;
  const midSplitIdx = useMidBoss ? Math.floor(quizChunks.length / 2) : -1;

  quizChunks.forEach((qs, i) => {
    nodes.push({
      id: `c${chapIndex + 1}-quiz${i + 1}`,
      type: 'quiz',
      title: `${title} — Drill ${i + 1}`,
      questionIds: qs.map(q => q.id)
    });
    // Insert mid-chapter checkpoint halfway through quiz drills.
    if (i === midSplitIdx - 1) {
      nodes.push({
        id: `c${chapIndex + 1}-checkpoint`,
        type: 'subboss',
        title: `Checkpoint: ${title}`,
        questionIds: midBossPool.map(q => q.id)
      });
    }
  });

  // 3) Mini-game node — mode chosen by per-chapter rotation.
  const minigame = buildMinigame(chap, chapIndex, sorted, qsByIdMap, title);
  if (minigame) nodes.push(minigame);

  // 4) End-of-chapter sub-boss (harder questions).
  const finalBossPool = useMidBoss ? endBossPool : bossPool;
  if (finalBossPool.length >= MIN_SUBBOSS_SIZE) {
    nodes.push({
      id: `c${chapIndex + 1}-boss`,
      type: 'subboss',
      title: `Boss: ${title}`,
      questionIds: finalBossPool.map(q => q.id)
    });
  }

  // 5) Treasure chest (reward for clearing the chapter).
  nodes.push({
    id: `c${chapIndex + 1}-chest`,
    type: 'chest',
    title: 'Treasure Chest',
    rewardXp: 30,
    cosmeticKey: `chapter-${chapIndex + 1}`
  });

  return { id: `ch${chapIndex + 1}`, title, tag: chap.tag, nodes };
}

// Hand-authored game payloads live in data/games/<mode>/<packId>.json (or
// <packId>-*.json). They cover modes that can't be auto-derived from an MCQ
// bank (scenario-builder, break-architecture, boss-fight) and curated versions
// of the auto modes. Found files are injected as extra minigame nodes so the
// authoring survives a regen.
const AUTHORED_MODES = [
  'match-pair', 'lightning-round', 'break-architecture',
  'acronym-decoder', 'true-false-blitz', 'scenario-builder', 'boss-fight',
];
function loadAuthoredGames(packId) {
  const out = [];
  for (const mode of AUTHORED_MODES) {
    const dir = path.join(GAMES_DIR, mode);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.json') || f === 'example.json') continue;
      if (f !== `${packId}.json` && !f.startsWith(`${packId}-`)) continue;
      try {
        const payload = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (payload && payload.mode && payload.data) out.push(payload);
        else console.warn(`  ⚠ authored game ${mode}/${f} missing mode/data — skipped`);
      } catch (e) {
        console.warn(`  ⚠ authored game ${mode}/${f} invalid JSON — skipped`);
      }
    }
  }
  return out;
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

  const qsByIdMap = {};
  for (const q of questions) qsByIdMap[q.id] = q;
  const builtChapters = chapters.map((c, i) => buildChapter(c, i, qsByIdMap));

  // Inject hand-authored bonus mini-games (regen-safe), distributed across
  // chapters and placed just before each chapter's treasure chest.
  const authored = loadAuthoredGames(packId);
  authored.forEach((g, k) => {
    const ch = builtChapters[k % builtChapters.length];
    const node = {
      id: `${ch.id}-bonus${k + 1}`,
      type: 'minigame',
      mode: g.mode,
      title: g.title || 'Bonus mini-game',
      data: g.data,
    };
    if (g.explanation) node.explanation = g.explanation;
    const chestIdx = ch.nodes.findIndex(n => n.type === 'chest');
    if (chestIdx >= 0) ch.nodes.splice(chestIdx, 0, node);
    else ch.nodes.push(node);
  });
  if (authored.length) console.log(`    + ${authored.length} authored game(s)`);

  const allQuestionIds = questions.map(q => q.id);
  const finalMockSize = Math.min(
    FINAL_BOSS_MAX,
    Math.max(FINAL_BOSS_MIN, Math.floor(allQuestionIds.length * FINAL_BOSS_PCT))
  );

  const meta = pack.meta || {};
  const title = meta.name || pack.title || pack.name || packId;
  const brandName = meta.vendor || pack.brand || pack.brandName || '';
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
  const skipped = [];
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

    // Collect game-mode distribution for reporting.
    const gameModes = {};
    for (const ch of built.chapters) {
      for (const n of ch.nodes) {
        if (n.type === 'minigame' && n.mode) gameModes[n.mode] = (gameModes[n.mode] || 0) + 1;
      }
    }
    const modeStr = Object.entries(gameModes).map(([m, c]) => `${m}×${c}`).join(', ') || 'none';

    const outFile = path.join(OUT_DIR, file);
    fs.writeFileSync(outFile, JSON.stringify(built, null, 2));
    console.log(`  ✓ ${packId}  → ${built.meta.totalNodes} nodes, ${built.chapters.length} ch  [${modeStr}]`);
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
