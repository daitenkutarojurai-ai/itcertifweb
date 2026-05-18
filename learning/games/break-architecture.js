// Break the Architecture — vanilla JS stub.
//
// data: { diagram, maskedToken, choices, correctIndex }. The renderer
// substitutes `maskedToken` with a blank placeholder before painting.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  return {
    host,
    payload,
    opts,
    chosenIndex: null,
    revealed: false,
  };
}

export function render(state) {
  const { host, payload, revealed, chosenIndex } = state;
  const { diagram, maskedToken, choices, correctIndex } = payload.data;
  const masked = diagram.replace(maskedToken, '▢▢▢▢');

  host.innerHTML = `
    <section class="game game-architecture">
      <header class="game-header">
        <h2>${esc(payload.title)}</h2>
      </header>
      <pre class="game-diagram" aria-label="architecture diagram">${esc(masked)}</pre>
      <ul class="game-choices">
        ${choices.map((c, i) => {
          const isPicked  = chosenIndex === i;
          const isCorrect = revealed && i === correctIndex;
          const isWrong   = revealed && isPicked && i !== correctIndex;
          const cls = isCorrect ? 'is-correct' : isWrong ? 'is-wrong' : isPicked ? 'is-picked' : '';
          return `<li><button type="button" data-i="${i}" class="${cls}" ${revealed ? 'disabled' : ''}>${esc(c)}</button></li>`;
        }).join('')}
      </ul>
      ${revealed && payload.explanation ? `<p class="game-explanation">${esc(payload.explanation)}</p>` : ''}
      <p class="game-stub-note">⚠ STUB — selection + reveal not wired yet.</p>
    </section>`;
  host.querySelectorAll('button[data-i]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, Number(btn.dataset.i)));
  });
}

export function handleAnswer(state, index) {
  // TODO:
  //   - state.chosenIndex = index; state.revealed = true;
  //   - render(state)
  //   - setTimeout(() => showResult(state), 1500)
  void index;
}

export function showResult(state) {
  const correct = state.chosenIndex === state.payload.data.correctIndex;
  state.host.innerHTML = `
    <section class="game game-architecture result">
      <h2>${correct ? 'Correct!' : 'Wrong.'}</h2>
      <p>${esc(state.payload.explanation || '')}</p>
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
