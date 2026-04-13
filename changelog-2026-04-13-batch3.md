# CertQuests — Release Notes 2026-04-13 Batch 3

## Summary
Three deliverables in this batch: one new certification added (AZ-500), one certification question bank fully reworked (PCNSA), and one new course page created (AZ-500).

---

## Task 1 — New Certification: AZ-500 Azure Security Engineer Associate

**Files created / modified:**
- `data/free/az-500.json` — 60 scenario-based questions, v1.0.0
- `data/index.json` — az-500 activated (`available: true`, `question_count: 60`)
- `certifications/microsoft.html` — AZ-500 tile → Live; hero: 3→4 live exams, 520+→580+ questions; added domain weights prose; added FAQ item
- `data/courses.json` — added `az-500` entry
- `sitemap.xml` — added `/learning/az-500/`

**Domain coverage (60 questions):**
| Domain | Weight | Approx. questions |
|---|---|---|
| Manage Identity and Access | 25–30% | 17 |
| Secure Networking | 20–25% | 14 |
| Secure Compute, Storage & Databases | 20–25% | 14 |
| Manage Security Operations | 25–30% | 15 |

**Key topics covered:** Conditional Access, PIM, managed identities, RBAC, Identity Protection, Azure Firewall Standard/Premium, NSG, DDoS Protection, Bastion, Private Endpoints, WAF, Key Vault, ADE, SQL TDE/DDM/Always Encrypted, AKS security, JIT VM access, Defender for Cloud (Secure Score, workload protections), Microsoft Sentinel (KQL, analytics rules, SOAR playbooks, UEBA).

---

## Task 2 — PCNSA Question Bank Rework (v2.0.0)

**Files modified:**
- `data/free/pcnsa.json` — fully rewritten, v2.0.0
- `data/index.json` — `question_count` updated to 60

**What changed:**
- All 50 original questions rewritten from flashcard style (correct answer = long essay in option B, other options = 2-word throwaways) to proper 4-option MCQ with balanced, plausible distractors
- Expanded from 50 → 60 questions
- Fixed `question_count: 0` meta bug
- 10 new questions (pcnsa-051–060): Layer 2 deployment mode, IPsec path monitoring, IKEv2 vs IKEv1, Vulnerability Protection action types (block-ip / drop), Kerberos SSO, AV vs WildFire profile roles, Policy-Based Forwarding (PBF), SAML SP/IdP roles, HA preemption behavior, NAT policy zone matching
- All 13 PCNSA domain areas represented: App-ID, User-ID, Content-ID, security zones, policy order, NAT, security profiles, WildFire, decryption, VPN/GlobalProtect, HA, Panorama, logging/certs/auth

---

## Task 3 — New Course Page: AZ-500 Azure Security Engineer

**File created:**
- `learning/az-500/index.html` — complete course page

**Course page features:**
- 7 modules (~40h total study time)
- Exam snapshot table (code, questions, passing score, duration, price, prerequisites, renewal)
- Domain weight bar chart (4 domains)
- Per-module topic tags (31 topics covered across modules)
- 3 concept callout boxes: PIM vs Conditional Access, Key Vault RBAC vs access policies, Sentinel vs Defender for Cloud
- 6-week hands-on study plan with lab tasks per week
- Top 4 AZ-500 exam mistakes box
- Spotify podcast CTAs at top, mid-page, and bottom
- Related cert cards (AZ-104, SC-900, AZ-900, Security+)
- Full SEO: title, meta description, Open Graph, Twitter Card, BreadcrumbList JSON-LD, Course JSON-LD, canonical URL

---

## Microsoft Azure Brand Stats (post-batch)
- Live exams: 4 (AZ-900, AZ-104, SC-900, AZ-500)
- Total questions: 580+
- Coming soon: AZ-305, AZ-700, MS-900
