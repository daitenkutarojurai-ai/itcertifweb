#!/usr/bin/env node
/* Generates the Tech Universe per-domain artifacts:
 *   1. src/assets/og/tech-universe-<domain>.png  — 1200×630 social share cards
 *   2. tech-universe/<domain>/index.html         — static, indexable subpages
 *
 * The subpages set window.__TU_DOMAIN then load the shared tech-universe/tu.js,
 * so they render the same constellation the SPA does — but with their own
 * baked OG/canonical/title so social crawlers (which don't run JS) see a real
 * per-domain preview card for a shared /tech-universe/<domain>/ link.
 *
 * Idempotent. Run: npm run gen-tech-universe   (bump CACHE_VERSION via --v=N).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const CACHE_V = (process.argv.find(a => a.startsWith('--v=')) || '--v=124').slice(4);

const DOMAINS = [
  { id:'cloud',    name:'Cloud',               color:'#60a5fa', tag:'AWS · Azure · GCP — the cloud platforms', seed:7 },
  { id:'devops',   name:'DevOps & Containers', color:'#34d399', tag:'Kubernetes · Terraform · CI/CD pipelines', seed:13 },
  { id:'security', name:'Security',            color:'#f87171', tag:'Pentest · SOC · cloud & identity defence', seed:23 },
  { id:'network',  name:'Network',             color:'#a78bfa', tag:'Routing · switching · the edge', seed:31 },
  { id:'data',     name:'Data & AI',           color:'#22d3ee', tag:'Data engineering · analytics · machine learning', seed:43 },
  { id:'linux',    name:'Linux',               color:'#fbbf24', tag:'RHCSA · LPIC · the command line', seed:59 }
];

/* Mirror of tu.js domainOf() — keep in sync. */
function domainOf(id){
  const x = String(id).toLowerCase();
  if (/sec|cysa|pentest|cissp|ccsp|isc2-cc|sc-100|sc-200|sc-900|scs-|az-500|cks|cyberops|ccnp-security|nse|pcnsa|pcnse|pccse|prisma|splunk|okta|gcp-pcse/.test(x)) return 'security';
  if (/^dp-|dea-|^ai-|aif|mla-|pmle|gcp-pde|snowpro|pl-300|pl-400/.test(x)) return 'data';
  if (/ck[asd]|kcna|kcsa|terraform|docker|vault|consul|github|az-400|dop-|devnet/.test(x)) return 'devops';
  if (/rhc|lpic|comptia-linux|comptia-server/.test(x)) return 'linux';
  if (/ccn|comptia-network|^f5|aws-ans|gcp-pcne|az-700|cloudflare/.test(x)) return 'network';
  return 'cloud';
}

function countDomains(){
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index.json'), 'utf8'));
  const c = {}, boss = {};
  DOMAINS.forEach(d => { c[d.id] = 0; boss[d.id] = 0; });
  (idx.brands || []).forEach(b => (b.packs || []).forEach(p => {
    if (p && p.id && p.available !== false) {
      const d = domainOf(p.id);
      c[d]++; if (p.difficulty === 'advanced') boss[d]++;
    }
  }));
  return { c, boss };
}

