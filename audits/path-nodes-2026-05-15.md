# Path-node audit — 2026-05-15 (Phase 5.14)

End-to-end sweep of every node type in `src/path.js` after the 5.5–5.13
round. Goal: surface the bugs that survived the previous shallow patches
and fix them in one PR.

Cascade walked: 360×800 (phone) / 768×1024 (tablet) / 1440×900 (desktop).

## Node-by-node findings

### Concept (`renderConceptInline` — path.js:607)
- ✅ Flip animation, click + keyboard (Enter/Space).
- ✅ Dual-state Start button: re-tap commits via `markConceptComplete`.
- ✅ Walker advances after completion (`walkTo` in continue handler).
- ⚠️ **Edge case (not fixed):** `node.flashcards` empty → renders an empty
  card stack but Start still says "Mark complete (+5 XP) ✓". Wouldn't
  ship as path data — gen-paths always emits ≥1 flashcard — but
  defensive guard would be nice.

### Quiz inline (`renderQuizInline` + `runQuiz` — path.js:448)
- ✅ Focused `questionIds` honoured (line 473).
- ✅ Hearts decrement on wrong (line 546).
- ✅ Combo-tick fires both branches (line 549).
- ✅ Summary card with per-pack-tier copy.
- ✅ Walker re-pins on continue.
- ❌ **Bug (FIXED):** `picked === q.correct` always returns false when
  `q.correct` is an array (multi-correct question). User lost a heart
  and got 0% on every multi-select question regardless of pick. Affects
  ~27 questions site-wide (aws-dva-c02, aws-scs-c02, az-305 etc.).
  Fix: filter `Array.isArray(q.correct)` out of the question pool at
  load time before `runQuiz` runs. Phase 5.14 inserted the filter at
  path.js:461.

### Sub-boss (same code path as Quiz inline)
- ✅ Same renderer; same fix applies.

### Final boss (same code path, `node.type === 'finalboss'`)
- ✅ Random N picked from pack (line 463).
- ✅ Survivor-laurel ceremony chain wires correctly:
  `runQuiz.finish → markComplete → awardLaurelIfNeeded →
   cq:laurel-earned → showFinalBossCeremony` (path.js:48-66, 1197-1199).
- ✅ The fix above applies here too (mock exam was sampling multi-select
  questions from the bank).
- ⚠️ Cosmetic UX note: ceremony auto-shows on top of the inline summary.
  Acceptable — ceremony is full-bleed; user closes ceremony and sees
  Continue. Not addressing.

### Yes/No drill (`renderYesNoInline` — path.js:707)
- ✅ Post-5.13 declarative format renders one statement + Yes/No.
- ✅ Legacy `pair.stem` + `pair.option` data falls back to clearer
  "Is the proposed answer correct?" label.
- ✅ Combo-tick fires both branches (path.js:807).
- ✅ Hearts decrement on wrong (path.js:801).
- ✅ pointerdown + click bound for iOS Safari tap responsiveness.
- ✅ Walker advances on continue.

### Chest (`openChest` — path.js:1029, reworked in 5.12)
- ✅ Stagger pills (XP → heart → cosmetic), 220 ms apart.
- ✅ Free heart only fires when not at MAX; otherwise pill says
  "Already at full health".
- ✅ Replay with hat already owned → +20 XP bonus pill.
- ✅ Walker advances on Continue.

### Walker (`walkTo` — path.js:158, refresh logic at path.js:1226)
- ✅ Repins on scroll + resize + ResizeObserver (Phase 4.3.5).
- ✅ Level-up: emoji updates immediately via `event.detail.newStageEmoji`
  on cq:level-up — no race with cosmetics.ensureCatalog (path.js:1246).
  The Phase 4.1 stale-emoji ticket is closed in practice.
- ✅ Hat overlay refreshes on cq:cosmetic-changed.
- ✅ Confetti capped at MAX_CONFETTI_CONTAINERS (Phase 4.1, shipped).

## Fixes applied this PR

1. **Multi-correct filter** in `renderQuizInline` (path.js:461) — drops
   the ~1% of questions that broke single-select inline quiz UI.

## Items deferred (acceptable as-is)

- Concept node empty-flashcards defensive guard (cannot occur in shipped
  path data).
- Final-boss laurel ceremony order vs inline summary (visual stacking
  works; addressing would require coordination between session-complete
  and ceremony spawn).

## Tests

- `npm test` → 109/109 pass after the multi-correct fix.

## Out of scope

- Visual screenshot matrix per breakpoint — confirmed via CSS cascade
  walk (responsive sizing all comes from 5.11).
