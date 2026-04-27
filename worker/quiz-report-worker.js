/**
 * CertQuests — quiz-report worker
 * ────────────────────────────────────────────────────────────────────────────
 * Single-file Cloudflare Worker. Sends a personalized cheatsheet email via
 * Brevo's Transactional API and (optionally) subscribes the user to a Brevo
 * contact list.
 *
 * Deploy:
 *   1. Cloudflare dashboard → Workers & Pages → Create → "Hello World" worker
 *   2. Edit code → paste this file → Save & Deploy
 *   3. Settings → Variables and Secrets → add:
 *        BREVO_API_KEY        (secret) — your Brevo v3 API key (xkeysib-…)
 *        BREVO_LIST_ID        (text)   — numeric ID of your newsletter list
 *        BREVO_SENDER_EMAIL   (text)   — verified sender (e.g. hello@certquests.com)
 *        BREVO_SENDER_NAME    (text)   — display name (e.g. CertQuests)
 *        ALLOWED_ORIGIN       (text)   — e.g. https://certquests.com
 *   4. Copy the worker URL (xxxx.workers.dev) and paste it into
 *      src/engine/emailReport.js → REPORT_API_URL  (append /quiz-report)
 *
 * Endpoints:
 *   POST /quiz-report   { email, subscribe, results, packId, packName, mode, wrong[], … }
 *
 * Security notes:
 *   - Honeypot field (_hp) — bots that fill every field get rejected silently.
 *   - Per-IP rate limit (1 req/min) via caches.default.
 *   - All HTML escaping handled in renderCheatsheet().
 *   - Never log API keys or full request bodies.
 */

// ─── Config ────────────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_BODY_BYTES = 64 * 1024; // 64 KB hard cap — a malformed payload won't get through anyway
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const BREVO_TX_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';

// ─── Worker entrypoint ─────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    // Routing
    if (request.method === 'POST' && url.pathname === '/quiz-report') {
      return handleQuizReport(request, env, ctx);
    }

    return text('Not found', 404, env);
  },
};

// ─── /quiz-report handler ─────────────────────────────────────────────────────
async function handleQuizReport(request, env, ctx) {
  // Env sanity — fail loudly if misconfigured, but don't leak which var is missing.
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    return json({ ok: false, message: 'Server misconfigured.' }, 500, env);
  }

  // Body size guard
  const cl = Number(request.headers.get('content-length') || '0');
  if (cl > MAX_BODY_BYTES) {
    return json({ ok: false, message: 'Payload too large.' }, 413, env);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Invalid JSON.' }, 400, env);
  }

  // Honeypot — silently 200 so bots see no signal
  if (typeof body._hp === 'string' && body._hp.length > 0) {
    return json({ ok: true, message: 'Sent.' }, 200, env);
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ ok: false, message: 'Please enter a valid email address.' }, 400, env);
  }

  // Per-IP rate limit (1 request / 60s)
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const limited = await isRateLimited(ip);
  if (limited) {
    return json({ ok: false, message: 'Too many requests — try again in a minute.' }, 429, env);
  }

  // Build & send cheatsheet
  const html = renderCheatsheet(body);
  const subject = `Your ${escapeHtml(body.packName || 'CertQuests')} cheatsheet — ${Number(body.score) || 0}/${Number(body.total) || 0}`;

  try {
    await sendBrevoEmail(env, { to: email, subject, html });
  } catch (err) {
    return json({ ok: false, message: 'Could not send the report. Please try again later.' }, 502, env);
  }

  // Optional newsletter subscribe — failure here doesn't fail the whole request
  let subscribeNote = '';
  if (body.subscribe === true && env.BREVO_LIST_ID) {
    try {
      await subscribeToBrevoList(env, email);
    } catch {
      subscribeNote = ' (Newsletter signup hit a snag — we sent the email but you may need to retry the newsletter.)';
    }
  }

  // Mark this IP as used for the window — only after success, so failed
  // attempts don't lock out a real user.
  ctx.waitUntil(markRateLimit(ip));

  return json({ ok: true, message: 'Sent.' + subscribeNote }, 200, env);
}

