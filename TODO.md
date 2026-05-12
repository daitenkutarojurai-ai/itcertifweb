# CertQuests — TODO

Living TODO. Items here are not dropped on the floor; they're things to pick
up when there's time.

---

## P1 — Phase 3: Learning-Path Maps (Duolingo-style game) + Accounts

> Largest item on the roadmap. Reframes the site from "take a quiz" to
> "follow a guided journey." Each certification gets a winding path of
> nodes (quizzes, courses, mini-games, boss fights). The player avatar
> (P1 Phase 2) walks the path and evolves with progress. Accounts let
> users keep progress across devices.

### Shipped (2026-05-12)

- ✅ **3A.1 Path data model** — `scripts/gen-paths.js` auto-generates
  `data/paths/*.json` for 33 cert packs from existing question banks
- ✅ **3A.2 Path renderer** — `path.html` + `src/path.js` + `path.css`,
  winding S-curve map of nodes, locked/unlocked/done/current states
- ✅ **3A.3 Quiz integration** — `cq:session-complete` from `quiz.js`
  + `cq-path-pending` handshake marks nodes done after quiz returns
- ✅ **3A.4 Hearts/lives** — `src/hearts.js` (5 max, regen 30 min,
  modal with countdown)
- ✅ **3A.5 Concept node** — inline flashcards (flip-cards), +5 XP
- ✅ **3A.6 Mini-game node** — inline match-up, lose heart on wrong, +10 XP
- ✅ **3A.7 Sub-boss / final-boss routing** — opens train.html with qids
- ✅ **3A.8 Walker** — player avatar (stage emoji) sits on current node,
  walks forward on completion, evolves with level
- ✅ **3A.9 Confetti** — chapter-end / level-up / final boss bursts
- ✅ **3A.10 Discovery** — "🗺️ Learning paths" entry in hamburger menu

### Pending (concrete tickets)

**3B — Game feel & content polish** (next-up)
- [ ] **3B.1 Treasure-chest node** — auto-inserted after each sub-boss in
      `gen-paths.js`. Tapping spawns a reward modal (XP bonus + cosmetic
      unlock). Local-only for now.
- [ ] **3B.2 First cosmetic set** — avatar "hat" overlay unlocked at
      levels 5/10/15/20/25/30. Renders as a small emoji/SVG above the
      stage emoji on the walker + chip. Persisted in `cq-cosmetics-v1`.
- [ ] **3B.3 Daily quest banner** — top of homepage + path page: "Clear
      1 node today → +20 XP". Resets at local midnight. Persisted by date key.
- [ ] **3B.4 Combo flash in mini-game** — 2+ correct in a row → "x2"
      floating overlay, +XP multiplier. Decays on a wrong match.
- [ ] **3B.5 Second mini-game type** — true-false speed run (10 statements,
      tap T/F under 4s each). Engine pluggable so future types are
      drop-in: `data/paths` node carries `gameType: 'truefalse' | 'match'`.
- [ ] **3B.6 Path index page** — `/path.html` (no query) lists all 33
      paths as cards so users discover them; current homepage routing
      goes to `ccna` only.
- [ ] **3B.7 AI-drafted concept content** — `scripts/gen-concepts.js`
      that calls an LLM (Claude or OpenAI) to produce 4-6 sentence
      concept stubs + 4 flashcards per chapter. Writes to
      `data/paths/<pack>.json` `nodes[].content` and `flashcards`.
      **User decision needed**: which LLM API + key?

**3C — Cosmetic & social moments**
- [ ] 3C.1 Cosmetic inventory UI (settings → my collection)
- [ ] 3C.2 Cert-survivor laurel: persistent overlay on the avatar chip
      after clearing a final boss; shows which certs completed
- [ ] 3C.3 Shareable path-complete card (PNG generated client-side)
- [ ] 3C.4 Streak heat-map (14-day grid) on a profile/stats panel

**3D — Accounts (Supabase)** — deferred until user requests
- [ ] 3D.1 Supabase project + tables (profiles, stats, pack_progress)
- [ ] 3D.2 Magic-link auth UI
- [ ] 3D.3 Anonymous → account sync on first sign-in
- [ ] 3D.4 Google + GitHub OAuth
- [ ] 3D.5 Multi-device hydration on load

