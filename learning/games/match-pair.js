// Match-the-Pair — vanilla JS, no dependencies.
//
// data.pairs = [{ left, right }] — left column shows descriptions in their
// authored order; right column shows service names in a *shuffled* order
// (otherwise the answer is too obvious).
//
// Lifecycle (canonical for all game modes):
//   init(host, payload, opts)  → returns state, attaches DOM to host
//   render(state)              → idempotent full re-render; called by runner
//   handleAnswer(state, input) → user interaction; mutates state, repaints
//   showResult(state)          → render result panel, fire complete event
//
// Opts:
//   opts.onComplete({ correct, total, bonus, seconds }) — called once when
//   all pairs have been resolved. The path.js wrapper translates this into
//   the standard `cq:session-complete` event + the Continue summary.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function init(host, payload, opts = {}) {
  const pairs = (payload.data && payload.data.pairs) || [];
  const rightOrder = shuffle(pairs.map((_, i) => i));
  return {
    host,
    payload,
    opts,
    pairs,
    rightOrder,
    locked: new Set(),
    pickedLeft: null,
    wrongCount: 0,
    combo: 0,
    bonus: 0,
    startedAt: Date.now(),
    finished: false,
  };
}

export function render(state) {
  const { host, payload, pairs, rightOrder, locked } = state;
  host.innerHTML = `
    <section class="game game-match-pair">
      <header class="game-header">
        <h2 class="game-title">${esc(payload.title || 'Match the pair')}</h2>
        <div class="game-progress">
          <span class="game-progress-count">${locked.size} / ${pairs.length}</span>
          <span class="game-progress-mistakes" aria-label="mistakes">✗ ${state.wrongCount}</span>
        </div>
      </header>
      <div class="game-board">
        <ul class="game-col game-col-left" role="list">
          ${pairs.map((p, i) => `
            <li>
              <button type="button" class="game-pair-btn game-pair-left${locked.has(i) ? ' is-locked' : ''}"
                      data-side="left" data-i="${i}" ${locked.has(i) ? 'disabled aria-disabled="true"' : ''}>
                ${esc(p.left)}
              </button>
            </li>`).join('')}
        </ul>
        <ul class="game-col game-col-right" role="list">
          ${rightOrder.map((origIdx) => `
            <li>
              <button type="button" class="game-pair-btn game-pair-right${locked.has(origIdx) ? ' is-locked' : ''}"
                      data-side="right" data-i="${origIdx}" ${locked.has(origIdx) ? 'disabled aria-disabled="true"' : ''}>
                ${esc(pairs[origIdx].right)}
              </button>
            </li>`).join('')}
        </ul>
      </div>
    </section>`;
  host.querySelectorAll('button.game-pair-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleAnswer(state, { side: btn.dataset.side, index: Number(btn.dataset.i), btn: btn });
    });
  });
}

export function handleAnswer(state, input) {
  if (state.finished) return;
  if (state.locked.has(input.index)) return;

  // Left-tap: just record the pick and highlight.
  if (input.side === 'left') {
    state.pickedLeft = input.index;
    // Clear other left highlights, set this one.
    state.host.querySelectorAll('.game-pair-left').forEach((b) => b.classList.remove('is-picked'));
    input.btn.classList.add('is-picked');
    return;
  }

  // Right-tap: only meaningful once a left is picked.
  if (state.pickedLeft === null) {
    // Bounce hint — user must pick left first.
    input.btn.classList.add('is-hint');
    setTimeout(() => input.btn.classList.remove('is-hint'), 240);
    return;
  }

  const leftIdx = state.pickedLeft;
  const rightIdx = input.index;
  const leftBtn = state.host.querySelector(`.game-pair-left[data-i="${leftIdx}"]`);

  if (leftIdx === rightIdx) {
    // Correct: lock both.
    state.locked.add(leftIdx);
    state.combo++;
    if (state.combo >= 2) state.bonus += (state.combo - 1);
    if (leftBtn) leftBtn.classList.remove('is-picked');
    if (leftBtn) leftBtn.classList.add('is-locked');
    input.btn.classList.add('is-locked');
    if (leftBtn) leftBtn.disabled = true;
    input.btn.disabled = true;
    try {
      window.dispatchEvent(new CustomEvent('cq:combo-tick', { detail: { correct: true } }));
    } catch (_) {}
    state.pickedLeft = null;

    // Update HUD counter inline.
    const counter = state.host.querySelector('.game-progress-count');
    if (counter) counter.textContent = `${state.locked.size} / ${state.pairs.length}`;

    if (state.locked.size === state.pairs.length) {
      // All resolved.
      setTimeout(() => showResult(state), 280);
    }
  } else {
    // Wrong: shake both, then clear the left pick.
    state.wrongCount++;
    state.combo = 0;
    if (leftBtn) leftBtn.classList.add('is-wrong');
    input.btn.classList.add('is-wrong');
    if (window.cqHearts && typeof window.cqHearts.lose === 'function') {
      try { window.cqHearts.lose(); } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('cq:combo-tick', { detail: { correct: false } }));
    } catch (_) {}
    setTimeout(() => {
      if (leftBtn) leftBtn.classList.remove('is-wrong', 'is-picked');
      input.btn.classList.remove('is-wrong');
      state.pickedLeft = null;
    }, 520);

    // Update mistake counter.
    const miss = state.host.querySelector('.game-progress-mistakes');
    if (miss) miss.textContent = `✗ ${state.wrongCount}`;
  }
}

export function showResult(state) {
  if (state.finished) return;
  state.finished = true;
  const seconds = Math.round((Date.now() - state.startedAt) / 1000);
  if (typeof state.opts.onComplete === 'function') {
    try {
      state.opts.onComplete({
        correct: state.pairs.length,        // all pairs resolved by the time we get here
        total: state.pairs.length,
        bonus: state.bonus,
        mistakes: state.wrongCount,
        seconds: seconds,
      });
    } catch (err) {
      console.error('[games:match-pair] onComplete threw', err);
    }
  }
}
