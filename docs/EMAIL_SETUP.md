# Email cheatsheet + newsletter — setup checklist

This wires the **post-quiz cheatsheet email** and the **newsletter signup** to
Brevo. Total time: **~10 minutes** of clicking. No CLI needed.

> ⚠️ **Before anything else:** the SMTP key you previously shared in chat is
> **compromised** and must be revoked. Step 1 below covers it.

---

## 1. Brevo — revoke leaked credentials & generate fresh ones

1. Log into [Brevo](https://app.brevo.com).
2. Go to **SMTP & API** (top-right menu → your name → SMTP & API).
3. **SMTP keys tab** → find the key starting with `xsmtpsib-1b7431b1…` →
   click the trash / revoke icon. *(SMTP isn't used by this integration; we
   call the HTTP API instead. But the leaked key must die.)*
4. Switch to the **API keys tab** → **Generate a new API key** →
   name it `certquests-worker` → **Copy** the value (`xkeysib-…`). You'll
   paste it once, in the Cloudflare dashboard.

## 2. Brevo — verify a sender email

Brevo refuses to send from unverified addresses.

1. **Senders, Domains & Dedicated IPs** → **Senders** tab → **Add a sender**.
2. Enter a real address you control (e.g. `hello@certquests.com`) and your
   display name (`CertQuests`).
3. Open the verification email Brevo sends and click the link.

## 3. Brevo — create the newsletter list

1. **Contacts** → **Lists** → **Add a new list**.
2. Name it (e.g. `CertQuests Newsletter`) → save.
3. Open the list → its **numeric ID** appears in the URL
   (`…/contact/list/123` → ID is `123`). Note it down.

## 4. Cloudflare — deploy the worker (web UI, no CLI)

1. Sign in to [Cloudflare dashboard](https://dash.cloudflare.com). If you
   don't have an account, free signup takes a minute.
2. Left sidebar → **Workers & Pages** → **Create** → **Hello World** template
   → name it `certquests-mail` → **Deploy**.
3. On the worker page → **Edit code** (top-right).
4. Open `worker/quiz-report-worker.js` from this repo, copy its full contents,
   paste over the default `worker.js` in the editor → **Deploy** (top-right).
5. Copy the worker URL shown at the top of the deploy panel
   (looks like `https://certquests-mail.<your-subdomain>.workers.dev`).

## 5. Cloudflare — set the 5 environment variables

Still on the worker page → **Settings** tab → **Variables and Secrets** →
**Add variable**. Add each of these:

| Name | Type | Value |
|---|---|---|
| `BREVO_API_KEY` | **Secret** (encrypt) | the `xkeysib-…` value from step 1.4 |
| `BREVO_LIST_ID` | Text | the numeric list ID from step 3.3 |
| `BREVO_SENDER_EMAIL` | Text | the address you verified in step 2 |
| `BREVO_SENDER_NAME` | Text | `CertQuests` |
| `ALLOWED_ORIGIN` | Text | `https://certquests.com` |

Click **Deploy** at the bottom so the new variables take effect.

## 6. Connect the site to the worker

Open `src/engine/emailReport.js` in this repo and set `REPORT_API_URL` to your
worker URL **with `/quiz-report` appended**:

```js
export const REPORT_API_URL = 'https://certquests-mail.<your-subdomain>.workers.dev/quiz-report';
```

Commit + push. GitHub Pages will redeploy automatically.

## 7. Smoke test

1. Open the site → take a 5-question quiz → finish on a question you answer
   wrong on purpose.
2. On the results screen, the **"Email me my cheatsheet"** card should
   appear. Enter your address, tick the newsletter checkbox, submit.
3. Within ~30 s you should receive the cheatsheet email.
4. In Brevo → **Contacts** → your list should show your address.
5. In Cloudflare → worker → **Logs** tab → should show a `200` for
   `/quiz-report`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Form is greyed out / "feature not configured" | `REPORT_API_URL` is still empty in `emailReport.js` | Step 6 |
| Worker returns 502 / "could not send" | Sender not verified, or wrong API key | Re-check steps 1.4 + 2 |
| Email never arrives | Check spam; check Brevo → Logs → Email events | Add `noreply@` SPF/DKIM via Brevo's domain authentication if landing in spam |
| Newsletter signup silently skipped | `BREVO_LIST_ID` missing or wrong | Step 5 |
| 429 "too many requests" | Built-in 1/min/IP rate limit | Wait 60 s — this is intentional |
| CORS error in browser console | `ALLOWED_ORIGIN` doesn't match the site origin (incl. scheme + no trailing slash) | Step 5, fix `ALLOWED_ORIGIN` |

## Costs

- **Brevo free tier:** 300 transactional emails/day + unlimited contacts. Far
  beyond CertQuests' current traffic.
- **Cloudflare Workers free tier:** 100,000 requests/day. Same — no concern.

## Maintenance notes

- The worker file is kept in `worker/quiz-report-worker.js` — version
  controlled, but **not auto-deployed**. After editing, repeat step 4.4
  (paste over the editor → Deploy).
- The Brevo API key lives **only** in the Cloudflare dashboard. Never commit
  it. Never paste it in chat.
- If you rotate the Brevo key, update only the Cloudflare secret — no code
  change needed.
