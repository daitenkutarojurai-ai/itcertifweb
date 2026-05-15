# RealityCheck dataset schema

One JSON per myth. Each page deconstructs a popular claim with cited
evidence. Generator: `scripts/gen-reality-check-pages.js` →
`/reality-check/<slug>/index.html` + grid index.

## Honesty rules (READ FIRST)

- **Cite source institutions** (URL to their landing page or report).
  If the only source is a Reddit thread, label it `community` and
  treat as anecdote, not statistic.
- **No fabricated numbers.** If we can't find a verifiable figure,
  use qualitative language ("most freelancers report…") and source
  the *pattern*, not a specific number.
- **Verdict must follow evidence.** If 4 of 5 facts say the claim is
  true, the verdict can't be `false`. Conversely, "depends" is a
  legitimate verdict — better than forcing a binary.
- **Add a `lastReviewed` date.** This page rots in 12-24 months
  (laws change, markets shift). Always show the freshness pill.

## Top-level fields

| Field           | Type     | Notes                                                               |
| --------------- | -------- | ------------------------------------------------------------------- |
| `slug`          | string   | URL slug, matches filename and `/reality-check/<slug>/`.           |
| `title`         | string   | H1 framing the myth as a question.                                  |
| `claim`         | string   | The exact claim being tested, in one sentence.                      |
| `verdict`       | string   | `true` / `false` / `partly-true` / `depends` / `outdated`.          |
| `verdictLabel`  | string   | Display label in French (e.g. "Vrai mais étroit").                 |
| `verdictColor`  | string   | Hex color for the verdict badge.                                    |
| `tldr`          | string   | 1-2 sentence summary for grid + page intro.                         |
| `icon`          | string   | Emoji for the index card.                                           |
| `lastReviewed`  | string   | `YYYY-MM`.                                                          |
| `tags`          | string[] | 2-4 tags for the index filter.                                      |
| `facts`         | Fact[]   | 4-6 evidence points, each citation-backed.                          |
| `whoCan`        | string   | Who can hit the outcome promised by the claim (paragraph).          |
| `whoCant`       | string   | Who can't — be specific about the constraints (paragraph).          |
| `realCeiling`   | string   | The honest numeric/practical ceiling for the majority (paragraph). |
| `honestVerdict` | string   | 1-2 sentence summary the reader should walk away with.              |
| `sources`       | array    | Top-level source institutions cited.                                |
| `relatedLinks`  | array?   | Optional links to other pages on the site (career-path, salaire…). |

## `Fact` object

```
{
  "claim": "Short claim being evaluated",
  "fact": "What the data / sources actually say",
  "type": "data" | "qualitative" | "community" | "law",
  "source": { "url": "...", "label": "..." }
}
```

`type` rendering:
- `data`     → green pill "donnée"
- `qualitative` → amber pill "qualitatif"
- `community`   → orange pill "communauté"
- `law`         → blue pill "loi / régulation"

## Verdict color guide

| Verdict       | Color   | When to use                                       |
| ------------- | ------- | ------------------------------------------------- |
| `true`        | #34d399 | Claim is straightforwardly true.                  |
| `partly-true` | #fbbf24 | Some elements true, with major caveats.           |
| `depends`     | #60a5fa | Context-dependent — can be true or false.         |
| `outdated`    | #c084fc | Was true once, no longer.                         |
| `false`       | #f87171 | Claim is misleading or wrong.                     |