**3E — Avatar Phase 2B (custom SVG art)**
- [ ] 3E.1 Design 30 SVG character stages (replace emoji placeholders)
- [ ] 3E.2 `STAGE_ART_TYPE` flag in `stats.js` to switch emoji→SVG
- [ ] 3E.3 SVG asset pipeline (single sprite sheet or per-file)

### Open questions

- **AI for concept content (3B.7)**: which LLM + how do we pay for it?
  Recommend Claude (Anthropic API) with a fixed budget — ~$0.50/pack
  for 33 packs = $17 one-shot. Run once, commit JSON output.
- **Mock exams for final boss**: do we use the existing /train.html
  full-exam flow as-is, or build a dedicated path-final UI with the
  cert-survivor laurel award flow integrated?
- **Cosmetic art**: emoji-stack (cheap and fast) vs. SVG (designed,
  slower). Same call as Phase 2A → emoji first, SVG later.



### 3.0 — Vision in one paragraph

Every certification (AWS SAA-C03, Security+, AZ-104, CCNA, etc.) has a
~30-50-node **path** that takes a complete beginner to exam-ready. Nodes
are varied (quiz, micro-course, lab sim, mini-game, sub-boss, final boss)
so the loop stays fresh. The path is **gated** — finish node N to unlock
N+1. The map UI is a winding vertical scroller (mobile-first) with the
player's avatar standing on the current node and walking forward on
completion. Mid-path sub-bosses gate chapters; a final boss = full mock
exam. Avatar evolves through 30 stages tied to XP + streak (see Phase 2).

### 3.1 — Node types

| Icon | Type | What it is | Time | XP |
| --- | --- | --- | --- | --- |
| 🎯 | **Quiz** | 5-10 Qs on a topic | 3 min | 10 |
| 📖 | **Course** | Short reading / diagram + key-points recap | 5-8 min | 15 |
| 💡 | **Concept** | Single-screen cheatsheet, "tap to flip" cards | 1 min | 5 |
| 🧪 | **Lab** | Interactive sim (config a VPC, set a policy) | 5-15 min | 30 |
| 🎮 | **Mini-game** | Drag-match-sort (e.g. match OSI layer to protocol) | 2 min | 10 |
| 👹 | **Sub-boss** | 20-Q harder test on one chapter | 10 min | 75 |
| 👑 | **Final boss** | Full-length mock exam (cert-sized) | 60 min+ | 300 |
| 🌟 | **Bonus** | Optional side-quest (war stories, edge cases) | 5 min | 20 |

Failing a boss locks you for 30 min (cooldown) OR forces a remediation
quiz on the failed topic before retry — keeps it spicy without being
punitive.

### 3.2 — Path structure (per certification)

- **Chapters**: 5-7, each one exam domain (e.g. SAA-C03 has 4 domains
  → 4 chapters; CompTIA Sec+ has 5 → 5 chapters)
- **Nodes per chapter**: 5-8 mixed (3-4 quizzes + 1-2 courses + 1
  mini-game/lab + 1 sub-boss at the end of the chapter)
- **Final boss**: at the path's tail
- **Bonus nodes**: branch off the main line, optional, give a cosmetic
  badge for the avatar (e.g. "AWS Survivor")
- **Re-traversal**: completed nodes can be re-played for fun (no extra
  XP, but accuracy is tracked → improves mock-exam predicted score)

Path data lives in `data/paths/<pack-id>.json`. Schema:

```jsonc
{
  "packId": "aws-saa-c03",
  "title": "AWS Solutions Architect Associate",
  "chapters": [
    {
      "id": "ch1", "title": "Design Resilient Architectures", "domain": 1,
      "nodes": [
        { "id": "q1", "type": "quiz", "title": "EC2 basics", "questionIds": [12,15,22,38,41] },
        { "id": "c1", "type": "course", "title": "What's an AZ?", "md": "/data/courses/aws/az-vs-region.md" },
        { "id": "g1", "type": "minigame", "title": "Match the service", "config": {…} },
        { "id": "b1", "type": "subboss", "title": "Resilience Boss", "questionIds": […20…] }
      ]
    }
    /* … */
  ],
  "finalBoss": { "type": "mock", "examLength": 65, "timeMinutes": 130 }
}
```

