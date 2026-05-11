# CertQuests — TODO

Living TODO. Items here are not dropped on the floor; they're things to pick
up when there's time.

---

## P1 — Duolingo-style characters · Phase 2 (player avatar)

Phase 1 shipped 2026-05-11: a single floating mascot (🦉 owl) in the
bottom-right corner rotates encouraging tips, dismissible for 12 h.
Code: `src/mascot.js`, CSS `src/styles/desktop.css` (MASCOT WIDGET block).

Phase 2 — player character that evolves with practice metrics:

- **Tracked metrics** (localStorage, keyed by cert pack):
  - `cq-stats.totalSeconds` — cumulative study time
  - `cq-stats.questionsAnswered` — total answered
  - `cq-stats.correctRate` — rolling 100-question accuracy
  - `cq-stats.streakDays` — consecutive days with ≥1 session
  - `cq-stats.lastSessionAt` — for streak detection
  - `cq-stats.perPack[packId]` — per-cert breakdown (which cert they're
    putting time into → reflects in avatar gear/theme)

- **Avatar stages** (5 levels, gated on time + accuracy compound score):
  1. 🐣 Hatchling (0-30 min, default)
  2. 🐥 Apprentice (30 min, >50% acc)
  3. 🦅 Trainee (3 h, >65% acc)
  4. 🦉 Adept (10 h, >75% acc, 7-day streak)
  5. 👑 Master (25 h, >85% acc, 14-day streak)

  Stages are emoji for v1; can swap for custom SVGs later.

- **Display:** small avatar chip in the header (next to the logo, mobile)
  or as a left-aligned counterpart to the main mascot (bottom-left on desktop).
  Shows current level emoji + a thin XP bar to next level.

- **Level-up moment:** brief full-bleed confetti + the main mascot bubble
  says "Level up! You're now an Adept." Plays the wave animation.

- **Tap the avatar:** opens a small panel with:
  - Current level + XP to next
  - Top 3 certs by time spent
  - Day streak count + heat-map of last 14 days
  - "Reset progress" link (with confirm)

- **Contextual main-mascot tips** (Phase 2.5): the bubble pool should
  query `cq-stats` and pick relevant tips:
  - low streak → "It's been 3 days — come back, the brain forgets fast"
  - low accuracy on pack X → "AWS networking tripping you up? Try a 5-Q
    focus on VPC."
  - high streak → "10-day streak! 🔥 Keep it going."

- **Wiring:** quiz screens (`src/screens/quiz.js`, `src/screens/results.js`)
  should emit a custom event `cq:session-complete` with `{packId, secondsSpent,
  questionsAnswered, correct}`. The avatar listens, updates stats, re-renders.

- **No backend:** all localStorage. Cleared with "Reset" or by user wiping
  site data. Privacy-friendly (matches the existing no-tracking stance).

### Open questions before building Phase 2
- Which page is best for the avatar widget? Header chip (always visible)
  or bottom-left (stays out of content)?
- Custom SVG character vs. emoji stages — emoji ships in a day, SVG
  needs a designer pass.
- How often should the main mascot react contextually? (Risk: nagging.)

---

## P0 — Rewrite all 2,520 questions to remove tells and match real exam difficulty

**Why this matters:** the question bank has three problems that make it
unreliable as exam preparation:

1. **"Longest answer always wins."** A user can ace many quizzes by always
   picking the longest option without reading the question. This is a known
   anti-pattern in machine-generated or carelessly-written question banks
   and it's a brand-trust issue — anyone who notices stops believing the
   site is serious prep.
2. **Difficulty is too low.** Questions test recall ("what is X?") rather
   than scenario reasoning ("a customer reports Y, what's the cause?").
   Real exams are scenario-heavy and trade-off-heavy; ours are not.
3. **Doesn't reflect the real exam.** Wording, distractor design, and
   coverage shape don't match what candidates encounter on AWS, CompTIA,
   Cisco, Microsoft exams. Passing CertQuests doesn't predict passing the
   real exam, which is the only thing the site is for.

This is "take as long as needed" work. Do it right; don't ship rushed
batches. **Treat the rewrite as the core deliverable for the next two
quarters of content work.**

### Acceptance criteria — every rewritten question must

- [ ] **Pass the longest-answer test.** Across a pack, the correct answer
      should NOT correlate with answer length. Run a script that flags any
      pack where correct-answer-length is reliably above the distractor mean.
      Target: correct answer is the longest in ≤ 30% of questions per pack.
