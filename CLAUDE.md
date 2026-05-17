# CertQuests — Claude Project Brief

Free practice-test for IT certifications (AWS, Azure, Cisco, CompTIA, GCP,
Kubernetes, etc.). Static HTML/CSS/vanilla-JS hosted on Cloudflare Pages
via `wrangler.jsonc`. The only server-side surface is Supabase (auth +
per-user data) — everything else is shipped as static assets.

> ## 🚨 Two products, one data layer — read before touching anything
>
> The repo ships **two distinct products** that happen to share a Git tree.
> Do not blur them; do not "while I'm here" edit across the boundary.
>
> | | **Website** | **App** (Capacitor / Play Store) |
> | --- | --- | --- |
> | Audience | Anonymous visitors, SEO, link-builders | Signed-in / returning users on phone or web |
> | Goal | Get found, get trusted, convert to install/signup | Daily practice, retention, gamified learning |
> | Surfaces | `index.html` (marketing), `/courses/`, `/certifications/`, `/careers/`, `/news/`, `/cheatsheets/`, `/compare/`, `/salaire/`, `/career-path/`, `/study-planner/`, `/infracost/`, `/leaderboard/`, `/reality-check/`, `/devstack/`, `/prompt-dungeon/`, `/tool-radar/`, `/failbase/`, `/fail-analysis/`, `/learning/<pack>/`, `/tools/`, `/skills/`, `404.html`, `privacy-policy.html`, `contact.html` | `path.html`, `train.html?pack=…` runtime, `profile.html`, the in-session HUD (`src/hud.js`), hearts / cosmetics / daily / mascot, auth modal (`src/auth-ui.js`), sync (`src/sync.js`), Capacitor adapters (`src/app-mode.js`, `src/auth.js` Capacitor branches, `src/engine/notifications.js`, `src/engine/ads.js`) |
> | "Don't touch from the other track" | Quiz runtime, gamification, HUD, profile, hearts, cosmetics, leaderboard widget, Capacitor-only behavior | Course-content HTML, careers articles, salary / comparator / reality-check / devstack / failbase / tool-radar pages, programmatic SEO pages |
> | **Shared layer** | `data/free/<pack>.json` (question banks), `data/paths/<pack>.json` + `_index.json`, `data/courses.json`, `data/index.json`, `data/cosmetics.json`, `data/concept-library.json`, the Supabase schema (profiles, stats, path_progress, laurels, cosmetics, hearts, daily, leaderboard view), `src/cq-core.js` bundle, `src/styles/main.css`, `src/styles/desktop.css`, the canonical `<header class="web-header">`, `manifest.json`, `sw.js`. | |
>
> **Rules of engagement:**
> 1. When a task says "the app" or "the website", treat the other product as read-only for that session.
> 2. When a task is ambiguous (e.g. "make it faster", "polish UX", "go on with the roadmap"), ASK which surface before starting — there are two roadmaps and two backlogs hiding in `TODO.md`.
> 3. Course-content expansion (P0 in `TODO.md`) is **website work**, NOT app work — the app reads the same content. Do not pull content tasks into app sessions.
> 4. Phase 6 (Authority + Tools layer, items 6.1-6.13) is **website work** — content templates, SEO pages, calculators rendered as static HTML.
> 5. Phase 5 (Mobile + UX polish + video-game HUD) is **app work** — quiz runtime, HUD, mode picker, path bottom-sheet, mascot.
> 6. The shared layer (data, cq-core, canonical header) can be touched from either track — that's fine because it's shared by definition. A cache-key bump or a sw.js refresh is shared-shell maintenance, not crossing the boundary.
> 7. The `is-app` body-class system (`src/app-mode.js` + CSS rules in `main.css`) is how the shared shell expresses "this surface is opening in-app" — extend that pattern rather than per-page conditional code when chrome needs to differ.

## Top-level layout

Annotation key: 🌐 = website surface · 📱 = app surface · 🔗 = shared layer

