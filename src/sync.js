/**
 * src/sync.js — Phase 3D round 3: localStorage ↔ Supabase sync
 *
 * Bridges the existing anonymous localStorage state with the per-user
 * cloud tables created in round 1. Strategy:
 *
 *   FIRST SIGN-IN (no `stats` row in cloud yet)
 *     → push every cq-* localStorage key to Supabase
 *     → user's anonymous progress is "claimed" by the account
 *
 *   SUBSEQUENT SIGN-INS (stats row exists)
 *     → pull cloud → localStorage, overwriting local state
 *     → fire cq:*-changed events so the UI re-renders
 *     → this is the multi-device hydration path
 *
 *   DURING A SIGNED-IN SESSION
 *     → listen to the existing event bus and write-through to cloud
 *     → stats.js push debounced 1s (writes happen on every q answered)
 *     → laurel / path-progress / cosmetic / heart / daily push immediate
 *
 * Conflict policy: cloud always wins on subsequent sign-in. The "I had
 * unclaimed progress and I'm not on my usual device" case can be
 * addressed in a future round with a merge prompt; today, the cleaner
 * semantics is "first-claim wins; later sign-ins pull what's on file".
 *
 * Auth source: window.cqAuth (loaded by src/auth.js). If cqAuth isn't
 * present we no-op silently. Sign-out clears the bootstrapped flag so
 * the next sign-in re-bootstraps cleanly.
 */
