# Changes — 2026-04-15 (Batch 4)

## Task 1: New Certification — AWS Advanced Networking Specialty (ANS-C01)

**Files created:**
- `data/free/aws-ans-c01.json` — 60 advanced scenario-based questions v1.0.0
- `learning/aws-ans-c01/index.html` — full study course page (~1040 lines)

**Files updated:**
- `data/index.json` — activated `aws-ans-c01` pack (available: true, question_count: 60)
- `data/courses.json` — added `aws-ans-c01` course entry (v2.0.0)
- `certifications/aws.html` — ANS-C01 tile now Live, hero 6 exams / 400+ questions
- `sitemap.xml` — added `https://certquests.com/learning/aws-ans-c01/`

**Question pack details:**
- 60 questions, perfectly balanced A=15 / B=15 / C=15 / D=15
- Covers all 4 ANS-C01 exam domains:
  - Network Design (~30%, 18q) — Cloud WAN, Transit Gateway, Direct Connect, PrivateLink
  - Network Implementation (~26%, 16q) — ALB/NLB/GWLB, WAF, CloudFront, Network Firewall
  - Network Management & Operations (~20%, 12q) — Reachability Analyzer, Flow Logs, Traffic Mirroring, VPC Lattice
  - Network Security, Compliance & Governance (~24%, 14q) — GWLB GENEVE inline inspection, centralized egress, TLS inspection, Firewall Manager
- Services covered: VPC, Transit Gateway, Cloud WAN, Direct Connect, PrivateLink, ALB/NLB/GWLB, CloudFront, Global Accelerator, Route 53 Resolver, Network Firewall, WAF, Shield Advanced, VPC Lattice, Firewall Manager, BGP routing

**Course page features:**
- 7 modules, ~50 hours estimated study (specialty-level)
- AWS orange (#FF9900) + AWS dark (#232F3E) color scheme
- Spotify + quiz CTAs at top/mid/bottom
- Exam snapshot (ANS-C01 / 65 questions / 170 min / 750-1000 / $300 USD)
- 4 domain weight bars
- 3 concept callouts (Transit Gateway vs Cloud WAN, GWLB GENEVE flow, VPC Endpoint decision matrix)
- 6-week study plan
- Top 4 mistakes box (VPC peering transitivity, DX VIF types, Gateway vs Interface endpoints, NLB client IP)
- ANS-C01 vs SAA-C03 comparison
- Related cert cards (SAA-C03, SCS-C02, GCP PCA, CCNP Security SCOR)

---

## Task 2: AZ-900 Azure Fundamentals — Major rework (v2.0.0)

**File updated:** `data/free/az-900.json`

### Problems found and fixed:
1. **Duplicate bug**: 100 entries but only 80 unique IDs (az900-041..060 duplicated) — same pattern as Security+, Network+. Deduplicated to 80 unique.
2. **Severe answer bias**: 93% of questions had `correct: 1` (option B). Rebalanced via option swapping.
3. **Missing modern topics**: no questions on recent Azure updates.

### Rebalance method:
- Scanned all B-answer questions for positional references — 0 unsafe matches
- 20 questions swapped B→A (options[0]↔[1], correct becomes 0)
- 14 questions swapped B→C (options[1]↔[2], correct becomes 2)
- 19 questions swapped B→D (options[1]↔[3], correct becomes 3)

### 10 new modern-topic questions (az900-081 to az900-090):

| ID | Topic | Correct |
|---|---|---|
| az900-081 | Microsoft Entra ID rebrand (formerly Azure AD) | C |
| az900-082 | Copilot in Azure for AI-powered management | A |
| az900-083 | Azure OpenAI Service / AI Foundry | D |
| az900-084 | Azure Managed Grafana | B |
| az900-085 | Cloud Adoption Framework + Landing Zones | C |
| az900-086 | Microsoft Cost Management + Advisor FinOps | A |
| az900-087 | Azure Arc for hybrid/multi-cloud management | D |
| az900-088 | Azure Confidential Computing (TEEs) | B |
| az900-089 | Microsoft Purview Data Governance | C |
| az900-090 | Application Insights + OpenTelemetry | A |

### Final state:
- **Before**: 100 entries (80 unique), 93% B-bias, v1.0.0
- **After**: 90 unique questions, distribution A=23/B=22/C=23/D=22, v2.0.0
- `data/index.json` — AZ-900 count corrected 100 → 90

---

## Summary

| Metric | Before | After |
|---|---|---|
| AWS Certs Live | 5 | 6 (+ ANS-C01) |
| AWS Questions | 340+ | 400+ |
| AZ-900 Answer Bias | 93% B | Balanced (≈25% each) |
| AZ-900 Questions | 100 (80 unique) | 90 unique |
| Total active question packs | 35 | 36 |
| Course Pages | 26 | 27 |
