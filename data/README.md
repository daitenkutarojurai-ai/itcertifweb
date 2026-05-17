# `data/` — shared data layer

Everything under `data/` is the **shared layer** between the two products
in this repo. Both surfaces read from here; neither owns it. See the "Two
products, one data layer" section at the top of `/CLAUDE.md` for the full
boundary.

## Who reads what

```
data/free/<pack>.json           📱 app reads — quiz runtime + path nodes
                                🌐 website reads — /train.html landing, count
                                   stats on /certifications/, programmatic
                                   pages that quote pack size

data/paths/<pack>.json          📱 app reads — /path.html node graph
data/paths/_index.json          📱 app reads — /path.html grid
data/paths/_skipped.json        🔧 build-tool input only (gen-paths report)

data/cosmetics.json             📱 app reads — hat catalogue, unlocks
data/concept-library.json       🔧 build-tool input only (gen-paths concept text)

data/index.json                 🌐 website reads — /certifications/, hub pages
data/courses.json               🌐 website reads — /courses/ index
                                📱 NOT used by the app runtime

data/salary/                    🌐 website only — Phase 6.1 generator input
data/comparisons/               🌐 website only — Phase 6.2
data/fail-analysis/             🌐 website only — Phase 6.3
data/career-paths/              🌐 website only — Phase 6.5
data/infracost/                 🌐 website only — Phase 6.6 (client-side fetch)
data/reality-check/             🌐 website only — Phase 6.8
data/devstack/                  🌐 website only — Phase 6.9
data/prompts/                   🌐 website only — Phase 6.10
data/tool-radar/                🌐 website only — Phase 6.11
data/failbase/                  🌐 website only — Phase 6.12
data/learning/                  🌐 website only — long-form course chapters
```

## Edit rules

- **Question banks (`data/free/*.json`)** are the single largest contract
  between the app and the website. Schema changes ripple to both — never
  add a field without checking who consumes it (`grep -rn "meta.id\|chapters\|tag" src/ scripts/`).
- **Path JSON** is generated from question banks by `scripts/gen-paths.js`.
  Hand-editing a path file will be overwritten on the next `npm run gen-paths`.
  Edit the question bank or `data/concept-library.json` instead.
- **Website-only datasets** (Phase 6.x folders) are consumed by their
  matching `scripts/gen-*.js` script and rendered as static HTML pages
  under the matching site directory. The app never imports them. Adding
  one means more website pages, not more app content — see
  [`feedback-app-website-no-overlap`](../.claude/projects/-home-flammeur-webitcertif/memory/feedback_app_website_no_overlap.md) memory.

## Supabase tables (live remote)

Stored in the project `certquests / zhxnteqtiyqnyidfkivj`, not in this
repo. Schema mirrors the localStorage keys listed in `/CLAUDE.md`. Both
surfaces read them via `src/sync.js`. Treat them as part of the shared
layer — schema migrations belong in `docs/migrations/`.
