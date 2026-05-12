# CertQuests — Claude Project Brief

Free practice-test site for IT certifications (AWS, Azure, Cisco, CompTIA,
GCP, Kubernetes, etc.). Static HTML/CSS/vanilla-JS hosted on Cloudflare
Pages via `wrangler.jsonc`. The only server-side surface is Supabase
(auth + per-user data) — everything else is shipped as static assets.

## Top-level layout

```
index.html                Landing page (heavy inline <style>, ~5000 lines)
path.html                 Duolingo-style learning-path map (Phase 3)
profile.html              Player profile: stats / hats / laurels / share PNG
                          + Account section (sign-out, delete-account, edit username)
train.html, stats.html, contact.html, 404.html, privacy-policy.html
reset-password.html       Recovery callback page (Phase 3D)
careers/, certifications/, learning/, news/, courses/, compare/

data/free/<pack>.json     Question banks (~47 certs after CISSP expansion)
data/paths/<pack>.json    Auto-generated path definitions (40 paths)
data/paths/_index.json    Path discovery index (for /path.html grid)
data/paths/_skipped.json  Structured report: WHY each pack was skipped
data/cosmetics.json       Hat catalog (13 hats — chapter rewards + level gates)
data/concept-library.json Hand-authored teaching primers keyed by tag
                          (45 entries — covers ~87% of concept nodes)

src/
  cq-core.js              BUNDLED — built from the 7 modules below
                          (a11y stats avatar hearts cosmetics daily menu)
                          Loaded once per page → 6 fewer round-trips
  a11y.js                 Focus-trap helper; auto-attaches to [role="dialog"]
  stats.js                Practice-stats reducer (XP / level / streak);
                          schema versioned (_v:1) + migrate() on load;
                          exposes window.cqDbg for gated debug logging;
                          Node-compatible: exports CommonJS in test mode
  avatar.js               Header avatar chip + 30 stage emojis
  hearts.js               5-heart lives system, 30-min regen
  cosmetics.js            Hat unlocks + worn-hat overlay
  daily.js                Daily quest banner ("clear 1 node → +20 XP")
                          hidden on /path.html?pack=… (index only)
  menu.js                 Hamburger drawer (mobile) + sticky header scroll
  mascot.js               Floating tip squid 🦑 (bottom-right)
  mascot-loader.js        Lazy-loads mascot.js on first interaction / 8s idle
  path.js                 Path-map renderer + walker + confetti + chest opener;
                          Yes/No mini-game (replaces TF + match);
                          fires cq:path-progress-changed on inline completion
  profile.js              /profile.html renderer + canvas share PNG
                          + Account section (sign-out, delete, username edit)
  onboarding.js           Goal-picker on homepage + cert search
  app.js                  SPA shell for the quiz/training flow

  /* Phase 3D — Supabase accounts (loaded on path/profile/train/index) */
  auth.js                 ES module. Loads @supabase/supabase-js from
                          pinned esm.sh; exposes window.cqAuth (signUp,
                          signInWithPassword, signInWithProvider, signOut,
                          requestPasswordReset, updatePassword, etc.);
                          Capacitor-aware redirect (capacitor://localhost)
  auth-ui.js              Self-injecting header chip + tabbed sign-in/up
                          modal + Google OAuth button + account menu
  sync.js                 Bridges localStorage ↔ Supabase tables.
                          Bootstrap (push-if-cloud-empty, pull-otherwise);
                          event-driven write-through on cq:*-changed
  reset-password.js       Page-only — handles the /reset-password.html
                          callback: detects recovery session, posts new pw

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
  gen-paths.js            Generates data/paths/*.json from question banks.
                          Consults data/concept-library.json; falls back to
                          secondary-tag matching, then auto-derived.
  build-core.js           Concatenates 7 modules into src/cq-core.js
  audit-mobile.js, …      Other one-shot scripts

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

## Critical conventions

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
