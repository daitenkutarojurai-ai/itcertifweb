#!/usr/bin/env node
/**
 * scripts/flag-easy-questions.js
 *
 * Surface "trivially-easy" question candidates for content rework.
 *
 * Heuristics (a question that hits ANY of these is suspect):
 *   1. Question tagged "easy" AND stem contains the verbatim correct option
 *      (or a substring of it >= 12 chars) — gives the answer away.
 *   2. Stem starts with "What does ... stand for" (acronym recall — pure memory).
 *   3. Stem starts with "Which of the following is" + one option is a non-domain
 *      gibberish word (process-of-elimination).
 *   4. The correct option is a single short token (≤ 10 chars) AND distractors
 *      include obvious throwaways like "None of the above", "All of the above",
 *      or fewer than 2 plausible-looking distractors.
 *   5. Question is ≤ 60 chars total (very short stems are usually trivial).
 *
 * Output: one line per flagged question, grouped by pack, with the rule(s)
 * that fired. Also writes a JSON summary to scripts/easy-flagged.json.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'free');
const OUT_JSON = path.join(__dirname, 'easy-flagged.json');

const THROWAWAY = /^(none of the above|all of the above|n\/?a|both a and b|both of the above)$/i;

function flagsFor(q) {
  const flags = [];
  if (Array.isArray(q.correct)) return flags;     // skip multi-select
  const stem = (q.question || '').toLowerCase();
  const correct = q.options[q.correct] || '';
  const correctLow = correct.toLowerCase();
  const others = q.options.filter((_, i) => i !== q.correct);

  // 1. Stem leaks the answer (verbatim only — substring overlap is too noisy
  //    because legitimate technical terms appear in both stem and answer).
  //    Only flag if the FULL correct option (>= 8 chars) appears verbatim.
  if (correct.length >= 8 && stem.includes(correctLow)) {
    flags.push('stem-contains-answer');
  }

  // 2. Acronym recall
  if (/^what does .+ stand for/.test(stem) || /\bstand for\b/.test(stem)) {
    flags.push('acronym-recall');
  }

  // 3. Throwaway distractors
  const throwawayCount = others.filter(o => THROWAWAY.test((o || '').trim())).length;
  if (throwawayCount > 0) flags.push(`throwaway-distractor(${throwawayCount})`);

  // 4. Single-token correct + few plausible distractors
  if (correct.length <= 10 && !/\s/.test(correct)) {
    // distractors that are also single tokens, not throwaways
    const plausible = others.filter(o => o && !THROWAWAY.test(o.trim())).length;
    if (plausible < 2) flags.push('few-plausible-distractors');
  }

  // 5. Trivially short stem (stricter: ≤ 35 chars is genuinely too short for
  //    a real exam-style question; longer "short" stems are usually fine).
  if ((q.question || '').length <= 35) flags.push('short-stem');

  // 6. Marked easy AND any of the above OR length-tell still strong
  const lens = q.options.map(o => (o || '').length);
  const maxLen = Math.max(...lens);
  if (q.difficulty === 'easy') {
    if (lens[q.correct] === maxLen && lens.filter(l => l === maxLen).length === 1) {
      flags.push('easy+longest-correct');
    }
  }

  return flags;
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const summary = [];
  let totalQ = 0, totalFlagged = 0;

  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    const flagged = [];
    for (const q of j.questions || []) {
      totalQ++;
      const flags = flagsFor(q);
      if (flags.length) {
        totalFlagged++;
        flagged.push({ id: q.id, difficulty: q.difficulty, flags, stem: (q.question||'').slice(0, 100) });
      }
    }
    if (flagged.length) {
      summary.push({ pack: f, total: j.questions.length, flagged: flagged.length, items: flagged });
    }
  }

  // Print top-level table
  console.log('PACK'.padEnd(34), 'TOTAL', 'FLAGGED', 'PCT');
  summary.sort((a, b) => (b.flagged / b.total) - (a.flagged / a.total));
  for (const s of summary) {
    const pct = ((s.flagged / s.total) * 100).toFixed(1) + '%';
    console.log(s.pack.padEnd(34), String(s.total).padStart(5), String(s.flagged).padStart(7), pct.padStart(5));
  }
  console.log('-'.repeat(60));
  console.log(`TOTAL: ${totalFlagged} of ${totalQ} questions flagged (${((totalFlagged/totalQ)*100).toFixed(1)}%)`);

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\nDetailed report → ${path.relative(path.join(__dirname, '..'), OUT_JSON)}`);
}

main();
