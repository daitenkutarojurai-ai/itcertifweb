# Email cheatsheet + newsletter — setup

The post-quiz cheatsheet email and newsletter signup go through a separate
Cloudflare Worker living in the **`daitenkutarojurai-ai/IT-certif`** repo,
deployed to `https://itcertifweb.daitenkutarojurai.workers.dev`.

> ⚠️ **The Cloudflare ↔ GitHub auto-deploy was disconnected** (April 2026).
> Pushing to `main` no longer redeploys the worker. After any worker change,
> deploy manually:
>
> ```bash
> cd ~/path/to/IT-certif
> npx wrangler login           # one-time
> npx wrangler deploy          # ships the worker live
> ```
>
> Reconnecting GitHub auto-deploy is also fine — Cloudflare dashboard →
> Workers → `itcertifweb` → Settings → Build → "Connect to Git".

## Sunday newsletter automation (cron)

The worker now runs a Cloudflare Cron Trigger every **Sunday 08:00 UTC**
(09:00 Paris winter / 10:00 Paris summer). It picks the rotation slot for
the current ISO week from `worker/content/newsletter-slots.json` (8 themed
issues), renders the `newsletter-weekly.html` template, and creates +
sends a Brevo campaign to `BREVO_LIST_ID`.

To extend or replace content: edit
`IT-certif/worker/content/newsletter-slots.json`, add or remove slots, then
`wrangler deploy`. Each slot fills the same template — tip + tricky
question + what-we-shipped — but the **subject line, lead theme, and
content rotate per week** (tactical-tip → tricky deep-dive → cert spotlight
→ vendor news → career path → exam pitfall → cert comparison → free
resources → loops back).

### Manual trigger (testing)

```bash
# Render slot 0 in the browser without sending
curl "https://itcertifweb.daitenkutarojurai.workers.dev/admin/send-newsletter?key=$ADMIN_KEY&slot=0&dry=1" \
     -X POST -o newsletter-preview.html
xdg-open newsletter-preview.html

# Actually send slot 3 to BREVO_LIST_ID right now
curl "https://itcertifweb.daitenkutarojurai.workers.dev/admin/send-newsletter?key=$ADMIN_KEY&slot=3" -X POST

# Send whatever slot the current ISO week resolves to (= what the cron would do)
curl "https://itcertifweb.daitenkutarojurai.workers.dev/admin/send-newsletter?key=$ADMIN_KEY" -X POST
```

`ADMIN_KEY` is a worker secret. Rotate it with
`echo <new-key> | npx wrangler secret put ADMIN_KEY` from the IT-certif
repo.

## Email templates

The actual HTML templates the worker renders live in
[`docs/email-templates/`](email-templates/README.md):

- [`cheatsheet-report.html`](email-templates/cheatsheet-report.html) — post-quiz cheatsheet
- [`newsletter-weekly.html`](email-templates/newsletter-weekly.html) — Sunday brief

Both are self-contained: open them in a browser to preview with sample
data. The worker just runs a `{{var}}` replace at send time.

## Where the signup is wired

The same `/quiz-report` endpoint handles both flows:

| Flow | Where | Payload |
|---|---|---|
| Cheatsheet (post-quiz, ≥1 wrong) | `src/screens/results.js` | `{email, subscribe, wrong:[…], …}` |
| Newsletter-only on perfect score | `src/screens/results.js` (form flips to "Subscribe") | `{email, subscribe:true, wrong:[]}` |
| Home-screen newsletter card | `src/screens/home.js` (dismissible, hides once subscribed) | `{email, subscribe:true, wrong:[]}` |
| Marketing page footer signup | `index.html` (inline `<script>`) | `{email, subscribe:true, wrong:[]}` |

Newsletter-only signups send `wrong:[]`; the worker treats an empty
`wrong[]` as "skip the cheatsheet email" and only adds the contact to Brevo.

This doc lists what to do **in this repo** (`itcertifweb`) and **in that
repo** (`IT-certif`) to get the feature live.

> ⚠️ **Reminder:** the SMTP key once shared in chat (`xsmtpsib-1b7431b1…`) is
> compromised. Revoke it in **Brevo → SMTP & API → SMTP keys**. This worker
> uses the **HTTP API** (different key), so the SMTP key isn't needed at all.

---

## In `IT-certif` (the worker repo)

### 1. Drop in the worker source

Create / replace these two files (contents printed in the chat that produced
this doc, or copy from the canonical version pinned alongside this commit):

