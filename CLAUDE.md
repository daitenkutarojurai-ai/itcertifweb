# CertQuests — Claude Project Brief

Free practice-test site for IT certifications (AWS, Azure, Cisco, CompTIA,
GCP, Kubernetes, etc.). Static HTML/CSS/vanilla-JS hosted on Cloudflare
Pages via `wrangler.jsonc`. No backend in production today (Supabase is
planned — see TODO.md P1 Phase 3D).

## Top-level layout

```
index.html                Landing page (heavy inline <style>, ~5000 lines)
path.html                 NEW: Duolingo-style learning-path map (Phase 3A)
train.html, stats.html, contact.html, …
careers/, certifications/, learning/, news/, courses/, compare/  Subpages
data/free/<pack>.json     Question banks (~46 certs; some have merge conflicts)
data/paths/<pack>.json    Auto-generated path definitions (33 packs)
src/
  app.js                  SPA shell for the quiz/training flow
  onboarding.js           Goal-picker on the homepage + search
  screens/
    home.js, quiz.js, results.js
  engine/
    quizEngine.js, achievements.js, etc.
  styles/
    main.css              Mobile-shell base
    desktop.css           Web overrides + global mobile responsive
    onboarding.css        Goal-picker styles
    path.css              Learning-path map (Phase 3A)
  stats.js                Phase 2: practice-stats reducer (XP/level)
  avatar.js               Phase 2: header avatar chip with 30 stages
  hearts.js               Phase 3A: 5-heart lives system
  path.js                 Phase 3A: path-map renderer + walker + confetti
  mascot.js               Phase 1: floating tip squid, bottom-right
  menu.js                 Hamburger drawer (mobile)
scripts/
  gen-paths.js            Generates data/paths/*.json from question banks
  audit-mobile.js, etc.   Other one-shot scripts
sw.js                     Service worker; bump CACHE_VERSION on deploys
```

## Phase status (see TODO.md for details)

- **Phase 1 — Mascot 🦑** SHIPPED. Floating squid bottom-right, actionable tips.
- **Phase 2 — Player avatar (header chip)** SHIPPED V21.
  - `src/stats.js` reducer listens to `cq:session-complete`, persists
    `localStorage.cq-stats-v1`, emits `cq:stats-changed` + `cq:level-up`
  - `src/avatar.js` renders the chip; conic-gradient ring = XP progress
  - 30 stage emojis across 5 arcs (hatchling → master)
- **Phase 3A — Learning paths** SHIPPED.
  - 33 paths auto-generated from question banks (`scripts/gen-paths.js`)
  - `path.html` route, winding map UI with locked/unlocked/done/current
    node states
  - 5 node types: concept (flashcards) · quiz · minigame (match) ·
    sub-boss · final boss
  - Hearts/lives system (`src/hearts.js`), 5 max, regen 30 min
  - **Walker** (player avatar sits on current node, walks on completion)
  - **Confetti** on chapter-end / level-up / final boss
- **Phase 3B — Game feel & content** IN PROGRESS. See TODO for tickets.
- **Phase 3D — Supabase accounts** DEFERRED until needed.

## Critical conventions

- **Heavy inline `<style>` in index.html** — CSS link is in `<head>` but
  inline `<style>` blocks come AFTER it in source order, so inline rules
  override external CSS via cascade. To force a global override, append
  to inline `<style id="mobile-v10-override">` at end of body.
- **`overflow-x: hidden` on html/body breaks `position: sticky`** in
  WebKit. Use `overflow-x: clip` instead (Safari 16+). Already fixed
  in `desktop.css` head.
- **Cache busting**: bump CSS `?v=N` everywhere AND `CACHE_VERSION` in
  `sw.js`. Pages 70+, use `grep -rl 'css?v=N' --include="*.html" . |
  xargs sed -i`. Service worker is network-first for CSS/JS so a single
  visit clears it.
- **`menu.js`, `mascot.js`, `stats.js`, `avatar.js`, `hearts.js`** are
  injected before `</body>` on all 86 HTML pages. Order matters: stats
  must load before avatar (avatar reads stats on DOMContentLoaded).
- **Don't break existing `::after` arrows on `.pack-tile-cta`** —
  brand subpages (comptia, servicenow) use this pseudo for their `→` glyph.
  Polish layer button-shine uses inset box-shadow instead.
- **The user has unstashed merge conflicts** in `data/free/aws-saa-c03.json`,
  `aws-dva-c02.json`, `aws-cloud-practitioner.json`, `comptia-security-plus.json`,
  `az-104.json`, `gcp-ace.json`. Skip these when running pack-iteration
  scripts. They must resolve manually.

## Event bus (window-level CustomEvents)

```
cq:session-complete   { packId, secondsSpent, questionsAnswered, correct, mode }
  ↓ stats.js
cq:stats-changed      { stats, leveledUp, prevLevel }
cq:level-up           { stats, prevLevel, newLevel, newStageEmoji, newStageName }
cq:node-complete      (future: from path.js when a node completes)
cq:heart-lost         { hearts }
```

Quiz screens dispatch `cq:session-complete` from `finishQuiz()` in
`src/screens/quiz.js`. Path-inline nodes (concept, minigame) dispatch
the same event with `mode: 'path-concept'` / `mode: 'path-minigame'`.

## Where to look first

- **Stats/avatar logic** → `src/stats.js`, `src/avatar.js`
- **Path generation** → `scripts/gen-paths.js`, output in `data/paths/`
- **Path UI** → `src/path.js`, `src/styles/path.css`, `path.html`
- **Quiz flow** → `src/screens/quiz.js` (the event source for stats)
- **Mobile CSS** — `src/styles/desktop.css` (despite the name, this
  is the web/desktop CSS with `@media` blocks for mobile overrides)
- **TODO.md** — full roadmap with shipped vs. pending tickets

## Pushing changes

```
# Bump CSS versions
grep -rl "css?v=N" --include="*.html" . | xargs sed -i 's/css?v=N/css?v=N+1/g'

# Bump SW cache
edit sw.js CACHE_VERSION

# Stage only the files for this commit (avoid the merge-conflict JSONs)
git reset HEAD; git add specific-files…; git commit; git push
```

The user wants `main` always pushed (memory note). On rebase conflicts
with the JSON quiz files, stash them — they're pre-session work, not ours.
