/**
 * src/back-stack.js — hardware / browser back-button stack
 *
 * Problem: in the Capacitor wrapper on Android, the hardware back button
 * by default closes the app. Users expect it to dismiss the open modal /
 * sheet / drawer first, only exiting once nothing is on top.
 *
 * Pattern: each dismissable layer (drawer, node-sheet, auth modal, …)
 * pushes a phantom history entry when it opens. Hardware back fires
 * `popstate`; this module pops the matching layer and runs its close
 * function. UI-driven dismiss (X button, backdrop click, Escape) calls
 * dismiss() to balance the history entry so the user isn't left with a
 * dangling "back goes nowhere" state.
 *
 * Works on the web too: browser back closes the open modal instead of
 * leaving the page. Nicer UX everywhere — no gating on is-app.
 *
 * API:
 *   const id = cqBack.push(closeFn)
 *     closeFn is invoked with `true` when popstate fires (so the close
 *     function can skip its own history balancing).
 *   cqBack.dismiss(id)
 *     Call from UI-driven close paths to balance history.
 *   cqBack.depth()
 *     Number of layers currently registered.
 */
function createBackStack(opts) {
  const win = opts && opts.window;
  const hist = opts && opts.history;
  const stack = []; // [{ id, closeFn }]
  let seq = 0;
  let suppressNextPopstate = false;

  function push(closeFn) {
    if (typeof closeFn !== 'function') return null;
    const id = ++seq;
    try { hist.pushState({ cqBack: id }, ''); } catch (_) {}
    stack.push({ id: id, closeFn: closeFn });
    return id;
  }

  function dismiss(id) {
    if (!stack.length) return;
    // Defensive: only release the top entry, and only if it matches the id
    // passed (or the caller didn't supply one). Avoids out-of-order pops
    // when two layers are open and the inner one is closed first.
    const topIdx = stack.length - 1;
    if (id != null && stack[topIdx].id !== id) return;
    stack.splice(topIdx, 1);
    suppressNextPopstate = true;
    try { hist.back(); } catch (_) { suppressNextPopstate = false; }
  }

  function onPopstate() {
    if (suppressNextPopstate) { suppressNextPopstate = false; return; }
    if (!stack.length) return;
    const top = stack.pop();
    try { top.closeFn(true); } catch (e) {
      if (win && win.console && win.console.error) win.console.error('[cqBack]', e);
    }
  }

  if (win && win.addEventListener) win.addEventListener('popstate', onPopstate);

  return {
    push: push,
    dismiss: dismiss,
    depth: function () { return stack.length; },
    _onPopstate: onPopstate // exposed for tests
  };
}

(function () {
  if (typeof window === 'undefined') return;
  if (window.cqBack) return; // idempotent
  const api = createBackStack({ window: window, history: window.history });
  window.cqBack = Object.freeze({
    push: api.push,
    dismiss: api.dismiss,
    depth: api.depth
  });
})();

// Node-compatible export for tests.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createBackStack: createBackStack };
}
