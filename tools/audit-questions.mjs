#!/usr/bin/env node
/**
 * tools/audit-questions.mjs
 *
 * Scans every data/free/*.json question bank and scores each question
 * against the 4 anti-patterns documented in TODO.md "Rewrite all 2,520
 * questions":
 *
 *   1. length-tell:    correct answer is the longest option
 *   2. keyword-tell:   correct option echoes a DISTINCTIVE stem word that no
 *                      distractor uses. "Distinctive" = the word is rare in the
 *                      pack (low document-frequency); common domain vocabulary
 *                      shared between a scenario and its answer (data / aws /
 *                      service / network …) is NOT a tell, so it's excluded by
 *                      DF-weighting. This keeps genuine giveaways and drops the
 *                      false positives that swamped the v1 heuristic.
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
  'used','uses',
  /* Near-stop function words that leaked through v1 and produced meaningless
     keyword-tells ("only", "same", "via" are not giveaways). */
  'only','same','both','via','into','onto','off','out','also','such','per',
  'plus','etc','either','neither','whether','across','among','toward',
  'towards','upon','near','far','default','new','old','only','via','only',
  'set','sets','make','makes','made','need','needs','want','wants','give',
  'gives','get','gets','put','puts','keep','keeps','run','runs','only'
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

/* Pack-level document frequency: how many questions contain each token
   anywhere (stem or any option). A word that recurs across the pack is common
   vocabulary; a word seen in only a question or two is distinctive — and a
   distinctive word shared by the stem and ONLY the correct option is the kind
   of giveaway a candidate can exploit without knowing the material. */