- `src/index.js` — the worker (POST `/quiz-report`)
- `wrangler.toml` — wrangler config

Then run `npx wrangler deploy` from inside the `IT-certif` repo. (The
GitHub auto-deploy is currently disconnected — see the box at the top.)

**Worker contract:**
- Accepts `POST /quiz-report` with JSON body containing
  `{email, subscribe, wrong:[…]}` plus a few quiz-context fields.
- If `wrong.length > 0` → renders + sends a cheatsheet email via Brevo.
- If `subscribe === true` → adds the email to the Brevo list `BREVO_LIST_ID`.
- If `wrong:[]` AND `subscribe:true` → newsletter-only signup, no cheatsheet.
- 1 request / minute / IP rate limit (Cloudflare KV).
- CORS: only origins listed in `ALLOWED_ORIGIN` may POST.

### 2. Set environment variables on the worker

Cloudflare dashboard → **Workers & Pages → itcertifweb → Settings →
Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `BREVO_API_KEY` | **Secret** | already set ✅ |
| `BREVO_SENDER_EMAIL` | Text | verified sender, e.g. `hello@certquests.com` |
| `BREVO_SENDER_NAME` | Text | `CertQuests` |
| `BREVO_LIST_ID` | Text | numeric newsletter list ID |
| `ALLOWED_ORIGIN` | Text | comma-separated origins — see below |

**`ALLOWED_ORIGIN` for a Capacitor app needs multiple origins.** Recommended:

```
https://certquests.com,https://www.certquests.com,capacitor://localhost,https://localhost,http://localhost
```

(`capacitor://localhost` = iOS, `https://localhost` / `http://localhost` =
Android, the rest are the web build.)

Re-deploy from the dashboard so the new vars take effect.

---

## In Brevo

### 3. Verify a sender

**Senders, Domains & Dedicated IPs → Senders → Add a sender** → enter the
address you'll use as `BREVO_SENDER_EMAIL` → click the verification link
Brevo emails you. Brevo refuses to send from unverified addresses.

(Optional but recommended for deliverability: also authenticate the *domain*
under **Domains** → adds SPF + DKIM, keeps your emails out of spam.)

### 4. Create the newsletter list

**Contacts → Lists → Add a new list** → name it (e.g. `CertQuests
Newsletter`) → save. The numeric ID appears in the URL
(`/contact/list/123` → ID is `123`). That's `BREVO_LIST_ID`.

---

## In this repo (`itcertifweb`)

### 5. Wire the frontend to the worker

Open `src/engine/emailReport.js` and set `REPORT_API_URL`:

```js
export const REPORT_API_URL = 'https://itcertifweb.daitenkutarojurai.workers.dev/quiz-report';
```

Commit + push. GitHub Pages redeploys automatically. The disabled email card
on the results screen flips to active.

---

## Smoke test

1. Open the site → take a 5-question quiz → answer at least one wrong on
   purpose.
2. On the results screen, the **"Email me my cheatsheet"** card appears.
3. Submit with your address + newsletter checkbox ticked.
4. Within ~30 s, the cheatsheet email arrives.
5. Brevo → **Contacts → CertQuests Newsletter** → your address is listed.
6. Cloudflare → **itcertifweb → Logs** → `200` for `POST /quiz-report`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Form is greyed out | `REPORT_API_URL` empty | Step 5 |
| 502 / "could not send" + Brevo status in body | Sender unverified or wrong API key | Step 3 + check secret |
| Email lands in spam | Domain not authenticated | Step 3 — add SPF/DKIM via Brevo's domain auth |
| Newsletter signup silently failed | `BREVO_LIST_ID` missing/wrong | Step 2 |
| 429 from worker | Built-in 1/min/IP rate limit | Wait 60 s |
| CORS error in browser console | `ALLOWED_ORIGIN` doesn't include the request origin (note: scheme + host, no trailing slash, no path) | Step 2 |
| Capacitor app fails CORS but web works | `capacitor://localhost` / `https://localhost` not in `ALLOWED_ORIGIN` | Step 2 |

## Costs

- **Brevo free tier:** 300 transactional emails/day + unlimited contacts.
- **Cloudflare Workers free tier:** 100,000 requests/day.

Well within current traffic.

## Why two repos?

The site (`itcertifweb`, this repo) ships to GitHub Pages — pure static.
The worker (`IT-certif`) is server-side code with secrets, which can't live
in a static repo. Keeping them separate also means the worker can be reused
later (mobile push, SMS, etc.) without entangling it with the site build.
