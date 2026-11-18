/* ===================== App glue: mode switching, decode, wiring, init ===================== */

/* ---- Mode switching ---- */
function applyMode(mode){
  state.mode = mode;
  document.body.setAttribute('data-mode', mode);
  document.getElementById('btnMagic').classList.toggle('active', mode === 'magic');
  document.getElementById('btnMuggle').classList.toggle('active', mode === 'muggle');
  document.querySelector('.switch').setAttribute('data-active', mode);
  if(mode === 'magic') startMagic(); else startMuggle();
  if(state.data) render();
}

/* ---- Status helper ---- */
var statusEl, statusText;
function setStatus(text, kind){
  statusText.textContent = text || '';
  statusEl.classList.remove('loading','error');
  if(kind) statusEl.classList.add(kind);
}
function setLoadingStatus(text){
  statusText.textContent = text || '';
  statusEl.classList.remove('error');
  statusEl.classList.add('loading');
}

/* ---- Decode prompt schema ---- */
var SCHEMA_PROMPT = [
  'You are decoding a software project from a link (and optional pasted context) for an interactive explainer page.',
  'Reason from what you already know about the link, plus any pasted context given. If you are not confident about specifics, give a reasonable best-effort reading based on the name, platform, file names and any context, and keep claims general rather than inventing precise false detail.',
  'Respond with ONLY a single JSON object, no prose outside it, no markdown fences, matching exactly this shape:',
  '{',
  ' "name": "short project name",',
  ' "tagline": "one sentence, what it is",',
  ' "tech": ["3-7 short tech/stack tags"],',
  ' "magic": {',
  '   "overview": "2-4 sentences, technical, precise, assumes an engineer reader",',
  '   "how_built": "2-4 sentences on stack, tooling, build/deploy choices",',
  '   "how_it_works": "3-5 sentences on the actual runtime mechanics / request lifecycle / data flow",',
  '   "deep_dive": ["4-6 short bullet points: notable patterns, trade-offs, or technical decisions worth knowing"]',
  ' },',
  ' "muggle": {',
  '   "overview": "2-3 sentences, zero jargon, what it does for a person using it",',
  '   "how_built": "1-3 plain sentences on how it came together, no technical terms",',
  '   "how_it_works": "2-4 plain sentences, as if explaining to a curious non-technical friend",',
  '   "analogy": "one short everyday analogy that captures the core idea"',
  ' },',
  ' "architecture": {',
  '   "nodes": [ {"id":"short_id", "magic":"technical component name (e.g. \\"API Gateway\\")", "muggle":"plain-language version (e.g. \\"Front Door\\")"} ],',
  '   "edges": [ {"from":"id", "to":"id", "magic":"technical relationship (e.g. \\"REST over HTTPS\\")", "muggle":"plain version (e.g. \\"asks for info\\")"} ]',
  ' },',
  ' "flow": {',
  '   "steps": [ {"magic":"technical step describing what happens", "muggle":"same step in plain words"} ]',
  ' }',
  '}',
  'Use 4-8 architecture nodes and 4-7 flow steps, ordered sensibly. Keep every label under 60 characters. Keep "id" values short, lowercase, no spaces.'
].join('\n');

function extractJson(text){
  if(!text) return null;
  var cleaned = text.trim();
  var fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fence) cleaned = fence[1].trim();
  var first = cleaned.indexOf('{'); var last = cleaned.lastIndexOf('}');
  if(first === -1 || last === -1) return null;
  cleaned = cleaned.slice(first, last+1);
  try { return JSON.parse(cleaned); } catch(e){ return null; }
}

/* ---- Decode ---- */
var decodeBtn, linkInput;

