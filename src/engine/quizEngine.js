/**
 * engine/quizEngine.js
 * Pure logic — no DOM manipulation here.
 * All functions take and return plain objects.
 */

/**
 * Create a new quiz session.
 * @param {Array}  questions - raw questions array from a pack JSON
 * @param {object} options   - { count: max questions, shuffle: boolean }
 * @returns {object} quizState
 */
export function createQuiz(questions, options = {}) {
  const { count = 20, shuffle = true } = options;
  let pool = shuffle ? shuffleArray([...questions]) : [...questions];
  // Filter out malformed questions. `correct` may be a single index OR an
  // array of indices (multi-select). All indices must be in-range.
  pool = pool.filter(q => {
    if (!q.options || q.options.length !== 4) return false;
    if (Array.isArray(q.correct)) {
      return q.correct.length >= 1 &&
             q.correct.every(i => Number.isInteger(i) && i >= 0 && i < 4);
    }
    return Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4;
  });
  pool = pool.slice(0, Math.min(count, pool.length));

  return {
    questions: pool,
    current:   0,
    answers:   [], // [{ questionId, selected, correct, isCorrect, timeSpent }]
    startTime:         Date.now(),
    questionStartTime: Date.now(),
  };
}

/**
 * Record the user's answer for the current question.
 * Call this when the user taps an option (single-select) or submits a
 * checkbox set (multi-select).
 *
 * @param {object} quiz
 * @param {number|number[]} selected - index for single-select, array of
 *                                     indices for multi-select.
 * @returns {boolean} true if correct
 */
export function answerQuestion(quiz, selected) {
  const q = quiz.questions[quiz.current];
  const isCorrect = isAnswerCorrect(q.correct, selected);

  quiz.answers.push({
    questionId: q.id,
    question:   q,
    selected,
    correct:    q.correct,
    isCorrect,
    timeSpent:  Date.now() - quiz.questionStartTime,
  });

  return isCorrect;
}

/**
 * Check whether the user's selection matches the correct answer.
 * Handles both single-select (number === number) and multi-select (set
 * equality, order-independent).
 */
export function isAnswerCorrect(correct, selected) {
  if (Array.isArray(correct)) {
    if (!Array.isArray(selected)) return false;
    if (selected.length !== correct.length) return false;
    const a = [...correct].sort((x,y)=>x-y).join(',');
    const b = [...selected].sort((x,y)=>x-y).join(',');
    return a === b;
  }
  return selected === correct;
}

/** True if a question requires multi-select (checkboxes + Submit). */
export function isMultiSelect(question) {
  return Array.isArray(question.correct) && question.correct.length > 1;
}

/**
 * Record a timeout (no answer selected in time).
 */
export function timeoutQuestion(quiz) {
  const q = quiz.questions[quiz.current];
  quiz.answers.push({
    questionId: q.id,
    question:   q,
    selected:   -1, // no answer
    correct:    q.correct,
    isCorrect:  false,
    timeSpent:  Date.now() - quiz.questionStartTime,
    timedOut:   true,
  });
}

/** Advance to the next question */
export function nextQuestion(quiz) {
  quiz.current++;
  quiz.questionStartTime = Date.now();
}

/** Is the quiz finished? */
export function isComplete(quiz) {
  return quiz.current >= quiz.questions.length;
}

/** Count correct answers */
export function getScore(quiz) {
  return quiz.answers.filter(a => a.isCorrect).length;
}

/** Build the full results object (passed to results screen) */
export function getResults(quiz) {
  const score = getScore(quiz);
  const total = quiz.questions.length;
  return {
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    totalTime:  Date.now() - quiz.startTime,
    answers:    quiz.answers,
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Node test bridge ──────────────────────────────────────────────────────────
// The src/ tree is loaded as ES modules in the browser, but the Node test
// suite runs as CommonJS (`require('../src/engine/quizEngine.js')`). Expose
// the pure helpers via `module.exports` so tests can import them without
// adding "type": "module" to package.json (which would force every other
// file to become an ESM consumer).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createQuiz,
    answerQuestion,
    timeoutQuestion,
    nextQuestion,
    isComplete,
    getResults,
    getScore,
    isAnswerCorrect,
    isMultiSelect,
  };
}
