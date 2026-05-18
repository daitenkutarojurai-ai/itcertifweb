// Boss Fight — vanilla JS stub.
//
// data: { questionIds, timeLimitMinutes?, passingScore?, difficultyCurve? }.
// Triggered at the end of a learning-path section. 10 mixed questions,
// no going back. Question payloads are loaded from the cert's free/*.json
// by id and fed into a sub-runner.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  return {
    host,
    payload,
    opts,
    questionIds: payload.data.questionIds,
    timeLimitMinutes: payload.data.timeLimitMinutes ?? 12,
    passingScore: payload.data.passingScore ?? 70,
    index: 0,
    correctCount: 0,
    answers: [],
    startedAt: null,
    timerHandle: null,
  };
}

export function render(state) {
  const { host, payload, questionIds, index, correctCount } = state;
  if (index >= questionIds.length) return showResult(state);

  host.innerHTML = `
    <section class="game game-boss">
      <header class="game-header boss-header">
        <h2>${esc(payload.title)}</h2>
        <p class="game-boss-counter">Q${index + 1}/${questionIds.length} · ${correctCount} correct so far</p>
        <p class="game-boss-warning">No going back · ${state.timeLimitMinutes}-minute limit</p>
      </header>
      <article class="game-boss-question">
        <p class="game-stub-note">⚠ STUB — question id <code>${esc(questionIds[index])}</code> needs lookup against the cert's free/*.json pack.</p>
        <button type="button" data-pick="correct">Mark right (stub)</button>
        <button type="button" data-pick="wrong">Mark wrong (stub)</button>
      </article>
    </section>`;

  host.querySelectorAll('button[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, btn.dataset.pick === 'correct'));
  });
}

export function handleAnswer(state, correct) {
  // TODO:
  //   - state.answers.push({ id: questionIds[index], correct })
  //   - if correct → state.correctCount++
  //   - state.index++ ; render(state)
  void correct;
}

export function showResult(state) {
  const total = state.questionIds.length;
  const scorePct = Math.round((state.correctCount * 100) / total);
  const passed = scorePct >= state.passingScore;
  state.host.innerHTML = `
    <section class="game game-boss result">
      <h2>${passed ? 'Boss defeated.' : 'Defeated. Try again.'}</h2>
      <p>${state.correctCount} / ${total} · ${scorePct}% · passing ${state.passingScore}%</p>
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
