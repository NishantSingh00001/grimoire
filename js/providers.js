/* ===================== AI providers + local key vault ===================== */
/* Everything here runs client-side only. Each provider's key and chosen model
   are saved per-provider in this browser's localStorage and sent only to that
   provider's own API — never to any server of ours, because there isn't one. */
var providerSelect = document.getElementById('providerSelect');
var modelInput = document.getElementById('modelInput');
var apiKeyInput = document.getElementById('apiKey');
var keyLink = document.getElementById('keyLink');
var providerNote = document.getElementById('providerNote');

var PROVIDERS = {
  gemini: {
    label:'Google Gemini',
    keyUrl:'https://aistudio.google.com/app/apikey',
    keyLabel:'Get a Gemini key ↗',
    model:'gemini-2.5-flash',
    note:'Google AI Studio key. Gemini usage limits depend on the model and your Google AI plan.',
    kind:'gemini'
  },
  groq: {
    label:'Groq',
    keyUrl:'https://console.groq.com/keys',
    keyLabel:'Get a Groq key ↗',
    model:'openai/gpt-oss-20b',
    note:'Fast inference with an OpenAI-compatible API. The suggested model is listed in Groq’s production models.',
    endpoint:'https://api.groq.com/openai/v1/chat/completions',
    kind:'openai'
  },
  openrouter: {
    label:'OpenRouter',
    keyUrl:'https://openrouter.ai/keys',
    keyLabel:'Get an OpenRouter key ↗',
    model:'openai/gpt-oss-20b',
    note:'One key can route requests to models from multiple providers. Model availability and pricing depend on the route you choose.',
    endpoint:'https://openrouter.ai/api/v1/chat/completions',
    kind:'openai',
    openrouter:true
  },
  openai: {
    label:'OpenAI',
    keyUrl:'https://platform.openai.com/api-keys',
    keyLabel:'Get an OpenAI key ↗',
    model:'gpt-5-mini',
    note:'Uses the OpenAI API platform, which is billed separately from a ChatGPT subscription. Model IDs here move fast — check OpenAI’s pricing/model page if this one errors out.',
    endpoint:'https://api.openai.com/v1/chat/completions',
    kind:'openai'
  },
  mistral: {
    label:'Mistral',
    keyUrl:'https://console.mistral.ai/api-keys/',
    keyLabel:'Get a Mistral key ↗',
    model:'mistral-small-latest',
    note:'Uses Mistral’s chat-completion endpoint. API access and billing are managed in Mistral Studio.',
    endpoint:'https://api.mistral.ai/v1/chat/completions',
    kind:'openai'
  },
  anthropic: {
    label:'Anthropic Claude',
    keyUrl:'https://console.anthropic.com/settings/keys',
    keyLabel:'Get a Claude key ↗',
    model:'claude-sonnet-5-5',
    note:'Claude browser calls require the provider’s explicit browser-access header. Some Anthropic organizations block direct browser requests; a backend proxy is then required.',
    endpoint:'https://api.anthropic.com/v1/messages',
    kind:'anthropic'
  }
};

var activeProvider = 'gemini';
function keyStorageName(id){
  return id === 'gemini' ? 'grimoire_gemini_key' : 'grimoire_' + id + '_api_key';
}
function modelStorageName(id){ return 'grimoire_' + id + '_model'; }
function saveCurrentProvider(){
  try {
    localStorage.setItem(keyStorageName(activeProvider), apiKeyInput.value.trim());
    localStorage.setItem(modelStorageName(activeProvider), modelInput.value.trim());
    localStorage.setItem('grimoire_provider', activeProvider);
  } catch(e){ /* Storage can be disabled; inputs still work for this session. */ }
}
function loadProvider(id){
  var cfg = PROVIDERS[id] || PROVIDERS.gemini;
  activeProvider = id;
  providerSelect.value = id;
  try {
    apiKeyInput.value = localStorage.getItem(keyStorageName(id)) || '';
    modelInput.value = localStorage.getItem(modelStorageName(id)) || cfg.model;
  } catch(e){
    apiKeyInput.value = '';
    modelInput.value = cfg.model;
  }
  apiKeyInput.placeholder = cfg.label + ' API key';
  keyLink.href = cfg.keyUrl;
  keyLink.textContent = cfg.keyLabel;
  providerNote.textContent = cfg.note;
}

function providerError(response, body, providerName){
  var detail = (body && body.error && (body.error.message || body.error.type))
    || (body && body.message) || ('HTTP ' + response.status);
  var status = response.status;
  return {
    code: status === 429 ? 'rate_limited'
      : (status === 401 || status === 403) ? 'bad_key'
      : status === 404 ? 'not_found' : 'provider_error',
    message: providerName + ' request failed: ' + detail
  };
}

function readResponse(response, providerName){
  if(!response.ok){
    return response.json().catch(function(){ return null; }).then(function(body){
      console.error('Grimoire: ' + providerName + ' API error', response.status, body);
      return Promise.reject(providerError(response, body, providerName));
    });
  }
  return response.json();
}

var GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

