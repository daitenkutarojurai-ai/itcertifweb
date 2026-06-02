# CertQuests fix & audit log (2026-06-02)

Stack reality note: the prompt described "Capacitor 6 + Vercel". This repo is
actually **static HTML/CSS/vanilla-JS on Cloudflare Pages**; the live **Capacitor
app is a separate repo that wraps a build of this bundle** (this matters for §6).
Recon was done against the real files before any change.

Format: `[FIXED]` changed, `[KNOWN]` intentionally not changed (with reason).

---

## Section 1 — Double page load on landing
- `[FIXED]` index.html: the SW `controllerchange` handler called
  `window.location.reload()`. On a **first** visit the SW installs →
  `clients.claim()` → `controllerchange` fires → the page reloaded once = the
  "loads twice" flash. Now gated on an **existing** controller at load, so only a
  genuine SW *update* reloads; first visits don't. Versioned `?v=N` asset URLs
  already prevent the stale-CSS issue the reload originally guarded.
- `[KNOWN]` No `<meta http-equiv="refresh">` and no double DOMContentLoaded/onload
  render existed — the SW reload was the only cause.

## Section 2 — Blocking timer popup
- `[FIXED]` index.html: the mobile install modal auto-opened via
  `setTimeout(open, 900)` and set `body.overflow:hidden` (a blocking modal on
  every mobile load). Auto-open disabled; the install code is kept dormant
  (reversible). The non-blocking mascot toast and daily banner were left alone
  (they don't block interaction).

## Section 3 — Persistent "Start" button during a quiz (path.html)
- `[KNOWN]` Not reproducible. The only Start button is `#node-sheet-start` inside
  the node bottom-sheet, and `renderQuizInline`/`runQuiz`/minigame/concept paths
  all set `#node-sheet-start.hidden = true` (src/path.js:483, 770, 921, 1236)
  when a session starts. No persistent/clickable Start during an active session.

## Section 4 — Mini-game audit
- `[FIXED]` Delivered `MINIGAME_STATUS.md` (audit only, no games built per the
  section). Summary: TF/Match were deliberately folded into the single Yes/No
  quick drill; Boss Fight = the final-boss inline quiz (✅); the rest are
  missing or app-only (spaced repetition).

## Section 5 — Premium certification cards
- `[FIXED]` Added a data-driven **difficulty pill** (Foundational / Associate /
  Professional) to each homepage exam row, sourced from `data/index.json` and
  injected at runtime (no exam-link href or structure changed).
- `[KNOWN]` The premium per-vendor design (accent bars, hover gradient,
  lift+shadow, mono exam-code tags, pill counts, branded icon tiles) was
  **already implemented** on both the homepage (`.cert-card` + `--brand-color`)
  and `/certifications/` (`.cert-index-card`). The requested `data-vendor`
  attribute system is functionally the existing `--brand-color` CSS-variable
  system (one rule, all vendors — more maintainable than 17 attribute rules).
- `[KNOWN]` A markup-based difficulty pill on every exam link would violate the
  section's own "only add classes and CSS, don't change exam links" rule — hence
  the runtime-injection approach above.

## Section 6 — Remove hearts from the cert/quiz flow
- `[FIXED]` There were **two** hearts systems; both are now disabled **on web**:
  - cq-hearts (`src/hearts.js` header chip + `src/hud.js` health bar): no chip,
    no health bar, `lose()` no-op, `canPlay()` always true, no out-of-lives gate.
  - SPA session hearts (`src/engine/gamification.js` + `src/screens/quiz.js`):
    `getHearts()` always full, `loseHeart()` no-op, hearts-row hidden, the
    "You've run out of hearts" game-over never fires → a quiz runs until all
    questions are answered.
  - path.js chest "free heart" pill suppressed on web.
- `[KNOWN]` Hearts are kept **ON inside the live Capacitor app** (gated on
  `window.Capacitor`), because that app wraps this bundle and relies on hearts
  as its lives economy — disabling unconditionally would break the shipped app.
- `[KNOWN]` The hearts **state machine + Supabase `user_hearts` sync + cosmetics**
  are left intact (dormant, full) so the cross-repo schema and unlock gates are
  untouched. Flip the `HEARTS_ENABLED` flags to restore.

## Section 7 — Navigation
- `[FIXED]` Drawer: added 🏠 Home and 👤 Profile links; current page is now
  highlighted (`aria-current` + accent); drawer closes on any nav-link tap.
- `[KNOWN]` Already present (no change needed): the mobile hamburger drawer
  itself, sticky header + `backdrop-filter` blur (desktop.css:1420/1427), the
  NEW badge on Cert Quest, and `aria-current` highlighting on the desktop nav.
- `[KNOWN]` Desktop "Profile" is already the injected avatar chip
  (`src/auth-ui.js`); desktop "News" stays in the footer rather than rewriting
  the canonical `web-header` across ~290 pages via `sync-header.js` for one link.

## Section 8 — Squid Hint Buddy (train.html)
- `[FIXED]` The squid now has a job: a bottom-right **Hint Buddy** on the quiz
  page (`src/screens/quiz.js`). Per question it shows a hint — `q.hint` if
  authored, else the question's `tags`, else 2-3 derived keywords from the
  question text (questions carry **no** `hint` field today, verified). Wiggles
  while unused, goes "tired" (opacity 0.5) after one use, retires once answered
  (pre-answer aid + keeps clear of the Continue button), bumps a
  `cq-hint-used` localStorage counter. Mobile safe-area aware;
  respects `prefers-reduced-motion`.
- `[FIXED]` The floating tip-mascot is suppressed on train.html
  (`src/mascot-loader.js`) so there's one squid with one job.

## Section 9 — Site audit
- `[KNOWN] 9a` No high-signal unguarded null-deref found in the spot-checked
  modules; existing code guards `getElementById`/`querySelector` results.
- `[KNOWN] 9b` All internal root `href`s on index.html resolve to existing files
  (header, footer, compare links). No 404s found.
- `[KNOWN] 9c` train.html engine is sound: `?autostart=quick|full` is handled
  (`src/screens/home.js:286-320` → `autostartFocused`/`autostartDirect`);
  answer buttons are rebuilt fresh each question (`renderQuestion` resets
  `innerHTML`) so no stale correct/wrong classes; end-of-questions navigates to a
  score/results screen (no infinite loop).
- `[KNOWN] 9d` path.html loads paths and persists progress in
  `cq-path-progress-v1` (src/path.js:18/36/43); inline quiz shows a
  "Loading questions…" state.
- `[KNOWN] 9e` profile.html loads XP/streak from localStorage and has a graceful
  empty state (`maybeRenderEmptyState`, src/profile.js:436).
- `[KNOWN] 9f` No `position:fixed` bottom nav exists (sticky **top** header), so
  bottom safe-area is N/A; the new Hint Buddy is `env(safe-area-inset-bottom)`
  aware. Tap targets in the drawer are ≥52px (desktop.css `.mobile-menu-panel a`).
- `[KNOWN] 9g` No render-blocking `<head>` scripts without defer/async on
  index/certifications/profile; the only non-lazy `<img>`s are above-the-fold
  header logos (correctly eager). No fix needed.
- `[KNOWN] 9h` No empty/unlabeled buttons found on index.html (spot check);
  interactive controls carry text or `aria-label`.
- `[KNOWN] 9i` All linked pages exist and are real (not blank stubs): `news/`,
  `profile.html`, `certifications/`, `courses/`, `careers/`.
