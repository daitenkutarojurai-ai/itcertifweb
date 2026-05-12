# CertQuests — Claude Project Brief

Free practice-test site for IT certifications (AWS, Azure, Cisco, CompTIA,
GCP, Kubernetes, etc.). Static HTML/CSS/vanilla-JS hosted on Cloudflare
Pages via `wrangler.jsonc`. No backend in production today (Supabase is
planned — see TODO.md P1 Phase 3D, deferred).

## Top-level layout

```
index.html                Landing page (heavy inline <style>, ~5000 lines)
path.html                 Duolingo-style learning-path map (Phase 3)
profile.html              Player profile: stats / hats / laurels / share PNG
train.html, stats.html, contact.html, 404.html, privacy-policy.html
careers/, certifications/, learning/, news/, courses/, compare/

data/free/<pack>.json     Question banks (~46 certs; 6 have merge conflicts)
data/paths/<pack>.json    Auto-generated path definitions (33 packs)
data/paths/_index.json    Path discovery index (for /path.html grid)
data/paths/_skipped.json  Structured report: WHY each pack was skipped
data/cosmetics.json       Hat catalog (13 hats — chapter rewards + level gates)

src/
  cq-core.js              BUNDLED — built from the 7 modules below
                          (a11y stats avatar hearts cosmetics daily menu)
                          Loaded once per page → 6 fewer round-trips
  a11y.js                 Focus-trap helper; auto-attaches to [role="dialog"]
  stats.js                Practice-stats reducer (XP / level / streak)
                          Node-compatible: exports CommonJS in test mode
  avatar.js               Header avatar chip + 30 stage emojis
  hearts.js               5-heart lives system, 30-min regen
  cosmetics.js            Hat unlocks + worn-hat overlay
  daily.js                Daily quest banner ("clear 1 node → +20 XP")
  menu.js                 Hamburger drawer (mobile) + sticky header scroll
  mascot.js               Floating tip squid 🦑 (bottom-right)
  mascot-loader.js        Lazy-loads mascot.js on first interaction / 8s idle
  path.js                 Path-map renderer + walker + confetti + chest opener
  profile.js              /profile.html renderer + canvas share PNG
  onboarding.js           Goal-picker on homepage + cert search
  app.js                  SPA shell for the quiz/training flow
  screens/
    home.js, quiz.js, results.js
  engine/
    quizEngine.js, achievements.js, …
  styles/
    main.css              Mobile-shell base
    desktop.css           Web overrides + global mobile responsive
    onboarding.css        Goal-picker styles
    path.css              Learning-path map + chest + minigames
    profile.css           Profile page

scripts/
  gen-paths.js            Generates data/paths/*.json from question banks
  build-core.js           Concatenates 7 modules into src/cq-core.js
  audit-mobile.js, …      Other one-shot scripts

test/
  stats.test.js           33 unit tests via `node --test`

sw.js                     Service worker; bump CACHE_VERSION on deploys
package.json              npm test / npm run gen-paths / npm run build-core
```

## Phase status (see TODO.md for details)

- **Phase 1 — Mascot 🦑** SHIPPED. Floating squid, actionable tips, lazy-load.
- **Phase 2 — Player avatar (header chip)** SHIPPED.
  - Conic-gradient XP ring, 30 stage emojis (egg → phoenix), level badge
  - Auto level-up burst animation
- **Phase 3A — Learning paths** SHIPPED.
  - 33 paths auto-generated; node types: concept · quiz · minigame ·
    subboss · chest · finalboss
  - Hearts/lives, walker on current node, confetti at milestones
- **Phase 3B — Game feel** SHIPPED.
  - Treasure chests (auto-inserted at chapter end)
  - 13-hat cosmetic system (chapter rewards + level milestones 5/10/…/30)
  - Daily quest banner with reset at local midnight
  - Combo flash (×N XP multiplier on chained correct answers)
  - True/false speed-run (second mini-game type, 5s timer per Q)
  - Path index page at /path.html (grid of all 33 paths)
- **Phase 3C — Profile page** SHIPPED.
  - /profile.html with stats grid, 14-day streak heatmap, hat inventory,
    Cert-Survivor laurels (one per cleared final boss), reset progress
  - Canvas-rendered 1080×1080 share PNG with native Web Share API
