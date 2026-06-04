# CertQuests — TODO

Living TODO. Items here are not dropped on the floor; they're things to pick
up when there's time.

> ## Scope: web + responsive mobile web only
>
> Every ticket below is web work — static HTML/CSS/JS, Supabase, content
> generators. The Android wrapper lives in a separate repo and is out of
> scope for this file. See `CLAUDE.md` for the compat-shim notes
> (`app-mode.js`, `is-app` body class, Capacitor branches in `auth.js`).
>
> Quick triage:
>
> | If the user said… | Pick from… |
> | --- | --- |
> | "work on the roadmap" / "go on" | **P0 UX overhaul (below)** first, then Phase 6 follow-ups, then question rewrite |
> | "SEO" / "content" / "more pages" | Remaining Phase 6 items, careers articles, news, learning hubs |
> | "polish the UI" / "fix a UI bug" | Read the file path, walk the 360 / 768 / 1440 cascade before reporting done |
> | Shared-layer task (cache bump, sw.js, sync-header, test fix) | Just do it |

---

## P0 — UX overhaul (2026-05-20, HIGH priority)

> Batch of UX defects + reworks reported by the owner on 2026-05-20.
> Order below is rough priority. Every item must be walked through the
> 360 / 768 / 1440 cascade before being marked done (see CLAUDE.md).

### UX-1 — Homepage goal-picker missing on desktop ✅ DONE 2026-05-20

- The "What brings you here today?" goal-picker (`renderGoalPicker` in
  `src/onboarding.js`) only rendered for first-time visitors; returning
  visitors saw *only* the thin resume banner, so the box "disappeared".
- **Fix shipped:** `boot()` now appends the resume banner (when there
  is history) **and** the goal-picker, instead of one-or-the-other.
  Returning visitors get "Welcome back · continue X" above the full
  "What brings you here today?" hub.

### UX-2 — Mobile top-bar wraps to two lines / objects jump ✅ DONE 2026-05-20

- **Root cause:** the homepage had its OWN mobile header in
  `home-mobile.css` (`@media max-width:767px`) — a `display:grid
  44px 1fr 44px` definition — while every other page used
  `desktop.css`'s `@media max-width:1023px` `flex nowrap` block. Both
  carried `!important`; home-mobile.css loads last, so the homepage
  header became a grid container also carrying leftover flex
  properties from the desktop.css block. A CSS grid spills extra /
  unplaced children into an implicit second row — that was the "two
  lines"; the grid/flex hybrid was the "jumping".
- **Fix shipped:** removed ALL `.web-header*` overrides from
  `home-mobile.css` (the grid block + an earlier padding/gap block).
  `desktop.css`'s `@media max-width:1023px` block is now the SOLE
  authority for the mobile header on every page — `flex-wrap:nowrap`,
  logo left (ellipsis, `max-width:calc(100% - 60px)`), hamburger
  right, nav hidden. A `nowrap` flex row cannot wrap to two lines;
  the logo is pinned left so the hamburger fading in no longer shifts
  it. index.html's inline `.web-header` rule only sets sticky/blur.

### UX-3 — Account-creation modal is confusing ✅ DONE 2026-05-20

- The modal jumped from a 2-word eyebrow straight to tabs — no
  explanation of *why* you'd make an account.
- **Fix shipped:** added a value-proposition subtitle (`.cq-auth-sub`,
  a class that was already styled but unused) that `switchTab` keeps
  tab-aware — Create: "Free, 30 seconds. Your XP, streak, hats and
  laurels sync across every device. No marketing email." / Sign in:
  "pick up your XP, streak and laurels — synced across every device."
  Eyebrow changed to "Free account". Google OAuth stays the fast path.
- The profile-page guest CTA now opens the **Create-account** tab
  (`openSignUp`) — an anon user on `/profile.html` is almost always
  new; landing them on the Sign-in form was the confusing part.

### UX-4 — `/path.html`: resume + switch path ✅ DONE 2026-05-20

- **Fix shipped:** `path.js` writes `cq-path-last-pack` whenever a
  pack's path loads. A bare `/path.html` visit now resumes that pack
  (`history.replaceState` reflects it in the URL) instead of showing
  the picker; `renderMap` already auto-scrolls to the current node,
  so the user lands "where they left". First-timers (no stored pack)
  still get the picker. A stale stored pack falls back to the picker
  gracefully instead of an error screen.
- Added a "↔ Change path" pill in the `.path-header` → `/path.html?pick=1`,
  which forces the picker even when a last-pack exists.
- Applies on all devices (resume is good UX everywhere; the Change
  path control is the escape hatch) — not gated to desktop.

### UX-5 — `/path.html` pack-picker tiles are ugly ✅ DONE 2026-05-20

- The Cert Quest index grid (`.path-index-card`, rendered by
  `renderPathIndex` in `src/path.js`) lacked the vendor icon box that
  makes the `/certifications/` `.cert-index-card` tiles look polished.
- **Fix shipped:** added a `brandEmoji()` map in `path.js` (mirrors
  the `/certifications/` vendor emojis — ☁️ AWS, 🪟 Microsoft,
  🛜 Cisco, ☸️ CNCF, 🐳 Docker, 🏗️ HashiCorp, 🎩 Red Hat, …) and a
  `.path-index-icon` box in `path.css` copied from `.cert-index-icon`
  (40×40 rounded, brand-tinted gradient). Card padding bumped
  16→18px to match. The progress bar / % stays — it's the path
  grid's value-add the cert grid doesn't have.

### UX-6 — Courses: rework ALL course detail content

- **Scope confirmed 2026-05-20:** owner wants the written content of
  **all 28 course detail pages** reworked for quality — the layout /
  architecture / design stay, the prose is the problem. Rolling batch,
  sized like the question rewrite (a few packs per session).
- Pages live at `learning/<id>/index.html`; the deep-module shape
  (intro · key concepts · study-note · takeaways · mini-quiz) was the
  *structure* added in the P0 course rework — that stays. The writing
  inside each lesson is what gets the pass: tighter, higher-signal,
  fewer filler sentences, concrete worked examples over generic bullets.
- Suggested order (by traffic, from the old P0 note): Linux (rhcsa,
  comptia-linux) → AWS (clf-c02, saa-c03) → Kubernetes (cka/ckad/cks)
  → Networking (ccna) → Security (security+, cissp-adjacent) → rest.
- Each reworked pack: bump nothing structural, just rewrite prose;
  re-verify the page at 360 / 768 / 1440.

### UX-7 — Career-finder quiz ✅ DONE 2026-05-20

- **Shipped:** new self-contained page at `/career-quiz/` — a
  5-question quiz (domain interest, situation, weekly hours,
  priority, hands-on appetite) that recommends an IT domain + a
  starter certification, then deep-links into `/career-path/`
  (via its `location.hash` form-state contract) for the full
  roadmap and into `/train.html?pack=` to start practising.
