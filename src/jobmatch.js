/**
 * src/jobmatch.js — Phase 7.7: Job Match scoring
 *
 * Pure, rules-based fit scoring of a curated IT role catalog
 * (data/jobs/roles.json) against the certs the browser already knows
 * about: cq-laurels-v1 (validated) and cq-path-progress-v1 / cq-stats-v1
 * perPack (started). No LLM, no server — same honest-with-local-data
 * approach as src/coach.js. Skills are informational, not scored, because
 * stats only track per-pack accuracy, not per-skill.
 *
 * Dual export: window.cqJobMatch (browser) + module.exports (Node tests),
 * mirroring src/path-progress.js / src/coach.js.
 *
 *   scoreRole(role, ctx)   → annotated fit for one role
 *   rankRoles(roles, ctx)  → roles sorted best-fit-first (roadmap-aware)
 *   buildContext()         → reads localStorage into a ctx (browser only)
 */
(function (root) {
  'use strict';

  var DEMAND_RANK = { 'très élevée': 3, 'élevée': 2, 'moyenne': 1 };

  function has(set, id) {
    return !!(set && (typeof set.has === 'function' ? set.has(id) : set[id]));
  }

  /* One role → fit object. ctx = { validated, started, roadmapDomain }
     where validated/started are Sets (or plain {id:1} maps) of pack ids. */
  function scoreRole(role, ctx) {
    ctx = ctx || {};
    var certs = (role && Array.isArray(role.certs)) ? role.certs : [];
    var totalWeight = 0, earnedWeight = 0;
    var validated = 0, started = 0, missing = 0;
    var annotated = certs.map(function (c) {
      var w = c.weight > 0 ? c.weight : 1;
      totalWeight += w;
      var status;
      if (has(ctx.validated, c.id)) { status = 'validé'; validated++; earnedWeight += w; }
      else if (has(ctx.started, c.id)) { status = 'en cours'; started++; earnedWeight += w * 0.5; }
      else { status = 'manquant'; missing++; }
      return { id: c.id, label: c.label, weight: w, status: status };
    });
    var fit = totalWeight > 0 ? earnedWeight / totalWeight : 0;
    return {
      role: role,
      fit: fit,
      pct: Math.round(fit * 100),
      total: certs.length,
      validated: validated,
      started: started,
      missing: missing,
      certs: annotated,
      domainMatch: !!(ctx.roadmapDomain && role && role.domain === ctx.roadmapDomain)
    };
  }

  function rankRoles(roles, ctx) {
    ctx = ctx || {};
    var scored = (Array.isArray(roles) ? roles : []).map(function (r) { return scoreRole(r, ctx); });
    scored.sort(function (a, b) {
      if (b.fit !== a.fit) return b.fit - a.fit;
      if (a.domainMatch !== b.domainMatch) return a.domainMatch ? -1 : 1;
      var da = DEMAND_RANK[a.role && a.role.demand] || 0;
      var db = DEMAND_RANK[b.role && b.role.demand] || 0;
      if (db !== da) return db - da;
      return String(a.role && a.role.title).localeCompare(String(b.role && b.role.title));
    });
    return scored;
  }

  /* Browser-only: read the cq-* keys into a ctx. A cert is "validé" when a
     laurel exists for it, "en cours" when a path node is completed or the
     pack has answered questions. */
  function buildContext() {
    var validated = {}, started = {};
    try {
      (JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]') || []).forEach(function (l) {
        if (l && l.packId) validated[l.packId] = 1;
      });
    } catch (_) {}
    try {
      var pp = JSON.parse(localStorage.getItem('cq-path-progress-v1') || '{}') || {};
      Object.keys(pp).forEach(function (pid) {
        var nodes = pp[pid] || {};
        if (Object.keys(nodes).some(function (n) { return nodes[n] && nodes[n].completed; })) started[pid] = 1;
      });
    } catch (_) {}
    try {
      var perPack = (JSON.parse(localStorage.getItem('cq-stats-v1') || '{}') || {}).perPack || {};
      Object.keys(perPack).forEach(function (pid) {
        var p = perPack[pid];
        if (p && (p.answered > 0 || p.questionsAnswered > 0)) started[pid] = 1;
      });
    } catch (_) {}
    var roadmapDomain = null;
    try { roadmapDomain = (JSON.parse(localStorage.getItem('cq-roadmap-v1') || 'null') || {}).domain || null; } catch (_) {}
    return { validated: validated, started: started, roadmapDomain: roadmapDomain };
  }

  var api = { scoreRole: scoreRole, rankRoles: rankRoles, buildContext: buildContext };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.cqJobMatch = api;
})(typeof window !== 'undefined' ? window : null);
