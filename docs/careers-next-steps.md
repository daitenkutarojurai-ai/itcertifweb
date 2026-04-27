# Careers feature — Steps 3 & 4 plans

Steps 1 and 2 of the career-paths rollout shipped as static content in this PR.
Steps 3 and 4 require architectural decisions you need to make before I can
write code. This document is the deliverable for those steps: concrete plans,
not half-built implementations.

---

## Step 3 — Accounts + progress tracking

### The core decision

CertQuests is currently 100% local-storage. The homepage advertises:

> "No. All your progress, scores and achievements are stored locally on your
> device. Your data never leaves your browser."

Adding accounts changes that promise. **You cannot keep the "no signup, no
tracking" pitch and add accounts — pick one.** Three viable framings:

1. **Keep the promise; never add accounts.** Career paths stay SEO content.
   No retention signal beyond bookmarks. Safe but limits Step 4 monetization.
2. **Optional accounts.** Local-first stays the default; users can opt in to
   sync across devices. Honest, but accounts become a feature most users
   ignore — defeats the point.
3. **Accounts become the default for paths.** New positioning: "Free practice
   forever, no account required. Career paths are a separate product layer
   with progress tracking." This is the path that unlocks Step 4 (Pro tier).
   It also requires updating the homepage FAQ and several pages.

