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
// CUTOVER MAP — canonical schema
// All phases of the cross-device progress sync plan are complete (Task 40
// dropped legacy tables and renamed _v2 → canonical names). Every push goes
// to a `user_*` table; reads target `user_*` exclusively; the bootstrap
// probe uses `user_profile.xp > 0`.
//
//   src/sync.js:pushStats                    → user_profile
//   src/sync.js:pushAllPathProgressFromLocal → user_path_progress
//   src/sync.js:pushPathProgress             → user_path_progress
//   src/sync.js:pushAllLaurelsFromLocal      → user_achievements (key='laurel')
//   src/sync.js:pushLaurel                   → user_achievements (key='laurel')
//   src/sync.js:pushCosmetics                → user_cosmetics
//   src/sync.js:pushHearts                   → user_hearts (count, last_regen_at)
//   src/sync.js:pushDailyToday               → user_daily (date, pack_id, claimed_at)
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
  // One raw upsert attempt. Returns true on success, false on any failure
  // (error response or throw). Never throws.
  async function attemptUpsert(table, payload, conflictKeys) {
    try {
      var sb = client();
      if (!sb) return false;
      var res = await sb.from(table).upsert(payload, { onConflict: conflictKeys });
      if (res && res.error) {
        dbg('[cq-sync v2] upsert failed', table, res.error.message);
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[sync v2] upsert failed', table, res.error.message);
        }
        return false;
      }
      return true;
    } catch (e) {
      dbg('[cq-sync v2] threw', table, e && e.message);
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[sync v2] threw', table, e && e.message);
      }
      return false;
    }
  }

  // Dual-write helper. On failure, the payload is queued to a localStorage
  // backlog and retried on the next `online` / sign-in, so a single network
  // blip no longer permanently drops a one-shot write (laurel, path node,
  // heart, daily) until an unrelated event of the same type fires.
  async function pushV2(table, payload, conflictKeys) {
    var ok = await attemptUpsert(table, payload, conflictKeys);
    if (!ok) enqueueBacklog(table, payload, conflictKeys);
    return ok;
  }

  /* ── Offline write backlog ──────────────────────────────────────────── */
  var BACKLOG_KEY = 'cq-sync-backlog-v1';
  var BACKLOG_MAX = 300;
  var flushingBacklog = false;

  // Stable identity for a queued write so re-firing the same logical write
  // (same table + same conflict-key values) collapses to one latest entry
  // instead of stacking duplicates.
  function backlogId(table, payload, conflictKeys) {
    var keys = String(conflictKeys || '').split(',').map(function (k) { return k.trim(); });
    var parts = keys.map(function (k) { return k + '=' + (payload ? payload[k] : ''); });
    return table + '|' + parts.join('&');
  }
  function enqueueBacklog(table, payload, conflictKeys) {
    var q = readKey(BACKLOG_KEY, []);
    if (!Array.isArray(q)) q = [];
    var id = backlogId(table, payload, conflictKeys);
    q = q.filter(function (e) { return e && e.id !== id; });
    q.push({ id: id, table: table, payload: payload, conflictKeys: conflictKeys });
    if (q.length > BACKLOG_MAX) q = q.slice(q.length - BACKLOG_MAX);
    writeKey(BACKLOG_KEY, q);
    dbg('[cq-sync] queued failed write', id, '(backlog', q.length + ')');
  }
  async function flushBacklog() {
    if (flushingBacklog) return;
    if (!client() || !userId()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    var q = readKey(BACKLOG_KEY, []);
    if (!Array.isArray(q) || !q.length) return;
    flushingBacklog = true;
    try {
      var remaining = [];
      for (var i = 0; i < q.length; i++) {
        var e = q[i];
        if (!e || !e.table) continue;
        var ok = await attemptUpsert(e.table, e.payload, e.conflictKeys);
        if (!ok) remaining.push(e); // keep for the next reconnect
      }
      writeKey(BACKLOG_KEY, remaining);
      dbg('[cq-sync] backlog flush done — sent', q.length - remaining.length, 'kept', remaining.length);
    } finally {
      flushingBacklog = false;
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
    // user_profile has flat xp / level / username columns. xp & level live
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
    await pushV2('user_profile', {
      user_id: uid,
      username: username,
      xp: xp,
      level: level,
    }, 'user_id');
  }

  // ── Weekly-XP bridge (cross-platform leaderboard) ──────────────────────
  // Feeds public.user_weekly_xp — the SAME table the native app's
  // get_weekly_leaderboard RPC reads — so web and app players rank on one
  // board. We mirror the app's ISO-week key byte-for-byte (lib/league.ts
  // isoWeek) and store the running weekly total, same as the app's
  // addWeeklyXp. cq-stats-v1 has no per-week breakdown, so we track the XP
  // delta since the last observation in cq-weekly-xp-v1 and accumulate it
  // into the current week's bucket (resetting when the week rolls over).
  function isoWeek(d) {
    d = d || new Date();
    var dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    var week = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return dt.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  }

  async function pushWeeklyXp() {
    var c = client(); var uid = userId();
    if (!c || !uid) return;
    var stats = readKey('cq-stats-v1', {});
    var totalXp = typeof stats.xp === 'number' ? stats.xp | 0 : 0;
    var wk = isoWeek();
    var st = readKey('cq-weekly-xp-v1', null);
    if (!st || typeof st.lastTotal !== 'number') {
      // First observation on this device: baseline only. Never credit a
      // user's accumulated lifetime XP to the current week.
      writeKey('cq-weekly-xp-v1', { iso_week: wk, xp: 0, lastTotal: totalXp });
      return;
    }
    if (st.iso_week !== wk) st = { iso_week: wk, xp: 0, lastTotal: st.lastTotal };
    var delta = totalXp - st.lastTotal;
    if (delta < 0) delta = 0; // XP only grows; guard against resets
    st.xp += delta;
    st.lastTotal = totalXp;
    writeKey('cq-weekly-xp-v1', st);
    if (st.xp <= 0) return; // nothing earned this week yet
    await pushV2('user_weekly_xp', {
      user_id: uid,
      iso_week: wk,
      xp: st.xp,
    }, 'user_id,iso_week');
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
    await pushV2('user_path_progress', rowsV2, 'user_id,pack_id,node_id');
  }

  async function pushPathProgress(packId, nodeId, score) {
    var c = client(); var uid = userId();
    if (!c || !uid || !packId || !nodeId) return;
    var nowIso = new Date().toISOString();
    await pushV2('user_path_progress', {
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
    // user_achievements is keyed by (user_id, key, pack_id); we tag laurels
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
    await pushV2('user_achievements', rowsV2, 'user_id,key,pack_id');
  }

  async function pushLaurel(packId, score) {
    var c = client(); var uid = userId();
    if (!c || !uid || !packId) return;
    var nowIso = new Date().toISOString();
    await pushV2('user_achievements', {
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
    await pushV2('user_cosmetics', {
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
    // user_hearts columns are count / last_regen_at (not nullable). If there's
    // no prior "lost-at" yet we synthesise `now` so the not-null constraint
    // passes.
    await pushV2('user_hearts', {
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
    // user_daily uses `date` (not `day`) and carries pack_id + claimed_at.
    // The website doesn't track the daily challenge's pack here yet,
    // so we stamp '' for compatibility.
    await pushV2('user_daily', {
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
    var prof = await c.from('user_profile').select('xp,level,username').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (prof.data) {
      var localPayload = readKey('cq-stats-v1', {});
      // Unify XP as a high-water mark — the SAME max() merge the native app
      // uses (lib/sync/merge.ts), and what the server-side guard_monotonic_xp
      // trigger enforces. cloudXpFloor persists the account XP so the web's
      // per-session recompute (stats.js applySession) never drops below
      // progress earned on the app. level is NOT adopted from the cloud —
      // the web's 30-stage scale differs from the app's 10-tier scale, so we
      // derive our own level from the unified XP.
      var cloudXp = typeof prof.data.xp === 'number' ? prof.data.xp : 0;
      var unifiedXp = Math.max(localPayload.xp || 0, cloudXp);
      var lvlFor = (window.cqStats && window.cqStats.levelForXp);
      var merged = Object.assign({}, localPayload, {
        xp: unifiedXp,
        cloudXpFloor: unifiedXp,
        level: lvlFor ? lvlFor(unifiedXp) : (localPayload.level || 1),
      });
      if (prof.data.username) merged.username = prof.data.username;
      writeKey('cq-stats-v1', merged);
    }

    // 2) path_progress — many rows → rebuild { packId: { nodeId: {...} } }
    var pp = await c.from('user_path_progress').select('pack_id,node_id,completed_at,score').eq('user_id', uid);
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

    // 3) laurels — many rows → array. user_achievements holds any achievement
    //    kind; filter to key='laurel' so the legacy local cache shape stays
    //    pure-laurels and the rest of the website doesn't need to change.
    var lr = await c.from('user_achievements').select('pack_id,earned_at,score').eq('user_id', uid).eq('key', 'laurel');
    if (stale()) return;
    var laurels = (lr.data || []).map(function (r) {
      return {
        packId: r.pack_id,
        earnedAt: r.earned_at ? new Date(r.earned_at).getTime() : Date.now(),
        score: r.score,
      };
    });
    writeKey('cq-laurels-v1', laurels);

    // 4) cosmetics — single row. unlocked hats are PERMANENT, so union the
    //    cloud set with whatever this device already unlocked rather than
    //    overwriting — otherwise a hat earned on the native app (or on the web
    //    before this pull) would vanish when the other platform last wrote the
    //    row. Mirrors the app's union merge (lib/sync/merge.ts). The next
    //    pushCosmetics then writes the union back, healing the cloud row too.
    var cos = await c.from('user_cosmetics').select('unlocked,wearing').eq('user_id', uid).maybeSingle();
    if (stale()) return;
    if (cos.data) {
      var localCos = readKey('cq-cosmetics-v1', { unlocked: [], wearing: null });
      var cloudUnlocked = Array.isArray(cos.data.unlocked) ? cos.data.unlocked : [];
      var localUnlocked = Array.isArray(localCos.unlocked) ? localCos.unlocked : [];
      writeKey('cq-cosmetics-v1', {
        unlocked: Array.from(new Set(localUnlocked.concat(cloudUnlocked))),
        wearing: cos.data.wearing || localCos.wearing || null,
      });
    }

    // 5) hearts — single row. v2 columns are count / last_regen_at; project
    //    back to the legacy {hearts, lastLostAt} local shape.
    var h = await c.from('user_hearts').select('count,last_regen_at').eq('user_id', uid).maybeSingle();
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
    var d = await c.from('user_daily').select('date,progress,claimed').eq('user_id', uid).eq('date', today).maybeSingle();
    if (stale()) return;
    if (d.data) {
      writeKey('cq-daily-v1', {
        date: d.data.date,
        progress: d.data.progress,
        claimed: !!d.data.claimed,
      });
    }

    // 7) profile — read username so UI can show it. user_profile carries the
    //    canonical username (the legacy `profiles.username` is now redundant
    //    and will be retired with Task 8). Step (1) above already hydrated
    //    cq-stats-v1.username from the same row, but the standalone cache
    //    key `cq-profile-username` is read by auth-ui chips, so refresh it
    //    here too.
    var pr = await c.from('user_profile').select('username').eq('user_id', uid).maybeSingle();
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
    // Phase 1's backfill seeded `user_profile` for every registered user
    // with xp=0, so row-existence alone is not a "has played" signal.
    // We check `xp > 0` (any quiz earns XP) — that's only true once the
    // user has actually played and pushed. Falls back to "first sign-in"
    // (push local) for xp=0 / no-row, which is safe: pushing zeros is a
    // no-op against the backfilled cloud row, and pushing real local
    // progress replaces the backfilled zeros.
    //
    // Edge case left as TODO: a user with only-achievements-no-XP would
    // be classified as first sign-in and re-push local. Tolerable —
    // user_achievements has set-union semantics on the next merge cycle.
    var probe = await c.from('user_profile').select('xp').eq('user_id', uid).maybeSingle();
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
        pushWeeklyXp(),
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
      // pullAll unioned this device's unlocked cosmetics with the cloud's;
      // push the union back so the cloud row converges (heals a row the other
      // platform may have written with only its own unlocks).
      await pushCosmetics();
    }
    // Establish the weekly-XP baseline for this session so subsequent
    // cq:stats-changed deltas accumulate into the current week.
    await pushWeeklyXp();
  }

  /* ═══════ EVENT BUS BINDINGS ════════════════════════════════════════ */

  // Sign in / sign out
  window.addEventListener('cq:auth-changed', function (e) {
    var session = e && e.detail && e.detail.session;
    if (session) {
      // Defer one frame so any other listener (e.g., the UI chip swap) runs
      // first — improves perceived latency on the sign-in modal close.
      setTimeout(bootstrap, 0);
      // Drain any writes that failed while signed out / offline.
      setTimeout(flushBacklog, 0);
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
    pendingStatsPush = setTimeout(function () { pushStats(); pushWeeklyXp(); }, 1000);
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

  // Network came back — retry anything that failed while offline.
  window.addEventListener('online', function () { flushBacklog(); });

  /* ═══════ Public API ════════════════════════════════════════════════ */
  // Tiny surface — most consumers don't need this; sync runs automatically.
  // Exposed for advanced callers (e.g., a "sync now" button on a future
  // settings page).
  window.cqSync = {
    bootstrap: bootstrap,
    pushStats: pushStats,
    pushWeeklyXp: pushWeeklyXp,
    isoWeek: isoWeek,
    pullAll: pullAll,
    flushBacklog: flushBacklog,
    isReady: function () { return bootstrapped; },
  };

  dbg('[cq-sync] initialized');
})();
