/**
 * test/stats.test.js — characterization tests for src/stats.js
 *
 * Pin the XP / level / streak math so future tweaks don't silently break
 * the gamification surface. Uses Node's built-in test runner (node >=18)
 * — no extra dependencies.
 *
 * Run:  node --test test/
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const stats = require('../src/stats.js');

/* ──────────────────────── Level thresholds ──────────────────────── */

test('thresholdForLevel(1) = 0  (anchor — fresh user starts at L1)', () => {
  assert.strictEqual(stats.thresholdForLevel(1), 0);
});

test('thresholdForLevel(2) = 50  (first cliff)', () => {
  assert.strictEqual(stats.thresholdForLevel(2), 50);
});

test('thresholdForLevel(3) ≈ 50 × 1.18 ≈ 59', () => {
  assert.strictEqual(stats.thresholdForLevel(3), 59);
});

test('thresholdForLevel(30) is the highest cliff', () => {
  const t30 = stats.thresholdForLevel(30);
  /* Formula: 50 × 1.18^28 ≈ 5148. PINS current behavior — if the
     formula changes, this assertion forces an explicit update so we
     don't accidentally make level-30 unreachable or trivial. */
  assert.ok(t30 > 4500 && t30 < 6000, `expected ~5148 XP for L30, got ${t30}`);
});

test('thresholdForLevel(31) is clamped to MAX_LEVEL (30)', () => {
  assert.strictEqual(stats.thresholdForLevel(31), stats.thresholdForLevel(30));
});

test('thresholdForLevel(0) and negative levels = 0', () => {
  assert.strictEqual(stats.thresholdForLevel(0), 0);
  assert.strictEqual(stats.thresholdForLevel(-5), 0);
});

/* ──────────────────────── Level lookup ──────────────────────── */

test('levelForXp(0) = 1  (default)', () => {
  assert.strictEqual(stats.levelForXp(0), 1);
});

test('levelForXp(49) = 1  (just below L2)', () => {
  assert.strictEqual(stats.levelForXp(49), 1);
});

test('levelForXp(50) = 2  (exact threshold)', () => {
  assert.strictEqual(stats.levelForXp(50), 2);
});

test('levelForXp(100) >= 3', () => {
  assert.ok(stats.levelForXp(100) >= 3);
});

test('levelForXp(huge) caps at MAX_LEVEL', () => {
  assert.strictEqual(stats.levelForXp(1e9), stats.MAX_LEVEL);
});

/* ──────────────────────── XP progress bar ──────────────────────── */

test('xpProgressForLevel exactly at threshold = 0', () => {
  assert.strictEqual(stats.xpProgressForLevel(50, 2), 0);
});

test('xpProgressForLevel between thresholds = ratio 0..1', () => {
  const t2 = stats.thresholdForLevel(2);
  const t3 = stats.thresholdForLevel(3);
  const mid = t2 + Math.floor((t3 - t2) / 2);
  const p = stats.xpProgressForLevel(mid, 2);
  assert.ok(p > 0.3 && p < 0.7, `expected ~0.5, got ${p}`);
});

test('xpProgressForLevel at MAX_LEVEL = 1 (already maxed)', () => {
  assert.strictEqual(stats.xpProgressForLevel(99999, stats.MAX_LEVEL), 1);
});

/* ──────────────────────── XP formula ──────────────────────── */

test('computeXp on empty stats = 0', () => {
  assert.strictEqual(stats.computeXp(Object.assign({}, stats.DEFAULTS)), 0);
});

test('computeXp: 60s = 1 min × 0.7 fallback acc = 1 XP (no streak, no sessions)', () => {
  const s = Object.assign({}, stats.DEFAULTS, { totalSeconds: 60 });
  /* 1 minute × clamp(0.7, 0.5, 1.2) = 0.7 → round to 1 */
  assert.strictEqual(stats.computeXp(s), 1);
});

test('computeXp: accuracy floor protects beginners (0% → 0.5× mult)', () => {
  /* 10 min × clamp(0, 0.5, 1.2) = 10 × 0.5 = 5 XP */
  const low = Object.assign({}, stats.DEFAULTS, { totalSeconds: 600, questionsAnswered: 10, correctAnswered: 0 });
  assert.strictEqual(stats.computeXp(low), 5);
});

test('computeXp: perfect accuracy = 1.0× (clamp ceiling is 1.2, unreachable from data)', () => {
  /* 10 min × clamp(1.0, 0.5, 1.2) = 10 XP — the 1.2 ceiling can only
     be hit via a custom accuracy override, never via real data. */
  const high = Object.assign({}, stats.DEFAULTS, { totalSeconds: 600, questionsAnswered: 10, correctAnswered: 10 });
  assert.strictEqual(stats.computeXp(high), 10);
});

test('computeXp: streak adds 8 XP per day', () => {
  const s = Object.assign({}, stats.DEFAULTS, { streakDays: 5 });
  assert.strictEqual(stats.computeXp(s), 40);
});

test('computeXp: sessions add 2 XP each', () => {
  const s = Object.assign({}, stats.DEFAULTS, { sessionsCount: 10 });
  assert.strictEqual(stats.computeXp(s), 20);
});

