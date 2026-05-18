// True / False Blitz — vanilla JS stub.
//
// data.statements = [{ text, isTrue, explanation? }]. Two big buttons,
// auto-advance, brief countdown per statement. Mobile-first big tap area.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  return {
    host,
    payload,
    opts,
    statements: payload.data.statements,
    secondsPerStatement: payload.data.secondsPerStatement ?? 4,
    index: 0,
    correctCount: 0,
    answers: [],          // [{ index, picked, correct, timedOut }]
    timerHandle: null,
  };
}

export function render(state) {
  const { host, payload, statements, index } = state;
  if (index >= statements.length) return showResult(state);
  const s = statements[index];

  host.innerHTML = `
    <section class="game game-tfblitz">
      <header class="game-header">
        <h2>${esc(payload.title)}</h2>
        <p>${index + 1} / ${statements.length}</p>
      </header>
      <p class="game-statement">${esc(s.text)}</p>
      <div class="game-tf-buttons">
        <button type="button" data-pick="true">TRUE</button>
        <button type="button" data-pick="false">FALSE</button>
      </div>
      <p class="game-stub-note">⚠ STUB — countdown + auto-advance not wired yet.</p>
    </section>`;
  host.querySelectorAll('button[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, btn.dataset.pick === 'true'));
  });
}

export function handleAnswer(state, pickedTrue) {
  // TODO:
  //   - clear timer
  //   - const correct = pickedTrue === statements[index].isTrue
  //   - state.answers.push({ index, picked: pickedTrue, correct })
  //   - if correct → state.correctCount++
  //   - state.index++ ; render(state)
  void pickedTrue;
}

export function showResult(state) {
  state.host.innerHTML = `
    <section class="game game-tfblitz result">
      <h2>Blitz over</h2>
      <p>${state.correctCount} / ${state.statements.length} correct</p>
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
