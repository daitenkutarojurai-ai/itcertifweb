#!/usr/bin/env node
/**
 * scripts/inject-manifest.js — ensure every static HTML page links the PWA
 * manifest (and an apple-touch-icon) so the site is installable from any
 * entry page, not just the homepage.
 *
 * Audit 2026-06: only 141/315 pages linked manifest.json; careers/ (0/50)
 * and most of news/ lacked it, so a Google-deep-link visitor could never
 * install. This injects the link before </head> on any page missing it.
 *
 * Idempotent — pages that already link the manifest are skipped.
 * Run: `node scripts/inject-manifest.js`
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'docs', 'test', 'scripts', 'data', 'src']);

const MANIFEST_LINK = '  <link rel="manifest" href="/manifest.json" />';
const APPLE_ICON = '  <link rel="apple-touch-icon" sizes="180x180" href="/src/assets/icons/favicon-180.png?v=4" />';

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

let injected = 0, skipped = 0;
for (const file of walk(ROOT, [])) {
  let html = fs.readFileSync(file, 'utf8');
  if (!/<\/head>/i.test(html)) { skipped++; continue; }
  if (/rel="manifest"/i.test(html)) { skipped++; continue; }

  const add = [MANIFEST_LINK];
  if (!/rel="apple-touch-icon"/i.test(html)) add.push(APPLE_ICON);

  html = html.replace(/([ \t]*)<\/head>/i, add.join('\n') + '\n$1</head>');
  fs.writeFileSync(file, html);
  injected++;
}

console.log(`inject-manifest: ${injected} pages updated, ${skipped} already had it / skipped`);
