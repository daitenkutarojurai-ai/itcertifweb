'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAdvice, prettyPack, applyPersona, PERSONAS } = require('../src/coach.js');

const TODAY = '2026-06-01';
const YESTERDAY = '2026-05-31';
const base = (over) => Object.assign({
  stats: { sessionsCount: 3, streakDays: 0, lastSessionDate: TODAY, level: 4, xp: 320, perPack: {} },
  roadmap: { certs: [] },
  laurels: [],
  hearts: { hearts: 3 },
  todayKey: TODAY,
  yesterdayKey: YESTERDAY,
}, over || {});

test('prettyPack upper-cases and spaces a pack id', () => {
  assert.strictEqual(prettyPack('aws-saa-c03'), 'AWS SAA C03');
});

test('cold start (no sessions) returns only the start tip', () => {
  const tips = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3);
  assert.strictEqual(tips.length, 1);
  assert.strictEqual(tips[0].id, 'cold-start');
  assert.match(tips[0].cta.href, /\/certifications\//);
});

test('streak at risk fires when a streak exists and not studied today', () => {
  const tips = computeAdvice(base({ stats: { sessionsCount: 5, streakDays: 7, lastSessionDate: YESTERDAY, perPack: {} } }), 3);
  const t = tips.find((x) => x.id === 'streak-risk');
  assert.ok(t, 'streak-risk tip present');
  assert.match(t.title, /7-day/);
  assert.strictEqual(tips[0].id, 'streak-risk', 'streak risk is highest priority among non-coldstart');
});

test('streak at risk is suppressed once studied today', () => {
  const tips = computeAdvice(base({ stats: { sessionsCount: 5, streakDays: 7, lastSessionDate: TODAY, perPack: {} } }), 5);
  assert.ok(!tips.find((x) => x.id === 'streak-risk'));
});

test('weakest pack picks the lowest-accuracy pack with enough data and links a drill', () => {
  const perPack = {
    'aws-saa-c03': { qa: 10, correct: 9 },       // 90% — strong
    'az-104':      { qa: 8, correct: 4 },         // 50% — weak
    'ckad':        { qa: 3, correct: 0 },         // too few questions, ignored
  };
  const tips = computeAdvice(base({ stats: { sessionsCount: 9, streakDays: 0, lastSessionDate: TODAY, perPack } }), 5);
  const t = tips.find((x) => x.id === 'weak-pack');
  assert.ok(t, 'weak-pack tip present');
  assert.match(t.title, /AZ 104/);
  assert.match(t.cta.href, /pack=az-104/);
});

test('no weak pack when accuracy is healthy', () => {
  const perPack = { 'az-104': { qa: 20, correct: 18 } };
  const tips = computeAdvice(base({ stats: { sessionsCount: 5, streakDays: 0, lastSessionDate: TODAY, perPack } }), 5);
  assert.ok(!tips.find((x) => x.id === 'weak-pack'));
});

test('roadmap-next points at the first unfinished cert', () => {
  const roadmap = { certs: [{ id: 'aws-saa-c03', done: true }, { id: 'az-500', done: false }, { id: 'cka', done: false }] };
  const tips = computeAdvice(base({ roadmap }), 5);
  const t = tips.find((x) => x.id === 'roadmap-next');
  assert.ok(t);
  assert.match(t.cta.href, /pack=az-500/);
});

test('empty roadmap nudges to build one (and roadmap-next absent)', () => {
  const tips = computeAdvice(base({ roadmap: { certs: [] } }), 5);
  assert.ok(tips.find((x) => x.id === 'no-roadmap'));
  assert.ok(!tips.find((x) => x.id === 'roadmap-next'));
});

test('hearts-full tip appears only at full hearts', () => {
  const full = computeAdvice(base({ hearts: { hearts: 5 } }), 6);
  assert.ok(full.find((x) => x.id === 'hearts-full'));
  const low = computeAdvice(base({ hearts: { hearts: 2 } }), 6);
  assert.ok(!low.find((x) => x.id === 'hearts-full'));
});

test('momentum fallback is always available for an active user', () => {
  const tips = computeAdvice(base(), 6);
  assert.ok(tips.find((x) => x.id === 'momentum'));
});

test('respects maxTips and returns priority-sorted tips', () => {
  const perPack = { 'az-104': { qa: 8, correct: 4 } };
  const tips = computeAdvice(base({
    stats: { sessionsCount: 9, streakDays: 7, lastSessionDate: YESTERDAY, level: 3, xp: 200, perPack },
    roadmap: { certs: [{ id: 'cka', done: false }] }, hearts: { hearts: 5 },
  }), 3);
  assert.strictEqual(tips.length, 3);
  for (let i = 1; i < tips.length; i++) assert.ok(tips[i - 1].weight >= tips[i].weight);
  assert.strictEqual(tips[0].id, 'streak-risk');
});

/* ── Mentor personas (8.6) ──────────────────────────────────────────── */
test('there are 4 personas, chill is the default/first', () => {
  assert.strictEqual(PERSONAS.length, 4);
  assert.strictEqual(PERSONAS[0].id, 'chill');
  assert.ok(PERSONAS.every((p) => p.id && p.name && p.emoji && p.accent && p.intro));
});

test('chill / unknown persona leaves base copy untouched', () => {
  const base0 = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3, 'chill');
  const none = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3);
  const bogus = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3, 'nope');
  assert.strictEqual(base0[0].title, none[0].title);
  assert.strictEqual(bogus[0].title, none[0].title);
});

test('sergeant persona re-voices the cold-start tip but keeps the CTA', () => {
  const chill = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3, 'chill');
  const sgt = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3, 'sergeant');
  assert.notStrictEqual(sgt[0].title, chill[0].title);
  assert.match(sgt[0].title, /MOVE/);
  assert.strictEqual(sgt[0].cta.href, chill[0].cta.href); // CTA unchanged
  assert.strictEqual(sgt[0].id, 'cold-start');
});

test('persona interpolates dynamic vars (streak count, pack name)', () => {
  const ctx = base({ stats: { sessionsCount: 5, streakDays: 9, lastSessionDate: YESTERDAY, perPack: {} } });
  const senior = computeAdvice(ctx, 3, 'senior');
  const t = senior.find((x) => x.id === 'streak-risk');
  assert.ok(t);
  assert.match(t.title, /9-day/);
});

test('applyPersona never mutates the input tips', () => {
  const tips = computeAdvice(base({ stats: { sessionsCount: 0, perPack: {} } }), 3, 'chill');
  const before = tips[0].title;
  applyPersona(tips, 'faang');
  assert.strictEqual(tips[0].title, before);
});
