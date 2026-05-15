# Comparison dataset schema (Phase 6.2)

Each `<slug>.json` file under `data/comparisons/` follows this shape:

```jsonc
{
  "slug":         "aws-saa-vs-az-104-vs-gcp-ace",  // URL slug
  "title":        "AWS SAA vs Azure 104 vs GCP ACE",
  "subtitle":    "Laquelle choisir en 2026 selon ton profil",
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
      "pros": [ "Marché le plus mature en France", … ],
      "cons": [ "Examen très technique pour un débutant", … ],
      "bestFor": "AWS-shops, conseil, freelance cloud."
    }
    /* … 1-2 more entries … */
  ],

  // The verdicts table is the meat. Each row is "if you fit this
  // profile, this cert wins". `winner` is the cert.id. Order matters —
  // most-common profiles first.
  "verdicts": [
    { "profile": "Tu travailles déjà dans une shop AWS.",
      "winner":  "aws-saa-c03",
      "why":    "L'écosystème, le support et les opportunités de mobilité interne sont là." },
    /* … */
  ],

  "tldr":  "Une phrase qui répond à la question si on n'a que 5 secondes."
}
```

## Editorial rules

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
