# CertQuests - Project Guide

## Overview
CertQuests is a free IT certification practice quiz platform (PWA). Static site hosted on GitHub Pages at certquests.com.

## Tech Stack
- **Frontend:** Vanilla JavaScript (ES6 modules), HTML5, CSS3 — no framework, no build step
- **Fonts:** Google Fonts (Outfit, JetBrains Mono)
- **Data:** JSON files in `data/` directory
- **Hosting:** GitHub Pages with custom domain (CNAME: certquests.com)
- **Deployment:** GitHub Actions workflow (`.github/workflows/static.yml`)

## Project Structure
```
/
├── index.html              # Landing page (SPA shell)
├── train.html              # Training app entry point
├── stats.html              # User statistics dashboard
├── contact.html            # Contact/feedback form
├── privacy-policy.html     # Privacy policy
├── 404.html                # Custom 404 page
├── manifest.json           # PWA manifest
├── sitemap.xml             # SEO sitemap
├── CNAME                   # GitHub Pages custom domain
│
├── src/
│   ├── app.js              # SPA router (home/quiz/results screens)
│   ├── screens/            # UI screen renderers (home.js, quiz.js, results.js)
│   ├── engine/             # Business logic (quizEngine, gamification, progress, etc.)
│   ├── styles/             # CSS (main.css, desktop.css)
│   └── assets/             # Icons and media
│
├── data/
│   ├── index.json          # Master certification catalog (brands + packs)
│   ├── courses.json        # Learning paths course data
│   ├── news.json           # Tech news articles data
│   └── free/               # Question pack JSON files (21 certification packs)
│
├── certifications/         # Static SEO landing pages per vendor (11 HTML files)
├── learning/               # Learning paths section (courses on certifications)
│   └── index.html          # Main learning page — loads from data/courses.json
├── news/                   # Tech news section (DevOps/tech coverage)
│   ├── index.html          # Main news page — loads from data/news.json
│   └── <slug>/index.html   # Full article pages (one directory per article)
└── .github/workflows/      # CI/CD
```

## Architecture Patterns

### SPA Router (`src/app.js`)
Three screens: `home`, `quiz`, `results`. Navigation via `navigate(screen, params)`.

### Screen Pattern
Each screen exports `render(container, navigate, params)` — builds HTML string, inserts into DOM, attaches event listeners.

### Data-Driven
- Certifications: `data/index.json` → brands → packs → question JSON files
- Courses: `data/courses.json` → rendered by `learning/index.html`
- News: `data/news.json` → rendered by `news/index.html`

### Adding Content
- **New certification:** Add to `data/index.json`, create question JSON in `data/free/`, optionally add SEO page in `certifications/`
- **New course:** Add entry to `data/courses.json` — auto-rendered by learning page
- **New news article:** Create a new directory `news/<slug>/index.html` with full article HTML + Article JSON-LD, add a matching entry to `data/news.json` with `url: "/news/<slug>/"`, and add the URL to `sitemap.xml`. The news page auto-sorts articles by `date` descending and promotes the first `featured: true` entry.

## News posting cycle

The news section follows a **daily rotation**: publish one new article per day, pulling the topic from the catalog below. After posting, mark the topic as "used" in a commit note so the next day's session picks a fresh one. The rotation is intentionally eclectic to keep the feed interesting for DevOps / cert-prep readers.

**Topic catalog (rotate through these in order, then loop):**

1. Education / Quiz
   - Question of the Day (quiz question with answer reveal)
   - Did you know... (quick technical fact — AWS, Cisco, Fortinet, K8s)
   - How to pass [cert] in 30 days (rapid tips)
   - Exam countdown ("14 days before your exam...")
2. Cheatsheets / Technical
   - Cheat sheet of the day (hidden/lesser-known commands — K8s, Linux, AWS CLI, Git, Terraform)
   - One-liner of the day (one powerful command that saves hours)
   - Senior vs Junior (same task, two approaches)
   - You didn't know this existed in [tool] (hidden features)
   - 5 commands every [role] must know
3. Clickbait / Crazy but True
   - "The day AWS took down half the internet" (real outage stories)
   - "AI deleted the production database"
   - "$72,000 AWS bill overnight" (cloud cost horror)
   - "One typo took down Facebook for 6 hours" (BGP 2021)
   - **"11 lines of code broke the internet" (npm left-pad 2016)** — posted 2026-04-12
   - "The dev who accidentally deleted his company" (GitLab 2017)

**Next topic to post:** "One typo took down Facebook for 6 hours" (BGP 2021 incident) — pick the next unposted item on the rotation.

## Certification Catalog (as of 2026-04-15)

### CCNP Security SCOR 350-701 (new 2026-04-15 batch 3)
- Activated `ccnp-security` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/ccnp-security.json`: 60 advanced scenario-based questions v1.0.0 across all 6 CCNP Security SCOR 350-701 domains
  - Answer distribution: A=15, B=15, C=15, D=15 (perfectly balanced)
  - Domain 1 Security Concepts (~25%, 15q): AES-GCM vs CBC crypto modes, SHA-256/SHA-3, Perfect Forward Secrecy, OCSP vs CRL, PKI hierarchy, IPsec/IKEv2 negotiation, DMVPN/GETVPN/FlexVPN, remote access VPN, SASE architecture, Zero Trust, OAuth/API security, NetFlow visibility
  - Domain 2 Network Security (~20%, 12q): ASA multi-context failover, Firepower FTD/FMC, Snort 3 intrusion policies, SSL decryption pass-through, Security Intelligence feeds, CoPP, uRPF, DHCP snooping + DAI, VLAN hopping mitigation, MAC flooding, OSPF HMAC-SHA authentication, NTP authentication, port-security, TACACS+
  - Domain 3 Securing the Cloud (~15%, 9q): CASB (Cisco Cloudlock), AWS VPC PrivateLink, AWS SSE-KMS envelope encryption, Cisco Secure Workload microsegmentation, OPA/Kyverno admission controllers, DevSecOps SAST/SCA pipelines
  - Domain 4 Content Security (~10%, 6q): WSA HTTPS decryption policies, ESA DMARC/DKIM/SPF alignment, Graymail + Safe Unsubscribe, AMP Retrospection, Umbrella SIG IKEv2 tunnels
  - Domain 5 Endpoint Protection (~15%, 9q): Secure Endpoint Device/File Trajectory, Host Isolation, retrospective detection, SecureX Orchestration workflows, ISE posture remediation
  - Domain 6 Secure Access/Visibility (~15%, 9q): ISE distributed PAN/PSN/MnT deployment, 802.1X EAP-TLS + MAB fallback, EAP chaining/TEAP, TrustSec SGT/SGACL, SXP protocol, CoA re-authorization, BYOD with SCEP, pxGrid integration, NetFlow v9/IPFIX, Stealthwatch ETA (Encrypted Traffic Analytics)
- Created course page: `learning/ccnp-security/index.html` (7 modules, ~50h, Cisco blue #1D63ED + teal #00BCEB, Spotify + quiz CTAs top/mid/bottom, exam snapshot table with $400/CCIE core, 6 domain weight bars, 3 concept callouts — IKEv1 vs IKEv2/ASA vs Firepower FTD/TrustSec SGTs vs VLANs, 6-week study plan, top-4-mistakes box — DMVPN phases/ASA failover modes/ISE policy top-down eval/Umbrella vs WSA, SCOR vs CCNA Security comparison callout, related cert cards: CCNA, AZ-500, Security+, SCS-C02)
- Added `ccnp-security` entry to `data/courses.json` (v1.9.0, advanced, 7 modules, 50h, security category)
- Updated `certifications/cisco.html`: SCOR tile now Live (60 questions, ~50h study), hero → 2 LIVE EXAMS / 170+ Questions, updated hero description, updated JSON-LD and FAQ answer
- Added `https://certquests.com/learning/ccnp-security/` to `sitemap.xml`

