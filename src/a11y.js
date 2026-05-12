/**
 * src/a11y.js — accessibility helpers
 *
 * Single source of truth for the focus-trap + restore-focus pattern used
 * by every modal/dialog on the site. Plain IIFE; exposes window.cqA11y.
 *
 *   const trap = cqA11y.trapFocus(modalEl, { initialFocus: '.cta-primary' });
 *   // …user closes modal…
 *   trap.release(); // restores focus to the element that opened the modal
 *
 * Tab cycles within the modal; Shift+Tab cycles backwards; Escape is
 * dispatched as a 'cq:a11y-escape' event so the modal owner can handle
 * close — keeps focus-trap policy independent of close-policy.
 */
(function () {
  if (window.__cqA11yInit) return;
  window.__cqA11yInit = true;

  var FOCUSABLE =
    'a[href]:not([disabled]):not([aria-hidden="true"]), ' +
    'button:not([disabled]):not([aria-hidden="true"]), ' +
    'input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"]):not([disabled])';

  function getFocusable(root) {
    if (!root) return [];
    return Array.prototype.slice
      .call(root.querySelectorAll(FOCUSABLE))
      .filter(function (el) {
        /* Skip elements inside `hidden` ancestors or with visibility:hidden */
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
  }

  function trapFocus(root, opts) {
    if (!root) return { release: function () {} };
    opts = opts || {};
    var restoreTo = document.activeElement;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        root.dispatchEvent(new CustomEvent('cq:a11y-escape', { bubbles: true }));
        return;
      }
      if (e.key !== 'Tab') return;
      var els = getFocusable(root);
      if (!els.length) { e.preventDefault(); return; }
      var first = els[0], last = els[els.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    }

    root.addEventListener('keydown', onKeyDown);

    /* Move focus inside the modal */
    setTimeout(function () {
      var target;
      if (opts.initialFocus) target = root.querySelector(opts.initialFocus);
      if (!target) target = getFocusable(root)[0];
      if (target) target.focus();
    }, 30);

    return {
      release: function () {
        root.removeEventListener('keydown', onKeyDown);
        if (restoreTo && typeof restoreTo.focus === 'function') {
          try { restoreTo.focus(); } catch (_) {}
        }
      }
    };
  }

  /* Auto-attach: watch the DOM for `[role="dialog"][aria-modal="true"]`
     becoming visible (not hidden, display !== none). Each visible dialog
     gets a focus-trap; when it returns to hidden/removed, the trap
     releases and focus restores to the prior element.

     This means most modules don't need any explicit a11y wiring. */
  var attached = new WeakMap();

  function isVisibleDialog(el) {
    if (!el || el.hasAttribute('hidden')) return false;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return el.getAttribute('aria-modal') === 'true';
  }

  function scan() {
    var dialogs = document.querySelectorAll('[role="dialog"]');
    Array.prototype.forEach.call(dialogs, function (el) {
      var visible = isVisibleDialog(el);
      var existing = attached.get(el);
      if (visible && !existing) {
        var trap = trapFocus(el);
        attached.set(el, trap);
      } else if (!visible && existing) {
        existing.release();
        attached.delete(el);
      }
    });
  }

  function bootObserver() {
    /* Scan once on load, then watch for attribute and child changes */
    scan();
    if (typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function () {
      /* Debounce: scan in next animation frame */
      window.requestAnimationFrame(scan);
    });
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ['hidden', 'style', 'class', 'aria-modal'],
      childList: true,
      subtree: true
    });
  }

  if (document.readyState !== 'loading') bootObserver();
  else document.addEventListener('DOMContentLoaded', bootObserver);

  window.cqA11y = { trapFocus: trapFocus, getFocusable: getFocusable };
})();
