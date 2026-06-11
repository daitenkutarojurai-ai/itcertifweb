#!/usr/bin/env node
/**
 * scripts/clamp-meta.js — tighten over-length <title> and meta description
 * across every static HTML page so SERP snippets aren't truncated mid-phrase.
 *
 * - Titles  > TITLE_MAX: keep a trailing brand segment ("… | CertQuests",
 *   "… · CertQuests", "… — CertQuests") and clamp the head at a WORD boundary
 *   so the whole title fits. No brand segment → clamp the whole title at a
 *   word boundary. Never cuts mid-word; never adds an ellipsis to a title.
 * - Descriptions > DESC_MAX: clamp at the last SENTENCE boundary (. ! ?) that
 *   fits, else the last word boundary, adding "…" only when a sentence wasn't
 *   reached. Mirrors what Google does, but under our control.
 *
 * Also rewrites the matching og:title / twitter:title / og:description /
 * twitter:description so social cards stay in sync.
 *
 * Run:  node scripts/clamp-meta.js          (apply)
 *       node scripts/clamp-meta.js --dry     (preview, no writes)
 *       node scripts/clamp-meta.js --dry --limit 20
 */
const fs = require('fs');
const path = require('path');

const TITLE_MAX = 60;
const DESC_MAX = 160;       // target; we clamp anything over DESC_TRIGGER
const DESC_TRIGGER = 165;

const DRY = process.argv.includes('--dry');
// Titles are OFF by default: mechanical word-boundary truncation leaves
// dangling cuts ("Worth It in — CertQuests"), and over-length titles aren't
// penalised (Google just truncates the display). They need per-page rewriting,
// not clamping. Opt in with --titles only if you've eyeballed the dry run.
const TITLES = process.argv.includes('--titles');
const limIdx = process.argv.indexOf('--limit');
const LIMIT = limIdx > -1 ? parseInt(process.argv[limIdx + 1], 10) : Infinity;

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'docs', 'test', 'scripts', 'data', 'src', '.agents']);

const BRAND_SEP = /\s*[|·—–]\s*CertQuests\s*$/;

function clampTitle(t) {
  if (t.length <= TITLE_MAX) return t;
  const m = t.match(BRAND_SEP);
  if (m) {
    const suffix = m[0].replace(/^\s*/, ' ');        // " | CertQuests"
    const head = t.slice(0, m.index).trimEnd();
    const budget = TITLE_MAX - suffix.length;
    if (budget > 12) {
      let clipped = head.slice(0, budget);
      clipped = clipped.replace(/\s+\S*$/, '').trimEnd().replace(/[\s,;:–—-]+$/, '');
      return clipped + suffix;
    }
    // suffix alone eats the budget — drop it, clamp the head
    return wordClamp(head, TITLE_MAX);
  }
  return wordClamp(t, TITLE_MAX);
}
function wordClamp(s, max) {
  if (s.length <= max) return s;
  let c = s.slice(0, max).replace(/\s+\S*$/, '').trimEnd();
  return c.replace(/[\s,;:–—-]+$/, '');
}

function clampDesc(d) {
  if (d.length <= DESC_TRIGGER) return d;
  const slice = d.slice(0, DESC_MAX + 1);
  // last sentence end within budget
  let best = -1;
  for (const re of [/[.!?](\s|$)/g]) {
    let m;
    while ((m = re.exec(slice)) !== null) { if (m.index < DESC_MAX) best = m.index; }
  }
  if (best >= 60) return d.slice(0, best + 1).trim();
  // else word boundary + ellipsis
  let c = d.slice(0, DESC_MAX).replace(/\s+\S*$/, '').trimEnd().replace(/[\s,;:–—-]+$/, '');
  return c + '…';
}

function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
// HTML-entity-decode just enough to measure real length; attrs in these files
// use &amp; / &quot; / &mdash; / &ndash; / &#39;
function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
      walk(path.join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.html')) out.push(path.join(dir, e.name));
  }
  return out;
}

let tFix = 0, dFix = 0, filesTouched = 0, previews = 0;
for (const file of walk(ROOT, [])) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;
  const rel = path.relative(ROOT, file);

  // ---- title ----
  const tm = TITLES ? html.match(/<title>([\s\S]*?)<\/title>/) : null;
  if (tm) {
    const raw = tm[1];
    const dec = decode(raw);
    const clamped = clampTitle(dec);
    if (clamped !== dec) {
      const encoded = escAttr(clamped).replace(/—/g, '&mdash;').replace(/–/g, '&ndash;');
      html = html.replace(tm[0], '<title>' + encoded + '</title>');
      // sync og/twitter title (only if they currently equal the old title)
      for (const prop of ['og:title', 'twitter:title']) {
        const re = new RegExp('(<meta (?:property|name)="' + prop + '" content=")([\\s\\S]*?)(")');
        const mm = html.match(re);
        if (mm && decode(mm[2]) === dec) html = html.replace(re, '$1' + encoded + '$3');
      }
      tFix++; changed = true;
      if (DRY && previews < LIMIT) { console.log(`T ${rel}\n  - ${dec}\n  + ${clamped}`); previews++; }
    }
  }

  // ---- description ----
  const dm = html.match(/<meta name="description" content="([\s\S]*?)"\s*\/?>/);
  if (dm) {
    const dec = decode(dm[1]);
    const clamped = clampDesc(dec);
    if (clamped !== dec) {
      const encoded = escAttr(clamped).replace(/—/g, '&mdash;').replace(/–/g, '&ndash;');
      html = html.replace(dm[0], dm[0].replace(dm[1], encoded));
      for (const prop of ['og:description', 'twitter:description']) {
        const re = new RegExp('(<meta (?:property|name)="' + prop + '" content=")([\\s\\S]*?)(")');
        const mm = html.match(re);
        if (mm && decode(mm[2]) === dec) html = html.replace(re, '$1' + encoded + '$3');
      }
      dFix++; changed = true;
      if (DRY && previews < LIMIT) { console.log(`D ${rel}\n  - ${dec}\n  + ${clamped}`); previews++; }
    }
  }

  if (changed) { filesTouched++; if (!DRY) fs.writeFileSync(file, html); }
}
console.log(`\n${DRY ? '[dry] ' : ''}titles clamped: ${tFix}, descriptions clamped: ${dFix}, files: ${filesTouched}`);