### 3.3 — Map UI

- **Mobile-first vertical scroller** (the canonical Duolingo layout)
- Winding S-curve path; each node is a 72px circle on mobile / 88px desktop
- **States**: locked (grey, dimmed) · unlocked (colored, pulsing) ·
  current (bigger ring, avatar standing on it) · completed (green check)
- **Chapter dividers** with title banner; sub-boss = bigger circle with
  red glow + crown icon
- **Final boss** = large hex shield at the very bottom
- Path **lines** connect nodes: dashed for locked, solid for unlocked
- **Avatar** sprite stands on the current node; on node-complete it
  walks forward to the next (CSS keyframe animation along an SVG path)
- **Scroll-to-current** on load
- Tap a node → bottom-sheet with title + description + START button
- Hold node → preview the questions/content without committing

### 3.4 — Game feel (the "make it fun" pieces)

- **Combo meter**: consecutive correct answers within a node compound XP
- **Streak fire**: 7+ day streak unlocks a fire trail around the avatar
- **Hearts/lives**: 5 hearts; wrong answer = -1; regenerate over time
  or by completing a free course node ("free heart")
- **Treasure chests**: random drop at chapter end → cosmetic (avatar
  hat, banner, frame)
- **Sound design**: short "ding" on correct, descending tone on wrong,
  fanfare on chapter end (optional, off by default)
- **End-of-path ceremony**: full-bleed confetti + avatar gets a
  "<Cert>-Certified Survivor" laurel that persists in profile
- **Daily quest** in the corner ("clear 1 node today" → bonus XP)
- **Leaderboards** (P2 stretch): weekly XP among logged-in users

### 3.5 — Avatar / Phase 2 integration

The Phase 2 avatar system (already specced above) plugs in directly:
- Path completion fires `cq:session-complete` and `cq:node-complete`
- Avatar walks the path visually (transforms applied along node positions)
- Sub-boss kills trigger `cq:level-up` more frequently → noticeable
  evolution as the user climbs
- Final-boss victory unlocks the next arc's avatar early as a bonus

### 3.6 — Accounts (the new big thing)

#### Why
- Multi-device: continue on desktop and phone with same XP/progress
- Resume across years
- Future social features (leaderboards, friends)
- Optional — anonymous play stays the default

#### Auth model — recommendation: **Supabase**
Comparison done; reasoning:
- **Cloudflare D1 + Workers** — already on Cloudflare (`wrangler.jsonc`).
  Cheap, fast at edge, but auth is DIY (sessions, password hashing,
  email verification all hand-rolled). 2-3 weeks of work.
- **Supabase** — managed Postgres + Auth + magic-links + OAuth providers
  out of the box. Free tier covers ≥10k users. Drop-in JS SDK. ~3 days
  to integrate. Lock-in risk is mild (data is portable Postgres).
- **Clerk / Auth0** — best auth UX, but pricey above small user counts.

**Pick Supabase** unless we have a strong reason to stay 100%
Cloudflare. Supabase + the existing Cloudflare-hosted static site is a
clean split: front-end on CF, auth/data on Supabase.

#### Sign-up methods
1. **Email + magic link** (no password) — lowest friction, ships first
2. **Google OAuth** — second priority
3. **GitHub OAuth** — third (free for our tech-leaning audience)
4. **Email + password** — only if users request it

#### Database schema (Postgres / Supabase)

```sql
-- managed by Supabase Auth
auth.users(id uuid pk, email text, …)

-- our app tables
profiles(
  id uuid pk references auth.users(id),
  display_name text,
  avatar_unlock_max int default 1,        -- highest avatar level reached
  cosmetics jsonb default '[]'::jsonb,    -- {hats,banners,frames}
  created_at timestamptz default now()
)
stats(
  user_id uuid pk references profiles(id),
  total_seconds int default 0,
  questions_answered int default 0,
  correct_answered int default 0,
  sessions_count int default 0,
  streak_days int default 0,
  last_session_date date,
  xp int default 0,
  level int default 1,
  updated_at timestamptz default now()
)
pack_progress(
  user_id uuid references profiles(id),
  pack_id text,
  node_id text,
  status text check (status in ('completed','in_progress')),
  best_score numeric,
  attempts int default 1,
  last_played_at timestamptz default now(),
  primary key (user_id, pack_id, node_id)
)
mock_exams(
  user_id uuid, pack_id text, score numeric, total int, time_seconds int,
  finished_at timestamptz default now()
)
```

