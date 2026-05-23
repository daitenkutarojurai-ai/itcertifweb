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
    var streakEl = $('stat-streak');
    var sd = stats.streakDays || 0;
    streakEl.textContent = sd + 'd';
    streakEl.classList.toggle('is-hot', sd >= 3);
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

  function renderMilestones(stats) {
    var host = $('profile-milestones');
    if (!host) return;
    var laurelsCount = 0;
    try { laurelsCount = (JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]') || []).length; } catch (_) {}
    var hadDiag = false;
    try {
      var perPack = stats.perPack || {};
      hadDiag = Object.values(perPack).some(function (p) { return p && p.diagnosticAt; });
    } catch (_) {}
    var milestones = [
      { id: 'first-10',   emoji: '🥉', name: 'First steps',  desc: 'Answer 10 questions',         done: (stats.questionsAnswered || 0) >= 10,    progress: Math.min(1, (stats.questionsAnswered || 0) / 10) },
      { id: 'first-100',  emoji: '🥈', name: 'Centurion',    desc: 'Answer 100 questions',        done: (stats.questionsAnswered || 0) >= 100,   progress: Math.min(1, (stats.questionsAnswered || 0) / 100) },
      { id: 'first-1000', emoji: '🥇', name: 'Ironman',      desc: 'Answer 1,000 questions',      done: (stats.questionsAnswered || 0) >= 1000,  progress: Math.min(1, (stats.questionsAnswered || 0) / 1000) },
      { id: 'streak-3',   emoji: '🔥', name: 'Warming up',   desc: '3-day streak',                done: (stats.streakDays || 0) >= 3,            progress: Math.min(1, (stats.streakDays || 0) / 3) },
      { id: 'streak-7',   emoji: '🔥🔥', name: 'On fire',     desc: '7-day streak',                done: (stats.streakDays || 0) >= 7,            progress: Math.min(1, (stats.streakDays || 0) / 7) },
      { id: 'streak-30',  emoji: '🌟', name: 'Untouchable',  desc: '30-day streak',               done: (stats.streakDays || 0) >= 30,           progress: Math.min(1, (stats.streakDays || 0) / 30) },
      { id: 'diag-1',     emoji: '🧪', name: 'Self-aware',   desc: 'Take your first diagnostic',  done: hadDiag,                                  progress: hadDiag ? 1 : 0 },
      { id: 'laurel-1',   emoji: '🌿', name: 'Boss slayer',  desc: 'Earn your first laurel',      done: laurelsCount >= 1,                        progress: Math.min(1, laurelsCount / 1) },
      { id: 'level-10',   emoji: '⚡', name: 'Apprentice',   desc: 'Reach level 10',              done: (stats.level || 1) >= 10,                progress: Math.min(1, (stats.level || 1) / 10) },
      { id: 'level-20',   emoji: '⭐', name: 'Adept',        desc: 'Reach level 20',              done: (stats.level || 1) >= 20,                progress: Math.min(1, (stats.level || 1) / 20) },
      { id: 'level-30',   emoji: '👑', name: 'Master',       desc: 'Reach level 30 (max)',        done: (stats.level || 1) >= 30,                progress: Math.min(1, (stats.level || 1) / 30) }
    ];
    var unlocked = milestones.filter(function (m) { return m.done; }).length;
    host.innerHTML = milestones.map(function (m) {
      var pct = Math.round(m.progress * 100);
      return '<div class="profile-milestone' + (m.done ? ' is-done' : '') + '">' +
        '<div class="profile-milestone-emoji" aria-hidden="true">' + (m.done ? m.emoji : '🔒') + '</div>' +
        '<div class="profile-milestone-body">' +
          '<div class="profile-milestone-name">' + m.name + '</div>' +
          '<div class="profile-milestone-desc">' + m.desc + '</div>' +
          (m.done ? '' :
            '<div class="profile-milestone-bar"><div class="profile-milestone-bar-fill" style="width:' + pct + '%"></div></div>') +
        '</div>' +
      '</div>';
    }).join('');
    var countEl = $('milestones-count');
    if (countEl) countEl.textContent = unlocked + ' / ' + milestones.length + ' unlocked';
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
    try { laurels = JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]'); }
    catch (e) { if (window.cqDbg) window.cqDbg('[profile] laurels JSON.parse failed', e); }
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

  /* First-time visitors land on /profile.html with no sessions to their
     name — usually after tapping a shared image. Render a one-time
     framing banner so they're not staring at "0 sessions / 0 XP / 0%"
     with no context. Once they've played anything we hide it. */
  function maybeRenderEmptyState(stats) {
    var hero = document.querySelector('.profile-hero');
    if (!hero) return;
    var hasActivity = (stats.sessionsCount || 0) > 0 || (stats.questionsAnswered || 0) > 0;
    var existing = document.getElementById('profile-empty-state');
    if (hasActivity) { if (existing) existing.remove(); return; }
    if (existing) return;
    var banner = document.createElement('section');
    banner.id = 'profile-empty-state';
    banner.className = 'profile-empty-state';
    banner.innerHTML =
      '<div class="profile-empty-state-emoji" aria-hidden="true">🥚</div>' +
      '<div class="profile-empty-state-body">' +
        '<h2>Your CertQuests profile starts here</h2>' +
        '<p>Sessions, XP, hats and laurels show up below as soon as you play. ' +
        'Pick a cert and start a quick quiz to seed the page.</p>' +
        '<div class="profile-empty-state-actions">' +
          '<a class="cta-primary" href="/path.html">Browse paths →</a>' +
          '<a class="cta-secondary" href="/train.html">Start training</a>' +
        '</div>' +
      '</div>';
    hero.insertAdjacentElement('afterend', banner);
  }

  /* ───── Account section ────────────────────────────────────────────
     Renders one of two states:
       (a) signed-out: a "Sign in or create account" CTA that pops the
           auth modal via window.cqAuthUi.openSignIn() (loaded by
           src/auth-ui.js — silently no-op if absent).
       (b) signed-in: email + sync-status line + Sign out + Delete-account.
     Username is rendered into the hero row; edit pencil triggers an
     inline rename via the update_my_username RPC. */
  function renderAccount() {
    var anon = $('profile-account-anon');
    var signed = $('profile-account-signed');
    var usernameRow = $('profile-username-row');
    if (!anon || !signed) return;
    var user = window.cqAuth && window.cqAuth.getUser();
    if (user) {
      anon.hidden = true;
      signed.hidden = false;
      $('profile-account-email').textContent = user.email || '(no email)';
      // Username: prefer profile row pulled by sync.js, fall back to user_metadata
      var uname = null;
      try { uname = localStorage.getItem('cq-profile-username'); } catch (_) {}
      if (!uname) {
        var m = user.user_metadata || {};
        uname = m.username || m.name || (user.email ? user.email.split('@')[0] : 'you');
      }
      $('profile-username').textContent = uname;
      usernameRow.hidden = false;
      var sync = $('profile-account-sync');
      if (sync) {
        var ready = window.cqSync && window.cqSync.isReady && window.cqSync.isReady();
        sync.textContent = ready ? '✓ Synced to cloud' : 'Syncing…';
      }
      loadLeaderboardOptIn();
    } else {
      anon.hidden = false;
      signed.hidden = true;
      usernameRow.hidden = true;
    }
  }

  /* ── Leaderboard opt-in (Phase 6.7) ───────────────────────────────
     Reads profiles.leaderboard_opt_in for the signed-in user. Updates
     on toggle via UPDATE on the profiles row (RLS guards user_id =
     auth.uid()). Display name uses profiles.display_name; falls back
     to username. Silently no-ops if the migration hasn't been applied
     (column doesn't exist yet).                                        */
  async function loadLeaderboardOptIn() {
    var cb = $('profile-lb-optin');
    var stateEl = $('profile-lb-state');
    var nameRow = $('profile-lb-name-row');
    if (!cb || !window.cqAuth || !window.cqAuth._client) return;
    var uid = (window.cqAuth.getUser() || {}).id;
    if (!uid) return;
    try {
      var r = await window.cqAuth._client
        .from('profiles')
        .select('leaderboard_opt_in, display_name')
        .eq('user_id', uid)
        .maybeSingle();
      if (r.error) {
        // 42703 = undefined column → migration not applied yet.
        if (/leaderboard_opt_in|display_name|column .* does not exist/i.test(r.error.message)) {
          cb.disabled = true;
          stateEl.textContent = 'N/A';
          stateEl.title = 'Server migration not yet applied. Ask the site owner.';
          if (nameRow) nameRow.hidden = true;
          return;
        }
        throw new Error(r.error.message);
      }
      var optIn = !!(r.data && r.data.leaderboard_opt_in);
      cb.checked = optIn;
      stateEl.textContent = optIn ? 'On' : 'Off';
      if (nameRow) nameRow.hidden = !optIn;
      if (optIn) loadLeaderboardRank();
    } catch (e) {
      if (window.cqDbg) window.cqDbg('[cq-profile] leaderboard load failed:', e.message);
    }
  }

  async function loadLeaderboardRank() {
    var rankRow = $('profile-lb-rank-row');
    var rankBadge = $('profile-lb-rank-badge');
    if (!rankRow || !rankBadge || !window.cqAuth || !window.cqAuth._client) return;
    var session = window.cqAuth._client.auth && (await window.cqAuth._client.auth.getSession()).data.session;
    if (!session) return;
    try {
      var r = await window.cqAuth._client.rpc('get_my_leaderboard_rank');
      if (r.error || !r.data || !r.data.opted_in) return;
      var parts = [];
      if (r.data.rank_all_time) parts.push('🏆 #' + r.data.rank_all_time + ' tous les temps');
      if (r.data.rank_weekly)   parts.push('⚡ #' + r.data.rank_weekly + ' cette semaine');
      if (!parts.length) return;
      rankBadge.textContent = parts.join(' · ');
      rankRow.hidden = false;
    } catch (e) {
      if (window.cqDbg) window.cqDbg('[cq-profile] rank RPC failed:', e.message);
    }
  }

  async function saveLeaderboardOptIn(next) {
    if (!window.cqAuth || !window.cqAuth._client) return;
    var uid = (window.cqAuth.getUser() || {}).id;
    if (!uid) return;
    var cb = $('profile-lb-optin');
    var stateEl = $('profile-lb-state');
    var nameRow = $('profile-lb-name-row');
    cb.disabled = true;
    var r = await window.cqAuth._client
      .from('profiles')
      .update({ leaderboard_opt_in: next })
      .eq('user_id', uid);
    cb.disabled = false;
    if (r.error) {
      alert('Could not save: ' + r.error.message);
      cb.checked = !next; // revert
      return;
    }
    stateEl.textContent = next ? 'On' : 'Off';
    if (nameRow) nameRow.hidden = !next;
  }

  async function editLeaderboardName() {
    if (!window.cqAuth || !window.cqAuth._client) return;
    var uid = (window.cqAuth.getUser() || {}).id;
    if (!uid) return;
    var current = '';
    try {
      var r = await window.cqAuth._client.from('profiles').select('display_name').eq('user_id', uid).maybeSingle();
      current = (r.data && r.data.display_name) || '';
    } catch (_) {}
    var next = prompt('Leaderboard display name (max 40 chars). Leave blank to use your username:', current);
    if (next == null) return;
    next = next.trim().slice(0, 40);
    var u = await window.cqAuth._client.from('profiles').update({ display_name: next || null }).eq('user_id', uid);
    if (u.error) { alert('Could not save: ' + u.error.message); return; }
    alert('Saved. Refresh /leaderboard/ to see the change.');
  }

  /* Edit username — opens a tiny inline prompt, then calls the RPC. */
  async function editUsername() {
    if (!window.cqAuth || !window.cqAuth.isSignedIn()) return;
    var current = $('profile-username').textContent;
    var next = prompt('New username (max 40 chars):', current);
    if (next == null) return;
    next = next.trim();
    if (!next || next === current) return;
    // Client-side guard mirroring the server constraint — saves a round-trip
    // and gives immediate feedback. Allowed: 3–40 chars, letters / digits /
    // underscore / hyphen.
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(next)) {
      alert('Username must be 3–40 characters: letters, digits, underscore, or hyphen.');
      return;
    }
    var c = window.cqAuth._client;
    var r = await c.rpc('update_my_username', { new_username: next });
    if (r.error) {
      alert('Could not save: ' + r.error.message);
      return;
    }
    var saved = r.data || next;
    try { localStorage.setItem('cq-profile-username', saved); } catch (_) {}
    $('profile-username').textContent = saved;
    // Trigger the header chip to redraw via the auth listener
    window.dispatchEvent(new CustomEvent('cq:auth-changed', {
      detail: { session: window.cqAuth.getSession() }
    }));
  }

  /* Delete account — destructive; double-confirm with the email so a
     mistaken tap on a phone can't wipe a real user. */
  async function deleteAccount() {
    if (!window.cqAuth || !window.cqAuth.isSignedIn()) return;
    var user = window.cqAuth.getUser();
    if (!user) return;
    var emailEcho = prompt(
      'This permanently deletes your account, all stats, hats, laurels, ' +
      'and path progress on the cloud. This cannot be undone.\n\n' +
      'Type your email (' + user.email + ') to confirm:'
    );
    if (!emailEcho || emailEcho.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
      if (emailEcho != null) alert('Email did not match. Cancelled.');
      return;
    }
    var btn = $('profile-account-delete');
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
    var c = window.cqAuth._client;
    var r = await c.rpc('delete_my_account');
    if (r.error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Delete account & all data'; }
      alert('Could not delete: ' + r.error.message);
      return;
    }
    // Sign out + clear local progress; user lands as a fresh anonymous visitor.
    try { await window.cqAuth.signOut(); } catch (_) {}
    try {
      localStorage.removeItem('cq-stats-v1');
      localStorage.removeItem('cq-cosmetics-v1');
      localStorage.removeItem('cq-hearts-v1');
      localStorage.removeItem('cq-path-progress-v1');
      localStorage.removeItem('cq-laurels-v1');
      localStorage.removeItem('cq-daily-v1');
      localStorage.removeItem('cq-profile-username');
    } catch (_) {}
    alert('Account deleted. You are now signed out.');
    location.replace('/');
  }

  function renderAll() {
    var stats = window.cqStats ? window.cqStats.get() : { level: 1, xp: 0 };
    renderHero(stats);
    renderStats(stats);
    renderHeatmap(stats);
    renderMilestones(stats);
    renderHats();
    renderLaurels();
    renderAccount();
    maybeRenderEmptyState(stats);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderAll();

    $('profile-share-btn').addEventListener('click', openShare);
    $('profile-share-modal').querySelector('.profile-share-close').addEventListener('click', closeShare);
    $('profile-share-modal').querySelector('.profile-share-backdrop').addEventListener('click', closeShare);
    $('profile-share-download').addEventListener('click', downloadCanvas);
    $('profile-share-native').addEventListener('click', nativeShare);

    $('profile-reset').addEventListener('click', function () {
      if (!confirm('Reset local progress on this device? Your cloud copy (if signed in) is unaffected. This cannot be undone locally.')) return;
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

    /* Account section wiring */
    var signinBtn = $('profile-account-signin');
    if (signinBtn) {
      signinBtn.addEventListener('click', function () {
        /* Anon user on the profile page is almost always new — open the
           Create-account tab. The Sign-in tab is one click away. */
        if (window.cqAuthUi && window.cqAuthUi.openSignUp) window.cqAuthUi.openSignUp();
        else if (window.cqAuthUi && window.cqAuthUi.openSignIn) window.cqAuthUi.openSignIn();
      });
    }
    var signoutBtn = $('profile-account-signout');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async function () {
        if (window.cqAuth) await window.cqAuth.signOut();
      });
    }
    var deleteBtn = $('profile-account-delete');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteAccount);
    var editBtn = $('profile-username-edit');
    if (editBtn) editBtn.addEventListener('click', editUsername);

    /* Phase 6.7: leaderboard opt-in toggle + display name */
    var lbCb = $('profile-lb-optin');
    if (lbCb) {
      lbCb.addEventListener('change', function () { saveLeaderboardOptIn(lbCb.checked); });
    }
    var lbName = $('profile-lb-name-edit');
    if (lbName) lbName.addEventListener('click', editLeaderboardName);
  });

  window.addEventListener('cq:stats-changed', renderAll);
  window.addEventListener('cq:cosmetic-changed', renderAll);
  window.addEventListener('cq:laurel-earned', renderAll);
  /* Auth state changes redraw the account section + hide/show the
     anonymous empty-state banner; sync events redraw stats hydrated
     from cloud. Both end up in the same renderAll path. */
  window.addEventListener('cq:auth-changed', renderAll);
  window.addEventListener('cq:sync-hydrated', renderAll);
})();
