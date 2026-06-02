/**
 * src/rpgclass.js — Phase 8.2: Career RPG class system
 *
 * A light identity/theming layer over the EXISTING gamification (level / XP
 * / path). You pick a class; its TITLE levels up with your CertQuests level
 * (5 RPG tiers). The class complements — not duplicates — the roadmap: when
 * a roadmap domain exists, the class auto-suggests to match it. Pure store +
 * title math; surfaced on /profile.html. No new cloud state (local-first,
 * like the other cq-* keys).
 *
 * Dual export: window.cqClass (browser) + module.exports (Node tests).
 */
(function (root) {
  'use strict';

  // tier 0..4 thresholds by level: Novice / core / advanced / master / legend.
  var TIER_MIN = [0, 5, 15, 30, 50];

  var CLASSES = [
    { id: 'cloud',    name: 'Cloud Engineer',    emoji: '☁️', accent: '#60a5fa', domain: 'cloud',
      blurb: 'Summon infrastructure from thin air and keep it standing under load.',
      certs: ['aws-saa-c03', 'az-104', 'gcp-ace'],
      titles: ['Cloud Initiate', 'Cloud Engineer', 'Cloud Architect', 'Cloud Overlord', 'Cloud Sage'] },
    { id: 'devops',   name: 'DevOps Alchemist',  emoji: '🔧', accent: '#34d399', domain: 'devops',
      blurb: 'Turn manual toil into gold — pipelines, IaC and self-healing systems.',
      certs: ['terraform-003', 'cka', 'github-actions'],
      titles: ['Pipeline Apprentice', 'DevOps Engineer', 'Automation Alchemist', 'Platform Master', 'DevOps Ascendant'] },
    { id: 'security', name: 'Security Sentinel',  emoji: '🛡️', accent: '#f87171', domain: 'security',
      blurb: 'Stand watch at the gate; hunt threats before they land a blow.',
      certs: ['comptia-security-plus', 'cissp', 'az-500'],
      titles: ['Blue-Team Recruit', 'Security Analyst', 'Security Sentinel', 'Threat Slayer', 'Cyber Guardian'] },
    { id: 'network',  name: 'Network Ranger',     emoji: '🌐', accent: '#a78bfa', domain: 'network',
      blurb: 'Route packets through any terrain and keep every link alive.',
      certs: ['ccna', 'ccnp-encor'],
      titles: ['Packet Scout', 'Network Engineer', 'Network Ranger', 'Routing Warden', 'Network Sage'] },
    { id: 'linux',    name: 'Linux Monk',         emoji: '🐧', accent: '#fbbf24', domain: 'linux',
      blurb: 'Master the shell; bend systemd, storage and the kernel to your will.',
      certs: ['rhcsa', 'comptia-linux'],
      titles: ['Shell Novice', 'Linux Admin', 'Linux Monk', 'Kernel Master', 'Terminal Sage'] },
    { id: 'data',     name: 'Data Sage',          emoji: '📊', accent: '#22d3ee', domain: 'data',
      blurb: 'Channel raw data into pipelines, warehouses and clean insight.',
      certs: ['dp-203', 'dp-900', 'aws-dea-c01'],
      titles: ['Query Apprentice', 'Data Engineer', 'Pipeline Weaver', 'Data Architect', 'Data Sage'] }
  ];

  function classById(id) {
    for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].id === id) return CLASSES[i];
    return null;
  }
  function classByDomain(domain) {
    for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].domain === domain) return CLASSES[i];
    return null;
  }

  function tierIndex(level) {
    var lv = level > 0 ? level : 1;
    var t = 0;
    for (var i = 0; i < TIER_MIN.length; i++) if (lv >= TIER_MIN[i]) t = i;
    return t;
  }
  function titleFor(cls, level) {
    if (!cls) return '';
    return cls.titles[tierIndex(level)];
  }
  // Levels needed for the NEXT tier (null at max tier) — drives a "next rank" hint.
  function nextTierAt(level) {
    var t = tierIndex(level);
    return t + 1 < TIER_MIN.length ? TIER_MIN[t + 1] : null;
  }

  var api = {
    CLASSES: CLASSES,
    classById: classById,
    classByDomain: classByDomain,
    tierIndex: tierIndex,
    titleFor: titleFor,
    nextTierAt: nextTierAt
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root) return;

  /* ── Browser store ───────────────────────────────────────────────── */
  var KEY = 'cq-class-v1';
  function load() {
    try {
      var id = (JSON.parse(localStorage.getItem(KEY) || 'null') || {}).id;
      return classById(id) ? id : null;
    } catch (_) { return null; }
  }
  function set(id) {
    if (!classById(id)) return load();
    try { localStorage.setItem(KEY, JSON.stringify({ id: id })); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('cq:class-changed', { detail: { id: id } })); } catch (_) {}
    return id;
  }
  function roadmapDomain() {
    try { return (JSON.parse(localStorage.getItem('cq-roadmap-v1') || 'null') || {}).domain || null; } catch (_) { return null; }
  }
  // Active class: explicit pick → roadmap-domain suggestion → null.
  function current() {
    var id = load();
    if (id) return classById(id);
    var d = roadmapDomain();
    return d ? classByDomain(d) : null;
  }

  root.cqClass = {
    CLASSES: CLASSES,
    list: function () { return CLASSES.slice(); },
    classById: classById,
    get: load,
    set: set,
    current: current,
    titleFor: titleFor,
    tierIndex: tierIndex,
    nextTierAt: nextTierAt,
    suggestedFromRoadmap: function () { var d = roadmapDomain(); return d ? classByDomain(d) : null; }
  };
})(typeof window !== 'undefined' ? window : null);
