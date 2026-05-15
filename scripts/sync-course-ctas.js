#!/usr/bin/env node
/**
 * scripts/sync-course-ctas.js — Phase 5.3.
 *
 * Course detail pages under /learning/<slug>/index.html only linked to
 * /train.html?pack=… (Practice the exam). They never linked to the
 * matching gamified Cert Quest path, even though the /courses/ index
 * already cross-linked both. This script closes the gap: for each
 * detail page, if the page's own `train.html?pack=PACKID` link points
 * at a pack that exists in `data/paths/_index.json`, inject a sibling
 * Cert Quest CTA into `.detail-cta-row`.
 *
 * Idempotent — re-running on already-synced files is a no-op.
 *
 * Run: `node scripts/sync-course-ctas.js` (or `npm run sync-course-ctas`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEARNING_DIR = path.join(ROOT, 'learning');
const PATHS_INDEX = path.join(ROOT, 'data', 'paths', '_index.json');
const DATA_INDEX = path.join(ROOT, 'data', 'index.json');

const pathPacks = new Set(
  JSON.parse(fs.readFileSync(PATHS_INDEX, 'utf8')).map(p => p.packId)
);

/* Alias map: data/index.json carries display IDs (e.g. aws-clf-c02) that
   point at a file basename — the path system keys on the file basename.
   Reuse the same resolution we use in cert-pack-ctas.js (Phase 5.10). */
const aliasMap = {};
try {
  const idx = JSON.parse(fs.readFileSync(DATA_INDEX, 'utf8'));
  (idx.brands || []).forEach(b => (b.packs || []).forEach(p => {
    const file = String(p.file || '').replace(/^free\//, '').replace(/\.json$/, '');
    if (file && file !== p.id) aliasMap[p.id] = file;
  }));
} catch (_) { /* missing — alias map stays empty */ }

/* Some learning pages use a marketing-style slug (e.g. az-104-administrator)
   that doesn't match the canonical packId (az-104). Add the slug-based
   fallbacks the gen-paths walker would also have hit. */
const slugFallbacks = [
  s => s.replace(/-administrator$/, ''),
  s => s.replace(/-fundamentals$/, ''),
  s => s.replace(/-pro$/, ''),
  s => s.replace(/-engineer$/, ''),
  s => s.replace(/^kubernetes-/, '')
];

function resolvePathPackId(displayId) {
  if (pathPacks.has(displayId)) return displayId;
  if (aliasMap[displayId] && pathPacks.has(aliasMap[displayId])) return aliasMap[displayId];
  for (const transform of slugFallbacks) {
    const candidate = transform(displayId);
    if (candidate !== displayId && pathPacks.has(candidate)) return candidate;
  }
  return null;
}

/* The Practice CTA pattern we anchor against and inject AFTER. */
const PRACTICE_RE = /<a\s+href="\/train\.html\?pack=([^"]+)"\s+class="detail-cta detail-cta-primary"[^>]*>[^<]*<\/a>/;
/* If a Cert Quest CTA already exists, skip to keep the script idempotent. */
const PATH_CTA_MARKER = 'cq:cert-quest-cta';

function rewriteFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  if (src.includes(PATH_CTA_MARKER)) return { file: filePath, status: 'unchanged' };
  const m = src.match(PRACTICE_RE);
  if (!m) return { file: filePath, status: 'no-practice-cta' };
  const trainPackId = m[1];
  /* The train link uses the display id (aws-clf-c02); the path link
     wants the canonical packId (aws-cloud-practitioner). Resolve with
     the same alias logic 5.10 uses on cert pages. */
  const pathPackId = resolvePathPackId(trainPackId)
    || resolvePathPackId(path.basename(path.dirname(filePath)));
  if (!pathPackId) return { file: filePath, status: 'no-matching-path', packId: trainPackId };

  const cta = `<a href="/path.html?pack=${pathPackId}" class="detail-cta detail-cta-secondary" data-marker="${PATH_CTA_MARKER}">&#x1F5FA;&#xFE0F; Open Cert Quest path</a>`;
  const out = src.replace(PRACTICE_RE, function (match) { return match + '\n        ' + cta; });
  fs.writeFileSync(filePath, out, 'utf8');
  return { file: filePath, status: 'updated', packId: pathPackId };
}

function main() {
  const dirs = fs.readdirSync(LEARNING_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(LEARNING_DIR, e.name, 'index.html'))
    .filter(fs.existsSync);
  const counts = { updated: 0, unchanged: 0, 'no-practice-cta': 0, 'no-matching-path': 0 };
  for (const f of dirs) {
    const r = rewriteFile(f);
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status === 'updated' || r.status === 'no-matching-path') {
      console.log(r.status.padEnd(18), path.relative(ROOT, r.file), r.packId ? '→ ' + r.packId : '');
    }
  }
  console.log('sync-course-ctas:', counts);
}

main();
