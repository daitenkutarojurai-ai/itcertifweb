#!/usr/bin/env node
// Catches the recurring "page created but never wired into its index" gap that
// scheduled content agents leave behind. Checks four linkages:
//   1. Every available pack in data/index.json has a path file or a _skipped entry.
//   2. Every careers/<slug>/ dir is referenced in careers/index.html.
//   3. Every news/<slug>/ dir is present in data/news.json.
//   4. Every careers/ + news/ page is listed in sitemap.xml.
// Exit 1 on any gap so it can gate a deploy. Run: node scripts/audit-content.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const r = p => path.join(ROOT, p);
const read = p => fs.readFileSync(r(p), 'utf8');
const dirsWithIndex = base =>
  fs.existsSync(r(base))
    ? fs.readdirSync(r(base)).filter(d => fs.existsSync(r(`${base}/${d}/index.html`)))
    : [];

const problems = [];
const report = (label, items) => {
  if (items.length) problems.push(`${label} (${items.length}):\n  ${items.join('\n  ')}`);
};

// 1. packs → path or skip
{
  const idx = JSON.parse(read('data/index.json'));
  const packs = [];
  JSON.stringify(idx, (k, v) => {
    if (v && v.id && v.file && String(v.file).includes('free/')) packs.push(v);
    return v;
  });
  const skip = JSON.parse(read('data/paths/_skipped.json'));
  const skipped = new Set((skip.reasons || []).map(x => x.packId));
  const havePath = new Set(
    fs.readdirSync(r('data/paths'))
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => f.replace('.json', ''))
  );
  // path/skip keys follow the free-bank basename, which may differ from the index id
  const basename = p => p.file.replace('free/', '').replace('.json', '');
  const gap = packs
    .filter(p => p.available !== false)
    .filter(p => !havePath.has(basename(p)) && !skipped.has(basename(p)))
    .map(p => `${p.id} (${p.file})`);
  report('Available packs with no learning path and no skip entry', gap);

  const missingBank = packs
    .filter(p => p.available !== false && !fs.existsSync(r(`data/${p.file}`)))
    .map(p => `${p.id} -> ${p.file}`);
  report('Available packs whose question bank file is missing', missingBank);
}

// 2. careers dirs → careers/index.html
{
  const html = read('careers/index.html');
  const gap = dirsWithIndex('careers').filter(d => !html.includes(`careers/${d}/`));
  report('careers/ pages not linked from careers/index.html', gap);
}

// 3. news dirs → data/news.json
{
  const feed = JSON.parse(read('data/news.json'));
  const have = new Set(feed.articles.map(a => a.url.replace(/^\/news\//, '').replace(/\/$/, '')));
  const gap = dirsWithIndex('news').filter(d => !have.has(d));
  report('news/ pages not present in data/news.json feed', gap);
}

// 4. careers + news pages → sitemap.xml
{
  const sitemap = read('sitemap.xml');
  const gap = [];
  for (const base of ['careers', 'news']) {
    for (const d of dirsWithIndex(base)) {
      if (!sitemap.includes(`/${base}/${d}/`)) gap.push(`${base}/${d}`);
    }
  }
  report('Pages missing from sitemap.xml', gap);
}

if (problems.length) {
  console.error('Content wiring audit FAILED:\n\n' + problems.join('\n\n'));
  process.exit(1);
}
console.log('Content wiring audit passed — packs, careers, news, and sitemap are all in sync.');