```
index.html                🌐 Marketing landing — SEO entry point, install CTA
                          (heavy inline <style>, ~5000 lines; the homepage IS
                           website territory, not app territory)
path.html                 📱 Duolingo-style learning-path map (Phase 3)
profile.html              📱 Player profile: stats / hats / laurels / share PNG
                          + Account section (sign-out, delete-account, edit username)
train.html                📱 Quiz runtime when invoked as /train.html?pack=…
                          🌐 Pack landing when invoked bare (Phase 5.10 redirected
                             bare-page traffic into /certifications/)
reset-password.html       📱 Recovery callback page (Phase 3D)
404.html, contact.html, privacy-policy.html, stats.html (deprecated)
                          🌐 Static website pages

careers/, news/, courses/, certifications/, cheatsheets/, compare/, salaire/,
career-path/, study-planner/, infracost/, leaderboard/, reality-check/,
devstack/, prompt-dungeon/, tool-radar/, failbase/, fail-analysis/,
learning/, tools/, skills/
                          🌐 Website content + tools. All SEO-oriented, all
                             produced by template scripts in `scripts/gen-*.js`.

data/free/<pack>.json     🔗 Question banks (~47 certs after CISSP expansion)
data/paths/<pack>.json    🔗 Auto-generated path definitions (40 paths)
data/paths/_index.json    🔗 Path discovery index (for /path.html grid)
data/paths/_skipped.json  🔗 Structured report: WHY each pack was skipped
data/cosmetics.json       🔗 Hat catalog (13 hats — chapter rewards + level gates)
data/concept-library.json 🔗 Hand-authored teaching primers keyed by tag
                          (45 entries — covers ~87% of concept nodes)
data/index.json, data/courses.json, data/salary/*, data/comparisons/*,
data/career-paths/*, data/devstack/*, data/failbase/*, data/fail-analysis/*,
data/infracost/*, data/prompts/*, data/reality-check/*, data/tool-radar/*
                          🔗 Either shared (banks, paths, courses) or
                             website-only content datasets.

src/
  cq-core.js              🔗 BUNDLED — built from the modules below; loaded once
                          per page so chrome + auth + stats are universal.
  app-mode.js             🔗 Synchronous Capacitor / standalone-PWA detection;
                          sets <html class="is-app|is-standalone|is-ios|is-android">
                          before any other module runs. Exposes window.cqApp.
                          (Always the first module in build-core.js ORDER.)
  a11y.js                 🔗 Focus-trap helper; auto-attaches to [role="dialog"]
  stats.js                🔗 Practice-stats reducer (XP / level / streak);
                          schema versioned (_v:1) + migrate() on load;
                          exposes window.cqDbg for gated debug logging;
                          Node-compatible: exports CommonJS in test mode
  avatar.js               🔗 Header avatar chip + 30 stage emojis
  hearts.js               📱 5-heart lives system, 30-min regen
  cosmetics.js            📱 Hat unlocks + worn-hat overlay
  daily.js                📱 Daily quest banner ("clear 1 node → +20 XP")
                          hidden on /path.html?pack=… (index only)
  hud.js                  📱 In-session quest HUD box (Phase 5.7)
  mascot-cheer.js         📱 Floating cheer toast on level-up / unlock events
  menu.js                 🔗 Hamburger drawer (mobile) + sticky header scroll
  mascot.js               📱 Floating tip squid 🦑 (bottom-right)
  mascot-loader.js        📱 Lazy-loads mascot.js on first interaction / 8s idle
  path.js                 📱 Path-map renderer + walker + confetti + chest opener;
                          Yes/No mini-game (replaces TF + match);
                          fires cq:path-progress-changed on inline completion
  path-progress.js        📱 Pure helper for path progress math (CJS + browser)
  yesno-prompt.js         📱 Pure helper that synthesises Yes/No drill prompts
  profile.js              📱 /profile.html renderer + canvas share PNG
                          + Account section (sign-out, delete, username edit)
  onboarding.js           🌐 Goal-picker on homepage + cert search
  app.js                  📱 SPA shell for the quiz/training flow
  pack-picker.js          🌐 /certifications/ pack tile renderer (Phase 5.10)

  /* Phase 3D — Supabase accounts (loaded on path/profile/train/index) */
  auth.js                 🔗 ES module. Loads @supabase/supabase-js from
                          pinned esm.sh; exposes window.cqAuth (signUp,
                          signInWithPassword, signInWithProvider, signOut,
                          requestPasswordReset, updatePassword, etc.);
                          Capacitor-aware redirect (capacitor://localhost)
  auth-ui.js              🔗 Self-injecting header chip + tabbed sign-in/up
                          modal + Google OAuth button + account menu
  sync.js                 🔗 Bridges localStorage ↔ Supabase tables.
                          Bootstrap (push-if-cloud-empty, pull-otherwise);
                          event-driven write-through on cq:*-changed
  reset-password.js       🔗 Page-only — handles the /reset-password.html
                          callback: detects recovery session, posts new pw

  /* App-only adapters — currently stubs, activate when Capacitor plugins
     are added on the wrapper side. None of these belong on the website. */
  engine/notifications.js 📱 Local notifications (Capacitor stub)
  engine/ads.js           📱 AdMob (Capacitor stub)

  screens/
    home.js, quiz.js, results.js
  engine/
    quizEngine.js, achievements.js, …
  styles/
    main.css              Mobile-shell base + auth modal/chip + reset page
    desktop.css           Web overrides + global mobile responsive
    onboarding.css        Goal-picker styles
    path.css              Learning-path map + chest + Yes/No minigame
    profile.css           Profile page + Account section + empty-state

scripts/
  gen-paths.js            🔗 Generates data/paths/*.json from question banks.
                          Consults data/concept-library.json; falls back to
                          secondary-tag matching, then auto-derived.
  build-core.js           🔗 Concatenates cq-core.js modules. Bump app-mode.js
                          stays at index 0 so the env flag lands early.
  sync-header.js          🔗 Rewrites the canonical <header class="web-header">
                          across all HTML pages (idempotent).
  cert-pack-ctas.js       🌐 Regenerates the per-cert pack-tile CTAs.
  gen-salary-pages.js     🌐 Phase 6.1 — salary pages
  gen-compare-pages.js    🌐 Phase 6.2 — comparator pages
  gen-failanalysis-pages.js 🌐 Phase 6.3 — fail-analysis pages
  gen-career-manifest.js  🌐 Phase 6.5 — career-path index
  gen-reality-check-pages.js 🌐 Phase 6.8 — reality-check pages
  gen-devstack-pages.js   🌐 Phase 6.9 — devstack pages
  gen-prompt-pages.js     🌐 Phase 6.10 — prompt-dungeon pages
  gen-toolradar-pages.js  🌐 Phase 6.11 — tool-radar pages
  gen-failbase-pages.js   🌐 Phase 6.12 — failbase pages
  audit-mobile.js         🔗 Cache-version + mobile-shell sanity check
  …                       Other one-shot scripts (most 🌐 content generators)

test/
  stats.test.js           33 unit tests via `node --test`
  quizEngine.test.js      25 unit tests for the quiz engine

sw.js                     Service worker; bump CACHE_VERSION on deploys.
                          Stale-while-revalidate for own-origin JS/CSS
                          (versioned ?v= keys self-invalidate).
package.json              npm test / npm run gen-paths / npm run build-core
```