- [ ] **Pass the keyword-tell test.** No question where one option contains
      a keyword from the stem and is therefore obviously correct
      ("Which protocol uses port 443?" → option mentioning "HTTPS").
- [ ] **Use distractor design from the real exam blueprint.** Distractors
      should be plausible-but-wrong concepts — common confusions, similar
      services, off-by-one parameters — not random unrelated options.
      "AWS RDS / AWS DynamoDB / AWS S3 / a banana" is wrong. Real exams use
      "RDS Multi-AZ / RDS Read Replica / RDS Backup / Aurora" — all
      database-tier, distractor design forces the candidate to know the
      *difference*.
- [ ] **Match the real exam's scenario weight.** For associate-tier and
      above (SAA, CySA, CCNA, AZ-104, etc.), at least 50% of questions
      should be scenario-based — a 3-4 sentence setup describing a
      customer/situation, then the question.
- [ ] **Match the real exam's difficulty distribution.** Roughly 30% easy,
      50% medium, 20% hard per pack. Currently we lean far too easy.
- [ ] **Tag every question with at least 2 tags.** First tag is the primary
      domain (must match the official exam blueprint section). Second tag
      is the sub-topic. This makes the diagnostic actionable.

### Methodology

The rewrite is a 5-step pipeline per pack:

1. **Audit the existing pack.** Run a script that flags:
   - questions where the correct answer is the longest
   - questions where the correct option contains a stem keyword
   - questions with < 3 sentences (likely recall-only)
   - questions tagged with < 2 tags
   This produces a per-pack rewrite list, sorted worst-first.
2. **Pull the real exam blueprint** from the vendor (AWS exam guide,
   CompTIA objectives PDF, Cisco blueprint, etc.) and re-tag every
   question to a blueprint section.
3. **Rewrite stems and distractors.** Stems → scenario-shaped where
   applicable. Distractors → plausible same-domain alternatives. Length
   → roughly equalize correct vs incorrect answer length.
4. **Peer-review pass.** Each rewritten question reviewed by a second
   engineer (or by the public issue tracker after merge).
5. **Calibrate difficulty.** After ~50 questions in a pack are rewritten,
   sample a small group of cert holders and a small group of pre-cert
   candidates. Difficulty is right when ~70% of holders pass first time
   and ~30% of candidates pass first time on a 20-question slice.

### Suggested order (highest leverage first)

Pick by traffic × candidate stakes. Roughly:

1. **AWS SAA-C03** — highest-traffic associate cert, hardest reputation hit
   if our prep doesn't predict the real exam.
2. **CompTIA Security+** — gateway cert, large funnel, "longest answer
   wins" hurts trust the most.
3. **CCNA 200-301** — Cisco audience is the most discerning about exam
   difficulty.
4. **AZ-104** — Microsoft-shop traffic is growing.
5. **CKA** — small but committed audience that compares against killer.sh.
6. **All remaining packs** in question-volume order.

### Where the audit script should go

Add `tools/audit-questions.mjs` (a Node script) that:
- Reads each `data/free/*.json`
- For each pack, computes per-question signals (correct length vs
  distractor mean, keyword-tell score, scenario-shape, tag count)
- Outputs a CSV ranked worst-to-best so the rewrite team can start at
  the top of the list

Don't ship the audit until after the first pack rewrite — having the
script first means rewriting against numbers, not against the user
experience.

### How to track progress

Per-pack progress lives in `data/index.json` — add a field
`rewrite_status: 'unaudited' | 'audited' | 'in-progress' | 'rewritten' | 'verified'`
to each pack. Surface "verified" packs with a small badge on the
homepage cert grid so users can see which packs are calibrated.

---

## P1 — Other content / product items

(items below are smaller and unrelated to the question rewrite — kept here
so they don't get forgotten)

- [ ] Audit the Vigicrues `CdStationHydro` for live flow data on the
      Seine briefing dashboard (separate project).
- [ ] Sell-through log: accept nightly POSTs and train a regression on
      sales vs briefing signals (separate project).
- [ ] After step 3 (accounts) ships from `docs/careers-next-steps.md`,
      add a public profile page at `/u/<handle>` so users can share
      progress.

---

## Done

- ✅ 2026-04-27 — `/careers/*` career-paths layer (PR #15)
- ✅ 2026-04-27 — Onboarding goal picker, resume banner, diagnostic
  mode, QotD (PR #16)
- ✅ 2026-04-27 — Diagnostic differentiation: framing screen,
  difficulty-stratified sampling, weighted readiness (PR #17)
- ✅ 2026-04-27 — QotD monotonic local-day seed + visible date stamp
