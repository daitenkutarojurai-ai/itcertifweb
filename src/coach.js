/* coach.js — Phase 7.5 IA Coach (rules-based v1) + 8.6 mentor personas
 *
 * The squid 🦑 as a data-driven coach. Reads the player's stats, roadmap,
 * streak and hearts and returns a short, PRIORITISED list of concrete next
 * moves with deep-link CTAs. No LLM, no server — pure rules over data the
 * browser already has. A later round can swap computeAdvice's inputs for an
 * LLM behind a Cloudflare Pages Function without touching the surfaces.
 *
 * Phase 8.6 — mentor personas: the SAME tips re-voiced in a chosen tone
 * (chill coach / senior engineer / FAANG interviewer / drill sergeant).
 * Persona is a pure copy layer over the computed tips, so it works with no
 * LLM; later it becomes a system-prompt preset for the model coach.
 *
 * Exports:
 *   - browser: window.cqCoach.getAdvice(maxTips) gathers live context +
 *     active persona; window.cqCoachPersona (get/set/list).
 *   - node (test): module.exports.computeAdvice(ctx, maxTips, personaId),
 *     applyPersona, PERSONAS — pure.
 */
(function () {
  var IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
  var PERSONA_KEY = 'cq-coach-persona-v1';

  /* Pretty-print a pack id: "aws-saa-c03" → "AWS SAA C03". */
  function prettyPack(id) {
    return String(id || '').split('-').map(function (s) { return s.toUpperCase(); }).join(' ');
  }

  /* ── Mentor personas (8.6) ───────────────────────────────────────────
   * Each persona supplies an intro line + per-tip {title,text} rewrites
   * keyed by tip.id, interpolating the tip's `vars`. Missing overrides
   * fall back to the default (chill) copy, so adding tips never breaks. */
  var PERSONAS = [
    { id: 'chill',    name: 'Chill Coach',       emoji: '🦑', accent: '#34d399', intro: "One step at a time — I've got your back. Here's where I'd go next." },
    { id: 'senior',   name: 'Senior Engineer',   emoji: '🛠️', accent: '#60a5fa', intro: "I've shipped this stuff for years. Straight talk, no fluff." },
    { id: 'faang',    name: 'FAANG Interviewer', emoji: '🎯', accent: '#a78bfa', intro: "I set a high bar. Here's exactly what would move you past it." },
    { id: 'sergeant', name: 'Drill Sergeant',    emoji: '🎖️', accent: '#f87171', intro: "Discipline beats motivation. No excuses. Move." }
  ];
  var PERSONA_IDS = PERSONAS.map(function (p) { return p.id; });

  // v(vars) → {title, text}. Only the 3 non-default personas; chill = base copy.
  var VOICE = {
    senior: {
      'cold-start':  function () { return { title: 'Stop reading. Run one test.', text: 'You learn nothing from theory alone — pick a cert, answer a few questions, and I\'ll coach from real data.' }; },
      'streak-risk': function (v) { return { title: 'Don\'t drop your ' + v.streak + '-day streak', text: 'Consistency is the whole game. Ten questions today, done. No debate.' }; },
      'weak-pack':   function (v) { return { title: 'Your weak spot is ' + v.pack, text: v.acc + '% accuracy means you\'d fail this on exam day. Drill it until it stops hurting.' }; },
      'roadmap-next':function (v) { return { title: 'Ship the next cert: ' + v.pack, text: 'A plan you don\'t execute is a wishlist. Work the path, move it forward.' }; },
      'no-roadmap':  function () { return { title: 'Pick a target and commit', text: 'Wandering pack to pack wastes months. Set a role; I\'ll sequence the certs that matter.' }; },
      'hearts-full': function () { return { title: 'Full hearts — take a boss', text: 'Stop grinding easy drills. A boss fight is where the real signal (and XP) is.' }; },
      'momentum':    function (v) { return { title: 'Level ' + v.level + '. Keep the reps.', text: v.xp + ' XP banked. Recall decays — one sharp drill keeps it loaded.' }; }
    },
    faang: {
      'cold-start':  function () { return { title: 'Establish a baseline', text: 'I can\'t calibrate you with zero signal. Complete one practice test so we know where you stand.' }; },
      'streak-risk': function (v) { return { title: 'Protect your ' + v.streak + '-day cadence', text: 'Top candidates practice daily without being told. Log a session today.' }; },
      'weak-pack':   function (v) { return { title: v.pack + ' is below the bar', text: v.acc + '% won\'t clear a real interview screen. Bring it to 80%+ before we talk readiness.' }; },
      'roadmap-next':function (v) { return { title: 'Advance to ' + v.pack, text: 'Your roadmap is your story. Demonstrate progress — work the next path now.' }; },
      'no-roadmap':  function () { return { title: 'Define the role you\'re interviewing for', text: 'Strong candidates target a level. Build a roadmap and I\'ll hold you to its bar.' }; },
      'hearts-full': function () { return { title: 'Full hearts — attempt a boss', text: 'Under-pressure performance is what we evaluate. A final boss is the closest signal you have.' }; },
      'momentum':    function (v) { return { title: 'Level ' + v.level + ' — stay sharp', text: v.xp + ' XP. Consistency is a hiring signal. One drill keeps your edge.' }; }
    },
    sergeant: {
      'cold-start':  function () { return { title: 'MOVE. FIRST TEST. NOW.', text: 'No more standing around. Pick a cert and answer questions. That\'s an order.' }; },
      'streak-risk': function (v) { return { title: v.streak + '-DAY STREAK ON THE LINE', text: 'You do NOT break the chain on my watch. Ten questions. Go.' }; },
      'weak-pack':   function (v) { return { title: 'WEAK POINT: ' + v.pack, text: v.acc + '%?! Unacceptable. You drill this until it\'s spotless. Drop and give me a set.' }; },
      'roadmap-next':function (v) { return { title: 'NEXT OBJECTIVE: ' + v.pack, text: 'The mission doesn\'t complete itself. Take the path. Advance.' }; },
      'no-roadmap':  function () { return { title: 'PICK A TARGET, RECRUIT', text: 'No objective, no progress. Set your role and fall in. I\'ll give the marching order.' }; },
      'hearts-full': function () { return { title: 'FULL HEALTH — ENGAGE A BOSS', text: 'No excuses left. Lives are topped up. Charge the boss.' }; },
      'momentum':    function (v) { return { title: 'LEVEL ' + v.level + '. HOLD THE LINE.', text: v.xp + ' XP. Slack off and it slips. One drill. Keep that edge razor.' }; }
    }
  };

  function personaById(id) {
    for (var i = 0; i < PERSONAS.length; i++) if (PERSONAS[i].id === id) return PERSONAS[i];
    return PERSONAS[0];
  }

  /* Pure: re-voice computed tips for a persona. Returns NEW tip objects. */
  function applyPersona(tips, personaId) {
    var table = VOICE[personaId];
    if (!table) return tips.map(function (t) { return t; }); // chill / unknown → base copy
    return tips.map(function (t) {
      var fn = table[t.id];
      if (!fn) return t;
      var over = fn(t.vars || {});
      var out = {};
      for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out[k] = t[k];
      if (over.title) out.title = over.title;
      if (over.text) out.text = over.text;
      return out;
    });
  }

  /* Pure rules engine. ctx:
   *   { stats, roadmap:{certs:[{id,done}]}, laurels:[packId...],
   *     hearts:{hearts}, todayKey, yesterdayKey }
   * Returns up to maxTips tips, each:
   *   { id, icon, title, text, cta:{label, href}, weight }
   */
  function computeAdvice(ctx, maxTips, personaId) {
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
        id: 'cold-start', icon: '🚀', weight: 100, vars: {},
        title: 'Start your first practice test',
        text: 'Pick any certification and answer a few questions — I\'ll start coaching you from your results.',
        cta: { label: 'Browse certifications', href: '/certifications/' }
      });
      return rank(tips, maxTips, personaId);
    }

    // 2) Streak at risk — earned a streak but haven\'t studied today yet.
    if (streak >= 1 && !studiedToday) {
      tips.push({
        id: 'streak-risk', icon: '🔥', weight: 92, vars: { streak: streak },
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
        id: 'weak-pack', icon: '🎯', weight: 74, vars: { pack: prettyPack(weakest.id), acc: Math.round(weakest.acc * 100) },
        title: 'Sharpen your weakest area: ' + prettyPack(weakest.id),
        text: 'You\'re at ' + Math.round(weakest.acc * 100) + '% accuracy here. A focused drill moves it fast.',
        cta: { label: 'Drill ' + prettyPack(weakest.id), href: '/train.html?pack=' + encodeURIComponent(weakest.id) }
      });
    }

    // 4) Next roadmap step — first cert not yet done.
    var nextCert = (roadmap.certs || []).filter(function (c) { return c && c.id && !c.done; })[0];
    if (nextCert) {
      tips.push({
        id: 'roadmap-next', icon: '🗺️', weight: 64, vars: { pack: prettyPack(nextCert.id) },
        title: 'Next on your roadmap: ' + prettyPack(nextCert.id),
        text: 'Work its learning path to keep your plan moving.',
        cta: { label: 'Open path', href: '/path.html?pack=' + encodeURIComponent(nextCert.id) }
      });
    } else if (!(roadmap.certs || []).length) {
      // 5) No roadmap yet — nudge to build one.
      tips.push({
        id: 'no-roadmap', icon: '🧭', weight: 52, vars: {},
        title: 'Set your target role',
        text: 'Build a roadmap and I\'ll line up the right certs in order for your goal.',
        cta: { label: 'Build my roadmap', href: '/roadmap/' }
      });
    }

    // 6) Hearts full — good moment for a boss.
    if (hearts >= 5) {
      tips.push({
        id: 'hearts-full', icon: '❤️', weight: 32, vars: {},
        title: 'Full hearts — go for a boss fight',
        text: 'Your lives are topped up. A sub-boss or final boss is the fastest XP right now.',
        cta: { label: 'Open a path', href: '/path.html' }
      });
    }

    // 7) Momentum fallback — always something to do.
    tips.push({
      id: 'momentum', icon: '⚡', weight: 10, vars: { level: stats.level || 1, xp: stats.xp | 0 },
      title: 'Keep your edge',
      text: 'Level ' + (stats.level || 1) + ' · ' + (stats.xp | 0) + ' XP. A quick drill keeps your recall sharp.',
      cta: { label: 'Quick practice', href: '/certifications/' }
    });

    return rank(tips, maxTips, personaId);
  }

  function rank(tips, maxTips, personaId) {
    tips.sort(function (a, b) { return b.weight - a.weight; });
    return applyPersona(tips.slice(0, maxTips || 3), personaId);
  }

  if (!IS_BROWSER) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { computeAdvice: computeAdvice, prettyPack: prettyPack, applyPersona: applyPersona, PERSONAS: PERSONAS };
    }
    return;
  }

  /* ── Persona store (browser) ─────────────────────────────────────── */
  function loadPersona() {
    try {
      var id = (JSON.parse(localStorage.getItem(PERSONA_KEY) || 'null') || {}).id;
      return PERSONA_IDS.indexOf(id) >= 0 ? id : 'chill';
    } catch (_) { return 'chill'; }
  }
  function setPersona(id) {
    if (PERSONA_IDS.indexOf(id) < 0) return loadPersona();
    try { localStorage.setItem(PERSONA_KEY, JSON.stringify({ id: id })); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('cq:coach-persona-changed', { detail: { id: id } })); } catch (_) {}
    return id;
  }
  window.cqCoachPersona = {
    list: function () { return PERSONAS.slice(); },
    get: loadPersona,
    set: setPersona,
    current: function () { return personaById(loadPersona()); }
  };

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
    getAdvice: function (maxTips) { return computeAdvice(gatherContext(), maxTips, loadPersona()); }
  };
})();
