# Grimoire — Decode Any Link

Paste a GitHub repo or a website link and Grimoire asks an AI model to explain
it: what it is, how it was built, how it works, with an architecture diagram
and a flow diagram — in deep technical language ("Wizard-born") or in plain,
non-technical language ("Muggle London").

No backend, no build step. It's a static site: open `index.html`, or serve
the folder with any static file server.

## Features

- **Two reading modes** — a technical explanation and a plain-language one,
  each with its own animated atmospheric background (starlit library vs.
  rainy city skyline) and its own diagrams.
- **Architecture & flow diagrams** — rendered as SVG, laid out automatically
  from the AI's response, relabeled per mode.
- **Bring-your-own-key, any provider** — Google Gemini, Groq, OpenRouter,
  OpenAI, Mistral, or Anthropic Claude. Your key is stored only in your
  browser's `localStorage` and sent only to the provider you pick.
- **Library** — every decoded link is saved locally so you can reopen it
  without spending another API request.
- **Regenerate / Copy as Markdown / Download JSON** — re-run a decode, or
  take the result with you.
- **Keyboard shortcuts** — `/` focuses the link field, `Esc` goes back.

## Running it

Just open `index.html` in a browser. If your browser restricts local scripts,
serve it instead:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed URL.

## Project structure

```
index.html            Markup for all four pages (Home, Result, Library, Guide)
css/style.css          All styling: layout, the two themes, and the motion system
js/state.js            Shared app state (current mode, current result)
js/background.js       The two animated canvas backgrounds
js/diagrams.js         SVG architecture/flow diagram builder
js/history.js          localStorage-backed decode history ("Library")
js/router.js           Hash-based page routing
js/providers.js        AI provider configs + the fetch calls to each API
js/render.js           Renders a decoded result into the Result page
js/app.js              Glue: mode switching, decode flow, event wiring, init
js/motion.js           Scroll-reveal and pointer-tilt effects
```

Scripts load as plain `<script src>` tags, in dependency order, with no
bundler — so the project still runs by double-clicking `index.html`.

## Security notes

This is a client-only tool: your API key for whichever provider you choose
lives only in your browser's `localStorage`, and the only outbound request
Grimoire makes is the one call to that provider's own API when you click
Decode. There is no server of ours in the loop, so there is nothing of ours
to leak your key to.

That also means this page is **not safe to deploy publicly with a key baked
in** — anyone who opens dev tools can read whatever key is sitting in
`localStorage`, and a key you paste into a public deployment yourself is
effectively public. Use it:
- locally, or
- deployed somewhere only you (or people you trust) will open it and paste
  their own key, or
- behind a real backend that holds the key server-side, if you want to make
  this safe to share with a wider audience.

See `SECURITY_REVIEW.md` for the fuller audit.

## License

MIT — do whatever you like with it.
