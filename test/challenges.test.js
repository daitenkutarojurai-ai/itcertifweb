'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ch = require('../src/challenges.js');

test('WEEKLY templates are well-formed', () => {
  assert.ok(Array.isArray(ch.WEEKLY) && ch.WEEKLY.length >= 3);
  for (const t of ch.WEEKLY) {
    assert.ok(t.id && t.title && t.desc && t.icon);
    assert.ok(['count', 'nodes', 'streak'].includes(t.type));
    assert.ok(t.target > 0);
  }
});

test('isoWeek matches the YYYY-Www UTC format used across the app', () => {
  assert.strictEqual(ch.isoWeek(new Date('2026-06-01')), '2026-W23');
});

test('progressFor reads counts for count/nodes types and caps at target', () => {
  const sprint = ch.WEEKLY.find((t) => t.id === 'weekly-sprint');
  assert.strictEqual(ch.progressFor(sprint, { counts: { 'weekly-sprint': 40 } }), 40);
  assert.strictEqual(ch.progressFor(sprint, { counts: { 'weekly-sprint': 250 } }), sprint.target); // capped
  assert.strictEqual(ch.progressFor(sprint, {}), 0);
});

test('progressFor reads streakDays for streak type', () => {
  const streak = ch.WEEKLY.find((t) => t.type === 'streak');
  assert.strictEqual(ch.progressFor(streak, { streakDays: 3 }), 3);
  assert.strictEqual(ch.progressFor(streak, { streakDays: 99 }), streak.target); // capped
});

test('activeChallenges marks completed at/over target', () => {
  const list = ch.activeChallenges({ counts: { 'weekly-sprint': 100, 'path-crawler': 5 }, streakDays: 7 });
  const sprint = list.find((c) => c.id === 'weekly-sprint');
  const crawler = list.find((c) => c.id === 'path-crawler');
  const streak = list.find((c) => c.id === 'streak-keeper');
  assert.strictEqual(sprint.completed, true);
  assert.strictEqual(crawler.completed, false);
  assert.strictEqual(streak.completed, true);
});

test('activeChallenges returns one entry per template with progress + target', () => {
  const list = ch.activeChallenges({});
  assert.strictEqual(list.length, ch.WEEKLY.length);
  for (const c of list) {
    assert.ok('progress' in c && 'target' in c && 'completed' in c);
    assert.strictEqual(c.progress, 0);
    assert.strictEqual(c.completed, false);
  }
});

test('every WEEKLY template carries a positive XP reward', () => {
  for (const t of ch.WEEKLY) assert.ok(t.reward > 0, t.id + ' has a reward');
});

test('activeChallenges surfaces the reward amount', () => {
  const sprint = ch.activeChallenges({}).find((c) => c.id === 'weekly-sprint');
  const tmpl = ch.WEEKLY.find((t) => t.id === 'weekly-sprint');
  assert.strictEqual(sprint.reward, tmpl.reward);
});

test('rewardsToPay returns completed challenges not yet claimed', () => {
  const active = ch.activeChallenges({ counts: { 'weekly-sprint': 100, 'path-crawler': 15 }, streakDays: 0 });
  const pay = ch.rewardsToPay(active, {});
  const ids = pay.map((p) => p.id).sort();
  assert.deepStrictEqual(ids, ['path-crawler', 'weekly-sprint']);
  assert.ok(pay.every((p) => p.reward > 0));
});

test('rewardsToPay skips already-claimed challenges (one-time payout)', () => {
  const active = ch.activeChallenges({ counts: { 'weekly-sprint': 100 }, streakDays: 0 });
  assert.deepStrictEqual(ch.rewardsToPay(active, { 'weekly-sprint': true }), []);
});

test('rewardsToPay pays nothing when no challenge is complete', () => {
  const active = ch.activeChallenges({ counts: { 'weekly-sprint': 99 }, streakDays: 6 });
  assert.deepStrictEqual(ch.rewardsToPay(active, {}), []);
});
