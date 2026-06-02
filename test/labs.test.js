'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeLab, rankLabs, correctIndex } = require('../src/labs.js');

const lab = {
  id: 'demo', cert: 'cka', domain: 'devops', difficulty: 'intermediate',
  steps: [
    { prompt: 'a', options: [{ text: 'x', correct: true }, { text: 'y' }] },
    { prompt: 'b', options: [{ text: 'x' }, { text: 'y', correct: true }] },
    { prompt: 'c', options: [{ text: 'x' }, { text: 'y' }, { text: 'z', correct: true }] }
  ]
};

test('correctIndex finds the correct option (or -1)', () => {
  assert.strictEqual(correctIndex(lab.steps[0]), 0);
  assert.strictEqual(correctIndex(lab.steps[2]), 2);
  assert.strictEqual(correctIndex({ options: [{ text: 'a' }] }), -1);
});

test('all-correct first picks → 100', () => {
  const g = gradeLab([0, 1, 2], lab);
  assert.strictEqual(g.score, 100);
  assert.strictEqual(g.correct, 3);
  assert.strictEqual(g.total, 3);
  assert.ok(g.perStep.every((p) => p.correct));
});

test('mixed first picks score proportionally', () => {
  const g = gradeLab([0, 0, 2], lab); // step 2 wrong
  assert.strictEqual(g.correct, 2);
  assert.strictEqual(g.score, 67);
  assert.strictEqual(g.perStep[1].correct, false);
  assert.strictEqual(g.perStep[1].correctIndex, 1);
});

test('null (unanswered) first pick counts as wrong, not a crash', () => {
  const g = gradeLab([0, null, 2], lab);
  assert.strictEqual(g.correct, 2);
  assert.strictEqual(g.perStep[1].firstPick, null);
});

test('empty lab grades to 0/0 without dividing by zero', () => {
  const g = gradeLab([], { steps: [] });
  assert.strictEqual(g.score, 0);
  assert.strictEqual(g.total, 0);
});

test('rankLabs surfaces weak-pack labs first, then started, then rest', () => {
  const labs = [
    { id: 'a', cert: 'aws-saa-c03', difficulty: 'intro' },
    { id: 'b', cert: 'cka', difficulty: 'advanced' },
    { id: 'c', cert: 'rhcsa', difficulty: 'intro' }
  ];
  const ranked = rankLabs(labs, { weak: { cka: 1 }, started: { 'aws-saa-c03': 1 } });
  assert.strictEqual(ranked[0].lab.id, 'b'); // weak
  assert.strictEqual(ranked[0].recommended, true);
  assert.strictEqual(ranked[1].lab.id, 'a'); // started
  assert.strictEqual(ranked[2].lab.id, 'c'); // neither
  assert.strictEqual(ranked[2].recommended, false);
});

test('rankLabs is a no-op-safe copy with empty context (orders by difficulty)', () => {
  const labs = [
    { id: 'adv', difficulty: 'advanced' },
    { id: 'int', difficulty: 'intro' },
    { id: 'mid', difficulty: 'intermediate' }
  ];
  const ranked = rankLabs(labs, {});
  assert.deepStrictEqual(ranked.map((r) => r.lab.id), ['int', 'mid', 'adv']);
  assert.ok(ranked.every((r) => r.recommended === false));
});

test('rankLabs accepts Sets as well as maps', () => {
  const labs = [{ id: 'a', cert: 'cka', difficulty: 'intro' }, { id: 'b', cert: 'rhcsa', difficulty: 'intro' }];
  const ranked = rankLabs(labs, { weak: new Set(['rhcsa']) });
  assert.strictEqual(ranked[0].lab.id, 'b');
});

test('shipped lab bank is well-formed (exactly one correct option per step)', () => {
  const bank = require('../data/labs/labs.json');
  assert.ok(Array.isArray(bank.labs) && bank.labs.length >= 6);
  bank.labs.forEach((l) => {
    assert.ok(l.id && l.title && l.scenario && l.takeaway, l.id + ' missing fields');
    assert.ok(l.steps.length >= 3, l.id + ' needs >=3 steps');
    l.steps.forEach((s, i) => {
      const correct = s.options.filter((o) => o.correct === true);
      assert.strictEqual(correct.length, 1, l.id + ' step ' + i + ' must have exactly one correct option');
      s.options.forEach((o) => assert.ok(o.text && o.feedback, l.id + ' step ' + i + ' option needs text+feedback'));
      assert.ok(s.prompt, l.id + ' step ' + i + ' needs a prompt');
    });
  });
});
