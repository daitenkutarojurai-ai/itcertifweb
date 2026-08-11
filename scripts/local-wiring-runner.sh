#!/usr/bin/env bash
#
# Keeps the GitHub Pages deploy green by repairing the wiring the content
# agents forget, from this machine.
#
#   scripts/local-wiring-runner.sh            # repair, commit and push if needed
#   scripts/local-wiring-runner.sh --dry-run  # say what it would repair, push nothing
#
# WHY THIS EXISTS
# `.github/workflows/static.yml` gates the deploy on `npm test` +
# `npm run audit-content`. A red audit means the push landed on main and
# certquests.com did not change — silently, with no error anywhere an agent can
# see. That froze the site for five weeks (2026-07-05 → 2026-08-10), and it
# came back the very next day: three content commits, audit red again, site
# stuck. The gaps are mechanical (a pack with no learning path, a news page
# missing from the feed, a brand with no page, a page missing from the
# sitemap), so `scripts/wire-content.mjs` repairs them and this runner applies
# the repair on a schedule.
#
# Installed as a cron job — see `crontab -l`.

set -uo pipefail

REPO="/home/flammeur/webitcertif"
STATE_DIR="${HOME}/.local/state/certquests"
LOG="${STATE_DIR}/wiring-runner.log"
LOCK="${STATE_DIR}/wiring-runner.lock"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

mkdir -p "$STATE_DIR"

NODE_BIN="$(ls -d "${HOME}"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)"
export PATH="${NODE_BIN}:/usr/local/bin:/usr/bin:/bin"

say() { printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG"; }

if [[ -f "$LOG" ]] && (( $(stat -c%s "$LOG") > 2000000 )); then
  tail -c 500000 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
fi

exec 9>"$LOCK"
if ! flock -n 9; then
  say "another run holds the lock — skipping"
  exit 0
fi

cd "$REPO" || { say "FATAL repo missing: $REPO"; exit 1; }

if [[ -n "$(git status --porcelain)" ]]; then
  say "working tree is dirty — refusing to touch it:"
  git status --porcelain | tee -a "$LOG"
  exit 1
fi

git checkout main >>"$LOG" 2>&1
git pull --rebase origin main >>"$LOG" 2>&1 || { say "FATAL pull failed"; exit 1; }

if npm test >>"$LOG" 2>&1 && npm run audit-content >>"$LOG" 2>&1; then
  say "audit green at $(git rev-parse --short HEAD) — nothing to repair"
  exit 0
fi

say "=== audit red at $(git rev-parse --short HEAD) — repairing ==="
if (( DRY_RUN )); then
  node scripts/wire-content.mjs --check 2>&1 | tee -a "$LOG"
  exit 0
fi

node scripts/wire-content.mjs 2>&1 | tee -a "$LOG"

# The repair is only worth pushing if it actually clears the gate. Tests too:
# gen-paths rewrites every path file, and a bank change can surface there.
if ! npm test >>"$LOG" 2>&1; then
  say "FATAL tests fail after repair — leaving the tree alone for a human"
  git checkout -- . >>"$LOG" 2>&1
  exit 1
fi
if ! npm run audit-content >>"$LOG" 2>&1; then
  say "repair incomplete — what's left needs a human:"
  npm run audit-content 2>&1 | tail -20 | tee -a "$LOG"
  git checkout -- . >>"$LOG" 2>&1
  exit 1
fi

if [[ -z "$(git status --porcelain)" ]]; then
  say "audit passes now but nothing changed — nothing to commit"
  exit 0
fi

git add -A >>"$LOG" 2>&1
git commit -q -m "chore(wiring): recâblage automatique du contenu poussé sans index

Réparé par scripts/local-wiring-runner.sh : l'audit de câblage bloquait le
déploiement Pages, donc le site ne bougeait plus. Détail dans le journal
~/.local/state/certquests/wiring-runner.log.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" >>"$LOG" 2>&1

if git push origin main >>"$LOG" 2>&1; then
  say "=== repaired and pushed — $(git rev-parse --short HEAD) ==="
else
  say "FATAL push failed (someone else pushed first?) — retry next run"
  exit 1
fi
