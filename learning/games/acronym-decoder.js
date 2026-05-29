// Acronym Decoder — pick the correct expansion + use case for an acronym.
//
// data = { acronym, correct:{fullName,useCase}, distractors:[{fullName,useCase}] }
// Single-shot (total = 1). Options shuffled so the answer isn't always first.
// Canonical lifecycle (see match-pair.js).

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
  const options = shuffle([
    Object.assign({ _correct: true }, d.correct || {}),
    ...((d.distractors || []).map((x) => Object.assign({}, x))),
  ]);
  return {
    host, payload, opts,
    acronym: d.acronym || '',
    options,
    correctIndex: options.findIndex((o) => o._correct),
    answered: false,
    finished: false,
    correctCount: 0,
    wrongCount: 0,
    startedAt: Date.now(),
  };
}

export function render(state) {
  const { host, payload, acronym, options } = state;
  host.innerHTML = `
    <section class="game game-acronym">
      <header class="game-header">
        <h2 class="game-title">${esc(payload.title || 'Decode the acronym')}</h2>
      </header>
      <div class="game-acronym-badge">${esc(acronym)}</div>
      <p class="game-acronym-prompt">Which is the correct expansion + use case?</p>
      <div class="game-acronym-cards">
        ${options.map((o, i) => `
          <button type="button" class="game-acronym-card" data-i="${i}">
            <span class="game-acronym-name">${esc(o.fullName)}</span>
            <span class="game-acronym-use">${esc(o.useCase)}</span>
          </button>`).join('')}
      </div>
      <div class="game-explain" id="ac-explain" hidden></div>
    </section>`;
  host.querySelectorAll('.game-acronym-card').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { index: Number(btn.dataset.i) }));
  });
}

export function handleAnswer(state, input) {
  if (state.answered || state.finished) return;
  state.answered = true;
  const correct = input.index === state.correctIndex;
  state.correctCount = correct ? 1 : 0;
  if (!correct) {
    state.wrongCount = 1;
    if (window.cqHearts && typeof window.cqHearts.lose === 'function') { try { window.cqHearts.lose(); } catch (_) {} }
  }
  try { window.dispatchEvent(new CustomEvent('cq:combo-tick', { detail: { correct } })); } catch (_) {}

  const cards = [...state.host.querySelectorAll('.game-acronym-card')];
  cards.forEach((b) => { b.disabled = true; });
  if (cards[state.correctIndex]) cards[state.correctIndex].classList.add('is-correct');
  if (!correct && cards[input.index]) cards[input.index].classList.add('is-wrong');

  const exp = state.host.querySelector('#ac-explain');
  if (exp) {
    exp.innerHTML = `<span class="game-explain-verdict ${correct ? 'ok' : 'no'}">${correct ? '✓ Correct' : '✗ Not quite'}</span> ${esc(state.acronym)} = ${esc((state.options[state.correctIndex] || {}).fullName || '')}`;
    exp.hidden = false;
  }
  setTimeout(() => showResult(state), 1400);
}

export function showResult(state) {
  if (state.finished) return;
  state.finished = true;
  const seconds = Math.round((Date.now() - state.startedAt) / 1000);
  if (typeof state.opts.onComplete === 'function') {
    try {
      state.opts.onComplete({ correct: state.correctCount, total: 1, bonus: 0, mistakes: state.wrongCount, seconds });
    } catch (err) { console.error('[games:acronym-decoder] onComplete threw', err); }
  }
}
