# Salary dataset schema (Phase 6.1)

Each `<cert>.<country>.json` file under `data/salary/` follows this shape:

```jsonc
{
  "cert":          "aws-saa",          // slug used in URL
  "certTitle":    "AWS Solutions Architect Associate (SAA-C03)",
  "country":       "france",            // slug used in URL
  "countryLabel": "France",
  "currency":     "EUR",                // ISO-4217
  "currencySymbol":"€",
  "lastReviewed": "2026-05",            // YYYY-MM, surfaced on every page

  "sources": [                          // every claim traces back here
    { "name": "APEC",     "url": "https://...", "snapshot": "wayback url" },
    { "name": "Glassdoor","url": "https://...", "snapshot": null },
    { "name": "LinkedIn Salary Insights","url": "https://...", "snapshot": null }
  ],

  "bands": {                            // 3 seniority bands
    "junior":  { "min": 38000, "median": 45000, "max": 55000, "yoe": "0-2y" },
    "senior":  { "min": 55000, "median": 65000, "max": 80000, "yoe": "3-6y" },
    "lead":    { "min": 75000, "median": 90000, "max": 120000, "yoe": "7y+"  }
  },

  "jobTypes": [                         // typical postings the cert unlocks
    "Cloud Engineer", "Solutions Architect", "Cloud Consultant", "FinOps Engineer"
  ],

  "progression5y": [                    // realistic 5-year career steps
    { "year": 0, "title": "Pre-cert (current role)", "salary": 36000 },
    { "year": 1, "title": "Junior Cloud Engineer",   "salary": 42000 },
    { "year": 3, "title": "Cloud Engineer",          "salary": 55000 },
    { "year": 5, "title": "Senior Solutions Architect","salary": 78000 }
  ],

  "roi": {                              // payback calc inputs
    "examCostEur":   150,               // exam fee
    "studyHours":    120,               // typical prep hours
    "hourlyOpportunityCostEur": 25,     // what the time is worth
    "annualSalaryUpliftEur": 8000       // pre/post delta
  },

  "comparison": [                       // sister-country medians for the same band
    { "country": "France",     "median": 55000, "currency": "EUR" },
    { "country": "Belgium",    "median": 58000, "currency": "EUR" },
    { "country": "Luxembourg", "median": 72000, "currency": "EUR" },
    { "country": "Canada",     "median": 70000, "currency": "CAD" },
    { "country": "Remote (EU)","median": 60000, "currency": "EUR" }
  ]
}
```

## Editorial rules

1. **Every salary number must trace back to `sources[]`.** No inventions.
2. **`lastReviewed` is mandatory.** Refresh per file at least quarterly.
   The page surfaces this stamp; users won't trust stale data.
3. **`progression5y` titles must reflect realistic intermediate roles**,
   not aspirational jumps ("Sales rep → Senior Cloud Architect in 3y" =
   no).
4. **Currency mixing in `comparison`** is OK — the renderer formats per
   row. Don't pre-convert; let the user see the local currency.
5. **`bands.median`** drives the headline number. `min`/`max` should
   reflect the 25th / 75th percentile, not absolute extremes (avoid
   the salary-survey selection bias where the 5th and 95th wow people).

## Adding a new dataset

1. `cp data/salary/aws-saa.france.json data/salary/<cert>.<country>.json`
2. Replace every field with sourced data; bump `lastReviewed`.
3. `npm run gen-salary` regenerates `/salaire/<cert>/<country>/index.html`
   + the index at `/salaire/index.html`.
4. Verify the page locally before committing.
