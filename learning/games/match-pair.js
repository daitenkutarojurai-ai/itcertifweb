// Match-the-Pair — vanilla JS stub.
//
// data.pairs = [{ left, right }] — left column shows descriptions,
// right column shows service names. User taps a left card, then a
// right card; correct match locks both, wrong shakes.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  return {
    host,
    payload,
    opts,
    pairs: payload.data.pairs.slice(),
    locked: new Set(),       // indices of pairs the user got right
    pickedLeft: null,
    wrongStreak: 0,
    startedAt: Date.now(),
  };
}

export function render(state) {
  const { host, payload, pairs, locked } = state;
  host.innerHTML = `
    <section class="game game-match-pair">
      <header class="game-header">
        <h2>${esc(payload.title)}</h2>
        <p class="game-progress">${locked.size} / ${pairs.length}</p>
      </header>
      <div class="game-board">
        <ul class="col col-left">
          ${pairs.map((p, i) => `
            <li><button type="button" data-side="left" data-i="${i}" ${locked.has(i) ? 'disabled' : ''}>${esc(p.left)}</button></li>
          `).join('')}
        </ul>
        <ul class="col col-right">
          ${pairs.map((p, i) => `
            <li><button type="button" data-side="right" data-i="${i}" ${locked.has(i) ? 'disabled' : ''}>${esc(p.right)}</button></li>
          `).join('')}
        </ul>
      </div>
      <p class="game-stub-note">⚠ STUB — interaction not wired yet (see learning/games/match-pair.js).</p>
    </section>`;
  host.querySelectorAll('button[data-side]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { side: btn.dataset.side, index: Number(btn.dataset.i) }));
  });
  if (locked.size === pairs.length) showResult(state);
}

export function handleAnswer(state, input) {
  // TODO: real pair-matching logic.
  // Sketch:
  //   - If pickedLeft is null and input.side === 'left': set pickedLeft = input.index.
  //   - If pickedLeft is set and input.side === 'right':
  //       if input.index === pickedLeft → lock the pair (state.locked.add).
  //       else → shake + wrongStreak++, clear pickedLeft.
  //   - render(state) to repaint.
  void input;
}

export function showResult(state) {
  state.host.innerHTML = `
    <section class="game game-match-pair result">
      <h2>Done!</h2>
      <p>${state.locked.size} / ${state.pairs.length} pairs · ${state.wrongStreak} mistakes</p>
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
