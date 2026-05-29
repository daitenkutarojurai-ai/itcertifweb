// Break the Architecture — pick the masked service in a diagram.
//
// data = { diagram, maskedToken, choices[], correctIndex, diagramFormat? }.
// The masked token is replaced with a blank placeholder; the diagram is always
// rendered as escaped text inside <pre> (safe even if a future payload carries
// SVG). Choices are shuffled (correctIndex remapped). Single-shot (total = 1).
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

const BLANK = '▢▢▢';

export function init(host, payload, opts = {}) {
  const d = payload.data || {};
  const choices = d.choices || [];
  const order = shuffle(choices.map((_, i) => i));
  return {
    host, payload, opts,
    diagram: String(d.diagram || '').split(d.maskedToken || '__MASK__').join(BLANK),
    choices: order.map((i) => choices[i]),
    correctIndex: order.indexOf(d.correctIndex),
    answered: false,
    finished: false,
    correctCount: 0,
    wrongCount: 0,
    startedAt: Date.now(),
  };
}

export function render(state) {
  const { host, payload, diagram, choices } = state;
  host.innerHTML = `
    <section class="game game-breakarch">
      <header class="game-header">
        <h2 class="game-title">${esc(payload.title || "What's missing?")}</h2>
      </header>
      <pre class="game-diagram">${esc(diagram)}</pre>
      <p class="game-breakarch-prompt">Pick the service for <span class="game-blank">${BLANK}</span>:</p>
      <div class="game-choices">
        ${choices.map((c, i) => `<button type="button" class="game-choice" data-i="${i}">${esc(c)}</button>`).join('')}
      </div>
      <div class="game-explain" id="ba-explain" hidden></div>
    </section>`;
  host.querySelectorAll('.game-choice').forEach((btn) => {
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

  const btns = [...state.host.querySelectorAll('.game-choice')];
  btns.forEach((b) => { b.disabled = true; });
  if (btns[state.correctIndex]) btns[state.correctIndex].classList.add('is-correct');
  if (!correct && btns[input.index]) btns[input.index].classList.add('is-wrong');

  const exp = state.host.querySelector('#ba-explain');
  if (exp) {
    exp.innerHTML = `<span class="game-explain-verdict ${correct ? 'ok' : 'no'}">${correct ? '✓ Correct' : '✗ Not quite'}</span>` + (state.payload.explanation ? ` ${esc(state.payload.explanation)}` : '');
    exp.hidden = false;
  }
  setTimeout(() => showResult(state), 1500);
}

export function showResult(state) {
  if (state.finished) return;
  state.finished = true;
  const seconds = Math.round((Date.now() - state.startedAt) / 1000);
  if (typeof state.opts.onComplete === 'function') {
    try {
      state.opts.onComplete({ correct: state.correctCount, total: 1, bonus: 0, mistakes: state.wrongCount, seconds });
    } catch (err) { console.error('[games:break-architecture] onComplete threw', err); }
  }
}
