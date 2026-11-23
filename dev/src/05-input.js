// ================= names =================
const ROLE={g:'Giant',s:'Sprite'};
const names={g:'',s:''};
function nameOf(r){return names[r]||ROLE[r];}
function store(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function recall(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}}
const cleanName=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,16);

// ================= input =================
const keys={};
const GAME_KEYS=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Slash','ShiftRight','Tab'];
let chatOpen=false;
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  if(GAME_KEYS.includes(e.code))e.preventDefault();
  initAudio();
  if(e.repeat)return;keys[e.code]=true;
  if(e.code==='Escape'){
    if(overlayOpen){closeOverlay();return;}
    const boss=mode==='local'||role==='host';
    if(G.phase==='play'&&G.scene&&boss&&$('scrPause').hidden){skipScene();return;}
    if(G.phase==='play'&&G.card&&boss&&$('scrPause').hidden){G.card='';return;}
    togglePause();return;}
  if(e.code==='KeyM'){if(e.shiftKey||G.phase!=='play')setMuted(!muted);else if(!chatOpen&&!G.scene){if(overlayOpen==='scrMap')closeOverlay();else if(!overlayOpen)openMap();}}
  if(e.code==='KeyH'){cardsCollapsed=!cardsCollapsed;$('cardG').classList.toggle('collapsed',cardsCollapsed);$('cardS').classList.toggle('collapsed',cardsCollapsed);}
  if(G.phase==='play'&&(e.code==='KeyQ'||e.code==='KeyR'))rotateCam(e.code==='KeyQ'?-1:1);
  if(mode==='online'&&(G.phase==='play'||G.phase==='brief'||G.phase==='end')&&$('scrPause').hidden){
    if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();keys[e.code]=false;openChat();return;}
    const qm=/^(Digit|Numpad)([1-4])$/.exec(e.code);if(qm)sendChat(QUICK[+qm[2]-1],true);
  }
  if(G.phase==='brief'&&mode==='local'){if(e.code==='Space')readyG=true;if(e.code==='Enter'||e.code==='KeyO')readyS=true;updateReady();}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let cardsCollapsed=false;
function padState(i){const ps=navigator.getGamepads?navigator.getGamepads():[];const pads=[];for(const p of ps)if(p&&p.connected)pads.push(p);const p=pads[i];if(!p)return null;
  const dz=v=>Math.abs(v)<.22?0:v;return {mx:dz(p.axes[0]||0),mz:dz(p.axes[1]||0),jump:!!(p.buttons[0]&&p.buttons[0].pressed),act:!!((p.buttons[2]&&p.buttons[2].pressed)||(p.buttons[1]&&p.buttons[1].pressed))};}
const K=(...c)=>c.some(k=>keys[k])?1:0;
// screen-relative input -> world direction, following the camera's current turn
function toWorld(r){const c=Math.cos(camYaw),s=Math.sin(camYaw);const mx=r.mx*c+r.mz*s,mz=-r.mx*s+r.mz*c;r.mx=mx;r.mz=mz;return r;}
function rawLocal(which){ // which: 'g'|'s'
  let r;
  if(which==='g')r={mx:K('KeyD')-K('KeyA'),mz:K('KeyS')-K('KeyW'),jump:K('Space'),act:K('KeyE','KeyF')};
  else r={mx:K('ArrowRight','KeyL')-K('ArrowLeft','KeyJ'),mz:K('ArrowDown','KeyK')-K('ArrowUp','KeyI'),jump:K('Enter','KeyO'),act:K('ShiftRight','KeyU','Slash')};
  const p=padState(which==='g'?0:1);if(p){if(p.mx||p.mz){r.mx=p.mx;r.mz=p.mz;}r.jump=r.jump||p.jump;r.act=r.act||p.act;}
  return toWorld(r);
}
function rawOnline(){
  if(chatOpen||overlayOpen)return {mx:0,mz:0,jump:0,act:0};
  const r={mx:K('KeyD','ArrowRight')-K('KeyA','ArrowLeft'),mz:K('KeyS','ArrowDown')-K('KeyW','ArrowUp'),jump:K('Space'),act:K('KeyE','KeyF','ShiftRight')};
  const p=padState(0);if(p){if(p.mx||p.mz){r.mx=p.mx;r.mz=p.mz;}r.jump=r.jump||p.jump;r.act=r.act||p.act;}return toWorld(r);
}
function edge(state,raw){const o={mx:raw.mx,mz:raw.mz,jump:raw.jump,act:raw.act,jumpP:raw.jump&&!state.j?1:0,actP:raw.act&&!state.a?1:0};state.j=raw.jump;state.a=raw.act;return o;}
const edgeG={j:0,a:0},edgeS={j:0,a:0},edgeMe={j:0,a:0};