// ─── Brevo: transactional email ────────────────────────────────────────────────
async function sendBrevoEmail(env, { to, subject, html }) {
  const res = await fetch(BREVO_TX_URL, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: env.BREVO_SENDER_EMAIL,
        name: env.BREVO_SENDER_NAME || 'CertQuests',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo email API ${res.status}`);
  }
}

// ─── Brevo: newsletter subscribe ──────────────────────────────────────────────
async function subscribeToBrevoList(env, email) {
  const res = await fetch(BREVO_CONTACTS_URL, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      email,
      listIds: [Number(env.BREVO_LIST_ID)],
      updateEnabled: true, // re-subscribing an existing contact must not 400
    }),
  });
  // 201 (created) and 204 (already exists, updated) are both fine.
  if (!res.ok && res.status !== 204) {
    throw new Error(`Brevo contacts API ${res.status}`);
  }
}

// ─── Cheatsheet HTML renderer ──────────────────────────────────────────────────
function renderCheatsheet(body) {
  const score = Number(body.score) || 0;
  const total = Number(body.total) || 0;
  const pct = Number(body.percentage) || (total > 0 ? Math.round((score / total) * 100) : 0);
  const packName = escapeHtml(body.packName || 'CertQuests');
  const wrong = Array.isArray(body.wrong) ? body.wrong : [];

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const itemsHtml = wrong.length === 0
    ? `<p style="color:#10b981;font-weight:600;margin:24px 0;">Perfect score — nothing to review. Bravo!</p>`
    : wrong.map((w, i) => {
        const correctIdx = Number(w.correct);
        const selectedIdx = Number(w.selected);
        const correctText = w.options?.[correctIdx] ?? '';
        const yourText = selectedIdx >= 0 ? (w.options?.[selectedIdx] ?? '') : '(no answer — time ran out)';
        const explanation = (w.explanation || '').trim();
        const tip = explanation
          ? `<div style="margin-top:8px;padding:10px 12px;background:#f1f5f9;border-left:3px solid #3b82f6;border-radius:6px;font-size:13.5px;line-height:1.5;color:#334155">
               <strong style="color:#3b82f6;font-size:11px;letter-spacing:0.08em;text-transform:uppercase">Why</strong><br/>
               ${escapeHtml(explanation)}
             </div>`
          : '';

        return `
          <div style="margin:0 0 18px;padding:14px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;color:#94a3b8;text-transform:uppercase;margin-bottom:6px">Question ${i + 1}${w.difficulty ? ` · ${escapeHtml(String(w.difficulty))}` : ''}</div>
            <div style="font-size:14.5px;font-weight:600;color:#0f172a;line-height:1.45;margin-bottom:10px">${escapeHtml(w.question || '')}</div>
            <div style="font-size:13.5px;color:#dc2626;margin-bottom:4px"><strong>You:</strong> ${escapeHtml(yourText)}</div>
            <div style="font-size:13.5px;color:#10b981"><strong>Correct (${LETTERS[correctIdx] || '?'}):</strong> ${escapeHtml(correctText)}</div>
            ${tip}
          </div>
        `;
      }).join('');

  const grade = pct >= 80 ? 'Excellent — you\'re close to exam-ready.'
    : pct >= 60 ? 'Solid foundation — review the items below and try again.'
    : pct >= 40 ? 'Keep going — focus on the topics below for your next session.'
    : 'Build the basics first — work through the course, then re-take the quiz.';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${packName} cheatsheet</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:#3b82f6;text-transform:uppercase;margin-bottom:8px">CertQuests · Cheatsheet</div>
      <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px">${packName}</h1>
      <div style="font-size:14px;color:#64748b">${score}/${total} correct · ${pct}%</div>
    </div>

    <div style="padding:16px 20px;background:#eff6ff;border-radius:12px;margin-bottom:24px;font-size:14px;line-height:1.5;color:#1e40af">
      ${grade}
    </div>

    ${wrong.length > 0 ? `<h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 14px;letter-spacing:-0.01em">Review — ${wrong.length} question${wrong.length === 1 ? '' : 's'} to revisit</h2>` : ''}
    ${itemsHtml}

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="font-size:13px;color:#64748b;margin:0 0 14px">Practice more on CertQuests — free certification quizzes.</p>
      <a href="https://certquests.com" style="display:inline-block;padding:11px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Continue practicing →</a>
    </div>

    <div style="margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5">
      You're receiving this because you requested a cheatsheet on certquests.com.<br>
      No further automated emails will be sent unless you opted into the newsletter.
    </div>
  </div>
</body>
</html>`;
}

// ─── Rate limit (per IP, via the edge cache) ───────────────────────────────────
function rateLimitRequest(ip) {
  return new Request(`https://rl.certquests.invalid/${encodeURIComponent(ip)}`);
}

async function isRateLimited(ip) {
  const cached = await caches.default.match(rateLimitRequest(ip));
  return !!cached;
}

async function markRateLimit(ip) {
  const res = new Response('1', {
    headers: { 'cache-control': `public, max-age=${RATE_LIMIT_WINDOW_SECONDS}` },
  });
  await caches.default.put(rateLimitRequest(ip), res);
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
}

function json(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(env) },
  });
}

function text(body, status, env) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...corsHeaders(env) },
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
