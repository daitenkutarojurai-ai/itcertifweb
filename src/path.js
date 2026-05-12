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
    if (!walker) return;
    /* Defensive: stats.js may not be loaded yet (e.g., bundle hiccup).
       Fall back to the egg so the walker still renders. */
    var emoji = '🥚';
    try {
      if (api && typeof api.stageEmojiForLevel === 'function') {
        var s = (typeof api.get === 'function') ? api.get() : { level: 1 };
        emoji = api.stageEmojiForLevel(s.level || 1) || '🥚';
      }
    } catch (_) {}
    var node = walker.querySelector('.cq-path-walker-emoji');
    if (node) node.textContent = emoji;
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
    /* RESET state from any previous open — otherwise the start button
       stays hidden after the first concept/minigame/chest interaction,
       and stale inline content (flashcards, match grids) persists. */
    var panel = $('.node-sheet-panel');
    if (panel) panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    var startBtnReset = $('#node-sheet-start');
    if (startBtnReset) {
      startBtnReset.hidden = false;
      delete startBtnReset.dataset.mode;
    }

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

    /* Dual-state Start button: if the button is currently in
       "mark-complete" mode (set by renderConceptInline after the user
       opened the cards), tapping it commits the completion instead of
       re-rendering. */
    var startBtn = $('#node-sheet-start');
    if (startBtn && startBtn.dataset.mode === 'concept-mark-complete') {
      delete startBtn.dataset.mode;
      markConceptComplete();
      return;
    }

    if (node.type === 'concept') {
      renderConceptInline(node);
      return;
    }
    if (node.type === 'minigame') {
      // New canonical format: "Is this the right answer?" Yes/No drill.
      // Legacy gametypes ('truefalse' and 'match') are migrated on the fly
      // for any stale-cached path JSON in the service worker — the next
      // gen-paths run overwrites them with the new schema.
      if (node.gameType === 'yesno') renderYesNoInline(node);
      else if (node.gameType === 'truefalse') renderYesNoInline(migrateTFNode(node));
      else if (node.gameType === 'match')     renderYesNoInline(migrateMatchNode(node));
      else renderYesNoInline(node); // best-effort default
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

  /* ───── Inline concept (flashcards) ─────
     UX: when user taps "Start →", flashcards appear and the SAME button
     transforms into "Mark complete (+5 XP) ✓" via data-mode='mark-complete'.
     handleStart() branches on this mode so the user always has one
     primary button at the bottom — no buried CTA, no orphaned Start. */
  function renderConceptInline(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    var wrap = el('div', { class: 'node-sheet-inline concept-cards' });
    (node.flashcards || []).forEach(function (fc, i) {
      var front = el('div', { class: 'flashcard-front' });
      front.innerHTML =
        '<div class="flashcard-label">Question ' + (i + 1) + '</div>' +
        '<div class="flashcard-body"></div>';
      front.querySelector('.flashcard-body').textContent = fc.front;
      var back = el('div', { class: 'flashcard-back' });
      back.innerHTML =
        '<div class="flashcard-label">Answer</div>' +
        '<div class="flashcard-body"></div>';
      back.querySelector('.flashcard-body').textContent = fc.back;
      var card = el('div', { class: 'flashcard' }, [
        el('div', { class: 'flashcard-inner' }, [front, back])
      ]);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', 'false');
      function flip() {
        card.classList.toggle('is-flipped');
        card.setAttribute('aria-pressed', card.classList.contains('is-flipped') ? 'true' : 'false');
      }
      card.addEventListener('click', flip);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
      wrap.appendChild(card);
    });
    panel.appendChild(wrap);
    /* Transform the existing primary button into "Mark complete" — no
       new button to bury below the cards. */
    var startBtn = $('#node-sheet-start');
    startBtn.textContent = 'Mark complete (+5 XP) ✓';
    startBtn.dataset.mode = 'concept-mark-complete';
    startBtn.hidden = false;
  }

  function markConceptComplete() {
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
    setTimeout(function () {
      var cur = $('#path-map').querySelector('.path-node.is-current');
      if (cur) walkTo(cur);
    }, 250);
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

  /* ───── Legacy schema migration ─────
     Old TF nodes stored { statements: [{ statement, isTrue }] } where the
     "statement" was a question stem concatenated with one option. Split it
     back apart so the new Yes/No renderer can show a clean Q+A card. */
  function migrateTFNode(node) {
    var pairs = (node.statements || []).map(function (s) {
      var raw = String(s.statement || '');
      var qIdx = raw.indexOf('?');
      var stem = qIdx >= 0 ? raw.slice(0, qIdx + 1) : raw;
      var option = qIdx >= 0 ? raw.slice(qIdx + 1).trim() : '';
      return { stem: stem, option: option, correct: !!s.isTrue };
    });
    return { pairs: pairs, timePerQ: node.timePerQ || 8, title: node.title };
  }
  /* Old match nodes stored { pairs: [{ prompt, answer }] } as Q→correct-A
     pairs only (always "true"). Reframe as Yes/No, marking each as correct. */
  function migrateMatchNode(node) {
    var pairs = (node.pairs || []).map(function (p) {
      return { stem: String(p.prompt || ''), option: String(p.answer || ''), correct: true };
    });
    return { pairs: pairs, timePerQ: node.timePerQ || 10, title: node.title };
  }

  /* ───── Inline mini-game (Yes/No drill) ─────
     One canonical mini-game format. Each card shows a question stem and a
     proposed answer; the user judges whether the answer is correct.
     Designed to work with any MCQ in the bank without rewriting content. */
  function renderYesNoInline(node) {
    var panel = $('.node-sheet-panel');
    panel.querySelectorAll('.node-sheet-inline').forEach(function (n) { n.remove(); });
    $('#node-sheet-start').hidden = true;

    var pairs = (node.pairs || []).slice(0, 10);
    var timePerQ = Number(node.timePerQ) > 0 ? Number(node.timePerQ) : 10;
    var idx = 0;
    var correct = 0;
    var combo = 0;
    var comboBonus = 0;
    var timer = null;
    var locked = false; /* prevents double-fire when both pointerdown and click land */
    var startedAt = Date.now();

    var wrap = el('div', { class: 'node-sheet-inline minigame-yn' });
    var hud = el('div', { class: 'yn-hud' }, [
      el('span', { class: 'yn-progress', text: '1 / ' + pairs.length }),
      el('div', { class: 'yn-timer' }, [el('div', { class: 'yn-timer-fill' })]),
      el('span', { class: 'yn-score', text: '0 ✓' })
    ]);
    var card    = el('div', { class: 'yn-card' });
    var stemEl  = el('div', { class: 'yn-stem',  text: 'Loading…' });
    var labelEl = el('div', { class: 'yn-label', text: 'Is this the right answer?' });
    var optEl   = el('div', { class: 'yn-option', text: '' });
    card.appendChild(stemEl);
    card.appendChild(labelEl);
    card.appendChild(optEl);
    var btnNo  = el('button', { class: 'yn-btn yn-btn--no',  type: 'button', html: '✗ NO'  });
    var btnYes = el('button', { class: 'yn-btn yn-btn--yes', type: 'button', html: '✓ YES' });
    var buttons = el('div', { class: 'yn-buttons' }, [btnNo, btnYes]);
    wrap.appendChild(hud);
    wrap.appendChild(card);
    wrap.appendChild(buttons);
    panel.appendChild(wrap);

    function step() {
      if (idx >= pairs.length) return finish();
      var p = pairs[idx];
      hud.querySelector('.yn-progress').textContent = (idx + 1) + ' / ' + pairs.length;
      hud.querySelector('.yn-score').textContent = correct + ' ✓';
      stemEl.textContent = p.stem || '';
      optEl.textContent  = p.option || '';
      card.classList.remove('yn-card--right', 'yn-card--wrong');
      locked = false;
      /* Restart timer */
      clearTimeout(timer);
      var bar = hud.querySelector('.yn-timer-fill');
      bar.style.transition = 'none';
      bar.style.width = '100%';
      void bar.offsetWidth;
      bar.style.transition = 'width ' + timePerQ + 's linear';
      bar.style.width = '0%';
      timer = setTimeout(function () { answer(null); }, timePerQ * 1000);
    }
    function answer(picked) {
      if (locked) return;
      locked = true;
      clearTimeout(timer);
      var p = pairs[idx];
      var ok = picked === !!p.correct;
      if (ok) {
        correct++;
        combo++;
        card.classList.add('yn-card--right');
        if (combo >= 2) {
          var bonus = combo - 1;
          comboBonus += bonus;
          spawnCombo(card, combo, bonus);
        }
      } else {
        combo = 0;
        card.classList.add('yn-card--wrong');
        if (window.cqHearts) window.cqHearts.lose();
      }
      idx++;
      setTimeout(step, 600);
    }
    function finish() {
      clearTimeout(timer);
      var elapsed = Math.round((Date.now() - startedAt) / 1000);
      var prev = snapshotProgress(sheetState.path);
      var score = pairs.length ? Math.round((correct / pairs.length) * 100) : 0;
      markComplete(sheetState.path.packId, sheetState.node.id, score);
      try {
        window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
          packId: sheetState.path.packId,
          secondsSpent: elapsed, questionsAnswered: pairs.length,
          correct: correct, mode: 'path-minigame', bonusXp: comboBonus
        }}));
      } catch (_) {}

      /* Show summary */
      var summary = el('div', { class: 'yn-summary' }, [
        el('div', { class: 'yn-summary-score', text: correct + ' / ' + pairs.length }),
        el('div', { class: 'yn-summary-label', text:
          correct === pairs.length ? 'Flawless!' :
          correct >= pairs.length * 0.7 ? 'Nice run!' : 'Keep practicing.' }),
        comboBonus > 0 ? el('div', { class: 'yn-summary-bonus', text: '+' + comboBonus + ' combo bonus XP' }) : null,
        el('button', { class: 'cta-primary yn-continue', type: 'button', text: 'Continue →' })
      ]);
      panel.querySelector('.minigame-yn').replaceWith(summary);
      summary.querySelector('.yn-continue').addEventListener('click', function () {
        closeNodeSheet();
        renderMap(sheetState.path);
        setTimeout(function () { maybeBurstChapterEnd(prev, snapshotProgress(sheetState.path), sheetState.path); }, 150);
        setTimeout(function () {
          var cur = $('#path-map').querySelector('.path-node.is-current');
          if (cur) walkTo(cur);
        }, 250);
      });
    }

    /* pointerdown fires earlier than click on touch — fixes the historical
       "TF taps don't register" bug where the 5-second timer fired
       answer(null) before the click event landed on iOS. */
    function bind(btn, val) {
      var handler = function (ev) { ev.preventDefault(); answer(val); };
      btn.addEventListener('pointerdown', handler);
      btn.addEventListener('click', function (ev) { ev.preventDefault(); /* answer already locked */ });
    }
    bind(btnYes, true);
    bind(btnNo,  false);
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

  /* On page load, check for a freshly-earned laurel (set by stats.js
     when the user clears the final boss on train.html). If recent (within
     5 minutes — handles slow nav), fire the ceremony. Single-fire: the
     flag is consumed on read. */
  function checkFreshLaurel() {
    try {
      var raw = localStorage.getItem('cq-laurel-fresh-v1');
      if (!raw) return;
      var fresh = JSON.parse(raw);
      localStorage.removeItem('cq-laurel-fresh-v1');
      if (!fresh || !fresh.packId) return;
      var age = Date.now() - (fresh.at || 0);
      if (age > 5 * 60 * 1000) return; /* too stale */
      /* Defer slightly so the path map paints first and the ceremony
         overlays it dramatically */
      setTimeout(function () { showFinalBossCeremony(fresh.packId); }, 800);
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
        document.title = 'Cert Quest — CertQuests';
        var allProg = loadProgress();
        var header = el('header', { class: 'path-header path-index-header' }, [
          el('div', { class: 'path-header-eyebrow', text: '🗺️ Cert Quest · pick your journey' }),
          el('h1', { class: 'path-title', text: 'Cert Quest' }),
          el('p', { class: 'path-index-sub', text: 'A gamified path for each cert: concepts, drills, mini-games, sub-bosses, and a final boss. ' + list.length + ' quests available.' })
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
      /* Still check for a freshly-earned laurel — user might land here
         after clearing a final boss elsewhere. */
      checkFreshLaurel();
      return;
    }

    applyPendingFromQuiz();
    checkFreshLaurel();

    fetchPath(packId)
      .then(function (pathDoc) {
        $('#path-title').textContent = pathDoc.title || packId;
        $('#path-eyebrow').textContent = (pathDoc.brandName || 'Certification') + ' · 🗺️ Cert Quest';
        $('#path-chapters').textContent = pathDoc.chapters.length + ' chapters';
        $('#path-nodes').textContent = pathDoc.meta.totalNodes + ' nodes';
        document.title = pathDoc.title + ' — Cert Quest · CertQuests';
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

  /* ───── End-of-path ceremony (fires on cq:laurel-earned) ───── */
  function showFinalBossCeremony(packId) {
    fetch('/data/paths/_index.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (idx) {
        var pack = (idx || []).find(function (x) { return x.packId === packId; }) || { title: packId, brandColor: '#fbbf24' };
        var overlay = document.createElement('div');
        overlay.className = 'cq-ceremony';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'cq-ceremony-title');
        overlay.style.setProperty('--brand-color', pack.brandColor || '#fbbf24');
        overlay.innerHTML =
          '<div class="cq-ceremony-backdrop"></div>' +
          '<div class="cq-ceremony-panel">' +
            '<div class="cq-ceremony-rays" aria-hidden="true"></div>' +
            '<div class="cq-ceremony-laurel" aria-hidden="true">🏆</div>' +
            '<div class="cq-ceremony-eyebrow">CERTIFICATION SURVIVOR</div>' +
            '<h2 id="cq-ceremony-title">' + (pack.title || packId) + '</h2>' +
            '<p class="cq-ceremony-sub">You cleared every node on the path. The boss kneels.</p>' +
            '<div class="cq-ceremony-actions">' +
              '<button type="button" class="cq-ceremony-share">Get my survivor card →</button>' +
              '<button type="button" class="cq-ceremony-dismiss">Continue</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        setTimeout(function () { overlay.classList.add('is-open'); }, 10);

        /* Cascade of confetti — gold/yellow first, then brand-colored bursts */
        var goldColors = ['#fbbf24','#fef08a','#facc15','#f59e0b'];
        burstConfetti({ count: 80, origin: { x: window.innerWidth/2, y: window.innerHeight*0.35 }, colors: goldColors });
        setTimeout(function () { burstConfetti({ count: 50, origin: { x: window.innerWidth*0.22, y: window.innerHeight*0.45 } }); }, 280);
        setTimeout(function () { burstConfetti({ count: 50, origin: { x: window.innerWidth*0.78, y: window.innerHeight*0.45 } }); }, 480);
        setTimeout(function () { burstConfetti({ count: 60, origin: { x: window.innerWidth/2, y: window.innerHeight*0.30 }, colors: goldColors }); }, 900);

        function close() {
          overlay.classList.remove('is-open');
          document.body.style.overflow = '';
          setTimeout(function () { overlay.remove(); }, 350);
        }
        overlay.querySelector('.cq-ceremony-dismiss').addEventListener('click', close);
        overlay.querySelector('.cq-ceremony-backdrop').addEventListener('click', close);
        overlay.querySelector('.cq-ceremony-share').addEventListener('click', function () {
          location.href = '/profile.html';
        });
        overlay.addEventListener('cq:a11y-escape', close);
      });
  }
  window.addEventListener('cq:laurel-earned', function (e) {
    var detail = (e && e.detail) || {};
    if (detail.packId) showFinalBossCeremony(detail.packId);
  });

  /* ───── Keyboard nav on the path map ───── */
  function setupKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      var active = document.activeElement;
      if (!active || !active.classList || !active.classList.contains('path-node')) return;
      var allNodes = Array.prototype.slice.call(document.querySelectorAll('.path-node:not(.is-locked)'));
      var idx = allNodes.indexOf(active);
      if (idx < 0) return;
      var nextIdx = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') nextIdx = Math.min(allNodes.length - 1, idx + 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') nextIdx = Math.max(0, idx - 1);
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = allNodes.length - 1;
      if (nextIdx < 0 || nextIdx === idx) return;
      e.preventDefault();
      var target = allNodes[nextIdx];
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  if (document.readyState !== 'loading') setupKeyboardNav();
  else document.addEventListener('DOMContentLoaded', setupKeyboardNav);

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
