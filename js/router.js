/* ===================== Router (hash-based pages) ===================== */
var PAGES = ['home', 'result', 'history', 'guide'];
function goTo(name, opts){
  opts = opts || {};
  if(PAGES.indexOf(name) === -1) name = 'home';
  PAGES.forEach(function(p){
    var el = document.getElementById('page-' + p);
    el.classList.toggle('active', p === name);
  });
  document.querySelectorAll('.navlink').forEach(function(a){
    a.classList.toggle('active', a.getAttribute('data-nav') === name);
  });
  if(name === 'history') renderHistoryPage();
  if(name === 'home') renderRecentStrip();
  if(!opts.silent && location.hash !== '#' + name) location.hash = name;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}
function routeFromHash(){
  var name = (location.hash || '#home').slice(1);
  if(name === 'result' && !state.data){ goTo('home', { silent:true }); return; }
  goTo(name, { silent:true });
}
window.addEventListener('hashchange', routeFromHash);
