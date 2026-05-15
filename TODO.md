# CertQuests — TODO

Living TODO. Items here are not dropped on the floor; they're things to pick
up when there's time.

---

## P0 — Phase 5: Desktop + game-feel rebuild + IA cleanup (2026-05-13, expanded 2026-05-15)

> Live audit on phone + desktop + a second user pass on 2026-05-15 surfaced
> a wider batch: chrome inconsistency, IA duplication (cert pages → train
> pack list = double picker), path bottom-sheet phone-locked on desktop,
> Yes/No drill phrasing reads as a riddle, treasure-chest dead-end, hearts
> still feel cloned, no shared health across sections, no in-session HUD.
> Group them into one phase so they ship as a coherent UX pass.
>
> **Test rule (locked):** every change in this phase MUST be verified on
> BOTH desktop and a phone viewport (DevTools or a real device) before
> being marked shipped. Header/HUD bugs that survived Phase 4 all had this
> root cause — desktop-only verification.
>
> **Structure:**
> - Part A — Chrome & IA (5.1, 5.2 retired, 5.3, 5.4 ✅, 5.5, 5.10)
> - Part B — Game systems rebuild (5.6, 5.7, 5.11, 5.12, 5.13, 5.14)
> - Part C — Other surface polish (5.15, 5.3 courses)
> - Part D — Verification (5.8)

### 5.1 — Top-bar: consistency + remove Profile redundancy ✅ SHIPPED 2026-05-15

- [x] ✅ **B2 — Consistency.** New `scripts/sync-header.js` enforces one
      canonical `<header class="web-header">` across all pages; ran
      `npm run sync-header` → 97 HTML files updated, 7 variants collapsed
      to 1. Re-running is idempotent.
