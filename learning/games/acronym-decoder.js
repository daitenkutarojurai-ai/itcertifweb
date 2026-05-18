// Acronym Decoder — vanilla JS stub.
//
// data: { acronym, correct: { fullName, useCase }, distractors: [{ fullName, useCase }] }
// User picks the correct card (full name + use case) from a shuffled deck.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  const { correct, distractors } = payload.data;
  // Stub: render in order. Real impl shuffles + tracks correct index.
  const choices = [correct, ...distractors];
  return {
    host,
    payload,
    opts,
    choices,
    correctIndex: 0,
    chosen: null,
    revealed: false,
  };
}

export function render(state) {
  const { host, payload, choices, chosen, revealed, correctIndex } = state;
  host.innerHTML = `
    <section class="game game-acronym">
      <header class="game-header">
        <h2>${esc(payload.title)}</h2>
        <p class="game-acronym-big">${esc(payload.data.acronym)}</p>
      </header>
      <ul class="game-choices choices-cards">
        ${choices.map((c, i) => {
          const isPicked = chosen === i;
          const isCorrect = revealed && i === correctIndex;
          const isWrong   = revealed && isPicked && i !== correctIndex;
          const cls = isCorrect ? 'is-correct' : isWrong ? 'is-wrong' : isPicked ? 'is-picked' : '';
          return `<li><button type="button" data-i="${i}" class="${cls}" ${revealed ? 'disabled' : ''}>
            <strong>${esc(c.fullName)}</strong>
            <span>${esc(c.useCase)}</span>
          </button></li>`;
        }).join('')}
      </ul>
      <p class="game-stub-note">⚠ STUB — shuffle + reveal not wired yet.</p>
    </section>`;
  host.querySelectorAll('button[data-i]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, Number(btn.dataset.i)));
  });
}

export function handleAnswer(state, index) {
  // TODO:
  //   - state.chosen = index; state.revealed = true;
  //   - render(state); setTimeout(() => showResult(state), 1500);
  void index;
}

export function showResult(state) {
  const correct = state.chosen === state.correctIndex;
  state.host.innerHTML = `
    <section class="game game-acronym result">
      <h2>${correct ? 'Decoded!' : 'Not quite.'}</h2>
      <p><strong>${esc(state.payload.data.acronym)}</strong> = ${esc(state.payload.data.correct.fullName)}</p>
      <p>${esc(state.payload.data.correct.useCase)}</p>
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
