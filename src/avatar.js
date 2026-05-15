/**
 * src/avatar.js — Phase 2 ticket #2: header avatar chip.
 *
 * Injects a 44px circular avatar chip on the LEFT of the header logo on
 * every page. Shows current stage emoji (level 1-30) with a conic-gradient
 * XP arc around the ring.
 *
 * Listens for `cq:stats-changed` to re-render in place.
 * Tap to (eventually) open a stats panel — TODO ticket #4. For now, taps
 * navigate to /profile.html so the profile page is the fallback view.
 *
 * Idempotent. Plain IIFE.
 */
(function () {
  if (window.__cqAvatarInit) return;
  window.__cqAvatarInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function getApi() { return window.cqStats; }

  function render(chip, stats) {
    var api = getApi();
    if (!chip) return;
    /* Defensive: render a safe baseline if stats API isn't ready */
    if (!api || typeof api.xpProgressForLevel !== 'function') {
      chip.style.setProperty('--xp-deg', '0deg');
      var fallbackEmoji = chip.querySelector('.cq-avatar-emoji');
      var fallbackLvl = chip.querySelector('.cq-avatar-level');
      if (fallbackEmoji) fallbackEmoji.textContent = '🥚';
      if (fallbackLvl) fallbackLvl.textContent = '1';
      return;
    }
    var level = stats.level || 1;
    var progress = api.xpProgressForLevel(stats.xp || 0, level); /* 0..1 */
    var emoji = api.stageEmojiForLevel(level);
    chip.style.setProperty('--xp-deg', (progress * 360).toFixed(1) + 'deg');
    chip.dataset.level = String(level);
    var emojiSpan = chip.querySelector('.cq-avatar-emoji');
    var levelSpan = chip.querySelector('.cq-avatar-level');
    if (emojiSpan) emojiSpan.textContent = emoji;
    if (levelSpan) levelSpan.textContent = level;
    chip.setAttribute('aria-label',
      'Level ' + level + ' · ' + Math.round(progress * 100) + '% to next');
    chip.setAttribute('title',
      'Level ' + level + ' · XP ' + (stats.xp || 0) + ' · streak ' + (stats.streakDays || 0) + 'd');
    /* Worn hat overlay */
    var hat = window.cqCosmetics && window.cqCosmetics.currentHat && window.cqCosmetics.currentHat();
    var hatEl = chip.querySelector('.cq-avatar-hat');
    if (hat) {
      if (hatEl) hatEl.textContent = hat.emoji;
      else {
        var h = document.createElement('span');
        h.className = 'cq-avatar-hat';
        h.setAttribute('aria-hidden', 'true');
        h.textContent = hat.emoji;
        chip.appendChild(h);
      }
    } else if (hatEl) { hatEl.remove(); }
  }

  function levelUpAnimation(chip) {
    chip.classList.remove('cq-avatar-chip--levelup');
    void chip.offsetWidth;
    chip.classList.add('cq-avatar-chip--levelup');
    setTimeout(function () { chip.classList.remove('cq-avatar-chip--levelup'); }, 1400);
  }

  ready(function () {
    var header = document.querySelector('.web-header');
    if (!header || header.querySelector('.cq-avatar-chip')) return;

    var chip = document.createElement('a');
    chip.className = 'cq-avatar-chip';
    chip.href = '/profile.html';
    chip.setAttribute('aria-label', 'Your level');
    chip.innerHTML =
      '<span class="cq-avatar-ring" aria-hidden="true"></span>' +
      '<span class="cq-avatar-inner" aria-hidden="true">' +
        '<span class="cq-avatar-emoji">🥚</span>' +
      '</span>' +
      '<span class="cq-avatar-level" aria-hidden="true">1</span>';

    /* Insert as first child of header so it lands in grid-column 1 on mobile. */
    header.insertBefore(chip, header.firstChild);

    var api = getApi();
    if (api) render(chip, api.get());

    window.addEventListener('cq:stats-changed', function (e) {
      var stats = (e && e.detail && e.detail.stats) || (api && api.get());
      if (stats) render(chip, stats);
    });
    window.addEventListener('cq:level-up', function () {
      levelUpAnimation(chip);
    });
    window.addEventListener('cq:cosmetic-changed', function () {
      if (api) render(chip, api.get());
    });
  });
})();
