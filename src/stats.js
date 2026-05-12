/**
 * src/stats.js — Phase 2 ticket #1: practice-stats reducer
 *
 * Listens for `cq:session-complete` events fired by the quiz/results
 * screens, updates localStorage, computes XP + level, and emits
 * `cq:stats-changed` (always) + `cq:level-up` (when crossing a level).
 *
 * Public API on `window.cqStats`:
 *   - get()  → current stats object
 *   - reset() → wipe to defaults
 *   - stageEmojiForLevel(level) → emoji for level 1-30
 *   - xpProgressForLevel(xp, level) → 0..1 ratio inside current level band
 *   - thresholdForLevel(n) → absolute XP needed to reach level n
 *
 * Schema (cq-stats-v1):
 *   { totalSeconds, questionsAnswered, correctAnswered, sessionsCount,
 *     streakDays, lastSessionDate, perPack:{[id]:{seconds,qa,correct}},
 *     xp, level }
 *
 * Idempotent. Plain IIFE — no ES-module import needed.
 */
(function () {
  /* This file runs in two contexts:
       1) browser <script> — registers window.cqStats, listens for events
       2) Node tests — pure helpers reachable via module.exports
     The IIFE always evaluates; browser-only side effects are guarded. */
  var IS_BROWSER = typeof window !== 'undefined';
  if (IS_BROWSER) {
    if (window.__cqStatsInit) return;
    window.__cqStatsInit = true;
  }

  var STORE_KEY = 'cq-stats-v1';
  var MAX_LEVEL = 30;
  var LEVEL_BASE = 50;
  var LEVEL_RATIO = 1.18;

  var DEFAULTS = {
    totalSeconds: 0,
    questionsAnswered: 0,
    correctAnswered: 0,
    sessionsCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    sessionDates: [],     /* last ~60 dates with at least one session (for heatmap) */
    perPack: {},
    bonusXp: 0,
    xp: 0,
    level: 1
  };

  /* Per-level emojis. Index = level - 1. */
  var STAGE_EMOJI = [
    /* 1-6 hatchling */     '🥚','🐣','🐤','🐥','📘','✏️',
    /* 7-12 apprentice */   '🐦','📒','🤓','🦜','🧣','🎓',
    /* 13-18 trainee */     '🦅','🎒','💻','☁️','🥉','🖥️',
    /* 19-24 adept */       '🦉','🧑‍🎓','📚','🏆','⚡','✨',
    /* 25-30 master */      '👑','🌟','🖋️','📖','🚩','🌌'
  ];

  /* Stage NAME for level-up messages */
  var STAGE_NAME = [
    'Untouched Egg','Cracked Egg','Newly Hatched','Standing Chick',
    'Chick Scholar','Chick with Pencil',
    'Fledgling','Note-taker','Bookworm','Plumed Apprentice',
    'Scarved Scholar','Diploma Chick',
    'Young Hawk','Field Hawk','Coder Hawk','Cloud Hawk',
    'Medalist Hawk','Server-rack Hawk',
    'Sage Owl','Scholar Owl','Library Owl','Trophy Owl',
    'Lightning Owl','Constellation Owl',
    'Crowned Phoenix','Star Phoenix','Quill Phoenix','Tome Phoenix',
    'Banner Phoenix','Aurora Phoenix'
  ];

  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function todayKey() { return dateKey(new Date()); }
  function yesterdayKey() { return dateKey(new Date(Date.now() - 86400000)); }

  function load() {
    if (!IS_BROWSER) return Object.assign({}, DEFAULTS);
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      var s = Object.assign({}, DEFAULTS, raw);
      s.perPack = Object.assign({}, raw.perPack || {});
      return s;
    } catch (_) { return Object.assign({}, DEFAULTS); }
  }
  function save(s) {
    if (!IS_BROWSER) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) {}
  }

  /* XP = minutes × accuracy + streak·8 + sessions·2.
     Accuracy clamped [0.5, 1.2] so newcomers aren't punished and
     above-100% (impossible) is bounded. */
  function computeXp(s) {
    var minutes = s.totalSeconds / 60;
    var acc = s.questionsAnswered > 0 ? s.correctAnswered / s.questionsAnswered : 0.7;
    var accFactor = Math.max(0.5, Math.min(1.2, acc));
    return Math.round(minutes * accFactor + s.streakDays * 8 + s.sessionsCount * 2 + (s.bonusXp || 0));
  }

  /* XP threshold to *reach* level N. L1 starts at 0. */
  function thresholdForLevel(n) {
    if (n <= 1) return 0;
    if (n > MAX_LEVEL) n = MAX_LEVEL;
    return Math.round(LEVEL_BASE * Math.pow(LEVEL_RATIO, n - 2));
  }
  function levelForXp(xp) {
    for (var n = MAX_LEVEL; n >= 1; n--) {
      if (xp >= thresholdForLevel(n)) return n;
    }
    return 1;
  }
  /* 0..1 progress inside current level band */
  function xpProgressForLevel(xp, level) {
    if (level >= MAX_LEVEL) return 1;
    var cur = thresholdForLevel(level);
    var nxt = thresholdForLevel(level + 1);
    if (nxt <= cur) return 1;
    return Math.max(0, Math.min(1, (xp - cur) / (nxt - cur)));
  }

  function stageEmojiForLevel(level) {
    var i = Math.max(0, Math.min(STAGE_EMOJI.length - 1, level - 1));
    return STAGE_EMOJI[i];
  }
  function stageNameForLevel(level) {
    var i = Math.max(0, Math.min(STAGE_NAME.length - 1, level - 1));
    return STAGE_NAME[i];
  }

  function applySession(s, detail) {
    var today = todayKey();
    if (s.lastSessionDate === today) {
      /* Same day — streak unchanged */
    } else if (s.lastSessionDate === yesterdayKey()) {
      s.streakDays += 1;
    } else {
      s.streakDays = s.lastSessionDate ? 1 : 1;
    }
    s.lastSessionDate = today;
    s.sessionsCount += 1;
    s.totalSeconds += Math.max(0, +detail.secondsSpent || 0);
    s.questionsAnswered += Math.max(0, +detail.questionsAnswered || 0);
    s.correctAnswered += Math.max(0, +detail.correct || 0);
    if (detail.bonusXp) s.bonusXp = (s.bonusXp || 0) + Math.max(0, +detail.bonusXp);
    /* Push today's date into the rolling heatmap window */
    if (!s.sessionDates) s.sessionDates = [];
    if (s.sessionDates.indexOf(today) === -1) s.sessionDates.push(today);
    /* Keep only the last 60 unique dates */
    if (s.sessionDates.length > 60) s.sessionDates = s.sessionDates.slice(-60);
    if (detail.packId) {
      var p = s.perPack[detail.packId] || { seconds: 0, qa: 0, correct: 0 };
      p.seconds += +detail.secondsSpent || 0;
      p.qa += +detail.questionsAnswered || 0;
      p.correct += +detail.correct || 0;
      s.perPack[detail.packId] = p;
    }
    var prevLevel = s.level;
    s.xp = computeXp(s);
    s.level = levelForXp(s.xp);
    return { stats: s, leveledUp: s.level > prevLevel, prevLevel: prevLevel };
  }

  /* Browser-only: bind event listeners + expose to window */
  if (!IS_BROWSER) {
    /* Node test mode — export the pure helpers via CommonJS */
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        DEFAULTS: DEFAULTS,
        MAX_LEVEL: MAX_LEVEL,
        STAGE_EMOJI: STAGE_EMOJI,
        STAGE_NAME: STAGE_NAME,
        computeXp: computeXp,
        levelForXp: levelForXp,
        thresholdForLevel: thresholdForLevel,
        xpProgressForLevel: xpProgressForLevel,
        stageEmojiForLevel: stageEmojiForLevel,
        stageNameForLevel: stageNameForLevel,
        applySession: applySession,
        dateKey: dateKey,
        todayKey: todayKey,
        yesterdayKey: yesterdayKey
      };
    }
    return;
  }

  window.addEventListener('cq:session-complete', function (e) {
    var detail = (e && e.detail) || {};
    var s = load();
    var res = applySession(s, detail);
    save(res.stats);
    /* eslint-disable no-console */
    console.log('[cq-stats] session-complete →', {
      packId: detail.packId, secondsSpent: detail.secondsSpent,
      correct: detail.correct, questionsAnswered: detail.questionsAnswered,
      newLevel: res.stats.level, xp: res.stats.xp,
      streak: res.stats.streakDays, leveledUp: res.leveledUp
    });
    /* eslint-enable no-console */
    window.dispatchEvent(new CustomEvent('cq:stats-changed', {
      detail: { stats: res.stats, leveledUp: res.leveledUp, prevLevel: res.prevLevel }
    }));
    if (res.leveledUp) {
      window.dispatchEvent(new CustomEvent('cq:level-up', {
        detail: {
          stats: res.stats, prevLevel: res.prevLevel,
          newLevel: res.stats.level,
          newStageName: stageNameForLevel(res.stats.level),
          newStageEmoji: stageEmojiForLevel(res.stats.level)
        }
      }));
    }
  });

  window.cqStats = {
    get: load,
    reset: function () { save(Object.assign({}, DEFAULTS)); window.dispatchEvent(new CustomEvent('cq:stats-changed', { detail: { stats: load(), leveledUp: false } })); },
    computeXp: computeXp,
    levelForXp: levelForXp,
    thresholdForLevel: thresholdForLevel,
    xpProgressForLevel: xpProgressForLevel,
    stageEmojiForLevel: stageEmojiForLevel,
    stageNameForLevel: stageNameForLevel,
    MAX_LEVEL: MAX_LEVEL
  };
})();
