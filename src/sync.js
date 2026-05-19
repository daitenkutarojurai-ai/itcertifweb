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
// CUTOVER MAP — v2 only
// Phases 2 + 8 of the cross-device progress sync plan are complete. Every
// push goes to a `_v2` table; reads target `_v2` exclusively; the bootstrap
// probe uses `profiles_v2.xp > 0`. Legacy tables (stats, path_progress,
// laurels, cosmetics, hearts, daily) are untouched and will be dropped in
// plan Task 40 after the post-Task-8 soak.
//
//   src/sync.js:pushStats                    → profiles_v2
//   src/sync.js:pushAllPathProgressFromLocal → path_progress_v2
//   src/sync.js:pushPathProgress             → path_progress_v2
//   src/sync.js:pushAllLaurelsFromLocal      → achievements_v2 (key='laurel')
//   src/sync.js:pushLaurel                   → achievements_v2 (key='laurel')
//   src/sync.js:pushCosmetics                → cosmetics_v2
//   src/sync.js:pushHearts                   → hearts_v2 (count, last_regen_at)
//   src/sync.js:pushDailyToday               → daily_v2 (date, pack_id, claimed_at)
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

  // Dual-write helper: mirrors a legacy upsert into the corresponding v2
  // table. Never throws — failures are logged via dbg() and console.warn so
  // the legacy write (which runs immediately before this) keeps the user's
  // progress safe even if the v2 table is unreachable.
  async function pushV2(table, payload, conflictKeys) {
    try {
      var sb = client();
      if (!sb) return;
      var res = await sb.from(table).upsert(payload, { onConflict: conflictKeys });
      if (res && res.error) {
        dbg('[cq-sync v2] upsert failed', table, res.error.message);
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[sync v2] upsert failed', table, res.error.message);
        }
      }
    } catch (e) {
      dbg('[cq-sync v2] threw', table, e && e.message);
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[sync v2] threw', table, e && e.message);
      }
    }
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
    // profiles_v2 has flat xp / level / username columns. xp & level live
    // inside the legacy jsonb payload (still read for compatibility);
    // username is cached separately at `cq-profile-username` by the pull
    // path and may also live inside payload.
    var xp = typeof payload.xp === 'number' ? payload.xp | 0 : 0;
    var level = typeof payload.level === 'number' ? payload.level | 0 : 0;
    var username = null;
    try {
      username = (typeof payload.username === 'string' && payload.username)
        ? payload.username
        : (localStorage.getItem('cq-profile-username') || null);
    } catch (_) { /* localStorage may throw in private mode */ }
    await pushV2('profiles_v2', {
      user_id: uid,
      username: username,
      xp: xp,
      level: level,
    }, 'user_id');
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
    var nowIso = new Date().toISOString();
    var rowsV2 = rows.map(function (r) {
      return {
        user_id: r.user_id,
        pack_id: r.pack_id,
        node_id: r.node_id,
        completed_at: r.completed_at,
        score: r.score,
        updated_at: nowIso,
      };
    });
    await pushV2('path_progress_v2', rowsV2, 'user_id,pack_id,node_id');
  }

  async function pushPathProgress(packId, nodeId, score) {
    var c = client(); var uid = userId();
    if (!c || !uid || !packId || !nodeId) return;
    var nowIso = new Date().toISOString();
    await pushV2('path_progress_v2', {
      user_id: uid,
      pack_id: packId,
      node_id: nodeId,
      completed_at: nowIso,
      score: typeof score === 'number' ? score : null,
      updated_at: nowIso,
    }, 'user_id,pack_id,node_id');
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
    // achievements_v2 is keyed by (user_id, key, pack_id); we tag laurels
    // with key='laurel' so future achievement types can coexist.
    var rowsV2 = rows.map(function (r) {
      return {
        user_id: r.user_id,
        key: 'laurel',
        pack_id: r.pack_id,
        earned_at: r.earned_at,
        score: r.score,
      };
    });
    await pushV2('achievements_v2', rowsV2, 'user_id,key,pack_id');
  }

  async function pushLaurel(packId, score) {
    var c = client(); var uid = userId();
    if (!c || !uid || !packId) return;
    var nowIso = new Date().toISOString();
    await pushV2('achievements_v2', {
      user_id: uid,
      key: 'laurel',
      pack_id: packId,
      earned_at: nowIso,
      score: typeof score === 'number' ? score : null,
    }, 'user_id,key,pack_id');
  }

  async function pushCosmetics() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var cos = readKey('cq-cosmetics-v1', { unlocked: [], wearing: null });
    await pushV2('cosmetics_v2', {
      user_id: uid,
      unlocked: Array.isArray(cos.unlocked) ? cos.unlocked : [],
      wearing: cos.wearing || null,
    }, 'user_id');
  }

  async function pushHearts() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var h = readKey('cq-hearts-v1', { hearts: 5, lastLostAt: 0 });
    var clamped = Math.max(0, Math.min(5, h.hearts | 0));
    var lastIso = h.lastLostAt ? new Date(h.lastLostAt).toISOString() : null;
    // hearts_v2 columns are count / last_regen_at (not nullable). If there's
    // no prior "lost-at" yet we synthesise `now` so the not-null constraint
    // passes.
    await pushV2('hearts_v2', {
      user_id: uid,
      count: clamped,
      last_regen_at: lastIso || new Date().toISOString(),
    }, 'user_id');
  }

  async function pushDailyToday() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var d = readKey('cq-daily-v1', { date: todayIsoDay(), progress: 0, claimed: false });
    // The local key only stores TODAY's progress (it resets at midnight),
    // so we just upsert the row for the current local date.
    var day = d.date || todayIsoDay();
    var progressInt = d.progress | 0;
    var claimedBool = !!d.claimed;
    // daily_v2 uses `date` (not `day`) and carries pack_id + claimed_at.
    // The website doesn't track the daily challenge's pack here yet,
    // so we stamp '' for compatibility.
    await pushV2('daily_v2', {
      user_id: uid,
      date: day,
      pack_id: '',
      progress: progressInt,
      claimed: claimedBool,
      claimed_at: claimedBool ? new Date().toISOString() : null,
    }, 'user_id,date');
  }

  /* ═══════ PULL (cloud → local) ════════════════════════════════════════ */

  async function pullAll() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var myToken = pullToken;
    function stale() { return myToken !== pullToken; }

    // 1) stats — v2 has flat xp / level / username columns; rebuild the legacy
    //    jsonb payload shape by MERGING the cloud values into whatever the
    //    local payload had (so non-canonical extras the website may stash in
    //    cq-stats-v1, e.g. streak counters, are preserved across hydration).
    var prof = await c.from('profiles_v2').select('xp,level,username').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (prof.data) {
      var localPayload = readKey('cq-stats-v1', {});
      var merged = Object.assign({}, localPayload, {
        xp: typeof prof.data.xp === 'number' ? prof.data.xp : (localPayload.xp || 0),
        level: typeof prof.data.level === 'number' ? prof.data.level : (localPayload.level || 0),
      });
      if (prof.data.username) merged.username = prof.data.username;
      writeKey('cq-stats-v1', merged);
    }

    // 2) path_progress — many rows → rebuild { packId: { nodeId: {...} } }
    var pp = await c.from('path_progress_v2').select('pack_id,node_id,completed_at,score').eq('user_id', uid);
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

    // 3) laurels — many rows → array. achievements_v2 holds any achievement
    //    kind; filter to key='laurel' so the legacy local cache shape stays
    //    pure-laurels and the rest of the website doesn't need to change.
    var lr = await c.from('achievements_v2').select('pack_id,earned_at,score').eq('user_id', uid).eq('key', 'laurel');
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
    var cos = await c.from('cosmetics_v2').select('unlocked,wearing').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (cos.data) {
      writeKey('cq-cosmetics-v1', {
        unlocked: Array.isArray(cos.data.unlocked) ? cos.data.unlocked : [],
        wearing: cos.data.wearing || null,
      });
    }

    // 5) hearts — single row. v2 columns are count / last_regen_at; project
    //    back to the legacy {hearts, lastLostAt} local shape.
    var h = await c.from('hearts_v2').select('count,last_regen_at').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (h.data) {
      writeKey('cq-hearts-v1', {
        hearts: h.data.count,
        lastLostAt: h.data.last_regen_at ? new Date(h.data.last_regen_at).getTime() : 0,
      });
    }

    // 6) daily — only today's row (older days are off-screen). v2 uses `date`
    //    instead of `day`; project back to legacy `{date, progress, claimed}`
    //    so the website keeps reading the same local shape.
    var today = todayIsoDay();
    var d = await c.from('daily_v2').select('date,progress,claimed').eq('user_id', uid).eq('date', today).maybeSingle();
    if (stale()) return;
    if (d.data) {
      writeKey('cq-daily-v1', {
        date: d.data.date,
        progress: d.data.progress,
        claimed: !!d.data.claimed,
      });
    }

    // 7) profile — read username so UI can show it. profiles_v2 carries the
    //    canonical username (the legacy `profiles.username` is now redundant
    //    and will be retired with Task 8). Step (1) above already hydrated
    //    cq-stats-v1.username from the same row, but the standalone cache
    //    key `cq-profile-username` is read by auth-ui chips, so refresh it
    //    here too.
    var pr = await c.from('profiles_v2').select('username').eq('user_id', uid).maybeSingle();
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

    // Probe cloud: has this user ever pushed real data?
    //
    // Phase 1's backfill seeded `profiles_v2` for every registered user
    // with xp=0, so row-existence alone is not a "has played" signal.
    // We check `xp > 0` (any quiz earns XP) — that's only true once the
    // user has actually played and pushed. Falls back to "first sign-in"
    // (push local) for xp=0 / no-row, which is safe: pushing zeros is a
    // no-op against the backfilled cloud row, and pushing real local
    // progress replaces the backfilled zeros.
    //
    // Edge case left as TODO: a user with only-achievements-no-XP would
    // be classified as first sign-in and re-push local. Tolerable —
    // achievements_v2 has set-union semantics on the next merge cycle.
    var probe = await c.from('profiles_v2').select('xp').eq('user_id', uid).maybeSingle();
    if (probe.error) {
      dbg('[cq-sync] bootstrap probe failed', probe.error);
      bootstrapped = false;
      return;
    }

    var cloudXp = probe.data ? (probe.data.xp | 0) : 0;
    if (cloudXp === 0) {
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