## Phase status (see TODO.md for details)

- **Phase 1 — Mascot 🦑** SHIPPED. Floating squid, actionable tips, lazy-load.
- **Phase 2 — Player avatar (header chip)** SHIPPED.
  - Conic-gradient XP ring, 30 stage emojis (egg → phoenix), level badge
  - Auto level-up burst animation
- **Phase 3A — Learning paths** SHIPPED. 40 paths now (CISSP unlocked).
- **Phase 3B — Game feel** SHIPPED. Mini-game reworked from broken TF/match
  into a single "Yes/No quick drill" that works with any MCQ bank.
- **Phase 3C — Profile page** SHIPPED. Plus Account section (Phase 3D R4).
- **Phase 3D — Supabase accounts** SHIPPED in 5 rounds.
  - R1: schema + RLS on 7 tables + magic-link sign-in
  - R2: email/password + Google OAuth + Capacitor detection
  - R3: localStorage ↔ Supabase sync (push-on-claim, pull-on-hydrate,
    event-driven write-through)
  - R4: profile-page Account section, username edit, GDPR self-delete
  - R5: password reset flow with `/reset-password.html` callback
- **Phase 3E — Custom SVG avatars** DEFERRED (need designer pass).
- **Phase 4 (mini-game rework + audit follow-ups)** SHIPPED — 8 rounds:
  qids wire, overflow clip, XSS escape, Yes/No drill, walker pin, confetti
  cap, schema versioning, .cta-* unification, touch targets ≥44px, etc.
