// Boss Fight — end-of-chapter mixed quiz drawn from the cert's question pack.
//
// data = { questionIds[], timeLimitMinutes?, passingScore?, difficultyCurve? }.
// Unlike the other modes, the payload only *references* question IDs — the real
// questions live in the cert pack, so this mode fetches /data/free/<packId>.json
// using opts.packId (supplied by the path.js runner). Single-select only;
// options are shuffled per question (correctIndex remapped). Difficulty order
// follows `difficultyCurve`. Canonical lifecycle (see match-pair.js).

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DIFF_RANK = { easy: 0, medium: 1, hard: 2 };

function orderByCurve(questions, curve) {
  if (curve === 'flat') return questions;
  const sorted = questions.slice().sort((a, b) =>
    (DIFF_RANK[a.difficulty] ?? 1) - (DIFF_RANK[b.difficulty] ?? 1));
  if (curve === 'easyhardeasy') {
    const out = []; let lo = 0, hi = sorted.length - 1, low = true;
    while (lo <= hi) { out.push(low ? sorted[lo++] : sorted[hi--]); low = !low; }
    return out;
  }
  return sorted; // 'rising' (default)
}

function prep(q) {
  const order = shuffle(q.options.map((_, i) => i));
  return {
    q: q.question,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correct),
    explanation: q.explanation,
  };
}

export function init(host, payload, opts = {}) {
  const d = payload.data || {};
  return {
    host, payload, opts,
    ids: d.questionIds || [],
    curve: d.difficultyCurve || 'rising',
    questions: [],
    index: 0,
    correctCount: 0,
    wrongCount: 0,
    combo: 0,
    bonus: 0,
    startedAt: Date.now(),
    revealing: false,
    finished: false,
    loaded: false,
  };
}

function loadAndStart(state) {
  const packId = state.opts.packId;
  state.host.innerHTML = `<section class="game game-boss"><p class="game-boss-loading">Summoning the boss…</p></section>`;
  if (!packId) { renderError(state, 'No pack context for this boss fight.'); return; }
  fetch('/data/free/' + encodeURIComponent(packId) + '.json', { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((pack) => {
      const all = (pack && pack.questions) || [];
      const isSingle = (q) => Array.isArray(q.options) && !Array.isArray(q.correct) && Number.isInteger(q.correct);
      const byId = new Map(all.map((q) => [String(q.id), q]));
      let picked = state.ids.map((id) => byId.get(String(id))).filter(Boolean).filter(isSingle);
      if (!picked.length) picked = all.filter(isSingle).slice(0, 10); // fallback if IDs drifted
      state.questions = orderByCurve(picked, state.curve).map(prep);
      state.loaded = true;
      if (!state.questions.length) { renderError(state, 'No questions available for this boss.'); return; }
      render(state);
    })
    .catch(() => renderError(state, 'Could not load the question bank.'));
}

function renderError(state, msg) {
  state.host.innerHTML = `
    <section class="game game-boss">
      <p class="game-boss-error">${esc(msg)}</p>
      <button type="button" class="cta-primary" id="boss-skip">Continue →</button>
    </section>`;
  const b = state.host.querySelector('#boss-skip');
  if (b) b.addEventListener('click', () => showResult(state));
}

export function render(state) {
  if (!state.loaded) { loadAndStart(state); return; }
  const { host, payload, questions, index } = state;
  if (index >= questions.length) return showResult(state);
  const q = questions[index];
  state.revealing = false;

  host.innerHTML = `
    <section class="game game-boss">
      <header class="game-header">
        <h2 class="game-title">👹 ${esc(payload.title || 'Boss fight')}</h2>
        <div class="game-progress">
          <span class="game-progress-count">${index + 1} / ${questions.length}</span>
          <span class="game-progress-score">${state.correctCount} ✓</span>
          ${state.combo >= 2 ? `<span class="game-combo">🔥 ${state.combo}×</span>` : ''}
        </div>
      </header>
      <div class="game-boss-hpwrap"><div class="game-boss-hp" style="width:${Math.round((index / questions.length) * 100)}%"></div></div>
      <p class="game-question">${esc(q.q)}</p>
      <div class="game-choices">
        ${q.options.map((c, i) => `<button type="button" class="game-choice" data-i="${i}">${esc(c)}</button>`).join('')}
      </div>
      <div class="game-explain" id="boss-explain" hidden></div>
    </section>`;

  host.querySelectorAll('.game-choice').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, { index: Number(btn.dataset.i) }));
  });
}

export function handleAnswer(state, input) {
  if (state.finished || state.revealing || !state.loaded) return;
  state.revealing = true;

  const q = state.questions[state.index];
  const correct = input.index === q.correctIndex;
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

  const btns = [...state.host.querySelectorAll('.game-choice')];
  btns.forEach((b) => { b.disabled = true; });
  if (btns[q.correctIndex]) btns[q.correctIndex].classList.add('is-correct');
  if (!correct && btns[input.index]) btns[input.index].classList.add('is-wrong');

  const exp = state.host.querySelector('#boss-explain');
  if (exp) {
    exp.innerHTML = `<span class="game-explain-verdict ${correct ? 'ok' : 'no'}">${correct ? '✓ Correct' : '✗ Not quite'}</span>` + (q.explanation ? ` ${esc(q.explanation)}` : '');
    exp.hidden = false;
  }

  setTimeout(() => { state.index++; render(state); }, q.explanation ? 1400 : 800);
}

export function showResult(state) {
  if (state.finished) return;
  state.finished = true;
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
    } catch (err) { console.error('[games:boss-fight] onComplete threw', err); }
  }
}
