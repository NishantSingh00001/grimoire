# Grimoire — notes for Claude

Static, client-only multi-page app (hash-routed). No build step, no backend.
See `README.md` for structure and `SECURITY_REVIEW.md` for the security audit.

## Security rules for this repo

- Never hardcode an API key, token, or credential anywhere in `index.html`,
  `css/`, or `js/`. Every AI provider key is supplied by the person using the
  page and lives only in their browser's `localStorage`.
- Don't add a backend that forwards requests using a shared/embedded key
  without per-user rate limiting and auth — that turns a bring-your-own-key
  tool into an uncapped AI endpoint billed to one party.
- Keep `.env` and `.env.*` out of version control (already in `.gitignore`)
  if a server-side piece is ever added on top of this.
- Run the gitleaks check (`.github/workflows/gitleaks.yml`) on every push;
  don't disable it to get a commit through.
- Before adding any new feature that touches storage, uploads, or paid
  AI calls, re-check it against the five standard vibe-code mistakes
  (secrets in frontend code, data access without rules, unlimited uploads,
  paid features unchecked on the server, uncapped AI/agent endpoints) and
  update `SECURITY_REVIEW.md` if the answer to any of them changes.
