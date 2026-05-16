/**
 * pack-picker.js — opens the mode-picker modal in-place on certifications pages.
 *
 * Each `<button data-pack-picker>` on the page opens a 4-mode modal
 * (Diagnostic / Quick Quiz / Full Exam / Study Mode). Selecting Quick / Full /
 * Study navigates to `/train.html?pack=<id>&mode=<choice>` — the home screen
 * detects the `mode` param and launches the chosen mode directly, so the
 * picker shown here is the ONLY picker the user sees end-to-end.
 *
 * Diagnostic shows the same intro framing the in-app picker uses (placement
 * test explanation) before redirecting, so users understand it's not a quiz.
 *
 * Required button attributes:
 *   data-pack-picker        marker, value ignored
 *   data-pack               pack id (e.g. "aws-saa-c03")
 *   data-name               pack display name (modal sub-header)
 *   data-brand              brand display name (modal header)
 *   data-question-count     number of questions available right now (chip)
 *   data-full-count         exam-blueprint count (Full Exam chip), optional
 */
(function () {
  if (window.__packPickerInit) return;
  window.__packPickerInit = true;

  var QUICK_COUNT = 5;
  var STUDY_COUNT = 10;
  var DIAG_COUNT  = 10;

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function gotoMode(packId, mode) {
    var url = '/train.html?pack=' + encodeURIComponent(packId) +
              '&mode=' + encodeURIComponent(mode);
    // Show a quick "Loading…" so the user has feedback while the redirect
    // resolves and train.html boots — important for slow networks where the
    // brief blank gap reads as "nothing happened".
    var lo = document.createElement('div');
    lo.id = 'cq-loading-overlay';
    lo.innerHTML = '<div class="cq-loading-card"><div class="cq-loading-spinner"></div><div class="cq-loading-label">Loading…</div></div>';
    document.body.appendChild(lo);
    window.location.href = url;
  }

  function renderPicker(modal, brand, name, fullCount) {
    modal.querySelector('.modal-header').innerHTML =
      '<div class="modal-pack-name" id="mode-modal-title">' + escape(brand || name) + '</div>' +
      '<div class="modal-pack-sub">' + escape(name) + '</div>';
    modal.querySelector('.modal-body').innerHTML =
      '<button class="mode-card mode-card-diag" type="button" data-mode="diagnostic">' +
        '<div class="mode-icon">🧪</div>' +
        '<div class="mode-info">' +
          '<div class="mode-title">Diagnostic <span class="mode-badge-new">New · for first-timers</span></div>' +
          '<div class="mode-desc">' + DIAG_COUNT + ' questions across all topics · Get a personalized study plan</div>' +
        '</div>' +
        '<div class="mode-chevron">→</div>' +
      '</button>' +
      '<button class="mode-card" type="button" data-mode="quick">' +
        '<div class="mode-icon">⚡</div>' +
        '<div class="mode-info">' +
          '<div class="mode-title">Quick Quiz</div>' +
          '<div class="mode-desc">' + QUICK_COUNT + ' random questions · ~2 min</div>' +
        '</div>' +
        '<div class="mode-chevron">→</div>' +
      '</button>' +
      '<button class="mode-card" type="button" data-mode="full">' +
        '<div class="mode-icon">📋</div>' +
        '<div class="mode-info">' +
          '<div class="mode-title">Full Exam</div>' +
          '<div class="mode-desc">' + fullCount + ' questions · Exam simulation</div>' +
        '</div>' +
        '<div class="mode-chevron">→</div>' +
      '</button>' +
      '<button class="mode-card mode-card-study" type="button" data-mode="study">' +
        '<div class="mode-icon">📖</div>' +
        '<div class="mode-info">' +
          '<div class="mode-title">Study Mode</div>' +
          '<div class="mode-desc">' + STUDY_COUNT + ' questions · No timer · Learn at your pace</div>' +
        '</div>' +
        '<div class="mode-chevron">→</div>' +
      '</button>';
  }

  function renderDiagIntro(modal, pack, name, onConfirm) {
    modal.querySelector('.modal-header').innerHTML =
      '<div class="modal-pack-name">🧪 Diagnostic test</div>' +
      '<div class="modal-pack-sub">' + escape(name) + '</div>';
    modal.querySelector('.modal-body').innerHTML =
      '<div class="diag-intro">' +
        '<p class="diag-intro-lede">This isn\'t a quiz — it\'s a placement test. We\'ll use your answers to build a personalized study plan.</p>' +
        '<ul class="diag-intro-list">' +
          '<li><strong>10 questions</strong> stratified across topics and difficulty</li>' +
          '<li><strong>No time pressure</strong> — answer at your own pace</li>' +
          '<li><strong>No hearts lost</strong> — wrong answers cost nothing</li>' +
          '<li><strong>Be honest</strong> — guessing inflates the readiness signal</li>' +
        '</ul>' +
        '<p class="diag-intro-outro">Takes about 5–8 minutes. You\'ll get a per-topic breakdown, a readiness flag, and a recommended next step.</p>' +
        '<div class="diag-intro-actions">' +
          '<button class="diag-intro-back" type="button" id="diag-intro-back">← Pick another mode</button>' +
          '<button class="diag-intro-start" type="button" id="diag-intro-start">Start diagnostic →</button>' +
        '</div>' +
      '</div>';
    modal.querySelector('#diag-intro-start').addEventListener('click', onConfirm);
    modal.querySelector('#diag-intro-back').addEventListener('click', function () {
      // Re-render the picker on the same modal.
      onConfirm.cancel && onConfirm.cancel();
    });
  }

  function open(btn) {
    var pack  = btn.dataset.pack;
    var name  = btn.dataset.name  || pack;
    var brand = btn.dataset.brand || '';
    var qCount = Number(btn.dataset.questionCount) || 0;
    var fullCount = Number(btn.dataset.fullCount) || qCount;
    if (!pack) return;

    var existing = document.getElementById('mode-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'mode-modal';
    modal.innerHTML =
      '<div class="modal-backdrop" id="modal-backdrop"></div>' +
      '<div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="mode-modal-title">' +
        '<div class="modal-handle"></div>' +
        '<div class="modal-header"></div>' +
        '<div class="modal-body"></div>' +
      '</div>';
    document.body.appendChild(modal);

    var sheet = modal.querySelector('.modal-sheet');
    var backdrop = modal.querySelector('.modal-backdrop');

    function close() {
      sheet.classList.remove('visible');
      backdrop.classList.remove('visible');
      setTimeout(function () { modal.remove(); }, 300);
    }

    function wireModeButtons() {
      modal.querySelectorAll('[data-mode]').forEach(function (card) {
        card.addEventListener('click', function () {
          var mode = card.dataset.mode;
          if (mode === 'diagnostic') {
            var goAhead = function () {
              // Don't wait for the modal fade-out — the user has committed and
              // we want the quiz to start as fast as possible. The redirect
              // itself unloads the page, so the modal disappears either way.
              gotoMode(pack, 'diagnostic');
            };
            goAhead.cancel = function () {
              renderPicker(modal, brand, name, fullCount);
              wireModeButtons();
            };
            renderDiagIntro(modal, pack, name, goAhead);
          } else {
            gotoMode(pack, mode);
          }
        });
      });
    }

    renderPicker(modal, brand, name, fullCount);
    wireModeButtons();

    requestAnimationFrame(function () {
      sheet.classList.add('visible');
      backdrop.classList.add('visible');
    });

    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });
  }

  function init() {
    document.querySelectorAll('button[data-pack-picker]').forEach(function (btn) {
      if (btn.__packPickerBound) return;
      btn.__packPickerBound = true;
      btn.addEventListener('click', function (e) { e.preventDefault(); open(btn); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