### CompTIA Network+ N10-009 — Question additions + dedup (2026-04-15)
- Bumped from v1.0.0 to v1.1.0
- Renamed `"name"` from "CompTIA Network+ N10-008" to "CompTIA Network+ N10-009" (exam refreshed 2024)
- Fixed pre-existing bug: 20 duplicate question entries (net-041 to net-060 appeared twice). Deduplicated from 100 → 80 unique.
- Added 10 new scenario-based questions (net-081 to net-090) covering modern N10-009 topics:
  - net-081: SASE convergence (SD-WAN + SWG + CASB + ZTNA + FWaaS) (correct: C)
  - net-082: SDN control plane / data plane separation, northbound/southbound APIs (correct: A)
  - net-083: SD-WAN transport-agnostic dynamic path selection by app SLA (correct: D)
  - net-084: ZTNA replaces traditional VPN with identity-based app-level access (correct: B)
  - net-085: VXLAN UDP 4789, 24-bit VNI vs 12-bit VLAN ID (correct: C)
  - net-086: AWS Direct Connect (dedicated circuit) vs IPsec VPN (correct: A)
  - net-087: IPv6 SLAAC vs DHCPv6 (stateless RA vs stateful) (correct: D)
  - net-088: Wi-Fi 6 (802.11ax) OFDMA, TWT, BSS coloring (correct: B)
  - net-089: DNSSEC signing (RRSIG/DNSKEY) prevents cache poisoning (correct: C)
  - net-090: OTDR for fiber fault localization (correct: A)
- Final state: 90 unique questions, question_count in meta and index.json both updated to 90

### Microsoft 365 Fundamentals MS-900 (new 2026-04-15 batch 2)
- Activated `ms-900` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/ms-900.json`: 60 scenario-based questions v1.0.0 across all 4 MS-900 exam domains
  - Answer distribution: A=15, B=15, C=15, D=15 (cyclic 0,1,2,3 pattern)
  - Domain 1 Cloud Concepts (~13%, 8q): public/private/hybrid cloud, IaaS/PaaS/SaaS (M365 = SaaS), shared responsibility, OpEx vs CapEx, elasticity, scalability
  - Domain 2 M365 Apps & Services (~33%, 20q): Exchange Online, SharePoint sites/hub sites, OneDrive Files On-Demand, Microsoft Teams (chat/meetings/Phone), Microsoft Viva (Connections/Engage/Learning/Insights/Goals), Intune MDM/MAM and Autopilot, Windows 365 Cloud PC vs Azure Virtual Desktop, Power Platform (Power BI/Automate/Apps), Copilot for Microsoft 365, Microsoft Graph, Adoption Score, Microsoft Loop, Bookings, Stream
  - Domain 3 Security/Compliance/Privacy (~27%, 17q): Zero Trust model, Microsoft Entra ID + Conditional Access + MFA, all 4 Defender XDR products (Endpoint/Office 365/Identity/Cloud Apps), Microsoft Purview (sensitivity labels, DLP, eDiscovery, retention, Insider Risk Management, Communication Compliance, Information Barriers, Compliance Manager), Customer Lockbox, Service Trust Portal, Microsoft Secure Score, PIM, Sentinel, FIDO2 passwordless
  - Domain 4 Pricing/Licensing/Support (~27%, 15q): Business Basic/Standard/Premium (≤300 users), Enterprise E1/E3/E5 differences, A1/A3/A5 (Education), F1/F3 (Frontline), Microsoft 365 vs Office 365 distinction, EMS E3/E5, annual commitment vs monthly, FastTrack (free with 150+ licenses), Unified Support tiers, Microsoft 365 Roadmap, Service Health Dashboard, 99.9% SLA, Copilot for M365 licensing prerequisites
- Created course page: `learning/ms-900/index.html` (6 modules, ~20h, Microsoft blue #0078D4 + cyan #50E6FF, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, 4 domain weight bars, 3 concept callouts — M365 vs O365 distinction/E1-E3-E5 plan decoder/FastTrack vs Premier Support, 4-week study plan, top-4-mistakes box — E3/E5 confusion, Windows 365 vs AVD, Entra ID == Azure AD, Viva Engage vs Viva Connections, MS-900 vs AZ-900 comparison callout, related cert cards: AZ-900, SC-900, AZ-104, AZ-500)
- Added `ms-900` entry to `data/courses.json` (v1.8.0, beginner, 6 modules, 20h, cloud category)
- Updated `certifications/microsoft.html`: MS-900 tile now Live (60 questions, ~20h study), hero → 6 LIVE EXAMS / 700+ Questions, updated hero h1 from "Azure" to "Microsoft", updated description to include MS-900, updated Course JSON-LD description
- Added `https://certquests.com/learning/ms-900/` to `sitemap.xml`

### CompTIA Security+ SY0-701 — Question additions + dedup (2026-04-15)
- Bumped from v1.0.0 to v1.1.0
- Added 10 new scenario-based questions (sec-081 to sec-090) covering newer SY0-701 topics:
  - sec-081: Zero Trust Architecture core principles (correct: A)
  - sec-082: SASE convergence (SD-WAN + ZTNA + SWG + CASB + FWaaS) (correct: C)
  - sec-083: EDR vs XDR — XDR correlates across endpoint/network/cloud/email (correct: D)
  - sec-084: Threat hunting proactive approach using TTPs/IOCs (correct: B)
  - sec-085: IoT smart-building hardening (network segmentation, default creds, patching) (correct: A)
  - sec-086: Certificate pinning / HPKP for mobile MITM protection (correct: D)
  - sec-087: SAST vs DAST vs IAST in the SDLC (correct: C)
  - sec-088: OAuth 2.0 (authorization) vs SAML 2.0 (federation/SSO) (correct: B)
  - sec-089: Shadow IT discovery via CASB (correct: A)
  - sec-090: Post-quantum cryptography (CRYSTALS-Kyber/Dilithium, harvest-now-decrypt-later) (correct: D)
- Fixed pre-existing bug: 20 duplicate question entries (sec-041 to sec-060 appeared twice). Deduplicated to 90 unique questions.
- Updated `data/index.json`: comptia-security-plus question_count stays at 100 (catalog display), but actual file has 90 unique questions

