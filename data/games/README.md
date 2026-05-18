# Game-mode content

Authored here, mirrored into `certquestapp/assets/data/games/` by the
native app's `npm run sync:web`.

## Layout

```
data/games/
├── README.md               # this file
├── schema.json             # JSON Schema for every payload type
├── match-pair/
│   ├── example.json        # the file referenced by the path schema
│   └── <pack-id>-<n>.json  # per-cert authored content
├── lightning-round/
├── break-architecture/
├── acronym-decoder/
├── true-false-blitz/
├── scenario-builder/
└── boss-fight/
```

Every file is a **GameNode** payload. Validate against `schema.json`
before committing.

## GameNode shape

```jsonc
{
  "mode": "match-pair",            // discriminator — one of the 7 modes
  "title": "AWS storage services",  // shown above the game
  "explanation": "...",             // optional, shown after Result screen
  "data": { /* mode-specific */ }
}
```

`data` shape per mode is documented inline in `schema.json`. See each
mode's `example.json` for a canonical payload.

## Plugging a game into a learning path

A path's `MinigameNode` opts into a game mode by adding `mode` + `data`
(or `dataRef`) fields:

```jsonc
{
  "id": "ch3-mini",
  "type": "minigame",
  "title": "Storage services drill",
  "mode": "match-pair",
  "dataRef": "../games/match-pair/aws-cp-storage.json"
}
```

`scripts/gen-paths.js` resolves `dataRef` to inline `data` at build time
so the consumer (app + site) never has to fetch a second file.

## Spaced repetition

Not a separate mode — it's a **layer** over the other 7. Wrap any
result via `_spaced-repetition.js`:

```js
import { wrap } from './_spaced-repetition.js';
const result = runMode(payload);
wrap(packId, result); // queues missed items with a shorter due interval
```

The native app exposes the same layer via `lib/spaced-repetition.ts`.
