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
