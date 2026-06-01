/* coach.js — Phase 7.5 IA Coach (rules-based v1)
 *
 * The squid 🦑 as a data-driven coach. Reads the player's stats, roadmap,
 * streak and hearts and returns a short, PRIORITISED list of concrete next
 * moves with deep-link CTAs. No LLM, no server — pure rules over data the
 * browser already has. A later round can swap computeAdvice's inputs for an
 * LLM behind a Cloudflare Pages Function without touching the surfaces.
 *
 * Exports:
 *   - browser: window.cqCoach.getAdvice(maxTips) gathers live context.
 *   - node (test): module.exports.computeAdvice(ctx, maxTips) — pure.
 */
(function () {
  var IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

  /* Pretty-print a pack id: "aws-saa-c03" → "AWS SAA C03". */
  function prettyPack(id) {
    return String(id || '').split('-').map(function (s) { return s.toUpperCase(); }).join(' ');
  }

  /* Pure rules engine. ctx:
   *   { stats, roadmap:{certs:[{id,done}]}, laurels:[packId...],
   *     hearts:{hearts}, todayKey, yesterdayKey }
   * Returns up to maxTips tips, each:
   *   { id, icon, title, text, cta:{label, href}, weight }
   */
  function computeAdvice(ctx, maxTips) {
    ctx = ctx || {};
    var stats = ctx.stats || {};
    var roadmap = ctx.roadmap || { certs: [] };
    var laurelSet = {};
    (ctx.laurels || []).forEach(function (p) {
      var id = (p && p.packId) ? p.packId : p;
      if (id) laurelSet[id] = 1;
    });
    var hearts = (ctx.hearts && typeof ctx.hearts.hearts === 'number') ? ctx.hearts.hearts : 5;
    var sessions = stats.sessionsCount | 0;
    var streak = stats.streakDays | 0;
    var studiedToday = stats.lastSessionDate && stats.lastSessionDate === ctx.todayKey;
    var tips = [];

    // 1) Cold start — no session yet. Dominates everything else.
    if (sessions === 0) {
      tips.push({
        id: 'cold-start', icon: '🚀', weight: 100,
        title: 'Start your first practice test',
        text: 'Pick any certification and answer a few questions — I\'ll start coaching you from your results.',
        cta: { label: 'Browse certifications', href: '/certifications/' }
      });
      return rank(tips, maxTips);
    }

    // 2) Streak at risk — earned a streak but haven\'t studied today yet.
    if (streak >= 1 && !studiedToday) {
      tips.push({
        id: 'streak-risk', icon: '🔥', weight: 92,
        title: 'Keep your ' + streak + '-day streak alive',
        text: 'One session today protects your streak. A 10-question drill is enough.',
        cta: { label: 'Train now', href: '/certifications/' }
      });
    }

    // 3) Weakest pack — lowest accuracy among packs with enough data.
    var weakest = null;
    var perPack = stats.perPack || {};
    Object.keys(perPack).forEach(function (id) {
      var p = perPack[id] || {};
      var qa = p.qa | 0;
      if (qa < 5) return;
      var acc = qa > 0 ? p.correct / qa : 1;
      if (acc >= 0.7) return;
      if (!weakest || acc < weakest.acc) weakest = { id: id, acc: acc };
    });
    if (weakest) {
      tips.push({
        id: 'weak-pack', icon: '🎯', weight: 74,
        title: 'Sharpen your weakest area: ' + prettyPack(weakest.id),
        text: 'You\'re at ' + Math.round(weakest.acc * 100) + '% accuracy here. A focused drill moves it fast.',
        cta: { label: 'Drill ' + prettyPack(weakest.id), href: '/train.html?pack=' + encodeURIComponent(weakest.id) }
      });
    }

    // 4) Next roadmap step — first cert not yet done.
    var nextCert = (roadmap.certs || []).filter(function (c) { return c && c.id && !c.done; })[0];
    if (nextCert) {
      tips.push({
        id: 'roadmap-next', icon: '🗺️', weight: 64,
        title: 'Next on your roadmap: ' + prettyPack(nextCert.id),
        text: 'Work its learning path to keep your plan moving.',
        cta: { label: 'Open path', href: '/path.html?pack=' + encodeURIComponent(nextCert.id) }
      });
    } else if (!(roadmap.certs || []).length) {
      // 5) No roadmap yet — nudge to build one.
      tips.push({
        id: 'no-roadmap', icon: '🧭', weight: 52,
        title: 'Set your target role',
        text: 'Build a roadmap and I\'ll line up the right certs in order for your goal.',
        cta: { label: 'Build my roadmap', href: '/roadmap/' }
      });
    }

    // 6) Hearts full — good moment for a boss.
    if (hearts >= 5) {
      tips.push({
        id: 'hearts-full', icon: '❤️', weight: 32,
        title: 'Full hearts — go for a boss fight',
        text: 'Your lives are topped up. A sub-boss or final boss is the fastest XP right now.',
        cta: { label: 'Open a path', href: '/path.html' }
      });
    }

    // 7) Momentum fallback — always something to do.
    tips.push({
      id: 'momentum', icon: '⚡', weight: 10,
      title: 'Keep your edge',
      text: 'Level ' + (stats.level || 1) + ' · ' + (stats.xp | 0) + ' XP. A quick drill keeps your recall sharp.',
      cta: { label: 'Quick practice', href: '/certifications/' }
    });

    return rank(tips, maxTips);
  }

  function rank(tips, maxTips) {
    tips.sort(function (a, b) { return b.weight - a.weight; });
    return tips.slice(0, maxTips || 3);
  }

  if (!IS_BROWSER) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { computeAdvice: computeAdvice, prettyPack: prettyPack };
    }
    return;
  }

  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function gatherContext() {
    var stats = (window.cqStats && window.cqStats.get) ? window.cqStats.get() : {};
    var roadmap = (window.cqRoadmap && window.cqRoadmap.get) ? window.cqRoadmap.get() : { certs: [] };
    var laurels = [];
    try { laurels = JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]') || []; } catch (_) {}
    var hearts = { hearts: 5 };
    try { hearts = JSON.parse(localStorage.getItem('cq-hearts-v1') || 'null') || hearts; } catch (_) {}
    return {
      stats: stats, roadmap: roadmap, laurels: laurels, hearts: hearts,
      todayKey: dateKey(new Date()),
      yesterdayKey: dateKey(new Date(Date.now() - 86400000))
    };
  }

  window.cqCoach = {
    getAdvice: function (maxTips) { return computeAdvice(gatherContext(), maxTips); }
  };
})();
