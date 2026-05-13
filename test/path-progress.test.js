/**
 * test/path-progress.test.js — characterization tests for path-progress.js
 *
 * Pure-function coverage for the path-node-progress + laurel-award logic
 * that backs /path.html. Runs under Node's built-in test runner — no
 * extra deps. The browser layer (src/path.js) adds localStorage + event
 * dispatch on top of these functions.
 *
 * Run:  npm test  (or: node --test test/)
 */
const test   = require('node:test');
const assert = require('node:assert/strict');
const PP     = require('../src/path-progress.js');

/* ────────────────────────── isComplete ────────────────────────── */

test('isComplete returns false on an empty progress map', () => {
  assert.equal(PP.isComplete({}, 'aws-saa-c03', 'c1-concept'), false);
});

test('isComplete returns false when the pack has no entry for the node', () => {
  assert.equal(PP.isComplete({ 'aws-saa-c03': {} }, 'aws-saa-c03', 'c1-concept'), false);
});

test('isComplete returns false when the node entry exists but is not completed', () => {
  const progress = { 'aws-saa-c03': { 'c1-concept': { completed: false } } };
  assert.equal(PP.isComplete(progress, 'aws-saa-c03', 'c1-concept'), false);
});

test('isComplete returns true once a node is marked complete', () => {
  const progress = { 'aws-saa-c03': { 'c1-concept': { completed: true, score: 100 } } };
  assert.equal(PP.isComplete(progress, 'aws-saa-c03', 'c1-concept'), true);
});

test('isComplete tolerates null progress (defensive)', () => {
  assert.equal(PP.isComplete(null, 'aws-saa-c03', 'c1-concept'), false);
});

/* ────────────────────────── markComplete ────────────────────────── */

test('markComplete writes completed:true with the given score + timestamp', () => {
  const res = PP.markComplete({}, 'aws-saa-c03', 'c1-quiz', 80, 1700000000000);
  assert.equal(res.progress['aws-saa-c03']['c1-quiz'].completed, true);
  assert.equal(res.progress['aws-saa-c03']['c1-quiz'].score, 80);
  assert.equal(res.progress['aws-saa-c03']['c1-quiz'].completedAt, 1700000000000);
  assert.equal(res.alreadyDone, false);
});

test('markComplete reports alreadyDone:true on a second call for the same node', () => {
  const first  = PP.markComplete({}, 'aws-saa-c03', 'c1-quiz', 80, 1);
  const second = PP.markComplete(first.progress, 'aws-saa-c03', 'c1-quiz', 95, 2);
  assert.equal(second.alreadyDone, true);
  /* The newer score overwrites — this is the live behavior path.js relies on */
  assert.equal(second.progress['aws-saa-c03']['c1-quiz'].score, 95);
});

test('markComplete does not mutate the input progress object', () => {
  const input = { 'aws-saa-c03': { 'c1-concept': { completed: true } } };
  const snapshot = JSON.stringify(input);
  PP.markComplete(input, 'aws-saa-c03', 'c1-quiz', 100, 1);
  assert.equal(JSON.stringify(input), snapshot);
});

test('markComplete preserves untouched packs', () => {
  const input = {
    'aws-saa-c03': { 'c1-concept': { completed: true, score: 100 } },
    'cissp':       { 'c1-concept': { completed: true, score: 75  } }
  };
  const res = PP.markComplete(input, 'aws-saa-c03', 'c1-quiz', 80, 1);
  assert.equal(res.progress['cissp']['c1-concept'].score, 75);
  assert.equal(res.progress['aws-saa-c03']['c1-concept'].completed, true);
});

test('markComplete coerces a missing score to null (storage stays clean)', () => {
  const res = PP.markComplete({}, 'cissp', 'c1-concept', undefined, 1);
  assert.equal(res.progress['cissp']['c1-concept'].score, null);
});

/* ────────────────────────── flattenNodes ────────────────────────── */

const PATH_FIXTURE = {
  packId: 'cissp',
  chapters: [
    { id: 'ch1', title: 'Part 1', nodes: [
      { id: 'c1-concept', type: 'concept' },
      { id: 'c1-quiz',    type: 'quiz' },
      { id: 'c1-boss',    type: 'subboss' }
    ]},
    { id: 'ch2', title: 'Part 2', nodes: [
      { id: 'c2-concept', type: 'concept' },
      { id: 'c2-chest',   type: 'chest' }
    ]}
  ],
  finalBoss: { id: 'final-boss', type: 'finalboss', title: 'Final Exam', questionCount: 15 }
};

test('flattenNodes returns chapter nodes in order, with final boss appended', () => {
  const flat = PP.flattenNodes(PATH_FIXTURE);
  assert.deepEqual(flat.map(n => n.id), [
    'c1-concept', 'c1-quiz', 'c1-boss', 'c2-concept', 'c2-chest', 'final-boss'
  ]);
});

test('flattenNodes attaches chapterId + chapterTitle to each node', () => {
  const flat = PP.flattenNodes(PATH_FIXTURE);
  assert.equal(flat[0].chapterId, 'ch1');
  assert.equal(flat[0].chapterTitle, 'Part 1');
  assert.equal(flat[3].chapterId, 'ch2');
});

