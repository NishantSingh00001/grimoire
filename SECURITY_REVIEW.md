# Security review — Grimoire

Audited against the standard "vibe-code" checklist: secrets in frontend code,
data access without rules, unlimited uploads, paid features unchecked on the
server, uncapped AI/agent endpoints.

| Check | Status | Notes |
|---|---|---|
| **Secrets in frontend code** | Pass | No API key, token, or credential is hardcoded anywhere in `index.html`, `css/`, or `js/`. The AI provider key is typed in by the person using the page and stored only in their own browser's `localStorage`, under a key namespaced per provider (e.g. `grimoire_gemini_key`). It is never sent anywhere except directly to that provider's own API endpoint. |
| **Data access without rules** | N/A | There is no database and no backend. The only persisted data is the decode history, stored client-side in `localStorage`, scoped to the visitor's own browser. |
| **Unlimited uploads** | N/A | No file upload exists. The optional "context" field is a plain `<textarea>`, capped client-side to the first 6,000 characters before being included in the prompt. |
| **Paid features unchecked on the server** | N/A | There is no server, so there is nothing to bypass. Every AI call is billed directly to the API key the visitor supplied, under that provider's own account and rate limits. |
| **Uncapped AI/agent endpoint** | Pass (by design) | Every AI call requires a key the visitor pasted in themselves. There is no shared or embedded key anyone else's usage could run up a bill against. Each call has a 60-second client-side timeout. |

## What this means for deployment

Because there's no backend, **this project cannot leak a secret of ours** —
there isn't one. But it also means:

- If you deploy this somewhere public (GitHub Pages, Vercel, etc.) and you
  yourself paste a real API key into the page to test it, that key sits in
  your browser's `localStorage` on that device only — it is not bundled
  into the deployed files, committed, or sent to any server of ours.
- Don't use a "throwaway" page like this for a key tied to meaningful spend
  without a cap on that provider's dashboard. A browser extension, a shared
  computer, or a bug in the browser is a more realistic risk than anything
  in this codebase.
- If you want to let *other people* use this without each of them owning an
  API key, you need a real backend that holds the key server-side and rate-
  limits requests per user — this static version intentionally does not do
  that.

## Hardening already in place

- `.gitignore` excludes `.env` and `.env.*` so a future server-side addition
  (should one ever be built on top of this) doesn't accidentally get
  committed.
- A gitleaks GitHub Action (`.github/workflows/gitleaks.yml`) scans every
  push and pull request for accidentally committed secrets.
- `CLAUDE.md` carries a standing security-rules block so any AI-assisted
  changes to this repo keep following the same rules.
