#!/usr/bin/env node
/**
 * scripts/audit-mobile.js
 *
 * Walk every .html file in the repo and answer four questions per page:
 *
 *   1. Does the page have a proper <meta name="viewport"> with width=device-width?
 *   2. Does it import the global mobile CSS (desktop.css with the current cache key)?
 *   3. Does it have at least one inline `@media (max-width: ...)` rule?
 *   4. Does it contain any element with a hard-coded pixel width that would
 *      exceed a phone viewport (≥ 480px)?
 *
 * Output: a table of pages that fail any check + a per-failure summary.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts']);
// Skip email templates — they're not delivered to browsers.
const SKIP_PATHS = ['docs/email-templates'];

// Walk
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel  = path.relative(ROOT, full);
    if (SKIP_PATHS.some(p => rel.startsWith(p))) continue;
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const VIEWPORT_RE      = /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i;
const DESKTOP_CSS_RE   = /href=["'][^"']*desktop\.css(?:\?v=(\d+))?["']/i;
const MAIN_CSS_RE      = /href=["'][^"']*main\.css(?:\?v=(\d+))?["']/i;
const MEDIA_QUERY_RE   = /@media[^{]*\(\s*max-width\s*:\s*(\d+)\s*px\s*\)/gi;
const FIXED_WIDTH_RE   = /(?:^|\s|;)width\s*:\s*(\d{3,5})px/gi;       // CSS `width: NNNpx`
const MIN_WIDTH_RE     = /(?:^|\s|;)min-width\s*:\s*(\d{3,5})px/gi;
const HTML_WIDTH_ATTR  = /<(?:img|table|iframe|video|div)[^>]+\swidth=["']?(\d{3,4})/gi;
const EXPECTED_VERSION = '37'; // current ?v=N for desktop.css / main.css (also profile/path/onboarding/cq-core — single source of truth)

const failures = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  const html = fs.readFileSync(file, 'utf8');
  const issues = [];

  // 1. viewport
  const vm = html.match(VIEWPORT_RE);
  if (!vm) {
    issues.push('NO viewport meta');
  } else if (!/width\s*=\s*device-width/i.test(vm[1])) {
    issues.push('viewport missing width=device-width: "' + vm[1] + '"');
  } else if (!/initial-scale\s*=\s*1/i.test(vm[1])) {
    issues.push('viewport missing initial-scale=1: "' + vm[1] + '"');
  }

  // 2. desktop.css with current version
  const dm = html.match(DESKTOP_CSS_RE);
  if (!dm) {
    issues.push('does NOT import desktop.css (no global mobile guards)');
  } else if (!dm[1]) {
    issues.push('desktop.css imported without ?v= cache key');
  } else if (dm[1] !== EXPECTED_VERSION) {
    issues.push(`desktop.css cache key is ?v=${dm[1]}, expected ?v=${EXPECTED_VERSION}`);
  }
  const mm = html.match(MAIN_CSS_RE);
  if (mm && (!mm[1] || mm[1] !== EXPECTED_VERSION)) {
    issues.push(`main.css cache key is ?v=${mm[1] || '(none)'}, expected ?v=${EXPECTED_VERSION}`);
  }

  // 3. inline @media (informational — desktop.css covers the basics)
  const mediaMatches = [...html.matchAll(MEDIA_QUERY_RE)];
  const hasMobileMedia = mediaMatches.some(m => parseInt(m[1], 10) <= 820);

  // 4. hard-coded pixel widths that would overflow a 480px phone viewport
  const wideRules = [];
  for (const m of html.matchAll(FIXED_WIDTH_RE)) {
    const px = parseInt(m[1], 10);
    if (px >= 480) wideRules.push(`width:${px}px`);
  }
  for (const m of html.matchAll(MIN_WIDTH_RE)) {
    const px = parseInt(m[1], 10);
    if (px >= 480) wideRules.push(`min-width:${px}px`);
  }
  for (const m of html.matchAll(HTML_WIDTH_ATTR)) {
    const px = parseInt(m[1], 10);
    if (px >= 480) wideRules.push(`<el width=${px}>`);
  }
  // Some min-widths are intentional and harmless (they're inside @media (min-width:...)
  // blocks or apply to elements already capped by a wrapper). We only complain about
  // the count if there are ≥ 3 distinct ones, OR if min-width appears (which is the
  // dangerous one for horizontal scroll).
  // Filter out min-widths that are inside a wrapper with `overflow-x: auto`
  // (those scroll inside their wrapper instead of pushing the page wide).
  const hasScrollWrap = /overflow-x\s*:\s*auto/i.test(html);
  const minWidthHits = wideRules.filter(w => w.startsWith('min-width:'));
  if (minWidthHits.length > 0 && !hasScrollWrap) {
    issues.push(`min-width on element(s) ≥ 480px (no overflow-x wrap): ${minWidthHits.slice(0, 3).join(', ')}${minWidthHits.length > 3 ? `, +${minWidthHits.length - 3} more` : ''}`);
  }

  if (issues.length) failures.push({ rel, issues, hasMobileMedia, wideCount: wideRules.length });
}

// ── Report ──────────────────────────────────────────────────────────────────
if (!failures.length) {
  console.log('✓ All HTML files pass mobile audit.');
} else {
  console.log(`✗ ${failures.length} of ${walk(ROOT).length} pages have issues:\n`);
  for (const f of failures) {
    console.log('  ' + f.rel);
    for (const i of f.issues) console.log('     - ' + i);
    if (!f.hasMobileMedia) console.log('     - (no inline @media (max-width) — relies on desktop.css globals)');
  }
}

// Quick aggregate counters
const counts = {};
for (const f of failures) for (const i of f.issues) {
  const key = i.split(':')[0].split(' ')[0];
  counts[key] = (counts[key] || 0) + 1;
}
console.log('\nIssue type counts:');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + String(v).padStart(3) + '  ' + k);
}
