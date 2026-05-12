/**
 * src/profile.js — Phase 3C: profile page renderer
 *
 * Aggregates stats, cosmetics, laurels, and the 14-day streak heatmap.
 * Also generates a shareable PNG of the user's progress for social.
 */
(function () {
  if (window.__cqProfileInit) return;
  window.__cqProfileInit = true;

  function $(id) { return document.getElementById(id); }

  function fmtTime(seconds) {
    if (seconds < 60) return seconds + 's';
    var m = Math.floor(seconds / 60);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }
  function fmtPct(num, denom) {
    if (!denom) return '—';
    return Math.round((num / denom) * 100) + '%';
  }
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function renderHero(stats) {
    var api = window.cqStats;
    if (!api) return;
    var level = stats.level || 1;
    var emoji = api.stageEmojiForLevel(level);
    var name = api.stageNameForLevel(level);
    var xp = stats.xp || 0;
    var thisLvl = api.thresholdForLevel(level);
    var nextLvl = api.thresholdForLevel(level + 1);
    var pct = level >= api.MAX_LEVEL ? 100 : Math.round(((xp - thisLvl) / Math.max(1, nextLvl - thisLvl)) * 100);
    $('profile-emoji').textContent = emoji;
    $('profile-stage-name').textContent = name;
    $('profile-level').textContent = level;
    $('profile-xp').textContent = xp;
    $('profile-xp-next').textContent = level >= api.MAX_LEVEL ? 'MAX' : (nextLvl - xp);
    $('profile-bar-fill').style.width = pct + '%';
    /* Worn hat */
    var hatEl = $('profile-hat');
    var hat = window.cqCosmetics && window.cqCosmetics.currentHat && window.cqCosmetics.currentHat();
    hatEl.textContent = hat ? hat.emoji : '';
  }

  function renderStats(stats) {
    $('stat-sessions').textContent = stats.sessionsCount || 0;
    $('stat-questions').textContent = stats.questionsAnswered || 0;
    $('stat-accuracy').textContent = fmtPct(stats.correctAnswered || 0, stats.questionsAnswered || 0);
    $('stat-time').textContent = fmtTime(stats.totalSeconds || 0);
    $('stat-streak').textContent = (stats.streakDays || 0) + 'd';
    $('stat-xp').textContent = stats.xp || 0;
  }

  function renderHeatmap(stats) {
    var grid = $('profile-heatmap');
    grid.innerHTML = '';
    var dates = new Set(stats.sessionDates || []);
    /* Show last 14 days, oldest first → today last */
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000);
      var k = dateKey(d);
      var hit = dates.has(k);
      /* Intensity: 0 (no activity), 1 (any activity).
         Future: weight by minutes-studied that day. */
      var lvl = hit ? 2 : 0;
      if (i === 0) lvl = hit ? 2 : 1; /* highlight today */
      var cell = document.createElement('span');
      cell.className = 'profile-heatmap-cell';
      cell.dataset.level = String(lvl);
      cell.title = k + (hit ? ' · practiced' : ' · idle');
      grid.appendChild(cell);
    }
  }

  function renderHats() {
    if (!window.cqCosmetics) return;
    window.cqCosmetics.catalog().then(function (hats) {
      var grid = $('profile-hats');
      grid.innerHTML = '';
      var unlocked = 0;
      hats.forEach(function (h) {
        if (!h.locked) unlocked++;
        var tile = document.createElement('button');
        tile.className = 'profile-hat-tile' + (h.locked ? ' is-locked' : '') + (h.wearing ? ' is-wearing' : '');
        tile.type = 'button';
        tile.dataset.key = h.key;
        tile.disabled = h.locked;
        tile.innerHTML =
          '<span class="profile-hat-emoji">' + (h.locked ? '🔒' : h.emoji) + '</span>' +
          '<span class="profile-hat-name">' + h.name + '</span>' +
          (h.locked
            ? '<span class="profile-hat-meta">' + (h.byLevel ? 'Level ' + h.unlockAt : 'Chest reward') + '</span>'
            : (h.wearing ? '<span class="profile-hat-meta">Wearing ✓</span>' : '<span class="profile-hat-meta">Tap to wear</span>'));
        tile.addEventListener('click', function () {
          if (h.locked) return;
          window.cqCosmetics.wear(h.wearing ? null : h.key);
        });
        grid.appendChild(tile);
      });
      $('hats-count').textContent = unlocked + ' / ' + hats.length + ' unlocked';
    });
  }

  function renderLaurels() {
    var host = $('profile-laurels');
    var laurels = [];
    try { laurels = JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]'); } catch (_) {}
    if (!laurels.length) {
      host.innerHTML = '<p class="profile-laurels-empty">Clear a final-boss exam to earn your first laurel.</p>';
      return;
    }
    /* Look up titles from the path index */
    fetch('/data/paths/_index.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (idx) {
        var byId = {};
        idx.forEach(function (p) { byId[p.packId] = p; });
        host.innerHTML = '';
        laurels.forEach(function (l) {
          var p = byId[l.packId] || { title: l.packId, brandColor: '#fbbf24' };
          var tile = document.createElement('div');
          tile.className = 'profile-laurel';
          tile.style.setProperty('--brand-color', p.brandColor || '#fbbf24');
          tile.innerHTML =
            '<div class="profile-laurel-wreath" aria-hidden="true">🏆</div>' +
            '<div class="profile-laurel-body">' +
              '<div class="profile-laurel-title">' + p.title + '</div>' +
              '<div class="profile-laurel-meta">Survivor · ' + new Date(l.earnedAt).toLocaleDateString() + (l.score != null ? ' · ' + l.score + '%' : '') + '</div>' +
            '</div>';
          host.appendChild(tile);
        });
      });
  }

  /* ───── Share PNG generation ───── */
  function drawShareCard(canvas, stats) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var api = window.cqStats;
    if (!api) return;

    /* Background gradient */
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0e1424');
    bg.addColorStop(0.5, '#1e2456');
    bg.addColorStop(1, '#0a0f1d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* Radial color washes */
    function radial(cx, cy, r, color) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    radial(W * 0.2, H * 0.25, 500, 'rgba(96,165,250,0.35)');
    radial(W * 0.85, H * 0.7, 500, 'rgba(167,139,250,0.30)');
    radial(W * 0.5, H * 1.0, 500, 'rgba(74,222,128,0.18)');

    /* Brand wordmark */
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 36px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CertQuests', 60, 90);

    /* Big stage emoji */
    var emoji = api.stageEmojiForLevel(stats.level || 1);
    ctx.font = '380px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, W / 2, H / 2 + 60);

    /* Hat overlay (if any) */
    var hat = window.cqCosmetics && window.cqCosmetics.currentHat && window.cqCosmetics.currentHat();
    if (hat) {
      ctx.font = '180px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';
      ctx.fillText(hat.emoji, W / 2 - 30, H / 2 - 200);
    }

    /* Level label */
    ctx.font = '700 88px "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = '#f1f5fb';
    ctx.fillText('Level ' + (stats.level || 1), W / 2, H / 2 + 220);

    /* Stage name */
    ctx.font = '600 42px "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(api.stageNameForLevel(stats.level || 1), W / 2, H / 2 + 280);

    /* Stat strip at bottom */
    var statY = H - 180;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, statY - 50, W - 120, 120, 24);
    else ctx.rect(60, statY - 50, W - 120, 120);
    ctx.fill();
    ctx.font = '700 48px "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText((stats.xp || 0) + ' XP', W * 0.20, statY + 20);
    ctx.fillStyle = '#4ade80';
    ctx.fillText((stats.streakDays || 0) + 'd 🔥', W * 0.50, statY + 20);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(fmtPct(stats.correctAnswered || 0, stats.questionsAnswered || 0), W * 0.80, statY + 20);
    ctx.font = '500 22px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Total XP', W * 0.20, statY + 56);
    ctx.fillText('Streak', W * 0.50, statY + 56);
    ctx.fillText('Accuracy', W * 0.80, statY + 56);

    /* Footer URL */
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('certquests.com', W / 2, H - 50);
  }

  function openShare() {
    var modal = $('profile-share-modal');
    var canvas = $('profile-share-canvas');
    var api = window.cqStats;
    if (!api) return;
    drawShareCard(canvas, api.get());
    modal.hidden = false;
    setTimeout(function () { modal.classList.add('is-open'); }, 10);
    $('profile-share-native').hidden = !navigator.share;
  }
  function closeShare() {
    var modal = $('profile-share-modal');
    modal.classList.remove('is-open');
    setTimeout(function () { modal.hidden = true; }, 200);
  }
  function downloadCanvas() {
    var canvas = $('profile-share-canvas');
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'certquests-level-' + (window.cqStats.get().level || 1) + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }, 'image/png');
  }
  function nativeShare() {
    var canvas = $('profile-share-canvas');
    canvas.toBlob(function (blob) {
      var file = new File([blob], 'certquests.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: 'My CertQuests progress',
          text: 'Level ' + (window.cqStats.get().level || 1) + ' on CertQuests — guided IT cert practice.',
          files: [file]
        }).catch(function () {});
      } else {
        downloadCanvas();
      }
    }, 'image/png');
  }

  function renderAll() {
    var stats = window.cqStats ? window.cqStats.get() : { level: 1, xp: 0 };
    renderHero(stats);
    renderStats(stats);
    renderHeatmap(stats);
    renderHats();
    renderLaurels();
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderAll();

    $('profile-share-btn').addEventListener('click', openShare);
    $('profile-share-modal').querySelector('.profile-share-close').addEventListener('click', closeShare);
    $('profile-share-modal').querySelector('.profile-share-backdrop').addEventListener('click', closeShare);
    $('profile-share-download').addEventListener('click', downloadCanvas);
    $('profile-share-native').addEventListener('click', nativeShare);

    $('profile-reset').addEventListener('click', function () {
      if (!confirm('Reset ALL progress? This cannot be undone.')) return;
      try {
        localStorage.removeItem('cq-stats-v1');
        localStorage.removeItem('cq-cosmetics-v1');
        localStorage.removeItem('cq-hearts-v1');
        localStorage.removeItem('cq-path-progress-v1');
        localStorage.removeItem('cq-laurels-v1');
        localStorage.removeItem('cq-daily-v1');
      } catch (_) {}
      location.reload();
    });
  });

  window.addEventListener('cq:stats-changed', renderAll);
  window.addEventListener('cq:cosmetic-changed', renderAll);
  window.addEventListener('cq:laurel-earned', renderAll);
})();
