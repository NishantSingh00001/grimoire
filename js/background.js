/* ===================== Atmospheric background scenes ===================== */
/* Two canvas scenes: a starlit "Wizard-born" library scene and a rainy "Muggle
   London" skyline scene. Reads state.mode (from state.js) to decide which to draw. */
var canvas = document.getElementById('bg');
var ctx = canvas.getContext('2d');
var dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
var stars = [], motes = [], rain = [], skyline = [];
var rafId = null;
var lastFrame = 0;

function sizeCanvas(){
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function rand(a,b){ return a + Math.random()*(b-a); }

function seedMagic(){
  var w=window.innerWidth,h=window.innerHeight;
  stars=[]; motes=[];
  var starCount=Math.min(230,Math.floor(w*h/7200));
  for(var i=0;i<starCount;i++){
    stars.push({x:rand(0,w),y:rand(0,h),r:rand(.35,1.65),a:rand(.25,.9),p:rand(0,Math.PI*2),s:rand(.3,1.15)});
  }
  var moteCount=reduceMotion?0:Math.min(90,Math.floor(w*h/14500));
  for(var j=0;j<moteCount;j++){
    motes.push({x:rand(0,w),y:rand(0,h),r:rand(.7,2.3),vx:rand(-.12,.12),vy:rand(-.34,-.08),a:rand(.18,.72),p:rand(0,Math.PI*2)});
  }
}

function seedMuggle(){
  var w=window.innerWidth,h=window.innerHeight;
  skyline=[]; rain=[];
  var x=-8;
  while(x<w+20){
    var bw=rand(28,82), bh=rand(h*.12,h*.36);
    skyline.push({x:x,w:bw,h:bh,rows:Math.max(2,Math.floor(bh/17)),cols:Math.max(2,Math.floor(bw/13)),seed:Math.random()});
    x+=bw+rand(3,10);
  }
  var rainCount=reduceMotion?0:Math.min(180,Math.floor(w*h/6500));
  for(var i=0;i<rainCount;i++){
    rain.push({x:rand(0,w),y:rand(0,h),len:rand(8,23),speed:rand(4,10),alpha:rand(.10,.34)});
  }
}

function radialGlow(x,y,r,colorA,colorB){
  var g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,colorA); g.addColorStop(1,colorB);
  ctx.fillStyle=g; ctx.fillRect(x-r,y-r,r*2,r*2);
}

