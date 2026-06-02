# Mini-game implementation status (audit — Section 4)

Audited `src/path.js`, `src/yesno-prompt.js`, `src/path-progress.js` on 2026-06-02.

**Context that changes the picture:** the project deliberately *replaced* the
original (broken) True/False and Match mini-games with a single, robust
**"Yes/No quick drill"** that works against any MCQ bank. Path "minigame" nodes
all route through `renderYesNoInline()` (`src/path.js:767`); legacy
`truefalse` / `match` node types are *migrated* into that drill at runtime via
`migrateTFNode()` / `migrateMatchNode()` (`src/path.js:458-459`). A newer
`renderModeInline()` (`src/path.js:918`) exists for `{mode, data}` nodes but is
a stub that currently falls back to the Yes/No drill (`src/path.js:936`).

A game is counted **✅ Implemented** only if it has real `init` + `render` +
answer-handling (not a stub, comment, or migration shim).

| # | Planned mini-game | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | Match the Pair (keyword → service) | ❌ Missing | No standalone renderer. `migrateMatchNode()` converts `match` nodes into the Yes/No drill (`path.js:459`). |
| 2 | Lightning Round (rapid true/false) | ❌ Missing | Only named as a possible `mode` string in a comment (`path.js:450`); `renderModeInline` falls back to Yes/No (`path.js:936`). |
| 3 | Break the Architecture (spot misconfig) | ❌ Missing | No code references. |
| 4 | Acronym Decoder | ❌ Missing | No code references. |
| 5 | True/False Blitz | ⚠️ Folded in | Not a standalone "blitz". `truefalse` nodes are migrated into the Yes/No drill (`migrateTFNode()`, `path.js:458`). |
| 6 | Scenario Builder (drag-and-drop) | ❌ Missing | No drag-drop / architecture-builder code. |
| 7 | Boss Fight (multi-part challenge) | ✅ Implemented | Final-boss node runs a real inline mock exam: `renderQuizInline()` + `runQuiz()` (`path.js:480`, `:543`); `node.type === 'finalboss'` draws a random N-question set (`path.js:506`). Sub-boss uses the same engine. |
| 8 | Spaced Repetition Review | ❌ Missing (web) | Not on the web. Spaced repetition is a **native-app** feature (`user_spaced_repetition` table, separate repo). |

### Actually shipped (not in the original 8-list)
- **✅ Yes/No quick drill** — the real, working mini-game. Full
  `render` + per-answer handling + combo bonus + summary screen
  (`renderYesNoInline()` `src/path.js:767-912`), prompts synthesised by the pure
  `src/yesno-prompt.js`. This is what every "minigame" node plays today.

### Recommendation
Per Section 4's instruction, **no games were implemented in this pass** — this
is an audit only. If the roadmap wants more variety, the cleanest path is to
flesh out the existing `renderModeInline()` dispatcher (`path.js:918`) with one
new renderer per `mode` (`match-pair`, `lightning-round`, `acronym`), since the
node schema (`{mode, data}`) and the completion/event plumbing already exist.
