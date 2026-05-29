// True / False Blitz — vanilla JS, no dependencies.
//
// data.statements = [{ text, isTrue, explanation? }]. One statement at a time,
// two big buttons, a per-statement countdown that auto-marks the answer wrong
// on timeout. Canonical lifecycle (see match-pair.js).
//
// opts.onComplete({ correct, total, bonus, mistakes, seconds }) fires once.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  const d = payload.data || {};
  return {
    host, payload, opts,
    statements: d.statements || [],
    secs: d.secondsPerStatement || 4,
    index: 0,
    correctCount: 0,
    wrongCount: 0,
    combo: 0,
    bonus: 0,
    startedAt: Date.now(),
    timer: null,
    revealing: false,
    finished: false,
  };
}

export function render(state) {
  const { host, payload, statements, index } = state;
  if (index >= statements.length) return showResult(state);
  const s = statements[index];
  state.revealing = false;

  host.innerHTML = `
    <section class="game game-tfblitz">
      <header class="game-header">
        <h2 class="game-title">${esc(payload.title || 'True or false')}</h2>
        <div class="game-progress">
          <span class="game-progress-count">${index + 1} / ${statements.length}</span>
          <span class="game-progress-mistakes" aria-label="mistakes">✗ ${state.wrongCount}</span>
        </div>
      </header>
      <div class="game-timer-track"><div class="game-timer-fill" id="tf-timer"></div></div>
      <p class="game-statement">${esc(s.text)}</p>
      <div class="game-tf-buttons">
        <button type="button" class="game-tf-btn game-tf-true" data-pick="true">✓ True</button>
        <button type="button" class="game-tf-btn game-tf-false" data-pick="false">✗ False</button>
      </div>
      <div class="game-explain" id="tf-explain" hidden></div>
    </section>`;

  host.querySelectorAll('button[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { pickedTrue: btn.dataset.pick === 'true' }));
  });

  startCountdown(host.querySelector('#tf-timer'), state.secs);
  clearTimeout(state.timer);
  state.timer = setTimeout(() => handleAnswer(state, { pickedTrue: null, timedOut: true }), state.secs * 1000);
}

function startCountdown(bar, secs) {
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '100%';
  void bar.offsetWidth; // force reflow so the next transition animates
  bar.style.transition = `width ${secs}s linear`;
  bar.style.width = '0%';
}

function freezeBar(bar) {
  if (!bar) return;
  const w = getComputedStyle(bar).width;
  bar.style.transition = 'none';
  bar.style.width = w;
}

export function handleAnswer(state, input) {
  if (state.finished || state.revealing) return;
  state.revealing = true;
  clearTimeout(state.timer);

  const s = state.statements[state.index];
  const correct = !input.timedOut && input.pickedTrue === s.isTrue;

  if (correct) {
    state.correctCount++;
    state.combo++;
    if (state.combo >= 2) state.bonus += (state.combo - 1);
  } else {
    state.wrongCount++;
    state.combo = 0;
    if (window.cqHearts && typeof window.cqHearts.lose === 'function') { try { window.cqHearts.lose(); } catch (_) {} }
  }
  try { window.dispatchEvent(new CustomEvent('cq:combo-tick', { detail: { correct } })); } catch (_) {}

  freezeBar(state.host.querySelector('#tf-timer'));
  const trueBtn = state.host.querySelector('.game-tf-true');
  const falseBtn = state.host.querySelector('.game-tf-false');
  [trueBtn, falseBtn].forEach((b) => { if (b) b.disabled = true; });
  const rightBtn = s.isTrue ? trueBtn : falseBtn;
  if (rightBtn) rightBtn.classList.add('is-correct');
  if (!correct && !input.timedOut) {
    const pickedBtn = input.pickedTrue ? trueBtn : falseBtn;
    if (pickedBtn) pickedBtn.classList.add('is-wrong');
  }

  const exp = state.host.querySelector('#tf-explain');
  if (exp) {
    const verdict = input.timedOut ? "⏱ Time's up" : (correct ? '✓ Correct' : '✗ Not quite');
    exp.innerHTML = `<span class="game-explain-verdict ${correct ? 'ok' : 'no'}">${verdict}</span>` +
      (s.explanation ? ` ${esc(s.explanation)}` : '');
    exp.hidden = false;
  }

  state.timer = setTimeout(() => { state.index++; render(state); }, s.explanation ? 1500 : 850);
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
        total: state.statements.length,
        bonus: state.bonus,
        mistakes: state.wrongCount,
        seconds,
      });
    } catch (err) { console.error('[games:true-false-blitz] onComplete threw', err); }
  }
}
