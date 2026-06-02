'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreAnswer, scoreSession, debrief, WORD_TARGET } = require('../src/mock-interview.js');

const q = { q: 'Explain HA across AZs', keywords: ['availability zone', 'load balancer', 'failover'] };

test('empty answer scores 0 and is not answered', () => {
  const r = scoreAnswer('', q);
  assert.strictEqual(r.score, 0);
  assert.strictEqual(r.answered, false);
  assert.strictEqual(r.wordCount, 0);
  assert.deepStrictEqual(r.hits, []);
  assert.deepStrictEqual(r.missed, q.keywords);
});

test('whitespace-only answer counts as unanswered', () => {
  const r = scoreAnswer('   \n  ', q);
  assert.strictEqual(r.answered, false);
  assert.strictEqual(r.score, 0);
});

test('keyword hits are case-insensitive substring matches', () => {
  const r = scoreAnswer('I would spread instances across each Availability Zone behind a Load Balancer.', q);
  assert.deepStrictEqual(r.hits.sort(), ['availability zone', 'load balancer']);
  assert.deepStrictEqual(r.missed, ['failover']);
});

test('a full, on-point answer scores high', () => {
  const long = 'I would deploy across multiple availability zone targets behind a load balancer and automate failover so traffic reroutes when one zone degrades, keeping the service available.';
  const r = scoreAnswer(long, q);
  assert.ok(r.score >= 80, 'expected >=80, got ' + r.score);
  assert.strictEqual(r.missed.length, 0);
});

test('substance is capped at WORD_TARGET words', () => {
  const exactlyTarget = Array.from({ length: WORD_TARGET }, () => 'word').join(' ');
  const over = Array.from({ length: WORD_TARGET * 3 }, () => 'word').join(' ');
  // no keywords hit in either; only answered(0.4) + substance(0.3) contribute, both capped
  assert.strictEqual(scoreAnswer(exactlyTarget, q).score, scoreAnswer(over, q).score);
});

test('answered-but-empty-keywords question still credits substance', () => {
  const noKw = { q: 'Tell me about yourself', keywords: [] };
  const r = scoreAnswer('I am a cloud engineer with five years of experience building reliable systems.', noKw);
  // coverage falls back to 1 when answered and no keywords
  assert.ok(r.score >= 70);
});

test('scoreSession averages and counts answered', () => {
  const questions = [q, { q: 'x', keywords: ['tcp'] }, { q: 'y', keywords: ['vlan'] }];
  const answers = ['availability zone load balancer failover redundancy across zones', '', 'a vlan segments the broadcast domain'];
  const s = scoreSession(answers, questions);
  assert.strictEqual(s.total, 3);
  assert.strictEqual(s.answeredCount, 2);
  assert.strictEqual(s.perQuestion.length, 3);
  assert.strictEqual(s.perQuestion[1].score, 0);
  const avg = Math.round((s.perQuestion[0].score + s.perQuestion[1].score + s.perQuestion[2].score) / 3);
  assert.strictEqual(s.overall, avg);
});

test('debrief escalates with score and handles the all-skipped case', () => {
  assert.match(debrief(0, 0, 5), /skipped every question/i);
  assert.match(debrief(85, 5, 5), /strong/i);
  assert.match(debrief(65, 5, 5), /solid/i);
  assert.match(debrief(45, 3, 5), /decent/i);
  assert.match(debrief(20, 1, 5), /early/i);
});

test('the shipped bank loads and every question has scorable keywords', () => {
  const bank = require('../data/interview/mock.json');
  assert.ok(Array.isArray(bank.tracks) && bank.tracks.length >= 5);
  bank.tracks.forEach((t) => {
    assert.ok(t.questions.length >= 3, t.id + ' needs >=3 questions');
    t.questions.forEach((qq) => {
      assert.ok(qq.q && qq.hint, 'question + hint required');
      assert.ok(Array.isArray(qq.keywords) && qq.keywords.length >= 1, qq.q + ' needs keywords');
    });
  });
});