function runDecode(link, context, opts){
  opts = opts || {};
  decodeBtn.disabled = true;
  var loadingLines = ['Reading the arcane signatures…', 'Still working — tracing the architecture…', 'Nearly there — drawing the diagrams…'];
  var loadingStep = 0;
  setLoadingStatus(opts.regenerate ? 'Regenerating…' : loadingLines[0]);
  var loadingTimer = setInterval(function(){
    loadingStep = Math.min(loadingStep + 1, loadingLines.length - 1);
    setLoadingStatus(loadingLines[loadingStep]);
  }, 9000);

  var userMsg = 'Link: ' + link + (context ? ('\n\nAdditional context pasted by the user:\n' + context.slice(0, 6000)) : '');

  return callAI(SCHEMA_PROMPT + '\n\n' + userMsg).then(function(res){
    var parsed = extractJson(res && res.text);
    if(!parsed){
      setStatus('Could not make sense of the response. Try again, or paste in a bit more context.', 'error');
      return;
    }
    state.data = parsed;
    state.currentLink = link;
    addToHistory(link, parsed);
    applyMode(state.mode);
    render();
    setStatus('Decoded.');
    goTo('result');
  }).catch(function(err){
    console.error('Grimoire: decode failed — code=' + (err && err.code) + ' message=' + (err && err.message) + ' raw=' + JSON.stringify(err));
    var msg = (err && err.code === 'no_key') ? (err.message || 'Add an API key for the selected provider first.')
      : (err && err.code === 'rate_limited') ? 'Too many requests right now — wait a moment and try again.'
      : (err && err.code === 'bad_key') ? ((PROVIDERS[activeProvider].label) + ' rejected the key — check it and make sure API access is enabled.')
      : (err && err.code === 'timeout') ? err.message
      : (err && err.code === 'network') ? err.message
      : (err && err.message) ? err.message
      : 'Something went wrong decoding that link — open the browser console (F12) for details.';
    setStatus(msg, 'error');
  }).finally(function(){
    clearInterval(loadingTimer);
    decodeBtn.disabled = false;
    statusEl.classList.remove('loading');
  });
}

function decode(){
  var link = linkInput.value.trim();
  if(!link){ setStatus('Paste a link first.', 'error'); linkInput.focus(); return; }
  var context = document.getElementById('context').value.trim();
  runDecode(link, context);
}

/* ---- Feature: regenerate current result ---- */
function regenerateCurrent(){
  if(!state.currentLink) return;
  var context = document.getElementById('context').value.trim();
  runDecode(state.currentLink, context, { regenerate:true });
}

/* ---- Feature: copy result as Markdown ---- */
function resultToMarkdown(){
  var d = state.data; if(!d) return '';
  var mode = state.mode;
  var block = mode === 'magic' ? d.magic : d.muggle;
  var lines = [];
  lines.push('# ' + (d.name || 'Decoded project'));
  if(d.tagline) lines.push('\n' + d.tagline);
  if(d.tech && d.tech.length) lines.push('\n**Stack:** ' + d.tech.join(', '));
  lines.push('\n## What it is\n' + ((block && block.overview) || ''));
  lines.push('\n## How it was built\n' + ((block && block.how_built) || ''));
  lines.push('\n## How it works\n' + ((block && block.how_it_works) || ''));
  if(mode === 'muggle' && d.muggle && d.muggle.analogy){
    lines.push('\n> Think of it like this — ' + d.muggle.analogy);
  }
  if(mode === 'magic' && d.magic && d.magic.deep_dive && d.magic.deep_dive.length){
    lines.push('\n## Notable details');
    d.magic.deep_dive.forEach(function(pt){ lines.push('- ' + pt); });
  }
  if(d.flow && d.flow.steps && d.flow.steps.length){
    lines.push('\n## Flow');
    d.flow.steps.forEach(function(s, i){
      lines.push((i+1) + '. ' + (mode === 'magic' ? s.magic : (s.muggle || s.magic)));
    });
  }
  if(d.architecture && d.architecture.nodes && d.architecture.nodes.length){
    lines.push('\n## Architecture');
    d.architecture.nodes.forEach(function(n){
      lines.push('- ' + (mode === 'magic' ? (n.magic||n.id) : (n.muggle||n.magic||n.id)));
    });
  }
  lines.push('\n---\nDecoded from: ' + (state.currentLink || ''));
  return lines.join('\n');
}

