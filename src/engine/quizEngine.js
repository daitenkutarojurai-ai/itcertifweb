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
  // Filter out malformed questions (must have 4 options and valid correct index)
  pool = pool.filter(q => q.options?.length === 4 && q.correct >= 0 && q.correct < 4);
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
 * Call this when the user taps an option.
 * @returns {boolean} true if correct
 */
export function answerQuestion(quiz, selectedIndex) {
  const q = quiz.questions[quiz.current];
  const isCorrect = selectedIndex === q.correct;

  quiz.answers.push({
    questionId: q.id,
    question:   q,
    selected:   selectedIndex,
    correct:    q.correct,
    isCorrect,
    timeSpent:  Date.now() - quiz.questionStartTime,
  });

  return isCorrect;
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
