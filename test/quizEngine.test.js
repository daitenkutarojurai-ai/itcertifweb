/**
 * test/quizEngine.test.js — characterization tests for src/engine/quizEngine.js
 *
 * Locks the pure-logic surface: answer-correctness checks (single + multi),
 * malformed-question filtering in createQuiz, and the lifecycle helpers
 * (nextQuestion / isComplete / getResults).
 *
 * Run:  node --test test/
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const q = require('../src/engine/quizEngine.js');

/* ───── Fixtures ─────────────────────────────────────────────────────────── */

const Q_SINGLE = {
  id: 'q1',
  question: 'Single-select question',
  options: ['A', 'B', 'C', 'D'],
  correct: 2,
};

const Q_MULTI = {
  id: 'q2',
  question: 'Multi-select question',
  options: ['A', 'B', 'C', 'D'],
  correct: [0, 2],
};

const Q_MULTI_THREE = {
  id: 'q3',
  question: 'Multi-select with three correct',
  options: ['A', 'B', 'C', 'D'],
  correct: [0, 1, 3],
};

/* ───── isAnswerCorrect — single-select ──────────────────────────────────── */

test('isAnswerCorrect: single, exact match', () => {
  assert.strictEqual(q.isAnswerCorrect(2, 2), true);
});

test('isAnswerCorrect: single, wrong index', () => {
  assert.strictEqual(q.isAnswerCorrect(2, 1), false);
});

test('isAnswerCorrect: single, timeout sentinel (-1)', () => {
  assert.strictEqual(q.isAnswerCorrect(2, -1), false);
});

test('isAnswerCorrect: single, array selected on single question = wrong', () => {
  assert.strictEqual(q.isAnswerCorrect(2, [2]), false);
});

/* ───── isAnswerCorrect — multi-select ───────────────────────────────────── */

test('isAnswerCorrect: multi, set equality regardless of order', () => {
  assert.strictEqual(q.isAnswerCorrect([0, 2], [2, 0]), true);
});

test('isAnswerCorrect: multi, missing one correct = wrong', () => {
  assert.strictEqual(q.isAnswerCorrect([0, 2], [0]), false);
});

test('isAnswerCorrect: multi, extra wrong = wrong', () => {
  assert.strictEqual(q.isAnswerCorrect([0, 2], [0, 1, 2]), false);
});

test('isAnswerCorrect: multi, selected is not array = wrong', () => {
  assert.strictEqual(q.isAnswerCorrect([0, 2], 0), false);
});

test('isAnswerCorrect: multi, empty selection = wrong', () => {
  assert.strictEqual(q.isAnswerCorrect([0, 2], []), false);
});

test('isAnswerCorrect: multi, three-correct set equality', () => {
  assert.strictEqual(q.isAnswerCorrect([0, 1, 3], [3, 0, 1]), true);
});

/* ───── isMultiSelect ────────────────────────────────────────────────────── */

test('isMultiSelect: array correct = true', () => {
  assert.strictEqual(q.isMultiSelect(Q_MULTI), true);
});

test('isMultiSelect: number correct = false', () => {
  assert.strictEqual(q.isMultiSelect(Q_SINGLE), false);
});

/* ───── createQuiz — malformed filter ────────────────────────────────────── */

test('createQuiz: drops questions with !== 4 options', () => {
  const pool = [
    Q_SINGLE,
    { id: 'bad1', question: '3 options', options: ['A','B','C'], correct: 0 },
    { id: 'bad2', question: '5 options', options: ['A','B','C','D','E'], correct: 0 },
  ];
  const quiz = q.createQuiz(pool, { count: 10, shuffle: false });
  assert.strictEqual(quiz.questions.length, 1);
  assert.strictEqual(quiz.questions[0].id, 'q1');
});

test('createQuiz: drops single-select with out-of-range correct', () => {
  const pool = [
    Q_SINGLE,
    { id: 'oor', question: 'oor', options: ['A','B','C','D'], correct: 4 },
    { id: 'neg', question: 'neg', options: ['A','B','C','D'], correct: -1 },
    { id: 'flo', question: 'flo', options: ['A','B','C','D'], correct: 1.5 },
  ];
  const quiz = q.createQuiz(pool, { count: 10, shuffle: false });
  assert.strictEqual(quiz.questions.length, 1);
});

test('createQuiz: keeps multi-select with valid indices', () => {
  const quiz = q.createQuiz([Q_MULTI], { count: 10, shuffle: false });
  assert.strictEqual(quiz.questions.length, 1);
  assert.deepStrictEqual(quiz.questions[0].correct, [0, 2]);
});

test('createQuiz: drops multi-select with empty correct array', () => {
  const bad = { id: 'me', question: 'me', options: ['A','B','C','D'], correct: [] };
  const quiz = q.createQuiz([Q_SINGLE, bad], { count: 10, shuffle: false });
  assert.strictEqual(quiz.questions.length, 1);
});

test('createQuiz: drops multi-select with out-of-range index', () => {
  const bad = { id: 'me', question: 'me', options: ['A','B','C','D'], correct: [0, 4] };
  const quiz = q.createQuiz([Q_SINGLE, bad], { count: 10, shuffle: false });
  assert.strictEqual(quiz.questions.length, 1);
});

test('createQuiz: drops questions missing options array', () => {
  const bad = { id: 'no', question: 'no', correct: 0 };
  const quiz = q.createQuiz([Q_SINGLE, bad], { count: 10, shuffle: false });
  assert.strictEqual(quiz.questions.length, 1);
});