Row-Level Security (RLS) policies: users can only read/write their own
rows.

#### Sync strategy — anonymous → account

Anonymous users build up localStorage state. On sign-up:
1. Read all localStorage data
2. POST to Supabase via authenticated client
3. Server merges: take max(xp), sum totals, union completed nodes,
   max streak
4. On success, clear localStorage and switch to "remote" mode

After sign-in, every `cq:session-complete` writes to both localStorage
(immediate UI) AND debounced to Supabase (every 5s, batched). On load,
hydrate from Supabase, replace localStorage.

#### UI affordances
- **"Sign up to save your progress"** banner appears once XP > 200 if
  anonymous (don't nag earlier — let them experience the loop first)
- **Profile chip** replaces avatar chip when logged in: shows
  display-name initials + level
- **Settings → Account**: change email, sign out, delete account
  (full data purge — GDPR-clean)

### 3.7 — Concrete build order

Phase 3A (path UI, no backend) — 1-2 weeks dev
1. Path JSON schema + AWS-SAA-C03 first pilot file
2. `/path/<pack-id>` route + map renderer (SVG winding)
3. Node states from localStorage (already-completed pack questions)
4. Wire existing quiz screen as the "quiz node" handler
5. Avatar position on path + walk animation between nodes

Phase 3B (richer nodes) — 2-3 weeks dev + content
6. Course node renderer (Markdown → reading view)
7. Concept-card node (flip cards)
8. Mini-game node engine (one game type to start: match-drag)
9. Sub-boss = existing quiz with harder filtering
10. Hearts/lives system

Phase 3C (final-boss + ceremony) — 1-2 weeks
11. Final-boss = existing full-length mock from `train.html`
12. End-of-path confetti + cert-survivor laurel
13. Avatar cosmetic system (hats, banners)
14. Treasure chests + RNG cosmetic drops

Phase 3D (accounts) — 1-2 weeks
15. Supabase setup + RLS policies + types generated
16. Magic-link sign-in/sign-up UI
17. Google OAuth (+ later: GitHub)
18. Anonymous → account sync migration
19. Multi-device hydration on load
20. Settings → Account (delete, export, change email)

Phase 3E (social, much later)
21. Friend invites
22. Weekly leaderboards (XP within friend circle)
23. Path completion shareable cards (Twitter / LinkedIn)

### 3.8 — Open questions before starting

- **Content authoring**: who writes the course-node Markdown content
  for ~12 packs × ~5 chapters? Pure AI-gen is risky for cert accuracy.
  Hybrid: AI draft + human review.
- **Lab/mini-game scope**: too much engineering for v1? Maybe ship 3A
  + 3D with only quiz/course/concept node types, defer mini-games + labs.
- **Hearts/lives ruining the vibe?** Duolingo's biggest UX gripe. We
  could ship without lives and reintroduce only if engagement data
  shows users binge-quitting.
- **Mock-exam length**: full 65 questions in one sitting on mobile is
  rough. Allow pause+resume? (Yes, but with a 24h max.)
- **Path linearity**: strict linear gating vs. branching choices? V1 =
  strict linear (simpler, mirrors Duolingo). V2 could open up choice.
- **Existing /train.html flow**: keep it as a non-gated free-play mode?
  Yes — power users will want it. The Path is for newcomers and the
  full structured journey.

### 3.9 — Smallest demo-able slice

If we ship one thing to validate the concept:
1. Build the SVG path map for **one cert** (AWS Cloud Practitioner —
   shortest, friendliest, broadest audience)
2. Wire ~20 nodes (mix of quiz + concept-card only — skip lab/game/boss)
3. Use existing question bank for the quiz nodes
4. Player avatar standing on current node, walks on completion
5. No accounts yet — pure localStorage
6. Soft-launch behind a `/path/aws-cloud-practitioner` URL, link from
   the homepage "Find a cert" CTA
7. Measure: completion rate per chapter, drop-off, time-to-finish

That's the **MVP for validation** — ships in ~1 week instead of months.
Iterate from there.

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
