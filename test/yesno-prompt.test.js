/**
 * test/yesno-prompt.test.js — Phase 5.13 helper tests.
 *
 * Verify the declarative synthesiser handles the supported patterns
 * cleanly and rejects everything else (scenario stems, recommendation
 * stems, negative-framed stems).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildYesNoPrompt, canYesNoify, isComplexStem } =
  require('../src/yesno-prompt.js');

test('Which X verb Y → "<option> verb Y."', () => {
  assert.equal(
    buildYesNoPrompt('Which protocol uses port 443?', 'HTTPS'),
    'HTTPS uses port 443.'
  );
  assert.equal(
    buildYesNoPrompt('Which AWS service is serverless?', 'AWS Lambda'),
    'AWS Lambda is serverless.'
  );
  assert.equal(
    buildYesNoPrompt('Which database engine has full SQL support?', 'PostgreSQL'),
    'PostgreSQL has full SQL support.'
  );
});

test('What is X → "X is <option>."', () => {
  assert.equal(
    buildYesNoPrompt('What is DynamoDB?', 'a NoSQL database service'),
    'DynamoDB is a NoSQL database service.'
  );
  assert.equal(
    buildYesNoPrompt('What is the maximum file size in S3?', '5 TB'),
    'The maximum file size in S3 is 5 TB.'
  );
});

test('What are X → "X are <option>."', () => {
  assert.equal(
    buildYesNoPrompt('What are the OSI layers?', 'seven'),
    'The OSI layers are seven.'
  );
});

test('What does X verb → "X <verb-3rd> <option>."', () => {
  assert.equal(
    buildYesNoPrompt('What does TLS provide?', 'confidentiality'),
    'TLS provides confidentiality.'
  );
});

test('Trailing period on option is stripped (no double dot)', () => {
  assert.equal(
    buildYesNoPrompt('Which protocol uses port 443?', 'HTTPS.'),
    'HTTPS uses port 443.'
  );
});

test('Rejects scenario stems (>160 chars)', () => {
  const stem = 'A retail website runs on EC2 instances behind an ALB. Server load surges without warning during flash sales and sits nearly idle overnight. Which compute strategy achieves this?';
  assert.equal(buildYesNoPrompt(stem, 'Lambda'), null);
  assert.equal(canYesNoify(stem), false);
  assert.equal(isComplexStem(stem), true);
});

test('Rejects "what should you do" recommendation stems', () => {
  assert.equal(
    buildYesNoPrompt('What should the engineer do to fix this?', 'Restart the service'),
    null
  );
  assert.equal(
    buildYesNoPrompt('Which action should you take to mitigate the risk?', 'Enable MFA'),
    null
  );
});

test('Rejects negative-framed stems', () => {
  assert.equal(
    buildYesNoPrompt('Which of these is NOT a valid AWS region?', 'us-east-1'),
    null
  );
  assert.equal(
    buildYesNoPrompt('All EXCEPT one are TCP-based protocols. Which?', 'UDP'),
    null
  );
});

test('Rejects multi-sentence stems even if short', () => {
  assert.equal(
    buildYesNoPrompt('A user complains. What is the cause?', 'Bad config'),
    null
  );
});

test('Rejects empty / falsy inputs', () => {
  assert.equal(buildYesNoPrompt('', 'x'), null);
  assert.equal(buildYesNoPrompt('Which X uses Y?', ''), null);
  assert.equal(buildYesNoPrompt(null, 'x'), null);
  assert.equal(buildYesNoPrompt('Which X uses Y?', null), null);
});

test('canYesNoify returns true only when a pattern fits', () => {
  assert.equal(canYesNoify('Which protocol uses port 443?'), true);
  assert.equal(canYesNoify('What is DynamoDB?'), true);
  // No supported pattern even though stem is short:
  assert.equal(canYesNoify('How many bytes in a kilobyte?'), false);
  assert.equal(canYesNoify('Where is the BIOS stored?'), false);
});

test('Synthesised prompt always ends in a period', () => {
  const stems = [
    ['Which protocol uses port 443?', 'HTTPS'],
    ['What is DynamoDB?', 'a NoSQL database service'],
  ];
  stems.forEach(([s, o]) => {
    const out = buildYesNoPrompt(s, o);
    assert.ok(out, `expected non-null for "${s}"`);
    assert.ok(out.endsWith('.'), `expected trailing period for "${out}"`);
  });
});

test('Affirmative vs negative options both produce clean declaratives', () => {
  // Pattern "Which protocol uses port 443?" with right answer "HTTPS"
  // and a wrong answer "FTP" should both synthesise cleanly.
  assert.equal(buildYesNoPrompt('Which protocol uses port 443?', 'HTTPS'), 'HTTPS uses port 443.');
  assert.equal(buildYesNoPrompt('Which protocol uses port 443?', 'FTP'),   'FTP uses port 443.');
});