- Cross-linked from the `/career-path/` hero ("Pas sûr de ton
  domaine ? Fais le quiz"). sitemap.xml +1. No cache bump — new
  HTML page only, references current `?v=` assets.

### UX-8 — Profile page not optimised on phone ✅ DONE 2026-05-21

- `profile.css` had almost no mobile tuning (one 480px rule). The
  worst offender — the `.profile-hero` — was a 3-item flex row
  (avatar + level block + share button) that squeezed the level
  block on a phone.
- **Fix 1 (2026-05-20):** `@media (max-width:560px)` stacks the hero —
  avatar on top, level block full-width, share button full-width.
- **Root cause of "boxes don't fit" found + fixed (2026-05-21):** the
  generic mobile rule in `desktop.css`
  (`[class$="-grid"]:not(…){grid-template-columns:1fr!important}` at
  `@media max-width:720px`) was collapsing EVERY `*-grid` to one
  column — including `.profile-stats-grid` and `.profile-hats-grid`,
  which carry their own intended mobile layouts. The attribute
  selector + `!important` outranked profile.css's own rules, so the
  6 stat cards and the hat tiles each stacked full-width on a phone.
  Added `:not(.profile-stats-grid):not(.profile-hats-grid):not(.profile-milestones-grid)`
  to the exclusion list — profile.css now governs. Verified by
  headless screenshot at 360 (stats 2-col, hats 2-col) and 768
  (stats/milestones 3-col, no regression). Heatmap (`.profile-heatmap`,
  not a `-grid` class) was never affected — 14-col row fits fine.
  Cache bumped v100 → v101.

### UX-9 — Profile top-bar bug on scroll-to-top — NEEDS REPRO

- Owner: on `/profile.html`, scrolling back to the top leaves header
  items "outside the top bar".
- Traced the header CSS (V17 sticky glass block in `desktop.css` +
  the `≤1023px` flex-nowrap block) — could not reproduce the glitch
  from static analysis; profile.html uses the standard header with
  no page-specific override. **Needs a screenshot** at the exact
  scroll position + viewport width before a safe fix — blind-editing
  the global sticky header risks all 200 pages.
- **2026-05-21:** re-attempted repro via headless Chrome — scrolled
  the profile page to 1200px then back to 0 at 360px width; the
  header (avatar / hearts / mascot / chip / hamburger) renders
  correctly inside the bar at scroll 0. Still cannot reproduce;
  likely a real-device-specific condition (momentum scroll / URL
  bar resize). Left as NEEDS REPRO.

### Full audit — 2026-05-20

Ran a site-wide audit (tests, JS syntax, JSON validity, internal
links, `?pack=` resolution, generator/bundle idempotency, cache
versions, sitemap/courses URL resolution, duplicate IDs).

**Bugs found + fixed:**
- 5 broken `/learning/<id>/` cross-links in the rhcsa + aws-saa-c03
  "related courses" grids (pointed at slugs that don't exist —
  `aws-clf-c02`, `aws-sap-c02`, `linux-plus`, `lpic-1`, `cka`).
- **22 pages** with a `?pack=` query pointing at a non-existent
  pack id — course/learning slugs (`terraform-associate`,
  `az-104-administrator`, …) or legacy ids in `news/` pages
  (`cysa`, `network-plus`, `aws-developer`, …). Every one made
  `train.html` fail to load the quiz. All remapped to real
  `data/index.json` ids; the AIF-C01 news page also corrected from
  the CLF pack to its own `aws-aif-c01`.
- `path.html?pack=aws-clf-c02` (×3) → `aws-cloud-practitioner` (the
  path file is under that slug).

**Known wart (not fixed — migration risk):** the AWS Cloud
Practitioner cert has pack id `aws-clf-c02` (train) but path id
`aws-cloud-practitioner` (`data/paths/`). Links are correct per
context now; aligning the ids would mean renaming the path file +
migrating `cq-path-progress-v1` / Supabase `path_progress` keys.

**Clean:** 120/120 tests, all `src/*.js` parse, 247 data JSON valid,
generators idempotent, cache versions uniform (v100), sitemap +
courses URLs all resolve, no duplicate IDs on key pages.

---

## P0 — UX overhaul round 2 (2026-05-21, HIGH priority)

> Batch of defects + a strategic direction reported by the owner on
> 2026-05-21. Every item must be walked through the 360 / 768 / 1440
> cascade before being marked done (see CLAUDE.md), and verified with
> a real screenshot — round 1 proved static cascade reading misses
> sticky/scroll bugs.
>
> **Product thesis (drives UX-12 → UX-14).** CertQuests' reason to
> exist over "just ask an AI" is **competition + community + visible
> progression**. An AI can already explain any cert topic; what it
> cannot give a learner is a streak to defend, a rank to climb, a peer
> cohort to measure against, and a public profile to show off. Every
> item below should push the product toward a gamified,
> competition-driven, community-driven experience — that is the moat.

### UX-10 — Sticky top-bar escapes its box on scroll-up (phone, non-home pages) ✅ DONE 2026-05-23

- **Symptom (owner, 2026-05-21):** the top bar is correct on the
  homepage but on other pages, on a phone, header items "go outside
  the box" when scrolling back up. This is UX-9 generalised — it is
  not profile-only.
- **Likely cause:** the homepage has its own inline `.web-header`
  rule (sticky/blur only) and round-1 UX-2 made `desktop.css`'s
  `≤1023px` flex-nowrap block the sole authority elsewhere. The
  scroll-up glitch points at the sticky-glass header block (V17 in
  `desktop.css`) interacting with `menu.js`'s scroll-direction class
  toggling (`sync-header.js` / sticky-on-scroll). A header that
  re-pads or re-positions on scroll-direction change, combined with
  iOS URL-bar resize, lets children paint outside the rounded
  container for a frame.
- **Steps:**
  1. Repro on a real phone (or device-emulated Chrome with touch +
     momentum scroll): scroll down a long non-home page (e.g.
     `/certifications/`, `/path.html`, a `careers/` article), then
     flick back to top. Screenshot the exact broken frame.
  2. Diff the homepage header against a broken page — identify which
     property (padding, height, transform, `overflow`, border-radius
     clip) differs at scroll-top.
  3. Fix in the shared `desktop.css` header block so ALL non-home
     pages are corrected at once; do NOT page-patch. Ensure the
     header container clips its children (`overflow: clip`, not
     `hidden` — see CLAUDE.md WebKit sticky note).
  4. Re-verify scroll-down → scroll-up on 3+ page types at 360 width.
- **Supersedes UX-9** (profile-only NEEDS-REPRO note) — close UX-9
  when this lands.

### UX-11 — Learning-path XP popup overlaps the header hamburger ✅ DONE 2026-05-23

- **Symptom (owner, 2026-05-21):** on `/path.html` a popup showing an
  icon + XP overlaps the top-bar hamburger menu, blocking it.
- **Suspect:** a floating reward / cheer toast — `mascot-cheer.js`
  (level-up / unlock toast), the in-session HUD box (`hud.js`), or
  the daily-quest banner (`daily.js`). One of these renders with a
  `z-index` / `top` that lands under the sticky header's tap zone.
- **Steps:**
  1. Identify which component it is (trigger a node completion on
     `/path.html` and watch which toast appears top-right).
  2. Decide fix vs. remove with the owner's intent: the popup IS a
     gamification signal (XP gained) — **keep it but reposition** so
     it never overlaps the header. Either (a) anchor it below the
     sticky header (`top: calc(header-height + 8px)`), or (b) move it
     bottom-centre / bottom-right away from all chrome.
  3. Ensure its `z-index` sits below the header (header must always
     be tappable) and it is dismissible / auto-dismisses.
  4. Verify at 360 / 768 / 1440 — the hamburger must be fully
     clickable while the popup is visible.

### UX-12 — Leaderboard: web/app parity, live sync, gamification promotion ✅ DONE 2026-05-23

- **Goal:** the web leaderboard (`/leaderboard/`, Phase 6.7) should
  reach feature parity with the Android app's leaderboard, share the
  same Supabase data so a user sees one consistent rank everywhere,
  and be promoted as a first-class part of the gamified experience —
  not a buried tool page.
- **Steps:**
  1. Audit the current `/leaderboard/` surface vs. the app's
     leaderboard — list the parity gaps (columns shown, ranking
     metric, time windows, cohort filters, opt-in flow).
  2. **Data layer:** define the canonical leaderboard view in
     Supabase (e.g. a `leaderboard` view or RPC ranking opted-in
     users by XP / streak / accuracy). Both web and app read the
     same source. Respect the existing `profile-leaderboard-row`
     opt-in toggle (`profile.css`) — only opted-in users appear.
  3. **Sync:** leaderboard reads must reflect `cq-stats-v1` after
     `sync.js` write-through, so a session completed on web updates
     the rank the app shows (and vice-versa). No stale snapshots.
  4. **Promotion:** surface rank in high-traffic chrome — a rank
     chip in the header avatar area and/or on `/profile.html`
     ("#42 this week"), a CTA from `/path.html` and the quiz
     results screen ("you're #N — climb the board"). Add it to the
     homepage gamification pitch.
  5. Time windows + cohorts: weekly board (resets Monday, matches
     streak logic) + all-time; optionally per-cert boards so a user
     competes within "AWS SAA learners", not the whole site.
  6. Verify opt-out hides the user everywhere; verify
     responsive at 360 / 768 / 1440.

### UX-13 — Competitive comparison metrics on cert + path surfaces ✅ DONE 2026-05-23

- **Goal:** on every certification page and on the learning-path map,
  show the user how they compare — to other users, to the cohort
  average, or to any more relevant benchmark. This is the core
  "competition" pillar of the product thesis.
- **Candidate metrics (pick the highest-signal, lowest-cost first):**
  - "Your accuracy on this cert: 78% · cohort average: 64%"
  - "You're faster than 71% of learners on this pack"
  - Percentile / rank badge per cert ("Top 15% on AWS SAA")
  - Path progress vs. average ("You've cleared 12 nodes — most
    learners are at 7")
  - Streak vs. cohort, XP vs. cohort
- **Steps:**
  1. Decide the data source: aggregate stats need a server-side
     rollup. Add a Supabase view / scheduled aggregate (or a
     Cloudflare Pages Function) that exposes per-pack cohort
     aggregates (avg accuracy, avg time, node-completion
     distribution) — anonymous, no PII.
  2. Design a compact, reusable "vs. cohort" component (a stat row
     or badge) usable on cert pages, `/path.html`, and quiz results.
  3. Wire it: cert page header, path map header, post-session
     results screen. Graceful empty state for new users / new packs
     with too little data ("not enough data yet").
  4. Keep it honest — "Données indicatives" style disclaimer where
     samples are small; never fabricate a benchmark.
  5. Responsive verification at 360 / 768 / 1440.
- **Depends on** the UX-12 Supabase aggregate work — do the data
  layer once, feed both features.

### UX-14 — Site-wide text readability audit (contrast + size) ✅ DONE 2026-05-23

- **Symptom (owner, 2026-05-21):** body text across sections is hard
  to read — either too small, or the white is too bright against the
  dark background and strains the eyes.
- **Steps:**
  1. Audit text tokens in `desktop.css` / `main.css` / page CSS:
     pure `#fff` / very-bright body text on the dark theme, font
     sizes below ~15px for body copy, and low-contrast muted greys
     (e.g. `#7c90ae` on dark) used for content rather than captions.
  2. Establish a small type/contrast scale: a softened off-white for
     body (e.g. `#e6edf6`-ish instead of pure white) to cut glare,
     a minimum body size (15–16px), and a muted colour that still
     clears WCAG AA (4.5:1) for any text, AA-large for captions.
  3. Apply globally via shared CSS variables / tokens so the fix is
     one source of truth, not per-page patches.
  4. Spot-check contrast ratios on the worst offenders (homepage
     sections, cert pages, courses, careers articles).
  5. Verify at 360 / 768 / 1440 and in bright-sun-readability terms
     (this ties into the long-standing "light theme for the quai"
     style polish note — but here the ask is just legible dark-theme
     text, not a new theme).

---

## P0 — Course content rework (2026-05-16, HIGH priority) ✅ COMPLETE 2026-05-20

> Current `data/courses.json` chapters are too short to deliver real
> learning value. Users will read one screen of bullets and bounce back
> to the quiz, defeating the point of having a Courses surface at all.
> This is the next major content investment — sized like the question
> rewrite (rolling batches per pack, weeks of work).
>
> **Acceptance per course pack:**
> - [ ] 5–10 chapters minimum (currently most have 2–3 short stubs)
> - [ ] Each chapter has: intro paragraph · detailed explanation with
>       diagrams or code snippets · 2-3 concrete real-world examples ·
>       3-bullet key takeaways · linked mini-quiz (3-5 questions reusing
>       existing question banks via qids)
> - [ ] Markdown source so non-engineers can co-author
> - [ ] Schema.org `Course` / `LearningResource` JSON-LD per course
>
> **Highest-leverage packs to expand first (by traffic):**
> 1. Linux fundamentals (rhcsa, lpic-1) — gateway audience, low CPM but
>    huge funnel
> 2. AWS core services (clf-c02, saa-c03) — highest-CPM cohort
> 3. Kubernetes (cka, ckad, cks) — committed audience, compares against
>    killer.sh-style depth
> 4. Networking (ccna, comptia-network-plus) — foundational, long shelf
> 5. Security (security+, cysa, cissp) — large funnel
> 6. CI/CD & IaC (terraform-003, github-actions, docker-dca)
>
> **Shipped 2026-05-16:** "📘 More chapters & deeper content rolling in"
> placeholder banner on `/courses/` index with a visible progress bar.
> Sets expectations without faking it.
>
> **Completed 2026-05-20:** all 28 courses are now fully expanded to the
> deep-chapter shape — collapsible `module-block` sections, 18+ lessons
> each (intro · key concepts · study-note · 3-bullet takeaways · linked
> mini-quiz CTA into the question bank). SC-900 and MS-900 were the last
> two packs flipped to `expansion_status: "complete"` in
> `data/courses.json`; the `/courses/` banner reads 100%. Open follow-up:
> the acceptance list above still wants a Markdown co-authoring source
> (content currently lives directly in each `learning/<id>/index.html`).

---

## P1 — Phase 7: Career OS — gamified career platform (2026-05-21, vision)

> Strategic direction set by the owner on 2026-05-21. Phase 7 is newer
> than Phase 6 below; it is listed first because it is the product's
> next big bet. Most tickets depend on the Supabase account + sync
> layer (Phase 3D) already shipped, and on the leaderboard/comparison
> work specced in **P0 round 2 UX-12 / UX-13** — build the shared data
> layer once and feed every Phase 7 feature from it.

### Positioning — "Career OS"

CertQuests stops being "a practice-test site" and becomes a **Career
OS**: the place an IT learner runs their whole certification-to-career
journey. It must help a user:

1. **Choose** the right certification (have: `/career-quiz/`,
   `/certifications/`, `/compare/`).
2. **Build a roadmap** — a personal cert + skill plan (have:
   `/career-path/`, `/study-planner/`; needs unifying into one
   owned, persistent plan — see 7.1).
3. **Track progression** against that roadmap (partial: stats /
   profile / path maps — needs a roadmap-level tracker, 7.1).
4. **Prepare interviews** (NEW — 7.6).
5. **Find a job** — job matching (NEW — 7.7).
6. **Improve salary** (have: `/salaire/`; wire it into the roadmap
   and the coach, 7.1 / 7.5).
7. **Document skills** — a verifiable skills portfolio (NEW — 7.8).

### The core bet — competition + community

The differentiation over "just ask an AI" is a **gamified,
competition-driven, community-driven** layer. Highest-priority builds:

#### 7.1 — Personal roadmap (the spine of Career OS) ✅ v1 SHIPPED 2026-05-30 (localStorage-first)

- **Shipped:** `/roadmap/` — one owned, persistent plan per user. Pick a
  target role (15 archetypes from `data/career-paths/_index.json`) →
  auto-suggested ordered cert sequence (sourced live from the archetype's
  `steps[].cert`) → reorder / add / remove / mark done. Progress rolled up
  per cert from `cq-laurels-v1` (done) → `cq-path-progress-v1` via
  `window.cqPathProgress.packPercent` (path %) → `cq-stats-v1` perPack
  ("en cours"); overall progress bar. Each cert deep-links to
  `/train.html?pack=`, `/path.html?pack=`, `/study-planner/#{c:id}`.
- **Store:** `src/roadmap.js` (in cq-core bundle) → `cq-roadmap-v1`,
  `window.cqRoadmap`, dispatches `cq:roadmap-changed`. Ids validated
  `^[a-z0-9-]{1,64}$`, all interpolation escaped.
- **Unifies** career-path/study-planner/career-quiz: the quiz result CTA
  and the career-path output now seed `/roadmap/#{...}`; summarised in a
  `/profile.html` section (renderRoadmap).
- **Deferred:** Supabase `user_roadmap` table + `sync.js` mirror (needs
  cross-repo coordination with the native app — store/events already
  follow the cq-* pattern so wiring is mechanical). Per-tile "+ Roadmap"
  button on cert pages (would clutter the core Start/Path CTAs).

#### 7.2 — Leaderboards / classements

- **Already specced** — see P0 round 2 **UX-12** (web/app parity,
  Supabase sync, promotion) and **UX-13** (vs-cohort metrics on cert
  + path surfaces). Phase 7 treats those as its ranking foundation;
  do not re-spec here.

#### 7.3 — Guilds (guildes) ✅ v1 SHIPPED 2026-06-01

- **Shipped:** `/guilds/` — create / join / leave a guild and climb a guild
  leaderboard ranked by pooled member XP. DB (migration `0006`, applied):
  additive `guilds` + `guild_members` tables (one guild per user; RLS reads
  public, writes only via SECURITY DEFINER RPCs `create_guild` / `join_guild`
  / `leave_guild` that check auth.uid()) + read RPCs `get_guild_leaderboard`,
  `get_my_guild` (with rank), `get_guild(slug)` (header + roster). Guild XP =
  sum of members' `user_profile.xp` (the unified cross-platform XP, so guild
  totals include both web and app activity). `/guilds/index.html` serves both
  the index (your-guild panel + create/join + leaderboard) and `?g=<slug>`
  detail (roster + join/leave). Profile shows a 🛡️ guild chip (tag · name ·
  rank); the hamburger drawer links Guilds. Additive — no app code change.
- **Deferred (v2):** owner transfer / kick / rename; guild description edit
  UI; guild-vs-guild challenges (pairs with 7.4); per-guild shared goal +
  weekly guild XP (via `user_weekly_xp`); invite-only / private guilds; cap.

#### 7.4 — Challenges (défis) ✅ v1 SHIPPED 2026-06-01

- **Shipped:** `/challenges/` — three weekly, ranked competitive events
  (Weekly Sprint = 100 questions, Path Crawler = 15 path nodes, Streak
  Keeper = 7-day streak). `src/challenges.js` (in cq-core bundle) holds the
  static templates and accrues per-ISO-week progress from the event bus
  (`cq:session-complete` → question count, `cq:path-progress-changed` →
  nodes, streak derived from `cq-stats`); resets each week. Progress mirrors
  to `public.challenge_progress` (own-row RLS, migration `0007`, monotonic
  guard) when signed in. `get_challenge_leaderboard(id, week)` (anon-exec,
  opt-in-gated) ranks players per challenge; the page shows my progress bars
  + a top-10 board each. Node-CJS pure core + 6 unit tests. Hamburger drawer
  + sitemap + footer links. Non-breaking for the app.
- **XP reward payout SHIPPED 2026-06-04:** each weekly challenge now pays a
  one-time-per-ISO-week bonus on completion (Sprint +100, Crawler +75, Streak
  +50 XP) via the daily.js monotonic-safe `bonusXp` synthetic-session pattern
  — XP only increases, so the cloud guard is never tripped. `evaluate()` in
  `src/challenges.js` pays unclaimed completed challenges (pure `rewardsToPay`
  + a per-week `claimed` map prevents double-pay) and fires `cq:challenge-
  completed`; `mascot-cheer.js` shows a dedicated "🎁 X complete · +N XP"
  toast; `daily.js` now ignores ALL `*-reward` synthetic events so a challenge
  payout can't advance the daily quest; the `/challenges/` cards show the
  prize. +5 unit tests (265 total).
- **Deferred (v2):** cosmetic/hat rewards on completion; head-to-head duels &
  guild-vs-guild (builds on 7.3 guild tables); user-created / seasonal
  challenges; a results/history board after a week closes.

#### 7.5 — IA coach (squid mascot 🦑) ✅ v1 SHIPPED 2026-06-01 (rules-based)

- **Shipped:** `src/coach.js` (in cq-core bundle) — a pure, rules-based
  advice engine `computeAdvice(ctx)` over data the browser already has
  (stats / roadmap / streak / hearts). Surfaces a prioritised "🦑 Coach
  — your next moves" panel on `/profile.html` (top 3 tips with deep-link
  CTAs). Rules: cold-start, streak-at-risk, weakest-pack drill (lowest
  per-pack accuracy < 70% with ≥5 answered), next-roadmap-step,
  build-a-roadmap, hearts-full boss nudge, momentum fallback. Node-CJS
  exported + 11 unit tests; `window.cqCoach.getAdvice(n)`.
- **v2 partially SHIPPED 2026-06-04:** post-session **coach debrief** now
  surfaces the top "next move" on BOTH the SPA quiz results screen
  (`src/screens/results.js` `buildCoachDebriefHTML`) and the `/path.html`
  inline-session summary (`src/path.js` `buildCoachDebrief`); the floating
  squid (`src/mascot.js`) now OPENS with the persona-aware coach tip instead
  of a generic nav tip (`coachLeadTip`). All persona-aware via cqCoachPersona,
  all no-op if the bundle isn't loaded. Cache v131.