function callGemini(prompt){
  return callGeminiModel(prompt, 0);
}
function callGeminiModel(prompt, modelIndex){
  var model = modelInput.value.trim() || GEMINI_MODELS[0];
  if(modelIndex > 0) model = GEMINI_MODELS[modelIndex];
  return callGeminiOnce(prompt, model).catch(function(err){
    var hasNext = modelIndex + 1 < GEMINI_MODELS.length;
    if(err && err.code === 'not_found' && hasNext){
      console.warn('Grimoire: Gemini model unavailable, trying ' + GEMINI_MODELS[modelIndex + 1]);
      return callGeminiModel(prompt, modelIndex + 1);
    }
    return Promise.reject(err);
  });
}
function callGeminiOnce(prompt, model){
  var key = apiKeyInput.value.trim();
  if(!key) return Promise.reject({code:'no_key',message:'Add a Google Gemini API key first.'});
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  var body = {
    contents:[{role:'user',parts:[{text:prompt}]}],
    generationConfig:{responseMimeType:'application/json',temperature:0.4}
  };
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function(){controller.abort();},60000) : null;
  return fetch(url,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
    signal:controller ? controller.signal : undefined
  }).then(function(r){
    if(timeoutId) clearTimeout(timeoutId);
    return readResponse(r,'Gemini');
  }).then(function(json){
    var cand = json && json.candidates && json.candidates[0];
    var text = cand && cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
    if(!text) return Promise.reject({code:'empty',message:'Gemini returned no usable text. Try another model.'});
    return {text:text};
  }).catch(function(err){
    if(timeoutId) clearTimeout(timeoutId);
    if(err && err.name === 'AbortError') return Promise.reject({code:'timeout',message:'The request timed out. Try a shorter context or another model.'});
    if(err instanceof TypeError) return Promise.reject({code:'network',message:'Could not reach Gemini. Check your connection and browser console.'});
    return Promise.reject(err);
  });
}

function callOpenAICompatible(prompt, cfg, key, model){
  var headers = {'Content-Type':'application/json','Authorization':'Bearer ' + key};
  if(cfg.openrouter){
    headers['HTTP-Referer'] = window.location.href.split('#')[0];
    headers['X-Title'] = 'Grimoire Link Decoder';
  }
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function(){controller.abort();},60000) : null;
  return fetch(cfg.endpoint,{
    method:'POST',headers:headers,
    body:JSON.stringify({
      model:model,
      messages:[{role:'user',content:prompt}],
      temperature:0.4
    }),
    signal:controller ? controller.signal : undefined
  }).then(function(r){
    if(timeoutId) clearTimeout(timeoutId);
    return readResponse(r,cfg.label);
  }).then(function(json){
    var text = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if(Array.isArray(text)) text = text.map(function(part){return part && (part.text || part.content) || '';}).join('');
    if(typeof text !== 'string' || !text.trim()) return Promise.reject({code:'empty',message:cfg.label + ' returned no usable text.'});
    return {text:text};
  }).catch(function(err){
    if(timeoutId) clearTimeout(timeoutId);
    if(err && err.name === 'AbortError') return Promise.reject({code:'timeout',message:cfg.label + ' took over a minute. Try again or use a faster model.'});
    if(err instanceof TypeError) return Promise.reject({code:'network',message:'Could not reach ' + cfg.label + '. This may be a connection or browser CORS issue.'});
    return Promise.reject(err);
  });
}

function callAnthropic(prompt, cfg, key, model){
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function(){controller.abort();},60000) : null;
  return fetch(cfg.endpoint,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({
      model:model,
      max_tokens:8192,
      messages:[{role:'user',content:prompt}]
    }),
    signal:controller ? controller.signal : undefined
  }).then(function(r){
    if(timeoutId) clearTimeout(timeoutId);
    return readResponse(r,cfg.label);
  }).then(function(json){
    var parts = json && json.content;
    var text = Array.isArray(parts) ? parts.filter(function(p){return p && p.type === 'text';}).map(function(p){return p.text || '';}).join('\n') : '';
    if(!text.trim()) return Promise.reject({code:'empty',message:'Claude returned no usable text.'});
    return {text:text};
  }).catch(function(err){
    if(timeoutId) clearTimeout(timeoutId);
    if(err && err.name === 'AbortError') return Promise.reject({code:'timeout',message:'Claude took over a minute. Try again or use a faster model.'});
    if(err instanceof TypeError) return Promise.reject({code:'network',message:'Could not reach Anthropic. Your organization may block direct browser API requests; use a backend proxy in that case.'});
    return Promise.reject(err);
  });
}

function callAI(prompt){
  saveCurrentProvider();
  var cfg = PROVIDERS[activeProvider];
  var key = apiKeyInput.value.trim();
  var model = modelInput.value.trim() || cfg.model;
  if(!key) return Promise.reject({code:'no_key',message:'Add an API key for ' + cfg.label + ' first.'});
  if(cfg.kind === 'gemini') return callGemini(prompt);
  if(cfg.kind === 'anthropic') return callAnthropic(prompt,cfg,key,model);
  return callOpenAICompatible(prompt,cfg,key,model);
}