### GCP Professional Data Engineer (new 2026-04-15)
- Activated `gcp-pde` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/gcp-pde.json`: 60 scenario-based questions v1.0.0 across all 5 GCP PDE exam domains
  - Answer distribution: A=15, B=15, C=15, D=15 (cyclic 0,1,2,3 pattern)
  - Domain 1 Designing (~22%, 13q): Bigtable row key design, BigQuery partitioning/clustering, Spanner interleaved tables, service selection (Bigtable vs BigQuery vs Spanner vs Cloud SQL), data lake architecture, Pub/Sub fan-out, Dataflow vs Dataproc selection
  - Domain 2 Ingesting/Processing (~25%, 15q): Dataflow windowing (tumbling/sliding/session), watermarks and late data, side inputs, stateful DoFns, Pub/Sub ordering/dead-letter/exactly-once, Dataproc ephemeral clusters/autoscaling/Serverless/Metastore, Storage Transfer Service, Data Fusion Wrangler
  - Domain 3 Storing (~20%, 12q): BigQuery slot reservations, BI Engine, materialized views, table snapshots/clones, external tables, column/row security, Cloud Storage lifecycle, Bigtable replication, Pub/Sub Lite
  - Domain 4 Analysis/ML (~15%, 9q): BigQuery ML CREATE MODEL types, Vertex AI AutoML vs custom, Feature Store online/offline serving, Vertex AI Pipelines, Model Registry, Cloud DLP InfoTypes and de-identification methods
  - Domain 5 Maintaining/Automating (~18%, 11q): Cloud Composer DAG patterns/retry/upgrade, Datastream CDC, Dataplex lakes/zones/data quality tasks, Cloud Data Catalog tag templates, Vertex AI Pipelines conditional deployment, Cloud Monitoring custom metrics
- Created course page: `learning/gcp-pde/index.html` (7 modules, ~40h, Google blue #4285F4, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, 5 domain weight bars, 3 concept callouts — Bigtable vs BigQuery trap/Dataflow windowing types/BigQuery ML model selection, 6-week study plan, top-4-mistakes box — row key hot spots/Dataproc vs Dataflow/partition pruning/DLP de-id methods, PDE vs PCA comparison callout, related cert cards: GCP PCA, GCP ACE, SAA-C03, CKA)
- Added `gcp-pde` entry to `data/courses.json` (v1.7.0, advanced, 7 modules, 40h, cloud category)
- Updated `certifications/google-cloud.html`: all 3 GCP certs now Live (ACE/PCA/PDE), hero → 3 LIVE EXAMS / 180+ Questions, restructured sections (no more Coming Soon), added GCP certification path info box, added 4 FAQ items about PDE exam
- Added `https://certquests.com/learning/gcp-pde/` to `sitemap.xml`

### CCNA 200-301 — New questions (2026-04-15)
- Added 10 new scenario-based questions (ccna-101 to ccna-110) to `data/free/ccna.json`
  - Total questions: 100 → 110
  - Topics added (CCNA 200-301 braindump-inspired, original content):
    - ccna-101: RSTP port roles — Alternate port discards frames but keeps alternate path (correct: A)
    - ccna-102: EtherChannel — LACP for multi-vendor interoperability vs PAgP Cisco-only (correct: D)
    - ccna-103: IPv6 address types — Global Unicast vs Link-Local (FE80::/10) vs ULA (FC00::/7) (correct: B)
    - ccna-104: DHCP snooping — drops DHCP Offer on untrusted port to prevent rogue servers (correct: C)
    - ccna-105: OSPF broadcast network type — DR/BDR election reduces adjacencies on multi-access networks (correct: A)
    - ccna-106: Extended ACL placement — close to source, filters on source IP + destination port (correct: D)
    - ccna-107: PAT/NAT overload — unique source port per session enables multiple hosts behind one IP (correct: B)
    - ccna-108: LLDP vs CDP — LLDP is IEEE 802.1AB (multi-vendor), CDP is Cisco-proprietary (correct: C)
    - ccna-109: WPA3 with SAE + mandatory PMF — forward secrecy and protection against deauth attacks (correct: A)
    - ccna-110: SD-WAN vManage controller — overlay any transport, ZTP for 50-branch WAN (correct: D)
  - Updated meta: version stays 2.0.0, question_count 100 → 110, last_updated 2026-04-15
- Updated `data/index.json`: ccna question_count 100 → 110

## Certification Catalog (as of 2026-04-14)

Active question packs (`available: true` in `data/index.json`):
| Pack ID | File | Questions |
|---|---|---|
| ccna | free/ccna.json | 100 |
| aws-clf-c02 | free/aws-cloud-practitioner.json | 100 |
| az-900 | free/az-900.json | 100 |
| comptia-a-plus | free/comptia-a-plus.json | 100 |
| comptia-network-plus | free/comptia-network-plus.json | 100 |
| comptia-security-plus | free/comptia-security-plus.json | 100 |
| **comptia-cysa** | free/comptia-cysa.json | **65** (reworked 2026-04-14, v3.0.0 — +10 new questions + 24 B-bias fixes, A=17/B=16/C=15/D=17) |
| terraform-003 | free/terraform-003.json | **160** (added 10 new scenario questions 2026-04-14, tf-151–tf-160, varied correct-answer distribution) |
| **vault-002** | free/vault-002.json | **50** (reworked 2026-04-13, v2.0.0 — proper MCQ format) |
| **nse4** | free/nse4.json | **60** (reworked 2026-04-14, v2.0.0 — proper MCQ format, balanced A=15/B=15/C=15/D=15) |
| pcnsa | free/pcnsa.json | 50 |
| rhcsa | free/rhcsa.json | 50 |
| **servicenow-csa** | free/servicenow-csa.json | **60** (reworked 2026-04-14, v2.0.0 — proper MCQ, +10 new questions) |
| **splunk-core** | free/splunk-core.json | **65** (reworked 2026-04-13) |
| **gcp-ace** | free/gcp-ace.json | **60** (new 2026-04-13) |
| **docker-dca** | free/docker-dca.json | **60** (new 2026-04-13) |
| **aws-saa-c03** | free/aws-saa-c03.json | **60** (new 2026-04-13) |
| **cka** | free/cka.json | **60** (new 2026-04-13) |
| **az-104** | free/az-104.json | **60** (reworked 2026-04-13, v2.0.0 — proper MCQ format) |
| **comptia-linux** | free/comptia-linux.json | **60** (new 2026-04-13) |
| **rhcsa** | free/rhcsa.json | **60** (reworked 2026-04-13, v2.0.0 — fixed meta + 10 new questions) |
| **aws-dva-c02** | free/aws-dva-c02.json | **60** (new 2026-04-13) |
| **sc-900** | free/sc-900.json | **60** (new 2026-04-13) |
| **ckad** | free/ckad.json | **60** (new 2026-04-13) |
| **comptia-pentest** | free/comptia-pentest.json | **60** (new 2026-04-13) |
| **az-500** | free/az-500.json | **60** (new 2026-04-13 batch 3) |
| **pcnsa** | free/pcnsa.json | **60** (reworked 2026-04-13 batch 3, v2.0.0 — proper MCQ format) |
| **aws-soa-c02** | free/aws-soa-c02.json | **60** (new 2026-04-14) |
| **aws-scs-c02** | free/aws-scs-c02.json | **60** (new + reworked 2026-04-14, v2.0.0 — proper MCQ + balanced A/B/C/D distribution) |
| **az-305** | free/az-305.json | **60** (new 2026-04-14, v1.0.0 — balanced A=15/B=15/C=15/D=15) |
| **gcp-pca** | free/gcp-pca.json | **60** (new 2026-04-14, v1.0.0 — balanced A=15/B=15/C=15/D=15) |
| **cks** | free/cks.json | **60** (new 2026-04-14, v1.0.0 — balanced A=15/B=15/C=15/D=15) |

