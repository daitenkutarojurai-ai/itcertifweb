/**
 * src/labs.js — Phase 8.3 v1: hands-on guided labs
 *
 * A scenario runner for /labs/. Each lab (data/labs/labs.json) is an
 * incident the learner works through as a sequence of decision points;
 * every option gives feedback, and the FIRST pick per step is what counts
 * toward the score. The list is adaptively ordered so labs whose cert maps
 * to the learner's weak/started packs surface first. Static, client-side,
 * no LLM.
 *
 * Dual export: pure helpers (gradeLab / rankLabs) for Node tests + a
 * browser UI controller mounted on #labs-root.
 */
(function (root) {
  'use strict';

  function correctIndex(step) {
    var opts = (step && step.options) || [];
    for (var i = 0; i < opts.length; i++) if (opts[i] && opts[i].correct) return i;
    return -1;
  }

  /* Pure: grade a lab from the learner's FIRST pick per step (index or null). */
  function gradeLab(firstPicks, lab) {
    var steps = (lab && lab.steps) || [];
    var perStep = steps.map(function (s, i) {
      var pick = (firstPicks || [])[i];
      var got = pick != null && s.options[pick] && s.options[pick].correct === true;
      return { stepIndex: i, firstPick: (pick == null ? null : pick), correctIndex: correctIndex(s), correct: !!got };
    });
    var correct = perStep.filter(function (p) { return p.correct; }).length;
    var total = steps.length;
    return { score: total ? Math.round(100 * correct / total) : 0, correct: correct, total: total, perStep: perStep };
  }

  function inSet(set, id) {
    return !!(set && (typeof set.has === 'function' ? set.has(id) : set[id]));
  }

  var DIFF_RANK = { intro: 0, intermediate: 1, advanced: 2 };

  /* Pure: order labs so weak-pack labs come first, then started, then by
     difficulty. ctx = { weak, started } (Sets or {id:1} maps of pack ids). */
  function rankLabs(labs, ctx) {
    ctx = ctx || {};
    return (Array.isArray(labs) ? labs.slice() : []).map(function (lab, i) {
      var pri = inSet(ctx.weak, lab.cert) ? 2 : (inSet(ctx.started, lab.cert) ? 1 : 0);
      return { lab: lab, pri: pri, i: i };
    }).sort(function (a, b) {
      if (b.pri !== a.pri) return b.pri - a.pri;
      var da = DIFF_RANK[a.lab.difficulty] != null ? DIFF_RANK[a.lab.difficulty] : 1;
      var db = DIFF_RANK[b.lab.difficulty] != null ? DIFF_RANK[b.lab.difficulty] : 1;
      if (da !== db) return da - db;
      return a.i - b.i;
    }).map(function (x) { return { lab: x.lab, recommended: x.pri > 0 }; });
  }

  var api = { gradeLab: gradeLab, rankLabs: rankLabs, correctIndex: correctIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.cqLabs = api;

  /* ── Browser UI ─────────────────────────────────────────────────── */
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var rootEl = document.getElementById('labs-root');
    if (!rootEl) return;
    var LABS = null, activeDomain = 'all';
    var run = null; // { lab, idx, firstPicks[], answered[] }

    var DOMAIN_LABELS = { cloud: '☁️ Cloud', devops: '🔧 DevOps', security: '🛡️ Security', network: '🌐 Network', linux: '🐧 Linux' };
    var DIFF_LABELS = { intro: 'Intro', intermediate: 'Intermediate', advanced: 'Advanced' };

    function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

    function buildContext() {
      var weak = {}, started = {};
      try {
        var perPack = (JSON.parse(localStorage.getItem('cq-stats-v1') || '{}') || {}).perPack || {};
        Object.keys(perPack).forEach(function (id) {
          var p = perPack[id] || {};
          var qa = p.qa | 0;
          if (qa > 0 || p.questionsAnswered > 0) started[id] = 1;
          if (qa >= 5 && p.correct / qa < 0.7) weak[id] = 1;
        });
      } catch (_) {}
      return { weak: weak, started: started };
    }

    /* ── List view ── */
    function renderList() {
      run = null;
      var ranked = rankLabs(LABS, buildContext());
      var visible = ranked.filter(function (r) { return activeDomain === 'all' || r.lab.domain === activeDomain; });
      var domains = [];
      LABS.forEach(function (l) { if (domains.indexOf(l.domain) < 0) domains.push(l.domain); });
      var cats = '<button type="button" class="lb-cat' + (activeDomain === 'all' ? ' is-active' : '') + '" data-d="all">All</button>' +
        domains.map(function (d) { return '<button type="button" class="lb-cat' + (activeDomain === d ? ' is-active' : '') + '" data-d="' + esc(d) + '">' + esc(DOMAIN_LABELS[d] || d) + '</button>'; }).join('');
      var cards = visible.map(function (r) {
        var l = r.lab;
        return '<button type="button" class="lb-card" data-lab="' + esc(l.id) + '">' +
          '<div class="lb-card-top">' +
            '<span class="lb-chip">' + esc(DOMAIN_LABELS[l.domain] || l.domain) + '</span>' +
            '<span class="lb-chip diff ' + esc(l.difficulty) + '">' + esc(DIFF_LABELS[l.difficulty] || l.difficulty) + '</span>' +
            '<span class="lb-chip">⏱️ ' + (l.estMin || 5) + ' min</span>' +
            (r.recommended ? '<span class="lb-chip rec">★ recommended for you</span>' : '') +
          '</div>' +
          '<div class="lb-card-title">' + esc(l.title) + '</div>' +
          '<div class="lb-card-sc">' + esc(l.scenario) + '</div>' +
          '<span class="lb-card-go">Start lab →</span>' +
        '</button>';
      }).join('');
      rootEl.innerHTML = '<div class="lb-cats">' + cats + '</div><div class="lb-list">' + (cards || '<div class="lb-state">No labs in this domain.</div>') + '</div>';
      rootEl.querySelector('.lb-cats').addEventListener('click', function (e) {
        var b = e.target.closest('.lb-cat'); if (!b) return;
        activeDomain = b.getAttribute('data-d'); renderList();
      });
      rootEl.querySelectorAll('.lb-card').forEach(function (c) {
        c.addEventListener('click', function () { startLab(c.getAttribute('data-lab')); });
      });
    }

    function startLab(id) {
      var lab = LABS.filter(function (l) { return l.id === id; })[0];
      if (!lab) return;
      run = { lab: lab, idx: 0, firstPicks: lab.steps.map(function () { return null; }), answered: lab.steps.map(function () { return false; }) };
      renderStep();
    }

    /* ── Step view ── */
    function renderStep() {
      var lab = run.lab, step = lab.steps[run.idx], total = lab.steps.length;
      var opts = step.options.map(function (o, i) {
        return '<button type="button" class="lb-opt" data-opt="' + i + '">' + esc(o.text) + '</button>';
      }).join('');
      rootEl.innerHTML =
        '<div class="lb-run">' +
          '<div class="lb-head"><button type="button" class="lb-quit" id="lb-quit">← All labs</button>' +
            '<span class="lb-prog">Step ' + (run.idx + 1) + ' / ' + total + '</span></div>' +
          '<div class="lb-scenario">' + esc(lab.scenario) + '</div>' +
          '<h3 class="lb-prompt">' + esc(step.prompt) + '</h3>' +
          '<div class="lb-opts" id="lb-opts">' + opts + '</div>' +
          '<div class="lb-feedback" id="lb-feedback" hidden></div>' +
          '<div class="lb-step-actions">' +
            '<button type="button" class="lb-ghost" id="lb-hint">💡 Hint</button>' +
            '<button type="button" class="lb-next" id="lb-next" hidden>' + (run.idx + 1 >= total ? 'See results →' : 'Next step →') + '</button>' +
          '</div>' +
          '<p class="lb-hinttext" id="lb-hinttext" hidden>' + esc(step.hint || '') + '</p>' +
        '</div>';

      var optsEl = document.getElementById('lb-opts');
      var fb = document.getElementById('lb-feedback');
      var next = document.getElementById('lb-next');
      optsEl.addEventListener('click', function (e) {
        var b = e.target.closest('.lb-opt'); if (!b) return;
        var i = +b.getAttribute('data-opt');
        var opt = step.options[i];
        if (!run.answered[run.idx]) { run.firstPicks[run.idx] = i; run.answered[run.idx] = true; }
        optsEl.querySelectorAll('.lb-opt').forEach(function (x) {
          var xi = +x.getAttribute('data-opt');
          x.classList.toggle('is-correct', step.options[xi].correct === true && (xi === i || opt.correct !== true));
          x.classList.toggle('is-wrong', xi === i && opt.correct !== true);
        });
        fb.hidden = false;
        fb.className = 'lb-feedback ' + (opt.correct ? 'ok' : 'no');
        fb.innerHTML = (opt.correct ? '✅ ' : '❌ ') + esc(opt.feedback);
        if (opt.correct) next.hidden = false;
      });
      document.getElementById('lb-hint').addEventListener('click', function () {
        var h = document.getElementById('lb-hinttext'); h.hidden = !h.hidden;
      });
      document.getElementById('lb-quit').addEventListener('click', function () { if (confirm('Leave this lab? Progress is lost.')) renderList(); });
      next.addEventListener('click', function () {
        if (run.idx + 1 >= total) return renderResults();
        run.idx++; renderStep();
      });
    }

    /* ── Results view ── */
    function renderResults() {
      var lab = run.lab;
      var g = gradeLab(run.firstPicks, lab);
      var cls = g.score >= 80 ? 'good' : (g.score >= 50 ? 'mid' : 'low');
      var recap = g.perStep.map(function (p, i) {
        var s = lab.steps[i];
        var your = p.firstPick != null ? s.options[p.firstPick].text : '—';
        return '<div class="lb-recap">' +
          '<div class="lb-recap-q">' + (p.correct ? '✅' : '❌') + ' ' + esc(s.prompt) + '</div>' +
          (p.correct ? '' : '<div class="lb-recap-line">Your call: <s>' + esc(your) + '</s></div><div class="lb-recap-line ok">Best: ' + esc(s.options[p.correctIndex].text) + '</div>') +
        '</div>';
      }).join('');
      var ctas = '';
      if (lab.cert) {
        ctas = '<a class="lb-next" href="/train.html?pack=' + esc(lab.cert) + '">Drill ' + esc(lab.cert) + ' →</a>' +
               '<a class="lb-ghost" href="/path.html?pack=' + esc(lab.cert) + '">Open its path</a>';
      }
      rootEl.innerHTML =
        '<div class="lb-results">' +
          '<div class="lb-score ' + cls + '"><div class="lb-score-num">' + g.score + '</div><div class="lb-score-lbl">' + g.correct + '/' + g.total + ' first-try</div></div>' +
          '<div class="lb-takeaway"><b>Takeaway</b><p>' + esc(lab.takeaway) + '</p></div>' +
          '<div class="lb-recaps">' + recap + '</div>' +
          '<div class="lb-res-actions">' + ctas + '<button type="button" class="lb-ghost" id="lb-more">↻ Another lab</button></div>' +
        '</div>';
      document.getElementById('lb-more').addEventListener('click', renderList);
      try { window.scrollTo({ top: rootEl.offsetTop - 70, behavior: 'smooth' }); } catch (_) {}
    }

    fetch('/data/labs/labs.json').then(function (r) { return r.json(); }).then(function (d) {
      LABS = (d && d.labs) || [];
      renderList();
    }).catch(function () { rootEl.innerHTML = '<div class="lb-state">Couldn\'t load the labs. Try a refresh.</div>'; });
  });
})(typeof window !== 'undefined' ? window : null);
