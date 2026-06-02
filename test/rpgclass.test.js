'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CLASSES, classById, classByDomain, tierIndex, titleFor, nextTierAt } = require('../src/rpgclass.js');

test('there are 6 classes, each well-formed with 5 title tiers', () => {
  assert.strictEqual(CLASSES.length, 6);
  CLASSES.forEach((c) => {
    assert.ok(c.id && c.name && c.emoji && c.accent && c.domain && c.blurb);
    assert.strictEqual(c.titles.length, 5, c.id + ' needs 5 titles');
    assert.ok(Array.isArray(c.certs) && c.certs.length >= 1);
  });
});

test('class domains line up with the roadmap domains', () => {
  ['cloud', 'devops', 'security', 'network', 'linux', 'data'].forEach((d) => {
    assert.ok(classByDomain(d), 'missing class for domain ' + d);
  });
});

test('classById / classByDomain return null on miss', () => {
  assert.strictEqual(classById('nope'), null);
  assert.strictEqual(classByDomain('nope'), null);
});

test('tierIndex maps level to the right tier (0..4)', () => {
  assert.strictEqual(tierIndex(1), 0);
  assert.strictEqual(tierIndex(4), 0);
  assert.strictEqual(tierIndex(5), 1);
  assert.strictEqual(tierIndex(14), 1);
  assert.strictEqual(tierIndex(15), 2);
  assert.strictEqual(tierIndex(29), 2);
  assert.strictEqual(tierIndex(30), 3);
  assert.strictEqual(tierIndex(49), 3);
  assert.strictEqual(tierIndex(50), 4);
  assert.strictEqual(tierIndex(999), 4);
});

test('tierIndex is safe for level 0 / undefined', () => {
  assert.strictEqual(tierIndex(0), 0);
  assert.strictEqual(tierIndex(undefined), 0);
});

test('titleFor advances the title with level', () => {
  const cloud = classById('cloud');
  assert.strictEqual(titleFor(cloud, 1), 'Cloud Initiate');
  assert.strictEqual(titleFor(cloud, 5), 'Cloud Engineer');
  assert.strictEqual(titleFor(cloud, 20), 'Cloud Architect');
  assert.strictEqual(titleFor(cloud, 35), 'Cloud Overlord');
  assert.strictEqual(titleFor(cloud, 60), 'Cloud Sage');
  assert.strictEqual(titleFor(null, 10), '');
});

test('nextTierAt returns the next threshold, null at max', () => {
  assert.strictEqual(nextTierAt(1), 5);
  assert.strictEqual(nextTierAt(5), 15);
  assert.strictEqual(nextTierAt(15), 30);
  assert.strictEqual(nextTierAt(30), 50);
  assert.strictEqual(nextTierAt(50), null);
  assert.strictEqual(nextTierAt(80), null);
});

test('class signature certs reference plausible pack ids (lowercase-dashed)', () => {
  CLASSES.forEach((c) => c.certs.forEach((id) => {
    assert.match(id, /^[a-z0-9][a-z0-9-]*$/, c.id + ' has odd cert id ' + id);
  }));
});
