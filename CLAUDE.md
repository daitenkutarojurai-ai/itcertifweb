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

## Certification Catalog (as of 2026-04-13)

Active question packs (`available: true` in `data/index.json`):
| Pack ID | File | Questions |
|---|---|---|
| ccna | free/ccna.json | 100 |
| aws-clf-c02 | free/aws-cloud-practitioner.json | 100 |
| az-900 | free/az-900.json | 100 |
| comptia-a-plus | free/comptia-a-plus.json | 100 |
| comptia-network-plus | free/comptia-network-plus.json | 100 |
| comptia-security-plus | free/comptia-security-plus.json | 100 |
| **comptia-cysa** | free/comptia-cysa.json | **55** (reworked 2026-04-13) |
| terraform-003 | free/terraform-003.json | 150 |
| **vault-002** | free/vault-002.json | **50** (reworked 2026-04-13, v2.0.0 — proper MCQ format) |
| nse4 | free/nse4.json | 170 |
| pcnsa | free/pcnsa.json | 50 |
| rhcsa | free/rhcsa.json | 50 |
| servicenow-csa | free/servicenow-csa.json | 50 |
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