- **Content** SHIPPED: concept-library (45 authored tags, 87% coverage),
  +15 CISSP scenario Qs (path unlocked), gen-paths secondary-tag matcher.
- **Quality pass** SHIPPED: a11y focus-traps, SEO on /path.html, offline
  caching, 58 unit tests (stats + quizEngine), lazy mascot, 7-module bundle.
- **Phase 4.3.2 — inline quiz engine** SHIPPED (2026-05-13). Quiz / sub-boss /
  final-boss execute inline in the bottom-sheet (`renderQuizInline()` in
  `src/path.js`) — no more `train.html` redirect.
- **Phase 4.3.6 — path-progress tests** SHIPPED (2026-05-13). Extracted
  `src/path-progress.js` (pure, Node-CommonJS + browser-global dual export),
  rewired `path.js` to delegate, +25 unit tests → 83/83 passing.
- **Phase 5 — Mobile + UX polish + video-game HUD** SHIPPED (2026-05-15).
  All ten tickets shipped: 5.1 canonical top-bar + Profile-link removal,
  5.2 retired (superseded by 5.10), 5.3 course→path cross-link (partial),
  5.4 stats→profile redirect, 5.5 mascot centering, 5.6 health bar +
  damage flash + cooldown gate (path-mode writes, train-mode read-only),
  5.7 HUD always-on for /path.html + combo-tick wire, 5.10 IA collapse
  (`/train.html` → `/certifications/` with dual CTAs per pack), 5.11
  path-sheet desktop sizing, 5.12 chest reward stack with stagger,
  5.13 Yes/No drill declarative rewriter, 5.14 per-node audit pass
  (multi-correct quiz fix), 5.15 train mode-picker desktop card grid.
  See `TODO.md` Phase 5 for shipped checklists.
- **Phase 6 — Authority + tools layer** PLANNED (2026-05-15).
  13-feature batch targeting SEO + lead-gen + retention. Three calculators
  (InfraCost, Career Paths, Study Planner — client-side JS), eight content
  templates (Salary by cert/country, Cert Comparator, Fail Analysis,
  Reality Check, DevStack, PromptDungeon, ToolRadar, FailBase, Exam
  Radar), and two engagement extensions (Streaks/Leaderboards + share).
  Introduces Cloudflare Pages Functions (first time) for live AWS
  pricing fetch + leaderboard refresh. See `TODO.md` Phase 6 for the
  per-feature spec, monetization angles, and recommended four-wave
  implementation order.

## Critical conventions

- **ALWAYS verify on phone AND desktop** before marking a UI change done.
  Phase 4 → 5 transition was triggered by header bugs that survived a
  desktop-only pass. Default verification matrix: 360 × 800 (phone),
  768 × 1024 (tablet), 1440 × 900 (desktop). Header / footer / HUD /
  modal changes must be screenshot-checked at all three.
- **Heavy inline `<style>` in index.html** — CSS link is in `<head>` but
  inline `<style>` blocks come AFTER it in source order, so inline rules
  override external CSS via cascade. To force a global override, append
  to inline `<style id="mobile-v10-override">` at end of body.
- **`overflow-x: hidden` on html/body breaks `position: sticky`** in
  WebKit. Use `overflow-x: clip` instead (Safari 16+). Already fixed
  in `desktop.css` head.
