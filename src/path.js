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
    chest:     { icon: '🎁', label: 'Reward',     color: '#fde047' },
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
    var alreadyDone = !!p[packId][nodeId];
    p[packId][nodeId] = { completed: true, completedAt: Date.now(), score: score || null };
    saveProgress(p);
    /* If this is the final-boss node, award a "Cert Survivor" laurel */
    if (!alreadyDone && nodeId === 'final-boss') {
      try {
        var laurels = JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]');
        if (!laurels.some(function (l) { return l.packId === packId; })) {
          laurels.push({ packId: packId, earnedAt: Date.now(), score: score || null });
          localStorage.setItem('cq-laurels-v1', JSON.stringify(laurels));
          window.dispatchEvent(new CustomEvent('cq:laurel-earned', { detail: { packId: packId } }));
        }
      } catch (_) {}
    }
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

  /* Walker (player avatar standing on the current node) */
  var walker = null;
  function ensureWalker() {
    if (walker) return walker;
    walker = document.createElement('div');
    walker.className = 'cq-path-walker';
    walker.setAttribute('aria-hidden', 'true');
    walker.innerHTML = '<span class="cq-path-walker-emoji">🥚</span><span class="cq-path-walker-shadow"></span>';
    document.body.appendChild(walker);
    return walker;
  }
  function setWalkerEmoji() {
    var api = window.cqStats;
    if (!api || !walker) return;
    var s = api.get();
    walker.querySelector('.cq-path-walker-emoji').textContent = api.stageEmojiForLevel(s.level || 1);
  }
  function positionWalker(nodeEl, animate) {
    if (!walker || !nodeEl) return;
    var rect = nodeEl.getBoundingClientRect();
    var x = rect.left + rect.width / 2 + window.scrollX;
    var y = rect.top + window.scrollY - 14; /* sit just above the node */
    walker.style.transition = animate ? 'transform 0.7s cubic-bezier(0.6, 0.05, 0.2, 1)' : 'none';
    walker.style.transform = 'translate(calc(' + x + 'px - 50%), ' + y + 'px)';
    walker.classList.add('cq-path-walker--visible');
  }
  function walkTo(nodeEl) {
    if (!walker || !nodeEl) return;
    walker.classList.add('cq-path-walker--walking');
    positionWalker(nodeEl, true);
    setTimeout(function () { walker.classList.remove('cq-path-walker--walking'); }, 750);
  }

  /* Simple confetti — vanilla, no library */
  function burstConfetti(opts) {
    opts = opts || {};
    var n = opts.count || 36;
    var origin = opts.origin || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var colors = opts.colors || ['#60a5fa','#a78bfa','#4ade80','#fbbf24','#f472b6','#22d3ee'];
    var container = document.createElement('div');
    container.className = 'cq-confetti';
    document.body.appendChild(container);
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'cq-confetti-piece';
      var color = colors[i % colors.length];
      var dx = (Math.random() - 0.5) * 320;
      var dy = -120 - Math.random() * 280;
      var rot = (Math.random() - 0.5) * 720;
      var dur = 1200 + Math.random() * 900;
      p.style.left = origin.x + 'px';
      p.style.top = origin.y + 'px';
      p.style.background = color;
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.setProperty('--rot', rot + 'deg');
      p.style.animationDuration = dur + 'ms';
      container.appendChild(p);
    }
    setTimeout(function () { container.remove(); }, 2500);
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

    /* Auto-scroll to current node so user lands on the action,
       then drop the walker on top of it */
    setTimeout(function () {
      var cur = root.querySelector('.path-node.is-current');
      var target = cur || root.querySelector('.path-node.is-completed:last-of-type') || root.querySelector('.path-node');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ensureWalker();
      setWalkerEmoji();
      setTimeout(function () { positionWalker(target, false); }, 350);
    }, 200);
  }

  /* When a chapter ends (last node in chapter just got completed), burst confetti */
  function maybeBurstChapterEnd(prevNodes, newNodes, path) {
    /* Find which node was just completed by comparing progress */
    for (var i = 0; i < newNodes.length; i++) {
      var wasComplete = prevNodes[i] && prevNodes[i].completed;
      var nowComplete = newNodes[i] && newNodes[i].completed;
      if (!wasComplete && nowComplete) {
        var justFinished = newNodes[i];
        var sameChapterNodes = newNodes.filter(function (n) { return n.chapterId === justFinished.chapterId; });
        var allChapterDone = sameChapterNodes.every(function (n) { return n.completed; });
        if (allChapterDone && sameChapterNodes.length > 1) {
          /* Chapter complete! */
          var nodeEl = $('#path-map').querySelectorAll('.path-node')[i];
          var rect = nodeEl ? nodeEl.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
          burstConfetti({
            origin: { x: rect.left + rect.width/2, y: rect.top + rect.height/2 },
            count: 50
          });
        }
        if (justFinished.type === 'finalboss') {
          /* Final boss → big party */
          burstConfetti({ count: 100, origin: { x: window.innerWidth/2, y: window.innerHeight * 0.3 } });
          setTimeout(function () { burstConfetti({ count: 60, origin: { x: window.innerWidth * 0.25, y: window.innerHeight * 0.4 } }); }, 250);
          setTimeout(function () { burstConfetti({ count: 60, origin: { x: window.innerWidth * 0.75, y: window.innerHeight * 0.4 } }); }, 450);
        }
        break;
      }
    }
  }

  function snapshotProgress(path) {
    return flattenNodes(path).map(function (n) {
      return { id: n.id, completed: isComplete(path.packId, n.id), chapterId: n.chapterId };
    });
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
    } else if (node.type === 'chest') {
      desc = 'You earned this for clearing the chapter. Open it for XP and a possible cosmetic unlock.';
      meta2 = `+${node.rewardXp || 30} XP · maybe a new hat 🎩`;
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
      if (node.gameType === 'truefalse') renderTrueFalseInline(node);
      else renderMinigameInline(node);
      return;
    }
    if (node.type === 'chest') {
      openChest(node);
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
        var prev = snapshotProgress(sheetState.path);
        markComplete(sheetState.path.packId, sheetState.node.id, 100);
        try {
          window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
            packId: sheetState.path.packId,
            secondsSpent: 60, questionsAnswered: 1, correct: 1, mode: 'path-concept'
          }}));
        } catch (_) {}
        closeNodeSheet();
        renderMap(sheetState.path);
        setTimeout(function () { maybeBurstChapterEnd(prev, snapshotProgress(sheetState.path), sheetState.path); }, 150);
        /* Walker walks to next node */
        setTimeout(function () {
          var cur = $('#path-map').querySelector('.path-node.is-current');
          if (cur) walkTo(cur);
        }, 250);
      } }
    });
    wrap.appendChild(doneBtn);
    panel.appendChild(wrap);
    $('#node-sheet-start').hidden = true;
  }

  /* ───── Combo flash overlay (used by both mini-game types) ───── */
  function spawnCombo(targetEl, comboCount, bonus) {
    if (comboCount < 2) return;
    var flash = document.createElement('div');
    flash.className = 'cq-combo-flash';
    flash.innerHTML =
      '<span class="cq-combo-x">×' + comboCount + '</span>' +
      '<span class="cq-combo-xp">+' + bonus + ' XP</span>';
    var rect = (targetEl || document.body).getBoundingClientRect();
    flash.style.left = (rect.left + rect.width / 2) + 'px';
    flash.style.top = (rect.top + rect.height / 2 - 20) + 'px';
    document.body.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 1100);
  }

  /* ───── Inline mini-game (drag-match) ───── */
  function renderMinigameInline(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    var pairs = (node.pairs || []).slice(0, 6);
    var prompts = pairs.map(function (p, i) { return { i: i, text: p.prompt }; });
    var answers = pairs.map(function (p, i) { return { i: i, text: p.answer }; }).sort(function () { return Math.random() - 0.5; });

    var wrap = el('div', { class: 'node-sheet-inline minigame-match' });
    wrap.appendChild(el('p', { class: 'minigame-help', text: 'Tap a prompt then tap its match. Combo for bonus XP!' }));

    var promptsCol = el('div', { class: 'minigame-col' });
    var answersCol = el('div', { class: 'minigame-col' });
    var selectedPrompt = null;
    var solved = 0;
    var combo = 0;
    var comboBonus = 0;
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
          combo++;
          if (combo >= 2) {
            var bonus = combo - 1; /* x2 = +1 bonus XP, x3 = +2, etc. */
            comboBonus += bonus;
            spawnCombo(bt, combo, bonus);
          }
          selectedPrompt.classList.remove('is-active');
          selectedPrompt = null;
          solved++;
          if (solved === prompts.length) {
            setTimeout(function () {
              var prev = snapshotProgress(sheetState.path);
              markComplete(sheetState.path.packId, sheetState.node.id, 100);
              try {
                window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
                  packId: sheetState.path.packId,
                  secondsSpent: 90, questionsAnswered: prompts.length, correct: prompts.length,
                  mode: 'path-minigame', bonusXp: comboBonus
                }}));
              } catch (_) {}
              closeNodeSheet();
              renderMap(sheetState.path);
              setTimeout(function () { maybeBurstChapterEnd(prev, snapshotProgress(sheetState.path), sheetState.path); }, 150);
              setTimeout(function () {
                var cur = $('#path-map').querySelector('.path-node.is-current');
                if (cur) walkTo(cur);
              }, 250);
            }, 600);
          }
        } else {
          bt.classList.add('is-wrong');
          combo = 0; /* break combo on wrong match */
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

  /* ───── Inline mini-game (true/false speed run) ───── */
  function renderTrueFalseInline(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    $('#node-sheet-start').hidden = true;

    var statements = (node.statements || []).slice(0, 10);
    var timePerQ = node.timePerQ || 5;
    var idx = 0;
    var correct = 0;
    var combo = 0;
    var comboBonus = 0;
    var timer = null;
    var startedAt = Date.now();

    var wrap = el('div', { class: 'node-sheet-inline minigame-tf' });
    var hud = el('div', { class: 'tf-hud' }, [
      el('span', { class: 'tf-progress', text: '1 / ' + statements.length }),
      el('div', { class: 'tf-timer' }, [el('div', { class: 'tf-timer-fill' })]),
      el('span', { class: 'tf-score', text: '0 ✓' })
    ]);
    var card = el('div', { class: 'tf-card', text: 'Loading…' });
    var buttons = el('div', { class: 'tf-buttons' }, [
      el('button', { class: 'tf-btn tf-btn--false', type: 'button', html: '✗ FALSE' }),
      el('button', { class: 'tf-btn tf-btn--true',  type: 'button', html: '✓ TRUE'  })
    ]);
    wrap.appendChild(hud);
    wrap.appendChild(card);
    wrap.appendChild(buttons);
    panel.appendChild(wrap);

    function step() {
      if (idx >= statements.length) return finish();
      var s = statements[idx];
      hud.querySelector('.tf-progress').textContent = (idx + 1) + ' / ' + statements.length;
      hud.querySelector('.tf-score').textContent = correct + ' ✓';
      card.textContent = s.statement;
      card.classList.remove('tf-card--right', 'tf-card--wrong');
      /* Restart timer */
      clearTimeout(timer);
      var bar = hud.querySelector('.tf-timer-fill');
      bar.style.transition = 'none';
      bar.style.width = '100%';
      void bar.offsetWidth;
      bar.style.transition = 'width ' + timePerQ + 's linear';
      bar.style.width = '0%';
      timer = setTimeout(function () { answer(null); }, timePerQ * 1000);
    }
    function answer(picked) {
      clearTimeout(timer);
      var s = statements[idx];
      var ok = picked === s.isTrue;
      if (ok) {
        correct++;
        combo++;
        card.classList.add('tf-card--right');
        if (combo >= 2) {
          var bonus = combo - 1;
          comboBonus += bonus;
          spawnCombo(card, combo, bonus);
        }
      } else {
        combo = 0;
        card.classList.add('tf-card--wrong');
        if (window.cqHearts) window.cqHearts.lose();
      }
      idx++;
      setTimeout(step, 600);
    }
    function finish() {
      clearTimeout(timer);
      var elapsed = Math.round((Date.now() - startedAt) / 1000);
      var prev = snapshotProgress(sheetState.path);
      markComplete(sheetState.path.packId, sheetState.node.id, Math.round((correct / statements.length) * 100));
      try {
        window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
          packId: sheetState.path.packId,
          secondsSpent: elapsed, questionsAnswered: statements.length,
          correct: correct, mode: 'path-minigame', bonusXp: comboBonus
        }}));
      } catch (_) {}

      /* Show summary */
      var summary = el('div', { class: 'tf-summary' }, [
        el('div', { class: 'tf-summary-score', text: correct + ' / ' + statements.length }),
        el('div', { class: 'tf-summary-label', text: correct === statements.length ? 'Flawless!' : correct >= statements.length * 0.7 ? 'Nice run!' : 'Keep practicing.' }),
        comboBonus > 0 ? el('div', { class: 'tf-summary-bonus', text: '+' + comboBonus + ' combo bonus XP' }) : null,
        el('button', { class: 'cta-primary tf-continue', type: 'button', text: 'Continue →' })
      ]);
      panel.querySelector('.minigame-tf').replaceWith(summary);
      summary.querySelector('.tf-continue').addEventListener('click', function () {
        closeNodeSheet();
        renderMap(sheetState.path);
        setTimeout(function () { maybeBurstChapterEnd(prev, snapshotProgress(sheetState.path), sheetState.path); }, 150);
        setTimeout(function () {
          var cur = $('#path-map').querySelector('.path-node.is-current');
          if (cur) walkTo(cur);
        }, 250);
      });
    }

    buttons.querySelector('.tf-btn--true').addEventListener('click', function () { answer(true); });
    buttons.querySelector('.tf-btn--false').addEventListener('click', function () { answer(false); });
    setTimeout(step, 100);
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

  /* ───── Path index: list all generated paths with per-pack progress ───── */
  function renderPathIndex() {
    var main = document.querySelector('main.path-page');
    if (!main) return;
    document.title = 'Learning Paths — CertQuests';
    var loading = el('p', { class: 'path-index-loading', text: 'Loading paths…' });
    main.appendChild(loading);

    fetch('/data/paths/_index.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        loading.remove();
        var allProg = loadProgress();
        var header = el('header', { class: 'path-header path-index-header' }, [
          el('div', { class: 'path-header-eyebrow', text: 'CertQuests · Learning Paths' }),
          el('h1', { class: 'path-title', text: 'Pick your path' }),
          el('p', { class: 'path-index-sub', text: 'A guided journey for each cert: concepts, drills, mini-games, sub-bosses, and a final mock exam. ' + list.length + ' paths available.' })
        ]);
        main.appendChild(header);

        var grid = el('div', { class: 'path-index-grid' });
        list.sort(function (a, b) {
          /* In-progress first, then alphabetical */
          var pa = allProg[a.packId] ? Object.keys(allProg[a.packId]).length : 0;
          var pb = allProg[b.packId] ? Object.keys(allProg[b.packId]).length : 0;
          if (pa !== pb) return pb - pa;
          return a.title.localeCompare(b.title);
        }).forEach(function (p) {
          var done = allProg[p.packId] ? Object.keys(allProg[p.packId]).filter(function (k) { return allProg[p.packId][k].completed; }).length : 0;
          var pct = Math.round((done / p.totalNodes) * 100);
          var card = el('a', {
            class: 'path-index-card',
            href: '/path.html?pack=' + encodeURIComponent(p.packId),
            style: '--brand-color:' + (p.brandColor || '#60a5fa')
          }, [
            el('div', { class: 'path-index-brand', text: p.brandName || 'Certification' }),
            el('div', { class: 'path-index-title', text: p.title }),
            el('div', { class: 'path-index-meta' }, [
              el('span', { text: p.chapters + ' chapters' }),
              el('span', { text: p.totalNodes + ' nodes' })
            ]),
            el('div', { class: 'path-index-bar' }, [
              el('div', { class: 'path-index-bar-fill', style: 'width:' + pct + '%' })
            ]),
            el('div', { class: 'path-index-progress', text: done > 0 ? (done + ' / ' + p.totalNodes + ' done · ' + pct + '%') : 'Start →' })
          ]);
          grid.appendChild(card);
        });
        main.appendChild(grid);
      })
      .catch(function () {
        loading.textContent = "Couldn't load path index.";
      });
  }

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
      /* No pack → show the index of all paths */
      hide('path-loading');
      renderPathIndex();
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

  /* ───── Chest opening ───── */
  function openChest(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    $('#node-sheet-start').hidden = true;

    var prev = snapshotProgress(sheetState.path);
    var wrap = el('div', { class: 'node-sheet-inline cq-chest-wrap' });
    var chestEl = el('div', { class: 'cq-chest', html: '<span class="cq-chest-art">🎁</span><span class="cq-chest-rays" aria-hidden="true"></span>' });
    var rewardEl = el('div', { class: 'cq-chest-reward', html: '<span class="cq-chest-xp">+' + (node.rewardXp || 30) + ' XP</span><span class="cq-chest-cos" hidden></span>' });
    var hint = el('p', { class: 'cq-chest-hint', text: 'Tap the chest to open!' });
    var continueBtn = el('button', { class: 'cta-primary cq-chest-continue', type: 'button', text: 'Continue →', hidden: true });
    wrap.appendChild(chestEl);
    wrap.appendChild(rewardEl);
    wrap.appendChild(hint);
    wrap.appendChild(continueBtn);
    panel.appendChild(wrap);

    var opened = false;
    chestEl.addEventListener('click', function () {
      if (opened) return;
      opened = true;
      chestEl.classList.add('cq-chest--opening');
      hint.textContent = '';

      /* Award XP + cosmetic */
      markComplete(sheetState.path.packId, sheetState.node.id, 100);
      try {
        window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
          packId: sheetState.path.packId,
          secondsSpent: 10, questionsAnswered: 0, correct: 0, mode: 'path-chest',
          bonusXp: node.rewardXp || 30
        }}));
      } catch (_) {}

      if (node.cosmeticKey && window.cqCosmetics) {
        window.cqCosmetics.ensureCatalog().then(function (cat) {
          var hat = (cat.hats || []).find(function (h) { return h.key === node.cosmeticKey; });
          var newlyUnlocked = hat && window.cqCosmetics.unlock(node.cosmeticKey);
          if (hat && newlyUnlocked) {
            rewardEl.querySelector('.cq-chest-cos').hidden = false;
            rewardEl.querySelector('.cq-chest-cos').innerHTML =
              '<span class="cq-chest-cos-emoji">' + hat.emoji + '</span>' +
              '<span class="cq-chest-cos-name">' + hat.name + '<br><small>unlocked!</small></span>';
          }
        });
      }

      /* Confetti */
      var r = chestEl.getBoundingClientRect();
      burstConfetti({ origin: { x: r.left + r.width/2, y: r.top + r.height/2 }, count: 60, colors: ['#fde047','#fbbf24','#f97316','#a78bfa','#60a5fa'] });

      setTimeout(function () { continueBtn.hidden = false; }, 700);
    });

    continueBtn.addEventListener('click', function () {
      closeNodeSheet();
      renderMap(sheetState.path);
      setTimeout(function () { maybeBurstChapterEnd(prev, snapshotProgress(sheetState.path), sheetState.path); }, 150);
      setTimeout(function () {
        var cur = $('#path-map').querySelector('.path-node.is-current');
        if (cur) walkTo(cur);
      }, 250);
    });
  }

  /* Refresh walker emoji + hat when player levels up or unlocks cosmetic */
  function refreshWalkerVisuals() {
    if (!walker) return;
    setWalkerEmoji();
    /* Apply currently-worn hat as a small element above the emoji */
    var existingHat = walker.querySelector('.cq-path-walker-hat');
    var hat = window.cqCosmetics && window.cqCosmetics.currentHat && window.cqCosmetics.currentHat();
    if (hat) {
      if (existingHat) existingHat.textContent = hat.emoji;
      else {
        var h = document.createElement('span');
        h.className = 'cq-path-walker-hat';
        h.textContent = hat.emoji;
        walker.insertBefore(h, walker.firstChild);
      }
    } else if (existingHat) {
      existingHat.remove();
    }
  }
  window.addEventListener('cq:stats-changed', function () { refreshWalkerVisuals(); });
  window.addEventListener('cq:cosmetic-changed', function () { refreshWalkerVisuals(); });
  window.addEventListener('cq:level-up', function () {
    setWalkerEmoji();
    /* Burst confetti next to the avatar chip in the header */
    var chip = document.querySelector('.cq-avatar-chip');
    if (chip) {
      var r = chip.getBoundingClientRect();
      burstConfetti({ origin: { x: r.left + r.width/2, y: r.top + r.height/2 }, count: 40 });
    }
  });

  /* Keep walker glued to the current node on resize */
  window.addEventListener('resize', function () {
    var cur = document.querySelector('.path-node.is-current') ||
              document.querySelector('.path-node.is-completed:last-of-type') ||
              document.querySelector('.path-node');
    if (cur) positionWalker(cur, false);
  });
})();
