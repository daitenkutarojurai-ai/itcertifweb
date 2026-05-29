# Roadmap — webitcertif

Single source of truth for IT-certification content and the website.
Native Android app (`certquestapp`) mirrors `data/` from here.

## Learning Path · Game modes (planned)

Duolingo-style minigames that plug into any cert's learning path.
Cert-agnostic: each mode works for AWS CP, SAA-C03, Terraform, KCNA,
Linux+ — the question payload is provided per node.

Authoring lives entirely here, under `data/games/<mode>/*.json`. The
renderers come in two flavors:

- **Website**: vanilla-JS modules under `learning/games/<mode>.js` with
  the canonical lifecycle `init(container, data) / render() /
  handleAnswer(input) / showResult(result)`. A shared `_runner.js`
  loads the JSON for a node and dispatches to the right module by `mode`.
- **Native app** (`certquestapp`): React Native components under
  `components/games/<Mode>.tsx` driven by the same JSON.

| # | Mode | What it tests | UI cue |
|---|------|---------------|--------|
| 1 | Match the Pair | Match keywords/descriptions to service names | Tap A then tap B; pair locks if correct, shakes if wrong. (Drag-line v2.) |
| 2 | Lightning Round | Flash question, 5–10s timer per question | Big countdown bar, streak counter top-right, lives bottom-right. |
| 3 | Break the Architecture | Pick the missing service from a partial diagram | ASCII/SVG diagram + 4 choices below. |
| 4 | Acronym Decoder | Decode an acronym + use case | Acronym title; 4 cards each with "Name + use case". |
| 5 | True / False Blitz | Rapid-fire statements | Two big bottom buttons, ~3s per statement. |
| 6 | Scenario Builder | Build a stack in correct order from a pool | Drag-or-tap pool → ordered slot list. |
| 7 | Boss Fight | 10 mixed Q at end of chapter section | No back button; difficulty rises across Q4–Q10. |
| L | Spaced Repetition | **Layer.** Re-queues missed items Anki-style | Wraps any mode; tracks per-question due dates. |

### Schema

The canonical JSON Schema for every mode's payload lives at
`data/games/schema.json`. Every example file in
`data/games/<mode>/example.json` validates against it.

A `MinigameNode` in `data/paths/*.json` opts into a game mode by adding
two fields:

```json
{
  "id": "minigame-1",
  "type": "minigame",
  "title": "Match these AWS services to their use case",
  "mode": "match-pair",
  "data": { "$ref": "../games/match-pair/example.json" }
}
```

Inline `data` is also allowed (no `$ref`) — the runner inlines references
at sync time so the consuming app gets a self-contained node.

### Tasks

- [x] Author `data/games/schema.json` covering all 7 modes + spaced-repetition.
- [x] Author one example per mode in `data/games/<mode>/example.json`.
- [x] Scaffold vanilla-JS stubs under `learning/games/<mode>.js`.
- [x] Scaffold `_runner.js` (JSON loader + dispatcher) and
      `_spaced-repetition.js` (layer).
- [x] **Mode 1 — Match the Pair: real implementation** (2026-05-18).
      `learning/games/match-pair.js` is no longer a stub — tap-to-pair,
      shuffled right column, lock/wrong-shake, combo bonus, fires
      `cq:session-complete` via the opts.onComplete callback. CSS in
      `src/styles/path.css` under the `.game-match-pair` block.
- [x] **Hook the runner into `path.html` for each minigame node**
      (2026-05-18). `src/path.js` adds `renderModeInline()` — when a
      minigame node carries `{ mode, data }`, dynamically imports
      `_runner.js`, mounts the right mode into the bottom-sheet, and
      wraps completion in the same Continue summary the Yes/No drill
      uses. Falls back to `renderYesNoInline` for legacy paths.
- [x] **Modes 2-7: real implementations** (2026-05-29). All six stubs
      under `learning/games/` are now real: true-false-blitz,
      lightning-round, acronym-decoder, scenario-builder,
      break-architecture, boss-fight. Shared lifecycle (init/render/
      handleAnswer/showResult → `opts.onComplete`), countdown bars
      (tf/lightning), per-question option-shuffle with correct-index
      remap, combo bonus + heart loss on wrong, reveal + explanation.
      boss-fight fetches the cert pack via `opts.packId` and orders by
      `difficultyCurve`. CSS in `src/styles/path.css`. Still dormant in
      prod until path nodes opt in via `{ mode, data }` (next task).
- [~] Author real content per cert — **8 certs done** (2026-05-29): AWS CP,
      SAA-C03 (SQS decoupling / serverless API / EBS), DVA-C02 (CI/CD / SAM),
      AZ-900 (AKS / Azure scope hierarchy), Security+ (SIEM / incident-response
      lifecycle), Network+ (OSI order / DHCP / router), GCP-ACE (GKE / GCP
      hierarchy), CKAD (HPA / expose-app). `gen-paths.js` injects hand-authored
      payloads from
      `data/games/<mode>/<packId>.json` as bonus mini-game nodes (regen-safe,
      one per chapter before the chest). Authored for AWS CP the modes that
      can't be auto-derived from an MCQ bank: break-architecture (ALB),
      acronym-decoder (IAM), scenario-builder (static-site hosting). Drop a
      `<packId>.json` under any mode dir to add more certs.
      NOTE: committed `data/paths/*.json` have drifted from their packs and
      several new packs (okta, pccse, cyberops, az-140/800/801, …) have no
      path yet — a full `npm run gen-paths` + commit pass is a good follow-up.
- [ ] Wire `certquestapp/scripts/sync-from-web.sh` to mirror `data/games/`.

### Open questions

- **Match-the-Pair input**: tap-to-pair (simpler, mobile-friendly) wins
  v1. SVG draw-line gesture is a v2.
- **Diagrams**: start with ASCII/text inside `<pre>` — universal and
  zero-dep. Real SVG diagrams arrive once we have a diagram authoring
  pipeline.
- **Spaced repetition surface**: SHIPPED (2026-05-29). `window.cqSR`
  (`src/sr.js`, in the cq-core bundle; storage `cq-sr-<packId>`, SM-2-light)
  tracks missed questions. The path inline quiz (`path.js`) and the SPA quiz
  (`screens/quiz.js`) both report answers to it. A "🔁 Review N due" CTA in the
  per-cert `path.html` header launches a focused review of the due items via
  the quiz runtime, which graduates/resets each item. Only *missed* items are
  enqueued (a first-sight correct answer is never queued), so the review list
  stays signal. The older `learning/games/_spaced-repetition.js` (itcertif_*
  namespace) remains a dormant games-runner-layer variant.

---

## How to add a new mode

1. Add the mode to the `oneOf` discriminator in `data/games/schema.json`.
2. Add one canonical example at `data/games/<new-mode>/example.json`.
3. Add a vanilla renderer at `learning/games/<new-mode>.js`.
4. Mirror the changes in `certquestapp`:
   - new type in `lib/games-types.ts`
   - new component in `components/games/<NewMode>.tsx`
   - dispatcher in `app/path/games/[…].tsx` learns about the new mode.
5. Update this roadmap.
