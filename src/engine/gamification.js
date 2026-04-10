/**
 * engine/gamification.js
 * XP, levels, combo multiplier, achievements — all in localStorage.
 */

const XP_KEY           = 'itcertif_xp';
const LEVEL_KEY        = 'itcertif_level';
const ACHIEVEMENTS_KEY = 'itcertif_achievements';
const COMBO_KEY        = 'itcertif_combo'; // current session combo (not persisted)

// ─── XP per correct answer ────────────────────────────────────────────────────
const BASE_XP = { easy: 8, medium: 12, hard: 18 };

// ─── Level thresholds (XP needed to reach each level) ────────────────────────
const LEVELS = [
  { level: 1,  xp: 0,    title: 'Newbie',      icon: '🌱' },
  { level: 2,  xp: 100,  title: 'Student',     icon: '📖' },
  { level: 3,  xp: 250,  title: 'Apprentice',  icon: '🎓' },
  { level: 4,  xp: 500,  title: 'Practitioner',icon: '💡' },
  { level: 5,  xp: 900,  title: 'Engineer',    icon: '⚙️'  },
  { level: 6,  xp: 1500, title: 'Specialist',  icon: '🔧' },
  { level: 7,  xp: 2500, title: 'Expert',      icon: '🏆' },
  { level: 8,  xp: 4000, title: 'Master',      icon: '🌟' },
  { level: 9,  xp: 6000, title: 'Champion',    icon: '👑' },
  { level: 10, xp: 9000, title: 'Legend',      icon: '⚡' },
];

// ─── Achievement definitions ──────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id: 'first_quiz',    title: 'First Steps',      desc: 'Complete your first quiz',              icon: '🎯', hidden: false },
  { id: 'perfect',       title: 'Perfect Score',    desc: 'Get 100% on any quiz',                  icon: '💯', hidden: false },
  { id: 'speed_demon',   title: 'Speed Demon',      desc: 'Finish a full quiz in under 3 minutes', icon: '⚡', hidden: false },
  { id: 'hot_streak_3',  title: 'On Fire',          desc: '3 correct answers in a row',            icon: '🔥', hidden: false },
  { id: 'hot_streak_5',  title: 'Unstoppable',      desc: '5 correct answers in a row',            icon: '🚀', hidden: true  },
  { id: 'hot_streak_10', title: 'Legendary Streak', desc: '10 correct answers in a row',           icon: '🌟', hidden: true  },
  { id: 'level_5',       title: 'Rising Star',      desc: 'Reach level 5',                         icon: '⭐', hidden: false },
  { id: 'level_10',      title: 'Legend',           desc: 'Reach the maximum level',               icon: '👑', hidden: true  },
  { id: 'quiz_10',       title: 'Dedicated',        desc: 'Complete 10 quizzes',                   icon: '📚', hidden: false },
  { id: 'quiz_50',       title: 'Scholar',          desc: 'Complete 50 quizzes',                   icon: '🎓', hidden: true  },
];

// ─── Session state (not persisted — resets each quiz) ─────────────────────────
let sessionCombo = 0;
let sessionXpEarned = 0;

export function resetSessionCombo() {
  sessionCombo    = 0;
  sessionXpEarned = 0;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export function getTotalXP() {
  return parseInt(localStorage.getItem(XP_KEY) || '0', 10);
}

export function getCurrentLevel() {
  const xp = getTotalXP();
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel() {
  const current = getCurrentLevel();
  const idx     = LEVELS.findIndex(l => l.level === current.level);
  return LEVELS[idx + 1] || null;
}

export function getLevelProgress() {
  const xp      = getTotalXP();
  const current = getCurrentLevel();
  const next    = getNextLevel();
  if (!next) return 100;
  const range = next.xp - current.xp;
  const earned = xp - current.xp;
  return Math.round((earned / range) * 100);
}

export function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '[]'); }
  catch { return []; }
}

export function getSessionCombo() { return sessionCombo; }
export function getSessionXP() { return sessionXpEarned; }

// ─── Write ─────────────────────────────────────────────────────────────────────

function addXP(amount) {
  const prev     = getTotalXP();
  const prevLevel = getCurrentLevel();
  const newTotal = prev + amount;
  localStorage.setItem(XP_KEY, String(newTotal));
  sessionXpEarned += amount;

  const newLevel = getCurrentLevel();
  if (newLevel.level > prevLevel.level) {
    return { levelUp: true, newLevel };
  }
  return { levelUp: false };
}

/**
 * Record a correct answer — updates combo, awards XP.
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {{ xpEarned, combo, levelUp, newLevel }}
 */
export function onCorrectAnswer(difficulty = 'medium') {
  sessionCombo++;
  const base     = BASE_XP[difficulty] || BASE_XP.medium;
  const multiplier = sessionCombo >= 5 ? 3
                   : sessionCombo >= 3 ? 2
                   : sessionCombo >= 2 ? 1.5
                   : 1;
  const xpEarned = Math.round(base * multiplier);
  const { levelUp, newLevel } = addXP(xpEarned);

  return { xpEarned, combo: sessionCombo, multiplier, levelUp, newLevel };
}

/** Reset combo on wrong answer */
export function onWrongAnswer() {
  sessionCombo = 0;
}

/**
 * Check and unlock achievements. Call after quiz completion.
 * @param {object} quizStats - { score, total, timeMs, quizCount }
 * @returns {Array} newly unlocked achievements
 */
