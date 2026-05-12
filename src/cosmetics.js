/**
 * src/cosmetics.js — Phase 3B: avatar cosmetics
 *
 * Tracks the user's unlocked hat keys + the currently-worn one.
 * Hats unlock either by opening treasure chests (key matches the
 * chest's cosmeticKey) or by hitting a level milestone (level-5, 10…).
 *
 * Listens for `cq:cosmetic-unlock` events and `cq:level-up` to award
 * level-gated hats. Re-emits `cq:cosmetic-changed` so avatar.js and
 * path.js can refresh.
 *
 * Public API on window.cqCosmetics:
 *   - get()           → { unlocked: string[], wearing: string|null }
 *   - unlock(key)     → bool (true if newly unlocked)
 *   - wear(key)       → bool
 *   - currentHat()    → catalog entry of the worn hat, or null
 *   - catalog()       → array of all hats (with locked flag)
 *
 * Catalog is loaded lazily from /data/cosmetics.json.
 */
(function () {
  if (window.__cqCosmeticsInit) return;
  window.__cqCosmeticsInit = true;

  var KEY = 'cq-cosmetics-v1';
  var CATALOG_URL = '/data/cosmetics.json';
  var catalog = null;
  var catalogPromise = null;

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : [],
        wearing: raw.wearing || null
      };
    } catch (_) { return { unlocked: [], wearing: null }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
  }

  function ensureCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(CATALOG_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { hats: [] }; })
      .then(function (json) { catalog = json; return catalog; })
      .catch(function () { catalog = { hats: [] }; return catalog; });
    return catalogPromise;
  }

  function get() { return load(); }
  function currentHat() {
    var s = load();
    if (!catalog || !s.wearing) return null;
    return (catalog.hats || []).find(function (h) { return h.key === s.wearing; }) || null;
  }
  function unlock(key) {
    var s = load();
    if (s.unlocked.indexOf(key) !== -1) return false;
    s.unlocked.push(key);
    /* Auto-wear the first hat ever unlocked so the user notices */
    if (!s.wearing) s.wearing = key;
    save(s);
    window.dispatchEvent(new CustomEvent('cq:cosmetic-changed', { detail: { unlocked: s.unlocked, wearing: s.wearing } }));
    return true;
  }
  function wear(key) {
    var s = load();
    if (key && s.unlocked.indexOf(key) === -1) return false;
    s.wearing = key || null;
    save(s);
    window.dispatchEvent(new CustomEvent('cq:cosmetic-changed', { detail: { unlocked: s.unlocked, wearing: s.wearing } }));
    return true;
  }
  function catalogList() {
    return ensureCatalog().then(function () {
      var s = load();
      return (catalog.hats || []).map(function (h) {
        return Object.assign({}, h, { locked: s.unlocked.indexOf(h.key) === -1, wearing: s.wearing === h.key });
      });
    });
  }

  /* External unlock event */
  window.addEventListener('cq:cosmetic-unlock', function (e) {
    var key = e && e.detail && e.detail.key;
    if (key) unlock(key);
  });

  /* Level-gated unlocks: trigger when crossing level boundaries */
  window.addEventListener('cq:level-up', function (e) {
    var level = (e && e.detail && e.detail.newLevel) || 0;
    ensureCatalog().then(function () {
      (catalog.hats || []).forEach(function (h) {
        if (h.byLevel && level >= h.unlockAt) unlock(h.key);
      });
    });
  });

  /* Backfill: on first load, ensure existing level cleared milestones
     unlock retroactively (in case user was already at level 5 before
     cosmetics shipped). */
  document.addEventListener('DOMContentLoaded', function () {
    var stats = window.cqStats;
    if (!stats) return;
    var level = stats.get().level || 1;
    ensureCatalog().then(function () {
      (catalog.hats || []).forEach(function (h) {
        if (h.byLevel && level >= h.unlockAt) unlock(h.key);
      });
    });
  });

  window.cqCosmetics = {
    get: get,
    unlock: unlock,
    wear: wear,
    currentHat: currentHat,
    catalog: catalogList,
    ensureCatalog: ensureCatalog
  };
})();
