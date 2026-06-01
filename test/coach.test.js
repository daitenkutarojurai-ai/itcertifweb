'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAdvice, prettyPack } = require('../src/coach.js');

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