// ================= chat (online) =================
const QUICK=['Over here!','Throw me!','Wait for me','Got it!'];
const chatNonce=Math.random().toString(36).slice(2,9);let chatSeq=0,lastChatSent=0;const myChat=[];const seenChat={};const chatLines=[];
const bubbles={g:{el:null,t:0},s:{el:null,t:0}};
function openChat(){if(chatOpen)return;chatOpen=true;for(const k in keys)keys[k]=false;$('chatForm').hidden=false;$('chat').classList.add('open');$('chatIn').value='';$('chatIn').focus();}
function closeChat(){chatOpen=false;$('chatForm').hidden=true;$('chat').classList.remove('open');if(document.activeElement===$('chatIn'))$('chatIn').blur();}
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const t=$('chatIn').value.replace(/\s+/g,' ').trim();if(t)sendChat(t,false);closeChat();});
$('chatIn').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeChat();}});
$('chatIn').addEventListener('blur',()=>{if(chatOpen)setTimeout(()=>{if(chatOpen&&document.activeElement!==$('chatIn'))closeChat();},0);});
function sendChat(text,quick){
  const now=performance.now();if(now-lastChatSent<500)return;lastChatSent=now;
  text=String(text).slice(0,140);chatSeq++;myChat.push([chatSeq,text,quick?1:0]);if(myChat.length>6)myChat.shift();
  lastIn='';addChatLine(myRole,text);showBubble(myRole,text);SFX.ping(quick);
}
function receiveChat(pres){
  if(!pres||!Array.isArray(pres.ch)||typeof pres.cn!=='string')return;
  const last=seenChat[pres.cn]||0;let top=last;const r=myRole==='g'?'s':'g';
  for(const m of pres.ch){if(!Array.isArray(m))continue;const seq=m[0]|0;if(seq<=last)continue;const text=String(m[1]||'').slice(0,140);if(!text)continue;
    addChatLine(r,text);showBubble(r,text);SFX.ping(!!m[2]);if(seq>top)top=seq;}
  seenChat[pres.cn]=top;
}
function addChatLine(r,text,sys){
  const d=document.createElement('div');d.className='msg '+(sys?'sys':r);
  if(!sys){const b=document.createElement('b');b.textContent=nameOf(r);d.appendChild(b);}
  d.appendChild(document.createTextNode(text));$('chatLog').appendChild(d);chatLines.push({el:d,t:performance.now()});
  while(chatLines.length>8){const o=chatLines.shift();o.el.remove();}
}
function showBubble(r,text){const b=bubbles[r];b.el=b.el||$(r==='g'?'bubG':'bubS');b.el.textContent=text;b.el.hidden=false;b.t=4.5;}
function updateChat(dt){
  const now=performance.now();for(const l of chatLines)l.el.classList.toggle('old',now-l.t>9000);
  for(const r of ['g','s']){const b=bubbles[r];if(b.t>0){b.t-=dt;if(b.t<=0&&b.el)b.el.hidden=true;}}
}
function clearChat(){$('chatLog').textContent='';chatLines.length=0;for(const r of ['g','s']){const b=bubbles[r];b.t=0;const el=$(r==='g'?'bubG':'bubS');el.hidden=true;}}
