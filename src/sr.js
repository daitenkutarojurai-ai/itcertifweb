/**
 * src/sr.js — spaced repetition for the web (Anki SM-2 light).
 *
 * Exposes window.cqSR. Storage: localStorage `cq-sr-<packId>` →
 *   { [questionId]: { due:ms, ease:number, reps:number } }
 *
 * Philosophy: re-queue *missed* items. A question answered correctly on the
 * first sight is NOT enqueued (you already know it). A miss enqueues it with a
 * short 30-min cooldown; reviewing it correctly graduates the due date outward,
 * missing it again resets the cooldown. Mastered items drift far into the
 * future and fall off the "due" list on their own.
 *
 * Node-compatible: exports the same API via module.exports for unit tests
 * (define a localStorage shim before require()).
 */
(function () {
  var DAY = 24 * 60 * 60 * 1000;
  var COOLDOWN = 30 * 60 * 1000; // 30 min after a miss
  var KEY = function (packId) { return 'cq-sr-' + packId; };

  function hasLS() { try { return typeof localStorage !== 'undefined' && !!localStorage; } catch (_) { return false; } }

  function load(packId) {
    if (!hasLS()) return {};
    try { return JSON.parse(localStorage.getItem(KEY(packId)) || '{}'); } catch (_) { return {}; }
  }
  function save(packId, s) {
    if (!hasLS()) return;
    try { localStorage.setItem(KEY(packId), JSON.stringify(s)); } catch (_) {}
  }

  /**
   * Record one answer. Returns the item's new SR record, or null if it was a
   * first-sight correct answer (not tracked).
   */
  function report(packId, id, correct, now) {
    if (!packId || id == null) return null;
    now = now || Date.now();
    var s = load(packId);
    var existing = s[String(id)];
    if (!existing && correct) return null; // don't enqueue items you already know
    var cur = existing || { due: now, ease: 2.5, reps: 0 };
    if (correct) {
      cur.reps += 1;
      var days = cur.reps === 1 ? 1 : cur.reps === 2 ? 3 : Math.round(cur.reps * cur.ease);
      cur.due = now + days * DAY;
      cur.ease = Math.min(3.0, cur.ease + 0.05);
    } else {
      cur.reps = 0;
      cur.due = now + COOLDOWN;
      cur.ease = Math.max(1.3, cur.ease - 0.2);
    }
    s[String(id)] = cur;
    save(packId, s);
    return cur;
  }

  function dueIds(packId, now) {
    now = now || Date.now();
    var s = load(packId), out = [];
    for (var id in s) {
      if (Object.prototype.hasOwnProperty.call(s, id) && s[id] && s[id].due <= now) out.push(id);
    }
    return out;
  }
  function dueCount(packId, now) { return dueIds(packId, now).length; }

  var api = { report: report, dueIds: dueIds, dueCount: dueCount, load: load };
  if (typeof window !== 'undefined') window.cqSR = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
