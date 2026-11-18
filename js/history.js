/* ===================== History store (localStorage) ===================== */
var HISTORY_KEY = 'grimoire_history';
var MAX_HISTORY = 24;

function loadHistory(){
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveHistory(list){
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch(e){ /* storage unavailable */ }
}
function addToHistory(link, data){
  var list = loadHistory().filter(function(h){ return h.link !== link; });
  list.unshift({ link: link, data: data, ts: Date.now() });
  if(list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
  saveHistory(list);
  renderHistoryNavCount();
}
function removeFromHistory(link){
  saveHistory(loadHistory().filter(function(h){ return h.link !== link; }));
  renderHistoryNavCount();
  renderHistoryPage();
}
function timeAgo(ts){
  var s = Math.max(1, Math.floor((Date.now()-ts)/1000));
  if(s < 60) return s + 's ago';
  var m = Math.floor(s/60); if(m < 60) return m + 'm ago';
  var h = Math.floor(m/60); if(h < 24) return h + 'h ago';
  var d = Math.floor(h/24); return d + 'd ago';
}
function renderHistoryNavCount(){
  var list = loadHistory();
  var el = document.getElementById('navHistCount');
  if(list.length){ el.textContent = String(list.length); el.style.display = 'inline-block'; }
  else { el.style.display = 'none'; }
}

function openEntry(link, data){
  state.data = data;
  state.currentLink = link;
  document.getElementById('linkInput').value = link;
  applyMode(state.mode);
  render();
  goTo('result');
}

function renderRecentStrip(){
  var list = loadHistory().slice(0, 6);
  var strip = document.getElementById('recentStrip');
  var row = document.getElementById('recentRow');
  row.innerHTML = '';
  if(!list.length){ strip.style.display = 'none'; return; }
  strip.style.display = 'block';
  list.forEach(function(h){
    var btn = document.createElement('button');
    btn.className = 'recent-chip'; btn.type = 'button';
    var name = document.createElement('span'); name.className = 'rc-name'; name.textContent = (h.data && h.data.name) || h.link;
    var lnk = document.createElement('span'); lnk.className = 'rc-link'; lnk.textContent = h.link;
    btn.appendChild(name); btn.appendChild(lnk);
    btn.addEventListener('click', function(){ openEntry(h.link, h.data); });
    row.appendChild(btn);
  });
}

function renderHistoryPage(){
  var list = loadHistory();
  var listEl = document.getElementById('historyList');
  var emptyEl = document.getElementById('historyEmpty');
  listEl.innerHTML = '';
  if(!list.length){ emptyEl.style.display = 'block'; listEl.style.display = 'none'; return; }
  emptyEl.style.display = 'none'; listEl.style.display = 'flex';
  list.forEach(function(h){
    var card = document.createElement('button');
    card.className = 'history-card'; card.type = 'button';
    var left = document.createElement('div');
    var name = document.createElement('p'); name.className = 'hc-name'; name.textContent = (h.data && h.data.name) || h.link;
    var lnk = document.createElement('p'); lnk.className = 'hc-link'; lnk.textContent = h.link;
    left.appendChild(name); left.appendChild(lnk);
    var time = document.createElement('span'); time.className = 'hc-time'; time.textContent = timeAgo(h.ts);
    var del = document.createElement('button'); del.className = 'hc-del'; del.type = 'button'; del.textContent = 'Remove';
    del.addEventListener('click', function(ev){ ev.stopPropagation(); removeFromHistory(h.link); });
    card.appendChild(left); card.appendChild(time); card.appendChild(del);
    card.addEventListener('click', function(){ openEntry(h.link, h.data); });
    listEl.appendChild(card);
  });
}