test('computeXp: bonusXp adds 1:1', () => {
  const s = Object.assign({}, stats.DEFAULTS, { bonusXp: 100 });
  assert.strictEqual(stats.computeXp(s), 100);
});

/* ──────────────────────── Stage maps ──────────────────────── */

test('stageEmojiForLevel covers all 30 levels (no undefined)', () => {
  for (let n = 1; n <= 30; n++) {
    const e = stats.stageEmojiForLevel(n);
    assert.ok(e && typeof e === 'string' && e.length > 0, `level ${n} missing emoji`);
  }
});

test('stageNameForLevel covers all 30 levels', () => {
  for (let n = 1; n <= 30; n++) {
    const name = stats.stageNameForLevel(n);
    assert.ok(name && typeof name === 'string' && name.length > 0, `level ${n} missing name`);
  }
});

test('stageEmojiForLevel out-of-range clamps to first/last (no crash)', () => {
  assert.ok(stats.stageEmojiForLevel(0));
  assert.ok(stats.stageEmojiForLevel(999));
});

/* ──────────────────────── applySession reducer ──────────────────────── */

test('applySession: adds to totals + records date', () => {
  const s = Object.assign({}, stats.DEFAULTS);
  const res = stats.applySession(s, { secondsSpent: 300, questionsAnswered: 10, correct: 7 });
  assert.strictEqual(res.stats.totalSeconds, 300);
  assert.strictEqual(res.stats.questionsAnswered, 10);
  assert.strictEqual(res.stats.correctAnswered, 7);
  assert.strictEqual(res.stats.sessionsCount, 1);
  assert.ok(res.stats.sessionDates.length === 1);
});

test('applySession: per-pack breakdown', () => {
  const s = Object.assign({}, stats.DEFAULTS);
  const res = stats.applySession(s, { packId: 'ccna', secondsSpent: 120, questionsAnswered: 5, correct: 4 });
  assert.ok(res.stats.perPack.ccna);
  assert.strictEqual(res.stats.perPack.ccna.seconds, 120);
  assert.strictEqual(res.stats.perPack.ccna.qa, 5);
  assert.strictEqual(res.stats.perPack.ccna.correct, 4);
});

test('applySession: detects level-up and exposes prevLevel', () => {
  const s = Object.assign({}, stats.DEFAULTS, { totalSeconds: 0, questionsAnswered: 0, correctAnswered: 0 });
  /* Bury enough XP to cross from L1 → L2+ */
  const res = stats.applySession(s, { secondsSpent: 7200, questionsAnswered: 50, correct: 50 });
  assert.strictEqual(res.prevLevel, 1);
  assert.ok(res.stats.level >= 2, `expected level >=2, got ${res.stats.level}`);
  assert.strictEqual(res.leveledUp, true);
});

test('applySession: no level-up when XP gain is small', () => {
  const s = Object.assign({}, stats.DEFAULTS, { xp: 0, level: 1 });
  const res = stats.applySession(s, { secondsSpent: 30, questionsAnswered: 1, correct: 1 });
  assert.strictEqual(res.leveledUp, false);
});

test('applySession: same-day session preserves streak (no increment)', () => {
  const today = stats.todayKey();
  const s = Object.assign({}, stats.DEFAULTS, { streakDays: 3, lastSessionDate: today });
  const res = stats.applySession(s, { secondsSpent: 60, questionsAnswered: 1, correct: 1 });
  assert.strictEqual(res.stats.streakDays, 3);
});

test('applySession: yesterday → today increments streak', () => {
  const s = Object.assign({}, stats.DEFAULTS, { streakDays: 3, lastSessionDate: stats.yesterdayKey() });
  const res = stats.applySession(s, { secondsSpent: 60, questionsAnswered: 1, correct: 1 });
  assert.strictEqual(res.stats.streakDays, 4);
});

test('applySession: gap day resets streak to 1', () => {
  const s = Object.assign({}, stats.DEFAULTS, { streakDays: 7, lastSessionDate: '2020-01-01' });
  const res = stats.applySession(s, { secondsSpent: 60, questionsAnswered: 1, correct: 1 });
  assert.strictEqual(res.stats.streakDays, 1);
});

test('applySession: sessionDates dedups same-day pushes', () => {
  let s = Object.assign({}, stats.DEFAULTS);
  s = stats.applySession(s, { secondsSpent: 60 }).stats;
  s = stats.applySession(s, { secondsSpent: 60 }).stats; // same day again
  s = stats.applySession(s, { secondsSpent: 60 }).stats;
  assert.strictEqual(s.sessionDates.length, 1);
});

test('applySession: sessionDates capped at 60 entries', () => {
  let s = Object.assign({}, stats.DEFAULTS, {
    sessionDates: Array.from({ length: 60 }, (_, i) => '2024-01-' + String(i + 1).padStart(2, '0'))
  });
  s = stats.applySession(s, { secondsSpent: 60 }).stats;
  assert.ok(s.sessionDates.length <= 60);
});
