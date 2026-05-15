# DevStack dataset schema

One JSON per company. Generator: `scripts/gen-devstack-pages.js` →
`/devstack/<slug>/index.html` + grid index.

## Honesty rules (READ FIRST)

- **Public sources only.** Every stack item must cite a public
  engineering blog, conference talk, GitHub repo, or job posting.
  No insider rumors. No "I heard from a friend who works there".
- **Date every claim.** Tech stacks change. Each item has a
  `lastSeen` date (the freshest public source we found) and a
  `status` (`current` / `migrating-from` / `migrated-to` /
  `retired`). The page surfaces a freshness pill.
- **No completeness pretense.** A page covers what's been publicly
  disclosed — not the full stack. Footer disclaimer makes this
  explicit.
- **Sources rot.** Prefer the engineering-blog landing page over a
  specific blog post URL when the topic is enduring (less likely to
  404). Use specific post URLs for time-bound claims.

## Top-level fields

| Field         | Type      | Notes                                                            |
| ------------- | --------- | ---------------------------------------------------------------- |
| `slug`        | string    | URL slug (e.g. `vinted`).                                        |
| `company`     | string    | Display name.                                                    |
| `vertical`    | string    | One-line market description (e.g. "C2C Marketplace").           |
| `founded`     | number    | Year founded.                                                    |
| `hq`          | string    | HQ city / country.                                               |
| `scaleSignal` | string    | One-line public-data scale signal (users, revenue, employees).   |
| `tldr`        | string    | 1-2 sentence summary for the grid + page intro.                  |
| `icon`        | string    | Emoji for the index card.                                        |
| `color`       | string    | Hex color for the page accent.                                   |
| `lastReviewed`| string    | `YYYY-MM` — when the entire dossier was last reviewed.           |
| `tags`        | string[]  | 2-4 tags (e.g. `marketplace`, `fintech`, `streaming`, `health`). |
| `stack`       | Category[]| Grouped stack items by category.                                 |
| `oss`         | OSSItem[] | Notable open-source contributions / repos.                       |
| `culture`     | string    | One paragraph on engineering culture (sources cited).            |
| `hiring`      | string    | One paragraph on hiring posture + careers URL.                   |
| `careersUrl`  | string    | URL to public careers page.                                      |
| `engBlogUrl`  | string    | URL to the engineering blog landing page.                        |
| `sources`     | array     | Top-level sources for cross-cutting claims (eng blog, careers).  |

## `Category` object

```
{
  "category": "Backend",
  "items": [ ItemEntry, ... ]
}
```

## `ItemEntry` object

```
{
  "name": "Ruby on Rails",
  "role": "Main monolith — products, payments, search",
  "since": "2008",
  "status": "current",
  "lastSeen": "2025-09",
  "source": {
    "url": "https://vinted.engineering/...",
    "label": "Vinted Engineering Blog — post title",
    "type": "blog"
  }
}
```

`status` rendering:
- `current`         → green pill "actuel"
- `migrating-from`  → amber pill "en migration sortante"
- `migrated-to`     → blue pill "migration entrante (récent)"
- `retired`         → grey pill "retiré"

`source.type` rendering:
- `blog`   → 📝
- `talk`   → 🎤
- `job`    → 💼
- `github` → 🐙
- `other`  → 🔗

## `OSSItem` object

```
{
  "name": "spinnaker",
  "url": "https://github.com/spinnaker/spinnaker",
  "what": "Multi-cloud continuous delivery platform.",
  "stars": "9.5k+"
}
```

`stars` is a string ("9.5k+") because GitHub numbers shift constantly
— a rough order is enough; we don't try to be live-accurate.
