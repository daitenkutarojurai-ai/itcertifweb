/* Tech Universe — galaxy map renderer.
 * Shared by /tech-universe/ (overview SPA) and the static per-domain pages
 * /tech-universe/<domain>/ (each baked with its own OG card).
 * A static subpage sets window.__TU_DOMAIN before loading this file. */
(function () {
  var root = document.getElementById('tu-root');
  if (!root) return;
  var INITIAL = window.__TU_DOMAIN || null;          // set by a static subpage
  var IS_SUBPAGE = !!INITIAL;

  var DOMAINS = [
    { id:'cloud',    name:'Cloud',          emoji:'☁️', color:'#60a5fa' },
    { id:'devops',   name:'DevOps & Containers', emoji:'🔧', color:'#34d399' },
    { id:'security', name:'Security',       emoji:'🛡️', color:'#f87171' },
    { id:'network',  name:'Network',        emoji:'🌐', color:'#a78bfa' },
    { id:'data',     name:'Data & AI',      emoji:'📊', color:'#22d3ee' },
    { id:'linux',    name:'Linux',          emoji:'🐧', color:'#fbbf24' }
  ];
  var DCOLOR = {}; DOMAINS.forEach(function(d){ DCOLOR[d.id]=d.color; });
  var TIER = { beginner:0, intermediate:1, advanced:2 };
  var TIER_LABEL = ['Foundational', 'Associate', 'Pro / Boss'];

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* Per-pack domain classifier — priority order matters. Mirror of
     scripts/gen-tech-universe.js; keep the two in sync. */
  function domainOf(id){
    var x = String(id).toLowerCase();
    if (/sec|cysa|pentest|cissp|ccsp|isc2-cc|sc-100|sc-200|sc-900|scs-|az-500|cks|cyberops|ccnp-security|nse|pcnsa|pcnse|pccse|prisma|splunk|okta|gcp-pcse/.test(x)) return 'security';
    if (/^dp-|dea-|^ai-|aif|mla-|pmle|gcp-pde|snowpro|pl-300|pl-400|pl-600/.test(x)) return 'data';
    if (/ck[asd]|kcna|kcsa|terraform|docker|vault|consul|github|az-400|dop-|devnet/.test(x)) return 'devops';
    if (/rhc|lpic|comptia-linux|comptia-server/.test(x)) return 'linux';
    if (/ccn|comptia-network|^f5|aws-ans|gcp-pcne|az-700|cloudflare/.test(x)) return 'network';
    return 'cloud';
  }

  function buildContext(){
    var laurels = {}, started = {};
    try { (JSON.parse(localStorage.getItem('cq-laurels-v1')||'[]')||[]).forEach(function(l){ if(l&&l.packId) laurels[l.packId]=1; }); } catch(_){}
    try {
      var pp = JSON.parse(localStorage.getItem('cq-path-progress-v1')||'{}')||{};
      Object.keys(pp).forEach(function(pid){ var n=pp[pid]||{}; if(Object.keys(n).some(function(k){return n[k]&&n[k].completed;})) started[pid]=1; });
    } catch(_){}
    try {
      var per=(JSON.parse(localStorage.getItem('cq-stats-v1')||'{}')||{}).perPack||{};
      Object.keys(per).forEach(function(pid){ var p=per[pid]; if(p&&((p.qa|0)>0||(p.questionsAnswered|0)>0||(p.answered|0)>0)) started[pid]=1; });
    } catch(_){}
    return { laurels:laurels, started:started };
  }
  function statusOf(pack, ctx){ return ctx.laurels[pack.id] ? 'conquered' : (ctx.started[pack.id] ? 'progress' : 'locked'); }
  function isBoss(pack){ return pack.difficulty === 'advanced'; }

  var PACKS = []; // {id, name, short, difficulty, domain, brandName, brandColor, brandIcon}
  function loadPacks(){
    return fetch('/data/index.json',{cache:'force-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(idx){
      (idx&&idx.brands||[]).forEach(function(b){ (b.packs||[]).forEach(function(p){ if(p&&p.id&&p.available!==false){
        PACKS.push({ id:p.id, name:p.name||p.id, short:p.short||p.name||p.id, difficulty:p.difficulty||'intermediate',
          domain:domainOf(p.id), brandName:b.name||'', brandColor:b.color||'#60a5fa', brandIcon:b.icon||'' });
      }}); });
    });
  }
  function packsIn(domId){ return PACKS.filter(function(p){return p.domain===domId;}); }

  /* ── Universe overview ── */
  function renderUniverse(){
    var ctx = buildContext();
    var totalConq = PACKS.filter(function(p){return ctx.laurels[p.id];}).length;
    var total = PACKS.length;
    var domsExplored = DOMAINS.filter(function(d){ return packsIn(d.id).some(function(p){return ctx.laurels[p.id]||ctx.started[p.id];}); }).length;

    var cards = DOMAINS.map(function(d){
      var ps = packsIn(d.id);
      var conq = ps.filter(function(p){return ctx.laurels[p.id];}).length;
      return '<a class="tu-dom" href="/tech-universe/'+d.id+'/" data-dom="'+d.id+'" style="--d:'+d.color+'">'+
        '<span class="tu-dom-ring">'+conq+'/'+ps.length+'</span>'+
        starfield(ps, ctx, d.color)+
        '<div class="tu-dom-body"><div class="tu-dom-name">'+d.emoji+' '+esc(d.name)+'</div>'+
          '<div class="tu-dom-meta">'+ps.length+' certs · '+conq+' conquered · '+ps.filter(function(p){return ctx.started[p.id]&&!ctx.laurels[p.id];}).length+' in orbit</div>'+
          '<div class="tu-dom-go">Explore the '+esc(d.name)+' constellation →</div></div>'+
      '</a>';
    }).join('');

    root.innerHTML =
      '<div class="tu-stat">'+
        '<div><div class="tu-stat-big"><b>'+totalConq+'</b> / '+total+'</div><div class="tu-stat-sub">stars conquered</div></div>'+
        '<div class="tu-stat-bar"><i style="width:'+(total?Math.round(totalConq/total*100):0)+'%"></i></div>'+
        '<div><div class="tu-stat-big">'+domsExplored+'/6</div><div class="tu-stat-sub">domains explored</div></div>'+
      '</div>'+
      '<div class="tu-grid">'+cards+'</div>';
    root.querySelectorAll('.tu-dom').forEach(function(c){ c.addEventListener('click', function(e){ e.preventDefault(); renderDomain(c.getAttribute('data-dom')); window.scrollTo({top:0,behavior:'smooth'}); }); });
  }

  /* Decorative starfield for an overview card — one dot per cert, lit if conquered. */
  function starfield(ps, ctx, color){
    var W=300, H=130, dots='';
    ps.forEach(function(p, i){
      // deterministic pseudo-random position from index
      var a=(i*2654435761)%10000, b=(i*40503+13)%10000;
      var x=18+(a/10000)*(W-36), y=14+(b/10000)*(H-28);
      var st=statusOf(p,ctx);
      var r = isBoss(p)?2.6:1.9;
      var fill = st==='conquered'?color:(st==='progress'?'#cfd6e6':'#33415c');
      var op = st==='conquered'?1:(st==='progress'?.85:.5);
      dots += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+fill+'" opacity="'+op+'"'+(st==='conquered'?' filter="url(#tuglow)"':'')+'/>';
    });
    return '<svg class="tu-dom-sky" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
      '<defs><filter id="tuglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
      dots+'</svg>';
  }

  /* ── Domain detail constellation ── */
  function renderDomain(domId){
    var d = DOMAINS.filter(function(x){return x.id===domId;})[0]; if(!d) return renderUniverse();
    if(!IS_SUBPAGE){ try{ history.replaceState(null,'','/tech-universe/'+domId+'/'); }catch(_){} }
    var ctx = buildContext();
    var ps = packsIn(domId);
    // group by tier
    var cols=[[],[],[]];
    ps.forEach(function(p){ cols[TIER[p.difficulty]!=null?TIER[p.difficulty]:1].push(p); });
    var colW=200, H=Math.max(220, Math.max(cols[0].length,cols[1].length,cols[2].length)*42+40);
    var totalW = colW*3;
    function nodeXY(ci, ri, n){ var x=colW*ci+colW/2; var y=H/(n+1)*(ri+1); return [x,y]; }

    // edges: link each node to the nearest node in the previous tier
    var pos={}; cols.forEach(function(col,ci){ col.forEach(function(p,ri){ pos[p.id]=nodeXY(ci,ri,col.length); }); });
    var edges='';
    for(var ci=1; ci<3; ci++){
      cols[ci].forEach(function(p){
        if(!cols[ci-1].length) return;
        // nearest previous-tier node by y
        var me=pos[p.id], best=null, bd=1e9;
        cols[ci-1].forEach(function(q){ var dy=Math.abs(pos[q.id][1]-me[1]); if(dy<bd){bd=dy;best=q;} });
        if(best){ var a=pos[best.id]; edges+='<path d="M'+a[0]+','+a[1]+' C'+((a[0]+me[0])/2)+','+a[1]+' '+((a[0]+me[0])/2)+','+me[1]+' '+me[0]+','+me[1]+'" stroke="'+d.color+'" stroke-opacity="0.18" fill="none" stroke-width="1.4"/>'; }
      });
    }
    var nodes='';
    cols.forEach(function(col){ col.forEach(function(p){
      var xy=pos[p.id], st=statusOf(p,ctx), boss=isBoss(p);
      var fill = st==='conquered'?d.color:(st==='progress'?'#1c2740':'#141c30');
      var stroke = st==='conquered'?d.color:(st==='progress'?'#cfd6e6':'#33415c');
      var r = boss?11:8;
      nodes += '<g class="tu-node is-'+st+'" data-pack="'+esc(p.id)+'" role="button" tabindex="0">'+
        '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(st==='conquered'?2:1.3)+'"'+(st==='conquered'?' filter="url(#tuglow2)"':'')+'/>'+
        (boss?'<text x="'+xy[0]+'" y="'+(xy[1]+3.5)+'" text-anchor="middle" font-size="10">♛</text>':(st==='conquered'?'<text x="'+xy[0]+'" y="'+(xy[1]+3.5)+'" text-anchor="middle" font-size="9" fill="#04241a">✓</text>':''))+
        '<text x="'+xy[0]+'" y="'+(xy[1]+r+12)+'" text-anchor="middle">'+esc(p.short)+'</text>'+
      '</g>';
    }); });

    root.innerHTML =
      (IS_SUBPAGE
        ? '<a class="tu-back" href="/tech-universe/">← Back to the universe</a>'
        : '<button type="button" class="tu-back" id="tu-back">← Back to the universe</button>')+
      '<div class="tu-detail-head" style="--d:'+d.color+'"><span style="font-size:30px">'+d.emoji+'</span><h2>'+esc(d.name)+' constellation</h2></div>'+
      '<div class="tu-stat-sub" style="margin-left:2px">'+ps.filter(function(p){return ctx.laurels[p.id];}).length+' / '+ps.length+' conquered · click a star for details</div>'+
      '<div class="tu-map-wrap" style="--d:'+d.color+'">'+
        '<div class="tu-tierlbl"><span>'+TIER_LABEL[0]+'</span><span>'+TIER_LABEL[1]+'</span><span>'+TIER_LABEL[2]+'</span></div>'+
        '<svg viewBox="0 0 '+totalW+' '+H+'" style="width:100%;min-width:'+Math.min(totalW,520)+'px;height:auto" role="img" aria-label="'+esc(d.name)+' certification constellation">'+
          '<defs><filter id="tuglow2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
          edges+nodes+
        '</svg>'+
        '<div class="tu-legend"><span class="k"><span class="dot" style="background:'+d.color+'"></span>Conquered</span><span class="k"><span class="dot" style="background:#cfd6e6"></span>In orbit</span><span class="k"><span class="dot" style="background:#33415c"></span>Uncharted</span><span class="k">♛ Boss (Pro tier)</span></div>'+
      '</div>'+
      '<div id="tu-detail"></div>';

    if(!IS_SUBPAGE){
      var back=document.getElementById('tu-back');
      if(back) back.addEventListener('click', function(){ openUniverse(); window.scrollTo({top:0,behavior:'smooth'}); });
    }
    root.querySelectorAll('.tu-node').forEach(function(g){
      function open(){ showDetail(g.getAttribute('data-pack'), ctx); }
      g.addEventListener('click', open);
      g.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
    });
  }

  function showDetail(packId, ctx){
    var p = PACKS.filter(function(x){return x.id===packId;})[0]; if(!p) return;
    var host = document.getElementById('tu-detail'); if(!host) return;
    var st = statusOf(p, ctx), boss = isBoss(p);
    var stChip = st==='conquered'?'<span class="tu-chip conquered">✓ conquered</span>':(st==='progress'?'<span class="tu-chip progress">in orbit</span>':'<span class="tu-chip">uncharted</span>');
    host.innerHTML =
      '<div class="tu-detail-panel">'+
        '<div class="tu-dp-name">'+esc(p.brandIcon)+' '+esc(p.name)+'</div>'+
        '<div class="tu-dp-meta">'+stChip+
          '<span class="tu-chip">'+esc(p.brandName)+'</span>'+
          '<span class="tu-chip">'+esc(p.difficulty)+'</span>'+
          (boss?'<span class="tu-chip boss">♛ boss</span>':'')+'</div>'+
        '<div class="tu-dp-actions">'+
          '<a class="tu-act primary" href="/train.html?pack='+esc(p.id)+'&autostart=quick">'+(st==='conquered'?'Re-challenge →':'Start a 5-Q quiz →')+'</a>'+
          '<a class="tu-act ghost" href="/path.html?pack='+esc(p.id)+'">Open the path</a>'+
          '<a class="tu-act ghost" href="/roadmap/">Add to roadmap</a>'+
        '</div>'+
      '</div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function openUniverse(){
    if(IS_SUBPAGE){ location.href='/tech-universe/'; return; }
    try{ history.replaceState(null,'','/tech-universe/'); }catch(_){} renderUniverse();
  }
  function start(){
    if(IS_SUBPAGE) return renderDomain(INITIAL);
    var m=/[?&]domain=([a-z]+)/.exec(location.search);
    if(m && DOMAINS.some(function(d){return d.id===m[1];})) renderDomain(m[1]); else renderUniverse();
  }
  loadPacks().then(start).catch(function(){ root.innerHTML='<div class="tu-state">Couldn\'t chart the galaxy. Try a refresh.</div>'; });
  window.addEventListener('cq:stats-changed', function(){
    if(IS_SUBPAGE){ renderDomain(INITIAL); return; }
    if(!document.getElementById('tu-back')) renderUniverse();
  });
})();