- [x] ✅ **B1 — Profile link removed.** Stripped from desktop nav (script
      doesn't include it) and from `src/menu.js` mobile drawer. Avatar
      chip + drawer auth row are the only profile entry points now.
- [x] ✅ **5.10 prep — Training link removed** from canonical nav and
      mobile drawer (cert pages will gain Quick Quiz + Learning Path
      CTAs in 5.10; no point keeping Training as a redundant entry).
- [x] ✅ Canonical nav: Cert Quest (NEW pill) · Certifications · Courses
      · Careers · News · Google Play. `aria-current="page"` injected
      automatically per page URL (path/cert/course/career/news).
- [x] ✅ **CSS cleanup.** Phone (≤767px): desktop nav hidden, header
      becomes logo + absolute-positioned hamburger (top-right corner,
      no more drift). Desktop (≥768px): nav `flex-wrap: nowrap`, links
      `white-space: nowrap`, `.cq-auth-chip` + `.web-header-badge` are
      `flex-shrink: 0` — chip never wraps below nav.
- [x] ✅ Cache bumped 61 → 62, sw.js CACHE_VERSION → v76.
- [x] ✅ 83/83 unit tests pass.

### 5.2 — Training pack-tile sizing — RETIRED → see 5.10

> Original brief was to align pack tiles on `/train.html`. Architectural
> decision 5.10 collapses that landing page into `/certifications/`, so
> there's no pack-tile grid to align. Polishing the new entry points
> (cert pages + path index) is in scope of 5.10 itself.

### 5.3 — Courses module rework

- [ ] `/courses/` is "not user-friendly at all" (user verbatim). Audit
      what's broken: discoverability, navigation, course-vs-module hierarchy,
      mobile layout, course-card readability.
- [ ] Rebuild the index page around a clear "what is a course / how is it
      different from a path / how is it different from training" header.
- [ ] Course detail pages: ensure each module has a clear next-step CTA
      and visible progress. Today they read like static articles.
- [ ] Cross-link courses ↔ paths (a course is a sister-format to a Cert
      Quest path — make the relationship explicit on both sides).
- [ ] Acceptance: a new user landing on `/courses/` knows in <5 s what a
      course is, can pick one, and reaches a productive module in 2 taps.

### 5.4 — Remove `/stats.html` (consolidate into `/profile.html`) ✅ SHIPPED 2026-05-15

- [x] ✅ `/stats.html` is now a meta-refresh + canonical to `/profile.html`
      (was already in place before this ticket).
- [x] ✅ Added `_redirects` for a real Cloudflare 301 (`/stats.html →
      /profile.html`) — transfers SEO equity, beats the meta-refresh.
- [x] ✅ Replaced 71 `<a href="/stats.html">My Stats</a>` nav links across
      certifications/, learning/, news/ with `href="/profile.html">My Profile`.
- [x] ✅ `sitemap.xml` already excluded `/stats.html`; `robots.txt` keeps
      `Disallow: /stats.html` since the page is a redirect with no value.
- [x] ✅ Updated `src/avatar.js` doc comment + rebuilt `cq-core.js`.
- [x] ✅ Cache bumped 60 → 61, sw.js CACHE_VERSION → v75.
- [x] ✅ Acceptance verified: 0 remaining `<a>` to `/stats.html` in HTML.

### 5.5 — Mascot 🦑: center in its circle ✅ SHIPPED 2026-05-15

- [x] ✅ Root cause: a stray second `.cq-mascot-emoji` block downstream
      of the original 5.5 fix set `transform-origin: 50% 70%` — the
      bob/wave keyframes pivoted 20% below center, making the squid
      drift sideways every cycle. Both blocks consolidated into one;
      `transform-origin: 50% 50%`.
- [x] ✅ Static perceptual nudge: SVG body is top-heavy (mantle + eyes
      occupy y=4..46, thin tentacles y=38..62). `translateY(1.5px)` on
      the SVG element shifts the visual mass-center onto the bubble
      center.
- [x] ✅ Cache bumped 64 → 65, sw.js CACHE_VERSION → v79.

### 5.6 — Hearts → Health bar (cross-section, damage + cooldown) ✅ SHIPPED 2026-05-15

- [x] ✅ **P4 — Visual.** Continuous 5-segment health bar with green/amber/
      red colour bands. Bar visible everywhere via the header chip
      (auto-injected by hearts.js); larger version in the modal.
- [x] ✅ **P5 — Damage feedback.** Chip shakes + flares red on every
      `lose()` via `is-damaging` class + cq-hearts-shake/flare keyframes.
      Reduced-motion users get the flare only (no shake).
- [x] ✅ **P5 — Hard gate at 0.** New `cqHearts.showCooldownGate()` renders
      a full-screen overlay on /path.html: damaged-heart icon, live MM:SS
      countdown to next regen, progress bar, "Hide" + "Read a tip" exits.
      Auto-dismisses when ≥1 heart regenerates. Path-mode node taps when
      `canPlay()` is false also surface the gate (concept + chest nodes
      bypass — they're regen paths).
- [x] ✅ **T2 — Cross-section sync.** One source of truth (`cq-hearts-v1`).
      Bar visible on /path.html, /train.html, every page that has the
      header. Writes are path-only (only `src/path.js` calls
      `cqHearts.lose()`); training quizzes never decrement.
- [x] ✅ **hearts.js refactor.** Pure helpers extracted — `normalize`,
      `regenSync(state, now)`, `applyLossSync(state, now)`,
      `nextRegenMsFor(state, now)`. Browser-only side effects guarded
      with `IS_BROWSER`. Dual-export: `window.cqHearts` in browser,
      CJS via `module.exports` in Node.
- [x] ✅ Tooltip / a11y label: "Health: 3 of 5 — next regen in 12 min".
- [x] ✅ 13 new pure-state tests (`test/hearts.test.js`) covering normalize,
      regen ticks, loss math, cooldown enter/exit, regen cap. **109/109**
      total tests pass (was 96).
- [x] ✅ Cache bumped 66 → 67, sw.js CACHE_VERSION → v81.

### 5.7 — Quest HUD box (Chess-Kombat-style video-game panel) ✅ SHIPPED 2026-05-15

- [x] ✅ HUD module (`src/hud.js`) renders a top-right corner panel with:
      avatar emoji + level badge, HP segmented bar (reuses cq-health-*
      from 5.6), XP-to-next-level fill, combo row (`×N combo`).
      Damage flash on `cq:heart-lost`; combo "is-hot" glow at ≥4.
- [x] ✅ **P6 — Always-on companion on /path.html.** Visibility logic
      updated: HUD shows whenever `/path.html?pack=…` is loaded
      (`isPathPackPage()`), not just when a node sheet is open. Map
      browsing now displays the avatar + health in the corner.
- [x] ✅ Training mode: HUD appears whenever `.quiz-screen` is in the DOM
      (existing MutationObserver-based detection, unchanged).
- [x] ✅ Hidden on `/`, `/news/`, `/careers/`, `/certifications/`,
      `/courses/` — only the two surfaces above show it.
- [x] ✅ `cq:combo-tick` dispatched from `src/path.js` (inline quiz +
      Yes/No drill) and `src/screens/quiz.js` (training quiz handleAnswer)
      so the combo readout actually updates.
- [x] ✅ Cache bumped 67 → 68, sw.js CACHE_VERSION → v82.

### 5.8 — Verification pass (mandatory)

- [ ] After each ticket above ships, run the full audit on phone + desktop.
- [ ] Walk the CSS cascade at 360 × 800, 768 × 1024, 1440 × 900 for every
      modified page (per memory rule: desktop-only passes ship bugs).
- [ ] Take screenshots at 360 × 800 and 1440 × 900 for each modified page;
      attach to the commit message if any layout is non-obvious.
- [ ] `npm test` must remain green.
- [ ] Bump cache once per shipped batch (not per ticket).

### 5.9 — Estimated total

~6-8 working days end-to-end (was 3-4 before the 2026-05-15 expansion).
Suggested PR order:
1. **5.4** ✅ SHIPPED 2026-05-15 — stats → profile.
2. **5.1** — top-bar consistency + remove Profile link (B1+B2). Touches
   every page; ship before everything else so subsequent edits inherit
   the canonical header.
3. **5.10** — IA collapse (`/train.html` landing → `/certifications/`)
   (A1). Same blast radius as 5.1; bundle if convenient.
4. **5.11** — Path bottom-sheet desktop sizing (P1). Self-contained CSS.
5. **5.5** — Mascot centering. Tiny.
6. **5.13** — Yes/No drill phrasing audit (P2). Content + generator pass.
7. **5.6** — Health bar (P4 + P5 + T2). Foundation for 5.7.
8. **5.7** — In-session HUD (P6). Depends on 5.6.
9. **5.12** — Treasure-chest rework (P3). Depends on 5.6 (free heart drop).
10. **5.14** — Per-node audit pass (P7). Final cleanup; depends on 5.5–5.13.
11. **5.15** — Training mode-selector polish (T1). Independent.
12. **5.3** — Courses rework (biggest, last).

### 5.10 — IA collapse: `/train.html` landing → `/certifications/` (A1) ✅ SHIPPED 2026-05-15

> **Decision (user-confirmed 2026-05-15):** `/train.html?pack=X` stays as
> the quiz **runtime**. The bare `/train.html` (pack picker) is collapsed
> into `/certifications/`. One pack picker, two play modes per pack.

- [x] ✅ Bare `/train.html` redirect implemented in-page (top-of-head
      script in `train.html`). Cloudflare `_redirects` can't match on
      query string; an edge 301 there would also rewrite the live
      `?pack=` runtime, so the redirect lives in the page itself —
      fires only when `?pack`/`?brand`/`?qids` are absent.
- [x] ✅ Each cert page (`/certifications/*.html`) now shows every
      available pack with **two CTAs side-by-side**: 🎯 Quick quiz
      (`/train.html?pack=X`) + 🗺️ Learning path (`/path.html?pack=X`).
      Path CTA is omitted when no path JSON exists. New script
      `scripts/cert-pack-ctas.js` (idempotent, `npm run cert-pack-ctas`).
- [x] ✅ Pack-id alias map: `data/index.json` ID `aws-clf-c02` resolves
      to canonical path packId `aws-cloud-practitioner` so the path CTA
      points at the right /path.html target.
- [x] ✅ Per-brand `--pack-brand` CSS variable injected into each cert
      page's `.pack-tile { … }` block, so the primary CTA inherits the
      brand colour automatically (AWS #FF9900, Microsoft #0078D4,
      Cisco #1D63ED, etc.).
- [x] ✅ "Training" already removed from top nav + drawer in 5.1.
- [x] ✅ `train.html` meta updated: `noindex, follow` + canonical
      → `/certifications/` (the bare page no longer ranks).
- [x] ✅ `sitemap.xml`: bare `/train.html` entry removed.
- [x] ✅ Smoke check: all 32 CTAs (16 train + 16 path) point at packs
      that exist in `data/index.json` / `data/paths/_index.json`.
- [x] ✅ Cache bumped 62 → 63, sw.js CACHE_VERSION → v77.

### 5.11 — Path bottom-sheet desktop sizing (P1) ✅ SHIPPED 2026-05-15

- [x] ✅ Sheet centered on desktop (was bottom-anchored). Three breakpoints:
      - `< 768 px`: bottom drawer, untouched
      - `768–1199 px`: centered modal, `min(640px, 90vw)`, 32px padding,
        all corners rounded, scale-in transition
      - `≥ 1200 px`: centered modal, `min(840px, 70vw)`, 36px padding
- [x] ✅ Quiz-inline `.pquiz-opt` buttons now scale: `padding: 16-18px`,
      `min-height: 56-60px`, `font-size: 15.5-16.5px`. Comfortable on a
      27" screen, tap target preserved.
- [x] ✅ Backdrop opacity bumped 0.6 → 0.72 on desktop; modal feels
      anchored, not floating.
- [x] ✅ Concept flashcards: `padding: 22-26px`, `font-size: 16.5-18px`,
      `border-radius: 16px`. Long backs no longer feel cramped.
- [x] ✅ `.node-sheet h2` 22px → 26-30px; `.node-sheet-icon` 56px → 64px.
- [x] ✅ Cache bumped 63 → 64, sw.js CACHE_VERSION → v78.
- [x] ✅ 83/83 unit tests pass.

### 5.12 — Treasure-chest rework (P3) ✅ SHIPPED 2026-05-15

> **Decision (user-confirmed 2026-05-15):** Fix, don't remove. Chest
> nodes need to feel like a real chapter milestone.

- [x] ✅ Existing chest handler audited: it fired `cq:session-complete`
      with bonusXp + unlocked the per-chapter cosmeticKey, but offered
      nothing else and gave a flat reward on replay (no scale-back).
- [x] ✅ Reward stack on open:
      1. **+30 XP** base via `cq:session-complete` bonusXp (verified)
      2. **Free heart** (+1 up to MAX) via `cqHearts.gain(1)` — ties
         straight into the 5.6 health bar; pill says "now N/5"
      3. **Cosmetic** from `node.cosmeticKey` (chapter-N hat). Replay
         with hat already owned → "+20 XP bonus" so the chest still
         feels worthwhile.
- [x] ✅ Already-at-max-health users see "Already at full health" pill
      — chest doesn't silently swallow the heart.
- [x] ✅ Pills stagger in 220 ms apart (XP → heart → cosmetic) using
      `.cq-chest-pill.is-in` opacity/translate transition. Continue
      button focuses ~760 ms after open.
- [x] ✅ CSS legacy guard: `.cq-chest-wrap:has(.cq-chest-rewards)
      .cq-chest-reward { display: none; }` hides the old single-line
      reward block when the new pills are present.
- [x] ✅ Cache bumped 68 → 69, sw.js CACHE_VERSION → v83.

### 5.13 — Yes/No drill phrasing audit (P2) ✅ SHIPPED 2026-05-15

> **Problem:** old drill read as a riddle ("Is X the answer to:
> which protocol uses port 443?"). Users want a clean declarative
> statement they can yes-or-no.

- [x] ✅ New pure helper `src/yesno-prompt.js`: `buildYesNoPrompt(stem,
      option)` synthesises a single declarative sentence (e.g.
      "HTTPS uses port 443.") from supported stem patterns:
      - `Which X verb Y?` → `[option] verb Y.`
      - `What is X?` → `X is [option].`
      - `What are X?` → `X are [option].`
      - `What does X verb?` → `X verb-3rd [option].`
      Returns null when no pattern fits. Pure JS, dual-export (CJS
      for tests + window.cqYesNoPrompt for browser).
- [x] ✅ `canYesNoify(stem)` predicate + `isComplexStem(stem)`
      reject scenario stems (>160 chars, multi-sentence),
      "what should you do" recommendation stems, negative-framed
      stems (NOT/EXCEPT/never).
- [x] ✅ `gen-paths.js` filters chapter pool by `canYesNoify`; if
      fewer than 3 eligible questions remain, the chapter gets NO
      mini-game node — honest > confusing. Wrong-option fallback
      uses the correct prompt as a template.
- [x] ✅ `renderYesNoInline` (src/path.js) renders `pair.prompt` as
      single declarative + "True or false?" label. Legacy data
      (no prompt, just stem+option) falls back to "Is the proposed
      answer correct?" — clearer than the old "Is this the right
      answer?" riddle.
- [x] ✅ 14 new unit tests in `test/yesno-prompt.test.js` covering
      the supported patterns, rejection cases, and edge cases.
      96/96 total tests pass.
- [x] ✅ Path JSONs regenerated. **Trade-off:** of 40 generated
      paths, 3 retain a Yes/No drill (`aws-aif-c01`,
      `comptia-cysa`, `pcnsa`); the other 37 lost their mini-game
      because their question banks are scenario-heavy and don't
      synthesise into clean declaratives. Per-chapter quiz +
      concept + sub-boss still carry those paths.
- [x] ✅ Cache bumped 65 → 66, sw.js CACHE_VERSION → v80.

### 5.14 — Per-node-type audit pass (P7) ✅ SHIPPED 2026-05-15

> **No more shallow patches.** Sweep every node type end-to-end with the
> 360/768/1440 cascade walk, document each bug found, fix in one PR.

- [x] ✅ Audit doc: `audits/path-nodes-2026-05-15.md` — one section per
      node type with status, plus list of fixes applied and items
      deferred.
- [x] ✅ Concept — clean. Flip + dual-state Start verified.
- [x] ✅ Quiz inline / sub-boss / final-boss — surfaced one real bug:
      `picked === q.correct` always failed for multi-correct questions
      (`q.correct` as `[0, 3]`), so the user lost a heart and got 0%
      on every multi-select question. Affects ~27 questions
      (aws-dva-c02, aws-scs-c02, az-305 …). **Fix:** filter
      `Array.isArray(q.correct)` out of the question pool at
      `renderQuizInline` load time. Train.html keeps its own
      multi-select UI.
- [x] ✅ Final-boss laurel chain (`runQuiz.finish → markComplete →
      awardLaurelIfNeeded → cq:laurel-earned → showFinalBossCeremony`)
      verified end-to-end.
- [x] ✅ Yes/No drill (post-5.13): declarative renders + legacy fallback
      both work; pointerdown+click double-bind preserved for iOS Safari.
- [x] ✅ Walker: scroll/resize/ResizeObserver re-pin (4.3.5), level-up
      emoji updates immediately via `event.detail.newStageEmoji` —
      Phase 4.1 stale-emoji ticket closed in practice.
- [x] ✅ 109/109 unit tests pass.
- [x] ✅ Cache bumped 69 → 70, sw.js CACHE_VERSION → v84.

### 5.15 — Training mode selector polish (T1)

> Was buried in original 5.2. Surface it as its own ticket.

- [ ] On `/train.html` (when entered with a pack), the mode picker
      ("Diagnostic / Quick quiz / Custom / Full exam") renders too small
      on desktop — auto-shrinks to about 240 px wide and looks like an
      afterthought.
- [ ] Rebuild as a card grid: 4 mode cards, each 280 px wide on desktop
      (2-col on tablet, 1-col stack on phone), with an icon, mode name,
      one-line description, estimated time, and CTA button.
- [ ] Use the existing color tokens; no new design tokens needed.
- [ ] Acceptance: at 1440 × 900, the mode picker fills the content
      column, each card has equal height, the active mode is clearly
      indicated.

---

## P1 — Phase 4: Path Section Rework (Cert Quest v2)

> Multiple shallow bug-fixes have stacked up. User keeps hitting different
> failure modes (flashcards unreadable, Start button no-op, TF buttons
> don't respond, quiz nodes redirect to a non-filtered train.html, etc.).
> Time to stop patching and rebuild the Path execution flow as one
> coherent system.

### 4.1 — Bugs found so far (live audit)

**Architectural / state bugs**
- [x] ✅ Quiz nodes redirect to `/train.html?qids=…` — `home.js:284`
      now parses qids and calls `autostartFocused()` to load only the
      focused question subset (verified shipped 2026-05-13).
- [x] ✅ Path-node handshake broke when user left to train.html (stats.js
      now resolves cq-path-pending — fixed 2026-05-12)
- [x] ✅ Survivor laurel ceremony only fires if user is on path.html when
      event dispatches (fixed via cq-laurel-fresh-v1 flag — 2026-05-12)
- [x] ✅ openNodeSheet didn't reset Start button state (fixed 2026-05-12)
- [ ] Chapter banners + paths use lower-cased pack-IDs in some places
      where titles haven't been re-fetched (cosmetic)

**Per-node-type bugs**
- [ ] **TF mini-game**: user reports "buttons cant be answer" — buttons
      visually present but tap doesn't register. Suspected: timer fires
      `answer(null)` before user can tap because 5 s per Q is too short
      on mobile, OR pointer-events blocked by overlapping element.
      Need to investigate with a click logger.
- [ ] **Match mini-game**: same risk surface; pair texts often overflow,
      cards look broken on phones with long question text.
- [x] ✅ Concept flashcards unreadable — text clipped (fixed 2026-05-12)
- [x] ✅ Concept Start button dead-zone after first interaction (fixed)
- [ ] **Chest**: tap chest → animations play, XP awarded, but cosmetic
      sometimes doesn't visually appear (chip render race condition)
- [ ] **Sub-boss**: same redirect-to-train.html issue as quiz nodes,
      with no focused question subset
- [ ] **Final boss**: redirects to train.html for the full mock — fine
      in principle, but the user has no idea how to come back and see
      the survivor ceremony unless they specifically return to /path.html

**Walker / map bugs**
- [x] ✅ Walker repins on scroll + resize + ResizeObserver (path.js:1019,
      page-relative coords via scrollX/Y — shipped 2026-05-13).
- [ ] Walker emoji doesn't update immediately on level-up (stale stats
      ref in path.js — race with cosmetics.ensureCatalog)
- [x] ✅ Confetti capped at MAX_CONFETTI_CONTAINERS, oldest evicted
      (path.js:156 — shipped 2026-05-13).

**Visual / UX bugs**
- [x] ✅ Path header was max-width: 560px (fixed 2026-05-12 — full width)
- [ ] Mini-game cards (TF + match) have inconsistent padding compared
      to flashcards
- [ ] Sub-boss / Final-boss node visuals are large but the bottom-sheet
      "Start →" is misleading (sends to a different page, no preview)
- [x] ✅ Locked-node 🔒 badge visible on mobile via `@media (hover: hover)`
      gate (path.css:1219 — shipped 2026-05-13).
- [x] ✅ Path index brand-name dedupe: brand label hidden when title already
      contains the first brand word (path.js:751 — shipped 2026-05-13).
- [x] ✅ Daily quest banner hidden on `/path.html?pack=…` — already gated
      in `src/daily.js` (per CLAUDE.md, verified 2026-05-13).

### 4.2 — Architectural decisions for the rework

**Decision 1: Quiz nodes execute inline, not via train.html redirect.**
Build a stripped-down quiz engine inside `src/path.js` that:
- Loads the focused `questionIds` from the path node
- Renders one question at a time in the bottom-sheet
- Tracks correct/wrong, hearts, time
- Dispatches `cq:session-complete` on finish
- Closes the sheet, marks node complete, advances walker
Benefits: no redirect/handshake mess, focused question subset honored,
hearts decrement live, consistent UX with concept/mini-game nodes.
Risk: code duplication with existing quiz engine. Mitigation: extract
the shared question-rendering bits into `src/quiz-core.js` and reuse.

**Decision 2: Every node type follows the same lifecycle.**
```
openNodeSheet(node)
  → sheet opens with title/desc/meta + primary button "Start →"
  → user taps Start
  → node-specific content renders INLINE (concept cards / quiz / TF /
    match / chest / mock-exam)
  → primary button transforms to context-aware label
    ("Mark complete" / "Continue" / "Open chest" / "See score")
  → user taps it → mark complete + fire session-complete + close sheet
  → walker hops forward; possible confetti / level-up / chest
```
The DUAL-STATE Start button pattern I introduced for concept becomes
the universal pattern for ALL node types.

**Decision 3: Hearts decrement IS the gating mechanism.**
- Each wrong answer in quiz / TF / match → 1 heart lost
- 0 hearts → lock all path nodes for 30 min (with countdown chip in
  header)
- Free heart = complete a course/concept node (already partially built)

**Decision 4: Per-node state machine documented in code.**
Each node type defines:
- `prepare(node)`: prep DOM in sheet (idempotent)
- `start(node)`: begin the activity
- `finish(node, result)`: handle completion → mark + advance
- `cleanup(node)`: tear down before next sheet open

### 4.3 — Build order (concrete tickets, in priority)

**4.3.1 — Foundation (1 day)**
- [ ] Refactor `src/path.js` into modules:
      `path-core.js` (data + progress) ·
      `path-map.js` (render winding map) ·
      `path-sheet.js` (bottom-sheet lifecycle) ·
      `path-nodes/concept.js · quiz.js · minigame-match.js ·
                  minigame-tf.js · chest.js · finalboss.js`
- [ ] Define the `NodeHandler` interface every node type implements
- [ ] Rebuild bundle to include the split modules

**4.3.2 — Inline quiz engine ✅ SHIPPED 2026-05-13**
- [x] ✅ `renderQuizInline()` in `src/path.js` — loads pack, renders MCQs,
      decrements hearts, fires `cq:session-complete`, summary card.
- [x] ✅ Wired quiz / subboss / finalboss to inline path (no redirect).
- [x] ✅ Pending: extract shared bits to `src/quiz-core.js` (deferred —
      can be done as a refactor once 4.3.1 lands).

**4.3.3 — Mini-game fixes — OBSOLETED**
> TF + match were replaced with a single Yes/No quick drill (`renderYesNoInline`,
> CLAUDE.md Phase 3B). The TF click bug + match overflow no longer apply.
> Remaining work folded into 4.3.5 polish.

**4.3.4 — Sub-boss + Final-boss inline ✅ SHIPPED 2026-05-13**
- [x] ✅ Sub-boss renders inline via `renderQuizInline` (questionIds).
- [x] ✅ Final boss picks `questionCount` random Qs from the bank.
- [ ] Countdown timer for final-boss mock (deferred — bank doesn't
      enforce time pressure yet).
- [x] ✅ Survivor / level-up ceremony continues to fire via the
      `cq:laurel-earned` + `cq:level-up` event bus.

**4.3.5 — Walker / visual polish ✅ SHIPPED 2026-05-13**
- [x] ✅ Walker re-positions on scroll + resize + ResizeObserver.
- [x] ✅ Lock badge visible on mobile via `@media (hover: hover)` gate.
- [x] ✅ Locked-node tap-toast on mobile ("Beat the previous boss…").
- [x] ✅ Daily quest banner hidden on `/path.html?pack=…` (per daily.js).

**4.3.6 — Tests (half day)**
- [ ] Unit tests for path-progress.js (mark, isComplete, snapshot,
      laurel awarding)
- [ ] Unit tests for the dual-state Start button helper
- [ ] Manual test plan documented in CLAUDE.md

### 4.4 — Per-node-type spec (target state)

| Type | Time | Inline? | Hearts? | Start label | Finish label | XP |
|---|---|---|---|---|---|---|
| concept | 1-2 min | ✓ inline cards | no | Start → | Mark complete | +5 |
| quiz | 3 min | ✓ inline 5-Q | yes | Start → | See score | 10 |
| minigame-match | 2 min | ✓ inline | yes | Start → | Continue → | 10+combo |
| minigame-tf | 2 min | ✓ inline | yes | Start → | Continue → | 10+combo |
| chest | 10 s | ✓ inline | no | Open chest 🎁 | Continue → | 30 |
| sub-boss | 10 min | ✓ inline 20-Q | yes | Start boss → | See score | 75 |
| final-boss | 60 min | ✓ inline mock | yes | Start exam → | See score | 300 |

### 4.5 — What WON'T change (keep)

- 33 generated path JSONs (data shape stays)
- Walker emoji from `cqStats.stageEmojiForLevel`
- Confetti cascades on chapter end / level-up / final boss
- Cert-Survivor laurels + share PNG
- Daily quest banner (path.html INDEX only)
- Cosmetics + hats inventory on /profile.html
- All test infrastructure (npm test, 33 stats tests)

### 4.6 — Estimated total

~4-6 working days end-to-end. Ship in 4 PRs (one per build-order
section). Each PR keeps the site shippable — no big-bang rewrite.

---

## P1 — Phase 3: Learning-Path Maps (Duolingo-style game) + Accounts

> Largest item on the roadmap. Reframes the site from "take a quiz" to
> "follow a guided journey." Each certification gets a winding path of
> nodes (quizzes, courses, mini-games, boss fights). The player avatar
> (P1 Phase 2) walks the path and evolves with progress. Accounts let
> users keep progress across devices.

### Shipped (2026-05-12)

- ✅ **3A.1 Path data model** — `scripts/gen-paths.js` auto-generates
  `data/paths/*.json` for 33 cert packs from existing question banks
- ✅ **3A.2 Path renderer** — `path.html` + `src/path.js` + `path.css`,
  winding S-curve map of nodes, locked/unlocked/done/current states
- ✅ **3A.3 Quiz integration** — `cq:session-complete` from `quiz.js`
  + `cq-path-pending` handshake marks nodes done after quiz returns
- ✅ **3A.4 Hearts/lives** — `src/hearts.js` (5 max, regen 30 min,
  modal with countdown)
- ✅ **3A.5 Concept node** — inline flashcards (flip-cards), +5 XP
- ✅ **3A.6 Mini-game node** — inline match-up, lose heart on wrong, +10 XP
- ✅ **3A.7 Sub-boss / final-boss routing** — opens train.html with qids
- ✅ **3A.8 Walker** — player avatar (stage emoji) sits on current node,
  walks forward on completion, evolves with level
- ✅ **3A.9 Confetti** — chapter-end / level-up / final boss bursts
- ✅ **3A.10 Discovery** — "🗺️ Learning paths" entry in hamburger menu

### Pending (concrete tickets)

**3B — Game feel & content polish** SHIPPED
- ✅ **3B.1 Treasure-chest node** — auto-inserted after each chapter
- ✅ **3B.2 First cosmetic set** — 13 hats (chapter rewards + level gates)
- ✅ **3B.3 Daily quest banner** — clear 1 node → +20 XP, resets at midnight
- ✅ **3B.4 Combo flash in mini-game** — ×N XP multiplier overlay
- ✅ **3B.5 True/false speed-run** — second mini-game type, alternates per chapter
- ✅ **3B.6 Path index page** — `/path.html` (no query) shows all 33 paths
- [ ] **3B.7 AI-drafted concept content** — `scripts/gen-concepts.js`
      Pending: needs LLM API decision + budget approval.

**3C — Cosmetic & social moments** SHIPPED (all 4 items)
- ✅ 3C.1 Cosmetic inventory UI — `/profile.html` Hats section (tap to wear)
- ✅ 3C.2 Cert-Survivor laurels — auto-awarded on `final-boss` complete,
      persistent badges on `/profile.html`, fired via `cq:laurel-earned`
- ✅ 3C.3 Shareable PNG — canvas-rendered 1080×1080, Web Share API + download
- ✅ 3C.4 14-day streak heatmap — `sessionDates[]` in stats, today highlighted

**3D — Accounts (Supabase)** — SHIPPED in 5 rounds (2026-05-12)
- ✅ **3D.1 Supabase project + tables (profiles, stats, path_progress,
       laurels, cosmetics, hearts, daily) + RLS** — Round 1.
       Project `certquests` / `zhxnteqtiyqnyidfkivj`, 7 tables all
       RLS-enabled with owner-only policies, handle_new_user trigger
       on auth.users insert, set_updated_at trigger function.
- ✅ **3D.2 Auth UI** — Rounds 1+2. Magic-link first, then email+password
       in a tabbed modal, Google OAuth button. Header chip swaps signed-
       in / signed-out. Capacitor-aware redirect (`capacitor://localhost`).
- ✅ **3D.3 Anonymous → account sync on first sign-in** — Round 3.
       `src/sync.js` bootstrap probes the cloud's stats row; if missing,
       pushes every cq-* localStorage key to the corresponding table.
- ✅ **3D.4 Google OAuth** — Round 2. (GitHub still optional — provider
       toggle in Supabase dashboard, no code change needed beyond
       calling `signInWithProvider('github')`.)
- ✅ **3D.5 Multi-device hydration on load** — Round 3. On subsequent
       sign-ins the same bootstrap pulls cloud → localStorage and fires
       cq:*-changed events so the UI re-renders.
- ✅ **3D.6 Profile-page account integration** — Round 4. Username edit
       via `update_my_username` RPC, "Delete account & all data"
       (cascade through 7 tables), sign-out, sync-status badge.
- ✅ **3D.7 Password reset flow** — Round 5. `/reset-password.html`
       callback page; "Forgot password?" link in the auth modal.

**3E — Avatar Phase 2B (custom SVG art)** — DEFERRED
- [ ] 3E.1 Design 30 SVG character stages (replace emoji placeholders)
- [ ] 3E.2 `STAGE_ART_TYPE` flag in `stats.js` to switch emoji→SVG
- [ ] 3E.3 SVG asset pipeline (single sprite sheet or per-file)

**Quality pass** SHIPPED
- ✅ Accessibility — `src/a11y.js` injected on all 88 pages. Focus-trap
     auto-attaches to any visible `[role="dialog"][aria-modal="true"]`,
     restores focus to the trigger element on close. ESC dispatches
     `cq:a11y-escape` so close-policy stays with the modal owner.
- ✅ SEO on `/path.html` — now indexable, full OG + Twitter Card +
     JSON-LD WebPage schema + sitemap entry (priority 0.95)
- ✅ Offline support — `/data/paths/*.json` + `/data/cosmetics.json`
     cached stale-while-revalidate; full path map works offline
- ✅ Unit tests — 33 characterization tests for `src/stats.js` via
     Node's built-in test runner (`node --test`). Pin XP formula,
     30-level thresholds, streak rules, applySession edge cases.
- ✅ stats.js is now Node-compatible — exports CommonJS when run
     outside the browser, IIFE side effects guarded by IS_BROWSER.
- ✅ `package.json` — `npm test`, `npm run gen-paths`, `npm run build-core`
- ✅ Lazy mascot — `src/mascot-loader.js` injects mascot.js only on
     first interaction or after 8s idle. ~6 KB saved on bounce traffic.
- ✅ JS bundle — `src/cq-core.js` (37 KB) concatenates 7 modules
     (a11y/stats/avatar/hearts/cosmetics/daily/menu) → 6 fewer HTTP
     requests per page load. Build: `npm run build-core`.
- ✅ Defensive guards — `path.js` walker + `avatar.js` chip render
     safe baselines if `window.cqStats` isn't ready yet.
- ✅ `gen-paths.js` reports — writes `data/paths/_skipped.json` with
     structured `{packId, reason, …}` entries so we can see which
     packs failed (parse-error, too-few-questions, no-viable-chapters)

### Remaining

- [ ] **3B.7 AI concept content** — needs LLM API + ~$20 budget
- ✅ **3D Supabase accounts** — SHIPPED 2026-05-12 in 5 rounds (see above)
- [ ] **3E custom SVG avatars** — 30 designs to replace emoji placeholders
- [ ] **Resolve 6 merge-conflict question JSONs** —
      `data/free/{aws-saa-c03,aws-dva-c02,aws-cloud-practitioner,
      comptia-security-plus,az-104,gcp-ace}.json`. Currently silent-skipped
      in `data/paths/_skipped.json`. User must merge manually.
- [ ] **Path completion ceremony** — full-bleed confetti + survivor laurel
      reveal animation when the final boss is cleared (currently just
      awards the laurel; the reveal is muted)
- [ ] **Lighthouse audit pass** — contrast ratios on new color tokens,
      keyboard navigation on path map nodes (Tab through them)
- [ ] **Bundle size budget** — `cq-core.js` is 37 KB. If we add more
      modules, consider minification (esbuild) or further code-splitting.

### Open questions

- **AI for concept content (3B.7)**: which LLM + budget?
  Recommend Claude (Anthropic API) — ~$0.50/pack for 33 packs ≈ $17 one-shot.
  Run once via `scripts/gen-concepts.js`, commit JSON output.
- **Mock exams for final boss**: use existing /train.html full-exam flow
  as-is, or build a dedicated path-final UI with the survivor-laurel reveal?
- **Cosmetic art**: emoji-stack (cheap and fast) vs. SVG (designed,
  slower). Currently emoji; can upgrade to SVG with a flag flip.



### 3.0 — Vision in one paragraph

Every certification (AWS SAA-C03, Security+, AZ-104, CCNA, etc.) has a
~30-50-node **path** that takes a complete beginner to exam-ready. Nodes
are varied (quiz, micro-course, lab sim, mini-game, sub-boss, final boss)
so the loop stays fresh. The path is **gated** — finish node N to unlock
N+1. The map UI is a winding vertical scroller (mobile-first) with the
player's avatar standing on the current node and walking forward on
completion. Mid-path sub-bosses gate chapters; a final boss = full mock
exam. Avatar evolves through 30 stages tied to XP + streak (see Phase 2).

### 3.1 — Node types

| Icon | Type | What it is | Time | XP |
| --- | --- | --- | --- | --- |
| 🎯 | **Quiz** | 5-10 Qs on a topic | 3 min | 10 |
| 📖 | **Course** | Short reading / diagram + key-points recap | 5-8 min | 15 |
| 💡 | **Concept** | Single-screen cheatsheet, "tap to flip" cards | 1 min | 5 |
| 🧪 | **Lab** | Interactive sim (config a VPC, set a policy) | 5-15 min | 30 |
| 🎮 | **Mini-game** | Drag-match-sort (e.g. match OSI layer to protocol) | 2 min | 10 |
| 👹 | **Sub-boss** | 20-Q harder test on one chapter | 10 min | 75 |
| 👑 | **Final boss** | Full-length mock exam (cert-sized) | 60 min+ | 300 |
| 🌟 | **Bonus** | Optional side-quest (war stories, edge cases) | 5 min | 20 |

Failing a boss locks you for 30 min (cooldown) OR forces a remediation
quiz on the failed topic before retry — keeps it spicy without being
punitive.

### 3.2 — Path structure (per certification)

- **Chapters**: 5-7, each one exam domain (e.g. SAA-C03 has 4 domains
  → 4 chapters; CompTIA Sec+ has 5 → 5 chapters)
- **Nodes per chapter**: 5-8 mixed (3-4 quizzes + 1-2 courses + 1
  mini-game/lab + 1 sub-boss at the end of the chapter)
- **Final boss**: at the path's tail
- **Bonus nodes**: branch off the main line, optional, give a cosmetic
  badge for the avatar (e.g. "AWS Survivor")
- **Re-traversal**: completed nodes can be re-played for fun (no extra
  XP, but accuracy is tracked → improves mock-exam predicted score)

Path data lives in `data/paths/<pack-id>.json`. Schema:

```jsonc
{
  "packId": "aws-saa-c03",
  "title": "AWS Solutions Architect Associate",
  "chapters": [
    {
      "id": "ch1", "title": "Design Resilient Architectures", "domain": 1,
      "nodes": [
        { "id": "q1", "type": "quiz", "title": "EC2 basics", "questionIds": [12,15,22,38,41] },
        { "id": "c1", "type": "course", "title": "What's an AZ?", "md": "/data/courses/aws/az-vs-region.md" },
        { "id": "g1", "type": "minigame", "title": "Match the service", "config": {…} },
        { "id": "b1", "type": "subboss", "title": "Resilience Boss", "questionIds": […20…] }
      ]
    }
    /* … */
  ],
  "finalBoss": { "type": "mock", "examLength": 65, "timeMinutes": 130 }
}
```

### 3.3 — Map UI

- **Mobile-first vertical scroller** (the canonical Duolingo layout)
- Winding S-curve path; each node is a 72px circle on mobile / 88px desktop
- **States**: locked (grey, dimmed) · unlocked (colored, pulsing) ·
  current (bigger ring, avatar standing on it) · completed (green check)
- **Chapter dividers** with title banner; sub-boss = bigger circle with
  red glow + crown icon
- **Final boss** = large hex shield at the very bottom
- Path **lines** connect nodes: dashed for locked, solid for unlocked
- **Avatar** sprite stands on the current node; on node-complete it
  walks forward to the next (CSS keyframe animation along an SVG path)
- **Scroll-to-current** on load
- Tap a node → bottom-sheet with title + description + START button
- Hold node → preview the questions/content without committing

### 3.4 — Game feel (the "make it fun" pieces)

- **Combo meter**: consecutive correct answers within a node compound XP
- **Streak fire**: 7+ day streak unlocks a fire trail around the avatar
- **Hearts/lives**: 5 hearts; wrong answer = -1; regenerate over time
  or by completing a free course node ("free heart")
- **Treasure chests**: random drop at chapter end → cosmetic (avatar
  hat, banner, frame)
- **Sound design**: short "ding" on correct, descending tone on wrong,
  fanfare on chapter end (optional, off by default)
- **End-of-path ceremony**: full-bleed confetti + avatar gets a
  "<Cert>-Certified Survivor" laurel that persists in profile
- **Daily quest** in the corner ("clear 1 node today" → bonus XP)
- **Leaderboards** (P2 stretch): weekly XP among logged-in users

### 3.5 — Avatar / Phase 2 integration

The Phase 2 avatar system (already specced above) plugs in directly:
- Path completion fires `cq:session-complete` and `cq:node-complete`
- Avatar walks the path visually (transforms applied along node positions)
- Sub-boss kills trigger `cq:level-up` more frequently → noticeable
  evolution as the user climbs
- Final-boss victory unlocks the next arc's avatar early as a bonus

### 3.6 — Accounts (the new big thing)

#### Why
- Multi-device: continue on desktop and phone with same XP/progress
- Resume across years
- Future social features (leaderboards, friends)
- Optional — anonymous play stays the default

#### Auth model — recommendation: **Supabase**
Comparison done; reasoning:
- **Cloudflare D1 + Workers** — already on Cloudflare (`wrangler.jsonc`).
  Cheap, fast at edge, but auth is DIY (sessions, password hashing,
  email verification all hand-rolled). 2-3 weeks of work.
- **Supabase** — managed Postgres + Auth + magic-links + OAuth providers
  out of the box. Free tier covers ≥10k users. Drop-in JS SDK. ~3 days
  to integrate. Lock-in risk is mild (data is portable Postgres).
- **Clerk / Auth0** — best auth UX, but pricey above small user counts.

**Pick Supabase** unless we have a strong reason to stay 100%
Cloudflare. Supabase + the existing Cloudflare-hosted static site is a
clean split: front-end on CF, auth/data on Supabase.

#### Sign-up methods
1. **Email + magic link** (no password) — lowest friction, ships first
2. **Google OAuth** — second priority
3. **GitHub OAuth** — third (free for our tech-leaning audience)
4. **Email + password** — only if users request it

#### Database schema (Postgres / Supabase)

```sql
-- managed by Supabase Auth
auth.users(id uuid pk, email text, …)

-- our app tables
profiles(
  id uuid pk references auth.users(id),
  display_name text,
  avatar_unlock_max int default 1,        -- highest avatar level reached
  cosmetics jsonb default '[]'::jsonb,    -- {hats,banners,frames}
  created_at timestamptz default now()
)
stats(
  user_id uuid pk references profiles(id),
  total_seconds int default 0,
  questions_answered int default 0,
  correct_answered int default 0,
  sessions_count int default 0,
  streak_days int default 0,
  last_session_date date,
  xp int default 0,
  level int default 1,
  updated_at timestamptz default now()
)
pack_progress(
  user_id uuid references profiles(id),
  pack_id text,
  node_id text,
  status text check (status in ('completed','in_progress')),
  best_score numeric,
  attempts int default 1,
  last_played_at timestamptz default now(),
  primary key (user_id, pack_id, node_id)
)
mock_exams(
  user_id uuid, pack_id text, score numeric, total int, time_seconds int,
  finished_at timestamptz default now()
)
```

Row-Level Security (RLS) policies: users can only read/write their own
rows.

#### Sync strategy — anonymous → account

Anonymous users build up localStorage state. On sign-up:
1. Read all localStorage data
2. POST to Supabase via authenticated client
3. Server merges: take max(xp), sum totals, union completed nodes,
   max streak
4. On success, clear localStorage and switch to "remote" mode

After sign-in, every `cq:session-complete` writes to both localStorage
(immediate UI) AND debounced to Supabase (every 5s, batched). On load,
hydrate from Supabase, replace localStorage.

#### UI affordances
- **"Sign up to save your progress"** banner appears once XP > 200 if
  anonymous (don't nag earlier — let them experience the loop first)
- **Profile chip** replaces avatar chip when logged in: shows
  display-name initials + level
- **Settings → Account**: change email, sign out, delete account
  (full data purge — GDPR-clean)

### 3.7 — Concrete build order

Phase 3A (path UI, no backend) — 1-2 weeks dev
1. Path JSON schema + AWS-SAA-C03 first pilot file
2. `/path/<pack-id>` route + map renderer (SVG winding)
3. Node states from localStorage (already-completed pack questions)
4. Wire existing quiz screen as the "quiz node" handler
5. Avatar position on path + walk animation between nodes

Phase 3B (richer nodes) — 2-3 weeks dev + content
6. Course node renderer (Markdown → reading view)
7. Concept-card node (flip cards)
8. Mini-game node engine (one game type to start: match-drag)
9. Sub-boss = existing quiz with harder filtering
10. Hearts/lives system

Phase 3C (final-boss + ceremony) — 1-2 weeks
11. Final-boss = existing full-length mock from `train.html`
12. End-of-path confetti + cert-survivor laurel
13. Avatar cosmetic system (hats, banners)
14. Treasure chests + RNG cosmetic drops

Phase 3D (accounts) — 1-2 weeks
15. Supabase setup + RLS policies + types generated
16. Magic-link sign-in/sign-up UI
17. Google OAuth (+ later: GitHub)
18. Anonymous → account sync migration
19. Multi-device hydration on load
20. Settings → Account (delete, export, change email)

Phase 3E (social, much later)
21. Friend invites
22. Weekly leaderboards (XP within friend circle)
23. Path completion shareable cards (Twitter / LinkedIn)

### 3.8 — Open questions before starting

- **Content authoring**: who writes the course-node Markdown content
  for ~12 packs × ~5 chapters? Pure AI-gen is risky for cert accuracy.
  Hybrid: AI draft + human review.
- **Lab/mini-game scope**: too much engineering for v1? Maybe ship 3A
  + 3D with only quiz/course/concept node types, defer mini-games + labs.
- **Hearts/lives ruining the vibe?** Duolingo's biggest UX gripe. We
  could ship without lives and reintroduce only if engagement data
  shows users binge-quitting.
- **Mock-exam length**: full 65 questions in one sitting on mobile is
  rough. Allow pause+resume? (Yes, but with a 24h max.)
- **Path linearity**: strict linear gating vs. branching choices? V1 =
  strict linear (simpler, mirrors Duolingo). V2 could open up choice.
- **Existing /train.html flow**: keep it as a non-gated free-play mode?
  Yes — power users will want it. The Path is for newcomers and the
  full structured journey.

### 3.9 — Smallest demo-able slice

If we ship one thing to validate the concept:
1. Build the SVG path map for **one cert** (AWS Cloud Practitioner —
   shortest, friendliest, broadest audience)
2. Wire ~20 nodes (mix of quiz + concept-card only — skip lab/game/boss)
3. Use existing question bank for the quiz nodes
4. Player avatar standing on current node, walks on completion
5. No accounts yet — pure localStorage
6. Soft-launch behind a `/path/aws-cloud-practitioner` URL, link from
   the homepage "Find a cert" CTA
7. Measure: completion rate per chapter, drop-off, time-to-finish

That's the **MVP for validation** — ships in ~1 week instead of months.
Iterate from there.

---

## P1 — Duolingo-style characters · Phase 2 (player avatar)

### Status
- ✅ Phase 1 shipped 2026-05-11: floating 🦉 owl mascot (bottom-right).
  Rotating tips, dismissible 12 h, idle wave every 18 s, continuous bob +
  glow + status-dot pulse animations.
  Code: `src/mascot.js`, CSS in `src/styles/desktop.css` (MASCOT WIDGET).
  **The main mascot is locked — design will not change going forward.**

### Decisions (locked)
- **Position:** header chip — left of the logo on every page. Visible at
  all times, contextual progress marker, doesn't compete with the corner
  mascot. Mobile: shrinks to icon-only (32 px circular badge). Desktop:
  icon + thin XP bar + level label.
- **Phase 2A ships with emoji placeholders** so we can validate the UX
  loop quickly. Phase 2B swaps in the 30 custom SVGs as they're designed.

### 30-avatar evolution roadmap

End target: **30 distinct avatars**. Player progresses through them via
compound XP (time × accuracy × streak). Each level requires ~1.5× the XP
of the previous, so cumulative time-to-Master is realistic (~150-200 h of
serious practice).

Five tiered arcs of 6 stages each. Within an arc, the same character
gradually gains equipment / posture / aura. Crossing arc boundaries
unlocks a new species/form (visible "I leveled up" moment).

#### Arc 1 — Hatchling (levels 1-6) · learning to study
1. 🥚 Untouched egg (default, level 1)
2. 🐣 Egg with a crack
3. 🐤 Just hatched (eyes closed)
4. 🐥 Standing chick
5. 🐥 Chick with study cap
6. 🐥 Chick holding a pencil

#### Arc 2 — Apprentice (levels 7-12) · building habits
7. 🐦 Fledgling
8. 🐦 Fledgling with notebook
9. 🐦 Fledgling with reading glasses
10. 🦜 Colored plumage emerging
11. 🦜 First feathers + scarf
12. 🦜 Apprentice with diploma roll

#### Arc 3 — Trainee (levels 13-18) · domain depth
13. 🦅 Young hawk
14. 🦅 Hawk with backpack
15. 🦅 Hawk + laptop
16. 🦅 Hawk + cloud icon (cert branding)
17. 🦅 Hawk with first medal
18. 🦅 Hawk standing on a server rack

#### Arc 4 — Adept (levels 19-24) · multi-cert mastery
19. 🦉 Sage owl (eyes glow)
20. 🦉 Owl with mortar board
21. 🦉 Owl with stack of certifications
22. 🦉 Owl on a podium
23. 🦉 Owl with lightning bolt (speed badge)
24. 🦉 Owl with constellation aura

#### Arc 5 — Master (levels 25-30) · legendary
25. 👑 Crowned phoenix
26. 👑 Phoenix with rune circle
27. 👑 Phoenix wielding a quill
28. 👑 Phoenix on a throne of books
29. 👑 Phoenix in flight, banner trailing
30. 👑 Phoenix radiating aurora — final form

### Tracked metrics (localStorage, no backend)

- `cq-stats.totalSeconds` — cumulative study time
- `cq-stats.questionsAnswered` — total answered
- `cq-stats.correctRate` — rolling 100-question accuracy
- `cq-stats.streakDays` — consecutive days with ≥1 session
- `cq-stats.lastSessionAt` — for streak detection / reset
- `cq-stats.perPack[packId]` — per-cert breakdown (top cert reflects
  in the avatar's themed accessory)
- `cq-stats.xp` — derived; saved to avoid recomputing

### XP formula (rough)

```
xp = totalSeconds / 60                              // 1 XP per minute
   * clamp(correctRate, 0.5, 1.2)                   // accuracy multiplier
   + streakDays * 8                                 // streak bonus
   + completedSessions * 2                          // commitment bonus
```

Level N requires: `XP_required(N) = round(50 * 1.18^(N-1))`. Level 30 ≈
12 000 XP (~200 h serious study + streak + accuracy).

### Level-up moment
Confetti burst + main mascot bubble: "Level up! You're now <stage name>."
Brief 1-second avatar scale-up + glow pulse. New avatar persists.

### Tap-the-avatar panel
- Current level + stage name + XP bar to next
- Top 3 certs by time spent (with mini brand badges)
- Streak count + 14-day heat-map (filled green = practiced)
- "Reset progress" link with confirm modal

### Contextual main-mascot tips (Phase 2.5)
The owl's tip pool queries stats and prefers contextual tips:
- low streak → "It's been 3 days — brain forgets fast. 5-Q quiz?"
- low accuracy on pack X → "AWS networking tripping you up? Try a VPC
  focus quiz."
- high streak → "10-day streak! 🔥 Keep it going."
- new level reached → tied to level-up moment, not idle rotation

### Wiring
- `src/screens/quiz.js` / `src/screens/results.js` dispatch
  `cq:session-complete` event with detail `{packId, secondsSpent,
  questionsAnswered, correct}`
- New `src/stats.js`: reducer over the event → updates localStorage + XP
- New `src/avatar.js`: listens for stats change → re-renders the header
  chip + fires `cq:level-up` event when crossing a level boundary
- `src/mascot.js` already responds to events for contextual tips

### Build order (concrete tickets)

1. **Stats reducer** (`src/stats.js`) + emit `cq:session-complete` from
   quiz/results screens. Verify on console first; no UI yet.
2. **Header avatar chip** with emoji stage + XP bar. Read-only display.
3. **Level-up moment** (confetti + animated stage swap).
4. **Tap-to-panel** modal.
5. **Contextual mascot tips** (Phase 2.5).
6. **SVG character set** — 30 unique artworks. Design pass; can use
   AI-assist + manual cleanup for the first version. Drop into
   `src/assets/avatar/lvl-01.svg` … `lvl-30.svg`. Switch source from
   emoji to SVG via a single `STAGE_ART_TYPE` flag.

### Open Qs
- None currently — position locked, roadmap locked, target locked.

---

## P0 — Rewrite all 2,520 questions to remove tells and match real exam difficulty

**Why this matters:** the question bank has three problems that make it
unreliable as exam preparation:

1. **"Longest answer always wins."** A user can ace many quizzes by always
   picking the longest option without reading the question. This is a known
   anti-pattern in machine-generated or carelessly-written question banks
   and it's a brand-trust issue — anyone who notices stops believing the
   site is serious prep.
2. **Difficulty is too low.** Questions test recall ("what is X?") rather
   than scenario reasoning ("a customer reports Y, what's the cause?").
   Real exams are scenario-heavy and trade-off-heavy; ours are not.
3. **Doesn't reflect the real exam.** Wording, distractor design, and
   coverage shape don't match what candidates encounter on AWS, CompTIA,
   Cisco, Microsoft exams. Passing CertQuests doesn't predict passing the
   real exam, which is the only thing the site is for.

This is "take as long as needed" work. Do it right; don't ship rushed
batches. **Treat the rewrite as the core deliverable for the next two
quarters of content work.**

### Acceptance criteria — every rewritten question must

- [ ] **Pass the longest-answer test.** Across a pack, the correct answer
      should NOT correlate with answer length. Run a script that flags any
      pack where correct-answer-length is reliably above the distractor mean.
      Target: correct answer is the longest in ≤ 30% of questions per pack.
- [ ] **Pass the keyword-tell test.** No question where one option contains
      a keyword from the stem and is therefore obviously correct
      ("Which protocol uses port 443?" → option mentioning "HTTPS").
- [ ] **Use distractor design from the real exam blueprint.** Distractors
      should be plausible-but-wrong concepts — common confusions, similar
      services, off-by-one parameters — not random unrelated options.
      "AWS RDS / AWS DynamoDB / AWS S3 / a banana" is wrong. Real exams use
      "RDS Multi-AZ / RDS Read Replica / RDS Backup / Aurora" — all
      database-tier, distractor design forces the candidate to know the
      *difference*.
- [ ] **Match the real exam's scenario weight.** For associate-tier and
      above (SAA, CySA, CCNA, AZ-104, etc.), at least 50% of questions
      should be scenario-based — a 3-4 sentence setup describing a
      customer/situation, then the question.
- [ ] **Match the real exam's difficulty distribution.** Roughly 30% easy,
      50% medium, 20% hard per pack. Currently we lean far too easy.
- [ ] **Tag every question with at least 2 tags.** First tag is the primary
      domain (must match the official exam blueprint section). Second tag
      is the sub-topic. This makes the diagnostic actionable.

### Methodology

The rewrite is a 5-step pipeline per pack:

1. **Audit the existing pack.** Run a script that flags:
   - questions where the correct answer is the longest
   - questions where the correct option contains a stem keyword
   - questions with < 3 sentences (likely recall-only)
   - questions tagged with < 2 tags
   This produces a per-pack rewrite list, sorted worst-first.
2. **Pull the real exam blueprint** from the vendor (AWS exam guide,
   CompTIA objectives PDF, Cisco blueprint, etc.) and re-tag every
   question to a blueprint section.
3. **Rewrite stems and distractors.** Stems → scenario-shaped where
   applicable. Distractors → plausible same-domain alternatives. Length
   → roughly equalize correct vs incorrect answer length.
4. **Peer-review pass.** Each rewritten question reviewed by a second
   engineer (or by the public issue tracker after merge).
5. **Calibrate difficulty.** After ~50 questions in a pack are rewritten,
   sample a small group of cert holders and a small group of pre-cert
   candidates. Difficulty is right when ~70% of holders pass first time
   and ~30% of candidates pass first time on a 20-question slice.

### Suggested order (highest leverage first)

Pick by traffic × candidate stakes. Roughly:

1. **AWS SAA-C03** — highest-traffic associate cert, hardest reputation hit
   if our prep doesn't predict the real exam.
2. **CompTIA Security+** — gateway cert, large funnel, "longest answer
   wins" hurts trust the most.
3. **CCNA 200-301** — Cisco audience is the most discerning about exam
   difficulty.
4. **AZ-104** — Microsoft-shop traffic is growing.
5. **CKA** — small but committed audience that compares against killer.sh.
6. **All remaining packs** in question-volume order.

### Where the audit script should go

**✅ SHIPPED 2026-05-13** — `tools/audit-questions.mjs`:

- Reads each `data/free/*.json`
- Per-question signals: `lengthTell`, `keywordTell` (with the
  shared word surfaced), `recallOnly` (< 18-word stem),
  `underTagged` (< 2 tags)
- Output: `audits/questions/_summary.md` (per-pack ranking,
  worst-first) + `audits/questions/<packId>.csv` (per-question,
  sortable in any spreadsheet)
- First run: **49 packs · 2 692 questions · 2 093 flagged (77.7 %)**
- High-leverage start: `aws-saa-c03` (47 % flagged, all
  keyword-tells), `comptia-security-plus` (87 %), `ccna` (45 %),
  `az-104` (48 %).

Reversal of the original ordering: the script *is* shipped before
the first rewrite, but as a tool only. Use it to pick the next
batch — do not treat its scores as ground truth, treat them as a
suggestion ranked worst-first.

### How to track progress

Per-pack progress lives in `data/index.json` — add a field
`rewrite_status: 'unaudited' | 'audited' | 'in-progress' | 'rewritten' | 'verified'`
to each pack. Surface "verified" packs with a small badge on the
homepage cert grid so users can see which packs are calibrated.

---

## P1 — Other content / product items

(items below are smaller and unrelated to the question rewrite — kept here
so they don't get forgotten)

- [ ] Audit the Vigicrues `CdStationHydro` for live flow data on the
      Seine briefing dashboard (separate project).
- [ ] Sell-through log: accept nightly POSTs and train a regression on
      sales vs briefing signals (separate project).
- [ ] After step 3 (accounts) ships from `docs/careers-next-steps.md`,
      add a public profile page at `/u/<handle>` so users can share
      progress.

---

## Done

- ✅ 2026-04-27 — `/careers/*` career-paths layer (PR #15)
- ✅ 2026-04-27 — Onboarding goal picker, resume banner, diagnostic
  mode, QotD (PR #16)
- ✅ 2026-04-27 — Diagnostic differentiation: framing screen,
  difficulty-stratified sampling, weighted readiness (PR #17)
- ✅ 2026-04-27 — QotD monotonic local-day seed + visible date stamp