**Recommendation:** option 3. It's the only one that converts the SEO traffic
from /careers/* into a recurring product. Options 1 and 2 leave the strategic
work undone.

### Auth provider — pick one

| Option | Cost (1k MAU) | Pros | Cons |
|---|---|---|---|
| **Supabase Auth** | $0 (free tier 50k MAU) | Email + Google + GitHub built-in. Postgres included. RLS for clean security model. | Vendor lock-in. Self-hosting available but operationally heavier. |
| **Clerk** | $0 (free tier 10k MAU), then $25/mo | Best-in-class DX. Pre-built UI components. Fast to ship. | Lock-in. Premium ($25/mo) hits fast at modest growth. |
| **Auth0** | $0 to 7.5k MAU, then $35+/mo | Enterprise-trusted. Best for B2B SKU later. | Pricing ramps aggressively. Overkill for CertQuests today. |
| **Firebase Auth** | $0 (very generous) | Free, Google-backed, well-documented. | Tied to Firestore for data — different DB shape than Postgres. |
| **Roll your own (NextAuth + Postgres)** | infra cost | Zero lock-in. Full control. | 2–3 weeks of work; ongoing maintenance burden. |

**Recommendation:** **Supabase**. Free tier covers you to 50k MAU, the
auth + Postgres + RLS combo is exactly the shape of this app, and the Postgres
is portable if you ever leave. The site already references Supabase as an
available tool in your environment — likely you've used it before.

### Data model (Postgres / Supabase)

Minimal schema to make career paths a product:

```sql
-- Users (managed by Supabase Auth — auth.users.id is uuid)

-- A user picks a career path
create table user_paths (
  user_id     uuid references auth.users(id) on delete cascade,
  path_slug   text not null,        -- 'soc-analyst', 'cloud-engineer-aws', ...
  started_at  timestamptz default now(),
  primary key (user_id, path_slug)
);

-- Per-cert progress within a path
create table user_cert_progress (
  user_id     uuid references auth.users(id) on delete cascade,
  pack_id     text not null,        -- 'comptia-security-plus', 'aws-saa-c03', ...
  status      text not null check (status in ('not_started','in_progress','completed')),
  exam_passed_at timestamptz,
  notes       text,
  updated_at  timestamptz default now(),
  primary key (user_id, pack_id)
);

-- Quiz session results (used for the readiness predictor in Step 4)
create table quiz_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  pack_id     text not null,
  started_at  timestamptz default now(),
  completed_at timestamptz,
  total_questions int not null,
  correct_count int not null,
  difficulty_avg numeric,
  mode        text check (mode in ('quick','full','study'))
);

-- Skill XP (career-path scoped)
create table user_skill_xp (
  user_id     uuid references auth.users(id) on delete cascade,
  skill_tag   text not null,        -- 'networking', 'iam', 'siem', 'kubernetes', ...
  xp          int not null default 0,
  updated_at  timestamptz default now(),
  primary key (user_id, skill_tag)
);

-- RLS: users can only read/write their own rows (one-line policies in Supabase)
```

Total: 4 tables. Indexes on `user_id` and `pack_id` cover all queries the UI
will run. Migration takes ~30 minutes.

### Migration path for existing users

The current site stores progress in `localStorage`. On first login after
account creation, run a one-time migration script in the browser:

```javascript
// On first authenticated session:
const localProgress = JSON.parse(localStorage.getItem('cq_progress') || '{}');
if (Object.keys(localProgress).length > 0 && !await hasSyncedBefore()) {
  await syncLocalToServer(localProgress);
  await markSynced();
}
```

The `localStorage` becomes a write-through cache backed by the server.
Anonymous users continue working exactly as before; signed-in users get sync
across devices.

### What "stays local" vs "goes to server"

| Data | Stays local | Server |
|---|---|---|
| Quiz answers (per question) | ✅ during a session | ✅ on session complete |
| Path selection | ✅ cache | ✅ source of truth |
| Profile / handle / avatar | — | ✅ server only |
| Streak / XP | ✅ cache | ✅ source of truth |
| Bookmarks | ✅ for anon | ✅ for signed-in |

Anonymous users see the existing experience unchanged. Signed-in users get
the new product layer (path picker, cross-device sync, public profile).

### Engineering scope (rough)

- Supabase project setup + RLS policies: 0.5 day
- Auth UI (signup / login / Google OAuth): 1 day
- DB schema + migrations: 0.5 day
- API client + localStorage migration: 1 day
- Path selection UI + persistence: 1 day
- Progress bar in header (the retention hook): 1 day
- Public profile page (`/u/<handle>`): 1.5 days
- LocalStorage→server one-time sync: 0.5 day
- Homepage + FAQ copy updates (drop "no signup" framing): 0.5 day

**Total: ~7.5 engineering days.** This is the floor. Realistic with testing
and edge-case handling: 2 weeks.

### Decisions you need to make before I can write code

1. **Pick auth provider** (Supabase recommended).
2. **Confirm the positioning shift** — accept that the homepage will lose
   the "no signup, no tracking" framing for the careers product layer.
3. **Pick the public profile URL pattern** — `/u/<handle>`, `/users/<handle>`,
   or no public profiles in v1.
4. **Confirm whether anonymous quiz-taking stays free forever.** (My strong
   recommendation: yes. Pro tier should gate *features*, not *quiz access*.)

---

## Step 4 — Pro tier feature gating

This depends on Step 3 shipping first. Plan assumes Supabase Auth + Stripe.

### What goes free vs Pro

The cleanest gating boundary: **free for "study," Pro for "shipping."**

#### Free (acquisition)

- All quiz packs (current 37 packs, 2,520 questions). Unchanged.
- All career roadmap pages — full content visible.
- First cert in every career path: skill checkpoints + scenario quizzes.
- Public progress profile.
- Path progress tracking, streaks, badges.

#### Pro — €12/mo or €99/yr (the core SKU)

- All certs across all paths unlocked (skill checkpoints + scenario labs).
- **Exam Readiness Predictor** (see below).
- **Resume + LinkedIn export** of badges / passed certs.
- Adaptive recommend mode ("you scored 42% on IAM domain — here are 20
  targeted questions").
- Priority answer-fix turnaround (your existing public issue tracker, but
  Pro reports get a 48h SLA).

#### Career+ — €29/mo (ship in v2, not v1)

- 1:1 path review (async video).
- Mock interview question bank per role.
- Job-board overlay ("you're 80% qualified for 47 open roles in your metro").

### Exam Readiness Predictor — the killer feature

This is the single highest-leverage Pro feature. Cheap to build, high
perceived value.

```
Inputs (already in the data):
  - Per-question accuracy on the target pack
  - Time-on-question vs question difficulty
  - Number of practice sessions
  - Recent vs all-time accuracy gap

Output:
  - Green / Yellow / Red readiness flag
  - "Pass-likely" probability (e.g., 73%)
  - Top 3 weakest domains with question recommendations
```

The model is intentionally simple: a logistic regression on user accuracy by
domain weighted against the official exam blueprint. Trained on synthetic
data initially (use the question bank's own difficulty calibration), then
re-trained quarterly on actual user pass/fail reports (collected via a
post-exam survey).

### Stripe integration

- Stripe Checkout for the upgrade flow (no custom card form).
- Stripe Customer Portal for billing self-service (cancellations, invoices).
- Webhook handler in Supabase Edge Function to sync `subscription_status` to
  the user record.

```sql
alter table auth.users add column subscription_tier text default 'free'
  check (subscription_tier in ('free','pro','career_plus'));
alter table auth.users add column stripe_customer_id text;
```

### Pricing decisions

| SKU | Monthly | Annual | Notes |
|---|---|---|---|
| Free | €0 | €0 | Forever |
| Pro | €12 | €99 (€8.25/mo equivalent) | The core SKU |
| Career+ | €29 | €290 (€24/mo) | v2 |

Annual price ≈ 8 months monthly. Standard SaaS discount.

### What NOT to do in v1

- **Don't gate quiz access.** Free quiz forever is the brand. Gate
  *predictors*, *analytics*, *exports* — not the questions themselves.
- **Don't ship Career+ on day one.** It's mentor-driven; ops-heavy. Wait until
  you have 200+ paying Pro users so you can recruit mentors from your
  customer base.
- **Don't introduce paywalls on existing pages.** Anyone who landed via SEO
  on /careers/soc-analyst/ should see the same content forever. Pro gates
  features that didn't exist before, not retroactive content.

### Engineering scope (rough)

- Stripe account + product/price setup: 0.5 day
- Stripe Checkout integration: 1 day
- Webhook handler in Supabase Edge Function: 1 day
- Pro-only feature flagging (server + client): 1 day
- Exam Readiness Predictor v1 (the model): 2 days
- Skill checkpoint quizzes content: 5 days (content-heavy — one per cert)
- Resume / LinkedIn export feature: 1 day
- Pricing page: 1 day
- Upgrade nudges in-app (tasteful; sparing): 1 day

**Total: ~13.5 engineering days.** Realistic with content authoring and
testing: 4 weeks.

### Decisions you need to make before I can write code

1. **Confirm pricing** — €12/mo and €99/yr, or different.
2. **Confirm currency / region strategy** — euros only, or USD primary with
   localized pricing.
3. **Confirm Stripe is acceptable** (vs. Paddle or Lemon Squeezy, which
   handle EU VAT for you — relevant given the .com site and EU users).
4. **Pick the freemium boundary precisely.** I've recommended "free for study,
   Pro for shipping." Confirm or adjust.
5. **Confirm we ship v1 without Career+** (mentor-led tier).

---

## Putting it together — what's next

If you want to move forward:

1. Make the four Step 3 decisions above.
2. I can then ship Step 3 in ~2 weeks of focused work.
3. After Step 3 has been live for 2–4 weeks (so we have real signup data),
   we make the Step 4 decisions and ship the Pro tier in another ~4 weeks.

If you'd rather pause Steps 3 and 4 and just ship the static career-paths
content (which is what's in this PR), that's also a legitimate stopping
point. The SEO and cross-linking value is real on its own; you don't have
to add accounts to capture it.
