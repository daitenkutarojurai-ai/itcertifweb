/**
 * test/sr.test.js — spaced-repetition engine (src/sr.js)
 * Shims localStorage before require so the browser storage path is exercised.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const sr = require('../src/sr.js');
const PACK = 'p';
const T0 = 1_000_000_000_000;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

test.beforeEach(() => store.clear());

test('first-sight correct is not enqueued', () => {
  assert.strictEqual(sr.report(PACK, 'q1', true, T0), null);
  assert.strictEqual(sr.dueCount(PACK, T0 + 999 * DAY), 0);
});

test('a miss enqueues with a 30-min cooldown (not due immediately)', () => {
  sr.report(PACK, 'q1', false, T0);
  assert.strictEqual(sr.dueCount(PACK, T0), 0);             // still cooling down
  assert.strictEqual(sr.dueCount(PACK, T0 + 31 * MIN), 1);  // due after cooldown
  assert.deepStrictEqual(sr.dueIds(PACK, T0 + 31 * MIN), ['q1']);
});

test('reviewing a missed item correctly graduates the due date outward', () => {
  sr.report(PACK, 'q1', false, T0);                 // miss → due +30m
  const rec = sr.report(PACK, 'q1', true, T0 + 31 * MIN); // first correct review → +1 day
  assert.strictEqual(rec.reps, 1);
  assert.strictEqual(sr.dueCount(PACK, T0 + 31 * MIN), 0);          // not due right after
  assert.strictEqual(sr.dueCount(PACK, T0 + 31 * MIN + DAY + MIN), 1); // due ~1 day later
});

test('repeated correct reviews push the interval further each time', () => {
  sr.report(PACK, 'q1', false, T0);
  const r1 = sr.report(PACK, 'q1', true, T0 + MIN);          // reps 1 → +1d
  const r2 = sr.report(PACK, 'q1', true, T0 + MIN + DAY);    // reps 2 → +3d
  assert.strictEqual(r1.reps, 1);
  assert.strictEqual(r2.reps, 2);
  assert.ok(r2.due - (T0 + MIN + DAY) > 2 * DAY); // ~3 days
});

test('missing a graduated item resets it to the cooldown', () => {
  sr.report(PACK, 'q1', false, T0);
  sr.report(PACK, 'q1', true, T0 + MIN);
  const rec = sr.report(PACK, 'q1', false, T0 + 2 * DAY); // miss again → reset
  assert.strictEqual(rec.reps, 0);
  assert.strictEqual(sr.dueCount(PACK, T0 + 2 * DAY + 31 * MIN), 1);
});

test('due lists are per-pack', () => {
  sr.report('packA', 'q1', false, T0);
  sr.report('packB', 'q2', false, T0);
  assert.deepStrictEqual(sr.dueIds('packA', T0 + DAY), ['q1']);
  assert.deepStrictEqual(sr.dueIds('packB', T0 + DAY), ['q2']);
});
