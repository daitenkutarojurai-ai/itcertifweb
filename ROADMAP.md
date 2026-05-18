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
- [ ] Hook the runner into a `<canvas>`-style host element on
      `path.html` for each minigame node.
- [ ] Author real content per cert (start with AWS Cloud Practitioner
      since it's the most popular pack).
- [ ] Wire `certquestapp/scripts/sync-from-web.sh` to mirror `data/games/`.

### Open questions

- **Match-the-Pair input**: tap-to-pair (simpler, mobile-friendly) wins
  v1. SVG draw-line gesture is a v2.
- **Diagrams**: start with ASCII/text inside `<pre>` — universal and
  zero-dep. Real SVG diagrams arrive once we have a diagram authoring
  pipeline.
- **Spaced repetition surface**: probably a new "Review (N due)" entry
  on `path.html` that batches due items across the active cert.

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
