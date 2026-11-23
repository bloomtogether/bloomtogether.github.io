// ================= story: scenes, dialogue, memory cards =================
// Narration says "the Giant" and "the Sprite"; dialogue uses the players' own names.
const SCENES={
  prologue:{title:'Book 1: The Seven Roots',lines:[
    {text:'Long ago, the Everbloom Vale was kept alive by one great Heart Tree. Its seven roots carried water to seven realms.',p:[[70,34,150],[34,26,112]],l:[[0,22,0],[0,24,0]]},
    {text:'Then came the Hush: a long, silent storm. The roots stopped. The rivers dried, the gardens sank, and the Heart Tree fell asleep.',p:[[-96,15,86],[-44,12,74]],l:[[-10,0,52],[20,0,48]]},
    {text:'Before it slept, the tree woke its two oldest caretakers: a Giant shaped from riverstone, and a Sprite made from one of its blossoms.',p:[[0,9,44],[0,30,22]],l:[[0,10,0],[0,32,0]]},
    {text:'They remember nothing. Not the Vale, not the tree, not even each other.',p:[[7,4.5,97],[3.5,3.6,93.5]],l:[[0,1.6,88],[0,1.4,87.5]]},
    {text:'The first root runs north, to the Sunken Garden. Its gate is already glowing.',p:[[0,15,-58],[0,10,-86]],l:[[0,6,-108],[0,6,-108]]}],
    after(){hint('map','Press M for the map. Esc opens the menu, the journal and settings.');}},
  ch1_intro:{title:'Chapter 1: The Sunken Garden',lines:[
    {text:'The Sunken Garden was the first realm the Heart Tree fed. Its fountain has stood dry since the Hush.',p:[[14,12,-58],[8,9,-65]],l:[[0,2,-72],[0,2,-72]]},
    {text:'Three rune stones are hidden in its walls. Set them in the fountain and the first root will wake.',p:[[0,17,-18],[0,17,-42]],l:[[0,0,-30],[0,0,-50]]},
    {text:'Look closely, too. Some memories do not want to stay buried.',p:[[17,10,2],[21,11,-3]],l:[[28,3,-18],[28,4.5,-21]]},
    {text:'Work together. Neither of you can do this alone.',p:[[0,9,9],[0,7,4.5]],l:[[0,1,-3],[0,1,-3]]}]},
  root1:{title:'The first root wakes',lines:[
    {text:'Far away, deep under the Vale, the first root stirs.',p:[[34,20,62],[22,24,40]],l:[[0,6,0],[0,12,0]]},
    {text:'Water returns to the riverbed. The grey trees remember their green.',p:[[-34,10,78],[20,9,80]],l:[[-12,0,52],[20,0,48]]},
    {text:'Six roots still sleep. A second gate, to the Lantern Mines, has begun to flicker. (Chapter 2 arrives in the next update.)',p:[[0,40,120],[0,50,142]],l:[[0,10,0],[0,10,-20]]}]},
};
function playScene(id){if(!SCENES[id])return;G.scene=id;G.line=0;G.lineT=0;PROG.seen[id]=1;saveSoon();}
function storyNext(){const S=SCENES[G.scene];if(!S){G.scene='';return;}G.line++;G.lineT=0;if(G.line>=S.lines.length){const id=G.scene;G.scene='';G.line=0;camSnap=true;if(S.after)S.after();}}
function skipScene(){let n=0;while(G.scene&&n++<20)storyNext();}
// camera during a scene: a slow glide from one framing to the next (a still shot with reduced camera motion)
function sceneCamera(){
  const S=SCENES[G.scene];if(!S)return false;const L=S.lines[Math.min(G.line,S.lines.length-1)];
  const k=PROG.settings.camMotion==='reduced'?1:smooth(0,1,Math.min(1,G.lineT/8));
  camera.position.set(lerp(L.p[0][0],L.p[1][0],k),lerp(L.p[0][1],L.p[1][1],k),lerp(L.p[0][2],L.p[1][2],k));
  camTarget.set(lerp(L.l[0][0],L.l[1][0],k),lerp(L.l[0][1],L.l[1][1],k),lerp(L.l[0][2],L.l[1][2],k));camera.lookAt(camTarget);return true;
}
let storySig='';
function updateStoryUI(){
  const on=!!G.scene&&G.phase==='play';$('story').hidden=!on;$('hud').classList.toggle('scene',on||!!G.card);$('overlay').classList.toggle('scene',on);if(!on){storySig='';return;}
  const S=SCENES[G.scene],sig=G.scene+G.line;if(sig===storySig)return;storySig=sig;
  $('storyTitle').textContent=S.title;$('storyText').textContent=S.lines[G.line].text;
  $('storyDots').textContent=S.lines.map((_,i)=>i===G.line?'●':'○').join(' ');
  $('storyHelp').textContent=mode==='online'?(role==='host'?'Either of you: jump or interact to continue · Esc skips':'Either of you: jump or interact to continue'):'Jump or interact to continue · Esc skips';
}

