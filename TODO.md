# CertQuests — TODO

Living TODO. Items here are not dropped on the floor; they're things to pick
up when there's time.

---

## P1 — Duolingo-style characters · Phase 2 (player avatar)

### Status
- ✅ Phase 1 shipped 2026-05-11: floating 🦉 owl mascot (bottom-right).
  Rotating tips, dismissible 12 h, idle wave every 18 s, continuous bob +
  glow + status-dot pulse animations.
  Code: `src/mascot.js`, CSS in `src/styles/desktop.css` (MASCOT WIDGET).
  **The main mascot is locked — design will not change going forward.**

### Decisions (locked)
- **Position:** header chip — left of the logo on every page. Visible at
  all times, contextual progress marker, doesn't compete with the corner
  mascot. Mobile: shrinks to icon-only (32 px circular badge). Desktop:
  icon + thin XP bar + level label.
- **Phase 2A ships with emoji placeholders** so we can validate the UX
  loop quickly. Phase 2B swaps in the 30 custom SVGs as they're designed.

### 30-avatar evolution roadmap

End target: **30 distinct avatars**. Player progresses through them via
compound XP (time × accuracy × streak). Each level requires ~1.5× the XP
of the previous, so cumulative time-to-Master is realistic (~150-200 h of
serious practice).

Five tiered arcs of 6 stages each. Within an arc, the same character
gradually gains equipment / posture / aura. Crossing arc boundaries
unlocks a new species/form (visible "I leveled up" moment).

#### Arc 1 — Hatchling (levels 1-6) · learning to study
1. 🥚 Untouched egg (default, level 1)
2. 🐣 Egg with a crack
3. 🐤 Just hatched (eyes closed)
4. 🐥 Standing chick
5. 🐥 Chick with study cap
6. 🐥 Chick holding a pencil

#### Arc 2 — Apprentice (levels 7-12) · building habits
7. 🐦 Fledgling
8. 🐦 Fledgling with notebook
9. 🐦 Fledgling with reading glasses
10. 🦜 Colored plumage emerging
11. 🦜 First feathers + scarf
12. 🦜 Apprentice with diploma roll

#### Arc 3 — Trainee (levels 13-18) · domain depth
13. 🦅 Young hawk
14. 🦅 Hawk with backpack
15. 🦅 Hawk + laptop
16. 🦅 Hawk + cloud icon (cert branding)
17. 🦅 Hawk with first medal
18. 🦅 Hawk standing on a server rack

#### Arc 4 — Adept (levels 19-24) · multi-cert mastery
19. 🦉 Sage owl (eyes glow)
20. 🦉 Owl with mortar board
21. 🦉 Owl with stack of certifications
22. 🦉 Owl on a podium
23. 🦉 Owl with lightning bolt (speed badge)
24. 🦉 Owl with constellation aura

#### Arc 5 — Master (levels 25-30) · legendary
25. 👑 Crowned phoenix
26. 👑 Phoenix with rune circle
27. 👑 Phoenix wielding a quill
28. 👑 Phoenix on a throne of books
29. 👑 Phoenix in flight, banner trailing
30. 👑 Phoenix radiating aurora — final form

### Tracked metrics (localStorage, no backend)

- `cq-stats.totalSeconds` — cumulative study time
- `cq-stats.questionsAnswered` — total answered
- `cq-stats.correctRate` — rolling 100-question accuracy
- `cq-stats.streakDays` — consecutive days with ≥1 session
- `cq-stats.lastSessionAt` — for streak detection / reset
- `cq-stats.perPack[packId]` — per-cert breakdown (top cert reflects
  in the avatar's themed accessory)
- `cq-stats.xp` — derived; saved to avoid recomputing

### XP formula (rough)

```
xp = totalSeconds / 60                              // 1 XP per minute
   * clamp(correctRate, 0.5, 1.2)                   // accuracy multiplier
   + streakDays * 8                                 // streak bonus
   + completedSessions * 2                          // commitment bonus
```

Level N requires: `XP_required(N) = round(50 * 1.18^(N-1))`. Level 30 ≈
12 000 XP (~200 h serious study + streak + accuracy).

### Level-up moment
Confetti burst + main mascot bubble: "Level up! You're now <stage name>."
Brief 1-second avatar scale-up + glow pulse. New avatar persists.

### Tap-the-avatar panel
- Current level + stage name + XP bar to next
- Top 3 certs by time spent (with mini brand badges)
- Streak count + 14-day heat-map (filled green = practiced)
- "Reset progress" link with confirm modal

### Contextual main-mascot tips (Phase 2.5)
The owl's tip pool queries stats and prefers contextual tips:
- low streak → "It's been 3 days — brain forgets fast. 5-Q quiz?"
- low accuracy on pack X → "AWS networking tripping you up? Try a VPC
  focus quiz."
- high streak → "10-day streak! 🔥 Keep it going."
- new level reached → tied to level-up moment, not idle rotation

### Wiring
- `src/screens/quiz.js` / `src/screens/results.js` dispatch
  `cq:session-complete` event with detail `{packId, secondsSpent,
  questionsAnswered, correct}`
- New `src/stats.js`: reducer over the event → updates localStorage + XP
- New `src/avatar.js`: listens for stats change → re-renders the header
  chip + fires `cq:level-up` event when crossing a level boundary
- `src/mascot.js` already responds to events for contextual tips

### Build order (concrete tickets)

1. **Stats reducer** (`src/stats.js`) + emit `cq:session-complete` from
   quiz/results screens. Verify on console first; no UI yet.
2. **Header avatar chip** with emoji stage + XP bar. Read-only display.
3. **Level-up moment** (confetti + animated stage swap).
4. **Tap-to-panel** modal.
5. **Contextual mascot tips** (Phase 2.5).
6. **SVG character set** — 30 unique artworks. Design pass; can use
   AI-assist + manual cleanup for the first version. Drop into
   `src/assets/avatar/lvl-01.svg` … `lvl-30.svg`. Switch source from
   emoji to SVG via a single `STAGE_ART_TYPE` flag.

### Open Qs
- None currently — position locked, roadmap locked, target locked.

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
