/* challenges.js — Phase 7.4 Challenges (weekly competitive events)
 *
 * Time-boxed weekly challenges with RANKED leaderboards (vs daily.js, which is
 * a solo daily quest). Definitions are static templates here; progress accrues
 * per ISO week from the cq:* event bus and mirrors to public.challenge_progress
 * (own-row RLS) so get_challenge_leaderboard can rank opted-in players.
 *
 * Progress resets each ISO week. 'count' = questions answered this week,
 * 'nodes' = path nodes cleared this week, 'streak' = current stats.streakDays.
 *
 * Exports:
 *   - browser: window.cqChallenges.getActive() / .isoWeek() / .sync()
 *   - node (test): module.exports { WEEKLY, progressFor, activeChallenges, isoWeek }
 */
(function () {
  var IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

  var WEEKLY = [
    { id: 'weekly-sprint', icon: '⚡', title: 'Weekly Sprint', desc: 'Answer 100 questions this week.', type: 'count', target: 100 },
    { id: 'path-crawler', icon: '🗺️', title: 'Path Crawler', desc: 'Clear 15 learning-path nodes this week.', type: 'nodes', target: 15 },
    { id: 'streak-keeper', icon: '🔥', title: 'Streak Keeper', desc: 'Reach a 7-day study streak.', type: 'streak', target: 7 }
  ];

  function isoWeek(d) {
    d = d || new Date();
    var dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
    var ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    var wk = Math.ceil(((dt.getTime() - ys.getTime()) / 86400000 + 1) / 7);
    return dt.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
  }

  /* Pure: progress for one template given ctx = { counts:{id:n}, streakDays }. */
  function progressFor(t, ctx) {
    ctx = ctx || {};
    var raw = t.type === 'streak'
      ? (ctx.streakDays | 0)
      : (((ctx.counts || {})[t.id]) | 0);
    return Math.max(0, Math.min(t.target, raw));
  }

  function activeChallenges(ctx) {
    return WEEKLY.map(function (t) {
      var p = progressFor(t, ctx);
      return { id: t.id, icon: t.icon, title: t.title, desc: t.desc, type: t.type, target: t.target, progress: p, completed: p >= t.target };
    });
  }

  if (!IS_BROWSER) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { WEEKLY: WEEKLY, progressFor: progressFor, activeChallenges: activeChallenges, isoWeek: isoWeek };
    }
    return;
  }

  var KEY = 'cq-challenges-v1';

  function load() {
    var wk = isoWeek();
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { s = null; }
    if (!s || s.iso_week !== wk || typeof s.counts !== 'object' || !s.counts) {
      s = { iso_week: wk, counts: {} }; // new week → fresh counters
    }
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} }

  function ctxNow() {
    var s = load();
    var stats = (window.cqStats && window.cqStats.get) ? window.cqStats.get() : {};
    return { counts: s.counts, streakDays: stats.streakDays || 0 };
  }

  var pushTimer = null;
  function scheduleSync() { clearTimeout(pushTimer); pushTimer = setTimeout(syncCloud, 1200); }

  function syncCloud() {
    var c = window.cqAuth && window.cqAuth._client;
    var uid = window.cqAuth && window.cqAuth.getUser && (window.cqAuth.getUser() || {}).id;
    if (!c || !uid) return;
    var wk = isoWeek();
    var rows = activeChallenges(ctxNow()).map(function (ch) {
      return { user_id: uid, challenge_id: ch.id, iso_week: wk, progress: ch.progress, completed: ch.completed };
    });
    try {
      c.from('challenge_progress').upsert(rows, { onConflict: 'user_id,challenge_id,iso_week' }).then(function () {}, function () {});
    } catch (_) { /* table/migration absent — local tracking still works */ }
  }

  function bump(type, amount) {
    var s = load();
    var changed = false;
    WEEKLY.forEach(function (t) {
      if (t.type !== type) return;
      s.counts[t.id] = (s.counts[t.id] | 0) + amount;
      changed = true;
    });
    if (changed) { save(s); scheduleSync(); }
  }

  var REWARD_MODES = { 'daily-quest-reward': 1, 'challenge-reward': 1 };
  window.addEventListener('cq:session-complete', function (e) {
    var d = (e && e.detail) || {};
    if (d.mode && REWARD_MODES[d.mode]) return; // don't count synthetic reward events
    var qa = +d.questionsAnswered || 0;
    if (qa > 0) bump('count', qa);
    // streak-type challenges derive from stats; just resync so the cloud row tracks it
    scheduleSync();
  });

  window.addEventListener('cq:path-progress-changed', function () { bump('nodes', 1); });
  // Re-sync once signed in (push this device's current week progress).
  window.addEventListener('cq:auth-changed', function (e) {
    if (e && e.detail && e.detail.session) scheduleSync();
  });

  window.cqChallenges = {
    getActive: function () { return activeChallenges(ctxNow()); },
    isoWeek: isoWeek,
    sync: syncCloud
  };
})();
