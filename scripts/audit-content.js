#!/usr/bin/env node
// Catches the recurring "page created but never wired into its index" gap that
// scheduled content agents leave behind. Checks:
//   1.  Every available pack in data/index.json has a path file or a _skipped entry.
//   1a. Every available pack's question bank file exists.
//   1b. Every question bank is structurally valid for the quiz runtime.
//   2.  Every careers/<slug>/ page is linked from careers/index.html.
//   3.  Every news/<slug>/ page is present in the data/news.json feed.
//   4.  Every learning/<slug>/ page is present in data/courses.json.
//   5.  Every public <dir>/index.html page is listed in sitemap.xml (site-wide).
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

  // reverse: a bank file on disk that no index.json entry registers is invisible.
  // KNOWN_UNREGISTERED holds superseded banks intentionally kept on disk but no
  // longer surfaced — each MUST carry a reason so the exemption stays auditable.
  const KNOWN_UNREGISTERED = {
    'ccnp-encor.json': 'superseded 50q placeholder for ENCOR 350-401; ccnp.json (101q) is now the live bank — safe to delete',
  };
  const registered = new Set(packs.map(p => p.file.replace('free/', '')));
  const unregistered = fs.readdirSync(r('data/free'))
    .filter(f => f.endsWith('.json') && !registered.has(f) && !KNOWN_UNREGISTERED[f]);
  report('Question banks in data/free/ not registered in data/index.json', unregistered);
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

// 2b. homepage headline counts must not OVERSTATE the catalog (false advertising).
// Understatement is fine (catalog grew); overstatement is a real claim defect.
{
  const idx = JSON.parse(read('data/index.json'));
  let packs = 0;
  idx.brands.forEach(b => (b.packs || []).forEach(p => { if (p.available !== false) packs++; }));
  let questions = 0;
  for (const f of fs.readdirSync(r('data/free')).filter(n => n.endsWith('.json'))) {
    const d = JSON.parse(read(`data/free/${f}`));
    questions += (Array.isArray(d) ? d : (d.questions || d.items || [])).length;
  }
  const home = read('index.html');
  const num = re => { const m = home.match(re); return m ? parseInt(m[1].replace(/,/g, ''), 10) : null; };
  const statedPacks = num(/data-target="(\d+)">[\d,]*<\/strong><span>Exam packs covered/);
  const statedQ = num(/data-target="(\d+)">[\d,]*<\/strong><span>Questions in the bank/);
  const over = [];
  if (statedPacks != null && statedPacks > packs) over.push(`homepage claims ${statedPacks} exam packs but only ${packs} are available`);
  if (statedQ != null && statedQ > questions) over.push(`homepage claims ${statedQ} questions but only ${questions} exist`);
  report('Homepage overstates the catalog', over);
}

// 3. news dirs → data/news.json
{
  const feed = JSON.parse(read('data/news.json'));
  const have = new Set(feed.articles.map(a => a.url.replace(/^\/news\//, '').replace(/\/$/, '')));
  const gap = dirsWithIndex('news').filter(d => !have.has(d));
  report('news/ pages not present in data/news.json feed', gap);
}

// 3b. every brand with available packs has a brand page + a hub link
{
  const idx = JSON.parse(read('data/index.json'));
  const hub = read('certifications/index.html');
  const noPage = [], noHubLink = [];
  for (const b of (idx.brands || [])) {
    const hasAvail = (b.packs || []).some(p => p.available !== false);
    if (!hasAvail) continue;
    if (!fs.existsSync(r(`certifications/${b.id}.html`))) noPage.push(b.id);
    else if (!hub.includes(`/certifications/${b.id}.html`)) noHubLink.push(b.id);
  }
  report('Brands with available packs but no certifications/<brand>.html page', noPage);
  report('Brand pages not linked from certifications/index.html', noHubLink);
}

// 4. learning dirs → data/courses.json
{
  const courses = read('data/courses.json');
  const gap = dirsWithIndex('learning').filter(d => !courses.includes(d));
  report('learning/ pages not present in data/courses.json', gap);
}

// 5. every public <dir>/index.html page → sitemap.xml (site-wide)
{
  const sitemap = read('sitemap.xml');
  const SKIP = new Set(['node_modules', 'test', 'scripts', 'src', 'functions', '.git', 'data', '.github']);
  const gap = [];
  const walk = dir => {
    for (const e of fs.readdirSync(r(dir), { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const rel = dir === '.' ? e.name : `${dir}/${e.name}`;
      if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
      if (fs.existsSync(r(`${rel}/index.html`)) && !sitemap.includes(`/${rel}/`)) gap.push(rel);
      walk(rel);
    }
  };
  walk('.');
  report('Pages missing from sitemap.xml', gap);
}

if (problems.length) {
  console.error('Content wiring audit FAILED:\n\n' + problems.join('\n\n'));
  process.exit(1);
}
console.log('Content audit passed — packs, careers, news, learning, and sitemap are in sync; all question banks valid.');
