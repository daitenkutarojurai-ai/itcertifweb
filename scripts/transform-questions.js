#!/usr/bin/env node
/**
 * scripts/transform-questions.js
 *
 * One-shot, idempotent transformer for every question pack in data/free/.
 *
 * Two passes per question:
 *   1. Length-balance: if the correct option is much longer than its peers
 *      (a classic test-prep "tell"), trim the correct answer down to the same
 *      band and append the surplus prose to `explanation`.
 *   2. Deterministic shuffle: re-order the 4 options using a per-question
 *      seed (from `q.id`) and rewrite `q.correct` accordingly. This kills the
 *      heavy index-1 bias while keeping question IDs stable across runs.
 *
 * Skips multi-select (`q.correct` is array) and any question that already
 * has a `_normalized: true` marker (so the script is safe to re-run).
 *
 * Usage:  node scripts/transform-questions.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'free');

// ─── Hash + seeded RNG ─────────────────────────────────────────────────────
function strHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSeeded(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Length-balance ────────────────────────────────────────────────────────
// If correct option's length > 1.4x the median of the other three, split
// it at a sentence/clause boundary and move the trailing sentence(s) into
// the explanation. We do NOT pad distractors (avoids fabricating wrong-
// but-plausible-sounding details).
function lengthBalance(q) {
  if (Array.isArray(q.correct)) return false;
  const opts = q.options;
  if (!opts || opts.length !== 4) return false;
  const correctIdx = q.correct;
  const correctLen = (opts[correctIdx] || '').length;
  const others = opts.filter((_, i) => i !== correctIdx).map(o => (o || '').length);
  others.sort((a, b) => a - b);
  const median = others[1];                 // middle of 3
  if (correctLen <= median * 1.4) return false; // already balanced
  if (correctLen < 60) return false;         // too short to safely split

  const correct = opts[correctIdx];

  // Split at the FIRST sentence boundary that produces a head ≤ 1.25× median
  // (and at least 25 chars long so we don't end with a teaser).
  const target = Math.max(28, Math.floor(median * 1.25));
  const sentenceRe = /([.!?])\s+(?=[A-Z(])/g;
  let m, lastSplit = -1;
  while ((m = sentenceRe.exec(correct)) !== null) {
    const cut = m.index + 1;          // include the punctuation
    if (cut >= 25 && cut <= target) lastSplit = cut;
    if (cut > target * 1.4) break;
  }

  // Fallback: split at the first ", " or " — " in the same window
  if (lastSplit < 0) {
    const fallback = /[,—–]\s+/g;
    while ((m = fallback.exec(correct)) !== null) {
      if (m.index >= 25 && m.index <= target) { lastSplit = m.index; break; }
    }
  }
  if (lastSplit < 0) return false;     // can't safely split — leave it

  let head = correct.slice(0, lastSplit).trim();
  let tail = correct.slice(lastSplit).trim();
  // Tail might start with leftover punctuation
  tail = tail.replace(/^[,.;:—–\s]+/, '').trim();
  if (!head || !tail) return false;
  // Make sure head ends with terminal punctuation for readability
  if (!/[.!?]$/.test(head)) head += '.';

  q.options[correctIdx] = head;
  q.explanation = (q.explanation ? q.explanation.trim() + ' ' : '') + tail;
  return true;
}

// ─── Deterministic option shuffle ──────────────────────────────────────────
function shuffleOptions(q) {
  if (Array.isArray(q.correct)) {
    // Multi-select: shuffle order and remap the correct array
    const rng = mulberry32(strHash(q.id || JSON.stringify(q.options)));
    const order = shuffleSeeded([0, 1, 2, 3], rng);
    q.options = order.map(i => q.options[i]);
    q.correct = q.correct.map(c => order.indexOf(c)).sort((a, b) => a - b);
    return true;
  }
  const rng = mulberry32(strHash(q.id || JSON.stringify(q.options)));
  const order = shuffleSeeded([0, 1, 2, 3], rng);
  q.options = order.map(i => q.options[i]);
  q.correct = order.indexOf(q.correct);
  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────────
function processFile(file) {
  const full = path.join(DATA_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  const qs = json.questions || [];
  let balanced = 0, shuffled = 0;
  for (const q of qs) {
    if (q._normalized) continue;     // idempotency guard
    if (lengthBalance(q)) balanced++;
    if (shuffleOptions(q)) shuffled++;
    q._normalized = true;
  }
  // Bump pack version + last_updated
  if (json.meta) {
    const v = (json.meta.version || '1.0.0').split('.');
    v[v.length - 1] = String((parseInt(v[v.length - 1], 10) || 0) + 1);
    json.meta.version = v.join('.');
    json.meta.last_updated = new Date().toISOString().slice(0, 10);
  }
  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  return { file, total: qs.length, balanced, shuffled };
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const results = files.map(processFile);
  console.log('pack'.padEnd(34), 'total', 'balanced', 'shuffled');
  let T = 0, B = 0, S = 0;
  for (const r of results) {
    console.log(r.file.padEnd(34), String(r.total).padStart(5), String(r.balanced).padStart(8), String(r.shuffled).padStart(8));
    T += r.total; B += r.balanced; S += r.shuffled;
  }
  console.log('-'.repeat(60));
  console.log('TOTAL'.padEnd(34), String(T).padStart(5), String(B).padStart(8), String(S).padStart(8));
}

main();