export function checkAchievements(quizStats) {
  const unlocked = getUnlockedAchievements();
  const ids      = new Set(unlocked.map(a => a.id));
  const newOnes  = [];
  const level    = getCurrentLevel();

  const candidates = [
    { id: 'first_quiz',    cond: quizStats.quizCount >= 1 },
    { id: 'perfect',       cond: quizStats.score === quizStats.total },
    { id: 'speed_demon',   cond: quizStats.mode === 'full' && quizStats.timeMs < 3 * 60 * 1000 },
    { id: 'hot_streak_3',  cond: quizStats.maxCombo >= 3 },
    { id: 'hot_streak_5',  cond: quizStats.maxCombo >= 5 },
    { id: 'hot_streak_10', cond: quizStats.maxCombo >= 10 },
    { id: 'level_5',       cond: level.level >= 5 },
    { id: 'level_10',      cond: level.level >= 10 },
    { id: 'quiz_10',       cond: quizStats.quizCount >= 10 },
    { id: 'quiz_50',       cond: quizStats.quizCount >= 50 },
  ];

  candidates.forEach(({ id, cond }) => {
    if (cond && !ids.has(id)) {
      const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
      if (def) {
        newOnes.push(def);
        unlocked.push({ ...def, unlockedAt: Date.now() });
      }
    }
  });

  if (newOnes.length > 0) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  }

  return newOnes;
}

export { ACHIEVEMENT_DEFS };


// ─── Hearts system ─────────────────────────────────────────────────────────────
const MAX_HEARTS     = 5;
const HEARTS_KEY     = 'itcertif_hearts';
const HEARTS_TS_KEY  = 'itcertif_hearts_ts';
const HEARTS_REGEN_MS = 30 * 60 * 1000; // 1 heart every 30 min

export function getHearts() {
  regenHearts();
  return parseInt(localStorage.getItem(HEARTS_KEY) ?? String(MAX_HEARTS), 10);
}

export function getMaxHearts() { return MAX_HEARTS; }

export function loseHeart() {
  const h = Math.max(0, getHearts() - 1);
  localStorage.setItem(HEARTS_KEY, String(h));
  // Start regen timer whenever hearts are below max
  if (h < MAX_HEARTS && !localStorage.getItem(HEARTS_TS_KEY))
    localStorage.setItem(HEARTS_TS_KEY, String(Date.now()));
  return h;
}

/** Returns ms until next heart regenerates, or 0 if full */
export function getNextHeartRegenMs() {
  const ts = parseInt(localStorage.getItem(HEARTS_TS_KEY) || '0', 10);
  if (!ts) return 0;
  const current = parseInt(localStorage.getItem(HEARTS_KEY) ?? String(MAX_HEARTS), 10);
  if (current >= MAX_HEARTS) return 0;
  const elapsed = Date.now() - ts;
  const nextRegenAt = HEARTS_REGEN_MS;
  const remaining = nextRegenAt - (elapsed % HEARTS_REGEN_MS);
  return remaining > 0 ? remaining : 0;
}

export function refillHearts() {
  localStorage.setItem(HEARTS_KEY, String(MAX_HEARTS));
  localStorage.removeItem(HEARTS_TS_KEY);
}

function regenHearts() {
  const ts = parseInt(localStorage.getItem(HEARTS_TS_KEY) || '0', 10);
  if (!ts) return;
  const current = parseInt(localStorage.getItem(HEARTS_KEY) ?? String(MAX_HEARTS), 10);
  if (current >= MAX_HEARTS) { localStorage.removeItem(HEARTS_TS_KEY); return; }
  const regened = Math.floor((Date.now() - ts) / HEARTS_REGEN_MS);
  if (regened > 0) {
    const newH = Math.min(MAX_HEARTS, current + regened);
    localStorage.setItem(HEARTS_KEY, String(newH));
    if (newH >= MAX_HEARTS) localStorage.removeItem(HEARTS_TS_KEY);
    else localStorage.setItem(HEARTS_TS_KEY, String(ts + regened * HEARTS_REGEN_MS));
  }
}

// ─── Daily XP goal ────────────────────────────────────────────────────────────
const DAILY_GOAL     = 50;
const DAILY_XP_KEY   = 'itcertif_daily_xp';
const DAILY_DATE_KEY = 'itcertif_daily_date';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function getDailyXP() {
  if (localStorage.getItem(DAILY_DATE_KEY) !== todayStr()) {
    localStorage.setItem(DAILY_XP_KEY, '0');
    localStorage.setItem(DAILY_DATE_KEY, todayStr());
  }
  return parseInt(localStorage.getItem(DAILY_XP_KEY) || '0', 10);
}

export function addDailyXP(amount) {
  const prev = getDailyXP();
  const next = prev + amount;
  localStorage.setItem(DAILY_XP_KEY, String(next));
  return { prev, next, goal: DAILY_GOAL, justCompleted: prev < DAILY_GOAL && next >= DAILY_GOAL };
}

export function getDailyGoal() { return DAILY_GOAL; }

// ─── Pack mastery ──────────────────────────────────────────────────────────────
const MASTERY_KEY = 'itcertif_mastery';

export function getPackMastery(packId) {
  try {
    const m = JSON.parse(localStorage.getItem(MASTERY_KEY) || '{}');
    return m[packId] || { correct: 0, seen: 0 };
  } catch { return { correct: 0, seen: 0 }; }
}

export function updatePackMastery(packId, correctCount, totalCount) {
  try {
    const m = JSON.parse(localStorage.getItem(MASTERY_KEY) || '{}');
    const prev = m[packId] || { correct: 0, seen: 0 };
    m[packId] = { correct: prev.correct + correctCount, seen: prev.seen + totalCount };
    localStorage.setItem(MASTERY_KEY, JSON.stringify(m));
  } catch {}
}

export function getMasteryPct(packId) {
  const m = getPackMastery(packId);
  if (!m.seen) return 0;
  return Math.min(100, Math.round((m.correct / m.seen) * 100));
}
