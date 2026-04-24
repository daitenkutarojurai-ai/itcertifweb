/**
 * engine/notifications.js
 *
 * Retention notification system.
 * - Browser: uses Web Notifications API + localStorage scheduling
 * - Android: stubs Capacitor LocalNotifications (activate when plugin installed)
 *
 * Strategy (Duolingo-style):
 *   - User sets a daily reminder time (stored in localStorage)
 *   - If user hasn't opened app for 1 day → "Don't break your streak!" push
 *   - If user hasn't opened app for 3 days → "Your certif is waiting 🎯" push
 *   - On quiz completion → positive reinforcement notification scheduled for next day
 */

const NOTIF_ENABLED_KEY   = 'itcertif_notif_enabled';
const NOTIF_TIME_KEY      = 'itcertif_notif_time';   // "HH:MM"
const LAST_VISIT_KEY      = 'itcertif_last_visit';

// ── Android (Capacitor) — activate when plugin installed ──────────────────────
const CAPACITOR_ENABLED = false; // flip to true once @capacitor/local-notifications added

// ─── Init — call once on app startup ──────────────────────────────────────────

export async function initNotifications() {
  updateLastVisit();
  // Streak is managed by progress.js — single source of truth

  if (CAPACITOR_ENABLED) {
    // TODO: await LocalNotifications.requestPermissions();
  }
}

/**
 * Request browser notification permission and enable the system.
 * Call this after user opts in from Settings screen.
 */
export async function requestPermission() {
  if (CAPACITOR_ENABLED) {
    // TODO: const { display } = await LocalNotifications.requestPermissions();
    // return display === 'granted';
    return false;
  }

  if (!('Notification' in window)) {
    console.warn('[Notifications] Not supported in this browser');
    return false;
  }

  const result = await Notification.requestPermission();
  const granted = result === 'granted';
  localStorage.setItem(NOTIF_ENABLED_KEY, granted ? 'true' : 'false');
  return granted;
}

/** Returns true if user has granted permission */
export function isPermissionGranted() {
  if (CAPACITOR_ENABLED) return false; // stub
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/** Returns true if user has enabled notifications */
export function isEnabled() {
  return localStorage.getItem(NOTIF_ENABLED_KEY) === 'true' && isPermissionGranted();
}

/** Disable notifications */
export function disableNotifications() {
  localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
}

/**
 * Set the daily reminder time.
 * @param {string} time - "HH:MM" e.g. "09:00"
 */
export function setReminderTime(time) {
  localStorage.setItem(NOTIF_TIME_KEY, time);
  scheduleNextReminder();
}

export function getReminderTime() {
  return localStorage.getItem(NOTIF_TIME_KEY) || '09:00';
}

// ─── Scheduling ────────────────────────────────────────────────────────────────

/**
 * Schedule the next daily reminder.
 * Uses setTimeout for browser (approximate, works while tab is open).
 * Real background delivery requires Capacitor on Android.
 */
export function scheduleNextReminder() {
  if (!isEnabled()) return;

  const [hh, mm] = getReminderTime().split(':').map(Number);
  const now  = new Date();
  const next = new Date();
  next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // Schedule for tomorrow if time passed

  const ms = next - now;
  console.log(`[Notifications] Next reminder in ${Math.round(ms / 60000)}min`);

  setTimeout(() => {
    fireReminder();
    scheduleNextReminder(); // reschedule
  }, ms);

  if (CAPACITOR_ENABLED) {
    scheduleCapacitorNotification(next);
  }
}

function scheduleCapacitorNotification(date) {
  // TODO:
  // await LocalNotifications.schedule({
  //   notifications: [{
  //     id: 1,
  //     title: "CertQuests 🎯",
  //     body: buildReminderBody(),
  //     schedule: { at: date, repeats: true, every: 'day' },
  //     channelId: 'reminders',
  //   }]
  // });
}

function fireReminder() {
  if (!isPermissionGranted()) return;

  const daysSince = getDaysSinceLastVisit();
  const title     = 'CertQuests ⚡';
  const body      = buildReminderBody(daysSince);

  if (CAPACITOR_ENABLED) {
    // TODO: fire native notification
  } else {
    new Notification(title, {
      body,
      icon: '/src/assets/icons/icon-192.png',
    });
  }
}

/** Build a contextual reminder message based on days since last visit */
function buildReminderBody(daysSince = 0) {
  if (daysSince >= 7)  return "You've been away for a week. Your certif won't study itself 📚";
  if (daysSince >= 3)  return "It's been a few days. Come back and keep your streak alive! 🔥";
  if (daysSince >= 1)  return "Don't break your streak! Quick Quiz is ready for you 🎯";
  return "Daily study reminder — 5 questions takes less than 2 minutes 💪";
}

// ─── Post-quiz notification ────────────────────────────────────────────────────

/**
 * Schedule a "well done" + next-day follow-up after completing a quiz.
 * Call from quiz.js after saving results.
 */
export function schedulePostQuizReminder(packName, score, total) {
  if (!isEnabled()) return;

  const pct = Math.round((score / total) * 100);
  const message = pct >= 80
    ? `🎉 ${pct}% on ${packName}! Come back tomorrow to push higher.`
    : `📈 ${pct}% on ${packName}. Keep practicing — you're getting there!`;

  // Browser: schedule for 24 hours later
  setTimeout(() => {
    if (!isPermissionGranted()) return;
    new Notification('CertQuests ⚡', { body: message });
  }, 24 * 60 * 60 * 1000);
}

// ─── Visit tracking ───────────────────────────────────────────────────────────

function updateLastVisit() {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

function getDaysSinceLastVisit() {
  const last = parseInt(localStorage.getItem(LAST_VISIT_KEY) || '0', 10);
  if (!last) return 0;
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}
