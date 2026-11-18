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

## 20-point pen-test checklist (2026-11-18)

Static, client-only, hash-routed app — no server, database, auth system, GraphQL, WebSockets,
SAML, or XML parsing. 19/20 don't apply for that reason.

| # | Check | Applies? | Finding |
|---|---|---|---|
| 1 | HTTP/2 Rapid Reset | No | No server of our own. |
| 2 | bcrypt 72-byte limit | No | No password hashing. |
| 3 | SAML signature bypass | No | No SAML. |
| 4 | nOAuth | No | No OAuth login. |
| 5 | GraphQL alias batching | No | No GraphQL. |
| 6 | TOTP replay | No | No 2FA. |
| 7 | ReDoS | No | The one regex that runs on AI-returned text (`/```(?:json)?\s*([\s\S]*?)```/i` in `app.js`, stripping a markdown code fence) uses a lazy quantifier with no nested repetition — not vulnerable to catastrophic backtracking. |
| 8 | JWT algorithm confusion | No | No JWTs. |
| 9 | HTTP request smuggling | No | No proxy/load balancer of our own. |
| 10 | Web cache poisoning | No | Static assets only, cached by URL. |
| 11 | Spoofed X-Forwarded-For | No | No server-side rate limiting — the only "rate limit" is the visitor's own API key quota with their provider. |
| 12 | Postgres views / RLS | No | No database. |
| 13 | Math.random() for security tokens | No | `Math.random()` is used only for the decorative background-skyline animation (`background.js`). There's no auth, session, or access token anywhere in the app for this to matter to. |
| 14 | Timing attacks on secret comparison | No | No secret comparison happens in this code — the visitor's API key is sent straight to the provider's own endpoint, never compared against anything locally. |
| 15 | Padding oracle | No | No encryption of cookies/tokens. |
| 16 | Server-side prototype pollution | No | No server. |
| 17 | Server-side template injection | No | No templating of any kind — `render.js` writes every AI-returned field with `textContent`/`createElement`, never `innerHTML`, so model output can't inject markup either. |
| 18 | XXE | No | No XML parsing. |
| 19 | Cross-site WebSocket hijacking | No | No WebSockets. |
| 20 | Unicode username normalization | No | No usernames/accounts. |

No fixes needed — nothing applicable needed one.
