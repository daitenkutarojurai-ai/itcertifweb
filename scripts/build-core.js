#!/usr/bin/env node
/**
 * scripts/build-core.js
 *
 * Concatenates the 7 small site-wide IIFE modules into one cq-core.js so
 * every page makes ONE request instead of seven. Order is preserved (it
 * matters: a11y → stats → avatar → hearts → cosmetics → daily → menu)
 * because some modules read each other on DOMContentLoaded.
 *
 * Each module is already wrapped in its own IIFE so variable collisions
 * are impossible. The bundle is plain JS — no minification, no source
 * maps — to keep this trivially debuggable. (Browsers gzip on the wire.)
 *
 * Run:  node scripts/build-core.js
 * Output: src/cq-core.js
 */
const fs = require('fs');
const path = require('path');

const ORDER = [
  'app-mode.js',
  'back-stack.js',
  'a11y.js',
  'stats.js',
  'avatar.js',
  'hearts.js',
  'cosmetics.js',
  'daily.js',
  'menu.js',
  'hud.js',
  'mascot-cheer.js',
  'sr.js'
];

const SRC = path.join(__dirname, '..', 'src');
const OUT = path.join(SRC, 'cq-core.js');

function main() {
  const banner = `/* CertQuests core bundle — generated ${new Date().toISOString()}
 *
 * This file is concatenated by scripts/build-core.js. Do not edit by hand;
 * edit the source modules in src/*.js and re-run \`npm run build-core\`.
 *
 * Modules (in load order):
 ${ORDER.map(f => ` *   - ${f}`).join('\n')}
 */
\n`;

  const parts = ORDER.map(file => {
    const full = path.join(SRC, file);
    if (!fs.existsSync(full)) throw new Error(`missing module: ${file}`);
    const body = fs.readFileSync(full, 'utf8');
    return `/* ════════ ${file} ════════ */\n${body}`;
  });

  const out = banner + parts.join('\n\n');
  fs.writeFileSync(OUT, out);

  const sizes = ORDER.map(f => fs.statSync(path.join(SRC, f)).size);
  const totalSrc = sizes.reduce((a, b) => a + b, 0);
  const bundleSize = fs.statSync(OUT).size;
  console.log(`Bundled ${ORDER.length} modules → ${OUT}`);
  console.log(`  source total: ${(totalSrc / 1024).toFixed(1)} KB`);
  console.log(`  bundle size:  ${(bundleSize / 1024).toFixed(1)} KB`);
  ORDER.forEach((f, i) => console.log(`    ${f.padEnd(15)} ${sizes[i].toString().padStart(6)} B`));
}

main();
