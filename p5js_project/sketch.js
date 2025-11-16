// Setup
const COL_Y=[245,208,40],COL_R=[206,41,35],COL_B=[44,96,185],COL_C=[242,239,230],COL_K=[20];
const BAND_RATIO=0.025, HEADER_TEXT='SPACE TO SWITCH', EPS=0.015;
let mode='A', nextVertical={A:Math.random()<.5,B:Math.random()<.5};
let vertsA=[],horzsA=[],intersectionColors=new Map();
let vertsB=[],horzsB=[],filledCells=new Map();
let animating=false, action='band', animStart=0, animBand=null;
let headerColors=[], headerLastUpdate=0;

function setup(){
  createCanvas(windowWidth,windowHeight);
  frameRate(60); noStroke(); textFont('sans-serif');
  headerInit(); headerColorsReset(); timerNext();
}

// Resize
function windowResized(){ resizeCanvas(windowWidth,windowHeight); headerLayout(); }

// Draw
function draw(){
  background(255);
  headerDraw();
  const now=millis(), t=bandThickness();
  if(mode==='A'){
    drawBands(vertsA,horzsA,t,color(...COL_Y));
    if(animating && action==='band') bandAnim(animBand,color(...COL_Y));
    for(const [k,col] of intersectionColors){
      const [xs,ys]=k.split('|'); const x=parseFloat(xs)*width,y=parseFloat(ys)*height;
      fill(col); rectMode(CENTER); rect(x,y,t,t);
    }
  }else{
    cellsDraw();
    drawBands(vertsB,horzsB,t,color(...COL_K));
    if(animating && action==='band') bandAnim(animBand,color(...COL_K));
  }
  if(now-headerLastUpdate>1000) headerColorsReset();
  if(animating && (now-animStart)/1000>=1){
    animating=false;
    finalizeBand(animBand);
    timerNext();
  }
}

// Measure
function bandThickness(){ return min(width,height)*BAND_RATIO; }

// Timer
function timerNext(){ setTimeout(()=>beginNext(),1000); }

// Next
function beginNext(){
  animStart=millis(); animating=true;
  if(mode==='A'){ action='band'; animBand=nextBand('A'); }
  else{
    const haveCells = vertsB.length>=2 && horzsB.length>=2;
    action = haveCells ? (action==='band'?'fill':'band') : 'band';
    if(action==='band'){ animBand=nextBand('B'); }
    else{
      const f = cellPick();
      if(f) cellFinalize(f);
      animating=false;
      timerNext();
      return;
    }
  }
}

// Band
function nextBand(which){
  const margin=.05, vertical=nextVertical[which];
  nextVertical[which]=!nextVertical[which];
  return {vertical, posRel:random(margin,1-margin), direction:random(['forward','backward'])};
}

// Animate
function bandAnim(b,col){
  const t=bandThickness(), p=constrain((millis()-animStart)/1000,0,1);
  fill(col);
  if(b.vertical){
    const x=b.posRel*width, len=height*p;
    if(b.direction==='forward') rectMode(CENTER),rect(x,len/2,t,len);
    else rectMode(CENTER),rect(x,height-len/2,t,len);
  }else{
    const y=b.posRel*height, len=width*p;
    if(b.direction==='forward') rectMode(CENTER),rect(len/2,y,len,t);
    else rectMode(CENTER),rect(width-len/2,y,len,t);
  }
}

// Finalize
function finalizeBand(b){
  const pos=b.posRel, vertical=b.vertical;
  if(mode==='A'){
    if(vertical){ vertsA.push(pos); for(const y of horzsA) touchIntersection(pos,y); mergeNear(vertsA); }
    else{ horzsA.push(pos); for(const x of vertsA) touchIntersection(x,pos); mergeNear(horzsA); }
  }else{
    if(vertical){ vertsB.push(pos); mergeNear(vertsB); splitFilled('v', indexOfLine(vertsB,pos)); }
    else{ horzsB.push(pos); mergeNear(horzsB); splitFilled('h', indexOfLine(horzsB,pos)); }
  }
}

// Intersect
function touchIntersection(x,y){
  const k=keyVH(x,y);
  if(!intersectionColors.has(k)) intersectionColors.set(k, pickRGBcream());
}

// Merge
function mergeNear(arr){
  arr.sort((a,b)=>a-b);
  const out=[]; let i=0;
  while(i<arr.length){
    let j=i+1, s=arr[i], c=1;
    while(j<arr.length && Math.abs(arr[j]-arr[i])<EPS){ s+=arr[j]; c++; j++; }
    out.push(s/c); i=j;
  }
  arr.length=0; for(const v of out) arr.push(v);
}

// Index
function indexOfLine(arr,pos){ for(let i=0;i<arr.length;i++) if(Math.abs(arr[i]-pos)<1e-4) return i; return 0; }

