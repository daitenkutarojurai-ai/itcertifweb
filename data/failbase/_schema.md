# FailBase dataset schema

One JSON per business post-mortem. Generator:
`scripts/gen-failbase-pages.js` → `/failbase/<slug>/index.html` +
grid index.

## Honesty rules (READ FIRST)

- **No insider rumors.** Every claim must point to a public source:
  SEC filing, WSJ/NYT/FT/Reuters article, official company
  communication, leaked memo whose authenticity has been
  acknowledged by the company. No Twitter threads, no podcasts, no
  "people I know at X".
- **Lived dates are exact.** When a company "died" depends on the
  metric: shutdown announcement, last operating day, last shareholder
  meeting, etc. Pick one and label it.
- **Loss figures are public-only.** Pulled from SEC 10-K / 10-Q,
  earnings calls, or acknowledged press statements.
- **Lessons stay applicable.** The "lesson for us" must be something
  a builder or operator today can act on — not "don't be greedy".

## Top-level fields

| Field         | Type     | Notes                                                            |
| ------------- | -------- | ---------------------------------------------------------------- |
| `slug`        | string   | URL slug.                                                        |
| `title`       | string   | Provocative H1 framing the post-mortem.                          |
| `company`     | string   | Display name (e.g. "Quibi", "Meta Reality Labs").               |
| `lived`       | string   | "Avril 2020 – Décembre 2020 (8 mois)" — labelled date span.     |
| `totalLoss`   | string   | Headline financial figure with a SOURCE-linked citation.         |
| `founders`    | string   | Founder/CEO line.                                                |
| `tldr`        | string   | 1-2 sentence summary.                                            |
| `icon`        | string   | Emoji for the index card.                                        |
| `color`       | string   | Hex color for accent.                                            |
| `lastReviewed`| string   | `YYYY-MM`.                                                       |
| `tags`        | string[] | 2-4 tags for filter.                                             |
| `timeline`    | Event[]  | 5-8 dated milestones (rise → peak → fall).                       |
| `mistakes`    | Mistake[]| 4-6 ranked mistakes, with evidence + source.                     |
| `afterStory`  | string   | What happened to the people / IP / assets after the failure.     |
| `lessonForUs` | string   | One paragraph an operator today can use.                         |
| `sources`     | array    | Top-level references (book, definitive WSJ/NYT post-mortem).     |
| `disclaimer`  | string   | Honesty disclaimer for this post-mortem.                         |

## `Event` object

```
{
  "date": "Aug 2018",
  "event": "Katzenberg announces NewTV (later Quibi), raises $1B+ pre-launch."
}
```

## `Mistake` object

```
{
  "rank": 1,
  "mistake": "Mobile-only, portrait-only launch in April 2020.",
  "why": "The product shipped exactly when phones became less central — COVID lockdowns moved everyone to laptops and TVs.",
  "evidence": "Quibi had zero TV/web client at launch; viewers could not cast to a TV until June 2020.",
  "source": {
    "url": "https://www.wsj.com/articles/...",
    "label": "WSJ — How Quibi Died"
  }
}
```

## Conventions

- Order mistakes from most-impactful to least.
- Keep `mistake` titles short (≤ 80 chars).
- Always cite a source for every mistake's `evidence` — if you
  can't find one, drop the mistake.
- The `lessonForUs` paragraph should be 2-3 sentences max — quotable.
