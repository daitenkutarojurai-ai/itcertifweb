// Lightning Round — vanilla JS stub.
//
// data.questions = [{ q, choices, correctIndex }]. Per-question countdown,
// streak bonus, livesAllowed lives. Wrong answer or timeout = lose a life.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init(host, payload, opts = {}) {
  return {
    host,
    payload,
    opts,
    questions: payload.data.questions,
    secondsPerQuestion: payload.data.secondsPerQuestion ?? 7,
    livesAllowed: payload.data.livesAllowed ?? 3,
    livesLeft: payload.data.livesAllowed ?? 3,
    index: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    deadline: null,
    timerHandle: null,
  };
}

export function render(state) {
  const { host, payload, questions, index, livesLeft, streak } = state;
  if (state.livesLeft <= 0 || index >= questions.length) return showResult(state);

  const q = questions[index];
  host.innerHTML = `
    <section class="game game-lightning">
      <header class="game-header">
        <h2>${esc(payload.title)}</h2>
        <p>Q${index + 1}/${questions.length} · ♥ ${livesLeft} · streak ${streak}</p>
      </header>
      <div class="game-countdown" data-deadline="">${state.secondsPerQuestion}s</div>
      <p class="game-prompt">${esc(q.q)}</p>
      <ul class="game-choices">
        ${q.choices.map((c, i) => `
          <li><button type="button" data-i="${i}">${esc(c)}</button></li>
        `).join('')}
      </ul>
      <p class="game-stub-note">⚠ STUB — countdown timer + streak math not wired yet.</p>
    </section>`;
  host.querySelectorAll('button[data-i]').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, Number(btn.dataset.i)));
  });
}

export function handleAnswer(state, choiceIndex) {
  // TODO: real logic.
  // Sketch:
  //   - clearInterval(state.timerHandle)
  //   - correct = choiceIndex === questions[index].correctIndex
  //   - if correct: streak++, bestStreak = max, correctCount++
  //   - else: livesLeft--, streak = 0
  //   - index++ ; render(state) or showResult(state)
  void choiceIndex;
}

export function showResult(state) {
  state.host.innerHTML = `
    <section class="game game-lightning result">
      <h2>Lightning round over</h2>
      <p>${state.correctCount} / ${state.questions.length} correct · best streak ${state.bestStreak} · ♥ ${state.livesLeft} left</p>
      <p class="game-stub-note">⚠ STUB — result UI placeholder.</p>
    </section>`;
}
