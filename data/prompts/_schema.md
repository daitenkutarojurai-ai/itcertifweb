# PromptDungeon dataset schema

One JSON per workflow. The generator in
`scripts/gen-prompt-pages.js` reads every `data/prompts/<slug>.json`
and emits:

- `/prompt-dungeon/index.html` — workflow grid with tag filters
- `/prompt-dungeon/<slug>/index.html` — per-workflow detail page with
  every prompt, copy-to-clipboard, model-tested freshness pill

## Top-level fields

| Field          | Type      | Notes                                                                 |
| -------------- | --------- | --------------------------------------------------------------------- |
| `slug`         | string    | URL slug. Must match the filename and `/prompt-dungeon/<slug>/`.      |
| `title`        | string    | H1 + grid card title.                                                 |
| `tldr`         | string    | 1-2 sentence summary, used in grid + page intro.                      |
| `vendor`       | string    | Short label for the eyebrow pill (e.g. `AWS`, `Career`, `YouTube`).  |
| `icon`         | string    | Emoji shown on the grid card.                                         |
| `color`        | string    | Hex color for the card border + headings.                             |
| `lastReviewed` | string    | `YYYY-MM` — shown in the page freshness pill.                         |
| `tags`         | string[]  | 2-4 short tags used by the index filter.                              |
| `models`       | string[]  | Models the workflow was authored against (display only).              |
| `prompts`      | Prompt[]  | 3-8 prompts, ordered most-useful-first.                               |
| `affiliate`    | object?   | `{ url, label }` if we link to a tool that helps run these prompts.   |
| `disclaimer`   | string?   | Optional caveat at the bottom of the workflow page.                   |

## `Prompt` object

| Field          | Type      | Notes                                                                              |
| -------------- | --------- | ---------------------------------------------------------------------------------- |
| `id`           | string    | Stable id within the workflow. Used for in-page anchors (#prompt-<id>).            |
| `title`        | string    | One-line label.                                                                    |
| `use_case`     | string    | When/why to use this prompt (the "what problem does it solve").                    |
| `model_tested` | string[]  | Models + dates the prompt was verified against, e.g. `Claude 4.7 Opus (2026-05)`. |
| `prompt`       | string    | The full prompt text. Multi-line allowed. Placeholders use `<ANGLE-BRACKETS>`.    |
| `tips`         | string?   | Optional usage note (e.g. "swap X for Y if you want concise output").              |

## Conventions

- **No fluff prompts.** Each one must solve a concrete problem the
  target user actually has. If you can't name the problem in one
  sentence, drop the prompt.
- **Placeholders use `<UPPER_KEBAB>`** so they're obvious to swap.
- **`model_tested` dates matter.** Prompts age with model updates.
  Re-test every 6 months; bump the date when re-verified.
- **No system-prompt magic.** Prompts should work pasted into a
  standard chat (Claude.ai, ChatGPT, etc.) — no API-only constructs.
- **Honesty.** If a prompt only worked on one model, list only that
  model. Don't claim cross-model generality you haven't verified.
