# Changes — 2026-04-15 (Batch 2)

## Task 1: New Certification — Microsoft 365 Fundamentals (MS-900)

**Files created:**
- `data/free/ms-900.json` — 60 scenario-based questions v1.0.0
- `learning/ms-900/index.html` — full study course page (1009 lines)

**Files updated:**
- `data/index.json` — activated `ms-900` pack (available: true, question_count: 60)
- `data/courses.json` — added `ms-900` course entry (v1.8.0)
- `certifications/microsoft.html` — MS-900 tile now Live, hero 6 exams / 700+ questions, h1 "Azure" → "Microsoft", description includes MS-900
- `sitemap.xml` — added `https://certquests.com/learning/ms-900/`

**Question pack details:**
- 60 questions, balanced A=15 / B=15 / C=15 / D=15
- Covers all 4 MS-900 exam domains:
  - Cloud Concepts (~13%, 8q)
  - Microsoft 365 Apps and Services (~33%, 20q)
  - Security, Compliance, Privacy, Trust (~27%, 17q)
  - Pricing, Licensing, Support (~27%, 15q)
- Topics: Exchange Online, SharePoint, OneDrive, Teams, Microsoft Viva (5 modules), Intune, Windows 365 vs AVD, Power Platform, Copilot for M365, Microsoft Entra ID, Conditional Access, Defender XDR (4 components), Microsoft Purview (sensitivity labels, DLP, eDiscovery, Insider Risk), Zero Trust, Customer Lockbox, Service Trust Portal, E1/E3/E5 plans, Business Premium, F1/F3, FastTrack, Unified Support

**Course page features:**
- 6 modules, ~20 hours estimated study time (beginner-level)
- Microsoft blue (#0078D4) + cyan (#50E6FF) color scheme
- Spotify podcast CTA + quiz CTA (top + mid + bottom)
- Exam snapshot table (MS-900: 40-60 questions / 45 min / 700/1000 / $99 USD / no recertification)
- 4 domain weight progress bars
- 3 concept callouts (M365 vs O365 distinction, E1/E3/E5 plan decoder, FastTrack vs Premier Support)
- 4-week study plan (shorter than Pro certs)
- Top 4 exam mistakes box (E3/E5 confusion, Windows 365 vs AVD, Entra ID == Azure AD, Viva Engage vs Connections)
- MS-900 vs AZ-900 comparison table
- Related cert cards (AZ-900, SC-900, AZ-104, AZ-500)

---

## Task 2: CompTIA Security+ SY0-701 — Question additions + dedup

**File updated:** `data/free/comptia-security-plus.json`
- Bumped to v1.1.0
- Added 10 new scenario-based questions (sec-081 to sec-090)
- Fixed pre-existing bug: 20 duplicate entries (sec-041..sec-060 appeared twice) — deduplicated to 90 unique questions
- Final state: 90 unique questions, varied correct-answer distribution

**Also updated:** `data/index.json` — comptia-security-plus question_count corrected 100 → 90 (now matches actual file)

**New questions (sec-081 to sec-090):**

| ID | Topic | Correct |
|---|---|---|
| sec-081 | Zero Trust Architecture core principles | A |
| sec-082 | SASE convergence (SD-WAN + ZTNA + SWG + CASB + FWaaS) | C |
| sec-083 | EDR vs XDR — XDR correlates across vectors | D |
| sec-084 | Threat hunting proactive approach using TTPs/IOCs | B |
| sec-085 | IoT smart-building hardening (segmentation, creds, patching) | A |
| sec-086 | Certificate pinning / HPKP for mobile MITM protection | D |
| sec-087 | SAST vs DAST vs IAST in the SDLC | C |
| sec-088 | OAuth 2.0 (authorization) vs SAML 2.0 (federation) | B |
| sec-089 | Shadow IT discovery via CASB | A |
| sec-090 | Post-quantum cryptography (CRYSTALS-Kyber, harvest-now-decrypt-later) | D |

Topics inspired by current CompTIA Security+ SY0-701 exam: Zero Trust, SASE, XDR, threat hunting, IoT security, certificate pinning, SAST/DAST/IAST, OAuth/SAML, shadow IT, post-quantum crypto.

---

## Summary

| Metric | Before | After |
|---|---|---|
| Microsoft Certs Live | 5 (AZ-900, AZ-104, AZ-305, AZ-500, SC-900) | 6 (+ MS-900) |
| Microsoft Questions | 640+ | 700+ |
| Security+ Questions (file) | 110 entries (with dupes) | 90 unique |
| Security+ Questions (catalog) | 100 | 90 |
| Total active question packs | 33 | 34 |
| Course Pages | 24 | 25 |
