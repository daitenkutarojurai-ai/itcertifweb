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
│   └── free/               # Question pack JSON files (18 certification packs)
│
├── certifications/         # Static SEO landing pages per vendor (10 HTML files)
├── learning/               # Learning paths section (courses on certifications)
│   └── index.html          # Main learning page — loads from data/courses.json
├── news/                   # Tech news section (DevOps/tech coverage)
│   └── index.html          # Main news page — loads from data/news.json
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
- **New news article:** Add entry to `data/news.json` — auto-rendered by news page

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
