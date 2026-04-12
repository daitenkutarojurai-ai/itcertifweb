# Changes Recap

Running log of changes applied by Claude sessions. Newest at the top.

---

## 2026-04-12 — News launch + security & SEO pass

### Task 1 — New tech/devops news article (first post in the rotation)

- **Created:** `news/left-pad-broke-the-internet/index.html` — full article *"11 Lines of Code Broke the Internet — The npm left-pad Incident"*.
  - ~1,200 words, 6-min read, DevOps category
  - Full SEO metadata: canonical, Open Graph (`og:type=article`), Twitter Card, `article:published_time`, `article:author`, `article:tag`
  - **Two JSON-LD blocks:** `NewsArticle` structured data + `BreadcrumbList`
  - TL;DR summary box, code block, takeaways section, certification tie-in, back-to-news link
- **Updated:** `data/news.json`
  - Added the new article as `featured: true`
  - Bumped `version` → `1.1.0`, `lastUpdated` → `2026-04-12`
  - Added `rotationNote` field pointing readers to the posting cycle in `CLAUDE.md`
- **Documented** the full daily rotation in `CLAUDE.md` under the new **"News posting cycle"** section so subsequent sessions pick up the next topic (next up: *"One typo took down Facebook for 6 hours" — BGP 2021*).

### Task 2 — Security vulnerabilities

1. **XSS in `news/index.html`** — the news renderer was string-concatenating `article.title`, `article.excerpt`, `article.url`, etc. into `innerHTML`. While the JSON source is currently trusted, any future user-editable source (or a compromised registry mirror) would turn this into a stored XSS.
   - Rewrote both `renderFeatured()` and `renderCard()` to use `createElement` + `textContent` only — no `innerHTML` on data fields.
   - Added a `safeUrl()` sanitizer that rejects `javascript:`, `data:`, `vbscript:`, control characters, and anything that isn't an http(s)/mailto/tel/relative URL.
   - Added an `ALLOWED_CATEGORIES` allowlist so only whitelisted category strings end up in `className` (prevents class-name injection).
2. **XSS + CSS injection in `learning/index.html`** — same root cause, plus the `vendorColor` field was being injected into inline `style="color:..."` without validation (CSS injection / URL smuggling).
   - Rewrote `renderCard()` to build DOM nodes with `textContent` and per-property `.style` assignments.
   - Added `safeColor()` (hex-only regex: `/^#[0-9A-Fa-f]{3,8}$/`) and `safeDifficulty()` + `safeCategory()` allowlists.
3. **Network hygiene** — both `fetch()` calls now pass `{ credentials: 'omit', cache: 'no-cache' }` and explicitly check `response.ok` before parsing JSON.

### Task 3 — Bugs

1. **`contact.html` honeypot typo** — the honeypot container had `tab-index: -1` in CSS (an invalid CSS property; `tabindex` is an HTML attribute, not a CSS property). The honeypot input was still keyboard-reachable, which (a) hurt accessibility and (b) weakened the anti-bot heuristic.
   - Removed the invalid `tab-index: -1` CSS rule.
   - Added `pointer-events: none` to the honeypot container so it stays fully hidden.
   - The inline `tabindex="-1"` attribute on the actual `<input>` remains in place.
2. **News list sort order** — articles were rendered in JSON-file order. Added a `date`-descending sort in the news page so the newest post is always first even if editors append new entries to the bottom of the JSON.
3. **Empty-articles state** — the old code would show nothing if `data.articles` was `[]`; it now shows the "articles being prepared" message.

### Task 4 — SEO optimisation (search engines + AI answers)

- New article page ships with `NewsArticle` + `BreadcrumbList` structured data, which is exactly what Google News/Discover and AI answer engines (Perplexity, ChatGPT Search, Google AI Overviews) consume when deciding whether to cite a source.
- **`sitemap.xml`** now lists `https://certquests.com/news/left-pad-broke-the-internet/` with `lastmod=2026-04-12`, and the `/news/` root `lastmod` is bumped so crawlers re-scan.
- Article uses `og:type=article` (not `website`) — required for Facebook/LinkedIn/Mastodon rich cards on individual posts.
- Canonical tag points to the trailing-slash URL (matches the directory-style path so there's only one canonical form).
- Descriptive `<title>`, focused `<meta name="description">`, and a targeted `keywords` list (npm, left-pad, supply chain, DevOps).

### Task 5 — Website optimisation / nice features

- **Date-descending sort** on the news list — editors can append to `news.json` in any order.
- **Defensive JSON loading** — both the news and learning pages now gracefully handle:
  - Non-200 responses (`!r.ok`)
  - Missing / non-array `articles` or `courses` fields
  - Empty arrays (friendly empty state)
- **URL/color/class sanitisers** are reusable patterns for any future data-driven page.

### Task 6 — Repository meta

- **Updated `CLAUDE.md`:**
  - Added the `news/<slug>/index.html` pattern to the project-structure tree
  - Rewrote the "Adding Content → new news article" workflow to document the slug-directory pattern
  - Added a full **"News posting cycle"** section with the topic catalog and next-up marker
- **Created this `CHANGES.md`** to serve as a running recap of session changes.

---

## How the news rotation works

1. Read the **Next topic to post** line in `CLAUDE.md`.
2. Create `news/<kebab-slug>/index.html` following the template of `left-pad-broke-the-internet/index.html`.
3. Prepend the new entry to `data/news.json` with `featured: true` and demote the previous featured article (remove its `featured` key or set to `false`).
4. Append the new article URL to `sitemap.xml`, bump `/news/` lastmod.
5. In `CLAUDE.md`, mark the posted topic in-place (e.g. "— posted YYYY-MM-DD") and update the **Next topic to post** line.
6. Append a section to `CHANGES.md` documenting what was added.
