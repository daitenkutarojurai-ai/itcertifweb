# Session Summary — 2026-04-14

## What was done in this session

### Task 1 — New Certification: AWS SysOps Administrator Associate (SOA-C02)

**Files created/modified:**
- `data/free/aws-soa-c02.json` — 60 scenario-based questions v1.0.0 covering all 6 SOA-C02 exam domains
- `data/index.json` — activated `aws-soa-c02` pack (available: true, question_count: 60)
- `certifications/aws.html` — SOA-C02 tile now Live; hero updated to "4 LIVE EXAMS / 280+ Questions"; added SOA-C02 domain weights to prose; added SOA-C02 FAQ item
- `learning/aws-soa-c02/index.html` — full course page (7 modules, ~35h)
- `data/courses.json` — added `aws-soa-c02` entry (version bumped to 1.3.0)
- `sitemap.xml` — added `https://certquests.com/learning/aws-soa-c02/`

**Question coverage (60q):**
| Domain | % | Questions |
|---|---|---|
| D1: Monitoring, Logging, Remediation | 20% | 12 |
| D2: Reliability & Business Continuity | 16% | 10 |
| D3: Deployment, Provisioning, Automation | 18% | 10 |
| D4: Security & Compliance | 16% | 10 |
| D5: Networking & Content Delivery | 18% | 11 |
| D6: Cost & Performance Optimization | 12% | 7 |

---

### Task 2 — ServiceNow CSA Question Rework (v2.0.0)

**Files modified:**
- `data/free/servicenow-csa.json` — full rewrite to proper MCQ format

**What changed:**
- All 50 existing questions converted from flashcard format (option B always very long correct answer) to proper 4-option MCQ with concise plausible distractors
- Correct answer index now varies across all questions (not always index 1)
- Fixed meta bug: `question_count: 0` → `60`
- Bumped version to `2.0.0`
- Added 10 new questions (csa-051–060) covering:
  - Field-level ACL security
  - Performance debugging with Transaction Log
  - Software Asset Management (SAM)
  - Flow Designer retry logic with Wait/Loop steps
  - Post-clone instance cleanup checklist
  - Virtual Agent / NLU chatbot
  - Update Set conflict resolution best practices
  - CI lifecycle — decommission vs delete
  - Server-side logging with `gs.log()` / `gs.debug()`
  - HRSD onboarding playbooks for multi-department workflows

---

### Task 3 — SOA-C02 Course Page

**File created:** `learning/aws-soa-c02/index.html`

**Course structure:**
- Module 1: Monitoring, Logging & Remediation (~6h)
- Module 2: Reliability & Business Continuity (~5h)
- Module 3: Deployment, Provisioning & Automation (~6h)
- Module 4: Security & Compliance (~5h)
- Module 5: Networking & Content Delivery (~7h)
- Module 6: Cost & Performance Optimization (~4h)
- Module 7: Exam Lab Skills — Hands-On AWS Console (~2h)

**Engagement features:**
- Spotify CTA at top + inline mid-course nudge + bottom quiz CTA
- Exam snapshot table (SOA-C02 code, 65 questions, 720/1000, 180 min, $300, 3 years)
- 6-domain weight bar chart
- "Top 4 mistakes" red callout box
- 5-week study plan with weekly focus areas
- SOA-C02 vs SAA-C03 comparison tip box
- Related cert cards (CLF-C02, SAA-C03, DVA-C02, AZ-500)

---

### Documentation

- `CLAUDE.md` — updated Certification Catalog date to 2026-04-14, added SOA-C02 and ServiceNow CSA rework entries to changelog
- `DONE.md` — this file