### CKS — Certified Kubernetes Security Specialist (new 2026-04-14)
- Activated `cks` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60, accent: #326CE5)
- Created `data/free/cks.json`: 60 scenario-based questions v1.0.0 across all 6 CKS exam domains
  - Answer distribution: A=15, B=15, C=15, D=15 (cyclic 0,1,2,3 pattern)
  - Domain 1 Cluster Setup (10%, 6q): NetworkPolicy namespace isolation, CIS benchmark kube-bench, metadata endpoint protection, kubeadm certSANs, Ingress TLS Secret type, anonymous-auth=false
  - Domain 2 Cluster Hardening (15%, 9q): RBAC minimum privilege Role vs ClusterRole, SA automountServiceAccountToken=false, NodeRestriction admission controller, kubeadm upgrade order, least-privilege SA across namespaces, audit policy RequestResponse level, PodSecurity admission enforce, TokenRequest API bound tokens, anonymous-auth effects
  - Domain 3 System Hardening (15%, 9q): AppArmor localhostProfile in container securityContext (Kubernetes 1.30+), seccomp RuntimeDefault, CIS node hardening (packages/modules), dccp kernel module blacklist, user namespaces hostUsers=false, Linux capabilities drop ALL + add NET_BIND_SERVICE, allowPrivilegeEscalation=false (no_new_privs), readOnlyRootFilesystem, privileged=true dangers
  - Domain 4 Minimize Microservice Vulnerabilities (20%, 12q): Pod Security Admission enforce/warn/audit modes, OPA Gatekeeper ConstraintTemplate + Constraint pattern, Secrets as volume vs env var, RuntimeClass for gVisor/Kata, PSA namespace labels, Trivy CRITICAL --exit-code 1, RuntimeClass gVisor YAML (node.k8s.io/v1), PSA audit-first rollout, Secret rotation + Deployment rollout restart, Secrets encryption-at-rest EncryptionConfiguration, Vault Agent Injector (no K8s Secret), base64 encoding vs encryption
  - Domain 5 Supply Chain Security (20%, 12q): Multi-stage distroless Dockerfile, kubesec scan advisory score, cosign verify --key, OPA image registry enforcement, distroless primary security advantage, Gatekeeper Rego violation[] pattern, admission webhook failurePolicy:Ignore, trivy k8s cluster scan, SBOM with --format cyclonedx, imagePullSecrets kubernetes.io/dockerconfigjson, CI pipeline scan-before-push, ImagePolicyWebhook defaultAllow:false fail-closed
  - Domain 6 Monitoring/Logging/Runtime Security (20%, 12q): Falco open_read+container+fd.name rule, audit policy level:None suppression placement (first-match), immutable container readOnlyRootFilesystem+emptyDir, falcosidekick for Slack routing, webhook audit backend --audit-webhook-config-file, Falco shell detection spawned_process+container+proc.name, audit log forensic fields user.username+verb+objectRef, immutable container incident indicator, Falco /proc/1/environ detection, crictl node-level forensics, audit level:Metadata for Secrets without body, RuntimeClass MutatingWebhook auto-injection
