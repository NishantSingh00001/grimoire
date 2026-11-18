/* Motion enhancements: reveal-on-scroll, pointer depth, and ambient motes */
(function(){
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var selectors = '.card, .input-card, .diagram-card, .result-panel, .history-item';
  function attachMotion(root){
    (root || document).querySelectorAll(selectors).forEach(function(el){
      if (el.dataset.motionReady) return;
      el.dataset.motionReady = '1';
      el.addEventListener('pointermove', function(e){
        if (e.pointerType === 'touch') return;
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        var rx = (0.5 - y) * 5;
        var ry = (x - 0.5) * 7;
        el.style.transform = 'perspective(900px) translateY(-5px) rotateX('+rx+'deg) rotateY('+ry+'deg) scale(1.008)';
      });
      el.addEventListener('pointerleave', function(){ el.style.transform = ''; });
    });
  }

  function onReady(fn){
    if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', fn); }
    else fn();
  }

  onReady(function(){
    attachMotion();

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){ entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
        });
      }, {threshold:0.12});
      function observeReveal(){
        document.querySelectorAll('.card, .diagram-card, .history-item').forEach(function(el){
          if(!el.classList.contains('reveal-ready')){ el.classList.add('reveal-ready'); observer.observe(el); }
        });
      }
      observeReveal();
      var mo = new MutationObserver(function(){ attachMotion(); observeReveal(); });
      mo.observe(document.body, {childList:true, subtree:true});
    }

    // Small ambient motes, not a particle blizzard. The page still has to be usable.
    var positions = [[12,24],[87,18],[76,78],[22,82],[52,12],[93,55],[8,60]];
    positions.forEach(function(p,i){
      var mote=document.createElement('i'); mote.className='motion-orb';
      mote.style.left=p[0]+'vw'; mote.style.top=p[1]+'vh';
      mote.style.animationDelay=(i*.37)+'s'; mote.style.animationDuration=(2.4+(i%3)*.7)+'s';
      document.body.appendChild(mote);
    });
    window.addEventListener('hashchange', function(){ attachMotion(); });
  });
})();
