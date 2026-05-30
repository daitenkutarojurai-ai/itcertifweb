/**
 * src/roadmap.js — Phase 7.1: Personal Roadmap store
 *
 * One owned, persistent plan per user: a target role + an ORDERED cert
 * sequence. localStorage-first (cq-roadmap-v1); the cert sequence is
 * seeded from data/career-paths/<id>.json by the /roadmap/ page, this
 * module only persists the chosen role + edited cert list. Progress is
 * NOT stored here — it's rolled up at render time from cq-stats-v1 /
 * cq-path-progress-v1 / cq-laurels-v1.
 *
 * Exposes window.cqRoadmap. Mutators dispatch cq:roadmap-changed so
 * profile.js re-renders and a future src/sync.js can mirror to Supabase
 * (same shape as the other cq-* keys — see CLAUDE.md sync section).
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__cqRoadmapInit) return;
  window.__cqRoadmapInit = true;

  var KEY = 'cq-roadmap-v1';
  var SCHEMA_VERSION = 1;
  var ID_RE = /^[a-z0-9-]{1,64}$/;
  var MAX_CERTS = 12;

  function defaults() {
    return { _v: SCHEMA_VERSION, role: null, domain: null, situation: null, createdAt: null, updatedAt: null, certs: [] };
  }

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return defaults();
    raw._v = SCHEMA_VERSION;
    return raw;
  }

  /* Coerce parsed JSON into a valid shape — drops anything that fails the
     id whitelist (defense against replayed/poisoned localStorage). */
  function sanitize(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    if (typeof raw.role === 'string' && ID_RE.test(raw.role)) d.role = raw.role;
    if (raw.domain === 'cloud' || raw.domain === 'network' || raw.domain === 'linux' || raw.domain === 'security' || raw.domain === 'devops') d.domain = raw.domain;
    if (raw.situation === 'reconversion' || raw.situation === 'debutant' || raw.situation === 'en-poste') d.situation = raw.situation;
    if (typeof raw.createdAt === 'string') d.createdAt = raw.createdAt;
    if (typeof raw.updatedAt === 'string') d.updatedAt = raw.updatedAt;
    if (Array.isArray(raw.certs)) {
      var seen = {};
      raw.certs.forEach(function (c) {
        if (!c || typeof c !== 'object') return;
        if (typeof c.id !== 'string' || !ID_RE.test(c.id) || seen[c.id]) return;
        seen[c.id] = 1;
        d.certs.push({
          id: c.id,
          addedFrom: typeof c.addedFrom === 'string' ? c.addedFrom : 'manual',
          addedAt: typeof c.addedAt === 'string' ? c.addedAt : null,
          done: c.done === true
        });
      });
      d.certs = d.certs.slice(0, MAX_CERTS);
    }
    return d;
  }

  function load() {
    try { return sanitize(migrate(JSON.parse(localStorage.getItem(KEY) || 'null'))); }
    catch (_) { return defaults(); }
  }

  function save(s) {
    s.updatedAt = nowIso();
    if (!s.createdAt) s.createdAt = s.updatedAt;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
    emit(s);
    return s;
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return null; }
  }

  function emit(s) {
    try {
      window.dispatchEvent(new CustomEvent('cq:roadmap-changed', {
        detail: { role: s.role, domain: s.domain, situation: s.situation, certIds: s.certs.map(function (c) { return c.id; }) }
      }));
    } catch (_) {}
  }

  /* ── Mutators ─────────────────────────────────────────────────── */
  function setRole(roleId, domain, situation) {
    var s = load();
    s.role = (typeof roleId === 'string' && ID_RE.test(roleId)) ? roleId : null;
    s.domain = domain || s.domain;
    s.situation = situation || s.situation;
    return save(s);
  }

  /* Replace the whole cert list (ordered) — used by the role auto-suggest. */
  function setCerts(ids, addedFrom) {
    var s = load();
    var seen = {};
    s.certs = (Array.isArray(ids) ? ids : [])
      .filter(function (id) { return typeof id === 'string' && ID_RE.test(id) && !seen[id] && (seen[id] = 1); })
      .slice(0, MAX_CERTS)
      .map(function (id) { return { id: id, addedFrom: addedFrom || 'career-path', addedAt: nowIso(), done: false }; });
    return save(s);
  }

  function addCert(id, addedFrom) {
    if (typeof id !== 'string' || !ID_RE.test(id)) return load();
    var s = load();
    if (s.certs.some(function (c) { return c.id === id; })) return s;
    if (s.certs.length >= MAX_CERTS) return s;
    s.certs.push({ id: id, addedFrom: addedFrom || 'manual', addedAt: nowIso(), done: false });
    return save(s);
  }

  function removeCert(id) {
    var s = load();
    s.certs = s.certs.filter(function (c) { return c.id !== id; });
    return save(s);
  }

  function moveCert(id, dir) {
    var s = load();
    var i = s.certs.findIndex(function (c) { return c.id === id; });
    var j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= s.certs.length) return s;
    var tmp = s.certs[i]; s.certs[i] = s.certs[j]; s.certs[j] = tmp;
    return save(s);
  }

  function toggleDone(id) {
    var s = load();
    var c = s.certs.find(function (x) { return x.id === id; });
    if (c) c.done = !c.done;
    return save(s);
  }

  function clear() {
    var s = defaults();
    try { localStorage.removeItem(KEY); } catch (_) {}
    emit(s);
    return s;
  }

  window.cqRoadmap = {
    get: load,
    setRole: setRole,
    setCerts: setCerts,
    addCert: addCert,
    removeCert: removeCert,
    moveCert: moveCert,
    toggleDone: toggleDone,
    clear: clear,
    MAX_CERTS: MAX_CERTS
  };
})();