function drawMagicFrame(t){
  var w=window.innerWidth,h=window.innerHeight;
  var g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#090613'); g.addColorStop(.43,'#111025'); g.addColorStop(1,'#080b1a');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  // Layered aurora-like clouds and a warm magical glow.
  radialGlow(w*.18,h*.22,Math.max(w,h)*.58,'rgba(94,54,132,.22)','rgba(12,8,24,0)');
  radialGlow(w*.82,h*.36,Math.max(w,h)*.52,'rgba(31,74,110,.17)','rgba(9,8,24,0)');
  radialGlow(w*.53,h*.92,Math.max(w,h)*.40,'rgba(153,101,44,.11)','rgba(9,6,18,0)');

  // A barely visible celestial geometry gives the scene depth.
  var cx=w*.73,cy=h*.43,base=Math.min(w,h)*.30;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(Math.sin(t*.00012)*.035);
  for(var k=0;k<3;k++){
    ctx.beginPath();ctx.arc(0,0,base*(.62+k*.19),0,Math.PI*2);
    ctx.strokeStyle='rgba(214,181,111,'+(0.075-k*.014)+')';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0,0,base*.98,base*.38,-.55,0,Math.PI*2);
  ctx.strokeStyle='rgba(198,169,113,.075)';ctx.lineWidth=1;ctx.stroke();
  ctx.restore();

  // A faint gothic-library arch, deliberately kept behind the reading surface.
  var ax=w*.79, ay=h*.93, aw=Math.min(w*.36,420), ah=Math.min(h*.76,620);
  ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='rgba(203,174,117,.48)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ax-aw*.5,ay);ctx.lineTo(ax-aw*.5,ay-ah*.57);
  ctx.quadraticCurveTo(ax-aw*.5,ay-ah,ax,ay-ah);
  ctx.quadraticCurveTo(ax+aw*.5,ay-ah,ax+aw*.5,ay-ah*.57);
  ctx.lineTo(ax+aw*.5,ay);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ax-aw*.36,ay);ctx.lineTo(ax-aw*.36,ay-ah*.53);
  ctx.quadraticCurveTo(ax-aw*.36,ay-ah*.86,ax,ay-ah*.86);
  ctx.quadraticCurveTo(ax+aw*.36,ay-ah*.86,ax+aw*.36,ay-ah*.53);
  ctx.lineTo(ax+aw*.36,ay);ctx.stroke();
  ctx.restore();

  // Stars.
  for(var i=0;i<stars.length;i++){
    var s=stars[i], tw=reduceMotion?s.a:s.a*(.55+.45*Math.sin(t*.001*s.s+s.p));
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle='rgba(244,235,211,'+tw.toFixed(3)+')';ctx.fill();
    if(s.r>1.25){
      ctx.strokeStyle='rgba(230,199,133,'+(tw*.20).toFixed(3)+')';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(s.x-4,s.y);ctx.lineTo(s.x+4,s.y);ctx.moveTo(s.x,s.y-4);ctx.lineTo(s.x,s.y+4);ctx.stroke();
    }
  }

  // Floating golden spell-dust.
  for(var j=0;j<motes.length;j++){
    var m=motes[j];
    if(!reduceMotion){
      m.x+=m.vx; m.y+=m.vy;
      if(m.y<-12){m.y=h+12;m.x=rand(0,w);}
    }
    var a=m.a*(.58+.42*Math.sin(t*.0017+m.p));
    ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);
    ctx.fillStyle='rgba(224,187,113,'+a.toFixed(3)+')';ctx.fill();
    ctx.beginPath();ctx.arc(m.x,m.y,m.r*3.2,0,Math.PI*2);
    ctx.fillStyle='rgba(220,177,91,'+(a*.075).toFixed(3)+')';ctx.fill();
  }

  // Slow luminous wisps drifting across the lower scene.
  if(!reduceMotion){
    for(var q=0;q<3;q++){
      var yy=h*(.30+q*.19)+Math.sin(t*.00022+q*2)*22;
      var wg=ctx.createLinearGradient(0,yy,w,yy+50);
      wg.addColorStop(0,'rgba(104,73,135,0)');
      wg.addColorStop(.5,'rgba(129,89,159,.035)');
      wg.addColorStop(1,'rgba(104,73,135,0)');
      ctx.fillStyle=wg;ctx.fillRect(0,yy-30,w,90);
    }
  }
}

