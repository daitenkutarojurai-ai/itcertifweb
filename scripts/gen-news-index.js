#!/usr/bin/env node
/**
 * scripts/gen-news-index.js
 *
 * Pre-renders the article list of news/index.html from data/news.json so
 * every /news/<slug>/ page has a crawlable static link. Before this, the
 * list existed only after the inline script fetched news.json — the static
 * HTML linked to none of the ~120 articles, leaving the site's largest
 * content section orphaned for crawlers that don't execute JS (and slow to
 * be discovered by Googlebot, which renders in a deferred second pass).
 *
 * The markup mirrors renderArticles() in news/index.html exactly, so the
 * client-side render that replaces it on load causes no visual change.
 * Idempotent: rewrites only the region between the two markers below.
 *
 * Runs in the Pages deploy job, so the static list can't go stale when
 * an article is added to data/news.json without re-running this script.
 *
 * Run: `node scripts/gen-news-index.js` (or `npm run gen-news-index`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NEWS_JSON = path.join(ROOT, 'data', 'news.json');
const PAGE = path.join(ROOT, 'news', 'index.html');

const START = '<!-- news-list:static:start -->';
const END = '<!-- news-list:static:end -->';

// Keep in sync with CATEGORY_COLORS in news/index.html.
const CATEGORY_COLORS = {
  devops: '#a855f7',
  security: '#f43f5e',
  cloud: '#3b82f6',
  networking: '#10b981',
  ai: '#22d3ee',
  certs: '#f59e0b',
  other: '#7c90ae',
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function renderItem(a) {
  const id = (a.category || 'other').toLowerCase();
  const label = a.categoryLabel || (id.charAt(0).toUpperCase() + id.slice(1));
  const color = CATEGORY_COLORS[id] || CATEGORY_COLORS.other;
  const href = a.url || ('/news/' + encodeURIComponent(a.id) + '/');
  const featured = a.featured ? '<span class="news-source" style="color:var(--accent-news);font-weight:700">★ Featured</span>' : '';
  return `      <a href="${esc(href)}" class="news-item">
        <div class="news-header">
          <span class="news-date">${esc(formatDate(a.date))}</span>
          <span class="news-source">${esc(label)}</span>
          ${featured}
        </div>
        <h2>${esc(a.title)}</h2>
        <p>${esc(a.excerpt || '')}</p>
        <div class="news-tags">
          <span class="news-tag" style="color:${esc(color)}">${esc(label)}</span>
        </div>
      </a>`;
}

function main() {
  const data = JSON.parse(fs.readFileSync(NEWS_JSON, 'utf8'));
  const articles = (data.articles || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const block = `${START}\n${articles.map(renderItem).join('\n')}\n      ${END}`;

  let html = fs.readFileSync(PAGE, 'utf8');
  if (html.includes(START) && html.includes(END)) {
    html = html.slice(0, html.indexOf(START)) + block + html.slice(html.indexOf(END) + END.length);
  } else {
    const anchor = /(<div id="news-list" class="news-list">)\s*<!-- Populated by script -->/;
    if (!anchor.test(html)) {
      console.error('gen-news-index: could not find the #news-list container in news/index.html');
      process.exit(1);
    }
    html = html.replace(anchor, `$1\n      ${block}`);
  }
  fs.writeFileSync(PAGE, html, 'utf8');
  console.log(`gen-news-index: pre-rendered ${articles.length} articles into news/index.html`);
}

main();
