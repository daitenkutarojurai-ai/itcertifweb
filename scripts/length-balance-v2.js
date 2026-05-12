#!/usr/bin/env node
/**
 * scripts/length-balance-v2.js
 *
 * Stricter, length-balance-only second pass. Does NOT shuffle option order
 * (keeps the deterministic shuffle from transform-questions.js intact).
 *
 * For each single-select question where the correct option is meaningfully
 * longer than the median of its distractors, split it at the best clause
 * boundary inside an acceptable length window and move the surplus to the
 * `explanation` field.
 *
 * Idempotent: tracks `_lenbal: true` per question.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'free');

// ── Tunables ────────────────────────────────────────────────────────────────
const RATIO_TRIGGER = 1.20;   // trim if correctLen > median × this
const MIN_CORRECT   = 50;     // never trim something already short
const TARGET_RATIO  = 1.10;   // aim for head ≈ median × this
const MIN_HEAD      = 24;     // head must be at least this long

function trimCorrect(q) {
  if (Array.isArray(q.correct)) return false;
  if (q._lenbal) return false;
  const opts = q.options;
  if (!opts || opts.length !== 4) return false;

  const correctIdx = q.correct;
  const correct    = opts[correctIdx] || '';
  const correctLen = correct.length;
  if (correctLen < MIN_CORRECT) return false;

  const others = opts
    .filter((_, i) => i !== correctIdx)
    .map(o => (o || '').length)
    .sort((a, b) => a - b);
  const median = others[1];
  if (correctLen <= median * RATIO_TRIGGER) return false;

  const target = Math.max(MIN_HEAD, Math.floor(median * TARGET_RATIO));
  const upper  = Math.max(target + 20, Math.floor(median * 1.4));

  // Candidate cut points, in priority order:
  //   1. End of sentence (. ! ?) followed by space + capital
  //   2. " — " or " – " (em/en dash with spaces)
  //   3. "; "
  //   4. ", " (last resort — produces less natural breaks)
  const candidates = [];
  let m;
  const sentenceRe = /([.!?])\s+(?=[A-Z(])/g;
  while ((m = sentenceRe.exec(correct)) !== null) {
    candidates.push({ pos: m.index + 1, kind: 'sentence' });
  }
  const dashRe = /\s[—–-]\s/g;
  while ((m = dashRe.exec(correct)) !== null) {
    candidates.push({ pos: m.index, kind: 'dash' });
  }
  const semiRe = /;\s+/g;
  while ((m = semiRe.exec(correct)) !== null) {
    candidates.push({ pos: m.index + 1, kind: 'semi' });
  }
  const commaRe = /,\s+(?=[A-Za-z])/g;
  while ((m = commaRe.exec(correct)) !== null) {
    candidates.push({ pos: m.index + 1, kind: 'comma' });
  }

  // Pick the candidate closest to the target window and within MIN_HEAD..upper
  const inRange = candidates.filter(c => c.pos >= MIN_HEAD && c.pos <= upper);
  if (!inRange.length) return false;

  // Prefer sentence > dash > semi > comma; tiebreak by closeness to target
  const order = { sentence: 0, dash: 1, semi: 2, comma: 3 };
  inRange.sort((a, b) =>
    order[a.kind] - order[b.kind] ||
    Math.abs(a.pos - target) - Math.abs(b.pos - target)
  );
  const cut = inRange[0].pos;

  let head = correct.slice(0, cut).trim();
  let tail = correct.slice(cut).trim().replace(/^[,.;:—–\-\s]+/, '').trim();
  if (!head || !tail || head.length < MIN_HEAD) return false;
  if (!/[.!?]$/.test(head)) head += '.';

  // Idempotency: don't re-append the same tail to explanation
  const exp = (q.explanation || '').trim();
  if (!exp.includes(tail)) {
    q.explanation = (exp ? exp + ' ' : '') + tail;
  }
  q.options[correctIdx] = head;
  q._lenbal = true;
  return true;
}

function processFile(file) {
  const full = path.join(DATA_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  const qs = json.questions || [];
  let trimmed = 0;
  for (const q of qs) {
    if (trimCorrect(q)) trimmed++;
  }
  if (json.meta) {
    const v = (json.meta.version || '1.0.0').split('.');
    v[v.length - 1] = String((parseInt(v[v.length - 1], 10) || 0) + 1);
    json.meta.version = v.join('.');
    json.meta.last_updated = new Date().toISOString().slice(0, 10);
  }
  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  return { file, total: qs.length, trimmed };
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const results = files.map(processFile);
  let T = 0, X = 0;
  console.log('pack'.padEnd(34), 'total', 'trimmed');
  for (const r of results) {
    console.log(r.file.padEnd(34), String(r.total).padStart(5), String(r.trimmed).padStart(7));
    T += r.total; X += r.trimmed;
  }
  console.log('-'.repeat(54));
  console.log('TOTAL'.padEnd(34), String(T).padStart(5), String(X).padStart(7));
}

main();
