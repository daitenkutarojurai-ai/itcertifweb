#!/usr/bin/env node
/**
 * tools/audit-questions.mjs
 *
 * Scans every data/free/*.json question bank and scores each question
 * against the 4 anti-patterns documented in TODO.md "Rewrite all 2,520
 * questions":
 *
 *   1. length-tell:    correct answer is the longest option
 *   2. keyword-tell:   correct option contains a content word from the stem
 *                      that no distractor uses
 *   3. recall-only:    stem is short (< 18 words) → likely tests recall
 *                      instead of scenario reasoning
 *   4. under-tagged:   < 2 tags (no domain × sub-topic breakdown)
 *
 * Output:
 *   - audits/questions/_summary.md  one row per pack, totals, % offenders
 *   - audits/questions/<packId>.csv  per-question, worst-first
 *
 * Run: node tools/audit-questions.mjs
 * No deps. Pure Node ≥ 18.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS    = join(ROOT, 'data', 'free');
const OUT_DIR  = join(ROOT, 'audits', 'questions');
mkdirSync(OUT_DIR, { recursive: true });

/* ─── Stop-words: ignored for keyword-tell so "the/a/of/which" don't trigger ── */
const STOP = new Set([
  'a','an','the','of','to','in','on','at','by','for','with','and','or','is',
  'are','was','were','be','been','being','this','that','these','those','it',
  'its','his','her','their','our','your','my','as','if','than','then','so',
  'which','what','who','whom','where','when','why','how','will','would',
  'should','could','can','may','might','must','do','does','did','done',
  'has','have','had','not','no','yes','any','some','all','each','every',
  'most','best','better','correct','choose','select','from','about','more',
  'less','one','two','three','four','five','first','second','third','last',
  'following','above','below','over','under','between','within','without',
  'they','them','he','she','i','we','you','us','me','him','using','use',
  'used','uses'
]);

/* Tokeniser — extract content words longer than 2 chars, lower-cased,
   strip punctuation. Numbers + lowercased acronyms (aws, ec2, vpc) keep
   their full weight because that's exactly where keyword-tells live. */
function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}
function wordCount(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

/* ─── Signal scorers ─────────────────────────────────────────────────── */
function scoreLengthTell(q) {
  const opts = q.options || [];
  if (opts.length < 2) return { hit: false, ratio: 0 };
  const lens = opts.map(o => String(o || '').length);
  const correctLen = lens[q.correct] ?? 0;
  const maxLen = Math.max(...lens);
  const mean = lens.reduce((a,b)=>a+b,0) / lens.length;
  const ratio = mean > 0 ? correctLen / mean : 0;
  return {
    hit: correctLen === maxLen && correctLen > mean * 1.15,
    ratio: Number(ratio.toFixed(2))
  };
}

function scoreKeywordTell(q) {
  const opts = q.options || [];
  if (opts.length < 2) return { hit: false, sharedWord: '' };
  const stemSet = new Set(tokens(q.question));
  const correctTokens = new Set(tokens(opts[q.correct]));
  const distractorTokens = new Set();
  opts.forEach((o, i) => { if (i !== q.correct) tokens(o).forEach(t => distractorTokens.add(t)); });
  /* Word present in stem AND correct option, absent from every distractor */
  for (const t of correctTokens) {
    if (stemSet.has(t) && !distractorTokens.has(t)) {
      return { hit: true, sharedWord: t };
    }
  }
  return { hit: false, sharedWord: '' };
}

function scoreRecallOnly(q) {
  const wc = wordCount(q.question);
  return { hit: wc < 18, wordCount: wc };
}

function scoreUnderTagged(q) {
  const tags = Array.isArray(q.tags) ? q.tags.filter(Boolean) : [];
  return { hit: tags.length < 2, tagCount: tags.length };
}

/* ─── Aggregate score: how many anti-patterns this question hits ─────── */
function auditQuestion(q) {
  const len  = scoreLengthTell(q);
  const kw   = scoreKeywordTell(q);
  const rec  = scoreRecallOnly(q);
  const tag  = scoreUnderTagged(q);
  const hits = [len.hit, kw.hit, rec.hit, tag.hit].filter(Boolean).length;
  return { len, kw, rec, tag, hits };
}

/* ─── Per-pack audit ─────────────────────────────────────────────────── */
function auditPack(packPath) {
  const data = JSON.parse(readFileSync(packPath, 'utf-8'));
  const id = data.meta?.id || basename(packPath, '.json');
  const qs = data.questions || [];

  const rows = qs.map(q => {
    const a = auditQuestion(q);
    return {
      id: q.id,
      hits: a.hits,
      lengthTell:   a.len.hit  ? 'Y' : '',
      lengthRatio:  a.len.ratio,
      keywordTell:  a.kw.hit   ? 'Y' : '',
      keywordWord:  a.kw.sharedWord,
      recallOnly:   a.rec.hit  ? 'Y' : '',
      stemWords:    a.rec.wordCount,
      underTagged:  a.tag.hit  ? 'Y' : '',
      tagCount:     a.tag.tagCount,
      stemPreview:  String(q.question || '').slice(0, 80).replace(/\s+/g, ' ')
    };
  });

  rows.sort((a, b) => b.hits - a.hits || (b.lengthRatio - a.lengthRatio));
  return { id, total: qs.length, rows };
}

/* ─── CSV serialiser (RFC-4180-ish, double-quotes around fields) ─────── */
function csv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map(c => esc(r[c])).join(','));
  return lines.join('\n') + '\n';
}

