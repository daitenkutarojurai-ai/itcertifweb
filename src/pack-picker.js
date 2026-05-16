/**
 * pack-picker.js — opens the mode-picker modal in-place on certifications pages.
 *
 * Wires every `<button data-pack-picker>` on the page: clicking the button
 * opens a 4-mode modal (Diagnostic / Quick Quiz / Full Exam / Study Mode)
 * styled the same as the modal in src/app.js. Picking a mode navigates to
 * `/train.html?pack=<id>&autostart=1`, which the home screen recognises and
 * uses to launch the actual quiz — the popup itself does not load the pack
 * JSON, so the cert page stays light.
 *
 * Required button attributes:
 *   data-pack-picker        marker, value ignored
 *   data-pack               pack id (e.g. "aws-saa-c03")
 *   data-name               pack display name (modal sub-header)
 *   data-brand              brand display name (modal header)
 *   data-question-count     number of questions available right now (chip)
 *   data-full-count         exam-blueprint count, optional (Full Exam chip)
 *   data-path               truthy if a learning path exists (currently unused
 *                           here — Learning Path link is a separate CTA)
 */
(function () {
  if (window.__packPickerInit) return;
  window.__packPickerInit = true;

  const QUICK_COUNT = 5;
  const STUDY_COUNT = 10;
  const DIAG_COUNT  = 10;

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function gotoMode(packId, mode) {
    const url = `/train.html?pack=${encodeURIComponent(packId)}&autostart=${encodeURIComponent(mode)}`;
    window.location.href = url;
  }

  function open(btn) {
    const pack  = btn.dataset.pack;
    const name  = btn.dataset.name  || pack;
    const brand = btn.dataset.brand || '';
    const qCount = Number(btn.dataset.questionCount) || 0;
    const fullCount = Number(btn.dataset.fullCount) || qCount;
    if (!pack) return;

    document.getElementById('mode-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'mode-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop"></div>
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="mode-modal-title">
        <div class="modal-handle"></div>

        <div class="modal-header">
          <div class="modal-pack-name" id="mode-modal-title">${escape(brand || name)}</div>
          <div class="modal-pack-sub">${escape(name)}</div>
        </div>

        <div class="modal-body">

          <button class="mode-card mode-card-diag" type="button" data-mode="diagnostic">
            <div class="mode-icon">🧪</div>
            <div class="mode-info">
              <div class="mode-title">Diagnostic <span class="mode-badge-new">New · for first-timers</span></div>
              <div class="mode-desc">${DIAG_COUNT} questions across all topics · Get a personalized study plan</div>
            </div>
            <div class="mode-chevron">→</div>
          </button>

          <button class="mode-card" type="button" data-mode="quick">
            <div class="mode-icon">⚡</div>
            <div class="mode-info">
              <div class="mode-title">Quick Quiz</div>
              <div class="mode-desc">${QUICK_COUNT} random questions · ~2 min</div>
            </div>
            <div class="mode-chevron">→</div>
          </button>

          <button class="mode-card" type="button" data-mode="full">
            <div class="mode-icon">📋</div>
            <div class="mode-info">
              <div class="mode-title">Full Exam</div>
              <div class="mode-desc">${fullCount} questions · Exam simulation</div>
            </div>
            <div class="mode-chevron">→</div>
          </button>

          <button class="mode-card mode-card-study" type="button" data-mode="study">
            <div class="mode-icon">📖</div>
            <div class="mode-info">
              <div class="mode-title">Study Mode</div>
              <div class="mode-desc">${STUDY_COUNT} questions · No timer · Learn at your pace</div>
            </div>
            <div class="mode-chevron">→</div>
          </button>

        </div>
      </div>
    `;
    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.querySelector('.modal-sheet').classList.add('visible');
      modal.querySelector('.modal-backdrop').classList.add('visible');
    });

    const close = () => {
      modal.querySelector('.modal-sheet').classList.remove('visible');
      modal.querySelector('.modal-backdrop').classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('#modal-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    modal.querySelectorAll('[data-mode]').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        close();
        setTimeout(() => gotoMode(pack, mode), 200);
      });
    });
  }

  function init() {
    document.querySelectorAll('button[data-pack-picker]').forEach(btn => {
      if (btn.__packPickerBound) return;
      btn.__packPickerBound = true;
      btn.addEventListener('click', (e) => { e.preventDefault(); open(btn); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