// short lines spoken by the characters (speech bubbles + chat log), triggered by walking somewhere
const DLG={
  v1:{who:'s',text:"{g}? I think that's your name. Why do I know your name?",next:'v1b'},
  v1b:{who:'g',text:"{s}… I don't remember either. But that big tree feels like home."},
  v2:{who:'g',text:"It's asleep. I can hear it breathing, very slowly.",next:'v2b'},
  v2b:{who:'s',text:"The glow is coming from the north gate. Let's go, {g}!"},
  v3:{who:'s',text:'The Sunken Garden… We go through together, okay?'},
  v4:{who:'s',text:'A seed garden! {g}, we could plant the golden seeds we find.'},
  v5:{who:'g',text:'This gate is sealed. Its root must still be asleep.'},
  v6:{who:'s',text:"The river's back! Don't fall in, {g}. You'd sink like a stone.",next:'v6b'},
  v6b:{who:'g',text:'I am a stone, {s}.'},
  v7:{who:'s',text:'You can see the whole Vale from up here.'},
  c1:{who:'s',text:"It's so quiet here… stay close, {g}."},
  c2:{who:'s',text:"{g}, if you jump on the orange end, I bet I'd fly!"},
  c3:{who:'g',text:'Higher? Maybe if I really slam it down…'},
  c4:{who:'g',text:'This floor sounds hollow, {s}.'},
  c5:{who:'s',text:'Too deep for me. Too deep for you too, {g}.'},
  c6:{who:'g',text:'Too far to jump. Ready to fly, {s}?'},
  c7:{who:'s',text:'Listen. Water, deep under the stones.'},
  c8:{who:'s',text:'A lever! Maybe it lifts those sunken stones.'},
  c9:{who:'s',text:'I can fly back… no, I really can’t. Pull the lever?'},
};
const fill=t=>t.replace(/\{g\}/g,nameOf('g')).replace(/\{s\}/g,nameOf('s'));
let dlgPending=null;
function showDialogue(id){const d=DLG[id];if(!d)return;const t=fill(d.text);showBubble(d.who,t);if(mode==='online')addChatLine(d.who,t);}
function tickDialogue(dt){if(dlgPending){dlgPending.t-=dt;if(dlgPending.t<=0){G.dlg=dlgPending.id;G.dlgN++;dlgPending=null;}}}

