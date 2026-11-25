# Comparison dataset schema (Phase 6.2)

Each `<slug>.json` file under `data/comparisons/` follows this shape:

```jsonc
{
  "slug":         "aws-saa-vs-az-104-vs-gcp-ace",  // URL slug
  "title":        "AWS SAA vs Azure 104 vs GCP ACE",
  "subtitle":    "Which one to pick in 2026, based on your profile",
  "lastReviewed":"2026-05",                         // YYYY-MM

  // 2-3 certs being compared. `id` must match `data/index.json` packs.
  // `salaryAlias` (optional) → matches data/salary/<alias>.france.json
  // when a salary page exists; lets us pull median into the table.
  "certs": [
    {
      "id":          "aws-saa-c03",
      "displayName":"AWS Solutions Architect Associate",
      "vendor":     "Amazon AWS",
      "examCode":  "SAA-C03",
      "examFeeUsd": 150,
      "color":     "#FF9900",
      "salaryAlias":"aws-saa",
      "pros": [ "The largest cloud job market", … ],
      "cons": [ "A technical exam — not for a complete beginner", … ],
      "bestFor": "AWS shops, consulting, cloud freelancing."
    }
    /* … 1-2 more entries … */
  ],

  // The verdicts table is the meat. Each row is "if you fit this
  // profile, this cert wins". `winner` is the cert.id. Order matters —
  // most-common profiles first.
  "verdicts": [
    { "profile": "You already work at an AWS shop.",
      "winner":  "aws-saa-c03",
      "why":    "The ecosystem, support and internal mobility opportunities are already there." },
    /* … */
  ],

  "tldr":  "One sentence that answers the question if the reader only has 5 seconds."
}
```

## Editorial rules

0. **Write in English.** The pages render with `lang="en"` for a global
   English search audience (US/IN/UK/CA lead Search Console impressions).
   French copy here shipped 19 pages that earned zero impressions until they
   were translated (2026-11). Salary figures may stay in € when they cite the
   FR/BE/LU market — label the market explicitly ("€65k in France").
   Keep `title` ≤ 50 chars: it becomes the `<title>` (+ " · CertQuests").
1. **`certs[].id` must exist** in `data/index.json`. The generator pulls
   question_count + est_hours from there; failing the lookup throws.
2. **Verdicts are evidence-based**. Cite the rationale in `why`. No
   "feels like" claims — point at salary data, market signals, or
   vendor strategy.
3. **`bestFor` is one sentence**. If a cert needs a paragraph to
   describe its niche, the comparison is wrong-shaped.
4. **`lastReviewed` mandatory**. Surfaces on every page.
5. **Limit to 3 certs per page**. More than 3 is a category overview,
   not a comparison.

## Adding a new comparison

1. `cp data/comparisons/aws-saa-vs-az-104-vs-gcp-ace.json
       data/comparisons/<slug>.json`
2. Replace fields. Verify each `certs[].id` resolves in `data/index.json`.
3. `npm run gen-compare` regenerates `/compare/<slug>/index.html` and
   the `/compare/index.html` listing.
