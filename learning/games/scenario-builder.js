// Scenario Builder — order services from a pool into the correct pipeline.
//
// data = { scenario, pool[], correctOrder[] }. Tap a pool chip to append it to
// your answer; tap a filled slot to send it back. Score = number of positions
// that match correctOrder (partial credit). Canonical lifecycle (see match-pair.js).

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function init(host, payload, opts = {}) {
  const d = payload.data || {};
  return {
    host, payload, opts,
    scenario: d.scenario || '',
    pool: shuffle((d.pool || []).slice()),
    correctOrder: d.correctOrder || [],
    selected: [],
    checked: false,
    finished: false,
    correctCount: 0,
    wrongCount: 0,
    startedAt: Date.now(),
  };
}

export function render(state) {
  const { host, payload, scenario, pool, selected, correctOrder, checked } = state;
  const remaining = pool.filter((x) => !selected.includes(x));
  const needed = correctOrder.length;
  host.innerHTML = `
    <section class="game game-scenario">
      <header class="game-header">
        <h2 class="game-title">${esc(payload.title || 'Build the stack')}</h2>
        <div class="game-progress"><span class="game-progress-count">${selected.length} / ${needed}</span></div>
      </header>
      <p class="game-scenario-text">${esc(scenario)}</p>
      <div class="game-scenario-slots" aria-label="your order">
        ${selected.length ? selected.map((s, i) => `
          <button type="button" class="game-slot${checked ? (s === correctOrder[i] ? ' is-correct' : ' is-wrong') : ''}" data-pos="${i}"${checked ? ' disabled' : ''}>
            <span class="game-slot-num">${i + 1}</span><span class="game-slot-text">${esc(s)}</span>
          </button>`).join('') : `<p class="game-scenario-empty">Tap services below to build the pipeline in order.</p>`}
      </div>
      <div class="game-scenario-pool">
        ${remaining.map((s) => `<button type="button" class="game-chip" data-item="${esc(s)}"${checked ? ' disabled' : ''}>${esc(s)}</button>`).join('')}
      </div>
      <div class="game-scenario-actions">
        <button type="button" class="cta-secondary game-scenario-reset" id="sb-reset"${(checked || !selected.length) ? ' disabled' : ''}>Reset</button>
        <button type="button" class="cta-primary game-scenario-check" id="sb-check"${(checked || selected.length !== needed) ? ' disabled' : ''}>Check</button>
      </div>
      <div class="game-explain" id="sb-explain" hidden></div>
    </section>`;

  host.querySelectorAll('.game-chip').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { add: btn.dataset.item }));
  });
  host.querySelectorAll('.game-slot').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { removeAt: Number(btn.dataset.pos) }));
  });
  const reset = host.querySelector('#sb-reset');
  if (reset) reset.addEventListener('click', () => handleAnswer(state, { reset: true }));
  const check = host.querySelector('#sb-check');
  if (check) check.addEventListener('click', () => handleAnswer(state, { check: true }));
}

export function handleAnswer(state, input) {
  if (state.finished || state.checked) return;

  if (input.add != null) {
    if (state.selected.length < state.correctOrder.length && !state.selected.includes(input.add)) {
      state.selected.push(input.add);
    }
    return render(state);
  }
  if (input.removeAt != null) {
    state.selected.splice(input.removeAt, 1);
    return render(state);
  }
  if (input.reset) { state.selected = []; return render(state); }

  if (input.check) {
    if (state.selected.length !== state.correctOrder.length) return;
    state.checked = true;
    let c = 0;
    state.selected.forEach((s, i) => { if (s === state.correctOrder[i]) c++; });
    state.correctCount = c;
    state.wrongCount = state.correctOrder.length - c;
    const perfect = c === state.correctOrder.length;
    if (!perfect && window.cqHearts && typeof window.cqHearts.lose === 'function') { try { window.cqHearts.lose(); } catch (_) {} }
    try { window.dispatchEvent(new CustomEvent('cq:combo-tick', { detail: { correct: perfect } })); } catch (_) {}

    render(state); // repaint slots with is-correct / is-wrong
    const exp = state.host.querySelector('#sb-explain');
    if (exp) {
      exp.innerHTML = `<span class="game-explain-verdict ${perfect ? 'ok' : 'no'}">${perfect ? '✓ Perfect order' : `${c} / ${state.correctOrder.length} in place`}</span>` +
        (state.payload.explanation ? ` ${esc(state.payload.explanation)}` : '');
      exp.hidden = false;
    }
    setTimeout(() => showResult(state), 1700);
  }
}

export function showResult(state) {
  if (state.finished) return;
  state.finished = true;
  const seconds = Math.round((Date.now() - state.startedAt) / 1000);
  if (typeof state.opts.onComplete === 'function') {
    try {
      state.opts.onComplete({ correct: state.correctCount, total: state.correctOrder.length, bonus: 0, mistakes: state.wrongCount, seconds });
    } catch (err) { console.error('[games:scenario-builder] onComplete threw', err); }
  }
}