// ================= memory petals =================
const MEMS=[
  {id:'m0',where:'The Vale: the lookout hill',title:'Two Shadows',text:'A memory with no beginning: two shadows on a hillside, one huge and one tiny, watching the same sunrise.'},
  {id:'m1',where:'Chapter 1: the hidden balcony',title:'The First Seed',text:'A muddy riverbank and a tiny light. The Sprite was guarding a single seed, far too heavy to carry alone. A stone Giant knelt down and held out one hand.'},
  {id:'m2',where:'Chapter 1: the cellar',title:'Across the Vale',text:'Nine days of walking. The Giant carried the seed; the Sprite rode on the Giant’s head and sang to keep the rain away.'},
  {id:'m3',where:'Chapter 1: the flooded island',title:'Where Water Sleeps',text:'They found a hollow where the river bent. “Here,” said the Sprite. The Giant pressed the seed into the soft earth with one careful thumb.'},
];
function drawMemory(c,id,W,H){
  const sky=c.createLinearGradient(0,0,0,H);
  const pal={m0:['#ffd9a8','#f7a7a0'],m1:['#bfe3f2','#e6f3e0'],m2:['#9fb8c9','#d2dfe0'],m3:['#ffe7b8','#cfe9c8']}[id]||['#bfe3f2','#e6f3e0'];
  sky.addColorStop(0,pal[0]);sky.addColorStop(1,pal[1]);c.fillStyle=sky;c.fillRect(0,0,W,H);
  const hill=(y,col,amp,ph)=>{c.fillStyle=col;c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=8)c.lineTo(x,y+Math.sin(x/W*Math.PI*2*1.2+ph)*amp);c.lineTo(W,H);c.fill();};
  const giant=(x,y,s,kneel)=>{c.fillStyle='#8c7a6a';c.beginPath();c.ellipse(x,y-60*s*(kneel?.75:1),42*s,58*s*(kneel?.75:1),0,0,7);c.fill();c.beginPath();c.arc(x+(kneel?14*s:0),y-(kneel?112:128)*s,24*s,0,7);c.fill();
    c.fillStyle='#a7957f';c.beginPath();c.ellipse(x-30*s,y-70*s,13*s,30*s,.4,0,7);c.fill();c.beginPath();c.ellipse(x+34*s,y-(kneel?50:70)*s,13*s,30*s,kneel?-1.1:-.4,0,7);c.fill();};
  const spr=(x,y,s)=>{const g=c.createRadialGradient(x,y,0,x,y,34*s);g.addColorStop(0,'rgba(220,255,245,.95)');g.addColorStop(1,'rgba(120,240,210,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,34*s,0,7);c.fill();
    c.fillStyle='#e9fff8';c.beginPath();c.arc(x,y,7*s,0,7);c.fill();c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.ellipse(x-10*s,y-6*s,9*s,5*s,-.5,0,7);c.fill();c.beginPath();c.ellipse(x+10*s,y-6*s,9*s,5*s,.5,0,7);c.fill();};
  const seed=(x,y,s)=>{c.fillStyle='#e2a93b';c.beginPath();c.ellipse(x,y,10*s,13*s,0,0,7);c.fill();c.fillStyle='#9a6a3e';c.beginPath();c.ellipse(x,y-11*s,11*s,5*s,0,0,7);c.fill();};
  if(id==='m0'){c.fillStyle='#fff2c6';c.beginPath();c.arc(W*.72,H*.62,46,0,7);c.fill();hill(H*.66,'#9cc47a',14,1);hill(H*.8,'#7fb062',10,2.5);
    c.fillStyle='rgba(60,50,60,.35)';c.beginPath();c.ellipse(W*.32,H*.82,90,14,0,0,7);c.fill();giant(W*.35,H*.8,1.1);spr(W*.47,H*.62,1.2);}
  else if(id==='m1'){hill(H*.6,'#9cc47a',12,.4);c.fillStyle='#7fb7c9';c.beginPath();c.moveTo(0,H*.74);c.bezierCurveTo(W*.3,H*.68,W*.6,H*.86,W,H*.76);c.lineTo(W,H*.9);c.bezierCurveTo(W*.6,H*.98,W*.3,H*.82,0,H*.88);c.fill();
    hill(H*.9,'#a98d6a',6,3);seed(W*.62,H*.86,1.2);spr(W*.68,H*.74,1);giant(W*.4,H*.92,1.15,true);}
  else if(id==='m2'){hill(H*.55,'#a6bfa6',18,1.6);hill(H*.75,'#8fb08a',12,.2);c.strokeStyle='#e6d3a8';c.lineWidth=14;c.beginPath();c.moveTo(W*.1,H);c.bezierCurveTo(W*.3,H*.8,W*.6,H*.86,W*.86,H*.62);c.stroke();
    c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;for(let i=0;i<46;i++){const x=hash2(i,1,4)*W,y=hash2(i,2,4)*H*.7;c.beginPath();c.moveTo(x,y);c.lineTo(x-6,y+16);c.stroke();}
    giant(W*.5,H*.88,1);spr(W*.5,H*.88-150,.9);seed(W*.5+36,H*.88-62,1.1);}
  else{hill(H*.62,'#a3cf84',12,2.2);c.fillStyle='#7fb7c9';c.beginPath();c.ellipse(W*.25,H*.82,150,26,-.1,0,7);c.fill();hill(H*.86,'#8a6a4c',4,1);
    giant(W*.58,H*.94,1.1,true);c.fillStyle='#6cbf52';c.beginPath();c.ellipse(W*.7,H*.84,4,12,0,0,7);c.fill();c.beginPath();c.ellipse(W*.7+8,H*.8,9,4,.4,0,7);c.fill();spr(W*.76,H*.7,1);}
  // soft vignette like an old storybook page
  const v=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.65);v.addColorStop(0,'rgba(255,250,240,0)');v.addColorStop(1,'rgba(120,90,60,.28)');c.fillStyle=v;c.fillRect(0,0,W,H);
}
let cardShown='';
function updateCardUI(){
  const id=G.phase==='play'?G.card:'';if(id===cardShown)return;cardShown=id;$('scrCard').hidden=!id;if(!id)return;
  const m=MEMS.find(m=>m.id===id);if(!m)return;
  drawMemory($('cardArt').getContext('2d'),id,640,340);
  $('cardEyebrow').textContent='Memory petal · '+m.where;$('cardTitle').textContent=m.title;$('cardText').textContent=m.text;
  const found=MEMS.filter(x=>PROG.petals[x.id]).length;
  $('cardHelp').textContent=found+' of '+MEMS.length+' memories in Book 1 so far. '+(mode==='online'?'Either of you: jump or interact to continue.':'Jump or interact to continue.');
}

