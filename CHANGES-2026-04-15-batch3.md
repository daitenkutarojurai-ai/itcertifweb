# Changes — 2026-04-15 (Batch 3)

## Task 1: New Certification — Cisco CCNP Security SCOR 350-701

**Files created:**
- `data/free/ccnp-security.json` — 60 advanced scenario-based questions v1.0.0
- `learning/ccnp-security/index.html` — full study course page (~1000 lines)

**Files updated:**
- `data/index.json` — activated `ccnp-security` pack (available: true, question_count: 60)
- `data/courses.json` — added `ccnp-security` course entry (v1.9.0)
- `certifications/cisco.html` — SCOR tile now Live, hero 2 exams / 170+ questions, FAQ updated
- `sitemap.xml` — added `https://certquests.com/learning/ccnp-security/`

**Question pack details:**
- 60 questions, perfectly balanced A=15 / B=15 / C=15 / D=15
- Covers all 6 CCNP Security SCOR 350-701 domains:
  - Security Concepts (~25%, 15q)
  - Network Security (~20%, 12q)
  - Securing the Cloud (~15%, 9q)
  - Content Security (~10%, 6q)
  - Endpoint Protection and Detection (~15%, 9q)
  - Secure Network Access, Visibility, and Enforcement (~15%, 9q)
- Topics: AES-GCM/CBC crypto, PKI/OCSP/CRL, IPsec IKEv2, DMVPN/FlexVPN/GETVPN, Cisco ASA failover/multi-context, Firepower FTD/FMC, Snort 3, Cisco ISE distributed deployment, 802.1X EAP-TLS/PEAP/TEAP, TrustSec SGTs/SGACLs/SXP, pxGrid, Umbrella SIG, ESA/WSA, AMP retrospection, Secure Endpoint EDR, SecureX XDR, Stealthwatch/ETA, cloud CASB Cloudlock, Secure Workload microsegmentation, DevSecOps SAST/SCA

**Course page features:**
- 7 modules, ~50 hours estimated study time (advanced)
- Cisco blue (#1D63ED) + teal (#00BCEB) color scheme
- Spotify podcast + quiz CTAs at top/mid/bottom
- Exam snapshot table (SCOR 350-701: 90-110 questions / 120 min / $400 USD / 3-year recert / CCIE Security core)
- 6 domain weight bars
- 3 concept callouts (IKEv1 vs IKEv2, ASA vs Firepower FTD, TrustSec SGTs vs VLANs)
- 6-week study plan
- Top 4 mistakes box (DMVPN phases, ASA failover modes, ISE policy evaluation top-down, Umbrella vs WSA)
- SCOR vs CCNA Security comparison callout
- Related cert cards (CCNA, AZ-500, Security+, SCS-C02)

---

## Task 2: CompTIA Network+ N10-009 — Question additions + dedup

**File updated:** `data/free/comptia-network-plus.json`
- Bumped to v1.1.0
- Renamed exam: "N10-008" → "N10-009" (exam refreshed in 2024)
- Fixed pre-existing bug: 20 duplicate entries (net-041..net-060 appeared twice) — deduplicated to 80 unique
- Added 10 new scenario-based questions (net-081..net-090)
- Final state: 90 unique questions

**Also updated:** `data/index.json` — comptia-network-plus question_count corrected 100 → 90

**New questions (net-081 to net-090):**

| ID | Topic | Correct |
|---|---|---|
| net-081 | SASE convergence (SD-WAN + SWG + CASB + ZTNA + FWaaS) | C |
| net-082 | SDN — control plane / data plane separation, NB/SB APIs | A |
| net-083 | SD-WAN transport-agnostic dynamic path selection | D |
| net-084 | ZTNA replaces VPN with identity-based app-level access | B |
| net-085 | VXLAN UDP 4789, 24-bit VNI vs 12-bit VLAN ID | C |
| net-086 | AWS Direct Connect dedicated circuit vs IPsec VPN | A |
| net-087 | IPv6 SLAAC (stateless RA) vs DHCPv6 (stateful) | D |
| net-088 | Wi-Fi 6 (802.11ax) OFDMA, TWT, BSS coloring | B |
| net-089 | DNSSEC RRSIG/DNSKEY prevents cache poisoning | C |
| net-090 | OTDR (Optical Time Domain Reflectometer) for fiber fault location | A |

Topics inspired by modern CompTIA Network+ N10-009 exam: SASE, SDN, SD-WAN, ZTNA, VXLAN, cloud interconnects, IPv6, Wi-Fi 6, DNSSEC, cable testing.

---

## Summary

| Metric | Before | After |
|---|---|---|
| Cisco Certs Live | 1 (CCNA only) | 2 (+ CCNP Security SCOR) |
| Cisco Questions | 110 | 170+ |
| Network+ Questions (file) | 100 (with 20 dupes) | 90 unique |
| Network+ Questions (catalog) | 100 | 90 |
| Total active question packs | 34 | 35 |
| Course Pages | 25 | 26 |
