# Career-path archetype schema (Phase 6.5)

Each `<archetype>.json` file under `data/career-paths/` describes one
realistic IT career trajectory. The /career-path/ generator matches the
user's form input (domain × situation) to the closest archetype and
renders the corresponding step-by-step roadmap.

```jsonc
{
  "id":          "reconversion-cloud-aws",
  "label":      "Reconversion → Cloud Engineer (AWS)",
  "domain":     "cloud",          // cloud | network | linux | security | devops
  "situation": "reconversion",    // reconversion | debutant | en-poste
  "totalMonths": 18,
  "salaryStart": "30k€",
  "salaryEnd":  "55-70k€",
  "tldr":       "Une phrase qui résume la trajectoire (point de départ → point d'arrivée).",

  // Each step is a milestone in the journey. month = months since start.
  "steps": [
    {
      "month":            0,
      "title":           "Fondamentaux Linux + réseau",
      "duration":        "3 mois",
      "weeklyHours":      10,
      "cert":             null,                          // optional cert.id from data/index.json
      "intermediateJob":  null,                          // optional realistic role at this stage
      "salary":           null,                          // optional EUR/year
      "milestones": [
        "Comprendre TCP/IP, DNS, HTTP",
        "CLI Linux confortable (cd/grep/awk/sed/systemd)"
      ],
      "resources": [
        { "name": "OpenClassrooms — Linux",      "url": "https://..." },
        { "name": "RFC 791 (IP)",                "url": "https://..." }
      ]
    }
    /* … 4-7 steps total … */
  ]
}
```

## Editorial rules

1. **Realistic, not aspirational.** No "0 → senior architect en 6 mois".
   Junior cloud after 12-18 months full-time is the floor.
2. **Every cert step links to one we actually have a pack for** — `cert`
   field MUST resolve in `data/index.json`. Otherwise leave null.
3. **Salary bands per step are evidence-based.** Reuse data from
   /salaire/<cert>/<country>/ when applicable; cite Hays/APEC otherwise.
4. **`tldr` is the elevator pitch.** "From <starting role> to <target
   role> in <X> months." If you can't write that sentence, the
   archetype is too vague.
5. **5-7 steps max.** More than 7 = the user gives up reading.

## Adding a new archetype

1. Pick a (domain, situation) tuple that doesn't already have an
   archetype. Up to 15 (5 domains × 3 situations).
2. `cp data/career-paths/reconversion-cloud-aws.json
       data/career-paths/<id>.json`
3. Replace fields. Verify each `cert` resolves in `data/index.json`.
4. Reload `/career-path/` in the browser; the dropdowns build from
   the file list.