// ================= journal, map, settings, travel =================
let overlayOpen='';
function openOverlay(id){overlayOpen=id;for(const s of ['scrJournal','scrMap','scrSettings','scrTravel'])$(s).hidden=s!==id;if(mode==='local'&&G.phase==='play')G.paused=true;}
function closeOverlay(){if(!overlayOpen)return;$(overlayOpen).hidden=true;overlayOpen='';if(mode==='local'&&$('scrPause').hidden)G.paused=false;}
function storySoFar(){
  const out=[];
  out.push(['The Hush','The Heart Tree fell asleep when the Hush stopped its seven roots. Before it slept it woke the Giant and the Sprite, who remember nothing.']);
  if(PROG.ch1.done)out.push(['The Sunken Garden','The Giant and the Sprite found three rune stones and woke the dry fountain. The first root stirred, the river came back and the Vale turned green again.']);
  else out.push(['Now','The north gate glows. The first root runs under the Sunken Garden, where three rune stones wait to be set in a dry fountain.']);
  if(PROG.ch1.done)out.push(['Next','A second gate has begun to flicker: the Lantern Mines. Chapter 2 arrives in the next update.']);
  return out;
}
let jTab='story';
function openJournal(tab){jTab=tab||jTab;openOverlay('scrJournal');renderJournal();}
function renderJournal(){
  for(const b of document.querySelectorAll('#scrJournal .tab'))b.classList.toggle('on',b.dataset.tab===jTab);
  $('jStory').hidden=jTab!=='story';$('jMem').hidden=jTab!=='mem';$('jMap').hidden=jTab!=='map';
  $('jTitle').textContent={story:'The story so far',mem:'Memories',map:'Map'}[jTab];
  if(jTab==='story'){const el=$('jStory');el.textContent='';
    for(const [h,t] of storySoFar()){const d=document.createElement('div');d.className='jentry';const b=document.createElement('h3');b.textContent=h;const p=document.createElement('p');p.textContent=t;d.append(b,p);el.appendChild(d);}
    const st=document.createElement('dl');st.className='stats';const add=(a,b)=>{const dt=document.createElement('dt');dt.textContent=a;const dd=document.createElement('dd');dd.textContent=b;st.append(dt,dd);};
    add('Roots awake',PROG.roots+' of 7');add('Golden seeds found',seedsFound()+' (planted '+PROG.planted+')');add('Memory petals',countKeys(PROG.petals)+' of '+MEMS.length);add('Secrets',countKeys(PROG.secrets)+' of 4');add('Waystones',countKeys(PROG.ws)+' of '+WAYS.length);
    if(PROG.ch1.best)add('Best time, Chapter 1',Math.floor(PROG.ch1.best/60)+' min '+(PROG.ch1.best%60)+' s');
    el.appendChild(st);}
  if(jTab==='mem'){const el=$('jMem');el.textContent='';
    for(const m of MEMS){const got=PROG.petals[m.id];const d=document.createElement('button');d.className='memthumb'+(got?'':' locked');d.disabled=!got;
      const cv=document.createElement('canvas');cv.width=320;cv.height=170;if(got){const c=cv.getContext('2d');c.scale(.5,.5);drawMemory(c,m.id,640,340);}
      const t=document.createElement('b');t.textContent=got?m.title:'Not found yet';const w=document.createElement('span');w.textContent=got?m.where:'Somewhere in '+m.where.split(':')[0];
      d.append(cv,t,w);if(got)d.onclick=()=>{const p=$('jMemView');p.hidden=false;drawMemory($('jMemArt').getContext('2d'),m.id,640,340);$('jMemTitle').textContent=m.title;$('jMemText').textContent=m.text;};el.appendChild(d);}
    $('jMemView').hidden=true;}
  if(jTab==='map')drawMap($('jMapCanvas'));
}
// ---- map ----
let valeMapImg=null;
function buildValeMapImage(){const N=200,cv=document.createElement('canvas');cv.width=cv.height=N;const c=cv.getContext('2d'),im=c.createImageData(N,N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=lerp(-128,128,i/(N-1)),z=lerp(-128,128,j/(N-1)),h=valeBase(x,z);valeColor(x,z,h,_vc);_vc.convertLinearToSRGB?0:0;
    const k=(j*N+i)*4;im.data[k]=Math.round(_vc.r*255);im.data[k+1]=Math.round(_vc.g*255);im.data[k+2]=Math.round(_vc.b*255);im.data[k+3]=255;}
  c.putImageData(im,0,0);valeMapImg=cv;}
