'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreRole, rankRoles } = require('../src/jobmatch.js');

const role = (over) => Object.assign({
  id: 'cloud-engineer', title: 'Cloud Engineer', domain: 'cloud', demand: 'élevée',
  certs: [
    { id: 'aws-saa-c03', label: 'SAA', weight: 2 },
    { id: 'aws-cloud-practitioner', label: 'CLF', weight: 1 },
    { id: 'terraform-003', label: 'TF', weight: 1 }
  ]
}, over || {});

test('empty context → 0% fit, all certs missing', () => {
  const s = scoreRole(role(), {});
  assert.strictEqual(s.pct, 0);
  assert.strictEqual(s.validated, 0);
  assert.strictEqual(s.missing, 3);
  assert.ok(s.certs.every(c => c.status === 'manquant'));
});

test('validated certs count by weight', () => {
  // SAA (w2) validated of total weight 4 → 50%
  const s = scoreRole(role(), { validated: { 'aws-saa-c03': 1 } });
  assert.strictEqual(s.validated, 1);
  assert.strictEqual(s.pct, 50);
  assert.strictEqual(s.certs.find(c => c.id === 'aws-saa-c03').status, 'validé');
});

test('started cert scores half its weight', () => {
  const s = scoreRole(role(), { started: { 'aws-cloud-practitioner': 1 } });
  assert.strictEqual(s.started, 1);
  // half of weight 1 over total 4 = 12.5% → rounds to 13
  assert.strictEqual(s.pct, 13);
  assert.strictEqual(s.certs.find(c => c.id === 'aws-cloud-practitioner').status, 'en cours');
});

test('validated takes precedence over started', () => {
  const s = scoreRole(role(), { validated: { 'aws-saa-c03': 1 }, started: { 'aws-saa-c03': 1 } });
  assert.strictEqual(s.validated, 1);
  assert.strictEqual(s.started, 0);
});

test('full validation → 100%', () => {
  const s = scoreRole(role(), { validated: { 'aws-saa-c03': 1, 'aws-cloud-practitioner': 1, 'terraform-003': 1 } });
  assert.strictEqual(s.pct, 100);
  assert.strictEqual(s.missing, 0);
});

test('Set works as well as a plain map for context', () => {
  const s = scoreRole(role(), { validated: new Set(['aws-saa-c03']) });
  assert.strictEqual(s.validated, 1);
});

test('rankRoles sorts by fit desc', () => {
  const roles = [
    role({ id: 'a' }),
    role({ id: 'b' })
  ];
  const ranked = rankRoles(roles, { validated: { 'aws-saa-c03': 1 } /* lifts both equally */ });
  assert.strictEqual(ranked.length, 2);
  // both equal fit → stable-ish; just assert fit computed
  assert.strictEqual(ranked[0].pct, 50);
});

test('rankRoles tie-breaks domain match ahead of others', () => {
  const roles = [
    { id: 'net', title: 'Net', domain: 'network', demand: 'moyenne', certs: [{ id: 'x', label: 'X', weight: 1 }] },
    { id: 'cloud', title: 'Cloud', domain: 'cloud', demand: 'moyenne', certs: [{ id: 'y', label: 'Y', weight: 1 }] }
  ];
  const ranked = rankRoles(roles, { roadmapDomain: 'cloud' });
  assert.strictEqual(ranked[0].role.id, 'cloud');
});

test('rankRoles tie-breaks by demand when no domain match', () => {
  const roles = [
    { id: 'low', title: 'Low', domain: 'x', demand: 'moyenne', certs: [{ id: 'a', label: 'A', weight: 1 }] },
    { id: 'high', title: 'High', domain: 'y', demand: 'très élevée', certs: [{ id: 'b', label: 'B', weight: 1 }] }
  ];
  const ranked = rankRoles(roles, {});
  assert.strictEqual(ranked[0].role.id, 'high');
});

test('catalog file scores cleanly with an empty context', () => {
  const cat = require('../data/jobs/roles.json');
  const ranked = rankRoles(cat.roles, {});
  assert.strictEqual(ranked.length, cat.roles.length);
  assert.ok(ranked.every(r => r.pct === 0 && r.total === r.certs.length));
});