(function () {
  if (window.__cqSyncInit) return;
  window.__cqSyncInit = true;

  /* ───── Helpers ────────────────────────────────────────────────────── */
  function client() { return window.cqAuth && window.cqAuth._client; }
  function userId() {
    var u = window.cqAuth && window.cqAuth.getUser();
    return u && u.id;
  }
  function dbg() {
    if (window.cqDbg) window.cqDbg.apply(null, arguments);
  }
  function readKey(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); }
    catch (_) { return fallback; }
  }
  function writeKey(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { dbg('[cq-sync] writeKey failed', k, e && e.message); }
  }
  function todayIsoDay() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  var bootstrapped = false;
  var pendingStatsPush = null;
  // Bumped on sign-out so an in-flight pullAll can detect it's stale and
  // stop overwriting localStorage with the previous user's cloud state.
  var pullToken = 0;

  /* ═══════ PUSH (local → cloud) ════════════════════════════════════════ */

  async function pushStats() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var payload = readKey('cq-stats-v1', {});
    var { error } = await c.from('stats').upsert({ user_id: uid, payload: payload });
    if (error) dbg('[cq-sync] pushStats failed', error);
  }

  async function pushAllPathProgressFromLocal() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var map = readKey('cq-path-progress-v1', {});
    var rows = [];
    Object.keys(map).forEach(function (packId) {
      var nodes = map[packId] || {};
      Object.keys(nodes).forEach(function (nodeId) {
        var v = nodes[nodeId];
        if (v && v.completed) {
          rows.push({
            user_id: uid, pack_id: packId, node_id: nodeId,
            completed_at: v.completedAt ? new Date(v.completedAt).toISOString() : new Date().toISOString(),
            score: typeof v.score === 'number' ? v.score : null,
          });
        }
      });
    });
    if (!rows.length) return;
    var { error } = await c.from('path_progress').upsert(rows);
    if (error) dbg('[cq-sync] pushAllPathProgressFromLocal failed', error);
  }

  async function pushPathProgress(packId, nodeId, score) {
    var c = client(); var uid = userId();
    if (!c || !uid || !packId || !nodeId) return;
    var { error } = await c.from('path_progress').upsert({
      user_id: uid, pack_id: packId, node_id: nodeId,
      completed_at: new Date().toISOString(),
      score: typeof score === 'number' ? score : null,
    });
    if (error) dbg('[cq-sync] pushPathProgress failed', error);
  }

  async function pushAllLaurelsFromLocal() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var laurels = readKey('cq-laurels-v1', []);
    if (!laurels.length) return;
    var rows = laurels.map(function (l) {
      return {
        user_id: uid, pack_id: l.packId,
        earned_at: l.earnedAt ? new Date(l.earnedAt).toISOString() : new Date().toISOString(),
        score: typeof l.score === 'number' ? l.score : null,
      };
    });
    var { error } = await c.from('laurels').upsert(rows);
    if (error) dbg('[cq-sync] pushAllLaurelsFromLocal failed', error);
  }

  async function pushLaurel(packId, score) {
    var c = client(); var uid = userId();
    if (!c || !uid || !packId) return;
    var { error } = await c.from('laurels').upsert({
      user_id: uid, pack_id: packId,
      earned_at: new Date().toISOString(),
      score: typeof score === 'number' ? score : null,
    });
    if (error) dbg('[cq-sync] pushLaurel failed', error);
  }

  async function pushCosmetics() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var cos = readKey('cq-cosmetics-v1', { unlocked: [], wearing: null });
    var { error } = await c.from('cosmetics').upsert({
      user_id: uid,
      unlocked: Array.isArray(cos.unlocked) ? cos.unlocked : [],
      wearing: cos.wearing || null,
    });
    if (error) dbg('[cq-sync] pushCosmetics failed', error);
  }

  async function pushHearts() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var h = readKey('cq-hearts-v1', { hearts: 5, lastLostAt: 0 });
    var { error } = await c.from('hearts').upsert({
      user_id: uid,
      hearts: Math.max(0, Math.min(5, h.hearts | 0)),
      last_lost_at: h.lastLostAt ? new Date(h.lastLostAt).toISOString() : null,
    });
    if (error) dbg('[cq-sync] pushHearts failed', error);
  }

  async function pushDailyToday() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var d = readKey('cq-daily-v1', { date: todayIsoDay(), progress: 0, claimed: false });
    // The local key only stores TODAY's progress (it resets at midnight),
    // so we just upsert the row for the current local date.
    var day = d.date || todayIsoDay();
    var { error } = await c.from('daily').upsert({
      user_id: uid, day: day,
      progress: d.progress | 0,
      claimed: !!d.claimed,
    });
    if (error) dbg('[cq-sync] pushDailyToday failed', error);
  }

  /* ═══════ PULL (cloud → local) ════════════════════════════════════════ */

  async function pullAll() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var myToken = pullToken;
    function stale() { return myToken !== pullToken; }

    // 1) stats — single jsonb blob
    var stats = await c.from('stats').select('payload').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (stats.data && stats.data.payload) writeKey('cq-stats-v1', stats.data.payload);

    // 2) path_progress — many rows → rebuild { packId: { nodeId: {...} } }
    var pp = await c.from('path_progress').select('pack_id,node_id,completed_at,score').eq('user_id', uid);
    if (stale()) return;
    var progMap = {};
    (pp.data || []).forEach(function (row) {
      if (!progMap[row.pack_id]) progMap[row.pack_id] = {};
      progMap[row.pack_id][row.node_id] = {
        completed: true,
        completedAt: row.completed_at ? new Date(row.completed_at).getTime() : Date.now(),
        score: row.score,
      };
    });
    writeKey('cq-path-progress-v1', progMap);

    // 3) laurels — many rows → array
    var lr = await c.from('laurels').select('pack_id,earned_at,score').eq('user_id', uid);
    if (stale()) return;
    var laurels = (lr.data || []).map(function (r) {
      return {
        packId: r.pack_id,
        earnedAt: r.earned_at ? new Date(r.earned_at).getTime() : Date.now(),
        score: r.score,
      };
    });
    writeKey('cq-laurels-v1', laurels);

    // 4) cosmetics — single row
    var cos = await c.from('cosmetics').select('unlocked,wearing').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (cos.data) {
      writeKey('cq-cosmetics-v1', {
        unlocked: Array.isArray(cos.data.unlocked) ? cos.data.unlocked : [],
        wearing: cos.data.wearing || null,
      });
    }

    // 5) hearts — single row
    var h = await c.from('hearts').select('hearts,last_lost_at').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (h.data) {
      writeKey('cq-hearts-v1', {
        hearts: h.data.hearts,
        lastLostAt: h.data.last_lost_at ? new Date(h.data.last_lost_at).getTime() : 0,
      });
    }

    // 6) daily — only today's row (older days are off-screen)
    var today = todayIsoDay();
    var d = await c.from('daily').select('day,progress,claimed').eq('user_id', uid).eq('day', today).maybeSingle();
    if (stale()) return;
    if (d.data) {
      writeKey('cq-daily-v1', {
        date: d.data.day,
        progress: d.data.progress,
        claimed: !!d.data.claimed,
      });
    }

    // 7) profile — read username so UI can show it (auth-ui prefers user_metadata
    //    which is already populated by the trigger from the signup `data`, but
    //    if a future round lets users rename via the profile page, the cloud
    //    profile row is authoritative).
    var pr = await c.from('profiles').select('username').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (pr.data && pr.data.username) {
      try { localStorage.setItem('cq-profile-username', pr.data.username); }
      catch (e) { dbg('[cq-sync] cache username failed', e && e.message); }
    }

    // Fire change events so subscribers re-render off the freshly-hydrated
    // localStorage. We don't import cqStats here — load() runs lazily on
    // each cq:stats-changed listener call.
    window.dispatchEvent(new CustomEvent('cq:stats-changed', {
      detail: { stats: readKey('cq-stats-v1', {}), leveledUp: false, hydrated: true },
    }));
    window.dispatchEvent(new CustomEvent('cq:cosmetic-changed', {
      detail: readKey('cq-cosmetics-v1', { unlocked: [], wearing: null }),
    }));
    window.dispatchEvent(new CustomEvent('cq:daily-changed', {
      detail: readKey('cq-daily-v1', { date: today, progress: 0, claimed: false }),
    }));
    window.dispatchEvent(new CustomEvent('cq:sync-hydrated', {
      detail: { user_id: uid },
    }));
  }

  /* ═══════ BOOTSTRAP ═════════════════════════════════════════════════ */

  async function bootstrap() {
    if (bootstrapped) return;
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    bootstrapped = true;

    // Probe cloud: does this user already have a stats row?
    var probe = await c.from('stats').select('user_id').eq('user_id', uid).maybeSingle();
    if (probe.error) {
      dbg('[cq-sync] bootstrap probe failed', probe.error);
      bootstrapped = false;
      return;
    }

    if (!probe.data) {
      // First sign-in for this account → push every local key to cloud.
      dbg('[cq-sync] first sign-in — claiming local progress');
      await Promise.all([
        pushStats(),
        pushAllPathProgressFromLocal(),
        pushAllLaurelsFromLocal(),
        pushCosmetics(),
        pushHearts(),
        pushDailyToday(),
      ]);
      window.dispatchEvent(new CustomEvent('cq:sync-claimed', { detail: { user_id: uid } }));
    } else {
      // Returning user → pull cloud over local.
      dbg('[cq-sync] hydrating from cloud');
      await pullAll();
    }
  }

  /* ═══════ EVENT BUS BINDINGS ════════════════════════════════════════ */

  // Sign in / sign out
  window.addEventListener('cq:auth-changed', function (e) {
    var session = e && e.detail && e.detail.session;
    if (session) {
      // Defer one frame so any other listener (e.g., the UI chip swap) runs
      // first — improves perceived latency on the sign-in modal close.
      setTimeout(bootstrap, 0);
    } else {
      bootstrapped = false;
      // Invalidate any in-flight pullAll so it stops writing the previous
      // user's cloud snapshot over the now-anonymous localStorage state.
      pullToken++;
      // Don't wipe localStorage on sign-out — let the user keep playing as
      // anonymous. Their cloud data stays put; next sign-in pulls again.
    }
  });

  // Debounced stats push (XP recomputed on every cq:session-complete; we
  // don't want a network call per question)
  window.addEventListener('cq:stats-changed', function (e) {
    if (!userId()) return;
    // Skip the synthetic event fired by pullAll() — that's cloud→local,
    // pushing back would create a useless round-trip.
    if (e && e.detail && e.detail.hydrated) return;
    clearTimeout(pendingStatsPush);
    pendingStatsPush = setTimeout(pushStats, 1000);
  });

  window.addEventListener('cq:path-progress-changed', function (e) {
    if (!userId()) return;
    var d = (e && e.detail) || {};
    if (d.packId && d.nodeId) pushPathProgress(d.packId, d.nodeId, d.score);
  });

  window.addEventListener('cq:laurel-earned', function (e) {
    if (!userId()) return;
    var d = (e && e.detail) || {};
    if (d.packId) pushLaurel(d.packId, d.score);
  });

  window.addEventListener('cq:cosmetic-changed', function (e) {
    if (!userId()) return;
    if (e && e.detail && e.detail.hydrated) return;
    pushCosmetics();
  });

  window.addEventListener('cq:heart-lost', function () {
    if (!userId()) return;
    pushHearts();
  });

  window.addEventListener('cq:daily-changed', function (e) {
    if (!userId()) return;
    if (e && e.detail && e.detail.hydrated) return;
    pushDailyToday();
  });

  /* ═══════ Public API ════════════════════════════════════════════════ */
  // Tiny surface — most consumers don't need this; sync runs automatically.
  // Exposed for advanced callers (e.g., a "sync now" button on a future
  // settings page).
  window.cqSync = {
    bootstrap: bootstrap,
    pushStats: pushStats,
    pullAll: pullAll,
    isReady: function () { return bootstrapped; },
  };

  dbg('[cq-sync] initialized');
})();
