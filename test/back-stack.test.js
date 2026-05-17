/**
 * test/back-stack.test.js — characterization tests for src/back-stack.js
 *
 * The back-stack underlies hardware-back behaviour on Android (Capacitor)
 * and browser-back behaviour on the web. Bugs here mean the user gets
 * stranded with "back goes nowhere" or the wrong modal closing — both
 * feel like the app is broken. Pin the contract.
 *
 * Run:  node --test test/back-stack.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { createBackStack } = require('../src/back-stack.js');

function makeFakeEnv() {
  const historyStates = [{}]; // initial state
  const listeners = { popstate: [] };
  const fakeHistory = {
    pushState(state) { historyStates.push(state); },
    back() {
      if (historyStates.length > 1) {
        historyStates.pop();
        // Fire popstate synchronously like browsers do (Capacitor inclusive).
        listeners.popstate.forEach((fn) => fn());
      }
    }
  };
  const fakeWindow = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    console: { error() {} }
  };
  return { fakeWindow, fakeHistory, historyStates, listeners };
}

/* ──────────────────────── push / depth ──────────────────────── */

test('push increments depth and returns a non-null id', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  assert.strictEqual(bs.depth(), 0);
  const id = bs.push(() => {});
  assert.notStrictEqual(id, null);
  assert.strictEqual(bs.depth(), 1);
});

test('push with a non-function is rejected (returns null, depth unchanged)', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  assert.strictEqual(bs.push(null), null);
  assert.strictEqual(bs.push('not-a-fn'), null);
  assert.strictEqual(bs.depth(), 0);
});

test('push records a history entry', () => {
  const { fakeWindow, fakeHistory, historyStates } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  bs.push(() => {});
  assert.strictEqual(historyStates.length, 2);
  assert.deepStrictEqual(historyStates[1], { cqBack: 1 });
});

/* ──────────────────────── popstate (hardware back) ──────────────────────── */

test('hardware back calls closeFn with fromBack=true and pops the stack', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  let received = null;
  bs.push((fromBack) => { received = fromBack; });
  fakeHistory.back(); // simulates hardware back
  assert.strictEqual(received, true);
  assert.strictEqual(bs.depth(), 0);
});

test('hardware back with empty stack is a no-op (does not throw)', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  // Empty stack: popstate handler should bail safely.
  assert.doesNotThrow(() => bs._onPopstate());
});

test('hardware back closes only the topmost layer when two are stacked', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  const log = [];
  bs.push(() => log.push('drawer'));
  bs.push(() => log.push('sheet'));
  assert.strictEqual(bs.depth(), 2);
  fakeHistory.back();
  assert.deepStrictEqual(log, ['sheet']);
  assert.strictEqual(bs.depth(), 1);
  fakeHistory.back();
  assert.deepStrictEqual(log, ['sheet', 'drawer']);
  assert.strictEqual(bs.depth(), 0);
});

/* ──────────────────────── dismiss (UI close) ──────────────────────── */

test('dismiss removes the top entry and balances history (closeFn NOT re-called)', () => {
  const { fakeWindow, fakeHistory, historyStates } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  let calls = 0;
  const id = bs.push(() => { calls++; });
  assert.strictEqual(historyStates.length, 2);
  bs.dismiss(id);
  assert.strictEqual(calls, 0, 'closeFn must not fire on UI-driven dismiss');
  assert.strictEqual(bs.depth(), 0);
  assert.strictEqual(historyStates.length, 1, 'history entry must be popped');
});

test('dismiss with a stale id (not the top) is rejected', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  const drawerId = bs.push(() => {});
  bs.push(() => {});
  bs.dismiss(drawerId); // not top — must be ignored
  assert.strictEqual(bs.depth(), 2);
});

test('dismiss on an empty stack is a no-op', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  assert.doesNotThrow(() => bs.dismiss(42));
});

/* ──────────────────────── interleaved hardware + UI close ──────────────────────── */

test('open-A, open-B, hardware-back closes B, then UI dismiss closes A cleanly', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  const log = [];
  const idA = bs.push((fromBack) => log.push(['A', !!fromBack]));
  const idB = bs.push((fromBack) => log.push(['B', !!fromBack]));

  fakeHistory.back(); // hardware back closes B
  assert.deepStrictEqual(log, [['B', true]]);
  assert.strictEqual(bs.depth(), 1);

  bs.dismiss(idA); // UI close on A
  assert.deepStrictEqual(log, [['B', true]], 'A.closeFn must NOT fire when dismissed via UI');
  assert.strictEqual(bs.depth(), 0);
});

test('a closeFn that throws does not corrupt the stack', () => {
  const { fakeWindow, fakeHistory } = makeFakeEnv();
  const bs = createBackStack({ window: fakeWindow, history: fakeHistory });
  bs.push(() => { throw new Error('boom'); });
  bs.push(() => {});
  fakeHistory.back(); // pops the safe one
  assert.strictEqual(bs.depth(), 1);
  assert.doesNotThrow(() => fakeHistory.back()); // throws inside closeFn but caught
  assert.strictEqual(bs.depth(), 0);
});