function drawMuggleFrame(t){
  var w=window.innerWidth,h=window.innerHeight;
  var g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#08111d');g.addColorStop(.48,'#0d1a29');g.addColorStop(1,'#070d16');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);

  // Rainy London haze and distant city light.
  radialGlow(w*.17,h*.31,Math.max(w,h)*.34,'rgba(32,113,155,.20)','rgba(5,14,24,0)');
  radialGlow(w*.76,h*.40,Math.max(w,h)*.40,'rgba(52,76,121,.20)','rgba(5,12,22,0)');
  radialGlow(w*.49,h*.95,Math.max(w,h)*.46,'rgba(23,99,124,.12)','rgba(4,10,18,0)');

  // Fine atmospheric grid, almost invisible.
  ctx.save();ctx.strokeStyle='rgba(110,180,207,.045)';ctx.lineWidth=1;
  var step=64, offset=(t*.006)%step;
  for(var gx=-step;gx<w+step;gx+=step){ctx.beginPath();ctx.moveTo(gx+offset,0);ctx.lineTo(gx+offset,h);ctx.stroke();}
  for(var gy=0;gy<h;gy+=step){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke();}
  ctx.restore();

  // Distant skyline silhouette, lit windows and rooftop details.
  var ground=h*.83;
  skyline.forEach(function(b,idx){
    var top=ground-b.h;
    var shade=idx%3===0?'#101d2a':(idx%3===1?'#0d1925':'#122131');
    ctx.fillStyle=shade;ctx.fillRect(b.x,top,b.w,b.h);
    ctx.fillStyle='rgba(104,161,188,.10)';ctx.fillRect(b.x+2,top+3,Math.max(1,b.w-4),1);
    for(var r=0;r<b.rows;r++){
      for(var c=0;c<b.cols;c++){
        var lit=((Math.floor(b.seed*1000)+r*7+c*13)%9)<3;
        if(lit){
          ctx.fillStyle=(r+c)%4===0?'rgba(224,185,112,.34)':'rgba(104,190,221,.22)';
          ctx.fillRect(b.x+6+c*12,top+10+r*16,3,5);
        }
      }
    }
    if(idx%4===0){
      ctx.strokeStyle='rgba(126,177,198,.20)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(b.x+b.w*.5,top);ctx.lineTo(b.x+b.w*.5,top-rand(8,20));ctx.stroke();
    }
  });

  // Street-level wet reflections.
  var reflection=ctx.createLinearGradient(0,ground,w,h);
  reflection.addColorStop(0,'rgba(32,94,125,.10)');reflection.addColorStop(1,'rgba(5,12,20,0)');
  ctx.fillStyle=reflection;ctx.fillRect(0,ground,w,h-ground);
  for(var k=0;k<15;k++){
    var rx=((k*137)+(t*.018))%(w+180)-90;
    var ry=ground+18+(k%5)*17;
    ctx.fillStyle=k%3===0?'rgba(218,178,103,.10)':'rgba(91,181,213,.09)';
    ctx.fillRect(rx,ry,rand(25,95),1.2);
  }

  // Diagonal rain. The static scene remains attractive with reduced motion.
  for(var i=0;i<rain.length;i++){
    var d=rain[i];
    if(!reduceMotion){
      d.x-=1.1;d.y+=d.speed;
      if(d.y>h+24){d.y=-20;d.x=rand(0,w);}
    }
    ctx.strokeStyle='rgba(153,203,225,'+d.alpha+')';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-4,d.y+d.len);ctx.stroke();
  }

  // A soft distant glow, like a streetlamp in fog.
  var lamp=ctx.createRadialGradient(w*.88,h*.29,2,w*.88,h*.29,Math.min(w,h)*.24);
  lamp.addColorStop(0,'rgba(118,178,208,.12)');lamp.addColorStop(1,'rgba(118,178,208,0)');
  ctx.fillStyle=lamp;ctx.fillRect(0,0,w,h);
}

function paintScene(t){
  if(state.mode==='magic') drawMagicFrame(t);
  else drawMuggleFrame(t);
}
function backgroundLoop(t){
  if(document.hidden){rafId=null;return;}
  if(t-lastFrame>24){paintScene(t);lastFrame=t;}
  rafId=requestAnimationFrame(backgroundLoop);
}
function stopBackgroundLoop(){
  if(rafId){cancelAnimationFrame(rafId);rafId=null;}
}
function startMagic(){
  stopBackgroundLoop();sizeCanvas();seedMagic();paintScene(0);
  if(!reduceMotion && !document.hidden) rafId=requestAnimationFrame(backgroundLoop);
}
function startMuggle(){
  stopBackgroundLoop();sizeCanvas();seedMuggle();paintScene(0);
  if(!reduceMotion && !document.hidden) rafId=requestAnimationFrame(backgroundLoop);
}
window.addEventListener('resize',function(){
  sizeCanvas();
  if(state.mode==='magic'){seedMagic();paintScene(0);}
  else {seedMuggle();paintScene(0);}
});
document.addEventListener('visibilitychange',function(){
  if(document.hidden) stopBackgroundLoop();
  else if(!reduceMotion) rafId=requestAnimationFrame(backgroundLoop);
  else paintScene(0);
});