// Split
function splitFilled(ori,k){
  const keys=[...filledCells.keys()];
  if(ori==='v'){
    for(const key of keys){
      const [is,js]=key.split('|'); const i=int(is), j=int(js);
      if(i===k-1){ const col=filledCells.get(key).color; const right=`${k}|${j}`; if(!filledCells.has(right)) filledCells.set(right,{color:col}); }
    }
  }else{
    for(const key of keys){
      const [is,js]=key.split('|'); const i=int(is), j=int(js);
      if(j===k-1){ const col=filledCells.get(key).color; const bot=`${i}|${k}`; if(!filledCells.has(bot)) filledCells.set(bot,{color:col}); }
    }
  }
}

// Edges
function innerEdges(){
  const t=bandThickness();
  const vx=[...vertsB].sort((a,b)=>a-b), hy=[...horzsB].sort((a,b)=>a-b);
  return {
    vx, hy,
    xL: vx.map(v=>v*width + t/2),
    xR: vx.map(v=>v*width - t/2),
    yT: hy.map(h=>h*height + t/2),
    yB: hy.map(h=>h*height - t/2)
  };
}

// Pick
function cellPick(){
  if(vertsB.length<2 || horzsB.length<2) return null;
  const E=innerEdges(); const cands=[];
  for(let i=0;i<E.vx.length-1;i++){
    const x1=E.xR[i], x2=E.xL[i+1]; if(x2-x1<=0) continue;
    for(let j=0;j<E.hy.length-1;j++){
      const y1=E.yB[j], y2=E.yT[j+1]; if(y2-y1<=0) continue;
      const key=`${i}|${j}`; if(!filledCells.has(key)) cands.push({i,j});
    }
  }
  if(cands.length===0) return null;
  const ch=random(cands), col=random([ color(...COL_Y), color(...COL_R), color(...COL_B) ]);
  return {i:ch.i, j:ch.j, color:col};
}

// Cells
function cellFinalize(f){ if(f) filledCells.set(`${f.i}|${f.j}`,{color:f.color}); }
function cellsDraw(){
  if(vertsB.length<2 || horzsB.length<2) return;
  const E=innerEdges();
  for(const [key,e] of filledCells){
    const [is,js]=key.split('|'); const i=int(is), j=int(js);
    const x1=E.xR[i], x2=E.xL[i+1], y1=E.yB[j], y2=E.yT[j+1];
    if(x2<=x1 || y2<=y1) continue;
    fill(e.color); rectMode(CORNER); rect(x1,y1,x2-x1,y2-y1);
  }
}

// Bands
function drawBands(verts,horzs,t,col){
  rectMode(CENTER); fill(col);
  for(const x of verts) rect(x*width,height/2,t,height);
  for(const y of horzs) rect(width/2,y*height,width,t);
}

// Utils
function keyVH(vx,hy){ return `${vx.toFixed(4)}|${hy.toFixed(4)}`; }
function pickRGBcream(){ return random([ color(...COL_R), color(...COL_B), color(...COL_C) ]); }

// Header
function headerInit(){
  const div=document.createElement('div');
  div.id='headerText'; div.style.display='flex'; div.style.justifyContent='center';
  div.style.fontFamily='sans-serif'; div.style.fontWeight='700';
  div.style.margin='10px 0'; document.body.prepend(div); headerLayout();
}
function headerLayout(){
  const div=document.getElementById('headerText'); const fs=Math.max(18,Math.min(42,Math.round(window.innerWidth/28)));
  div.style.fontSize=fs+'px';
}
function headerDraw(){
  const div=document.getElementById('headerText'); let html='';
  for(let i=0;i<HEADER_TEXT.length;i++){
    const c=headerColors[i], rgb=`rgb(${red(c)},${green(c)},${blue(c)})`;
    html+=`<span style="display:inline-block;width:1.2em;text-align:center;color:${rgb}">${HEADER_TEXT[i]}</span>`;
  }
  div.innerHTML=html;
}
function headerColorsReset(){
  headerColors.length=0;
  for(let i=0;i<HEADER_TEXT.length;i++) headerColors.push(random([ color(...COL_Y), color(...COL_R), color(...COL_B), color(0) ]));
  headerLastUpdate=millis(); headerDraw();
}

// Toggle
function keyPressed(){
  if(key===' '){
    animating=false; action='band'; animBand=null;
    if(mode==='A'){ mode='B'; vertsB=[]; horzsB=[]; filledCells.clear(); nextVertical.B=Math.random()<.5; }
    else{ mode='A'; vertsA=[]; horzsA=[]; intersectionColors.clear(); nextVertical.A=Math.random()<.5; }
    headerColorsReset(); timerNext();
  }
}