test('flattenNodes marks final boss with isFinal + chapterId="final"', () => {
  const flat = PP.flattenNodes(PATH_FIXTURE);
  const last = flat[flat.length - 1];
  assert.equal(last.isFinal, true);
  assert.equal(last.chapterId, 'final');
  assert.equal(last.chapterTitle, 'Final Exam');
});

test('flattenNodes returns [] for a malformed path', () => {
  assert.deepEqual(PP.flattenNodes(null), []);
  assert.deepEqual(PP.flattenNodes({}), []);
});

/* ────────────────────────── findCurrentNodeIdx ────────────────────────── */

test('findCurrentNodeIdx returns 0 when nothing is complete', () => {
  const nodes = PP.flattenNodes(PATH_FIXTURE);
  assert.equal(PP.findCurrentNodeIdx({}, 'cissp', nodes), 0);
});

test('findCurrentNodeIdx skips past completed nodes to the next gate', () => {
  const nodes = PP.flattenNodes(PATH_FIXTURE);
  const progress = { 'cissp': {
    'c1-concept': { completed: true }, 'c1-quiz': { completed: true }
  }};
  assert.equal(PP.findCurrentNodeIdx(progress, 'cissp', nodes), 2); // c1-boss
});

test('findCurrentNodeIdx returns nodes.length when the whole path is done', () => {
  const nodes = PP.flattenNodes(PATH_FIXTURE);
  const progress = { 'cissp': {} };
  nodes.forEach(n => { progress.cissp[n.id] = { completed: true }; });
  assert.equal(PP.findCurrentNodeIdx(progress, 'cissp', nodes), nodes.length);
});

/* ────────────────────────── snapshotProgress + packPercent ────────────── */

test('snapshotProgress emits one entry per flattened node', () => {
  const snap = PP.snapshotProgress({}, PATH_FIXTURE);
  assert.equal(snap.length, 6);
  assert.equal(snap.every(s => s.completed === false), true);
});

test('snapshotProgress preserves chapter grouping for chapter-end detection', () => {
  const progress = { cissp: { 'c1-concept': { completed: true }, 'c1-quiz': { completed: true } } };
  const snap = PP.snapshotProgress(progress, PATH_FIXTURE);
  const ch1 = snap.filter(s => s.chapterId === 'ch1');
  assert.equal(ch1.length, 3);
  assert.equal(ch1.filter(s => s.completed).length, 2);
});

test('packPercent rounds (done / total) × 100', () => {
  assert.equal(PP.packPercent({}, PATH_FIXTURE), 0);
  const halfDone = { cissp: {
    'c1-concept': { completed: true },
    'c1-quiz':    { completed: true },
    'c1-boss':    { completed: true }
  }};
  assert.equal(PP.packPercent(halfDone, PATH_FIXTURE), 50); // 3/6
});

/* ────────────────────────── awardLaurelIfNeeded ────────────────────────── */

test('awardLaurelIfNeeded appends a fresh laurel on first call', () => {
  const res = PP.awardLaurelIfNeeded([], 'cissp', 95, 1700000000000);
  assert.equal(res.newlyAwarded, true);
  assert.equal(res.laurels.length, 1);
  assert.equal(res.laurels[0].packId, 'cissp');
  assert.equal(res.laurels[0].score, 95);
});

test('awardLaurelIfNeeded is idempotent on a second call for the same pack', () => {
  const first  = PP.awardLaurelIfNeeded([], 'cissp', 95, 1);
  const second = PP.awardLaurelIfNeeded(first.laurels, 'cissp', 88, 2);
  assert.equal(second.newlyAwarded, false);
  assert.equal(second.laurels.length, 1);
  /* Original score preserved — we don't overwrite earned laurels */
  assert.equal(second.laurels[0].score, 95);
});

test('awardLaurelIfNeeded keeps laurels from other packs intact', () => {
  const existing = [{ packId: 'aws-saa-c03', earnedAt: 1, score: 100 }];
  const res = PP.awardLaurelIfNeeded(existing, 'cissp', 75, 2);
  assert.equal(res.newlyAwarded, true);
  assert.equal(res.laurels.length, 2);
  assert.equal(res.laurels[0].packId, 'aws-saa-c03');
  assert.equal(res.laurels[1].packId, 'cissp');
});

test('awardLaurelIfNeeded does not mutate the input array', () => {
  const existing = [{ packId: 'aws-saa-c03', earnedAt: 1, score: 100 }];
  const before = JSON.stringify(existing);
  PP.awardLaurelIfNeeded(existing, 'cissp', 75, 2);
  assert.equal(JSON.stringify(existing), before);
});

test('awardLaurelIfNeeded tolerates non-array input (defensive)', () => {
  const res = PP.awardLaurelIfNeeded(null, 'cissp', 75, 1);
  assert.equal(res.newlyAwarded, true);
  assert.equal(res.laurels.length, 1);
});
