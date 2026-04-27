# Email templates

Two production-ready HTML email templates for the CertQuests Cloudflare
Worker (`itcertifweb` — repo: `daitenkutarojurai-ai/IT-certif`).

| File | When sent | Why it exists |
|---|---|---|
| [`cheatsheet-report.html`](cheatsheet-report.html) | Right after a user submits their email on the post-quiz results screen (≥1 wrong answer) | Useful recap **and** a 7-day retry hook to bring them back |
| [`newsletter-weekly.html`](newsletter-weekly.html) | Every Sunday morning to all newsletter subscribers | Build a weekly habit; the "tricky question · reveal answer" CTA is the #1 click that pulls subscribers back to the site |

## Preview

Open either file directly in a browser — both render standalone with
realistic sample data. The placeholder `{{var}}` markers are visible in
the source but most are pre-filled with sample text in the HTML so the
preview is faithful.

```bash
xdg-open docs/email-templates/cheatsheet-report.html
xdg-open docs/email-templates/newsletter-weekly.html
```

## Wiring into the worker

The worker (`IT-certif/src/index.js`) currently ships with an inline
template string. Replace that with a fetch + render of these files, or
copy them into the worker repo and embed the HTML as a JS string. The
simplest approach:

1. Copy the two HTML files into `IT-certif/src/templates/`.
2. Embed each as a string constant (e.g. `import report from './templates/cheatsheet-report.html'` if your bundler supports it, or just inline as a tagged template literal).
3. Render with a one-line replace:

   ```js
   function render(tpl, vars) {
     return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
   }
   ```

4. For dynamic blocks (`{{wrongCards}}`, `{{trickyOptionsHtml}}`,
   `{{newPacksHtml}}`), build the HTML server-side by iterating over the
   payload and concatenating per-row markup — the templates contain a
   commented-out *card template* and *option row template* you can copy
   into the worker as helper functions.

5. Send via Brevo's transactional API:

   ```js
   await fetch('https://api.brevo.com/v3/smtp/email', {
     method: 'POST',
     headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
     body: JSON.stringify({
       sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
       to: [{ email: payload.email }],
       subject: `Your ${payload.percentage}% — here&rsquo;s what to lock in`,
       htmlContent: render(report, vars),
     }),
   });
   ```

## Required placeholders

### `cheatsheet-report.html`

| Placeholder | Type | Notes |
|---|---|---|
| `{{firstName}}` | string | Falls back to `there` |
| `{{packName}}` | string | e.g. `AWS Solutions Architect Associate (SAA-C03)` |
| `{{score}}` / `{{total}}` / `{{percentage}}` | number | |
| `{{gradeLabel}}` | string | `Excellent` / `Pass` / `Almost there` / `Keep studying` |
| `{{gradeColor}}` | hex | `#10b981` / `#3b82f6` / `#f59e0b` / `#f43f5e` matching the label |
| `{{wrongCount}}` | number | ≥ 1 |
| `{{wrongCountPlural}}` | string | `''` if `wrongCount === 1`, otherwise `s` |
| `{{wrongCards}}` | HTML | server-rendered, see *card template* in the file header |
| `{{retryUrl}}` | URL | `https://certquests.com/?pack=<id>&autostart=1` |
| `{{nextRetryDate}}` | string | `T+7d` formatted human-readable |
| `{{siteUrl}}` | URL | `https://certquests.com` |
| `{{unsubscribeUrl}}` | URL | Brevo provides one per recipient |
| `{{currentYear}}` | number | |

### `newsletter-weekly.html`

| Placeholder | Type | Notes |
|---|---|---|
| `{{firstName}}` | string | |
| `{{date}}` | string | `Sunday, May 5 2026` |
| `{{weekNumber}}` | number | ISO week or sequential issue number |
| `{{tipTitle}}`, `{{tipBody}}` | string | One actionable tactic |
| `{{trickyPack}}`, `{{trickyDifficulty}}` | string | Tricky-question metadata |
| `{{trickyQuestion}}` | string | Stem text |
| `{{trickyOptionsHtml}}` | HTML | Four `<tr>` rows, no answer marked — the reveal happens on the site |
| `{{trickyRevealUrl}}` | URL | `https://certquests.com/?qotw=<id>` page that shows the answer + 4 related questions |
| `{{newPacksHtml}}` | HTML | 0–3 new-pack rows; can be empty |
| `{{streakLine}}` | string | Optional personalised line; `''` if user has no streak |
| `{{takeQuizUrl}}` | URL | `https://certquests.com/` |
| `{{communityCount}}` | string | `1,247` (formatted) |
| `{{siteUrl}}`, `{{unsubscribeUrl}}`, `{{currentYear}}` | as above | |

## Subject-line ideas

These templates work with any subject line, but here are some that pair
well with the marketing intent:

**Cheatsheet report**
- `Your {{percentage}}% — here&rsquo;s what to lock in`
- `{{wrongCount}} questions to nail before your next attempt`
- `Beat your {{percentage}}% in 5 minutes`

**Newsletter**
- `🎯 The Sunday brief — {{date}}`
- `One tricky question, four minutes`
- `Your weekly cert reset · {{date}}`

## Email client coverage

Tested visual patterns work in: Gmail (web/iOS/Android), Apple Mail,
iOS Mail, Outlook 2016+/365, Outlook.com, Yahoo Mail.

Notes:
- Gradients render natively in webkit-based clients; Outlook desktop
  shows the fallback solid color (`#0f172a`) — still on-brand.
- The mobile media query is inside `<style>` in `<head>`. Gmail strips
  this in some flows but the layout already stacks gracefully without it
  thanks to `width="100%"` on the container.
- No web fonts loaded (relies on system stack `-apple-system, ...`) —
  consistent rendering, zero blocked images, faster delivery.
- No remote images — everything is text + CSS, so nothing breaks if
  images are blocked by default.
