/**
 * src/path.js — Phase 3A: learning-path renderer
 *
 * Loads /data/paths/<pack-id>.json from ?pack= query param, renders
 * a winding-map of nodes (concept · quiz · minigame · subboss · finalboss),
 * gates progress on node completion stored in localStorage.
 *
 * Quiz/sub-boss/final-boss nodes route to /train.html with filters so
 * the existing quiz engine handles them — we just mark the node complete
 * via the cq:session-complete event coming back.
 *
 * Concept and minigame nodes render inline in the bottom-sheet for v1.
 */
(function () {
  if (window.__cqPathInit) return;
  window.__cqPathInit = true;

  var PROGRESS_KEY = 'cq-path-progress-v1';

  /* ───── Node-type metadata ───── */
  var NODE_META = {
    concept:   { icon: '💡', label: 'Concept',    color: '#a78bfa' },
    quiz:      { icon: '🎯', label: 'Quiz',       color: '#60a5fa' },
    minigame:  { icon: '🎮', label: 'Mini-game',  color: '#4ade80' },
    subboss:   { icon: '👹', label: 'Sub-boss',   color: '#f97316' },
    finalboss: { icon: '👑', label: 'Final Boss', color: '#fbbf24' }
  };

  /* ───── Progress store ───── */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (_) {}
  }
  function isComplete(packId, nodeId) {
    var p = loadProgress();
    return !!(p[packId] && p[packId][nodeId] && p[packId][nodeId].completed);
  }
  function markComplete(packId, nodeId, score) {
    var p = loadProgress();
    p[packId] = p[packId] || {};
    p[packId][nodeId] = { completed: true, completedAt: Date.now(), score: score || null };
    saveProgress(p);
  }

  /* ───── Helpers ───── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { n.addEventListener(ev, attrs.on[ev]); });
      else if (k.startsWith('data-') || k === 'href' || k === 'aria-label' || k === 'role') n.setAttribute(k, attrs[k]);
      else n[k] = attrs[k];
    });
    (children || []).forEach(function (c) {
      if (!c) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* ───── Render the map ───── */
  function flattenNodes(path) {
    var out = [];
    path.chapters.forEach(function (c) {
      c.nodes.forEach(function (n) { out.push({ ...n, chapterId: c.id, chapterTitle: c.title }); });
    });
    out.push({ ...path.finalBoss, chapterId: 'final', chapterTitle: 'Final Exam', isFinal: true });
    return out;
  }

  function findCurrentNodeIdx(packId, nodes) {
    for (var i = 0; i < nodes.length; i++) {
      if (!isComplete(packId, nodes[i].id)) return i;
    }
    return nodes.length; /* all done */
  }

  function renderMap(path) {
    var root = $('#path-map');
    root.innerHTML = '';
    var nodes = flattenNodes(path);
    var currentIdx = findCurrentNodeIdx(path.packId, nodes);

    var lastChapter = null;
    nodes.forEach(function (node, idx) {
      /* Chapter banner */
      if (node.chapterId !== lastChapter) {
        lastChapter = node.chapterId;
        root.appendChild(el('div', { class: 'path-chapter-banner' }, [
          el('span', { class: 'path-chapter-num', text: node.isFinal ? '★' : `Chapter ${path.chapters.findIndex(function (c) { return c.id === node.chapterId; }) + 1}` }),
          el('span', { class: 'path-chapter-title', text: node.chapterTitle })
        ]));
      }

      var meta = NODE_META[node.type] || NODE_META.quiz;
      var completed = isComplete(path.packId, node.id);
      var locked = idx > currentIdx;
      var current = idx === currentIdx;
      var sideClass = idx % 4 < 2 ? 'path-node-row--left' : 'path-node-row--right';
      var stateClass = completed ? 'is-completed' : locked ? 'is-locked' : current ? 'is-current' : 'is-unlocked';
      var typeClass = `is-${node.type}`;

      var row = el('div', { class: `path-node-row ${sideClass}` });
      var bubble = el('button', {
        class: `path-node ${stateClass} ${typeClass}`,
        type: 'button',
        'aria-label': `${meta.label}: ${node.title}` + (completed ? ' (completed)' : locked ? ' (locked)' : ''),
        style: `--node-color:${meta.color}`,
        on: {
          click: function () { if (!locked) openNodeSheet(path, node); }
        }
      }, [
        el('span', { class: 'path-node-icon', text: completed ? '✓' : meta.icon }),
        node.isFinal ? el('span', { class: 'path-node-final', text: 'FINAL' }) : null,
        current ? el('span', { class: 'path-node-current-pin', 'aria-hidden': 'true' }, [
          el('span', { class: 'path-node-current-arrow', text: '▼' }),
          el('span', { class: 'path-node-current-label', text: 'START HERE' })
        ]) : null
      ]);
      var title = el('div', { class: 'path-node-title', text: node.title });
      row.appendChild(bubble);
      row.appendChild(title);
      root.appendChild(row);
    });

    /* Progress percentage */
    var done = nodes.filter(function (n) { return isComplete(path.packId, n.id); }).length;
    var pct = Math.round((done / nodes.length) * 100);
    $('#path-progress').textContent = pct + '%';

    /* Auto-scroll to current node so user lands on the action */
    setTimeout(function () {
      var cur = root.querySelector('.path-node.is-current');
      if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }

  /* ───── Bottom-sheet ───── */
  var sheetState = { open: false, path: null, node: null };

  function openNodeSheet(path, node) {
    sheetState.path = path;
    sheetState.node = node;
    var meta = NODE_META[node.type] || NODE_META.quiz;
    var completed = isComplete(path.packId, node.id);
    $('#node-sheet-icon').textContent = meta.icon;
    $('#node-sheet-icon').style.background = `linear-gradient(135deg, ${meta.color}33, ${meta.color}11)`;
    $('#node-sheet-icon').style.borderColor = meta.color + '55';
    $('#node-sheet-kind').textContent = meta.label.toUpperCase();
    $('#node-sheet-kind').style.color = meta.color;
    $('#node-sheet-title').textContent = node.title;

    var desc, meta2;
    if (node.type === 'concept') {
      desc = node.content || 'Flashcards covering the key ideas in this chapter.';
      meta2 = `${(node.flashcards || []).length} flashcards · ~1 min`;
    } else if (node.type === 'minigame') {
      desc = 'Match each prompt to its correct answer. Quick and fun.';
      meta2 = `${(node.pairs || []).length} pairs · ~2 min`;
    } else if (node.type === 'subboss') {
      desc = 'Harder questions filtered from this chapter. Beat it to unlock the next chapter.';
      meta2 = `${(node.questionIds || []).length} questions · ~10 min · big XP`;
    } else if (node.type === 'finalboss') {
      desc = 'Full-length mock exam. The closest thing to the real cert.';
      meta2 = `${node.questionCount} questions · ${node.timeMinutes} min · MASSIVE XP`;
    } else {
      desc = 'Quick drill on a specific topic. Aim for high accuracy.';
      meta2 = `${(node.questionIds || []).length} questions · ~3 min`;
    }
    $('#node-sheet-desc').textContent = desc;
    $('#node-sheet-meta').textContent = meta2;
    var startBtn = $('#node-sheet-start');
    startBtn.textContent = completed ? 'Replay →' : 'Start →';

    var sheet = $('#node-sheet');
    sheet.hidden = false;
    sheetState.open = true;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { sheet.classList.add('is-open'); }, 10);
  }
  function closeNodeSheet() {
    var sheet = $('#node-sheet');
    sheet.classList.remove('is-open');
    sheetState.open = false;
    document.body.style.overflow = '';
    setTimeout(function () { sheet.hidden = true; }, 200);
  }

  function handleStart() {
    var node = sheetState.node, path = sheetState.path;
    if (!node || !path) return;

    if (node.type === 'concept') {
      renderConceptInline(node);
      return;
    }
    if (node.type === 'minigame') {
      renderMinigameInline(node);
      return;
    }
    /* Quiz / sub-boss / final-boss → train.html with a special pathnode param */
    var url;
    if (node.type === 'finalboss') {
      url = `/train.html?pack=${encodeURIComponent(path.packId)}&autostart=full&pathnode=${encodeURIComponent(node.id)}&pathpack=${encodeURIComponent(path.packId)}`;
    } else {
      var ids = (node.questionIds || []).join(',');
      url = `/train.html?pack=${encodeURIComponent(path.packId)}&qids=${encodeURIComponent(ids)}&autostart=quick&pathnode=${encodeURIComponent(node.id)}&pathpack=${encodeURIComponent(path.packId)}`;
    }
    /* Remember the node so when train.html dispatches cq:session-complete,
       we'll receive it on next visit via localStorage handshake (path-pending). */
    try {
      localStorage.setItem('cq-path-pending', JSON.stringify({
        packId: path.packId, nodeId: node.id, at: Date.now()
      }));
    } catch (_) {}
    location.href = url;
  }

  /* ───── Inline concept (flashcards) ───── */
  function renderConceptInline(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    var wrap = el('div', { class: 'node-sheet-inline concept-cards' });
    (node.flashcards || []).forEach(function (fc, i) {
      var card = el('div', { class: 'flashcard' }, [
        el('div', { class: 'flashcard-inner' }, [
          el('div', { class: 'flashcard-front', text: fc.front }),
          el('div', { class: 'flashcard-back',  text: fc.back })
        ])
      ]);
      card.addEventListener('click', function () { card.classList.toggle('is-flipped'); });
      wrap.appendChild(card);
    });
    var doneBtn = el('button', {
      class: 'cta-primary',
      type: 'button',
      text: 'Mark complete (+5 XP) ✓',
      on: { click: function () {
        markComplete(sheetState.path.packId, sheetState.node.id, 100);
        try {
          window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
            packId: sheetState.path.packId,
            secondsSpent: 60, questionsAnswered: 1, correct: 1, mode: 'path-concept'
          }}));
        } catch (_) {}
        closeNodeSheet();
        renderMap(sheetState.path);
      } }
    });
    wrap.appendChild(doneBtn);
    panel.appendChild(wrap);
    $('#node-sheet-start').hidden = true;
  }

  /* ───── Inline mini-game (drag-match) ───── */
  function renderMinigameInline(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    var pairs = (node.pairs || []).slice(0, 6);
    var prompts = pairs.map(function (p, i) { return { i: i, text: p.prompt }; });
    var answers = pairs.map(function (p, i) { return { i: i, text: p.answer }; }).sort(function () { return Math.random() - 0.5; });

    var wrap = el('div', { class: 'node-sheet-inline minigame-match' });
    wrap.appendChild(el('p', { class: 'minigame-help', text: 'Tap a prompt then tap its match. Score 100% to clear.' }));

    var promptsCol = el('div', { class: 'minigame-col' });
    var answersCol = el('div', { class: 'minigame-col' });
    var selectedPrompt = null;
    var solved = 0;
    var promptEls = {}, answerEls = {};

    prompts.forEach(function (p) {
      var bt = el('button', { class: 'minigame-tile', type: 'button', text: p.text, 'data-i': p.i });
      bt.addEventListener('click', function () {
        if (bt.classList.contains('is-solved')) return;
        if (selectedPrompt) selectedPrompt.classList.remove('is-active');
        selectedPrompt = bt;
        bt.classList.add('is-active');
      });
      promptEls[p.i] = bt;
      promptsCol.appendChild(bt);
    });
    answers.forEach(function (a) {
      var bt = el('button', { class: 'minigame-tile', type: 'button', text: a.text, 'data-i': a.i });
      bt.addEventListener('click', function () {
        if (bt.classList.contains('is-solved')) return;
        if (!selectedPrompt) return;
        var pi = +selectedPrompt.dataset.i;
        var ai = +bt.dataset.i;
        if (pi === ai) {
          selectedPrompt.classList.add('is-solved');
          bt.classList.add('is-solved');
          selectedPrompt.classList.remove('is-active');
          selectedPrompt = null;
          solved++;
          if (solved === prompts.length) {
            setTimeout(function () {
              markComplete(sheetState.path.packId, sheetState.node.id, 100);
              try {
                window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
                  packId: sheetState.path.packId,
                  secondsSpent: 90, questionsAnswered: prompts.length, correct: prompts.length, mode: 'path-minigame'
                }}));
              } catch (_) {}
              closeNodeSheet();
              renderMap(sheetState.path);
            }, 600);
          }
        } else {
          bt.classList.add('is-wrong');
          setTimeout(function () { bt.classList.remove('is-wrong'); }, 400);
          /* lose a heart if hearts.js is loaded */
          if (window.cqHearts) window.cqHearts.lose();
        }
      });
      answerEls[a.i] = bt;
      answersCol.appendChild(bt);
    });

    wrap.appendChild(el('div', { class: 'minigame-grid' }, [promptsCol, answersCol]));
    panel.appendChild(wrap);
    $('#node-sheet-start').hidden = true;
  }

  /* ───── On load: figure out which pack + handshake any pending node ───── */
  function getPackId() {
    var u = new URL(location.href);
    var p = u.searchParams.get('pack');
    if (p) return p;
    /* path-style URL: /path/<pack-id> */
    var m = u.pathname.match(/^\/path\/([^\/]+)/);
    return m ? m[1] : null;
  }

  function fetchPath(packId) {
    return fetch('/data/paths/' + encodeURIComponent(packId) + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  }

  function applyPendingFromQuiz() {
    /* When user comes back from /train.html after completing a path node,
       train.html's quiz engine should fire cq:session-complete. We also
       check the cq-path-pending marker as a fallback (in case the event
       fired on a different tab). */
    try {
      var pending = JSON.parse(localStorage.getItem('cq-path-pending') || 'null');
      if (pending && pending.packId && pending.nodeId) {
        /* Check if a quiz session was completed AFTER the pending was set */
        var last = +(localStorage.getItem('cq-stats-v1-last-session-at') || 0);
        if (last && last > pending.at) {
          markComplete(pending.packId, pending.nodeId, 100);
        }
        localStorage.removeItem('cq-path-pending');
      }
    } catch (_) {}
  }

  function show(elId) { var n = document.getElementById(elId); if (n) n.hidden = false; }
  function hide(elId) { var n = document.getElementById(elId); if (n) n.hidden = true; }

  document.addEventListener('DOMContentLoaded', function () {
    /* Wire sheet close */
    $('#node-sheet').addEventListener('click', function (e) {
      if (e.target.classList.contains('node-sheet-backdrop')) closeNodeSheet();
    });
    $('.node-sheet-close').addEventListener('click', closeNodeSheet);
    $('#node-sheet-start').addEventListener('click', handleStart);
    document.addEventListener('keydown', function (e) {
      if (sheetState.open && e.key === 'Escape') closeNodeSheet();
    });

    /* Listen for completions while on this page (concept/minigame inline) */
    window.addEventListener('cq:session-complete', function (e) {
      var d = e.detail || {};
      if (d.mode === 'path-concept' || d.mode === 'path-minigame') {
        /* already marked in inline handlers */
      }
    });

    var packId = getPackId();
    if (!packId) {
      $('#path-error-msg').textContent = 'No certification specified. Try /path.html?pack=ccna';
      hide('path-loading'); show('path-error');
      return;
    }

    applyPendingFromQuiz();

    fetchPath(packId)
      .then(function (pathDoc) {
        $('#path-title').textContent = pathDoc.title || packId;
        $('#path-eyebrow').textContent = (pathDoc.brandName || 'Certification') + ' · Learning Path';
        $('#path-chapters').textContent = pathDoc.chapters.length + ' chapters';
        $('#path-nodes').textContent = pathDoc.meta.totalNodes + ' nodes';
        document.title = pathDoc.title + ' — Learning Path · CertQuests';
        hide('path-loading'); show('path-root');
        renderMap(pathDoc);
      })
      .catch(function (err) {
        $('#path-error-msg').textContent = `Couldn't load /data/paths/${packId}.json (${err.message}).`;
        hide('path-loading'); show('path-error');
      });
  });

  /* Listen for quiz completions globally — if it matches a pending path
     node, mark it complete so the user sees progress when they navigate back. */
  window.addEventListener('cq:session-complete', function (e) {
    var detail = e.detail || {};
    try {
      var pending = JSON.parse(localStorage.getItem('cq-path-pending') || 'null');
      if (pending && pending.packId === detail.packId) {
        markComplete(pending.packId, pending.nodeId, detail.correct);
        localStorage.removeItem('cq-path-pending');
      }
      localStorage.setItem('cq-stats-v1-last-session-at', String(Date.now()));
    } catch (_) {}
  });
})();