- **Cache busting**: bump every `?v=N` in HTML + `sw.js` `PRECACHE_URLS` +
  `audit-mobile.js` `EXPECTED_VERSION` + `mascot-loader.js` `SRC` const.
  Service worker uses **stale-while-revalidate** for own-origin JS/CSS
  (safe because versioned URLs are unique cache keys per deploy). One
  source of truth — `?v=47` at time of writing.
  ```
  grep -rlE '\.(css|js)\?v=N' --include="*.html" . | \
    xargs -r sed -i -E 's#(\.(css|js))\?v=N#\1?v=N+1#g'
  sed -i -E 's/\?v=N/?v=N+1/g' sw.js src/mascot-loader.js
  sed -i "s/EXPECTED_VERSION = 'N'/EXPECTED_VERSION = 'N+1'/" scripts/audit-mobile.js
  # bump sw.js CACHE_VERSION manually with a meaningful suffix
  ```
- **One bundle, many modules**: edit individual modules in `src/*.js`,
  then run `npm run build-core` to regenerate `src/cq-core.js`. The
  build script is `scripts/build-core.js`. Bundle is checked in so
  deploys don't need a Node toolchain.
- **`cq-core.js`** is loaded once per page before page-specific scripts
  (`path.js`, `profile.js`). Order matters: a11y → stats → avatar →
  hearts → cosmetics → daily → menu. Concatenation preserves it.
- **`mascot-loader.js`** is separate from the bundle on purpose — lazy.
- **Don't break existing `::after` arrows on `.pack-tile-cta`** —
  brand subpages (comptia, servicenow) use this pseudo for their `→` glyph.
- **Button system**: `.cta-primary` / `.cta-secondary` are canonical. The
  legacy `.btn-primary` / `.btn-secondary` were removed in Round 7.
- **Auth secrets**: only the project URL + anon JWT live in browser code
  (`src/auth.js`). The `service_role` and SMTP API keys must NEVER appear
  in any shipped JS / HTML / config — they're Supabase-side only.

## Event bus (window-level CustomEvents)

```
cq:session-complete         { packId, secondsSpent, questionsAnswered,
                              correct, mode, bonusXp? }  ← quiz.js,
                              path.js inline nodes, daily.js reward
   ↓ stats.js
cq:stats-changed            { stats, leveledUp, prevLevel, hydrated? }
cq:level-up                 { stats, prevLevel, newLevel,
                              newStageEmoji, newStageName }
cq:cosmetic-unlock          { key }                      ← external trigger
cq:cosmetic-changed         { unlocked, wearing, hydrated? }
cq:heart-lost               { hearts }
cq:daily-changed            { date, progress, claimed, hydrated? }
cq:laurel-earned            { packId, score? }           ← path.js
cq:path-progress-changed    { packId, nodeId, score }    ← stats.js handshake
                                                           + path.js markComplete
cq:a11y-escape              ← a11y.js — modal owner handles close.

/* Phase 3D events */
cq:auth-changed             { session, event? }          ← auth.js
                              event ∈ SIGNED_IN | SIGNED_OUT |
                              PASSWORD_RECOVERY | TOKEN_REFRESHED | …
cq:sync-claimed             { user_id }                  ← sync.js on first sign-in
cq:sync-hydrated            { user_id }                  ← sync.js on subsequent sign-in
```

**`hydrated: true`** on the three local-state events is the sync.js
back-channel: when sync re-fires those events after a cloud pull, push
handlers must skip them to avoid an infinite round-trip.

Quiz screens dispatch `cq:session-complete` from `finishQuiz()` in
`src/screens/quiz.js`. Path-inline nodes (concept, minigame, chest)
dispatch the same event with `mode: 'path-concept' | 'path-minigame' |
'path-chest'`. Daily quest fires synthetic `cq:session-complete` with
`mode: 'daily-quest-reward'` (excluded from re-bumping the bar).

## localStorage keys

