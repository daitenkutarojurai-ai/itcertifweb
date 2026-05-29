/**
 * test/games-content.test.js — validates every learning-path game payload
 * under data/games/<mode>/*.json (examples + authored cert content) against the
 * shape each renderer expects. One test per file. Durable gate so malformed
 * authored content (mine or a scheduled agent's) fails CI instead of shipping.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'data', 'games');
const FREE = path.join(__dirname, '..', 'data', 'free');
const MODES = [
  'match-pair', 'lightning-round', 'break-architecture', 'acronym-decoder',
  'true-false-blitz', 'scenario-builder', 'boss-fight',
];

function filesFor(mode) {
  const dir = path.join(GAMES, mode);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ f, full: path.join(dir, f) }));
}

for (const mode of MODES) {
  for (const { f, full } of filesFor(mode)) {
    test(`${mode}/${f} is a valid payload`, () => {
      const p = JSON.parse(fs.readFileSync(full, 'utf8'));
      assert.equal(p.mode, mode, 'mode matches its directory');
      assert.ok(typeof p.title === 'string' && p.title.length, 'has a title');
      assert.ok(p.data && typeof p.data === 'object', 'has a data object');
      const d = p.data;

      if (mode === 'match-pair') {
        assert.ok(Array.isArray(d.pairs) && d.pairs.length >= 3 && d.pairs.length <= 8, 'pairs 3-8');
        d.pairs.forEach((pr) => assert.ok(pr.left && pr.right, 'pair has left + right'));
      } else if (mode === 'lightning-round') {
        assert.ok(Array.isArray(d.questions) && d.questions.length >= 5, 'questions >= 5');
        d.questions.forEach((q) => {
          assert.ok(typeof q.q === 'string' && q.q.length, 'question has text');
          assert.ok(Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.length <= 4, 'choices 2-4');
          assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.choices.length, 'correctIndex in range');
        });
      } else if (mode === 'break-architecture') {
        assert.ok(Array.isArray(d.choices) && d.choices.length >= 2 && d.choices.length <= 4, 'choices 2-4');
        assert.ok(Number.isInteger(d.correctIndex) && d.correctIndex >= 0 && d.correctIndex < d.choices.length, 'correctIndex in range');
        const token = d.maskedToken || '__MASK__';
        assert.ok(typeof d.diagram === 'string' && d.diagram.includes(token), 'diagram contains the mask token');
      } else if (mode === 'acronym-decoder') {
        assert.ok(d.acronym, 'has an acronym');
        assert.ok(d.correct && d.correct.fullName && d.correct.useCase, 'correct has fullName + useCase');
        assert.ok(Array.isArray(d.distractors) && d.distractors.length >= 2 && d.distractors.length <= 4, 'distractors 2-4');
        d.distractors.forEach((x) => assert.ok(x.fullName && x.useCase, 'distractor has fullName + useCase'));
      } else if (mode === 'true-false-blitz') {
        assert.ok(Array.isArray(d.statements) && d.statements.length >= 5, 'statements >= 5');
        d.statements.forEach((s) => {
          assert.ok(typeof s.text === 'string' && s.text.length, 'statement has text');
          assert.equal(typeof s.isTrue, 'boolean', 'isTrue is boolean');
        });
      } else if (mode === 'scenario-builder') {
        assert.ok(Array.isArray(d.pool) && d.pool.length >= 3, 'pool >= 3');
        assert.ok(Array.isArray(d.correctOrder) && d.correctOrder.length >= 2, 'correctOrder >= 2');
        d.correctOrder.forEach((x) => assert.ok(d.pool.includes(x), `correctOrder item "${x}" is in pool`));
      } else if (mode === 'boss-fight') {
        assert.ok(Array.isArray(d.questionIds) && d.questionIds.length >= 5 && d.questionIds.length <= 20, 'questionIds 5-20');
        // Per-pack files (e.g. aws-cloud-practitioner.json) must reference real,
        // single-select questions in that pack — the boss UI is single-pick.
        const m = f.match(/^([a-z0-9-]+)\.json$/);
        const packId = m && m[1] !== 'example' ? m[1] : null;
        const packPath = packId ? path.join(FREE, packId + '.json') : null;
        if (packPath && fs.existsSync(packPath)) {
          const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
          const byId = new Map((pack.questions || []).map((q) => [String(q.id), q]));
          d.questionIds.forEach((id) => {
            const q = byId.get(String(id));
            assert.ok(q, `boss-fight id ${id} exists in pack ${packId}`);
            assert.ok(!Array.isArray(q.correct), `boss-fight id ${id} is single-select`);
          });
        }
      }
    });
  }
}