test('createQuiz: caps pool at count, even if more questions provided', () => {
  const pool = Array.from({ length: 20 }, (_, i) => ({
    id: `q${i}`, question: 'q', options: ['A','B','C','D'], correct: 0,
  }));
  const quiz = q.createQuiz(pool, { count: 5, shuffle: false });
  assert.strictEqual(quiz.questions.length, 5);
});

/* ───── Lifecycle: answer / next / complete / results ────────────────────── */

test('answerQuestion: records answer, returns isCorrect', () => {
  const quiz = q.createQuiz([Q_SINGLE], { count: 1, shuffle: false });
  const isCorrect = q.answerQuestion(quiz, 2);
  assert.strictEqual(isCorrect, true);
  assert.strictEqual(quiz.answers.length, 1);
  assert.strictEqual(quiz.answers[0].isCorrect, true);
  assert.strictEqual(quiz.answers[0].questionId, 'q1');
});

test('answerQuestion: wrong answer records isCorrect:false', () => {
  const quiz = q.createQuiz([Q_SINGLE], { count: 1, shuffle: false });
  q.answerQuestion(quiz, 0);
  assert.strictEqual(quiz.answers[0].isCorrect, false);
});

test('nextQuestion + isComplete: advance through quiz', () => {
  const pool = [Q_SINGLE, Q_SINGLE, Q_SINGLE];
  const quiz = q.createQuiz(pool, { count: 3, shuffle: false });
  assert.strictEqual(q.isComplete(quiz), false);
  q.answerQuestion(quiz, 2); q.nextQuestion(quiz);
  q.answerQuestion(quiz, 2); q.nextQuestion(quiz);
  assert.strictEqual(q.isComplete(quiz), false); // last question still pending answer
  q.answerQuestion(quiz, 2); q.nextQuestion(quiz);
  assert.strictEqual(q.isComplete(quiz), true);
});

test('getResults: percentage matches correct ratio', () => {
  const pool = [Q_SINGLE, Q_SINGLE, Q_SINGLE, Q_SINGLE];
  const quiz = q.createQuiz(pool, { count: 4, shuffle: false });
  q.answerQuestion(quiz, 2); q.nextQuestion(quiz); // correct
  q.answerQuestion(quiz, 0); q.nextQuestion(quiz); // wrong
  q.answerQuestion(quiz, 2); q.nextQuestion(quiz); // correct
  q.answerQuestion(quiz, 1); q.nextQuestion(quiz); // wrong
  const r = q.getResults(quiz);
  assert.strictEqual(r.score, 2);
  assert.strictEqual(r.total, 4);
  assert.strictEqual(r.percentage, 50);
});

test('getResults: empty quiz returns 0%, no divide-by-zero', () => {
  const quiz = q.createQuiz([], { count: 0, shuffle: false });
  const r = q.getResults(quiz);
  assert.strictEqual(r.score, 0);
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.percentage, 0);
});

test('timeoutQuestion: records -1 selected, isCorrect:false', () => {
  const quiz = q.createQuiz([Q_SINGLE], { count: 1, shuffle: false });
  q.timeoutQuestion(quiz);
  assert.strictEqual(quiz.answers[0].selected, -1);
  assert.strictEqual(quiz.answers[0].isCorrect, false);
});

/* ───── createQuiz — single-element-array correct normalization ──────────── */

test('createQuiz: single-element correct array is coerced to a scalar', () => {
  const pool = [{ id: 'se', question: 'se', options: ['A','B','C','D'], correct: [3] }];
  const quiz = q.createQuiz(pool, { count: 1, shuffle: false });
  assert.strictEqual(quiz.questions[0].correct, 3);
  assert.strictEqual(q.isMultiSelect(quiz.questions[0]), false);
  assert.strictEqual(q.answerQuestion(quiz, 3), true); // was always-wrong before the fix
});

/* ───── createQuiz — deterministic when shuffle:false ────────────────────── */

test('createQuiz: shuffle:false leaves options + correct untouched', () => {
  const quiz = q.createQuiz([Q_SINGLE], { count: 1, shuffle: false });
  assert.deepStrictEqual(quiz.questions[0].options, ['A','B','C','D']);
  assert.strictEqual(quiz.questions[0].correct, 2);
});

/* ───── createQuiz — option shuffling keeps correct pointing at right text ─ */

test('createQuiz: shuffled options still point correct at the original answer', () => {
  for (let n = 0; n < 50; n++) {
    const quiz = q.createQuiz([Q_SINGLE], { count: 1, shuffle: true });
    const got = quiz.questions[0];
    // correct index must resolve to the original correct option text ('C')
    assert.strictEqual(got.options[got.correct], 'C');
    // and the option set is preserved (no loss / duplication)
    assert.deepStrictEqual([...got.options].sort(), ['A','B','C','D']);
  }
});

test('createQuiz: multi-select correct indices remap to the right options', () => {
  for (let n = 0; n < 50; n++) {
    const quiz = q.createQuiz([Q_MULTI], { count: 1, shuffle: true }); // correct [0,2] = A,C
    const got = quiz.questions[0];
    const correctTexts = got.correct.map(i => got.options[i]).sort();
    assert.deepStrictEqual(correctTexts, ['A','C']);
    assert.deepStrictEqual([...got.options].sort(), ['A','B','C','D']);
  }
});
