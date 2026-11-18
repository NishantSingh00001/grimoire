/* ===================== Diagram helpers (SVG, built via safe DOM calls) ===================== */

function wrapLabel(str, maxChars){
  str = (str || '').trim();
  if(!str) return [''];
  var words = str.split(/\s+/);
  var lines = []; var cur = '';
  for(var i=0;i<words.length;i++){
    var w = words[i];
    var test = cur ? cur + ' ' + w : w;
    if(test.length > maxChars && cur){ lines.push(cur); cur = w; }
    else { cur = test; }
    if(lines.length === 2){ // cap at 3 lines total, ellipsize remainder
      var rest = words.slice(i).join(' ');
      cur = rest.length > maxChars ? rest.slice(0, maxChars-1) + '…' : rest;
      lines.push(cur);
      return lines;
    }
  }
  if(cur) lines.push(cur);
  return lines.slice(0,3);
}

function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for(var k in attrs){ el.setAttribute(k, attrs[k]); }
  return el;
}
// SVG presentation attributes set via setAttribute don't reliably resolve CSS var() —
// resolve the real color values from computed style instead, read fresh per render.
function cssVar(name){
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}
function palette(){
  return {
    accent: cssVar('--accent'), accentInk: cssVar('--accent-ink'),
    border: cssVar('--border'), borderStrong: cssVar('--border-strong'),
    bg: cssVar('--bg'), surfaceSolid: cssVar('--surface-solid'),
    text: cssVar('--text'), textDim: cssVar('--text-dim')
  };
}
function svgText(x, y, lines, opts){
  opts = opts || {};
  var t = svgEl('text', { x:x, y:y, 'text-anchor': opts.anchor || 'middle',
    'font-family': "'Manrope', sans-serif", 'font-size': opts.size || 12.5,
    'font-weight': opts.weight || 600, fill: opts.fill || cssVar('--text') });
  var lh = opts.lineHeight || (opts.size ? opts.size + 3 : 15);
  var startDy = -((lines.length-1)/2) * lh;
  for(var i=0;i<lines.length;i++){
    var tspan = svgEl('tspan', { x:x, dy: i===0 ? startDy : lh });
    tspan.textContent = lines[i];
    t.appendChild(tspan);
  }
  return t;
}