/* ─── Run on every pack ──────────────────────────────────────────────── */
const summary = [];
const packs = readdirSync(PACKS).filter(f => f.endsWith('.json')).sort();
for (const f of packs) {
  const pack = auditPack(join(PACKS, f));
  const offenders = pack.rows.filter(r => r.hits > 0);
  const byHit = {
    lengthTell:  pack.rows.filter(r => r.lengthTell).length,
    keywordTell: pack.rows.filter(r => r.keywordTell).length,
    recallOnly:  pack.rows.filter(r => r.recallOnly).length,
    underTagged: pack.rows.filter(r => r.underTagged).length
  };
  writeFileSync(join(OUT_DIR, pack.id + '.csv'), csv(pack.rows));
  summary.push({ id: pack.id, total: pack.total, offenders: offenders.length, ...byHit });
}

/* ─── Markdown summary ───────────────────────────────────────────────── */
summary.sort((a, b) => (b.offenders / b.total) - (a.offenders / a.total));
const totalQs = summary.reduce((a, p) => a + p.total, 0);
const totalOff = summary.reduce((a, p) => a + p.offenders, 0);
const md = [
  '# Question-bank audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Packs scanned: **${summary.length}** · questions scanned: **${totalQs}** · flagged: **${totalOff}** (${((totalOff/totalQs)*100).toFixed(1)}%)`,
  '',
  '## Methodology',
  '',
  '4 signals per question (TODO.md "Rewrite all 2,520 questions"):',
  '',
  '| Signal | Hit when… |',
  '|---|---|',
  '| `lengthTell`  | correct option is the longest AND > 1.15× the mean option length |',
  '| `keywordTell` | correct option shares a content word with the stem that no distractor uses |',
  '| `recallOnly`  | stem has < 18 words (likely tests recall, not scenario reasoning) |',
  '| `underTagged` | question has < 2 tags |',
  '',
  '## Pack ranking (worst-first by flagged %)',
  '',
  '| Pack | Total | Flagged | % | length | keyword | recall | tags |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...summary.map(p => `| \`${p.id}\` | ${p.total} | ${p.offenders} | ${((p.offenders/p.total)*100).toFixed(0)}% | ${p.lengthTell} | ${p.keywordTell} | ${p.recallOnly} | ${p.underTagged} |`),
  '',
  '## Per-pack CSVs',
  '',
  'See `audits/questions/<packId>.csv` — sorted worst-to-best, ready for the rewrite team to start at the top.',
  ''
].join('\n');
writeFileSync(join(OUT_DIR, '_summary.md'), md);

console.log(`✓ Audited ${summary.length} packs (${totalQs} questions, ${totalOff} flagged).`);
console.log(`  Summary:  ${join(OUT_DIR, '_summary.md')}`);
console.log(`  Per-pack: ${OUT_DIR}/*.csv`);