function drawMap(cv){
  const c=cv.getContext('2d'),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);c.fillStyle='#e9e2d0';c.fillRect(0,0,W,H);
  let x0,x1,z0,z1;if(G.region==='vale'){x0=-128;x1=128;z0=-128;z1=128;}else{x0=-44;x1=44;z0=-86;z1=8;}
  const s=Math.min((W-40)/(x1-x0),(H-40)/(z1-z0)),ox=(W-(x1-x0)*s)/2,oz=(H-(z1-z0)*s)/2;
  const X=x=>ox+(x-x0)*s,Z=z=>oz+(z-z0)*s;
  if(G.region==='vale'){
    if(!valeMapImg)buildValeMapImage();c.imageSmoothingEnabled=true;c.drawImage(valeMapImg,X(-128),Z(-128),256*s,256*s);
    c.save();c.beginPath();c.rect(X(-128),Z(-128),256*s,256*s);c.clip();
    c.strokeStyle=VALE.wake>.5?'#4fb9cf':'#d8c39a';c.lineWidth=Math.max(3,(RIVER_W*1.6)*s);c.lineCap='round';c.beginPath();RIVER.forEach(([x,z],i)=>{i?c.lineTo(X(x),Z(z)):c.moveTo(X(x),Z(z));});c.stroke();
    for(const b of BRIDGES){c.fillStyle='#c9a983';c.fillRect(X(b.x)-3*s,Z(b.z)-9*s,6*s,18*s);}
    c.restore();
    c.fillStyle='#4e8f43';c.beginPath();c.arc(X(0),Z(0),15*s,0,7);c.fill();c.fillStyle='#ffb3cf';c.beginPath();c.arc(X(0),Z(0),6*s,0,7);c.fill();
    label(c,'Heart Tree',X(0),Z(0)+20*s+12,'#243039');
    for(const g of GATES){c.fillStyle=g.ready?'#f2873a':'#8f9aa3';c.beginPath();c.arc(X(g.pos.x),Z(g.pos.z),7,0,7);c.fill();label(c,g.ch+' · '+g.name,X(g.pos.x),Z(g.pos.z)+(g.pos.z<0?-14:22),g.ready?'#c9621a':'#5c6b76');}
    c.fillStyle='#8a6448';c.beginPath();c.arc(X(VALE.plot.x),Z(VALE.plot.z),6,0,7);c.fill();label(c,'Seed Garden',X(VALE.plot.x)-26,Z(VALE.plot.z)+4,'#5c6b76');
  }else{
    const cols=REG.ch1.colliders.filter(k=>k.mesh&&k.mesh.visible!==false);
    c.fillStyle='#20343d';c.fillRect(X(-44),Z(-33),88*s,6*s);
    for(const k of cols)if(k.max.y<=.3&&k.max.y>-.5&&k.max.y-k.min.y<1){c.fillStyle=k.mesh.material===M.pave?'#d9d4c8':'#b9d79a';c.fillRect(X(k.min.x),Z(k.min.z),(k.max.x-k.min.x)*s,(k.max.z-k.min.z)*s);}
    c.fillStyle='#7fc4d6';c.fillRect(X(POOL.x0),Z(POOL.z0),(POOL.x1-POOL.x0)*s,(POOL.z1-POOL.z0)*s);
    for(const k of cols)if(k.max.y>.3&&k.kind==='static'){c.fillStyle=k.max.y>3.6?'#8a7a66':'#b39c7e';c.fillRect(X(k.min.x),Z(k.min.z),Math.max(1.5,(k.max.x-k.min.x)*s),Math.max(1.5,(k.max.z-k.min.z)*s));}
    c.strokeStyle='#5fb8a0';c.lineWidth=3;c.beginPath();c.arc(X(F.x),Z(F.z),3*s,0,7);c.stroke();label(c,'Fountain',X(F.x),Z(F.z)+4*s+14,'#243039');
    label(c,'To the Vale',X(0),Z(7),'#118a6f');label(c,'Terraced garden',X(26),Z(-1),'#5c6b76');label(c,'Flooded garden',X(-26),Z(-45.5),'#5c6b76');
    for(const p of PETALS)if(p.reg==='ch1'&&PROG.petals[p.id]){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
  }
  for(const w of WAYS){if(w.reg!==G.region)continue;const on=PROG.ws[w.id];c.fillStyle=on?'#1fb3a3':'#a9b3ba';c.beginPath();c.moveTo(X(w.pos.x),Z(w.pos.z)-9);c.lineTo(X(w.pos.x)+6,Z(w.pos.z)+5);c.lineTo(X(w.pos.x)-6,Z(w.pos.z)+5);c.fill();}
  for(const p of PETALS)if(p.reg===G.region&&PROG.petals[p.id]&&G.region==='vale'){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
  for(const [b,col,r] of [[golem,'#f2873a','g'],[sprite,'#22bf9c','s']]){c.fillStyle='#fff';c.beginPath();c.arc(X(b.pos.x),Z(b.pos.z),9,0,7);c.fill();c.fillStyle=col;c.beginPath();c.arc(X(b.pos.x),Z(b.pos.z),6.5,0,7);c.fill();
    label(c,nameOf(r),X(b.pos.x),Z(b.pos.z)-14,col==='#f2873a'?'#c9621a':'#118a6f');}
}
function label(c,t,x,y,col){c.font='700 13px Nunito, sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(255,251,243,.9)';c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y);}
function openMap(){openOverlay('scrMap');renderMap();}
function renderMap(){const reg=curReg;$('mapTitle').textContent=reg.name;drawMap($('mapCanvas'));
  const L=$('mapLegend');L.textContent='';const add=(cls,t)=>{const s=document.createElement('span');s.className='lg '+cls;s.textContent=t;L.appendChild(s);};
  add('seed','Golden seeds here: '+seedsFoundIn(G.region)+' of '+seedsIn(G.region).length);
  add('petal','Memory petals here: '+PETALS.filter(p=>p.reg===G.region&&PROG.petals[p.id]).length+' of '+PETALS.filter(p=>p.reg===G.region).length);
  const sec=reg.secrets;add('secret','Secrets here: '+sec.filter(x=>PROG.secrets[x.id]).length+' of '+sec.length);
  add('way','Waystones: triangles');}