- **Deferred (v2):** LLM-backed coach behind a Cloudflare Pages Function
  (swap computeAdvice's inputs for a model — surfaces unchanged); per-tag
  accuracy (stats only tracks per-pack today); a dedicated inline coach
  banner on the path *map* (pre-session, distinct from the post-session
  debrief now shipped).

- Turn the existing floating squid (`src/mascot.js`,
  `mascot-loader.js`) from static tips into a **conversational AI
  coach**: reads the user's roadmap + stats + weak tags and gives
  targeted next-step advice ("your AWS networking accuracy is 52% —
  do this 10-Q drill", "you're 2 days from a streak record").
- Keep the squid character as the persona/voice site-wide. Coach
  surfaces: a panel on `/profile.html`, inline nudges on
  `/path.html`, post-session debrief on the results screen.
- **Stack note:** an LLM-backed coach needs a server endpoint
  (Cloudflare Pages Function proxying an API; never ship a key
  client-side). A v1 can be rules-based (no LLM) using stats +
  concept-library before adding a model.

#### 7.6 — Interview preparation (NEW) ✅ v1 SHIPPED 2026-06-01

- **Shipped:** `/interview/` — an interactive STAR-method behavioural
  trainer plus a technical-practice hub. `data/interview/behavioral.json`
  holds 18 behavioural questions in 6 themes (about-you, teamwork, challenge,
  leadership, adaptability, communication), each with a STAR framing hint +
  a "what interviewers look for" checklist. The page renders category
  filters + a per-question STAR worksheet (Situation/Task/Action/Result
  textareas) that autosaves drafts to `cq-interview-v1`, a progress counter,
  a 🎲 random-question drill, and copy/clear per answer. The technical
  section links the 10 existing `careers/<cert>-interview-questions` pages.
  HowTo JSON-LD for the STAR steps. Drawer + sitemap + cache bump v113→v114.
- **Deferred (v2):** LLM answer feedback via the squid coach (needs the
  Pages Function from 7.5 v2); cloud-synced drafts; per-role question sets;
  a timed mock-interview mode; more technical interview pages as packs grow.

#### 7.7 — Job matching (NEW) ✅ v1 SHIPPED 2026-06-02

- **Shipped:** `/jobs/` — "Job Match" ranks 13 curated IT role profiles
  (Cloud Engineer/Architect, Azure Admin, DevOps, Platform/K8s, SRE,
  Network Engineer/Architect, SOC Analyst, Security/Pentester, Linux
  Sysadmin, Data Engineer) by **fit to the certs you've validated**.
  `data/jobs/roles.json` holds each role's signature certs (weighted),
  salary range, informational skill chips, demand hint, and a
  `cpDomain`/`cpSituation` pair that seeds `/roadmap/#{…}` +
  `/career-path/#{…}` deep-links. `src/jobmatch.js` (page-only — read
  only, no events, so NOT in the cq-core bundle) is a pure dual-export
  (browser + Node) scorer: a laurel = full weight, a started pack
  (path node done or answered Qs) = half weight; `rankRoles` sorts by
  fit then roadmap-domain match then demand. The page renders a fit
  bar + cert checklist (✅ validé / 🟡 en cours / ⬜ manquant, missing
  ones deep-link to train + path), skill chips, and salary/roadmap/
  career-path CTAs; re-renders on `cq:stats-changed` / `cq:laurel-earned`
  / `cq:roadmap-changed`. Cold-start shows a demand-ranked list with a
  nudge. Node-CJS + 10 unit tests (229 total). Drawer 🎯 + sitemap.
  All client-side — no external job feed (the deferred part).
- **Deferred (v2):** a live job feed / partner API (Indeed, France
  Travail) behind a Pages Function; skills vector from concept tags
  (today fit is cert-based only); "add role to roadmap" one-click;
  per-role openings count; tie to 7.8 public profile.

#### 7.8 — Skills portfolio + public profile (NEW) ✅ v1 SHIPPED 2026-06-01

- **Shipped:** `/u/?u=<username>` — a publicly shareable skills profile.
  Reads Supabase via the new `get_public_profile(handle)` RPC
  (`docs/migrations/0005`, SECURITY DEFINER, anon-executable, gated on the
  SAME `profiles.leaderboard_opt_in` toggle as the leaderboard). Shows
  display name, level + stage emoji, XP, certs survived (laurels mapped to
  pack names via `/data/index.json`), lessons cleared, and member-since.
  Non-PII only — no email/user_id. Copy-link + "build your own" CTA.
  `/profile.html` shows a "🔗 Your public profile" share row when opted in
  (links `/u/?u=<username>`). Page is `noindex` (per-user dynamic) but in
  the sitemap per the all-dirs convention.
- **Deferred (v2):** a separate `public_profile_opt_in` (today reuses the
  leaderboard toggle); skills derived from concept tags (today shows
  laurels + node count); per-user OG image (needs server rendering);
  guild/rank/streak (streak isn't a cloud column yet). Ties to 7.7 job
  matching once a skills vector exists.

#### 7.9 — Study groups + accountability (NEW) ✅ v1 SHIPPED 2026-06-02

- **Shipped:** `/study-groups/` — cert-focused cohorts with an optional
  shared deadline and a once-per-day accountability check-in. DB (migration
  `0009_study_groups`, applied): additive `study_groups` (slug, name,
  pack_id, target_date) + `study_group_members` (many-to-many, unlike
  guilds' one-per-user; carries `last_checkin` + `checkin_count`) with
  public-read RLS, writes only via SECURITY DEFINER RPCs. RPCs:
  `create_study_group` / `join_study_group` / `leave_study_group`
  (12-group cap), `study_group_checkin` (idempotent per day → returns the
  streak count), `get_study_groups(pack?)` + `get_study_group(slug)`
  (anon-readable discovery + roster with check-in state) and
  `get_my_study_groups`. Page (authed, mirrors the guilds client): your
  groups with a Check-in button, a create form (name + cert picker from
  `data/index.json` + optional deadline), and a discoverable list filtered
  by cert; `?g=slug` detail shows the roster sorted by check-ins + a path
  deep-link. Drawer 📓 + sitemap. **Phase 7 (Career OS) is now complete.**
- **Deferred (v2):** accountability *pairs* / "your partner studied — your
  turn" nudges; group chat/wall; per-group shared goal progress bar;
  longest-streak highlighting; owner moderation (kick/rename/close);
  notifications when the deadline nears.

#### 7.10 — Social layer + community feed (NEW) ✅ v1 SHIPPED 2026-06-02

- **Shipped:** `/community/` — follow other learners, race them on a
  friends-only XP leaderboard, and watch their wins in an activity feed.
  DB (migration `0008_social`, applied): additive `follows` table (RLS:
  read rows where you're either side; writes only via RPC) + five
  SECURITY DEFINER RPCs, all `authenticated`-only (default PUBLIC execute
  revoked): `social_follow(username, on)`, `social_search_users(q)`,
  `social_graph` (you + followees ranked by the unified cross-platform
  XP), `social_feed` (DERIVED from `user_achievements.earned_at` +
  `user_path_progress` boss-node `completed_at` — no new events table),
  `social_counts`. Privacy: you can only follow PUBLIC
  (`leaderboard_opt_in`) users, and every read RPC re-checks opt_in, so an
  opt-out silently drops you from others' feeds/boards; no PII leaves the
  RPCs. Page (authed, mirrors the guilds client) = counts + user search
  with follow toggles + friends leaderboard + feed. A 💜 Follow button on
  the `/u/?u=` public profile is the per-person entry point. Drawer 👥 +
  sitemap. Additive — no app code change.
- **Deferred (v2):** reactions/likes on feed items; a global (not just
  followees) discovery feed; guild-event items (level-ups, challenge
  wins) once those are timestamped cloud-side; follower-of notifications;
  mutual-follow "friends" distinction; cloud laurels in the feed once the
  web mirrors final-boss laurels to `user_achievements`.

### Cross-cutting

- **Analytics:** every Phase 7 feature feeds a per-user analytics
  view (progress over time, weak areas, cohort comparison) — extends
  the `/profile.html` stats and the UX-13 cohort aggregates.
- **Expert content:** challenges, coaching, and interview prep all
  draw on the existing question banks, `concept-library.json`,
  courses and cheatsheets — keep content quality (the ongoing
  question + course rework) as the substrate Phase 7 sits on.
- **Acceptance:** static-HTML-where-possible, canonical header,
  `?v=N` cache bump, RLS on every new Supabase table, opt-in for
  anything public, and 360/768/1440 responsive verification.

---

## P2 — Phase 8: Visual & viral moats (brainstorm 2026-05-21)

> Owner brainstorm 2026-05-21: ten "wow-factor" concepts. Each is
> assessed below for **feasibility on this stack** (static HTML/CSS/
> vanilla-JS on Cloudflare Pages + Supabase + Pages Functions; Claude
> Code writes the code). Verdict legend: **✅ doable**, **🟡 doable
> scoped-down** (ambitious part deferred), **🌟 north-star** (vision,
> not a discrete ticket). Nothing here needs a native app or an
> impossible API — the constraints are LLM-at-runtime cost and
> real-time multiplayer complexity, both flagged where they bite.
> Priority is P2: ship Phase 7's career/community spine first; these
> are the differentiators layered on top.

### 8.1 — 3D Interactive Cloud Infrastructure ✅ v1 SHIPPED 2026-05-30

- Interactive, animated cloud-architecture explorer (AWS first):
  animated network/packet flows, an attack scenario, live
  autoscaling, visible error states — learn visually.
- **Shipped (v1 SVG):** `/cloud-explorer/` — data-driven SVG of a
  3-tier AWS VPC (IGW → ALB → Auto Scaling EC2 → RDS multi-AZ + WAF/NAT)
  from `data/cloud-explorer/aws-vpc.json`. CSS animated flow edges;
  four scenario toggles (normal / attack / scaling / failure) recolor
  edges, drop a failed instance, spin up extra EC2s, surface the
  attacker + WAF; click any service → role annotation + deep-link to
  `/train.html?pack=…` (aws-saa-c03 / aws-scs-c02). Shareable `#scenario`
  hash; prefers-reduced-motion respected.
- **Deferred (v2):** true 3D (Three.js/WebGL); per-view OG image.
  Registered in sitemap + llms.txt.

### 8.2 — Career RPG ✅ v1 SHIPPED 2026-06-02 (class system)

- **Shipped:** a Career RPG **class** layer over the existing gamification.
  `src/rpgclass.js` (in the cq-core bundle, pure dual-export) defines 6
  classes (Cloud Engineer ☁️ / DevOps Alchemist 🔧 / Security Sentinel 🛡️ /
  Network Ranger 🌐 / Linux Monk 🐧 / Data Sage 📊), each with a playstyle
  blurb, signature certs, and a 5-tier TITLE that levels up with your
  CertQuests level (tiers at Lv 1/5/15/30/50). Surfaced as a "⚔️ Class"
  section on `/profile.html` (picker chips + current title + next-rank hint
  + signature-cert path deep-links). Complements — not duplicates — the
  roadmap: with no explicit pick it AUTO-SUGGESTS the class matching the
  roadmap's domain. Store `cq-class-v1` / `window.cqClass`, dispatches
  `cq:class-changed`. +8 unit tests (260 total). Local-first.
- **v2 partial SHIPPED 2026-06-04:** RPG **class chip on the path map header**
  (`/path.html`) — shows the current class title (explicit pick, else
  roadmap-domain suggestion), tinted with the class accent, re-rendered on
  `cq:stats-changed` / `cq:class-changed` so the title tier tracks level-ups.
  `renderPathClassChip` in `src/path.js` + `.path-class-chip` in `path.css`.
- **Deferred (v2):** "equipment slots" as a cosmetics/hat reframing; class
  chip on the header *avatar* (fragile global chrome — held back); class shown
  on the public `/u/` profile (needs a cloud column); per-class quest lines.

### 8.2-orig — Career RPG ✅ doable (merge into Phase 7)

- Pick a class (Cloud Engineer / DevOps / Security Analyst), then
  quests, boss fights, certifications, XP, equipment, guilds.
- **Feasibility:** this is largely the **existing** gamification
  layer reframed — avatar + XP + path maps + sub/final-boss nodes +
  laurels + cosmetics + (Phase 7) guilds already exist. Net-new = a
  class-selection system and an "equipment" expansion of cosmetics.
- **Action:** fold into **Phase 7** as an RPG framing/theming pass —
  add a class picker, equipment slots, and RPG copy across the path/
  profile. Not a separate build; mostly client-side + Supabase.

### 8.3 — AI-generated Labs 🟡 v1 SHIPPED 2026-06-02 (build-time bank)

- **Shipped (v1 build-time):** `/labs/` — a hands-on guided-lab runner.
  Each lab (`data/labs/labs.json`, 8 labs across cloud / devops / security /
  network / linux) is a realistic incident worked as a sequence of decision
  points; every option gives correct/incorrect feedback, the FIRST pick per
  step scores, and the lab ends with a takeaway + train/path deep-links.
  `src/labs.js` (page-only, pure dual-export `gradeLab` / `rankLabs` + a
  browser runner) adaptively surfaces labs whose `cert` maps to the
  learner's weak / started packs (from `cq-stats-v1` perPack). +9 unit
  tests. Drawer 🧪 + sitemap. Static, client-side, no LLM, on-device.
- **Deferred (v2):** runtime AI-generated labs (a unique scenario per
  request — needs the 7.5/8.3 LLM Pages Function); free-text task
  validation (today is multiple-choice decision points); more labs as
  packs grow; a per-lab share card.

### 8.3-orig — AI-generated Labs 🟡 doable scoped-down

- Unique hands-on labs, incidents, infra puzzles, debugging
  scenarios, difficulty-adapted exercises — a different experience
  per user; big content moat.
- **Feasibility split:**
  - ✅ **Build-time generation** — Claude Code generates a large,
    high-quality bank of labs/incidents/debug scenarios offline,
    shipped as static JSON + a lab-runner UI. Adaptive selection by
    user level is client-side. This is fully doable now.
  - 🟡 **Runtime AI generation** (a truly unique lab per request)
    needs an LLM endpoint (Cloudflare Pages Function proxying an
    API, server-side key, per-call cost). Defer to v2.
- **Steps (v1):** lab schema → generate bank with Claude Code →
  lab-runner page (scenario, tasks, validate-answer, hints) →
  adaptive picker keyed to `cq-stats-v1` weak tags.

### 8.4 — Real-time Interview Arena 🟡 v1 SHIPPED 2026-06-02 (solo voice drill)

- **Shipped (v1 solo drill):** a "Mock interview drill (BETA)" section on
  `/interview/`. Pick a track (Behavioural / Cloud / DevOps / Security /
  Network / Linux), a length (3/5/7 Q) and time/question (1–3 min); each
  question is read aloud (`speechSynthesis`, toggleable), a countdown bar
  runs, and you answer by **voice** (`SpeechRecognition` live transcript
  where supported) **or by typing** — graceful typed-only fallback on
  Firefox/Safari. At the end: a transparent heuristic self-check per
  answer (answered 40% + substance 30% + keyword coverage 30%), hit/missed
  keyword chips, the model-answer hint, an overall score and a squid
  debrief; copy-transcript + restart. `src/mock-interview.js` (page-only,
  pure dual-export scorer + browser UI), `data/interview/mock.json` (6
  tracks × 6 Qs with scoring keywords + hints). +9 unit tests. Nothing
  leaves the device; no LLM, no key.
- **Deferred (v2):** dynamic AI questioning + spoken AI feedback (needs the
  8.3/7.5 LLM Pages Function); per-cert technical tracks tied to packs;
  cloud-saved attempt history; the Twitch-style live spectating is dropped
  for this stack (replace with async shareable replays if ever revisited).

### 8.4-orig — Real-time Interview Arena (original spec) 🟡 doable scoped-down

- Live technical-interview simulation: dynamic questions, time
  pressure, voice, feedback, scoring. "LeetCode + Twitch + AI".
- **Feasibility split:**
  - ✅ **Solo voice interview drill** — the Web Speech API
    (`SpeechRecognition` + `speechSynthesis`) is free, browser-native,
    no key. Build a timed interview simulator: spoken/typed questions
    from a role bank, countdown stress, a rubric-based score, squid
    coach debrief. Fully doable.
  - 🟡 **Dynamic AI questioning / spoken AI feedback** — needs an LLM
    endpoint (as 8.3 v2). Optional upgrade.
  - 🔴 **Twitch-style live spectating** — real-time many-viewer
    streaming is out of scope for this stack; drop or replace with
    async shareable replays.
- **Action:** build the solo voice drill as **Phase 7.6** (interview
  prep) v1; treat AI-questioning as the v2 upgrade.

### 8.5 — Tech War Map ✅ SHIPPED 2026-05-30

- World map of the tech landscape: cloud-provider dominance by
  region, salaries, AI-growth, most-demanded certs. Built to be
  shared on LinkedIn.
- **Shipped:** `/tech-war-map/` — pure client-side regional choropleth
  board over `data/techmap/regions.json` (11 world regions, curated).
  Metric switcher (cloud dominance / salary / demand / AI growth):
  tiles recolor as a heatmap (cloud = leader brand color × share
  intensity; scale metrics = single-hue intensity). Click a region →
  detail panel (provider share bars, salary, demand/AI dots, top
  certs); live ranking; shareable `#metric.region` hash URL; honest
  "indicative" disclaimer + sources.
- **Deferred:** true geographic SVG world map (needs a map-path
  pipeline — the repo's standing call is schematic-first); per-view OG
  image (needs an image pipeline). Registered in sitemap + llms.txt.

### 8.6 — AI Mentor Personality System ✅ v1 SHIPPED 2026-06-02

- **Shipped:** a mentor-persona selector over the 7.5 coach. Four voices —
  🦑 Chill Coach (default), 🛠️ Senior Engineer, 🎯 FAANG Interviewer,
  🎖️ Drill Sergeant — re-voice the SAME computed tips in a chosen tone,
  each with an intro line + accent colour. Pure copy layer in `src/coach.js`
  (`applyPersona` + per-persona, per-tip-id rewrites interpolating the
  tip's `vars`); persona persists to `cq-coach-persona-v1` via
  `window.cqCoachPersona`. The `/profile.html` coach panel renders the
  persona chips + intro and re-renders on click. No LLM — later the persona
  becomes a system-prompt preset for the model coach. +5 unit tests.
- **v2 partial SHIPPED 2026-06-04:** the floating squid (`src/mascot.js`) now
  OPENS with the persona-aware coach tip (`coachLeadTip` → `cqCoach.getAdvice`),
  so the mentor voice carries into the site-wide mascot, not just the profile
  panel.
- **Deferred (v2):** persona reflected in the mascot-cheer toast copy;
  persona-specific CTA phrasing; an LLM-backed voice.

### 8.6-orig — AI Mentor Personality System ✅ doable (merge into Phase 7.5)

- Choose a mentor persona: brutal senior engineer / chill coach /
  FAANG interviewer / military-discipline mode — learning gets an
  emotional tone.
- **Feasibility:** a persona/voice layer over the squid coach
  (Phase 7.5). Works **even without an LLM** — each persona is a copy
  pack (different tip phrasing, tone, cadence) plus an avatar/colour.
  With an LLM coach later, the persona becomes a system-prompt preset.
- **Action:** fold into **Phase 7.5** as a mentor-persona selector.

### 8.7 — Multiplayer Incident Response 🟡 doable scoped-down

- Teams resolve a cloud outage / cyberattack / incident together, in
  real time. Strongly differentiating.
- **Feasibility:** **Supabase Realtime** (presence + broadcast
  channels) can power a co-op incident room — already in the stack,
  no new infra. Real-time multiplayer is still the most complex item
  here (shared state, sync, conflict). Scope:
  - v1 🟡 — a **co-op incident room**: 2–4 players, shared scenario
    state over Supabase Realtime, turn/role-based actions to keep
    sync simple.
  - v2 — fully real-time simultaneous actions.
- Depends on Phase 7.3 guilds (teams) for the lobby. Later ticket.

### 8.8 — Future Salary Predictor ✅ SHIPPED 2026-05-30

- Input cert + country + experience (+ optional current salary) →
  projection: salary band (median + range), 5-year trajectory chart,
  cert ROI/payback, market demand meter, automation-resilience badge.
- **Shipped:** `/salary-predictor/` — pure client-side calculator over
  `data/salary-predictor/model.json` (manifest + curated demand /
  automation-risk per cert, 12 certs × FR/LU/BE) + the existing
  `data/salary/<cert>.<country>.json` bands/progression/roi. Shareable
  hash URL, prominent "estimation indicative" disclaimer (no fake
  precision). Registered in sitemap + llms.txt; CTA from `/salaire/`.
  Modeled on the InfraCost page. Result-card OG image is the default
  (custom per-result OG deferred — needs an image pipeline).

### 8.9 — AI-generated Tech Universe 🌟 v1 SHIPPED 2026-06-02 (the map slice)

- **Shipped:** `/tech-universe/` — the north-star's first concrete slice: the
  whole cert world as an explorable **galaxy**. Overview = 6 domain
  constellation cards (Cloud / DevOps / Security / Network / Data&AI / Linux),
  each with a conquest ring + a glowing starfield (one star per cert, lit when
  conquered). Click a domain → a **tier constellation** (Foundational →
  Associate → Pro/Boss columns, progression edges, ♛ on advanced "boss" certs)
  where each star is a cert you can click for a detail panel (status + deep
  links to train / path / roadmap). All 87 certs across 17 brands, classified
  into the 6 domains by a per-pack heuristic; player progress overlaid from
  `cq-laurels` (conquered) + `cq-stats`/`cq-path-progress` (in orbit). Pure
  client-side SVG, no runtime LLM, no new state — built entirely from
  `data/index.json` + local progress. Header shows X/87 stars conquered +
  domains explored. Drawer 🌌 + sitemap. Cache v122 → v123.
- **Why this is the right 8.9 v1:** the TODO defines 8.9 as the *vision* the
  concrete tickets ladder up to ("a global progression map … career as an
  MMORPG"). This is that map — the connective visual over 8.1/8.2/Phase-3
  maps/Phase-7 — without the deferred "fully AI-generated living universe"
  (runtime LLM + heavy state).
- **Deferred (v2):** runtime-AI-generated lore/bosses (needs an LLM endpoint);
  cross-domain progression edges (prereqs that span brands); animated
  pan/zoom physics galaxy; per-domain OG share images; cloud-synced conquest so
  the map matches across web + app.

### 8.9-orig — AI-generated Tech Universe 🌟 north-star

- The whole career world gamified — companies, certs, skills, tech
  "bosses", a global progression map. Career as an MMORPG.
- **Assessment:** not a discrete buildable ticket — it is the
  **north-star vision** that 8.2 (Career RPG), 8.1 (3D infra),
  Phase 3 path maps, and Phase 7 guilds/challenges all ladder up to.
  A fully AI-generated living universe would need runtime LLM + heavy
  state. **Action:** keep as the framing vision; build it
  incrementally via the concrete tickets above rather than as one
  project.

### Suggested build order (P2)

1. ✅ **8.5 Tech War Map** + **8.8 Salary Predictor** — SHIPPED 2026-05-30
   (`/tech-war-map/`, `/salary-predictor/`). Pure static, viral/SEO.
2. ✅ **8.1 3D Infra (v1 SVG)** — SHIPPED 2026-05-30 (`/cloud-explorer/`).
3. **8.6 Mentor personas** + **8.2 Career RPG framing** — cheap, fold
   into Phase 7.
4. **8.3 AI Labs (build-time bank)** + **8.4 Interview Arena (solo
   voice)** — bigger content/feature builds.
5. **8.7 Multiplayer Incident Response** — last; most complex, depends
   on guilds.

---

## P1 — Phase 6: Authority + tools layer (2026-05-15, planned)

> Net-new feature batch (13 items) targeting SEO authority, lead-gen and
> retention. Three are calculators (client-side JS), eight are content
> templates (static HTML scaled by data), and two extend the existing
> Supabase + stats system (streaks/leaderboards, comparator).
>
> **Stack reality:** site runs on Cloudflare Pages (not GitHub Pages).
> No Workers/Functions yet — features below that need server-side compute
> (Exam Radar, leaderboards) introduce Pages Functions for the first time.
> No Brevo integration today; if a feature needs transactional email the
> first ticket also wires Brevo (or sticks with Supabase Auth's SMTP).
>
> **Cross-cutting acceptance:** every feature must (a) ship as static
> HTML where possible (SEO-indexable), (b) reuse the canonical header
> (`scripts/sync-header.js`), and (c) add a `?v=N` cache-bust per
> existing convention.

### 6.1 — Salary After Certification (SEO anchor) ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/salary/_schema.md`. Each
      `<cert>.<country>.json` carries cert title, currency, sources
      with optional Wayback snapshot, junior/senior/lead bands with
      median + min + max + YoE, jobTypes list, 5-year progression
      timeline, ROI inputs (exam fee + study hours + opportunity cost
      + annual uplift), and country comparison (medians in local
      currency, no forced conversion).
- [x] ✅ 4 first datasets seeded: `aws-saa.france`, `aws-saa.luxembourg`,
      `ccna.france`, `rhcsa.france`. Numbers cite APEC, LinkedIn
      Salary Insights, Glassdoor, Hays, STATEC. Every page surfaces
      "Révisé YYYY-MM" pill prominently and a "Données indicatives"
      disclaimer at the bottom.
- [x] ✅ `scripts/gen-salary-pages.js` (`npm run gen-salary`,
      idempotent) renders one static `salaire/<cert>/<country>/
      index.html` per dataset plus a `salaire/index.html` grid
      browser. Includes JobPosting JSON-LD per page for rich results.
- [x] ✅ Page sections: hero with eyebrow + median headline, fourchettes
      grid (3 bands), jobs-accessible chip row, 5-year progression
      timeline, country comparator table, ROI card with payback-month
      figure, sources list with disclaimer.
- [x] ✅ `sitemap.xml` updated: index + 4 leaf pages added (priority
      0.9 / 0.85, monthly changefreq).
- [x] ✅ Cache bumped 72 → 73, sw.js CACHE_VERSION → v87.
- **2026-05-20:** +2 salary datasets (cluster 14 → 16) —
  `comptia-security-plus.france` and `gcp-ace.france`. Bands are
  reasoned estimates triangulated from APEC / Hays / Glassdoor /
  LinkedIn / EstimSalaire web research, kept conservative vs the
  high-skewing aggregators; the page's baked-in "Données indicatives"
  disclaimer covers the indicative nature. Wired `salaryAlias` so the
  Security+ comparators (`comptia-security-plus-vs-comptia-cysa`,
  `cissp-vs-comptia-security-plus`) now pull the median into the
  table — also back-filled the long-missing `cissp` alias. sitemap.xml +2.
- [ ] **Open follow-ups:** Wayback snapshots for sources, FR/EN locale
      toggle, lead-capture for "Get the salary report PDF" flow.

### 6.2 — Cert Comparator ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/comparisons/_schema.md`. Each
      `<slug>.json` carries 2-3 certs (id matched against
      `data/index.json`), pros/cons/bestFor per cert, verdicts table
      (profile → winner with rationale), and a TLDR.
- [x] ✅ 3 first datasets: `aws-saa-vs-az-104-vs-gcp-ace` (3-way),
      `ccna-vs-comptia-network-plus` (2-way), `cissp-vs-comptia-
      security-plus` (2-way).
- [x] ✅ `scripts/gen-compare-pages.js` (`npm run gen-compare`)
      pulls per-cert metadata from `data/index.json` (question_count,
      est_hours), pulls salary median from `data/salary/<alias>.france
      .json` when an alias is set, renders one static page per slug
      under `compare/<slug>/index.html`. Index page rebuilt to list
      every comparison + the legacy alternative-tool pages
      (boson, examtopics).
- [x] ✅ Page sections: hero with eyebrow + title + revised pill, TLDR
      box, side-by-side comparison table (codes, fees, study hours,
      bank Q count → train link, salary median → salary page link),
      pros/cons/bestFor cards (one per cert, color-coded by vendor),
      verdict-by-profile rows, "start with the one you chose" CTA row.
      Article JSON-LD per page.
- [x] ✅ `sitemap.xml` updated: index + 3 leaf comparator pages.
- [x] ✅ Cache bumped 73 → 74, sw.js CACHE_VERSION → v88.
- [ ] **Open follow-ups:** dynamic 3-way picker (cert-A × cert-B form),
      auto-generate "alternative" comparisons when adjacent certs ship
      a salary page.
- **2026-05-20:** +3 comparison datasets (comparator 6 → 9) —
  `aws-clf-c02-vs-az-900-vs-gcp-cdl` (cloud-fundamentals 3-way),
  `comptia-security-plus-vs-comptia-cysa`, `rhcsa-vs-comptia-linux`.
  Also de-staled `scripts/gen-compare-pages.js` (CACHE_BUST v87 → v91,
  header trimmed to the canonical 4-item nav) so regeneration stops
  regressing existing pages. sitemap.xml +3.
- **2026-05-22:** +1 comparison dataset (comparator 10 → 11) —
  `aws-clf-c02-vs-aws-saa-c03` (the classic "Cloud Practitioner
  d'abord, ou directement Solutions Architect ?" 2-way, 6 verdict
  profiles, salary medians wired from `aws-clf-c02`/`aws-saa`). Also
  re-de-staled the generator's `CACHE_BUST` v100 → v101 so regeneration
  no longer downgrades the 10 sibling pages' cache-bust. sitemap.xml +1.

### 6.3 — Fail Analysis (per certification) ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/fail-analysis/_schema.md`. Each
      `<cert>.json` carries cert title, vendor color, lastReviewed,
      pass-rate note, intro + TLDR, sources list, and exactly 5
      ranked mistakes with frequency citation + why + concrete fix.
- [x] ✅ 3 first datasets: `ccna`, `aws-saa`, `rhcsa`. Sources cite
      r/ccna, r/AWSCertifications, r/redhat, r/linuxadmin, Cisco
      Learning Network, AWS re:Post.
- [x] ✅ `scripts/gen-failanalysis-pages.js` (`npm run gen-failanalysis`,
      idempotent). Renders one viral-format page per dataset under
      `fail-analysis/<cert>/index.html` + a grid index.
- [x] ✅ Page sections: hero with red-orange gradient, TLDR box, 5
      ranked mistake cards (rank + title + frequency pill + why
      paragraph + green "Le fix" call-out), CTA row to train.html
      + path.html for the same cert, sources + disclaimer.
      Article JSON-LD per page.
- [x] ✅ `sitemap.xml` updated: index + 3 leaf pages.
- [x] ✅ Cache key 74 (no bump — same wave as 6.2).

### 6.4 — Study Planner ✅ SHIPPED 2026-05-15

- [x] ✅ Single static SPA at `/study-planner/`. Form on the left,
      generated plan on the right (stack on mobile). Pure client-side
      JS — no backend.
- [x] ✅ Cert dropdown auto-populated from `data/index.json`; recommended
      hours per cert pulled from same file. For certs with a
      Cert Quest path (40 packs), per-chapter syllabus pulled from
      `data/paths/<pack>.json`.
- [x] ✅ Distribution algo: weight chapters by node count, distribute
      across "learn weeks", reserve last 1-2 weeks for review +
      exam blanc. Coverage % = totalH / (cert.hours × levelMult)
      where levelMult is 1.2 / 1.0 / 0.8 for beginner / intermediate
      / advanced.
- [x] ✅ Pace alerts: <70% coverage → red "rythme insuffisant"; 70-99%
      → amber "tendu"; ≥100% → green "confortable".
- [x] ✅ Per-week cards: dates, hours target, chapter title, milestones
      ("finir le chapitre", "score ≥75%", "examens blancs").
      Final-week card highlighted as exam day.
- [x] ✅ ICS export: hand-rolled iCalendar generator; one VEVENT per
      week + one for the exam day itself, with summary, description,
      URL pointing to /train.html?pack=. Downloads via Blob — no
      backend required.
- [x] ✅ CTAs: train.html for the pack + path.html if a path exists.
- [x] ✅ Defaults populate the form so first paint shows a real plan
      (60 days from today, 10h/week, intermediate, AWS SAA).
- [x] ✅ JSON-LD WebApplication schema; canonical + OG meta.
- [x] ✅ `sitemap.xml` updated (priority 0.9, monthly changefreq).
- [ ] **Open follow-ups:** lead-gen email-the-plan flow (Brevo/Supabase
      transactional), CSV export, weekday calendar (currently weekly
      cadence only).

### 6.5 — CareerPaths Generator ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/career-paths/_schema.md`. Each
      `<archetype>.json` carries 5-7 steps with month, duration,
      weekly hours, optional cert, intermediate job + salary,
      milestones, and external resource links.
- [x] ✅ 5 first archetypes: `reconversion-cloud-aws`,
      `reconversion-network`, `reconversion-linux-sre`,
      `reconversion-security`, `en-poste-cloud-architect`. Coverage:
      4 domains × 2 situations.
- [x] ✅ `scripts/gen-career-manifest.js` (`npm run gen-career`)
      builds `data/career-paths/_index.json` so the SPA discovers
      archetypes without hard-coding the file list.
- [x] ✅ Single SPA at `/career-path/index.html`. Form on the left
      (domain, situation, age, hours/week, budget, target salary,
      country), generated roadmap on the right. Pure client-side,
      no backend.
- [x] ✅ Matcher: exact match on (domain × situation), then fallback
      to same-domain or same-situation, with a banner explaining
      the partial match.
- [x] ✅ Per-step rendering: M+N month pill, duration + hours/week
      pills, cert pill (with → train.html link), intermediate job
      + salary pills, milestones bullet list, resources block.
- [x] ✅ Salary-target alert: red if user's target is 30%+ above
      the archetype's end salary, green if it's 30%+ below.
      Country note when ≠ France.
- [x] ✅ Shareable URL via `location.hash` — encodes the form state
      as JSON. "🔗 Partager" copies the URL to clipboard.
- [x] ✅ JSON-LD WebApplication schema; canonical + OG meta.
- [x] ✅ `sitemap.xml` updated (priority 0.9).
- [x] ✅ **More archetypes — DONE 2026-05-20, 15/15** (full 5 domains ×
      3 situations matrix). Shipped in three batches: +3 `en-poste`
      (network / linux / security), +2 `devops` (`reconversion` +
      `en-poste`) with a distinct `devops` option added to the
      `/career-path/` form, then +5 `debutant` archetypes (one per
      domain). Every (domain × situation) cell now has an archetype,
      so the matcher returns an exact hit for every profile.
- [x] ✅ **Per-step Cert Quest path links — DONE 2026-05-20.** The
      `/career-path/` SPA now also fetches `data/paths/_index.json`
      (best-effort — failure is tolerated, page still works) and renders
      a 🗺️ Cert Quest path pill next to the train pill on any step whose
      `step.cert` has a learning path. 35/44 cert-bearing steps get the
      link; the 4 path-less certs (aws-clf-c02, github-actions, isc2-cc,
      sc-200) correctly get none — exact-id match only, no broken links.
- [ ] **Open follow-ups:** email-the-roadmap flow (Brevo/Supabase).

### 6.6 — InfraCost Calculator ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/infracost/_schema.md`. Each
      `<provider>.json` carries id, region, native/display currency,
      `fxNote` for EUR providers, `lastReviewed` (YYYY-MM), sources
      with `accessedAt`, optional affiliate `{ url, label }`, and four
      buckets (`compute`, `blockStorage`, `egress`, `objectStorage`)
      each with an `available` flag so storage-only providers
      (Cloudflare R2) render cleanly.
- [x] ✅ 5 providers seeded: `aws` (eu-west-3, t3 family), `gcp`
      (europe-west9, e2-standard), `hetzner` (Falkenstein/Helsinki,
      CX shared-vCPU, EUR→USD at 1.08), `fly` (cdg, shared-cpu-1x),
      `cloudflare` (R2 + Workers, compute marked unavailable). Rates
      are list-price on-demand — no Reserved/CUD/SUD/Savings Plans.
- [x] ✅ Static SPA at `/infracost/index.html`. Form on the left,
      side-by-side provider cards on the right. Pure client-side
      JS — no backend, no Pages Functions.
- [x] ✅ Form inputs: vCPU, RAM (GB), block storage (GB), egress
      (GB/month), object storage (GB). 4 presets (Side-project,
      Petit SaaS, Production, Storage-heavy) seed sensible values.
- [x] ✅ Pricing engine (in-page): `compute = vcpu*$/vcpu-month +
      ram*$/gb-month`, block storage with bundled-GB-per-vCPU
      deduction (Hetzner), egress with free tier, object storage
      flat per GB. Cheapest provider gets a green border + "CHEAPEST"
      badge — restricted to providers that offer compute when the
      workload requests vCPU/RAM so R2 doesn't win compute workloads
      by virtue of being storage-only.
- [x] ✅ Per-provider freshness pill: green if `lastReviewed` ≤ 2
      months, amber ≤ 6, red after — so users see at-a-glance which
      rates are stale.
- [x] ✅ Affiliate slots: Hetzner + Fly.io render a `→ Try …` chip
      pointing to their root URL with `rel="noopener nofollow"` and
      respect a per-provider opt-in (`affiliate: null` → no chip).
      AWS/GCP/CF have no affiliate by design.
- [x] ✅ Shareable URL via `location.hash` (JSON of form state).
      "🔗 Partager" copies to clipboard with prompt fallback.
- [x] ✅ JSON-LD `WebApplication` schema; canonical + OG meta;
      `Combien coûte ton infra par mois ?` H1 with grad span.
- [x] ✅ Cross-link added from `/career-path/` actions row to make
      InfraCost discoverable inside the tools cluster.
- [x] ✅ `sitemap.xml` updated (priority 0.9, monthly changefreq).
- [x] ✅ Global cache key bumped 74 → 75 across all HTML, sw.js,
      mascot-loader.js, audit-mobile.js. sw.js CACHE_VERSION
      → `v89-2026-05-15-phase6-6-infracost-v75`.
- [x] ✅ Tests still green (109/109).
- [ ] **Open follow-ups:** Cloudflare Pages Function that pulls AWS
      live pricing once/day to keep `aws.json` from rotting; Scaleway
      + Oracle Cloud entries; per-region toggle (us-east-1 vs eu-west-3);
      "export PDF" lead-gen; reserved-instance toggle.

### 6.7 — Streaks + Leaderboards ✅ SHIPPED 2026-05-15 (migration applied)

> Scope cut from the original brief: instead of weekly XP (which needs
> a snapshot pipeline we don't have yet), R1 ships **all-time XP**
> leaderboard, opt-in only, plus a streak prominence boost on the
> profile page. Weekly XP + server-side streak enforcement deferred
> to R2/R3 (see open follow-ups).

- [x] ✅ **SQL migration written** at `docs/migrations/0001_leaderboards.sql`:
      adds `leaderboard_opt_in` boolean + `display_name` text to
      `public.profiles`, creates `public.leaderboard_all_time` view
      that joins profiles+stats and projects only public-safe columns
      (display_name, xp, level, streak_days, sessions, questions) for
      `leaderboard_opt_in = TRUE`, grants SELECT to `anon` +
      `authenticated`. Idempotent (`IF NOT EXISTS` / `OR REPLACE`).
      Documented rollback steps in the same file.
- [x] ✅ **`/leaderboard/` page** (`leaderboard/index.html`): static
      SPA querying the view via PostgREST + anon JWT. Top-100 table
      with rank icons (🥇🥈🥉), display_name, XP, level, 🔥 streak,
      sessions + questions columns (hidden on mobile). Live/Offline
      status pill, "Opt in / out" deep-link to `/profile.html#leaderboard`.
      Detects "view doesn't exist" PostgREST error → shows owner-facing
      "migration not yet applied" empty state instead of a red error.
- [x] ✅ **Profile opt-in toggle** in the Account section
      (`profile.html`): 🏆 Public leaderboard row with sliding
      checkbox toggle, conditional "Display name set/change" row
      that appears only when opt-in is on. Wired in
      `src/profile.js:loadLeaderboardOptIn / saveLeaderboardOptIn /
      editLeaderboardName`. If the migration isn't applied, the
      toggle disables itself with a "N/A — migration not applied"
      tooltip rather than throwing.
- [x] ✅ **Streak prominence**: `#stat-streak` gets `.is-hot` class
      at `streakDays >= 3` → red color + 🔥 prefix via CSS pseudo,
      visible at-a-glance from the Stats grid.
- [x] ✅ **CSS** added to `src/styles/profile.css`: `.profile-toggle`
      (slider switch), `.profile-leaderboard-row` (amber-tinted
      callout), focus-visible outline on toggle. Min-height 44px on
      toggle per the touch-target rule.
- [x] ✅ Sitemap + 1 entry (priority 0.7, **daily** changefreq —
      leaderboard moves).
- [x] ✅ Global cache key bumped 75 → 76 across all HTML + sw.js +
      mascot-loader.js + audit-mobile.js. sw.js CACHE_VERSION
      → `v90-2026-05-15-phase6-7-leaderboards-v76`.
- [x] ✅ 109/109 tests pass.
- [x] ✅ **Migration applied to prod 2026-05-15** via
      `apply_migration` (Supabase MCP). Verified post-apply:
      `leaderboard_opt_in` BOOL NOT NULL DEFAULT FALSE + `display_name`
      TEXT NULL columns landed on `public.profiles`;
      `public.leaderboard_all_time` view created with anon SELECT
      grant confirmed (`has_table_privilege('anon', …, 'SELECT') =
      true`); view returns 0 rows (1 profile total, 0 opted in by
      default — RGPD-friendly explicit opt-in working as designed).
      `/leaderboard/` page + profile toggle now activate without code
      change.
- [ ] **Open follow-ups (R2):**
  - Weekly XP — needs a new `stats_snapshots` table + daily/weekly
    cron (Supabase pg_cron, free) to compute deltas. Then split
    `/leaderboard/` into `/leaderboard/all-time` + `/leaderboard/weekly`.
  - Server-side streak enforcement via an RPC that increments
    `streak_days` only when `last_session_at` is exactly 1 calendar
    day prior (server time, not client time).
  - Per-certification leaderboards (top XP in AWS SAA, etc.) keyed
    off `stats.payload->perPack`.
  - Display-name uniqueness + profanity filter before public exposure.
  - "Find me" anchor — `/leaderboard/#me` scrolls to and highlights
    the signed-in user's row.

### 6.8 — RealityCheck IT/Carrière ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/reality-check/_schema.md`. Each
      `<slug>.json` carries title (myth-as-question), claim (the exact
      sentence being tested), verdict (`true / partly-true / depends /
      outdated / false`) + verdictLabel + verdictColor, tldr, icon,
      lastReviewed, tags, facts[] (with claim/fact/type/source),
      whoCan, whoCant, realCeiling, honestVerdict paragraphs,
      top-level sources[], optional relatedLinks[]. Honesty rules
      baked into the schema doc ("no fabricated numbers", "cite
      institutions", "verdict must follow evidence").
- [x] ✅ 5 first datasets shipped:
      - `devops-100k-france` — verdict "Vrai mais étroit"
      - `aws-certifie-salaire` — verdict "Faux dans la formulation,
        vrai dans la corrélation"
      - `freelance-it-revenu-reel` — verdict "Faux — confusion CA / revenu net"
      - `bali-remote-worker` — verdict "Dépend du visa, du job et de ta santé"
      - `dropshipping-2026` — verdict "Faux — modèle 2017 obsolète"
- [x] ✅ Editorial discipline: each fact tagged with `type` (data /
      qualitative / community / law) so readers see what kind of
      evidence backs each claim. Sources point to institutional URLs
      (APEC, URSSAF, Shopify Blog, Indonesian Immigration, NomadList,
      Reddit communities). No fabricated specific statistics — used
      qualitative language ("most freelancers report…") when no
      verifiable number was available.
- [x] ✅ `scripts/gen-reality-check-pages.js` (`npm run gen-reality-check`,
      idempotent). Generates per-myth page + grid index. **6 pages
      total.**
- [x] ✅ Myth page renders: hero with eyebrow + verdict pill, side-by-
      side claim card (red) + verdict badge (colored by verdict),
      TL;DR block (blue), evidence section with per-fact cards
      (color-coded type pill + source link), two-column who-can/
      who-can't, "real ceiling" amber callout, final "honest verdict"
      purple gradient block, sources list with refresh disclaimer,
      related-links block. **ClaimReview JSON-LD** schema with
      ratingValue mapped from verdict (true=5, partly-true=3,
      depends=3, outdated=2, false=1) — eligible for Google Fact
      Check rich results.
- [x] ✅ Index page: tag filter + verdict-colored card grid; per-card
      verdict pill in vendor color, icon, tldr, fact count.
- [x] ✅ Freshness pill: green ≤3 months, amber ≤9, red after
      (reality-check pages rot faster than tool comparisons — wider
      bands).
- [x] ✅ `npm run gen-reality-check` in package.json.
- [x] ✅ sitemap.xml +6 entries (index 0.85, leaves 0.8).
- [x] ✅ 109/109 tests pass.
- [ ] **Open follow-ups:**
      - **Wayback Machine snapshot URLs** in each source so links
        don't rot. Today we point to publisher landing pages; rot is
        slower but possible.
      - **Affiliate slots** (CertQuests doesn't run any today).
        Candidates per page: bootcamps (DevOps), coaching freelance
        (revenu réel), nomad insurance (Bali), Shopify partner
        (dropshipping).
      - **+5 more myths:** "Bootcamp = job en 3 mois", "Master IT =
        meilleur salaire qu'autodidacte", "Move to Dubai pour zéro
        impôt", "ChatGPT va prendre ton job", "VC SaaS 100k MRR en
        12 mois".
      - **User submission form** — readers propose new myths to test
        (Supabase form behind the new auth).

### 6.9 — DevStack ✅ SHIPPED 2026-05-15

- [x] ✅ Schema in `data/devstack/_schema.md`. Per-company JSON
      carries company, vertical, founded, hq, scaleSignal, tldr,
      icon, color, lastReviewed, tags, stack[] (Category → items[]
      with status + lastSeen + typed source), oss[], culture, hiring,
      careersUrl, engBlogUrl, sources[]. Honesty rules baked in:
      "public sources only", "date every claim", "no completeness
      pretense".
- [x] ✅ 4 datasets shipped (Vinted, Doctolib, Revolut, Netflix),
      every stack item with a public source link (engineering blog,
      job posting, or GitHub repo) and `status` (`current` /
      `migrating-from` / `migrated-to` / `retired`). Total of
      ~45 stack items across the 4 companies.
- [x] ✅ `scripts/gen-devstack-pages.js` (`npm run gen-devstack`,
      idempotent). Generates per-company page + grid index. **5 pages
      total.**
- [x] ✅ Per-company page renders: hero w/ scale signal callout,
      grouped stack categories (▸ separators) with status pills
      (green/amber/blue/grey by status) + per-item source link w/
      type icon (📝 blog / 🎤 talk / 💼 job / 🐙 github), OSS
      contributions table (name / what / stars), culture paragraph,
      hiring paragraph w/ careers + blog links, methodology
      disclaimer + sources list. **Organization JSON-LD** schema with
      sameAs pointing to engineering blog + careers URL.
- [x] ✅ Index page: tag filter + company-colored card grid with
      icon + vertical + tldr + component-count + revised-date.
      Methodology disclaimer at bottom inviting corrections via /contact.
- [x] ✅ Freshness pill: green ≤4 months, amber ≤12, red after
      (tech stacks change slower than reality-check claims — wider
      bands than 6.8).
- [x] ✅ `npm run gen-devstack` in package.json.
- [x] ✅ sitemap.xml +5 entries (index 0.85, leaves 0.8).
- [x] ✅ 109/109 tests pass.
- [ ] **Open follow-ups:**
      - ✅ **+4 datasets DONE** — Algolia, Stripe, Spotify (R1) +
        ManoMano (2026-05-20). Same batch also added BlaBlaCar and
        Datadog, then GitLab + Cloudflare → DevStack now has
        **12 dossiers**. Generator template
        (`scripts/gen-devstack-pages.js`) was stale — bumped its
        `CACHE_BUST` v87 → v91 and trimmed the hard-coded header to
        the canonical 4-item nav so regenerated pages stop regressing.
      - **Per-item Wayback snapshot** in each source for link-rot
        survival.
      - **Affiliate slots:** cloud providers (AWS partner, GCP
        partner), observability vendors (Datadog, Grafana Cloud)
        when a stack item names them.
      - **"What changed since last revision"** diff block — useful
        when we re-review a dossier in 6-12 months.
      - **Glossary tooltip** on stack item names (hover → 2-line
        explanation), helps junior readers.

### 6.10 — PromptDungeon ✅ SHIPPED 2026-05-15

- [x] ✅ Schema documented in `data/prompts/_schema.md`. Each
      `<slug>.json` carries title, tldr, vendor, icon, color,
      lastReviewed, tags, models, prompts[], optional affiliate +
      disclaimer. Each prompt has id, title, use_case, model_tested
      (array of `Model (YYYY-MM)`), prompt body with `<UPPER_KEBAB>`
      placeholders, optional tips.
- [x] ✅ 4 first datasets seeded, hand-written, no AI fluff:
      `aws-cert-prep` (5 prompts — deep-explain, MCQ gen, wrong-answer
      post-mortem, cheat-sheet, scenario-decider), `it-cv-writer` (5 —
      ruthless review, STAR bullet rewriter, ATS audit, LinkedIn
      headline, cover-letter skip-check), `youtube-shorts-tech` (5 —
      25 hooks, 60s script with retention beats, title clickbait check,
      thumbnail copy, comment mining), `it-recruiter` (4 — Boolean
      string, JD audit, screen questions, rejection email).
- [x] ✅ `scripts/gen-prompt-pages.js` (`npm run gen-prompts`,
      idempotent). Generates `prompt-dungeon/<slug>/index.html` per
      dataset + `prompt-dungeon/index.html` grid. **5 pages total.**
- [x] ✅ Workflow page renders: per-prompt copy-to-clipboard button
      (with execCommand fallback for old Safari), inline `<code>` block
      preserving formatting, model-tested chips, optional tips block
      with blue accent, in-page TOC with anchor scrolling, HowTo
      JSON-LD schema.
- [x] ✅ Freshness pill: green if lastReviewed ≤3 months, amber ≤9,
      red after — so users know which prompts to re-test.
- [x] ✅ Index page: tag filter row ("All" + every unique tag from
      datasets), card grid with vendor-colored left border, per-card
      icon + vendor pill + tldr + "N prompts · Tested YYYY-MM" footer.
      Filter shows/hides cards via `[data-tags]` matching — pure JS,
      no rerender.
- [x] ✅ Sitemap +5 entries (index + 4 leaf pages, priorities
      0.85 / 0.8).
- [x] ✅ `npm run gen-prompts` added to package.json.
- [x] ✅ 109/109 tests still pass.
- [ ] **Open follow-ups:** affiliate slots filled (Claude Pro, GPT
      Plus, Anthropic API referral), shareable prompt URLs (anchor +
      auto-scroll already in place — add native share button), prompt
      voting (👍/👎 via Supabase) to surface which prompts the
      community actually uses.
- **2026-05-20:** +2 workflow datasets (PromptDungeon 7 → 9) —
  `tech-interview-prep` (mock interview, STAR, concept-out-loud,
  salary negotiation, post-interview debrief) and `homelab-architect`
  (lab design, graded exercises, debug-as-learning, portfolio project,
  tooling decision). Both target the cert → job pipeline. sitemap.xml +2.
- **2026-06-02:** +1 workflow dataset (PromptDungeon 9 → 10) —
  `kubernetes-debug` (CrashLoopBackOff diagnosis, Pending-pod scheduling
  checklist, Service/Endpoint/NetworkPolicy traffic chase, OOMKilled +
  right-sizing, kubectl-output reader, CKA/CKAD YAML-from-scratch).
  Targets the CKA/CKAD/CKS audience — no K8s prompts existed before.
  Also de-staled `scripts/gen-prompt-pages.js` (`CACHE_BUST` v=106 →
  v=114) so regeneration no longer downgrades the 9 sibling pages.
  sitemap.xml +1.

### 6.11 — ToolRadar ✅ SHIPPED 2026-05-15

> **Scope adjustment:** the original brief called for "real benchmarking,
> not just lists". Reality check: we can't hands-on test 20 tools
> monthly. R1 ships a **structured-comparison framework with transparent
> methodology** — fact-based scoring (price, free tier, integrations,
> language support, privacy posture) + public-review pros/cons with
> source links. Disclaimer makes the methodology limit explicit on
> every page so we don't pretend to be Gartner.

- [x] ✅ Schema documented in `data/tool-radar/_schema.md`. Each
      `<slug>.json` carries title, intent, tldr, lang, icon, color,
      lastReviewed, tags, criteria[] (with weight + scale def),
      tools[] (with pricing, scores per criterion, pros/cons w/
      sources, affiliate slot, verifiedAt), verdict (overall +
      conditional by profile), sources[], disclaimer.
- [x] ✅ 4 first datasets, hand-authored:
      - `meilleur-ai-developpeur` (5 tools: Claude Code, Cursor,
        GitHub Copilot, Windsurf, Continue) — winner: GitHub Copilot 4.30
      - `meilleur-ai-support-client` (5: Intercom Fin, Zendesk AI,
        Ada, Drift, Crisp) — winner: Crisp Magic Reply 4.45
      - `alternative-notion-ai` (5: Obsidian+Copilot, Mem, Reflect,
        Coda AI, Tana) — winner: Obsidian + Copilot 4.60
      - `meilleur-ai-etudiant-it` (5: Claude.ai Free, ChatGPT Free,
        Gemini Free, Phind, You.com) — winner: Claude.ai Free 4.35
- [x] ✅ Verdict-vs-math consistency check: math winner per the
      weighted score === declared `verdict.overall` for all 4 pages.
      Originally had 2 mismatches (Claude Code in dev, Intercom Fin
      in support); fixed by aligning verdict to the math. Conditional
      verdicts remain for profile-specific recommendations (e.g.
      "Claude Code best for multi-file agent" still surfaces in the
      dev verdict block even though Copilot wins overall).
- [x] ✅ `scripts/gen-toolradar-pages.js` (`npm run gen-toolradar`,
      idempotent). Generates per-category page + grid index. **5 pages
      total.**
- [x] ✅ Category page renders: hero with honesty disclaimer,
      ranked-table (color-coded scores 1-5, weighted total, gold/
      silver/bronze ranks), per-profile verdict block (overall +
      conditional rows linking to tool anchors), criteria explainer
      grid (label/weight/desc/scale), per-tool deep-dive cards (pitch,
      pricing w/ official-URL link, pros/cons w/ citation links,
      best-for line, affiliate CTA if `affiliate.url` set), top-level
      sources list, ItemList JSON-LD schema for rich results.
- [x] ✅ Freshness pill: green ≤2 months, amber ≤6, red after.
      Per-tool `verifiedAt` field documented in schema (for future
      tool-level staleness).
- [x] ✅ Index page: tag filter (all unique tags), card grid with
      vendor-colored borders, tool count + revised-date per card,
      footer honesty note explicitly disclosing that affiliate slots
      are empty in 2026-05.
- [x] ✅ Affiliate posture: every `affiliate` field has `status: "none"`
      pending signup with the actual vendor programs (Anthropic refer,
      GitHub Octoverse, Intercom partner, etc.). No fake/broken
      affiliate URLs shipped.
- [x] ✅ `npm run gen-toolradar` added to package.json.
- [x] ✅ sitemap.xml +5 entries (index priority 0.9, leaves 0.85).
- [x] ✅ 109/109 tests pass.
- [ ] **Open follow-ups:**
      - **Live affiliate IDs.** Sign up for: Anthropic Affiliate
        Program (when public), GitHub Copilot partner program,
        Intercom partner, Hetzner (already in InfraCost), Cursor / Mem
        / Reflect referrals. Replace `status: "none"` → `"live"` with
        real URL fragment.
      - **+3 categories.** `meilleur-ai-no-code`, `meilleur-vps-vs-cloud`,
        `meilleur-saas-comptabilite-fr`.
      - **Quarterly re-review cron.** Bump `lastReviewed` + per-tool
        `verifiedAt` every 3 months; surface "this needs re-review"
        warning in the generator when stale.
      - **User vote** (Supabase): 👍/👎 per tool to surface where the
        community disagrees with the editorial score.
      - **Per-tool dedicated landing page** (`/tool-radar/tools/<slug>`)
        for deep SEO on high-intent commercial queries
        ("cursor pricing", "windsurf free tier").

### 6.12 — FailBase ✅ SHIPPED 2026-05-15 — WAVE 3 COMPLETE 🎉

- [x] ✅ Schema in `data/failbase/_schema.md`. Each `<slug>.json`
      carries title, company, lived (date span), totalLoss (with
      attribution), founders, tldr, icon, color, lastReviewed,
      tags, timeline[] (5-8 events), mistakes[] (4-6 ranked w/
      evidence + source), afterStory, lessonForUs, sources[],
      disclaimer. Honesty rules baked in: "no insider rumors",
      "loss figures public-only", "lessons stay applicable".
- [x] ✅ 4 datasets shipped (Quibi, Nokia, Metaverse Meta, Worst
      Startup Decisions). Every mistake's `evidence` cites a
      verifiable public source: SEC filings (Meta 10-K, WeWork S-1),
      DOJ verdict (Theranos), FTC settlement (MoviePass), WSJ/NYT
      post-mortems, Engadget memo (Nokia 'burning platform'), HBR
      case studies.
- [x] ✅ `scripts/gen-failbase-pages.js` (`npm run gen-failbase`,
      idempotent). Generates per-failure page + grid index. **5 pages
      total.**
- [x] ✅ Per-failure page renders: hero with 3-stat strip
      (lived / total-loss / key-person), color-themed timeline rail
      (vertical with date pills), ranked mistake cards with evidence
      block + source link, "what happened after" blue callout,
      "lesson for us" purple gradient, sources list with disclaimer.
      Article JSON-LD schema with `about` → company name.
- [x] ✅ Index page: tag filter + per-card icon + lived dates +
      total-loss pill + mistake count + revised date. Color-themed
      cards by failure (red Quibi, purple Nokia, blue Meta, dark-red
      meta-compilation).
- [x] ✅ Freshness pill: green ≤6 months, amber ≤18, red after
      (business post-mortems age slow — Quibi 2020 still relevant in
      2026 — so wider bands than DevStack).
- [x] ✅ `npm run gen-failbase` in package.json.
- [x] ✅ sitemap.xml +5 entries (index 0.85, leaves 0.8).
- [x] ✅ 109/109 tests pass.
- [ ] **Open follow-ups:**
      - **+5 datasets:** "Why Yahoo missed Google search" ✅,
        "Theranos deep dive standalone" ✅, "Juicero $400 fridge" ✅,
        "Pets.com 2000 IPO" ✅, "Stadia Google killed it again" ✅
        (2026-05-17: Theranos standalone post-mortem shipped — 5/5 datasets done).
      - **+FTX post-mortem ✅ DONE 2026-06-01** —
        `ftx-effondrement-crypto-2022.json`, 6 mistakes sourced on DOJ
        SDNY + SEC + CFTC + CoinDesk + Kroll Restructuring registry.
        FailBase cluster 9 → 10 entries.
      - **Affiliate slots:** book affiliates for "The Cult of We"
        (WeWork), "Bad Blood" (Theranos), "Operation Elop" (Nokia),
        etc. — natural Amazon affiliate fit per page.
      - **"Founder pattern" cross-link** — once we have 8+ pages,
        identify recurring patterns (over-funding pre-PMF, refusing
        to pivot, scaling before product works) and link pages
        sharing the same pattern.
      - **Audio version** — these post-mortems work well as 8-min
        podcasts; consider TTS export.

---

## 📦 Content expansion R12 (2026-06-04)

Scheduled-agent run extending the comparator cluster (16 → 17 entries) with the
canonical AWS Architect progression decision the dataset was missing:

- **+1 Cert Comparator page** (cluster 16 → 17):
  - `aws-sap-c02-vs-aws-saa-c03` — the classic AWS Architect Associate →
    Professional progression decision. 9 verdict rows covering: débutants AWS
    (SAA d'abord), Cloud Engineer / Architect junior-à-mid en France (SAA), SAA
    + 1-2 ans prod cherchant un boost TJM (SAP), architectes en poste AWS-shop
    (SAP), consulting AWS / ESN AWS Partner / TJM 600€+ (SAP), budget formation
    serré 150-300$ (SAA), trifecta SAA + SOA/DVA + SAP (SAA en premier),
    préparation de migration AWS d'envergure (SAP), "passer les deux en 6 mois"
    (SAA — risque de bachotage SAP sans expérience).
  - `salaryAlias: "aws-saa"` résout la médiane France (65k€ senior) ; la SAP n'a
    pas encore de fiche salaire donc la cellule affiche "—" proprement.
  - Data + generator pattern matches `_schema.md` (no schema drift).
- `scripts/gen-compare-pages.js` `CACHE_BUST` bumped v=106 → v=128 to align with
  the current global `?v=` key — regeneration no longer downgrades the 16
  sibling pages' cache-bust (the recurring generator-drift documented in 6.x
  cross-cutting).
- `npm run gen-compare` regenerated 17 comparator pages + the `/compare/` index
  (idempotent — only the new page + index changed after the CACHE_BUST bump).
- sitemap.xml +1 entry (priority 0.85, monthly changefreq, lastmod 2026-06-04).
- 260/260 tests still pass. No CSS/JS cache version bump (new HTML data only).

## 📦 Content expansion R11 (2026-06-03)

Scheduled-agent run extending the FailBase cluster (10 → 11 entries) with
the canonical SoftBank/Vision-Fund post-mortem the dataset was missing:

- **+1 FailBase post-mortem** (cluster 10 → 11):
  - `wework-47-milliards-fiasco` — Adam Neumann + Masayoshi Son, ~47 Md $
    de valorisation en janvier 2019 → S-1 d'IPO en août → retrait en 33
    jours → bailout SoftBank 9,5 Md $ → SPAC 2021 → Chapter 11 le 6
    novembre 2023 → ~14,3 Md $ de write-downs totaux côté SoftBank
    (la plus grosse single-position loss du Vision Fund). 5 erreurs
    rangées par impact : (1) vendre du real-estate comme de la tech
    pour justifier un multiple 26x, (2) mismatch de duration radical
    (baux 10-15 ans côté actif vs contrats 30 jours côté passif),
    (3) gouvernance Neumann (super-voting 20x + transactions de
    complaisance), (4) le pump SoftBank (valorisations en escalier
    sans test de marché public), (5) expansion sans unit economics
    validés. Timeline 11 événements d'avril 2010 (fondation SoHo) à
    juin 2024 (sortie de Chapter 11).
  - **Sources publiques uniquement** : SEC (S-1 filing, le document qui a
    tout révélé), NYT (post-mortems + bailout coverage), WSJ ("$700M
    cashed out"), Reuters (filing + record Vision Fund losses), Scott
    Galloway "WeWTF" (analyse pré-IPO d'août 2019). Pas de gossip, pas
    de rumeurs Twitter, pas de podcast non-vérifié.
  - Article JSON-LD, canonical, OG tags, cache-busted CSS (?v=123) —
    contraintes du brief respectées. `tldr` ramené à ~190 chars pour
    rapprocher la `<meta description>` du seuil 160 (le template
    failbase l'enrobe légèrement).
- `scripts/gen-failbase-pages.js` `CACHE_BUST` bumped v=106 → v=123 to
  align with the current global `?v=` key — regeneration no longer
  downgrades the 10 sibling pages' cache-bust (same drift recorded in
  R9 for `gen-compare-pages.js`).
- `npm run gen-failbase` regenerated 11 pages + the `/failbase/` index
  (only the new page + index changed — generator idempotent). The grid
  index auto-incorporated "WeWork" into its meta description.
- sitemap.xml +1 entry (priority 0.8, monthly changefreq, lastmod
  2026-06-03).
- 260/260 tests still pass. No cache version bump (new HTML data only,
  no JS/CSS changes).

## 📦 Content expansion R10 (2026-06-01)

Scheduled-agent run diversifying away from the comparator cluster (16/15
already met) into FailBase — adding a high-value, abundantly-sourced
business post-mortem the cluster was missing:

- **+1 FailBase post-mortem** (cluster 9 → 10):
  - `ftx-effondrement-crypto-2022` — l'effondrement à 32 G$ de FTX et
    Alameda Research en 10 jours (novembre 2022), condamnation SBF à
    25 ans + 11,02 G$ de confiscation (mars 2024). 6 erreurs rangées
    par impact : commingling fonds clients FTX/Alameda (la fraude
    centrale), collatéral circulaire FTT, zéro contrôle interne (cité
    de John J. Ray III "never in my career…"), prêts personnels
    massifs sur fonds clients (2,2 G$ à SBF), marketing Super
    Bowl/Tom Brady/F1 avant fondamentaux audités, influence politique
    via dons (40+ M$ au cycle 2022). Timeline 13 événements de
    Novembre 2017 (création Alameda) au plan de réorganisation
    octobre 2024.
  - **Sources publiques uniquement** : DOJ SDNY press releases (verdict
    2 nov 2023 + sentencing 28 mars 2024), SEC complaint 13 déc 2022,
    CFTC charges 13 déc 2022, CoinDesk Alameda balance-sheet leak (Ian
    Allison, 2 nov 2022), Kroll Restructuring (registre Chapter 11 +
    déclarations John J. Ray III), DOJ acte d'accusation initial. Pas
    de gossip Twitter ni de podcast non-vérifié.
  - `metaTitle` 58 chars, `metaDescription` 155 chars, Article JSON-LD,
    canonical, OG tags, cache-busted CSS (?v=106) — toutes les
    contraintes du brief respectées.
- `npm run gen-failbase` regenerated 10 pages + the `/failbase/` index
  (only the new page + index changed — generator idempotent).
  sitemap.xml +1 entry (priority 0.8, monthly changefreq).
- 199/199 tests still pass. No cache version bump (new HTML data only,
  no JS/CSS changes).

## 📦 Content expansion R9 (2026-05-30)

Scheduled-agent run, extending the comparator cluster past the 15-page target
(now **16/15**) with a high-search-volume Kubernetes decision page:

- **+1 Cert Comparator page** (cluster 15 → 16):
  - `cka-vs-cks` — the classic Kubernetes admin → security progression
    decision. 7 verdict rows covering: débutants k8s (CKA d'abord, point),
    seniors CKA cherchant un boost TJM (CKS), Platform/SRE généraliste
    (CKA suffit), Cloud Security / DevSecOps (CKS), boîte ISO 27001 / SOC 2
    sur k8s (CKS), trifecta CKA + CKAD + CKS (CKA en premier), budget
    serré 395$ (CKA — la CKS l'exige administrativement).
  - `salaryAlias: "cka"` résout la médiane France (72k€ senior) ; la CKS
    n'a pas encore de fiche salaire donc la cellule affiche "—" proprement.
  - Data + generator pattern matches `_schema.md` (no schema drift).
- `scripts/gen-compare-pages.js` `CACHE_BUST` bumped v=102 → v=104 to align
  with the current global `?v=` key — regeneration no longer downgrades the
  15 sibling pages' cache-bust (the same drift recorded in 6.x cross-cutting).
- `npm run gen-compare` regenerated 16 comparator pages + the `/compare/`
  index. sitemap.xml +1 entry (priority 0.85, monthly changefreq).
- 199/199 tests still pass. No CSS/JS cache version bump (new HTML only).

## 📦 Content expansion R8 (2026-05-28)

Scheduled-agent run closing out the "target 15+ comparison pages" goal —
the comparator cluster now hits **15/15**. One new high-search-volume
comparison shipped this run:

- **+1 Cert Comparator page** (cluster 14 → 15, target met):
  - `comptia-a-plus-vs-comptia-network-plus-vs-comptia-security-plus` —
    the canonical CompTIA-trifecta entry-level decision ("par laquelle
    commencer / dans quel ordre"). 3-way (A+ vs Network+ vs Security+),
    6 verdict rows covering: zéro-expérience débutant, socle réseau avant
    spécialisation, objectif cyber direct, meilleur salaire d'entrée,
    poste défense/DoD 8570, pipeline vers CCNA, et l'ordre canonique
    A+ → Network+ → Security+.
  - `salaryAlias: "comptia-security-plus"` resolves the Security+ France
    median into the table; A+ and Network+ have no salary file yet so
    those cells show "—" gracefully.
  - Data + generator pattern matches `_schema.md` (no schema drift).
- `npm run gen-compare` regenerated 15 comparator pages + the `/compare/`
  index (idempotent — only the new page + index changed). sitemap.xml +1
  entry (priority 0.85, monthly changefreq).
- 120/120 tests still pass. No cache version bump (new HTML only, no
  JS/CSS changes).

## 📦 Content expansion R7 (2026-05-27)

Scheduled-agent run, continuing the "target 15+ comparison pages" content
push (now 14/15). One new high-search-volume comparison shipped this run:

- **+1 Cert Comparator page** (cluster 13 → 14):
  - `az-104-vs-az-204` — the classic Microsoft Azure Associate decision
    (Administrator vs Developer). 10 verdict rows covering: default pick,
    dev .NET/Node/Python rôle, architect/Platform rôle, AZ-305 pipeline,
    AZ-400 pipeline, salary maxing, ESN .NET shops, Microsoft Solutions
    Partner staffing, sysadmin/VMware → Azure reconversion, "passer les
    deux en 6 mois" sequence.
  - `salaryAlias: "az-104"` resolves to the existing France salary band
    (med 60k€ senior); AZ-204 has no salary file yet so the cell shows
    "—" gracefully.
  - Data + generator pattern matches `_schema.md` (no schema drift).
- `npm run gen-compare` regenerated 14 comparator pages + the
  `/compare/` index. sitemap.xml +1 entry.
- 120/120 tests still pass. No cache version bump (new HTML only, no
  JS/CSS changes).

## 📦 Content expansion R6 (2026-05-25)

Scheduled-agent run, continuing the "target 15+ comparison pages" content
push (now 13/15). One new high-search-volume comparison shipped this run:

- **+1 Cert Comparator page** (cluster 12 → 13):
  - `aws-soa-c02-vs-aws-saa-c03` — the classic AWS Associate decision on
    the Ops side (SysOps Administrator vs Solutions Architect). 9 verdict
    rows covering: default pick, Cloud Ops / SRE rôle, architect/consulting
    rôle, salary maxing, SAP-C02 pipeline, MSP / FinOps shops, AWS partner
    staffing, "fuir les labs notés", "passer les deux en 6 mois" sequence.
  - `salaryAlias: "aws-saa"` resolves to the existing France salary band;
    SOA has no salary file yet so the cell shows "—" gracefully.
- **Generator de-staling**: `scripts/gen-compare-pages.js` `renderIndex`
  was dropping the OG/Twitter meta tags on every regeneration (someone
  had patched them in manually after the last gen). Added them to the
  template so the regression doesn't recur. `CACHE_BUST` left at v=102
  (no JS/CSS bump this run).
- `npm run gen-compare` regenerated 13 comparator pages + the
  `/compare/` index. sitemap.xml +1 entry.
- 120/120 tests still pass.

## 📦 Content expansion R5 (2026-05-24)

Scheduled-agent run targeting the "target 15+ comparison pages" content
queue. One new high-search-volume comparison shipped this run:

- **+1 Cert Comparator page** (cluster 11 → 12):
  - `aws-dva-c02-vs-aws-saa-c03` — the classic AWS Associate decision
    (Developer vs Solutions Architect). 8 verdict rows covering: default
    pick, dev-backend rôle, architect/consulting rôle, salary maxing,
    SAP-C02 pipeline, serverless-only teams, AWS partner staffing,
    "passer les deux en 6 mois" sequence.
  - Data + generator pattern matches `_schema.md` (no schema drift).
  - `salaryAlias: "aws-saa"` resolves to the existing France salary band;
    DVA has no salary file yet so the cell shows "—" gracefully.
- `npm run gen-compare` regenerated 12 comparator pages + the
  `/compare/` index. sitemap.xml +1 entry.
- 120/120 tests still pass. No cache version bump (new HTML only, no
  JS/CSS changes).

## 📦 Content expansion R4 (2026-05-15)

After R3, +6 hand-authored content pages on the slower-to-write
"opinionated tools" categories:

- **+3 PromptDungeon workflows** (cluster 4 → 7):
  - `cloud-cost-auditor` (5 prompts: bill decoder, EC2 rightsizing,
    S3 lifecycle generator, RI vs Spot decision matrix, Data
    Transfer leak debug)
  - `linux-ops` (5 prompts: high-load triage, disk-full emergency,
    systemd service won't start, log pattern analysis, kernel-panic
    post-mortem)
  - `oncall-postmortem` (4 prompts: 3am investigation runbook,
    blameless post-mortem template Google SRE style, Five Whys
    deep-drill, action-item killer)
- **+3 ToolRadar categories** (cluster 4 → 7):
  - `meilleur-ai-no-code` (5 tools: Lovable, Bolt.new, v0, Replit,
    Cursor) — winner v0 4.45
  - `meilleur-vps-cloud-hosting` (5 tools: Hetzner, Fly.io, Railway,
    Vercel, DigitalOcean) — winner Fly.io 4.15
  - `meilleur-saas-comptabilite-fr` (5 tools: Indy, Tiime, Shine,
    Freebe, Dougs) — winner Indy 4.15 (3-way tie at 4.15, editorial
    pick = broadest fit)
- Verdict-vs-math consistency audit: all 3 new ToolRadar winners
  align with weighted score (saas-compta tie noted in disclaimer).
- sitemap.xml +6 entries (3 prompt-dungeon + 3 tool-radar).

## 📦 Content expansion R3 (2026-05-15)

After R2, +8 viral-content pages, all citation-backed:

- **+5 RealityCheck myths** (cluster 5 → 10):
  - `bootcamp-job-3-mois` — CIRR + France Stratégie + Course Report
  - `dubai-zero-impot-it` — UAE Federal Tax Authority + impots.gouv.fr
    (corporate tax 9% depuis 2023)
  - `chatgpt-tue-jobs-dev` — US BLS + Hired + Stack Overflow Survey
    + GitHub Copilot productivity study
  - `saas-100k-mrr-12-mois` — Indie Hackers data + Pieter Levels
    transparency
  - `master-it-vs-autodidacte` — Stack Overflow Survey + APEC +
    levels.fyi + France Stratégie
- **+3 FailBase post-mortems** (cluster 4 → 7):
  - `juicero-fridge-400-dollars` — Bloomberg vidéo virale 2017
    (le moment qui a tué la boîte)
  - `pets-com-ipo-2000` — SEC filings 1999-2000 + CNN Money +
    WSJ coverage (le symbole bulle dot-com)
  - `yahoo-google-search-rachat-rate` — Google offer $1M en 1998
    + Microsoft offer $44.6B en 2008 + Tumblr write-off + Verizon
    sale (10 ans de "non" qui ont coulé la boîte)

Each fact has a typed evidence pill (data / qualitative / community
/ law) + source URL. RealityCheck pages emit ClaimReview JSON-LD,
FailBase emit Article JSON-LD.

sitemap.xml +8 entries (5 reality-check + 3 failbase).

## 📦 Content expansion R2 (2026-05-15)

After R1, +9 net-new pages targeting international salary SEO + new
cert decision queries:

- **+6 international salary pages**: `az-104.luxembourg`,
  `cissp.luxembourg`, `cissp.belgium`, `cka.belgium`,
  `terraform.luxembourg`, `ccna.belgium`. Salary cluster now has
  14 pages (was 8) across France / Belgium / Luxembourg.
- **+3 cert comparator pages**:
  - `cka-vs-ckad` — Kubernetes admin vs dev decision
  - `az-104-vs-aws-saa-c03` — direct cloud associate duel by sector
  - `terraform-003-vs-az-400` — IaC pure vs full Azure DevOps stack
- Each comparator pulls salary medians from the matching
  /salaire/<alias>.france.json automatically via `salaryAlias`.
- sitemap.xml +10 entries (6 salary + 3 compare + 1 missed).

Footprint: salary 8 → 14, comparator 3 → 6. Total /salaire/ +
/compare/ pages = 20.

## 📦 Content expansion R1 (2026-05-15)

After Wave 3 closeout, +10 net-new content pages across 3
generator-driven categories:

- **+4 salary pages**: `az-104.france`, `cissp.france`, `cka.france`,
  `terraform.france`. Salary cluster now covers AWS / Azure /
  Security / DevOps-K8s / IaC tracks. JobPosting JSON-LD per page.
- **+3 fail-analysis pages**: `cissp` (manager-mindset trap, 5 yrs
  exp required), `az-104` (Portal hands-on, RBAC scope, Networking),
  `terraform` (state drift, workspaces vs stacks, TFC). Paired with
  the matching salary pages for cross-link bait.
- **+3 devstack pages**: `stripe` (Ruby + Sorbet, financial-grade
  ops), `algolia` (C++ search core, bare-metal DSN, Paris HQ),
  `spotify-backend` (massive polyglot JVM, Backstage CNCF, GCP
  migration). All citation-backed.
- sitemap.xml +10 entries.

Footprint: salary 4 → 8, fail-analysis 3 → 6, devstack 4 → 7.

## 🎉 Wave 3 closed (2026-05-15)

All 5 content-authority features shipped:
- 6.8 RealityCheck (5 pages, ClaimReview schema)
- 6.9 DevStack (4 pages + index, Organization schema)
- 6.10 PromptDungeon (4 workflows, HowTo schema)
- 6.11 ToolRadar (4 categories, ItemList schema)
- 6.12 FailBase (4 post-mortems, Article schema)

**21 net-new content pages** across Wave 3, all citation-backed,
all with appropriate schema.org JSON-LD for rich-result eligibility.
Combined with Wave 1-2 (6.1-6.7), **Phase 6 is now 12/13 features
fully shipped in production** (6.7 leaderboard migration applied
2026-05-15 via Supabase MCP — view live, anon SELECT grant
verified). Only 6.13 Exam Radar deferred (depends on accumulating
opted-in users via 6.7 before the topic-frequency pipeline is
meaningful).

### 6.13 — Exam Radar (community-sourced topic frequency) ✅ v1 SHIPPED 2026-06-02

- **Shipped:** `/exam-radar/` — pick a cert → see which topics the community
  reports as most heavily tested vs the practice bank. The topic taxonomy is
  DERIVED client-side from each pack's top ~10 question `tags` (no per-cert
  content authoring). DB (migration `0010_exam_reports`, applied): additive
  `exam_reports` table (per-user/pack/topic votes, public-read RLS, writes via
  SECURITY DEFINER `set_exam_report` capped at 5 topics) + `get_exam_radar`
  (anon, per-topic counts + distinct reporters) + `get_my_exam_report`. The
  radar is **threshold-gated** (≥5 reporters) so a near-empty dataset is never
  shown as fact — below threshold it shows only the practice-bank baseline + an
  honest "help build this" note. Prominent "early community signal" disclaimer.
  Signed-in users get a report form (top-topic checkboxes, max 5, pre-filled
  from their prior report). RPCs functionally verified (simulated auth, rolled
  back). Drawer 📡 + sitemap. Dependency (logged-in user base from 6.4/6.7) is
  now met. **Completes Phase 6.**
- **Deferred (v2):** per-cert static `/exam-radar/<cert>` pages for SEO (today
  one dynamic page + `?pack=` deep-link, to avoid thin/fiction pages while data
  is sparse); active community polling (Discord/Reddit) to seed reports; an
  aggregation cron / vendor-affiliate + lead-gen layer.

### 6.13-orig — Exam Radar (original spec)

URL: `/exam-radar/<cert>`
- **Priority:** P2 (data-dependent)
- **Complexity:** XL — requires data-collection pipeline before any
  page is meaningful.
- **Dependencies:** community polling — Discord/Reddit/Telegram.
  Storage in Supabase or new D1 table. Aggregation cron.
- **Pages:** `/exam-radar/<cert>` per cert; data-driven heatmap of
  topic frequency.
- **SEO impact:** high IF data is real — "what's on the AWS SAA exam".
- **Monetization:** lead gen + cert vendor affiliate.
- **Risks:** **highest data-trust risk** of any feature. Without a
  real submission pipeline, the page is fiction. Defer until 6.4 +
  6.7 are live so we have a logged-in user base to poll.

### 6.x — Implementation order (recommended)

Wave 1 — SEO + lead-gen quick wins (1–2 weeks each):
1. **6.1** Salary After Certification — highest CPM, scales by template
2. **6.2** Cert Comparator — uses existing data, fast win
3. **6.3** Fail Analysis — short content, viral
4. **6.4** Study Planner — lead-gen, modest tech
5. **6.5** Career Paths — lead-gen, complements `/careers/`

Wave 2 — Tools + retention (2–3 weeks each):
6. **6.6** InfraCost Calculator
7. **6.7** Streaks + Leaderboards (introduces Pages Functions)

Wave 3 — Content authority (rolling, 1 page/week):
8. **6.10** PromptDungeon
9. **6.11** ToolRadar
10. **6.8** RealityCheck
11. **6.9** DevStack
12. **6.12** FailBase

Wave 4 — Data-dependent (defer until pipeline exists):
13. **6.13** Exam Radar

### 6.x — Cross-cutting tech debt to address with Phase 6

- [ ] **Pages Functions** — first-time introduction in 6.6 (live AWS
      pricing fetch) or 6.7 (leaderboard refresh). Add a
      `functions/` directory + `wrangler.jsonc` config.
- [ ] **Brevo integration** — only if 6.4/6.5 lead-gen flows decide
      to leave Supabase Auth's transactional email. Alternative:
      keep Supabase + add a `marketing_emails` opt-in column.
- [x] ✅ **Data-freshness convention (2026-05-23)** — all 8 page generators
      already emit `lastReviewed` pills (salary, compare, toolradar,
      reality-check, failanalysis, failbase, devstack, prompt-dungeon).
      Data files carry `"lastReviewed": "2026-05"`. Already live.
- [x] ✅ **Shareable-result URLs (2026-05-23)** — infracost already had hash
      URLs. Added the same pattern to study-planner: state serialised to
      `#encodeURIComponent(JSON.stringify({c,s,e,h,l,o}))` on every render;
      restored on load; "🔗 Partager" button copies the full URL.
- [x] ✅ **Generator drift swept (2026-05-20)** — all 8 page generators
      (`gen-{salary,failanalysis,reality-check,prompt,toolradar,failbase,
      devstack,compare}-pages.js`) had hard-coded `CACHE_BUST='v=87'`
      and a stale 6-item header (News + Google Play). The global `?v=`
      bump + `sync-header.js` curation only ever touched the *output*
      HTML, so every regeneration silently regressed pages. All 8 now
      emit `v=91` + the canonical 4-item nav; verified idempotent
      (regeneration produces zero HTML diff). **Future cache bumps must
      also bump `CACHE_BUST` in these generators**, not just the HTML.

### 6.x — Estimated total

~10–14 weeks across the four waves at one feature/week pace. Wave 1
alone (6.1 → 6.5) yields 12+ new SEO-targeted pages and the two
lead-gen flows that drive everything else.

---

## Phase 5 — Web polish + game-feel + IA cleanup — SHIPPED 2026-05-15 (archived)

> Phase 5 closed on 2026-05-15. All 15 sub-tickets shipped: canonical
> top-bar across all pages, stats→profile redirect, mascot centering,
> health bar with damage flash + cooldown gate (path-mode writes,
> train-mode read-only), in-session HUD on /path.html and the quiz
> runtime, IA collapse (`/train.html` bare → `/certifications/` with
> dual CTAs per pack), responsive path bottom-sheet at desktop sizes,
> chest reward stack, Yes/No drill declarative rewriter, per-node audit
> pass (incl. multi-correct quiz fix), training mode-picker desktop grid.
>
> Per-ticket checklists are in git history — see commits on/around
> 2026-05-15. Kept here only as a marker so newer phases don't reuse
> the same numbering.

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
