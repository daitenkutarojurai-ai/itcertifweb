# Email cheatsheet + newsletter — setup

The post-quiz cheatsheet email and newsletter signup go through a separate
Cloudflare Worker living in the **`daitenkutarojurai-ai/IT-certif`** repo
(deployed via wrangler + GitHub Actions to
`https://itcertifweb.daitenkutarojurai.workers.dev`).

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

Push to `main`. The Cloudflare ↔ GitHub integration auto-deploys.

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