// ---- settings ----
function openSettings(){openOverlay('scrSettings');const st=PROG.settings;
  $('setMusic').value=Math.round(st.music*100);$('setSfx').value=Math.round(st.sfx*100);$('setCam').checked=st.camMotion==='reduced';$('setFlash').checked=!!st.reduceFlash;$('setShake').checked=!!st.shake;
  $('bErase').textContent='Erase saved progress';$('bErase').dataset.arm='';}
function wireSettings(){
  const upd=()=>{const st=PROG.settings;st.music=$('setMusic').value/100;st.sfx=$('setSfx').value/100;st.camMotion=$('setCam').checked?'reduced':'full';st.reduceFlash=$('setFlash').checked;st.shake=$('setShake').checked;applyVolumes();try{localStorage.setItem(SAVE_KEY,JSON.stringify(PROG));}catch(e){}};
  for(const id of ['setMusic','setSfx','setCam','setFlash','setShake'])$(id).addEventListener('input',upd);
  $('bSetClose').onclick=closeOverlay;
  $('bErase').onclick=()=>{const b=$('bErase');if(!b.dataset.arm){b.dataset.arm='1';b.textContent='Press again to erase everything';return;}
    eraseProgress();b.dataset.arm='';b.textContent='Progress erased';refreshTitleSave();if(G.phase==='play'){closeOverlay();$('scrPause').hidden=true;toTitle();}};
  for(const b of document.querySelectorAll('#scrJournal .tab'))b.onclick=()=>{jTab=b.dataset.tab;renderJournal();};
  $('bJClose').onclick=closeOverlay;$('bMapClose').onclick=closeOverlay;$('bTravelClose').onclick=closeOverlay;
  $('bJMemClose').onclick=()=>{$('jMemView').hidden=true;};
}
// ---- waystone travel (the host or the local game chooses; both travel) ----
function openTravel(){
  if(mode==='online'&&role!=='host'){toast(nameOf(myRole==='g'?'s':'g')+' chooses where to travel');return;}
  openOverlay('scrTravel');const L=$('travelList');L.textContent='';
  for(const w of WAYS){if(!PROG.ws[w.id])continue;const b=document.createElement('button');b.className='btn';const here=w.reg===G.region&&(dxz(golem.pos,w.pos)<4||dxz(sprite.pos,w.pos)<4);
    b.append((w.reg==='vale'?'The Vale: ':'Chapter 1: ')+w.name);const sm=document.createElement('small');sm.textContent=here?'you are here':(w.reg===G.region?'this area':'another area');b.append(sm);
    b.disabled=here;b.onclick=()=>{closeOverlay();travelToWaystone(w.id);};L.appendChild(b);}
}
function refreshTitleSave(){
  const has=PROG.seen.prologue;const el=$('saveNote');el.hidden=!has;
  if(has)el.textContent='Saved on this laptop: '+PROG.roots+' of 7 roots awake, '+seedsFound()+' golden seeds, '+countKeys(PROG.petals)+' memories. You continue in the Vale.';
}

