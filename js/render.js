/* ===================== Text helpers (safe DOM) ===================== */
function setText(id, value){ document.getElementById(id).textContent = value || ''; }

/* ===================== Render result ===================== */
function render(){
  var d = state.data; if(!d) return;
  var mode = state.mode;
  var block = mode === 'magic' ? d.magic : d.muggle;

  setText('rName', d.name);
  setText('rTagline', d.tagline);

  var chipsEl = document.getElementById('rChips');
  chipsEl.innerHTML = '';
  (d.tech || []).forEach(function(t){
    var c = document.createElement('span'); c.className = 'chip'; c.textContent = t;
    chipsEl.appendChild(c);
  });

  document.getElementById('t1').textContent = mode === 'magic' ? 'What it is' : 'What this actually is';
  document.getElementById('t2').textContent = mode === 'magic' ? 'How it was built' : 'How it got made';
  document.getElementById('t3').textContent = mode === 'magic' ? 'How it works' : 'How it works, simply';

  setText('rOverview', block && block.overview);
  setText('rBuilt', block && block.how_built);
  setText('rWorks', block && block.how_it_works);

  var analogyBox = document.getElementById('analogyBox');
  if(mode === 'muggle' && d.muggle && d.muggle.analogy){
    analogyBox.style.display = 'block';
    setText('rAnalogy', d.muggle.analogy);
  } else {
    analogyBox.style.display = 'none';
  }

  var deepCard = document.getElementById('deepCard');
  var deepList = document.getElementById('rDeep');
  if(mode === 'magic' && d.magic && d.magic.deep_dive && d.magic.deep_dive.length){
    deepCard.style.display = 'block';
    deepList.innerHTML = '';
    d.magic.deep_dive.forEach(function(pt){
      var li = document.createElement('li'); li.textContent = pt;
      deepList.appendChild(li);
    });
  } else {
    deepCard.style.display = 'none';
  }

  buildArchitecture(document.getElementById('archWrap'), d.architecture && d.architecture.nodes, d.architecture && d.architecture.edges, mode);
  buildFlow(document.getElementById('flowWrap'), d.flow && d.flow.steps, mode);
}