```
cq-stats-v1             { _v:1, totalSeconds, questionsAnswered, correctAnswered,
                          sessionsCount, streakDays, lastSessionDate,
                          sessionDates[60], perPack{}, bonusXp, xp, level }
                          Schema-versioned; src/stats.js migrate() runs on load.
cq-cosmetics-v1         { unlocked: string[], wearing: string|null }
cq-hearts-v1            { hearts: 0..5, lastLostAt: ms }
cq-path-progress-v1     { [packId]: { [nodeId]: { completed, completedAt, score } } }
cq-path-pending         { packId, nodeId, at } — handshake from train.html
cq-laurels-v1           [ { packId, earnedAt, score } ]
cq-daily-v1             { date, progress, claimed }
cq-profile-username     string — cached username pulled from profiles table
                          by sync.js; used by header chip + profile hero
cq-debug                '1' to enable [cq-*] console.warn output in stats.js,
                          path.js, sync.js, etc. (off in production)
cq-mobile-prompt-dismissed-at
cq-mascot-dismissed-at, cq-mascot-tip-idx
```

When the user is signed in, every `cq-*` key listed above (except the
ephemeral handshake / dismissal ones) is also mirrored to Supabase via
`src/sync.js`. See "Supabase schema" below.

## Supabase schema (project `certquests` / `zhxnteqtiyqnyidfkivj`)

Tables — all RLS-enabled, all gated by `auth.uid() = user_id`:

```
public.profiles        ↔ cq-profile-username (also auth.users metadata)
public.stats           ↔ cq-stats-v1 (full jsonb blob)
public.path_progress   ↔ cq-path-progress-v1 (one row per pack × node)
public.laurels         ↔ cq-laurels-v1 (one row per pack)
public.cosmetics       ↔ cq-cosmetics-v1
public.hearts          ↔ cq-hearts-v1
public.daily           ↔ cq-daily-v1 (one row per local day)
```

Every public.* table has `user_id uuid` referencing `auth.users(id)
ON DELETE CASCADE` — so a single delete on the auth row cleans up all
seven application tables atomically (used by `delete_my_account()`).

RPCs (SECURITY DEFINER with internal `auth.uid()` guard, executable only
by `authenticated`):

```
delete_my_account()                       → wipes all user data + auth row
update_my_username(new_username text)     → keeps profiles + metadata in sync
```

Triggers:
- `auth.users` insert → `public.handle_new_user()` → inserts `profiles` row
- `public.*` update → `public.set_updated_at()` → bumps `updated_at`

## Where to look first

- **Stats/avatar logic** → `src/stats.js`, `src/avatar.js`
- **Path generation** → `scripts/gen-paths.js`, output in `data/paths/`
- **Path UI** → `src/path.js`, `src/styles/path.css`, `path.html`
- **Profile page** → `src/profile.js`, `src/styles/profile.css`, `profile.html`
- **Quiz flow** → `src/screens/quiz.js` (the event source for stats)
- **Mobile CSS** — `src/styles/desktop.css` (despite the name, this
  is the web/desktop CSS with `@media` blocks for mobile overrides)
- **Auth** → `src/auth.js` (Supabase client + cqAuth API),
  `src/auth-ui.js` (modal + header chip), `src/sync.js` (cloud sync),
  `src/reset-password.js` + `reset-password.html` (recovery page)
- **Concept content** → `data/concept-library.json` (45 hand-authored
  tag entries). Update + `npm run gen-paths` to apply.
- **Bundle** → `src/cq-core.js` (generated; edit modules + `npm run build-core`)
- **Tests** — `npm test` (58 tests: stats + quizEngine)
- **TODO.md** — full roadmap with shipped vs. pending tickets

## Pushing changes

```
# Bump CSS versions
grep -rl "css?v=N" --include="*.html" . | xargs sed -i 's/css?v=N/css?v=N+1/g'

# Rebuild bundle if you edited any module
npm run build-core

# Run tests
npm test

# Bump SW cache
edit sw.js CACHE_VERSION

# Stage only the files for this commit (avoid the merge-conflict JSONs)
git reset HEAD; git add specific-files…; git commit; git push
```

User memory: `main` is always pushed (no feature branches). On rebase
conflicts with the JSON quiz files, stash them — they're pre-session
work, not ours.