// ================= chapter 1 and Vale story hooks (secrets and lines) =================
function storyHooks(){
  const hy=valeH(VALE_HILL.x,VALE_HILL.z);
  REG.vale.secrets=[{id:'v_lookout',name:'The lookout hill',test:b=>Math.hypot(b.pos.x-VALE_HILL.x,b.pos.z-VALE_HILL.z)<4&&b.pos.y>hy-.6}];
  REG.vale.talk=[
    {id:'v1',x:0,z:88,r:7,cond:()=>!PROG.ch1.done},{id:'v2',x:0,z:30,r:9,cond:()=>!PROG.ch1.done},{id:'v3',x:0,z:-100,r:9,cond:()=>!PROG.ch1.done},{id:'v4',x:VALE.plot.x,z:VALE.plot.z,r:8,cond:()=>seedsToPlant()>=5},
    ...GATES.slice(1).map(g=>({id:'v5',x:g.pos.x,z:g.pos.z,r:10})),
    {id:'v6',x:0,z:52,r:14,cond:()=>VALE.wake>.9},{id:'v7',x:VALE_HILL.x,z:VALE_HILL.z,r:5}];
  const C=CELLAR;
  REG.ch1.secrets=[
    {id:'c1_balcony',name:'The hidden balcony',test:b=>b.pos.x>25&&b.pos.x<31&&b.pos.z<-17&&b.pos.z>-23&&b.pos.y>4.5},
    {id:'c1_cellar',name:'The secret cellar',test:b=>b.pos.x>C.x0&&b.pos.x<C.x1&&b.pos.z>C.z0&&b.pos.z<C.z1&&b.pos.y<-1.5},
    {id:'c1_island',name:'The flooded island',test:b=>Math.hypot(b.pos.x+34,b.pos.z+55)<2.4&&b.pos.y>0}];
  REG.ch1.talk=[
    {id:'c1',x:0,z:-2,r:5},{id:'c2',x:SEESAW.x,z:SEESAW.z,r:6.5},{id:'c3',x:SEESAW.x,z:SEESAW.z,r:9,cond:()=>G.ch.launches>=1&&!PROG.secrets.c1_balcony},
    {id:'c4',x:34.8,z:-1.2,r:3.2,cond:()=>!crack.broken},{id:'c5',x:-13.5,z:-54.5,r:4},{id:'c6',x:0,z:-25,r:4.5,cond:()=>!bridge.open},
    {id:'c7',x:0,z:-66,r:6,cond:()=>!G.fountainOn},{id:'c8',x:-34,z:-55,r:2.6,cond:()=>!stones.raised}];
}
