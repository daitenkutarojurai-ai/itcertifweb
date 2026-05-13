/**
 * path-progress.js — pure node-progress + laurel-awarding logic.
 *
 * The browser-side (src/path.js) layers on top: persistence to
 * localStorage, CustomEvent dispatch, DOM rendering. The functions
 * here are pure (no side effects), so they're easy to unit-test
 * with node --test.
 *
 * Exported as both a global (window.cqPathProgress) and a CommonJS
 * module (module.exports), mirroring the pattern in src/stats.js.
 */
(function (root) {
  'use strict';

  /* ─── isComplete: has the node been marked complete? ──────────────────── */
  function isComplete(progress, packId, nodeId) {
    return !!(progress && progress[packId] && progress[packId][nodeId] && progress[packId][nodeId].completed);
  }

  /* ─── markComplete: returns NEW progress + whether this is the first time.
        Pure: no Date.now() (caller passes `now`), no event dispatch. ────── */
  function markComplete(progress, packId, nodeId, score, now) {
    var p = progress || {};
    /* Shallow-clone the pack bucket so callers don't observe mutations on
       the input — important when path.js reads progress from localStorage
       and we want a clean "previous snapshot" if it inspects it later. */
    var packBucket = Object.assign({}, p[packId] || {});
    var alreadyDone = !!packBucket[nodeId] && !!packBucket[nodeId].completed;
    packBucket[nodeId] = {
      completed: true,
      completedAt: typeof now === 'number' ? now : 0,
      score: score == null ? null : score
    };
    var next = Object.assign({}, p);
    next[packId] = packBucket;
    return { progress: next, alreadyDone: alreadyDone };
  }

  /* ─── flattenNodes: chapters → flat array, append finalBoss with isFinal.
        Returns plain objects with chapterId / chapterTitle attached. ─────── */
  function flattenNodes(path) {
    if (!path || !Array.isArray(path.chapters)) return [];
    var out = [];
    path.chapters.forEach(function (c) {
      (c.nodes || []).forEach(function (n) {
        out.push(Object.assign({}, n, { chapterId: c.id, chapterTitle: c.title }));
      });
    });
    if (path.finalBoss) {
      out.push(Object.assign({}, path.finalBoss, {
        chapterId: 'final', chapterTitle: 'Final Exam', isFinal: true
      }));
    }
    return out;
  }

  /* ─── findCurrentNodeIdx: index of the first incomplete node, or
        nodes.length if all are done. ─────────────────────────────────────── */
  function findCurrentNodeIdx(progress, packId, nodes) {
    if (!Array.isArray(nodes)) return 0;
    for (var i = 0; i < nodes.length; i++) {
      if (!isComplete(progress, packId, nodes[i].id)) return i;
    }
    return nodes.length;
  }

  /* ─── snapshotProgress: { id, completed, chapterId } per node — used by
        path.js to detect chapter-end completion across a state change. ──── */
  function snapshotProgress(progress, path) {
    return flattenNodes(path).map(function (n) {
      return {
        id: n.id,
        completed: isComplete(progress, path.packId, n.id),
        chapterId: n.chapterId
      };
    });
  }

  /* ─── awardLaurelIfNeeded: pure laurel-list updater. Returns the new
        laurels array + whether this call appended a fresh one. Idempotent:
        a second call with the same packId is a no-op. ────────────────────── */
  function awardLaurelIfNeeded(laurels, packId, score, now) {
    var list = Array.isArray(laurels) ? laurels.slice() : [];
    if (list.some(function (l) { return l && l.packId === packId; })) {
      return { laurels: list, newlyAwarded: false };
    }
    list.push({
      packId: packId,
      earnedAt: typeof now === 'number' ? now : 0,
      score: score == null ? null : score
    });
    return { laurels: list, newlyAwarded: true };
  }

  /* ─── packPercent: 0..100 share of nodes complete for a given pack. ───── */
  function packPercent(progress, path) {
    var nodes = flattenNodes(path);
    if (!nodes.length) return 0;
    var done = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (isComplete(progress, path.packId, nodes[i].id)) done++;
    }
    return Math.round((done / nodes.length) * 100);
  }

  var api = {
    isComplete: isComplete,
    markComplete: markComplete,
    flattenNodes: flattenNodes,
    findCurrentNodeIdx: findCurrentNodeIdx,
    snapshotProgress: snapshotProgress,
    awardLaurelIfNeeded: awardLaurelIfNeeded,
    packPercent: packPercent
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.cqPathProgress = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
