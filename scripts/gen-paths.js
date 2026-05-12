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

const PACKS_DIR = path.join(__dirname, '..', 'data', 'free');
const OUT_DIR = path.join(__dirname, '..', 'data', 'paths');

const TARGET_CHAPTERS = 6;        // 5-7 is the sweet spot
const QUIZ_NODE_SIZE = 5;         // questions per quiz node
const SUBBOSS_NODE_SIZE = 12;     // sub-boss = harder, more questions
const MIN_QS_PER_CHAPTER = 6;     // need at least this many to form a chapter

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

  // 1) Concept-card node introducing the chapter
  nodes.push({
    id: `c${chapIndex + 1}-concept`,
    type: 'concept',
    title: `${title}: Key Ideas`,
    /* placeholder content — Phase 3B will replace with AI-drafted markdown */
    content: `Quick primer on ${title}. Tap to flip cards covering the most-asked exam ideas in this domain.`,
    flashcards: chap.questions.slice(0, 4).map(q => ({
      front: q.question.split('?')[0].slice(0, 80) + '?',
      back: q.explanation || q.options[q.correct] || 'See exam guide'
    }))
  });

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

  // 3) Mini-game node — alternates between match-up and true-false speed run
  if (chap.questions.length >= 6) {
    /* Every chapter has a mini-game now (was every other); type alternates
       so the user sees variety. */
    const useTrueFalse = chapIndex % 2 === 0;
    if (useTrueFalse) {
      /* True/False speed run: pick 8 questions, derive statements from
         the correct option + 4 false ones from wrong options */
      const tfPool = sorted.slice(0, Math.min(8, sorted.length)).map((q, i) => {
        const correctText = (q.options[q.correct] || '').slice(0, 90);
        const useTrue = i % 2 === 0; /* alternate true/false to balance */
        let statement, isTrue;
        if (useTrue) {
          statement = `${q.question.split('?')[0].slice(0, 60)}? ${correctText}`;
          isTrue = true;
        } else {
          const wrongIdx = q.options.findIndex((_, oi) => oi !== q.correct);
          const wrongText = (q.options[wrongIdx] || correctText).slice(0, 90);
          statement = `${q.question.split('?')[0].slice(0, 60)}? ${wrongText}`;
          isTrue = false;
        }
        return { statement, isTrue };
      });
      nodes.push({
        id: `c${chapIndex + 1}-game`,
        type: 'minigame',
        gameType: 'truefalse',
        title: `${title} — Speed Run`,
        statements: tfPool,
        timePerQ: 5
      });
    } else {
      nodes.push({
        id: `c${chapIndex + 1}-game`,
        type: 'minigame',
        gameType: 'match',
        title: `${title} — Match-Up`,
        pairs: chap.questions.slice(0, 6).map(q => ({
          prompt: q.question.slice(0, 60),
          answer: (q.options[q.correct] || '').slice(0, 60)
        }))
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
  const finalMockSize = Math.min(40, Math.max(20, Math.floor(allQuestionIds.length * 0.5)));

  return {
    packId,
    title: pack.title || pack.name || packId,
    brandName: pack.brand || pack.brandName || '',
    brandColor: pack.brandColor || '#60a5fa',
    chapters: builtChapters,
    finalBoss: {
      id: 'final-boss',
      type: 'finalboss',
      title: `Final Exam: ${pack.title || packId}`,
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