function buildDocFreq(qs) {
  const df = new Map();
  for (const q of qs) {
    const seen = new Set(tokens(q.question));
    (q.options || []).forEach(o => tokens(o).forEach(t => seen.add(t)));
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  return df;
}

function scoreKeywordTell(q, df, n) {
  const opts = q.options || [];
  if (opts.length < 2) return { hit: false, sharedWord: '', allWords: [] };
  // Distinctive = appears in at most ~10% of the pack (and never more than a
  // small absolute count). Common domain words (data/aws/service/network…)
  // have high DF and fall out here — that's the whole false-positive class.
  const dfMax = Math.max(2, Math.ceil(0.10 * (n || 1)));
  const stemSet = new Set(tokens(q.question));
  const correctTokens = new Set(tokens(opts[q.correct]));
  const distractorTokens = new Set();
  opts.forEach((o, i) => { if (i !== q.correct) tokens(o).forEach(t => distractorTokens.add(t)); });
  /* Collect every DISTINCTIVE word present in stem AND correct option, absent
     from every distractor. Reporting all of them (not just the first) avoids
     the whack-a-mole where fixing one leak exposes the next. */
  const all = [];
  for (const t of correctTokens) {
    // Pure numbers (admin distances, ports, IP octets, HTTP codes) shared
    // between a stem and its answer are reasoning data, not a vocabulary
    // giveaway — never a keyword tell.
    if (/^\d+$/.test(t)) continue;
    if (stemSet.has(t) && !distractorTokens.has(t) && (df.get(t) || 0) <= dfMax) all.push(t);
  }
  return {
    hit: all.length > 0,
    sharedWord: all[0] || '',
    allWords: all
  };
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
function auditQuestion(q, df, n) {
  const len  = scoreLengthTell(q);
  const kw   = scoreKeywordTell(q, df, n);
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
  const df = buildDocFreq(qs);

  const rows = qs.map(q => {
    const a = auditQuestion(q, df, qs.length);
    return {
      id: q.id,
      hits: a.hits,
      lengthTell:   a.len.hit  ? 'Y' : '',
      lengthRatio:  a.len.ratio,
      keywordTell:  a.kw.hit   ? 'Y' : '',
      keywordWord:  a.kw.sharedWord,
      keywordAll:   a.kw.allWords.join('|'),
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
  // Structural issues are reliable + directly actionable (a short stem or a
  // missing tag is unambiguous); the length/keyword "tells" are heuristic
  // hints that still carry false positives on good scenario questions.
  byHit.structural = pack.rows.filter(r => r.recallOnly || r.underTagged).length;
  // Answer-position bias: if correct answers cluster on one slot ("always pick
  // C"), that's an exploitable structural tell. posTop = share of the most
  // common correct slot (0.25 = perfectly balanced across 4 options).
  const posCounts = [0, 0, 0, 0, 0];
  for (const q of (JSON.parse(readFileSync(join(PACKS, f), 'utf8')).questions || [])) {
    if (typeof q.correct === 'number' && q.correct < 5) posCounts[q.correct]++;
  }
  byHit.posTop = pack.total ? Math.max(...posCounts) / pack.total : 0;
  writeFileSync(join(OUT_DIR, pack.id + '.csv'), csv(pack.rows));
  summary.push({ id: pack.id, total: pack.total, offenders: offenders.length, ...byHit });
}

/* ─── Markdown summary ───────────────────────────────────────────────── */
const totalQs = summary.reduce((a, p) => a + p.total, 0);
const totalOff = summary.reduce((a, p) => a + p.offenders, 0);
const totalStruct = summary.reduce((a, p) => a + p.structural, 0);
const totalLen = summary.reduce((a, p) => a + p.lengthTell, 0);
const totalKw  = summary.reduce((a, p) => a + p.keywordTell, 0);
// Rank by STRUCTURAL issues first (the actionable, false-positive-free signal),
// then by overall flagged % as a tiebreaker.
summary.sort((a, b) => (b.structural / b.total) - (a.structural / a.total)
  || (b.offenders / b.total) - (a.offenders / a.total));
const md = [
  '# Question-bank audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Packs scanned: **${summary.length}** · questions: **${totalQs}**`,
  '',
  `- **Structural issues: ${totalStruct}** (${((totalStruct/totalQs)*100).toFixed(1)}%) — recall-only stems + under-tagged. Reliable, no false positives, fix these first.`,
  `- Heuristic tells: lengthTell ${totalLen}, keywordTell ${totalKw} — review hints only.`,
  `- Any-signal flagged: ${totalOff} (${((totalOff/totalQs)*100).toFixed(1)}%).`,
  '',
  '## Methodology',
  '',
  '4 signals per question (TODO.md "Rewrite all 2,520 questions"). Split into',
  '**structural** (reliable, directly actionable) and **heuristic tells**',
  '(useful hints, but they still carry false positives on well-written scenario',
  'questions — the correct answer to a precise question is often legitimately the',
  'longest, and a scenario legitimately shares distinctive vocabulary with its',
  'answer, so do NOT auto-"fix" a tell without reading the question):',
  '',
  '| Signal | Kind | Hit when… |',
  '|---|---|---|',
  '| `recallOnly`  | structural | stem has < 18 words (tests recall, not scenario reasoning) |',
  '| `underTagged` | structural | question has < 2 tags (no domain × sub-topic) |',
  '| `lengthTell`  | heuristic  | correct option is the longest AND > 1.15× the mean option length |',
  '| `keywordTell` | heuristic  | correct option echoes a DISTINCTIVE stem word (low pack document-frequency, non-numeric) that no distractor uses |',
  '',
  '## Pack ranking (worst-first by structural issues)',
  '',
  '| Pack | Total | Struct | length | keyword | recall | tags |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...summary.map(p => `| \`${p.id}\` | ${p.total} | ${p.structural} | ${p.lengthTell} | ${p.keywordTell} | ${p.recallOnly} | ${p.underTagged} |`),
  '',
  '## Answer-position bias',
  '',
  'If correct answers cluster on one slot ("always pick C") a candidate can',
  'exploit it without reading. `posTop` = share of the most common correct slot',
  '(0.25 = balanced across 4 options). Packs above 0.40 — rebalance by reordering',
  'options (swap the correct option to an under-used slot; never edit the text):',
  '',
  ...(() => {
    const biased = summary.filter(p => p.total >= 10 && p.posTop > 0.40)
      .sort((a, b) => b.posTop - a.posTop);
    if (!biased.length) return ['_None — every pack with ≥10 questions is at or under 40% on its top slot._'];
    return ['| Pack | Total | posTop |', '|---|---:|---:|',
      ...biased.map(p => `| \`${p.id}\` | ${p.total} | ${(p.posTop * 100).toFixed(0)}% |`)];
  })(),
  '',
  '## Per-pack CSVs',
  '',
  'See `audits/questions/<packId>.csv` — sorted worst-to-best. Start at the top:',
  'fix `recallOnly` / `underTagged` rows first (unambiguous), then sanity-check',
  'the `lengthTell` / `keywordTell` hints by hand.',
  ''
].join('\n');
writeFileSync(join(OUT_DIR, '_summary.md'), md);

console.log(`✓ Audited ${summary.length} packs (${totalQs} questions, ${totalOff} flagged).`);
console.log(`  Summary:  ${join(OUT_DIR, '_summary.md')}`);
console.log(`  Per-pack: ${OUT_DIR}/*.csv`);