function copyResultMarkdown(){
  var md = resultToMarkdown();
  if(!md) return;
  var done = function(){ flashStatus('Copied as Markdown.'); };
  var fail = function(){ flashStatus('Could not copy — your browser may block clipboard access here.', true); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(md).then(done, fail);
  } else {
    try {
      var ta = document.createElement('textarea');
      ta.value = md; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      done();
    } catch(e){ fail(); }
  }
}

/* ---- Feature: download raw JSON ---- */
function downloadResultJson(){
  var d = state.data; if(!d) return;
  var blob = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var safeName = (d.name || 'grimoire-result').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'grimoire-result';
  a.href = url; a.download = safeName + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  flashStatus('Downloaded ' + safeName + '.json');
}

/* small transient toast reusing the result-head status area via title attr fallback */
function flashStatus(msg, isError){
  var el = document.getElementById('resultFlash');
  if(!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#ff9a8a' : '';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.style.opacity = '0'; }, 2200);
}

/* ===================== Init: wire everything up, in order ===================== */
function initApp(){
  statusEl = document.getElementById('status');
  statusText = document.getElementById('statusText');
  decodeBtn = document.getElementById('decodeBtn');
  linkInput = document.getElementById('linkInput');

  document.getElementById('btnMagic').addEventListener('click', function(){ applyMode('magic'); });
  document.getElementById('btnMuggle').addEventListener('click', function(){ applyMode('muggle'); });
  startMagic();

  try {
    var rememberedProvider = localStorage.getItem('grimoire_provider');
    if(rememberedProvider && PROVIDERS[rememberedProvider]) activeProvider = rememberedProvider;
  } catch(e){}
  loadProvider(activeProvider);
  providerSelect.addEventListener('change', function(){
    saveCurrentProvider();
    loadProvider(providerSelect.value);
  });
  apiKeyInput.addEventListener('change', saveCurrentProvider);
  modelInput.addEventListener('change', saveCurrentProvider);
  modelInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') e.preventDefault(); });

  renderHistoryNavCount();
  routeFromHash();

  var ctxToggle = document.getElementById('contextToggle');
  var ctxArea = document.getElementById('context');
  ctxToggle.addEventListener('click', function(){
    var open = ctxArea.style.display === 'block';
    ctxArea.style.display = open ? 'none' : 'block';
    ctxToggle.textContent = open
      ? '+ Add context (README, package.json, a code snippet — optional, improves accuracy)'
      : '− Hide context field';
    if(!open) ctxArea.focus();
  });

  decodeBtn.addEventListener('click', decode);
  linkInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') decode(); });
  document.getElementById('backFromResult').addEventListener('click', function(){ goTo('home'); });
  document.getElementById('clearHistoryBtn').addEventListener('click', function(){
    saveHistory([]); renderHistoryNavCount(); renderHistoryPage();
  });

  var regenBtn = document.getElementById('regenBtn');
  var copyMdBtn = document.getElementById('copyMdBtn');
  var downloadJsonBtn = document.getElementById('downloadJsonBtn');
  if(regenBtn) regenBtn.addEventListener('click', regenerateCurrent);
  if(copyMdBtn) copyMdBtn.addEventListener('click', copyResultMarkdown);
  if(downloadJsonBtn) downloadJsonBtn.addEventListener('click', downloadResultJson);

  /* Keyboard shortcuts: "/" focuses the link input from Home, "Escape" backs out of Result/History/Guide */
  document.addEventListener('keydown', function(e){
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if(e.key === '/' && !typing){
      var current = (location.hash || '#home').slice(1);
      if(current === 'home'){ e.preventDefault(); linkInput.focus(); }
    } else if(e.key === 'Escape' && !typing){
      var cur = (location.hash || '#home').slice(1);
      if(cur !== 'home') goTo('home');
    }
  });
}

// This script tag sits at the end of <body>, so the DOM is already parsed —
// call directly rather than waiting on an event that may have already fired.
initApp();
