// Lightning Round — vanilla JS, no dependencies.
//
// data.questions = [{ q, choices[2-4], correctIndex, explanation? }].
// Per-question countdown; running out of lives ends the round early. Choices
// are shuffled per question (correctIndex remapped) so position isn't a tell.
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

function prepareChoices(q) {
  const order = shuffle(q.choices.map((_, i) => i));
  return { choices: order.map((i) => q.choices[i]), correctIndex: order.indexOf(q.correctIndex) };
}

export function init(host, payload, opts = {}) {
  const d = payload.data || {};
  const maxLives = d.livesAllowed || 3;
  return {
    host, payload, opts,
    questions: d.questions || [],
    secs: d.secondsPerQuestion || 7,
    lives: maxLives,
    maxLives,
    index: 0,
    correctCount: 0,
    wrongCount: 0,
    combo: 0,
    bonus: 0,
    current: null,
    startedAt: Date.now(),
    timer: null,
    revealing: false,
    finished: false,
  };
}

export function render(state) {
  const { host, payload, questions, index } = state;
  if (index >= questions.length) return showResult(state);
  const q = questions[index];
  state.revealing = false;
  state.current = prepareChoices(q);

  host.innerHTML = `
    <section class="game game-lightning">
      <header class="game-header">
        <h2 class="game-title">${esc(payload.title || 'Lightning round')}</h2>
        <div class="game-progress">
          <span class="game-progress-count">${index + 1} / ${questions.length}</span>
          <span class="game-lives" aria-label="lives">${'❤️'.repeat(state.lives)}${'🖤'.repeat(Math.max(0, state.maxLives - state.lives))}</span>
          ${state.combo >= 2 ? `<span class="game-combo">🔥 ${state.combo}×</span>` : ''}
        </div>
      </header>
      <div class="game-timer-track"><div class="game-timer-fill" id="lr-timer"></div></div>
      <p class="game-question">${esc(q.q)}</p>
      <div class="game-choices">
        ${state.current.choices.map((c, i) => `<button type="button" class="game-choice" data-i="${i}">${esc(c)}</button>`).join('')}
      </div>
      <div class="game-explain" id="lr-explain" hidden></div>
    </section>`;

  host.querySelectorAll('.game-choice').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { index: Number(btn.dataset.i) }));
  });

  const bar = host.querySelector('#lr-timer');
  if (bar) {
    bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth;
    bar.style.transition = `width ${state.secs}s linear`; bar.style.width = '0%';
  }
  clearTimeout(state.timer);
  state.timer = setTimeout(() => handleAnswer(state, { index: -1, timedOut: true }), state.secs * 1000);
}

export function handleAnswer(state, input) {
  if (state.finished || state.revealing) return;
  state.revealing = true;
  clearTimeout(state.timer);

  const q = state.questions[state.index];
  const cIdx = state.current.correctIndex;
  const correct = !input.timedOut && input.index === cIdx;

  if (correct) {
    state.correctCount++;
    state.combo++;
    if (state.combo >= 2) state.bonus += (state.combo - 1);
  } else {
    state.wrongCount++;
    state.combo = 0;
    state.lives--;
    if (window.cqHearts && typeof window.cqHearts.lose === 'function') { try { window.cqHearts.lose(); } catch (_) {} }
  }
  try { window.dispatchEvent(new CustomEvent('cq:combo-tick', { detail: { correct } })); } catch (_) {}

  const bar = state.host.querySelector('#lr-timer');
  if (bar) { const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w; }

  const btns = [...state.host.querySelectorAll('.game-choice')];
  btns.forEach((b) => { b.disabled = true; });
  if (btns[cIdx]) btns[cIdx].classList.add('is-correct');
  if (!correct && !input.timedOut && btns[input.index]) btns[input.index].classList.add('is-wrong');

  const exp = state.host.querySelector('#lr-explain');
  if (exp) {
    const verdict = input.timedOut ? "⏱ Time's up" : (correct ? '✓ Correct' : '✗ Not quite');
    exp.innerHTML = `<span class="game-explain-verdict ${correct ? 'ok' : 'no'}">${verdict}</span>` + (q.explanation ? ` ${esc(q.explanation)}` : '');
    exp.hidden = false;
  }

  const outOfLives = state.lives <= 0;
  state.timer = setTimeout(() => {
    if (outOfLives) return showResult(state);
    state.index++;
    render(state);
  }, q.explanation ? 1500 : 850);
}

export function showResult(state) {
  if (state.finished) return;
  state.finished = true;
  clearTimeout(state.timer);
  const seconds = Math.round((Date.now() - state.startedAt) / 1000);
  if (typeof state.opts.onComplete === 'function') {
    try {
      state.opts.onComplete({
        correct: state.correctCount,
        total: state.questions.length,
        bonus: state.bonus,
        mistakes: state.wrongCount,
        seconds,
      });
    } catch (err) { console.error('[games:lightning-round] onComplete threw', err); }
  }
}
