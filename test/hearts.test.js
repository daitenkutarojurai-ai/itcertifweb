/**
 * test/hearts.test.js — Phase 5.6: pure-state coverage for hearts.js.
 *
 * Verifies the regen + loss math and the cooldown countdown without
 * touching localStorage or the DOM. Browser-only side effects are
 * exercised manually in /path.html.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX, REGEN_MS, normalize, regenSync, applyLossSync, nextRegenMsFor } =
  require('../src/hearts.js');

test('normalize coerces missing/invalid input to a full-health state', () => {
  assert.deepEqual(normalize(null), { hearts: MAX, lastLostAt: 0 });
  assert.deepEqual(normalize({}), { hearts: MAX, lastLostAt: 0 });
  assert.deepEqual(normalize({ hearts: 'three', lastLostAt: 'now' }),
                   { hearts: MAX, lastLostAt: 0 });
});

test('normalize clamps hearts to [0, MAX]', () => {
  assert.equal(normalize({ hearts: -3, lastLostAt: 100 }).hearts, 0);
  assert.equal(normalize({ hearts: 99, lastLostAt: 100 }).hearts, MAX);
  assert.equal(normalize({ hearts: 3, lastLostAt: 100 }).hearts, 3);
});

test('regenSync is a no-op at full health', () => {
  const t0 = 1_000_000;
  const s = regenSync({ hearts: MAX, lastLostAt: 0 }, t0);
  assert.equal(s.hearts, MAX);
  assert.equal(s.lastLostAt, 0);
});

test('regenSync regenerates exactly N hearts after N×REGEN_MS', () => {
  const t0 = 1_000_000;
  // Lost 3 hearts, set lastLostAt at t0
  const start = { hearts: 2, lastLostAt: t0 };

  // 0 ms later — no regen
  assert.deepEqual(regenSync(start, t0), { hearts: 2, lastLostAt: t0 });
  // Just before the first tick — no regen
  assert.deepEqual(regenSync(start, t0 + REGEN_MS - 1),
                   { hearts: 2, lastLostAt: t0 });
  // Exactly one tick — +1 heart
  assert.equal(regenSync(start, t0 + REGEN_MS).hearts, 3);
  // Two ticks — +2 hearts, lastLostAt advances
  const r2 = regenSync(start, t0 + 2 * REGEN_MS);
  assert.equal(r2.hearts, 4);
  assert.equal(r2.lastLostAt, t0 + 2 * REGEN_MS);
});

test('regenSync caps at MAX and clears lastLostAt', () => {
  const t0 = 1_000_000;
  const r = regenSync({ hearts: 4, lastLostAt: t0 }, t0 + 100 * REGEN_MS);
  assert.equal(r.hearts, MAX);
  assert.equal(r.lastLostAt, 0);
});

test('regenSync without lastLostAt does nothing', () => {
  const t0 = 1_000_000;
  // No prior loss timestamp → can't compute elapsed → unchanged
  const r = regenSync({ hearts: 3, lastLostAt: 0 }, t0 + 5 * REGEN_MS);
  assert.deepEqual(r, { hearts: 3, lastLostAt: 0 });
});

test('applyLossSync decrements + stamps lastLostAt', () => {
  const t0 = 1_000_000;
  const r = applyLossSync({ hearts: 5, lastLostAt: 0 }, t0);
  assert.equal(r.hearts, 4);
  assert.equal(r.lastLostAt, t0);
});

test('applyLossSync is a no-op at 0 hearts (cooldown lock honoured)', () => {
  const t0 = 1_000_000;
  const r = applyLossSync({ hearts: 0, lastLostAt: t0 - 10_000 }, t0);
  assert.equal(r.hearts, 0);
  /* lastLostAt should not jump forward when no loss applied */
  assert.equal(r.lastLostAt, t0 - 10_000);
});

test('applyLossSync regen-then-loss in one call (state catches up)', () => {
  const t0 = 1_000_000;
  // Was at 1 heart, lost it at t0; we tick forward 2 cycles → +2 → 3 → -1 → 2
  const r = applyLossSync({ hearts: 1, lastLostAt: t0 }, t0 + 2 * REGEN_MS);
  assert.equal(r.hearts, 2);
  assert.equal(r.lastLostAt, t0 + 2 * REGEN_MS);
});

test('nextRegenMsFor counts down from REGEN_MS', () => {
  const t0 = 1_000_000;
  const s = { hearts: 2, lastLostAt: t0 };
  assert.equal(nextRegenMsFor(s, t0), REGEN_MS);
  assert.equal(nextRegenMsFor(s, t0 + 5 * 60 * 1000), REGEN_MS - 5 * 60 * 1000);
  // Right at the tick → next cycle starts (regen happened)
  assert.equal(nextRegenMsFor(s, t0 + REGEN_MS), REGEN_MS);
});

test('nextRegenMsFor returns 0 at full health', () => {
  assert.equal(nextRegenMsFor({ hearts: MAX, lastLostAt: 0 }, 999), 0);
});

test('cooldown lock: a wrong answer at 1 heart drops to 0 (gate trigger)', () => {
  const t0 = 1_000_000;
  // Player at 1 heart, takes one wrong answer
  const after = applyLossSync({ hearts: 1, lastLostAt: t0 - 1000 }, t0);
  assert.equal(after.hearts, 0, 'must hit zero so the gate can fire');
  assert.equal(after.lastLostAt, t0, 'cooldown timer starts now');
});

test('cooldown release: state recovers after REGEN_MS even from 0', () => {
  const t0 = 1_000_000;
  const empty = { hearts: 0, lastLostAt: t0 };
  const oneTick = regenSync(empty, t0 + REGEN_MS);
  assert.equal(oneTick.hearts, 1, 'one heart recovered after 30 min');
});