- **Phase 3D — Supabase accounts** DEFERRED (user request: not yet).
- **Phase 3E — Custom SVG avatars** DEFERRED (need designer pass).
- **Quality pass** SHIPPED: a11y focus-traps, SEO on /path.html, offline
  caching for path JSONs, 33 stats unit tests, lazy mascot, 7-module bundle.

## Critical conventions

- **Heavy inline `<style>` in index.html** — CSS link is in `<head>` but
  inline `<style>` blocks come AFTER it in source order, so inline rules
  override external CSS via cascade. To force a global override, append
  to inline `<style id="mobile-v10-override">` at end of body.
- **`overflow-x: hidden` on html/body breaks `position: sticky`** in
  WebKit. Use `overflow-x: clip` instead (Safari 16+). Already fixed
  in `desktop.css` head.
- **Cache busting**: bump CSS `?v=N` everywhere AND `CACHE_VERSION` in
  `sw.js`. Pages 88 of them; use `grep -rl 'css?v=N' --include="*.html"
  . | xargs sed -i`. Service worker is network-first for CSS/JS so a
  single visit clears it.
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
- **The user has unstashed merge conflicts** in `data/free/aws-saa-c03.json`,
  `aws-dva-c02.json`, `aws-cloud-practitioner.json`, `comptia-security-plus.json`,
  `az-104.json`, `gcp-ace.json`. They're skipped by `gen-paths.js` with
  `reason: parse-error` in `data/paths/_skipped.json`. User must resolve manually.

## Event bus (window-level CustomEvents)

```
cq:session-complete    { packId, secondsSpent, questionsAnswered,
                         correct, mode, bonusXp? }  ← fired by quiz.js,
                         path.js inline nodes, and daily.js reward
   ↓ stats.js
cq:stats-changed       { stats, leveledUp, prevLevel }
cq:level-up            { stats, prevLevel, newLevel,
                         newStageEmoji, newStageName }
cq:cosmetic-unlock     { key }                       ← external trigger
cq:cosmetic-changed    { unlocked, wearing }
cq:heart-lost          { hearts }
cq:daily-changed       { date, progress, claimed }
cq:laurel-earned       { packId }                    ← fired by path.js
cq:a11y-escape         ← fired by a11y.js when a modal is open and
                         Escape is pressed. The modal owner handles close.
```

Quiz screens dispatch `cq:session-complete` from `finishQuiz()` in
`src/screens/quiz.js`. Path-inline nodes (concept, minigame, chest)
dispatch the same event with `mode: 'path-concept' | 'path-minigame' |
'path-chest'`. Daily quest fires synthetic `cq:session-complete` with
`mode: 'daily-quest-reward'` (excluded from re-bumping the bar).

## localStorage keys

```
cq-stats-v1             totalSeconds, questionsAnswered, correctAnswered,
                        sessionsCount, streakDays, lastSessionDate,
                        sessionDates[60], perPack{}, bonusXp, xp, level
cq-cosmetics-v1         { unlocked: string[], wearing: string|null }
cq-hearts-v1            { hearts: 0..5, lastLostAt: ms }
cq-path-progress-v1     { [packId]: { [nodeId]: { completed, completedAt, score } } }
cq-path-pending         { packId, nodeId, at } — handshake from train.html
cq-laurels-v1           [ { packId, earnedAt, score } ]
cq-daily-v1             { date, progress, claimed }
cq-mobile-prompt-dismissed-at
cq-mascot-dismissed-at, cq-mascot-tip-idx
```

## Where to look first

- **Stats/avatar logic** → `src/stats.js`, `src/avatar.js`
- **Path generation** → `scripts/gen-paths.js`, output in `data/paths/`
- **Path UI** → `src/path.js`, `src/styles/path.css`, `path.html`
- **Profile page** → `src/profile.js`, `src/styles/profile.css`, `profile.html`
- **Quiz flow** → `src/screens/quiz.js` (the event source for stats)
- **Mobile CSS** — `src/styles/desktop.css` (despite the name, this
  is the web/desktop CSS with `@media` blocks for mobile overrides)
- **Bundle** → `src/cq-core.js` (generated; edit modules + `npm run build-core`)
- **Tests** — `npm test` (uses `node --test`, no extra deps)
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
