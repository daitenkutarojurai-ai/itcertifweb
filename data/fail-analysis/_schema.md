# Fail-analysis dataset schema (Phase 6.3)

Each `<cert>.json` file under `data/fail-analysis/` follows this shape:

```jsonc
{
  "cert":         "ccna",
  "certTitle":   "Cisco CCNA 200-301",
  "examCode":    "200-301",
  "vendor":      "Cisco",
  "color":       "#1D63ED",
  "lastReviewed":"2026-05",
  "passRateNote":"Cisco ne publie pas le taux officiel; estimations 70-80%.",

  "intro":       "Une phrase qui pose le problème (pourquoi cette cert a une réputation difficile).",
  "tldr":        "La règle d'or qui résume tout en une phrase.",

  "sources": [
    { "name": "r/ccna",                "url": "https://reddit.com/r/ccna" },
    { "name": "Cisco Learning Network","url": "https://learningnetwork.cisco.com/s/community" }
  ],

  // Top 5 mistakes — order = frequency (1 = most common)
  "mistakes": [
    {
      "rank":      1,
      "mistake":   "Sous-estimer les labs IOS.",
      "frequency": "Cité dans 60%+ des posts d'échec sur r/ccna.",
      "why":       "Pourquoi c'est bloquant — 2-3 phrases.",
      "fix":       "Conseil correctif direct + ressource ou outil concret."
    }
    /* … 4 more … */
  ],

  // Optional: practice link override; defaults to /train.html?pack=<cert>
  "trainPackId": "ccna"
}
```

## Editorial rules

1. **Top 5, not top 10**. Force a real ranking; cap at 5 to keep
   the page short and shareable.
2. **`frequency` cites a community**. "Mentionné dans X% des posts
   d'échec" or "récurrent sur le sub". No invented stats.
3. **`fix` is actionable**, not theoretical. Name a tool, a website,
   or a concrete habit ("Packet Tracer 50h before sitting", not
   "labs are important").
4. **`lastReviewed` quarterly minimum** — Reddit threads age fast.
5. **`tldr` ≠ intro**. The TLDR should be a rule the reader can act
   on; the intro is the framing.
