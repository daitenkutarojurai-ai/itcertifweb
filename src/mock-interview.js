/**
 * src/mock-interview.js — Phase 8.4 v1: solo mock-interview drill
 *
 * A timed, browser-native interview simulator for /interview/. Reads a
 * role-tagged question bank (data/interview/mock.json), reads questions
 * aloud (speechSynthesis, optional), captures answers by voice
 * (SpeechRecognition where available) OR by typing, runs a per-question
 * countdown, then scores each answer with a TRANSPARENT heuristic
 * (answered + substance + keyword coverage) — no LLM, no server, nothing
 * leaves the device. Web Speech is progressive: if SpeechRecognition is
 * missing (Firefox/Safari), it silently degrades to typed-only.
 *
 * Dual export: pure scorer (scoreAnswer / scoreSession) for Node tests,
 * plus a browser UI controller mounted on #mock-root.
 */
(function (root) {
  'use strict';

  var WORD_TARGET = 25; // words for "full" substance credit

  function words(s) {
    return String(s == null ? '' : s).trim().split(/\s+/).filter(Boolean);
  }

  /* Pure: score one answer against a question's keywords. */
  function scoreAnswer(answer, question) {
    var kw = (question && Array.isArray(question.keywords)) ? question.keywords : [];
    var w = words(answer);
    var answered = w.length > 0;
    var lower = String(answer || '').toLowerCase();
    var hits = kw.filter(function (k) { return lower.indexOf(String(k).toLowerCase()) >= 0; });
    var coverage = kw.length ? hits.length / kw.length : (answered ? 1 : 0);
    var substance = Math.min(1, w.length / WORD_TARGET);
    var score = Math.round(100 * (0.4 * (answered ? 1 : 0) + 0.3 * substance + 0.3 * coverage));
    return {
      score: score,
      answered: answered,
      wordCount: w.length,
      hits: hits,
      missed: kw.filter(function (k) { return hits.indexOf(k) < 0; })
    };
  }

  /* Pure: score a whole session. answers[] aligns with questions[]. */
  function scoreSession(answers, questions) {
    var per = (questions || []).map(function (q, i) {
      return Object.assign({ question: q.q }, scoreAnswer((answers || [])[i], q));
    });
    var overall = per.length
      ? Math.round(per.reduce(function (a, p) { return a + p.score; }, 0) / per.length)
      : 0;
    var answeredCount = per.filter(function (p) { return p.answered; }).length;
    return { overall: overall, perQuestion: per, answeredCount: answeredCount, total: per.length };
  }

  /* Heuristic debrief line keyed to the overall score. */
  function debrief(overall, answeredCount, total) {
    if (answeredCount === 0) return "🦑 You skipped every question. Run it again and just talk — even a rough answer beats silence in a real interview.";
    if (overall >= 80) return "🦑 Strong run. Your answers were substantial and hit the key points — tighten the delivery and you're interview-ready.";
    if (overall >= 60) return "🦑 Solid. You're on the right track; weave in more of the specific terms the interviewer listens for.";
    if (overall >= 40) return "🦑 Decent start. Go longer and name concrete details — depth is what separates a pass from a maybe.";
    return "🦑 Early days. Re-read each hint, then answer again out loud — repetition is how this gets smooth.";
  }

  var api = { scoreAnswer: scoreAnswer, scoreSession: scoreSession, debrief: debrief, WORD_TARGET: WORD_TARGET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.cqMockInterview = api;

  /* ── Browser UI ─────────────────────────────────────────────────── */
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var rootEl = document.getElementById('mock-root');
    if (!rootEl) return;

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    var canSpeak = 'speechSynthesis' in window;
    var DATA = null;

    var state = { track: null, n: 5, secs: 120, readAloud: canSpeak, idx: 0, answers: [], questions: [] };
    var timer = null, remaining = 0, recog = null, listening = false;

    function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function trackById(id){ return (DATA.tracks||[]).filter(function(t){return t.id===id;})[0]||DATA.tracks[0]; }

    function pickQuestions(track, n){
      var qs = (track.questions||[]).slice();
      // simple shuffle without Math.random bias issues — Fisher-Yates
      for (var i = qs.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = qs[i]; qs[i] = qs[j]; qs[j] = t;
      }
      return qs.slice(0, Math.min(n, qs.length));
    }

    /* ── Setup screen ── */
    function renderSetup(){
      stopAll();
      var tracks = (DATA.tracks||[]).map(function(t){
        return '<button type="button" class="mk-track'+(state.track===t.id?' is-active':'')+'" data-track="'+esc(t.id)+'">'+esc(t.icon)+' '+esc(t.name)+'</button>';
      }).join('');
      var lens = (DATA.lengthOptions||[3,5,7]).map(function(n){
        return '<button type="button" class="mk-opt'+(state.n===n?' is-active':'')+'" data-n="'+n+'">'+n+' Q</button>';
      }).join('');
      var times = (DATA.timeOptions||[60,120,180]).map(function(s){
        return '<button type="button" class="mk-opt'+(state.secs===s?' is-active':'')+'" data-secs="'+s+'">'+Math.round(s/60*10)/10+' min</button>';
      }).join('');
      var srNote = SR
        ? '<span class="mk-cap ok">🎙️ Voice answers available in this browser.</span>'
        : '<span class="mk-cap">⌨️ Voice capture isn\'t supported here — you\'ll type your answers (try Chrome/Edge for the mic).</span>';
      var speakToggle = canSpeak
        ? '<label class="mk-check"><input type="checkbox" id="mk-read"'+(state.readAloud?' checked':'')+'> 🔊 Read questions aloud</label>'
        : '';
      rootEl.innerHTML =
        '<div class="mk-setup">'+
          '<div class="mk-row"><span class="mk-lbl">Track</span><div class="mk-tracks">'+tracks+'</div></div>'+
          '<div class="mk-row"><span class="mk-lbl">Questions</span><div class="mk-opts">'+lens+'</div></div>'+
          '<div class="mk-row"><span class="mk-lbl">Time / question</span><div class="mk-opts">'+times+'</div></div>'+
          (speakToggle?'<div class="mk-row">'+speakToggle+'</div>':'')+
          '<button type="button" class="mk-start" id="mk-start"'+(state.track?'':' disabled')+'>Start mock interview →</button>'+
          '<p class="mk-note">'+srNote+' Heuristic self-check — not a human judge. Nothing leaves your device.</p>'+
        '</div>';

      rootEl.querySelector('.mk-tracks').addEventListener('click', function(e){
        var b = e.target.closest('.mk-track'); if(!b) return;
        state.track = b.getAttribute('data-track'); renderSetup();
      });
      rootEl.querySelectorAll('.mk-opts').forEach(function(box){
        box.addEventListener('click', function(e){
          var b = e.target.closest('.mk-opt'); if(!b) return;
          if (b.hasAttribute('data-n')) state.n = +b.getAttribute('data-n');
          if (b.hasAttribute('data-secs')) state.secs = +b.getAttribute('data-secs');
          renderSetup();
        });
      });
      var rd = document.getElementById('mk-read');
      if (rd) rd.addEventListener('change', function(){ state.readAloud = rd.checked; });
      var start = document.getElementById('mk-start');
      if (start) start.addEventListener('click', startSession);
    }

    /* ── Run screen ── */
    function startSession(){
      var track = trackById(state.track);
      state.questions = pickQuestions(track, state.n);
      state.answers = state.questions.map(function(){ return ''; });
      state.idx = 0;
      renderQuestion();
    }

    function renderQuestion(){
      stopTimer(); stopListening();
      var q = state.questions[state.idx];
      var total = state.questions.length;
      rootEl.innerHTML =
        '<div class="mk-run">'+
          '<div class="mk-head">'+
            '<span class="mk-prog">Question '+(state.idx+1)+' / '+total+'</span>'+
            '<button type="button" class="mk-quit" id="mk-quit">Quit</button>'+
          '</div>'+
          '<div class="mk-timer"><i id="mk-bar"></i></div>'+
          '<div class="mk-time" id="mk-time"></div>'+
          '<h3 class="mk-q" id="mk-q">'+esc(q.q)+'</h3>'+
          '<textarea class="mk-answer" id="mk-answer" placeholder="Speak or type your answer…">'+esc(state.answers[state.idx]||'')+'</textarea>'+
          '<div class="mk-controls">'+
            (SR?'<button type="button" class="mk-mic" id="mk-mic">🎙️ Start speaking</button>':'')+
            (canSpeak?'<button type="button" class="mk-ghost" id="mk-replay">🔊 Replay</button>':'')+
            '<button type="button" class="mk-next" id="mk-next">'+(state.idx+1>=total?'Finish →':'Next →')+'</button>'+
          '</div>'+
        '</div>';

      var ta = document.getElementById('mk-answer');
      ta.addEventListener('input', function(){ state.answers[state.idx] = ta.value; });
      document.getElementById('mk-next').addEventListener('click', nextQuestion);
      document.getElementById('mk-quit').addEventListener('click', function(){ if(confirm('Quit this mock interview?')) renderSetup(); });
      var replay = document.getElementById('mk-replay');
      if (replay) replay.addEventListener('click', function(){ speak(q.q); });
      var mic = document.getElementById('mk-mic');
      if (mic) mic.addEventListener('click', toggleListening);

      if (state.readAloud) speak(q.q);
      startTimer();
    }

    function nextQuestion(){
      stopTimer(); stopListening();
      if (state.idx + 1 >= state.questions.length) return renderResults();
      state.idx++;
      renderQuestion();
    }

    /* ── Timer ── */
    function startTimer(){
      remaining = state.secs;
      var bar = document.getElementById('mk-bar');
      var time = document.getElementById('mk-time');
      function tick(){
        var pct = Math.max(0, remaining / state.secs * 100);
        if (bar) bar.style.width = pct + '%';
        if (bar) bar.style.background = remaining <= 10 ? '#f87171' : (remaining <= 30 ? '#fbbf24' : 'linear-gradient(90deg,#60a5fa,#34d399)');
        if (time) time.textContent = remaining + 's left';
        if (remaining <= 0) { stopTimer(); nextQuestion(); return; }
        remaining--;
      }
      tick();
      timer = setInterval(tick, 1000);
    }
    function stopTimer(){ if (timer) { clearInterval(timer); timer = null; } }

    /* ── Speech ── */
    function speak(text){
      if (!canSpeak) return;
      try { window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 1; u.lang = 'en-US'; window.speechSynthesis.speak(u); } catch(_){}
    }
    function toggleListening(){ listening ? stopListening() : startListening(); }
    function startListening(){
      if (!SR) return;
      try {
        recog = new SR();
        recog.lang = 'en-US'; recog.interimResults = true; recog.continuous = true;
        var baseline = state.answers[state.idx] || '';
        recog.onresult = function(e){
          var add = '';
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) add += e.results[i][0].transcript;
          }
          if (add) {
            baseline = (baseline ? baseline + ' ' : '') + add.trim();
            state.answers[state.idx] = baseline;
            var ta = document.getElementById('mk-answer'); if (ta) ta.value = baseline;
          }
        };
        recog.onend = function(){ if (listening) { try { recog.start(); } catch(_){} } };
        recog.onerror = function(){ stopListening(); };
        recog.start();
        listening = true;
        var mic = document.getElementById('mk-mic'); if (mic){ mic.textContent = '⏹️ Stop'; mic.classList.add('is-live'); }
      } catch(_){ stopListening(); }
    }
    function stopListening(){
      listening = false;
      if (recog) { try { recog.onend = null; recog.stop(); } catch(_){} recog = null; }
      var mic = document.getElementById('mk-mic'); if (mic){ mic.textContent = '🎙️ Start speaking'; mic.classList.remove('is-live'); }
    }
    function stopAll(){ stopTimer(); stopListening(); if (canSpeak) { try { window.speechSynthesis.cancel(); } catch(_){} } }

    /* ── Results screen ── */
    function renderResults(){
      stopAll();
      var res = scoreSession(state.answers, state.questions);
      var cards = res.perQuestion.map(function(p, i){
        var q = state.questions[i];
        var hits = (p.hits||[]).map(function(k){ return '<span class="mk-kw hit">'+esc(k)+'</span>'; }).join('');
        var missed = (p.missed||[]).map(function(k){ return '<span class="mk-kw miss">'+esc(k)+'</span>'; }).join('');
        return '<div class="mk-rescard">'+
          '<div class="mk-resrow"><span class="mk-resq">'+esc(q.q)+'</span><span class="mk-resscore '+scoreClass(p.score)+'">'+p.score+'</span></div>'+
          '<p class="mk-resans">'+(p.answered?esc(truncate(state.answers[i],240)):'<em>— skipped —</em>')+'</p>'+
          '<div class="mk-kws">'+(hits?'<b>Hit:</b> '+hits:'')+(missed?' <b>Missed:</b> '+missed:'')+'</div>'+
          '<p class="mk-reshint">💡 '+esc(q.hint)+'</p>'+
        '</div>';
      }).join('');
      rootEl.innerHTML =
        '<div class="mk-results">'+
          '<div class="mk-overall '+scoreClass(res.overall)+'">'+
            '<div class="mk-overall-num">'+res.overall+'</div>'+
            '<div class="mk-overall-lbl">score moyen · '+res.answeredCount+'/'+res.total+' answered</div>'+
          '</div>'+
          '<p class="mk-debrief">'+esc(debrief(res.overall, res.answeredCount, res.total))+'</p>'+
          cards+
          '<div class="mk-resactions">'+
            '<button type="button" class="mk-next" id="mk-again">↻ New interview</button>'+
            '<button type="button" class="mk-ghost" id="mk-copy">Copy transcript</button>'+
          '</div>'+
        '</div>';
      document.getElementById('mk-again').addEventListener('click', renderSetup);
      document.getElementById('mk-copy').addEventListener('click', function(){
        var txt = res.perQuestion.map(function(p,i){ return 'Q: '+state.questions[i].q+'\nA: '+(state.answers[i]||'(skipped)')+'\nScore: '+p.score; }).join('\n\n');
        (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : Promise.reject())
          .then(function(){ var b=document.getElementById('mk-copy'); b.textContent='✓ Copied'; setTimeout(function(){b.textContent='Copy transcript';},1400); })
          .catch(function(){});
      });
    }
    function scoreClass(s){ return s>=80?'good':(s>=50?'mid':'low'); }
    function truncate(s,n){ s=String(s||''); return s.length>n?s.slice(0,n)+'…':s; }

    fetch('/data/interview/mock.json').then(function(r){ return r.json(); }).then(function(d){
      DATA = d;
      if (!state.track && d.tracks && d.tracks[0]) state.track = d.tracks[0].id;
      renderSetup();
    }).catch(function(){ rootEl.innerHTML = '<div class="mk-err">Couldn\'t load the question bank. Try a refresh.</div>'; });

    window.addEventListener('pagehide', stopAll);
  });
})(typeof window !== 'undefined' ? window : null);
