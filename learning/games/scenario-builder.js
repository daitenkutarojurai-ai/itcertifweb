// Scenario Builder — vanilla JS stub.
//
// data: { scenario, pool, correctOrder }. User picks services from
// `pool` in the right order; the chosen sequence is matched against
// `correctOrder` strictly.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  return {
    host,
    payload,
    opts,
    pool: payload.data.pool.slice(),
    picked: [],          // array of pool items, in pick order
    revealed: false,
  };
}

export function render(state) {
  const { host, payload, pool, picked, revealed } = state;
  const remaining = pool.filter((p) => !picked.includes(p));

  host.innerHTML = `
    <section class="game game-scenario">
      <header class="game-header">
        <h2>${esc(payload.title)}</h2>
        <p class="game-scenario-prose">${esc(payload.data.scenario)}</p>
      </header>
      <section class="game-pool">
        <h3>Available services</h3>
        <ul class="game-choices">
          ${remaining.map((p, i) => `<li><button type="button" data-pick="${esc(p)}" ${revealed ? 'disabled' : ''}>${esc(p)}</button></li>`).join('')}
        </ul>
      </section>
      <section class="game-stack">
        <h3>Your stack (in order)</h3>
        <ol class="game-picked">
          ${picked.map((p, i) => `<li>${i + 1}. ${esc(p)} <button type="button" data-remove="${esc(p)}" ${revealed ? 'disabled' : ''}>×</button></li>`).join('')}
        </ol>
        <button type="button" class="game-submit" data-submit ${revealed || picked.length === 0 ? 'disabled' : ''}>Submit</button>
      </section>
      <p class="game-stub-note">⚠ STUB — pick / remove / submit wiring not implemented.</p>
    </section>`;

  host.querySelectorAll('button[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { type: 'pick', value: btn.dataset.pick }));
  });
  host.querySelectorAll('button[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { type: 'remove', value: btn.dataset.remove }));
  });
  host.querySelector('button[data-submit]')?.addEventListener('click', () => handleAnswer(state, { type: 'submit' }));
}

export function handleAnswer(state, input) {
  // TODO:
  //   - input.type === 'pick'   → state.picked.push(input.value); render(state)
  //   - input.type === 'remove' → state.picked = state.picked.filter(x => x !== input.value); render(state)
  //   - input.type === 'submit' → state.revealed = true; showResult(state)
  void input;
}

export function showResult(state) {
  const { picked, payload } = state;
  const correctOrder = payload.data.correctOrder;
  const exact = picked.length === correctOrder.length
    && picked.every((v, i) => v === correctOrder[i]);

  state.host.innerHTML = `
    <section class="game game-scenario result">
      <h2>${exact ? 'Stack is correct.' : 'Not quite.'}</h2>
      <p><strong>Expected:</strong> ${correctOrder.map(esc).join(' → ')}</p>
      <p><strong>Your stack:</strong> ${picked.map(esc).join(' → ') || '(empty)'}</p>
      ${payload.explanation ? `<p>${esc(payload.explanation)}</p>` : ''}
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
