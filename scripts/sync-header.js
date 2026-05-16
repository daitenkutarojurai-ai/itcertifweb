#!/usr/bin/env node
/**
 * scripts/sync-header.js — enforce one canonical <header class="web-header">
 * across every static HTML page on the site.
 *
 * Phase 5.1 (B2): top bar drifted across 7 variants between certifications/,
 * learning/, news/, careers/, compare/, root pages. This script picks one
 * canonical markup and applies it everywhere.
 *
 * Run: `node scripts/sync-header.js` (or `npm run sync-header`)
 *
 * Idempotent — re-running on already-synced files is a no-op.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const NAV = [
  { href: '/path.html',         label: 'Cert Quest', cls: 'web-header-link-new', pill: 'NEW', match: /^\/path\.html$/ },
  { href: '/certifications/',   label: 'Certifications',                                       match: /^\/certifications\// },
  { href: '/courses/',          label: 'Courses',                                              match: /^\/courses\// },
  { href: '/cheatsheets/',      label: 'Cheatsheets',                                          match: /^\/cheatsheets\// },
  { href: '/careers/',          label: 'Careers',                                              match: /^\/careers\// },
  { href: '/news/',             label: 'News',                                                 match: /^\/news\// },
];

function buildHeader(currentUrlPath) {
  const links = NAV.map(item => {
    const isCurrent = item.match.test(currentUrlPath);
    const aria = isCurrent ? ' aria-current="page"' : '';
    const cls  = item.cls ? ` class="${item.cls}"` : '';
    const pill = item.pill ? `<span class="web-header-link-pill">${item.pill}</span>` : '';
    return `      <a href="${item.href}"${cls}${aria}>${item.label}${pill}</a>`;
  }).join('\n');

  return [
    '  <header class="web-header">',
    '    <a href="/" class="web-header-logo">',
    '      <img src="/src/assets/icons/favicon-96.png?v=4" alt="CertQuests" class="web-header-bolt" width="32" height="32">',
    '      CertQuests',
    '    </a>',
    '    <nav class="web-header-links" aria-label="Main navigation">',
    links,
    '      <a href="https://play.google.com/store/apps/details?id=com.certquest.app" class="web-header-badge" target="_blank" rel="noopener">Google Play</a>',
    '    </nav>',
    '  </header>'
  ].join('\n');
}

function urlPathFor(filePath) {
  // /home/flammeur/webitcertif/learning/aws-saa-c03/index.html → /learning/aws-saa-c03/
  let rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  rel = '/' + rel;
  rel = rel.replace(/\/index\.html$/, '/');
  return rel;
}

function findHtmlFiles(dir, out = []) {
  const skip = new Set(['node_modules', '.git', '.agents', 'docs', 'audits', 'data', 'test']);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findHtmlFiles(full, out);
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Match the existing <header class="web-header"> block (non-greedy, single header,
// stops at the first </header> — safe because none of our headers nest).
const HEADER_RE = /[ \t]*<header class="web-header"[^>]*>[\s\S]*?<\/header>/;

function syncFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  if (!HEADER_RE.test(src)) return { file: filePath, status: 'skip-no-header' };

  const urlPath = urlPathFor(filePath);
  const newHeader = buildHeader(urlPath);
  const out = src.replace(HEADER_RE, newHeader);

  if (out === src) return { file: filePath, status: 'unchanged' };

  fs.writeFileSync(filePath, out, 'utf8');
  return { file: filePath, status: 'updated' };
}

function main() {
  const files = findHtmlFiles(ROOT);
  const counts = { updated: 0, unchanged: 0, 'skip-no-header': 0 };
  for (const f of files) {
    const r = syncFile(f);
    counts[r.status]++;
    if (process.env.VERBOSE && r.status !== 'unchanged') {
      console.log(r.status.padEnd(15), path.relative(ROOT, r.file));
    }
  }
  console.log('sync-header:', counts);
}

main();