function xml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function hexA(hex, a){
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

/* Deterministic LCG so the starfield is stable across runs. */
function rng(seed){ let s = seed >>> 0 || 1; return () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296; }

function ogSvg(d, count, bosses){
  const W = 1200, H = 630, rand = rng(d.seed);
  let stars = '';
  for (let i = 0; i < 130; i++){
    const x = rand()*W, y = rand()*H, lit = rand() < 0.16;
    const r = lit ? (1.4 + rand()*2.2) : (0.6 + rand()*1.2);
    const fill = lit ? d.color : '#3a4a66';
    const op = lit ? (0.6 + rand()*0.4) : (0.25 + rand()*0.4);
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${fill}" opacity="${op.toFixed(2)}"${lit?' filter="url(#g)"':''}/>`;
  }
  // a few connecting constellation lines between bright clusters (decorative)
  let lines = '';
  let px = 760, py = 150;
  for (let i = 0; i < 5; i++){
    const nx = 740 + rand()*420, ny = 90 + rand()*360;
    lines += `<line x1="${px.toFixed(0)}" y1="${py.toFixed(0)}" x2="${nx.toFixed(0)}" y2="${ny.toFixed(0)}" stroke="${d.color}" stroke-opacity="0.20" stroke-width="1.4"/>`;
    lines += `<circle cx="${nx.toFixed(0)}" cy="${ny.toFixed(0)}" r="4" fill="${d.color}" filter="url(#g)"/>`;
    px = nx; py = ny;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="74%" cy="22%" r="85%">
      <stop offset="0%" stop-color="${hexA(d.color,0.16)}"/>
      <stop offset="55%" stop-color="#070b15"/>
      <stop offset="100%" stop-color="#04060c"/>
    </radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${d.color}"/>
    </linearGradient>
    <filter id="g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${stars}${lines}
  <g font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif">
    <text x="64" y="300" font-size="26" font-weight="700" letter-spacing="4" fill="${d.color}" opacity="0.9">CERTQUESTS · TECH UNIVERSE</text>
    <text x="60" y="392" font-size="92" font-weight="800" fill="url(#title)">${xml(d.name)}</text>
    <text x="64" y="450" font-size="40" font-weight="700" fill="#aebbd2">constellation</text>
    <text x="64" y="512" font-size="27" font-weight="500" fill="#8fa0bd">${xml(d.tag)}</text>
    <text x="64" y="556" font-size="25" font-weight="600" fill="#cfd8e8">${count} certifications${bosses?` · ${bosses} boss${bosses>1?'es':''}`:''} · light up the ones you conquer</text>
  </g>
  <g>
    <circle cx="1064" cy="120" r="64" fill="${hexA(d.color,0.14)}" stroke="${d.color}" stroke-width="3"/>
    <text x="1064" y="116" font-family="Liberation Sans, Arial, sans-serif" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle">${count}</text>
    <text x="1064" y="150" font-family="Liberation Sans, Arial, sans-serif" font-size="17" font-weight="600" letter-spacing="2" fill="${d.color}" text-anchor="middle">CERTS</text>
  </g>
</svg>`;
}

const HEAD_STYLE = fs.readFileSync(path.join(ROOT, 'tech-universe/index.html'), 'utf8')
  .match(/<style>[\s\S]*?<\/style>/)[0];

function pageHtml(d, count, bosses){
  const url = `https://certquests.com/tech-universe/${d.id}/`;
  const name = xml(d.name);   // escape & in "Data & AI" / "DevOps & Containers"
  const title = `${name} certifications map — the ${name} constellation · CertQuests`;
  const desc = `${count} ${name} certifications as an explorable constellation, from foundational to boss tier. Light up the ones you conquer. ${xml(d.tag)}.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />

  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="${name} certification map, ${name} certification roadmap, ${name} skill tree, IT certification galaxy" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${name} constellation — your ${name} certification map" />
  <meta property="og:description" content="${count} ${name} certs as one galaxy. Light up the ones you conquer. Free." />
  <meta property="og:image" content="https://certquests.com/src/assets/og/tech-universe-${d.id}.png?v=${CACHE_V}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/src/styles/main.css?v=${CACHE_V}" />
  <link rel="stylesheet" href="/src/styles/desktop.css?v=${CACHE_V}" />

  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Home","item":"https://certquests.com/"},
    {"@type":"ListItem","position":2,"name":"Tech Universe","item":"https://certquests.com/tech-universe/"},
    {"@type":"ListItem","position":3,"name":"${d.name}","item":"${url}"}]}
  </script>

  ${HEAD_STYLE}
</head>
<body>
  <a href="#main-content" class="skip-to-main" style="position:absolute;left:-9999px;top:8px;z-index:9999;background:#3b82f6;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none" onfocus="this.style.left='16px'" onblur="this.style.left='-9999px'">Skip to main content</a>

  <header class="web-header">
    <a href="/" class="web-header-logo">
      <img src="/src/assets/icons/favicon-96.png?v=4" alt="CertQuests" class="web-header-bolt" width="32" height="32">
      CertQuests
    </a>
    <nav class="web-header-links" aria-label="Main navigation">
      <a href="/path.html" class="web-header-link-new">Cert Quest<span class="web-header-link-pill">NEW</span></a>
      <a href="/certifications/">Certifications</a>
      <a href="/courses/">Courses</a>
      <a href="/careers/">Careers</a>
    </nav>
  </header>

  <main id="main-content" class="tu-page">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="/tech-universe/">Tech Universe</a><span>/</span>${name}
    </nav>

    <section class="tu-hero">
      <h1>${name} <span class="grad">constellation</span></h1>
      <p>${count} ${name} certifications charted as one constellation — foundational stars through Pro-tier bosses, linked by progression. Conquer a cert and its star lights up. Part of the <a href="/tech-universe/" style="color:#7c90ae">CertQuests Tech Universe</a>.</p>
    </section>

    <div id="tu-root"><div class="tu-state">Charting the ${name} constellation…</div></div>
  </main>

  <footer class="web-footer">
    <div class="web-footer-inner">
      <div class="web-footer-links">
        <a href="/">Home</a>
        <a href="/tech-universe/">Tech Universe</a>
        <a href="/certifications/">Training</a>
        <a href="/path.html">Cert Quest</a>
        <a href="/roadmap/">My roadmap</a>
        <a href="/contact.html">Contact</a>
      </div>
      <div class="web-footer-text">CertQuests — Free IT certification practice tests</div>
    </div>
  </footer>

  <script>window.__TU_DOMAIN = ${JSON.stringify(d.id)};</script>
  <script src="/tech-universe/tu.js?v=${CACHE_V}" defer></script>
  <script src="/src/cq-core.js?v=${CACHE_V}" defer></script>
  <script src="/src/mascot-loader.js?v=${CACHE_V}" defer></script>
</body>
</html>
`;
}

async function main(){
  const { c, boss } = countDomains();
  const ogDir = path.join(ROOT, 'src/assets/og');
  for (const d of DOMAINS){
    const count = c[d.id], bosses = boss[d.id];
    // OG PNG
    const png = await sharp(Buffer.from(ogSvg(d, count, bosses))).png().toBuffer();
    fs.writeFileSync(path.join(ogDir, `tech-universe-${d.id}.png`), png);
    // subpage
    const dir = path.join(ROOT, 'tech-universe', d.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(d, count, bosses));
    console.log(`✓ ${d.id}: ${count} certs (${bosses} boss) → OG + /tech-universe/${d.id}/`);
  }
  console.log(`\nDone. Cache version baked: v${CACHE_V}.`);
}
main().catch(e => { console.error(e); process.exit(1); });
