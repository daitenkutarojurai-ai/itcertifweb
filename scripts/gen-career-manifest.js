#!/usr/bin/env node
/**
 * scripts/gen-career-manifest.js — Phase 6.5.
 *
 * Walks data/career-paths/*.json and writes a single manifest at
 * data/career-paths/_index.json. The /career-path/ SPA fetches that
 * manifest to populate the dropdowns (no need for the SPA to know
 * which archetype files exist — kept loosely coupled).
 *
 * Run: `node scripts/gen-career-manifest.js` (or `npm run gen-career`).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'career-paths');
const OUT = path.join(DATA_DIR, '_index.json');

function main() {
  const items = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && f !== '_index.json')
    .sort()
    .map(f => {
      const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      return {
        id:           d.id,
        label:        d.label,
        domain:       d.domain,
        situation:    d.situation,
        totalMonths:  d.totalMonths,
        salaryStart:  d.salaryStart,
        salaryEnd:    d.salaryEnd,
        tldr:         d.tldr,
        steps:        d.steps.length,
        file:         f
      };
    });
  fs.writeFileSync(OUT, JSON.stringify(items, null, 2), 'utf8');
  console.log(`gen-career: ${items.length} archetypes → ${path.relative(ROOT, OUT)}`);
}
main();
