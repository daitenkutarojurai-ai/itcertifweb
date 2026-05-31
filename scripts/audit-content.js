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

// 1b. every question bank is structurally valid for the quiz runtime
{
  const banks = fs.readdirSync(r('data/free')).filter(f => f.endsWith('.json'));
  const broken = [];
  for (const b of banks) {
    let d;
    try { d = JSON.parse(read(`data/free/${b}`)); }
    catch (e) { broken.push(`${b}: invalid JSON — ${e.message}`); continue; }
    const arr = Array.isArray(d) ? d : (d.questions || d.items || []);
    if (!arr.length) { broken.push(`${b}: no questions`); continue; }
    const errs = [];
    arr.forEach((q, i) => {
      const id = q.id || `#${i}`;
      const n = Array.isArray(q.options) ? q.options.length : 0;
      const inRange = c => Number.isInteger(c) && c >= 0 && c < n;
      if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${id}: empty question`);
      if (n < 2) errs.push(`${id}: <2 options`);
      if (Array.isArray(q.correct)) {
        if (!q.correct.length || !q.correct.every(inRange)) errs.push(`${id}: correct[] out of range`);
      } else if (!inRange(q.correct)) {
        errs.push(`${id}: correct out of range (opts=${n}, correct=${JSON.stringify(q.correct)})`);
      }
    });
    if (errs.length) broken.push(`${b}: ${errs.slice(0, 5).join('; ')}${errs.length > 5 ? ` (+${errs.length - 5})` : ''}`);
  }
  report('Question banks with structural errors', broken);
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
console.log('Content audit passed — packs, careers, news, sitemap are in sync and all question banks are valid.');