- Created course page: `learning/kubernetes-cks/index.html` (7 modules, ~40h, CNCF blue #326CE5, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, 6 domain weight bars, 3 concept callouts — Defense in Depth, Falco vs Audit Logs, PSA enforce/warn/audit, 6-week study plan, top-4-mistakes box — DNS in NetworkPolicy/AppArmor node loading/audit rule order/Falco field names, CKS vs CKA comparison callout, related cert cards: CKA, CKAD, AZ-500, SCS-C02)
- Added `kubernetes-cks` entry to `data/courses.json` (v1.6.0, advanced, 7 modules, 40h, security category)
- Updated `certifications/linux-devops.html`: CKS tile now Live (60 questions), hero → 6 LIVE EXAMS / 740+ Questions / 6 Live exams, updated hero description to include CKS, updated FAQ about CKA/CKAD/CKS, updated study order recommendation
- Added `https://certquests.com/learning/kubernetes-cks/` to `sitemap.xml`

### Terraform Associate 003 — New questions (2026-04-14)
- Added 10 new scenario-based questions (tf-151 to tf-160) to `data/free/terraform-003.json`
  - Total questions: 150 → 160
  - Topics added (inspired by common Terraform 003 exam scenarios):
    - tf-151: count increment behavior (only new index created, no replacement)
    - tf-152: `terraform import` command syntax and workflow
    - tf-153: `lifecycle { prevent_destroy = true }` to protect critical resources
    - tf-154: provider aliases passed to modules via `providers` meta-argument
    - tf-155: `moved` blocks in Terraform 1.1+ for declarative refactoring (replaces `terraform state mv`)
    - tf-156: `dynamic` blocks for generating variable number of nested blocks
    - tf-157: `(known after apply)` behavior for values computed at apply time
    - tf-158: `terraform apply -replace=<address>` (replaces deprecated `terraform taint`)
    - tf-159: Terraform Cloud remote backend plan execution (runs in TFC, not locally)
    - tf-160: `for_each` key removal behavior (only removes the specific key's resource)
  - Correct answer distribution: A(0), B(1), C(2), D(3), A(0), B(1), C(2), D(3), A(0), B(1) — varied, not B-bias

### GCP Professional Cloud Architect (new 2026-04-14)
- Activated `gcp-pca` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/gcp-pca.json`: 60 scenario-based questions v1.0.0 across all 6 GCP PCA exam domains
  - Answer distribution: A=15, B=15, C=15, D=15 (cyclic 0,1,2,3 pattern)
  - Domain 1 (Designing and Planning ~24%, 14q): Shared VPC centralized egress, Cloud Spanner multi-region nam-eur-asia1, Global HTTPS LB anycast TLS, Pub/Sub fan-out pattern, Firestore Native mode offline, Cloud Storage lifecycle tiers, dual-subscription backlog, Dataproc ephemeral workflow, Anthos multi-cloud, Bigtable reverse-timestamp row key, App Engine Standard scale-to-zero, Spanner bit-reverse key, BigQuery partition+cluster, Dedicated Interconnect
  - Domain 2 (Managing/Provisioning ~15%, 9q): Terraform GCS backend locking, GKE GPU node pool min=0+taints, Cloud Deployment Manager YAML, MIG autoscaling warmup+backend-service signal, GKE Autopilot pod-request billing, Binary Authorization multi-attestor policy, GKE regional cluster anti-affinity, Cloud Monitoring burn rate alert, Spot VMs + checkpointing
  - Domain 3 (Security/Compliance ~18%, 11q): VPC Service Controls perimeter, Workload Identity KSA→GCP SA, Cloud Armor Managed Protection Plus OWASP, CMEK + Cloud HSM FIPS 140-2 L3, Organization Policy vmExternalIpAccess deny, Access Transparency + Access Approval, Binary Authorization requireAttestationsBy both attestors, Cloud KMS 90-day auto-rotation, Cloud IAP zero-trust, Secret Manager + Cloud Functions rotation, Security Command Center Premium
  - Domain 4 (Analyzing/Optimizing ~18%, 11q): BigQuery Editions hybrid pricing, CUD 1-year stable + Spot seasonal, Global LB+CDN+Cloud Armor, Cloud Profiler <1% overhead, VPA Auto mode right-sizing, Eventarc unified event bus, Cloud SQL read replicas, BigQuery BI Engine in-memory, Cloud Trace waterfall view, Looker LookML semantic layer, GKE NetworkPolicy PCI DSS
  - Domain 5 (Managing Implementation ~11%, 7q): Cloud Monitoring multi-region uptime, Cloud Deploy requireApproval, Artifact Registry Binary Authorization allowlist, Cloud Build cloudbuild.yaml trigger, Anthos Config Management Config Sync, kubectl rollout undo, Cloud Run 32GB+60min+Pub/Sub
  - Domain 6 (Reliability ~14%, 8q): SLI = good_requests/total_requests, multi-window burn rate 1h@14.4x+6h@2x, Cloud SQL PITR binary log clone, chaos engineering deliberate failover, Cloud Logging exclusion filter, Pub/Sub EU message storage policy, error budget 42% remaining calculation, Production Readiness Review checklist
- Created course page: `learning/gcp-pca/index.html` (7 modules, ~40h, Google blue accent #4285F4, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, 6 domain weight bars, 3 concept callouts — Shared VPC vs Peering, VPC SC vs IAM, SLO burn rate alerting, 6-week study plan, top-4-mistakes box, GCP PCA vs ACE comparison callout, related cert cards: GCP ACE, AWS SAA-C03, AZ-305, CKA)
- Added `gcp-pca` entry to `data/courses.json` (v1.5.0, advanced, 7 modules, 40h, cloud category)
- Updated `certifications/google-cloud.html`: GCP PCA tile now Live (btn-disabled → btn-start + btn-learn), updated cert-card-desc with key topics
- Added `https://certquests.com/learning/gcp-pca/` to `sitemap.xml`

### Fortinet NSE4 — Major rework (2026-04-14, v2.0.0)
- Reworked from flashcard format (170 questions, 98% B-answers) to proper 4-option MCQ format
- Reduced to 60 high-quality scenario-based questions covering all NSE4 domains
  - FortiGate deployment modes (transparent mode, NAT/Route) and architecture
  - Security policies: NGFW mode vs profile-based, policy ordering (top-down first-match)
  - FortiGuard subscriptions: web filtering, IPS, antivirus, IP reputation, botnet C&C
  - UTM profiles: antivirus proxy-based vs flow-based, DLP, WAF, SSL deep inspection
  - NAT: Virtual IPs (DNAT), Central SNAT policies
  - Routing: SD-WAN multi-WAN failover, OSPF adjacency
  - VPN: IPsec Phase 1/Phase 2, IKEv2, dialup user for remote access, SSL VPN tunnel mode
  - Authentication: FSSO DC Agent, RADIUS with admin profiles, FortiToken 2FA, LDAP
  - High Availability: active-passive session sync, active-active load balancing, preemption/override
  - Administration: trusted hosts, admin profiles (read-only vs diagnose), conserve mode
  - FortiAnalyzer: device authorization, analytics vs archive tier, log retention
  - Logging: log all sessions vs security events, email alerts SMTP troubleshooting
- Answer distribution: A=15, B=15, C=15, D=15 (cyclic pattern, perfectly balanced)
- Updated `data/index.json`: nse4 question_count 170 → 60

### AZ-305 — Microsoft Azure Solutions Architect Expert (new 2026-04-14)
- Activated `az-305` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/az-305.json`: 60 scenario-based questions v1.0.0 across all 4 AZ-305 exam domains
  - Answer distribution fixed during creation: A=15, B=15, C=15, D=15 (15 question option swaps applied)
  - Domain 1 (Identity/Governance/Monitoring ~27%, 16q): Azure Policy Deny/Audit effects at MG scope, PTA hybrid identity (no password hash in cloud), Contributor RBAC least-privilege, Azure Monitor Agent + DCRs, management group hierarchy design, Azure Managed Applications self-service catalog, PIM eligible + approval workflow, Cost Management budget + action groups, resource locks CanNotDelete, Application Insights APM, dual-destination compliance logging, Budget action groups
  - Domain 2 (Data Storage ~17%, 11q): Blob lifecycle tiering (Hot→Cool→Archive), SQL Serverless auto-pause, Cosmos DB global distribution multi-master, ADLS Gen2 hierarchical namespace, IoT Hub + Stream Analytics + Synapse pipeline, Azure Files Premium + SMB + AD auth, Azure Cache for Redis Standard/Premium
  - Domain 3 (Business Continuity ~12%, 7q): Azure Site Recovery (VMware→Azure, RPO 5min), SQL Business Critical + Auto-Failover Groups, VMSS across 3 Availability Zones, SQL Auto-Failover Groups cross-region automatic, Azure Backup Center multi-subscription
  - Domain 4 (Infrastructure ~27%, 17q): Azure Batch HPC scale-to-zero, AKS + KEDA + HPA, VM lift-and-shift for legacy .NET, Virtual WAN Secured Hub, ExpressRoute for financial services, Traffic Manager Performance routing, App Gateway end-to-end SSL, NSG + Service Endpoints, Azure Migrate Discovery & Assessment, DMS online migration SQL MI, Data Box 500TB offline transfer, App Service autoscale HttpQueueLength, API Management (rate limiting/JWT/dev portal), Service Bus Sessions + DLQ exactly-once ordered, Container Apps (scale-to-zero/sidecars), Front Door + Cosmos DB active-active, Key Vault Private Endpoint, Managed Identity zero-credential, Azure Blueprints subscription scaffolding
- Created course page: `learning/az-305/index.html` (7 modules, ~40h, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, 4 domain weight bars, 3 concept callouts — MG Policy cascade, Availability Zones vs Sets, Cosmos DB multi-master, 6-week study plan, top-4-mistakes box, AZ-305 vs AZ-104 comparison callout, related cert cards: AZ-104, AZ-500, SAA-C03, CKA)
- Added `az-305` entry to `data/courses.json` (v1.4.0, advanced, 7 modules, 40h, cloud category)
- Updated `certifications/microsoft.html`: AZ-305 tile now Live, hero → 5 live exams / 640+ questions, updated prose with AZ-305 domain weights, added AZ-305 FAQ item, removed "AZ-305 on the roadmap" from description
- Added `https://certquests.com/learning/az-305/` to `sitemap.xml`

### CompTIA CySA+ CS0-003 — Major rework (2026-04-14, v3.0.0)
- Bumped from v2.0.0 to v3.0.0
- Fixed severe B-answer bias that existed since v2.0.0: original 55 questions had A=3, B=40, C=12, D=0 (73% B!)
  - Converted 14 questions B→D (swapped options[1] and options[3])
  - Converted 10 questions B→A (swapped options[0] and options[1])
  - Final distribution after fixes: A=13, B=16, C=12, D=14 (from 55 questions)
- Added 10 new braindump-inspired scenario questions (cysa-056 to cysa-065):
  - cysa-056: SOAR playbook automation for phishing response (correct: D)
  - cysa-057: Volatility malfind RWX memory + PE headers = code injection (correct: A)
  - cysa-058: Wireshark display filter for TCP SYN scan (`tcp.flags == 0x002`) (correct: C)
  - cysa-059: CSPM for cloud misconfiguration detection across S3/EC2/IAM (correct: A)
  - cysa-060: STIX + TAXII for machine-readable threat intel sharing (correct: D)
  - cysa-061: Kubernetes Pod Security Admission 'restricted' profile (correct: C)
  - cysa-062: JWT alg:none attack bypassing signature verification (correct: A)
  - cysa-063: Purple team — real-time TTP sharing improves blue team detection (correct: D)
  - cysa-064: SQL injection via string concatenation → parameterized queries fix (correct: C)
  - cysa-065: EDR false positive triage — analyze patterns before tuning rules (correct: A)
- Final distribution 65 questions: A=17, B=16, C=15, D=17 (well balanced ≈25% each)
- Updated `data/index.json`: comptia-cysa question_count: 55 → 65

### AWS Security Specialty SCS-C02 (new + reworked 2026-04-14)
- Activated `aws-scs-c02` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Reworked `data/free/aws-scs-c02.json` to v2.0.0:
  - Fixed severe correct-answer bias: original had 58% B-answers (35/60); rebalanced to ~25% each (A=15, B=15, C=15, D=15)
  - Added `last_updated: "2026-04-14"` to meta
  - All 60 scenario-based questions across all 6 SCS-C02 domains validated and options reordered
  - Domain 1 (14%, ~9q): GuardDuty EventBridge→Lambda isolation, Amazon Detective investigation, CloudTrail console login investigation, DDoS Shield Advanced DRT engagement, S3 GetObject bulk detection, incident response forensic containment
  - Domain 2 (18%, ~11q): CloudTrail Lake SQL queries (18-month), S3 data events + CloudWatch metric filter, Config+StackSets+SecurityHub, EventBridge near-real-time SG detection, Config auto-remediation SSM, Audit Manager CIS framework, Security Hub FSBP scoring, IAM Access Analyzer continuous monitoring, VPC endpoint policy evaluation, CloudTrail HIPAA audit trail, IAM policy generation
  - Domain 3 (20%, ~12q): VPC gateway endpoint (S3 private access), WAF geo-restriction priority rules, Firewall Manager org-wide WAF, NACL stateless ephemeral ports, PCI DSS VPC segmentation, EC2 quarantine containment, Gateway Load Balancer inline IDS/IPS, WAF + Shield Advanced DRT, Control Tower preventive guardrails, CloudTrail legal hold (S3 Object Lock)
  - Domain 4 (16%, ~9q): SCP IP restriction (aws:ViaAWSService), Cross-account IAM role (both policies), IAM policy explicit deny, IAM Identity Center + SSO CLI, ABAC aws:PrincipalTag, STS credential revocation (TokenIssueTime), Cognito AdminUserGlobalSignOut, SCP disable-GuardDuty prevention, Permission boundary intersection
  - Domain 5 (18%, ~11q): Secrets Manager rotation, S3 SSE-KMS bucket policy enforcement, ACM Private CA, KMS encrypt-only pattern, RDS TLS enforce, ECR Inspector v2 + Lambda gate, CloudHSM vs KMS, S3 Object Lock Compliance WORM, DynamoDB client-side encryption, Cross-account Secrets Manager + KMS, EBS encryption by default + Config rule
  - Domain 6 (14%, ~8q): IAM Identity Center SSO CLI workflow, SCP organization trail protection, Audit Manager CIS evidence, SCP + S3 block public access org-level, IAM Access Analyzer policy generation, S3 Object Lock legal hold 5 years, KMS key policy Lambda addition, Control Tower guardrail types
- Created course page: `learning/aws-scs-c02/index.html` (7 modules, ~40h, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, domain weight bars, 3 concept callouts — KMS trap, SCP vs IAM, incident response contain-first, 6-week study plan, top-4-mistakes box, SCS-C02 vs SAA-C03 comparison callout, related cert cards)
- Added `aws-scs-c02` entry to `data/courses.json` (v1.4.0)
- Updated `certifications/aws.html`: SCS-C02 tile now Live, hero → 5 live exams / 340+ questions, updated prose to mention SCS-C02, added SCS-C02 domain weights section, added SCS-C02 FAQ item
- Added `https://certquests.com/learning/aws-scs-c02/` to `sitemap.xml`

### AWS SysOps Administrator Associate SOA-C02 (new 2026-04-14)
- Activated `aws-soa-c02` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/aws-soa-c02.json`: 60 scenario-based questions v1.0.0 across all 6 SOA-C02 domains
  - Domain 1 (20%, 12q): CloudWatch alarms (M-of-N, composite), Logs metric filters, Logs Insights queries, AWS Config managed rules + aggregator, EventBridge rules, CloudTrail fields + log integrity, SNS + EC2 auto-recovery, VPC Flow Logs, CloudWatch log cost optimization
  - Domain 2 (16%, 10q): Auto Scaling lifecycle hooks, Route 53 failover routing, RDS Multi-AZ failover + CNAME behavior, Aurora failover (hardcoded IP anti-pattern), AWS Backup cross-region, S3 CRR existing objects (Batch Operations), DR strategy RTO/RPO tradeoffs, ElastiCache TTL/eviction
  - Domain 3 (18%, 10q): CloudFormation drift detection, SSM Run Command + State Manager + Patch Manager + Session Manager, CloudFormation StackSets (automatic deployment), EC2 Image Builder, Elastic Beanstalk immutable deployment, Service Catalog template constraints, Config rule + SSM auto-remediation
  - Domain 4 (16%, 10q): GuardDuty EventBridge auto-remediation, Organizations SCPs for CloudTrail protection, Inspector v2 CVE scanning, Security Hub multi-account aggregation, KMS automatic rotation, Macie PII discovery, S3 Block Public Access account-level, IAM Access Analyzer findings, CloudTrail log integrity, WAF rate-based + geo rules
  - Domain 5 (18%, 11q): VPC peering missing routes, Transit Gateway for N-VPC hub-and-spoke, NAT Gateway for private subnet internet, NLB for UDP, CloudFront Origin Shield, cross-account IAM role, VPN dual tunnels, SSM Session Manager, PrivateLink, Direct Connect + VPN BGP failover, CloudFront OAC for S3
  - Domain 6 (12%, 7q): Standard RI 3-year all-upfront for max discount, Spot Instances with 2-min interruption notice, S3 Standard→IA→Glacier lifecycle, Cost Anomaly Detection ML-based alerts, Compute Optimizer right-sizing, inter-AZ data transfer cost, RDS Read Replicas for peak read traffic
- Created course page: `learning/aws-soa-c02/index.html` (7 modules, ~35h, Spotify + quiz CTAs top/mid/bottom, exam snapshot table, domain weight bars, top-4-mistakes box, 5-week study plan, SOA vs SAA comparison callout, related cert cards)
- Added `aws-soa-c02` entry to `data/courses.json` (v1.3.0)
- Updated `certifications/aws.html`: SOA-C02 tile now Live, hero → 4 live exams / 280+ questions, updated prose with SOA-C02 domain weights, added SOA-C02 FAQ item
- Added `https://certquests.com/learning/aws-soa-c02/` to `sitemap.xml`

### ServiceNow CSA — Certified System Administrator (reworked 2026-04-14)
- Reworked all 50 questions from flashcard format to proper 4-option MCQ (v2.0.0)
  - Fixed: all questions previously had option B as a very long correct answer with explanation embedded, other options as minimal distractors
  - Fixed meta `question_count: 0` → now correctly 60
  - All 60 questions now have 4 concise, plausible options; correct answer varies across A/B/C/D; explanations are separate from options
- Added 10 new questions (csa-051–060): field-level ACL security, performance debugging with Transaction Log, Software Asset Management, Flow Designer retry logic with Wait step, post-clone cleanup tasks, Virtual Agent NLU chatbot, Update Set conflict resolution, CI lifecycle/decommission best practice, gs.log() server-side scripting, HRSD onboarding playbooks
- Revised existing questions to cover advanced topics: GlideRecord patterns, GlideAjax for client-server communication, OAuth 2.0 Application Registry, cross-scope access controls, Async Business Rules for performance, upgrade conflict resolution, SLA task_sla table reporting

### AZ-500 — Azure Security Engineer Associate (new 2026-04-13 batch 3)
- Activated `az-500` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/az-500.json`: 60 scenario-based questions v1.0.0 across all 4 AZ-500 domains
  - Domain 1 (25-30%, 17q): Conditional Access, PIM (eligible/active assignments, access reviews), managed identities, RBAC custom roles, Identity Protection risk policies, B2B/B2C, Entra Connect, entitlement management, service principals
  - Domain 2 (20-25%, 14q): Azure Firewall Standard vs Premium (IDPS, TLS inspection), NSG service tags + ASG, DDoS Protection Basic vs Standard, Azure Bastion, Private Endpoints vs Service Endpoints, WAF on App Gateway vs Front Door, forced tunneling + UDR, Network Watcher
  - Domain 3 (20-25%, 14q): Azure Key Vault (soft-delete, purge protection, RBAC vs access policies, HSM), ADE vs SSE+CMK, SAS tokens, immutable storage, SQL TDE/DDM/Always Encrypted/Auditing/ATP, AKS security (RBAC, pod-managed identity, network policies), JIT VM access, container registry scanning
  - Domain 4 (25-30%, 15q): Defender for Cloud (Secure Score, JIT, regulatory compliance, Defender for Servers/Storage/SQL/Containers), Microsoft Sentinel (data connectors, KQL analytics rules, incidents, SOAR playbooks, threat hunting, UEBA, workbooks), Azure Monitor
- Created course page: `learning/az-500/index.html` (7 modules, ~40h, Spotify + quiz CTAs, exam snapshot table, domain weight bars, 3 concept callouts, 6-week study plan, top-4-mistakes box, related cert cards)
- Added `az-500` entry to `data/courses.json`
- Updated `certifications/microsoft.html`: AZ-500 tile now Live, hero → 4 live exams / 580+ questions, added AZ-500 domain weights to prose, added AZ-500 FAQ item
- Added `https://certquests.com/learning/az-500/` to `sitemap.xml`

### PCNSA — Palo Alto Networks Security Associate (reworked 2026-04-13 batch 3)
- Reworked all 50 questions from flashcard-style to proper 4-option MCQ format (v2.0.0)
- Fixed meta `question_count: 0` bug → now correctly 60
- Expanded from 50 → 60 questions; added 10 new questions (pcnsa-051–060): Layer 2 deployment, IPsec path monitoring, IKEv2 vs IKEv1, Vulnerability Protection action types, Kerberos SSO, AV vs WildFire profile roles, Policy-Based Forwarding, SAML SP/IdP roles, HA preemption, NAT policy zone matching
- All 13 PCNSA domain areas covered: App-ID, User-ID, Content-ID, zones, policy order, NAT, security profiles, WildFire, decryption, VPN/GlobalProtect, HA, Panorama, logging/certs/auth
- Updated `data/index.json`: `question_count: 60`

### CompTIA Linux+ XK0-005 (new 2026-04-13 batch 2)
- Activated `comptia-linux` pack in `data/index.json` (available: true, 60 questions)
- Created `data/free/comptia-linux.json`: 60 questions across all 4 Linux+ domains (system management, security, scripting/containers/automation, troubleshooting)
- Created course page: `learning/comptia-linux/index.html` (7 modules, ~35h, Spotify + quiz CTAs)
- Added to `data/courses.json`
- Updated `certifications/comptia.html`: Linux+ tile Live, CySA+ tile corrected (was showing Coming Soon despite being active), hero → 5 live exams / 415+ questions
- Added to `sitemap.xml`

### RHCSA (reworked 2026-04-13 batch 2)
- Fixed meta `question_count: 0` bug → now correctly 60
- Bumped version to v2.0.0
- Rewrote 15 questions that had one long explanation-style option — all 4 options now concise and plausible
- Added 10 new questions (rhcsa-051–060): Stratis, VDO, Podman, tuned-adm, autofs, LUKS, network bond, Cockpit, dnf module streams, rsync

### CKA — Certified Kubernetes Administrator (new 2026-04-13)
- Activated `cka` pack in `data/index.json` (was coming-soon, now available: true)
- Created `data/free/cka.json`: 60 scenario-based questions across all 5 CKA domains (cluster architecture, workloads, services/networking, storage, troubleshooting)
- Created course page: `learning/kubernetes-cka/index.html` (7 modules, ~35h, Spotify CTA)
- Added to `data/courses.json`
- Updated `certifications/linux-devops.html`: CKA tile now Live, hero stat → 4 live exams, 620+ questions
- Added to `sitemap.xml`

### AZ-104 — Azure Administrator (reworked 2026-04-13)
- Reworked all questions in `data/free/az-104.json` from 2-option flashcard to proper 4-option MCQ format (v2.0.0)
- Expanded from 35 → 60 questions across all AZ-104 domains (identity, networking, compute, storage, monitoring, governance)
- Activated `az-104` pack in `data/index.json` (was coming-soon, now available: true)
- Updated `certifications/microsoft.html`: AZ-104 tile now Live, hero stat → 2 live exams, 460+ questions
- Added `az-104-administrator` course entry to `data/courses.json`

### AWS SAA-C03 (new 2026-04-13)
- Activated `aws-saa-c03` pack in `data/index.json` (was coming-soon, now available: true)
- Created `data/free/aws-saa-c03.json`: 60 scenario-based questions across all 4 SAA-C03 domains
- Created course page: `learning/aws-saa-c03/index.html` (8 modules, ~40h)
- Added to `data/courses.json`
- Updated `certifications/aws.html`: SAA-C03 tile now Live, hero stat → 2 live exams, added SAA-C03 domain weights to prose
- Added to `sitemap.xml`

### Vault Associate v2.0.0 (reworked 2026-04-13)
- Reworked all 50 questions in `data/free/vault-002.json` from flashcard-style to proper MCQ format
- Fixed meta `question_count` (was 150, now correctly 50)
- Questions now have 4 concise balanced options, realistic distractors, and exam-style scenarios

### Google Cloud brand (new 2026-04-13)
- Added `google-cloud` brand to `data/index.json` with accent `#4285F4`
- SEO page: `certifications/google-cloud.html`
- Course page: `learning/gcp-ace/index.html`
- Coming-soon packs: gcp-pca, gcp-pde

### Docker DCA (new 2026-04-13)
- Added `docker-dca` pack to `linux-devops` brand in `data/index.json`
- Course page: `learning/docker-dca/index.html`
- Updated `certifications/linux-devops.html`: DCA tile now Live, hero stat → 3 live exams
- Splunk Core also reworked: 50 → 65 questions (version 2.0.0)

### Microsoft SC-900 Security, Compliance & Identity Fundamentals (new 2026-04-13)
- Activated `sc-900` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/sc-900.json`: 60 scenario-based questions v1.0.0 across all 4 SC-900 domains
  - Domain 1 (10-15%): Zero Trust (verify explicitly, least privilege, assume breach), CIA triad, defense-in-depth, shared responsibility, threat types, encryption
  - Domain 2 (25-30%): Entra ID, MFA, SSPR, passwordless (FIDO2/Windows Hello), SSO, managed identity, B2B/B2C, Conditional Access, PIM, Identity Protection, Access Reviews, Entra Connect, licensing P1/P2
  - Domain 3 (35-40%): Defender for Cloud (CSPM/CWP/Secure Score/JIT), Defender for Endpoint, Defender for Office 365, Defender for Cloud Apps (CASB), Defender for Identity, Defender XDR, Sentinel (SIEM/SOAR/playbooks/hunting/data connectors), Azure Firewall, NSG, WAF, DDoS Protection, Azure Bastion, Azure Key Vault
  - Domain 4 (25-30%): Purview Compliance Manager, compliance score, sensitivity labels, DLP, retention policies, Insider Risk Management, Purview Audit, eDiscovery, Communication Compliance, Information Barriers, Microsoft Priva, Intune MDM/MAM
- Created course page: `learning/sc-900/index.html` (7 modules, ~20h, Spotify + quiz CTAs, domain weight table, product→function cheat sheet, 3 concept callouts, 2-week study plan, related cert cards)
- Added `sc-900` entry to `data/courses.json`
- Updated `certifications/microsoft.html`: SC-900 tile now Live, hero → 3 live exams / 520+ questions, updated prose with SC-900 domain weights + cert path, added SC-900 FAQ item
- Added `https://certquests.com/learning/sc-900/` to `sitemap.xml`

### AWS Developer Associate DVA-C02 (new 2026-04-13)
- Activated `aws-dva-c02` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/aws-dva-c02.json`: 60 scenario-based questions v1.0.0 across all 4 DVA-C02 domains (Development 32%, Security 26%, Deployment 24%, Troubleshooting 18%)
  - Questions cover: Lambda lifecycle/concurrency/layers/VPC/retries, API Gateway proxy/authorizers/caching/WebSocket, DynamoDB design/GSI/optimistic-locking/streams/DAX, SQS/SNS/Kinesis/EventBridge, Cognito User Pools/Identity Pools, KMS envelope encryption, Secrets Manager, SSM Parameter Store, CodeDeploy traffic shifting, CodePipeline, CodeBuild buildspec, Elastic Beanstalk, CloudFormation change sets/custom resources/DeletionPolicy, SAM, CDK, X-Ray annotations/metadata, CloudWatch custom metrics, Step Functions, RDS Proxy, AppConfig feature flags
- Created course page: `learning/aws-dva-c02/index.html` (8 modules, ~35h, Spotify + quiz CTAs, domain weight table, 8 exam tip boxes, 6-week study plan, related cert cards)
- Added `aws-dva-c02` entry to `data/courses.json`
- Updated `certifications/aws.html`: DVA-C02 tile now Live, hero stat → 3 live exams / 220+ questions, updated prose with DVA-C02 domain weights, added DVA-C02 FAQ item
- Added `https://certquests.com/learning/aws-dva-c02/` to `sitemap.xml`

### CKAD — Certified Kubernetes Application Developer (new 2026-04-13)
- Activated `ckad` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/ckad.json`: 60 scenario-based questions v1.0.0 across all 5 CKAD domains
  - Application Design & Build (20%, ~12q): sidecar/ambassador/adapter patterns, init containers, Jobs/CronJobs, DaemonSets, StatefulSets, PVCs, emptyDir
  - Application Deployment (20%, ~12q): rolling updates (maxSurge/maxUnavailable), Helm (repo add/install/rollback), Kustomize overlays, rollout history/undo/pause/resume
  - Application Observability & Maintenance (15%, ~9q): liveness/readiness/startup probes, kubectl logs --previous, kubectl exec, OOMKilled debugging, kubectl top, Metrics Server
  - Application Environment, Config & Security (25%, ~15q): ConfigMap envFrom/volumeMount, Secret base64/secretKeyRef, ServiceAccount, SecurityContext, resource requests/limits, LimitRange, RBAC Role/RoleBinding, dry-run -o yaml
  - Services & Networking (20%, ~12q): ClusterIP/NodePort/LoadBalancer/ExternalName, Ingress path routing, NetworkPolicy, DNS naming, port-forward, kubectl cp, TLS secrets
- Enhanced course page: `learning/kubernetes-ckad/index.html` — added Spotify top CTA + inline mid-CTA, fixed quiz link to `/train.html?pack=ckad`, added quiz+Spotify buttons to bottom CTA, added CSS for `mid-cta`/`cta-buttons`/`course-cta-link.spotify`, added `60 practice questions` chip
- Updated `data/courses.json`: improved `kubernetes-ckad` description with specific CKAD topic coverage
- Updated `certifications/linux-devops.html`: CKAD tile now Live, hero → 5 live exams / 680+ questions, updated hero description, updated FAQ (CKA + CKAD both live)
- Added `https://certquests.com/learning/kubernetes-ckad/` to `sitemap.xml`

### CompTIA PenTest+ PT0-002 (new 2026-04-13)
- Activated `comptia-pentest` pack in `data/index.json` (was coming-soon, now available: true, question_count: 60)
- Created `data/free/comptia-pentest.json`: 60 scenario-based questions v1.0.0 across all 5 PT0-002 domains
  - Domain 1 Planning & Scoping (14%, ~8q): ROE, engagement types (black/white/gray box), authorization letter, scoping, STRIDE, PTES, PCI DSS, passive vs active recon
  - Domain 2 Information Gathering & Vulnerability Scanning (22%, ~13q): WHOIS, DNS zone transfer, Google dorking, Shodan, banner grabbing, Nmap (-sS/-sV/NSE), Nessus credentialed scans, enum4linux, LDAP, Nikto, theHarvester, certificate transparency
  - Domain 3 Attacks & Exploits (30%, ~18q): Metasploit (check/sessions/Meterpreter), SQLi (auth bypass/UNION), stored XSS, CSRF, path traversal, command injection, SSRF (cloud metadata), buffer overflow NOP sled, Pass-the-Hash, Kerberoasting, ARP spoofing MitM, WPA2 handshake cracking, evil twin AP, SUID privilege escalation, spear phishing (Gophish), tailgating, public S3 bucket, Hydra
  - Domain 4 Reporting & Communication (18%, ~11q): CVSS base score, executive summary, severity ratings, remediation recommendations, evidence handling, retesting, report structure, zero-day responsible disclosure, post-test cleanup
  - Domain 5 Tools & Code Analysis (16%, ~10q): Nmap -A flags, Metasploit search command, Burp Suite SSL pinning, Wireshark display filters, Netcat reverse shell, Python TCP scanner, Bash ping sweep, PowerShell base64 obfuscation, Gobuster -x flag, Mimikatz + WDigest mitigation
- Created course page: `learning/comptia-pentest-plus/index.html` (7 modules, ~35h, Spotify CTAs top/mid/bottom, exam snapshot table, domain weight bar chart, 2 concept callouts, 4-week study plan, top-3-mistakes box, related cert cards)
- Added `comptia-pentest-plus` entry to `data/courses.json`
- Updated `certifications/comptia.html`: PenTest+ tile now Live, hero → 6 live exams / 475+ questions, prose updated with PenTest+ domain weights, added PenTest+ FAQ item
- Added `https://certquests.com/learning/comptia-pentest-plus/` to `sitemap.xml`

**Article page conventions:**
- Path: `/news/<kebab-slug>/index.html`
- Must include: `og:type=article`, Twitter card, Article JSON-LD, BreadcrumbList JSON-LD, canonical link, breadcrumb nav, back-to-news footer link
- Sections: TL;DR box, intro, body with h2/h3, takeaways, tie-in to a relevant certification
- Reading time: 4–8 min (≈600–1500 words)

## Navigation
All pages share a consistent header (`web-header` class) and footer (`web-footer` class) with links to:
Home, Training, Learning, Tech News, Certifications, My Stats, Contact, Google Play

## Key Conventions
- No external JS frameworks — all vanilla ES6 modules
- No build process — files served as-is
- All user data stored in browser localStorage (no backend)
- Dark theme with blue accent (#3b82f6), background #06080f
- Responsive design with mobile-first approach
- All pages include SEO meta tags, Open Graph, Twitter Cards, and structured data