/* ===================== Architecture diagram ===================== */
function buildArchitecture(container, nodesRaw, edgesRaw, mode){
  container.innerHTML = '';
  if(!nodesRaw || !nodesRaw.length){
    var p = document.createElement('p');
    p.style.cssText = 'color:var(--text-faint);font-size:13px;margin:0;';
    p.textContent = 'No architecture graph was returned for this link.';
    container.appendChild(p); return;
  }
  var ids = nodesRaw.map(function(n){ return n.id; });
  var layer = {}; ids.forEach(function(id){ layer[id] = 0; });
  var edges = (edgesRaw||[]).filter(function(e){ return ids.indexOf(e.from)>-1 && ids.indexOf(e.to)>-1; });

  // longest-path layering, a few relaxation passes
  for(var pass=0; pass<ids.length+1; pass++){
    edges.forEach(function(e){
      if(layer[e.to] < layer[e.from] + 1) layer[e.to] = layer[e.from] + 1;
    });
  }
  var maxLayer = 0;
  ids.forEach(function(id){ if(layer[id] > maxLayer) maxLayer = layer[id]; });
  var columns = [];
  for(var l=0;l<=maxLayer;l++) columns.push([]);
  ids.forEach(function(id){ columns[layer[id]].push(id); });

  var colWidth = 300, rowHeight = 110, boxW = 158, boxH = 56;
  var maxRows = Math.max.apply(null, columns.map(function(c){return c.length;}).concat([1]));
  var width = columns.length * colWidth + 40;
  var height = maxRows * rowHeight + 60;

  var pos = {};
  columns.forEach(function(col, ci){
    var n = col.length;
    col.forEach(function(id, ri){
      var x = 40 + ci*colWidth + colWidth/2;
      var y = 40 + (height-80) * ((ri+0.5)/n);
      pos[id] = { x:x, y:y };
    });
  });

  var pal = palette();
  var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, xmlns:'http://www.w3.org/2000/svg' });
  var defs = svgEl('defs', {});
  var marker = svgEl('marker', { id:'arrow', viewBox:'0 0 10 10', refX:'8', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto-start-reverse' });
  var arrowPath = svgEl('path', { d:'M0,0 L10,5 L0,10 z', fill: pal.accent });
  marker.appendChild(arrowPath); defs.appendChild(marker); svg.appendChild(defs);

  edges.forEach(function(e){
    var a = pos[e.from], b = pos[e.to];
    if(!a || !b) return;
    var midx = (a.x+b.x)/2, midy = (a.y+b.y)/2;
    var dx = (b.x-a.x), curve = Math.abs(dx) < 4 ? 0 : dx*0.15;
    var d = 'M '+a.x+' '+(a.y+boxH/2)+' C '+(a.x+curve)+' '+(midy)+', '+(b.x-curve)+' '+(midy)+', '+b.x+' '+(b.y-boxH/2);
    var path = svgEl('path', { d:d, fill:'none', stroke: pal.borderStrong, 'stroke-width':'1.4', 'marker-end':'url(#arrow)' });
    svg.appendChild(path);
    var label = mode === 'magic' ? e.magic : (e.muggle || e.magic);
    if(label){
      var bgRect = svgEl('rect', { x: midx-50, y: midy-10, width:100, height:18, rx:5, fill: pal.bg, stroke: pal.border, 'stroke-width':'1', opacity:'0.95' });
      svg.appendChild(bgRect);
      svg.appendChild(svgText(midx, midy+4, wrapLabel(label, 20).slice(0,1), { size:10.5, weight:500, fill: pal.textDim }));
    }
  });

  nodesRaw.forEach(function(n){
    var p = pos[n.id]; if(!p) return;
    var rect = svgEl('rect', { x:p.x-boxW/2, y:p.y-boxH/2, width:boxW, height:boxH, rx:12,
      fill: pal.surfaceSolid, stroke: pal.borderStrong, 'stroke-width':'1.3' });
    svg.appendChild(rect);
    var label = mode === 'magic' ? (n.magic||n.id) : (n.muggle || n.magic || n.id);
    svg.appendChild(svgText(p.x, p.y+4, wrapLabel(label, 20), { size:12.5, weight:700, fill: pal.text }));
  });

  container.appendChild(svg);
}

/* ===================== Flow diagram ===================== */
function buildFlow(container, stepsRaw, mode){
  container.innerHTML = '';
  if(!stepsRaw || !stepsRaw.length){
    var p = document.createElement('p');
    p.style.cssText = 'color:var(--text-faint);font-size:13px;margin:0;';
    p.textContent = 'No flow steps were returned for this link.';
    container.appendChild(p); return;
  }
  var pal = palette();
  var n = stepsRaw.length;
  var boxW = 420, boxH = 62, gap = 40, pad = 30;
  var height = n*boxH + (n-1)*gap + pad*2;
  var width = boxW + pad*2 + 50;
  var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, xmlns:'http://www.w3.org/2000/svg' });

  var defs = svgEl('defs', {});
  var marker = svgEl('marker', { id:'arrow2', viewBox:'0 0 10 10', refX:'8', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto-start-reverse' });
  marker.appendChild(svgEl('path', { d:'M0,0 L10,5 L0,10 z', fill: pal.accent }));
  defs.appendChild(marker); svg.appendChild(defs);

  stepsRaw.forEach(function(step, i){
    var y = pad + i*(boxH+gap);
    var x = pad + 50;
    if(i>0){
      var prevY = pad + (i-1)*(boxH+gap) + boxH;
      var line = svgEl('path', { d:'M '+(x+boxW/2)+' '+prevY+' L '+(x+boxW/2)+' '+(y-2),
        stroke: pal.borderStrong, 'stroke-width':'1.4', fill:'none', 'marker-end':'url(#arrow2)' });
      svg.appendChild(line);
    }
    var rect = svgEl('rect', { x:x, y:y, width:boxW, height:boxH, rx:12,
      fill: pal.surfaceSolid, stroke: pal.borderStrong, 'stroke-width':'1.3' });
    svg.appendChild(rect);

    var badge = svgEl('circle', { cx:x+28, cy:y+boxH/2, r:14, fill: pal.accent });
    svg.appendChild(badge);
    var num = svgEl('text', { x:x+28, y:y+boxH/2+4, 'text-anchor':'middle', 'font-size':12, 'font-weight':800, fill: pal.accentInk, 'font-family':"'Manrope', sans-serif" });
    num.textContent = String(i+1);
    svg.appendChild(num);

    var label = mode === 'magic' ? step.magic : (step.muggle || step.magic);
    svg.appendChild(svgText(x+58, y+boxH/2+4, wrapLabel(label, 44), { size:12.5, weight:600, anchor:'start' }));
  });

  container.appendChild(svg);
}
