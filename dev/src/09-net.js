// ================= online =================
// Two transports with the same small interface (presence / peers / leave):
// a direct peer-to-peer link (PeerJS, works from any browser and from the plain file),
// and the claude.ai live room as a fallback when the peer link can't be made.
let myName='',partnerName='',mode=null,myRole='g',room=null,R=null,role=null,code='',lastSeen=0,partnerSeenEver=false,lastPartnerPres=null,netPaused=false,netBusy=false;
const HAS_P2P=typeof window.Peer==='function';
const NET_READY='Online is ready. One of you creates a room, the other joins with its code.';
const roomP=Promise.resolve(null);
function netOk(){return HAS_P2P||!!room;}
function setNetReady(){['bHostG','bHostS','bJoin'].forEach(id=>$(id).disabled=!netOk()||netBusy);
  $('netNote').textContent=netOk()?NET_READY:'Online play could not load. Check the internet connection and reload the page. Playing on one keyboard works anywhere.';}
setNetReady();roomP.then(r=>{room=r;if(!netBusy)setNetReady();});
function randCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s;}
const P2P_ID='bigsmall-sunken-garden-';
function p2pRoom(isHost,c){
  return new Promise((resolve,reject)=>{
    let peer;try{peer=isHost?new Peer(P2P_ID+c.toLowerCase(),{debug:0}):new Peer(P2P_ID+'guest-'+Math.random().toString(36).slice(2,12),{debug:0});}catch(e){reject('error');return;}
    const conns=new Set();let mine=null,dirty=false,dead=false,opened=false,cur=null,curT=0;
    const kill=()=>{dead=true;clearInterval(tick);clearInterval(watch);try{peer.destroy();}catch(e){}};
    const api={
      presence(o){mine=o;dirty=true;return Promise.resolve();},
      peers(){const out=[];for(const k of conns)if(k.open&&k.pres)out.push({sameTab:false,presence:k.pres});return out;},
      leave(){kill();return Promise.resolve();}
    };
    const tick=setInterval(()=>{if(dead||!dirty||!mine)return;dirty=false;for(const k of conns)if(k.open){try{k.send(mine);}catch(e){}}},33);
    function wire(k){conns.add(k);k.pres=null;
      k.on('open',()=>{dirty=true;});
      k.on('data',d=>{if(d&&typeof d==='object')k.pres=d;});
      const gone=()=>{k.gone=true;conns.delete(k);};k.on('close',gone);k.on('error',gone);}
    function connect(){
      if(dead)return;
      if(peer.disconnected){try{peer.reconnect();}catch(e){}return;}
      if(cur&&!cur.gone){try{cur.close();}catch(e){}}conns.clear();
      try{cur=peer.connect(P2P_ID+c.toLowerCase(),{serialization:'json',reliable:true});}catch(e){cur=null;return;}
      curT=performance.now();if(cur)wire(cur);}
    // guest: keep trying until the host's room answers, and reconnect if the link drops
    const watch=isHost?0:setInterval(()=>{if(dead||!opened)return;if(!cur||cur.gone||(!cur.open&&performance.now()-curT>6000))connect();},2000);
    peer.on('open',()=>{if(dead)return;opened=true;if(!isHost)connect();resolve(api);});
    peer.on('connection',k=>{if(!isHost||dead)return;for(const o of conns){try{o.close();}catch(e){}}conns.clear();wire(k);});
    peer.on('disconnected',()=>{if(!dead)setTimeout(()=>{try{if(!dead&&peer.disconnected)peer.reconnect();}catch(e){}},1500);});
    peer.on('error',e=>{const t=(e&&e.type)||'error';if(!opened){kill();reject(t);}});
    setTimeout(()=>{if(!opened&&!dead){kill();reject('timeout');}},15000);
  });
}
// returns true when connected to a room transport, 'taken' when the room code is already in use, false on failure
async function enterRoom(){
  lastSeen=performance.now();partnerSeenEver=false;lastPartnerPres=null;R=null;
  if(HAS_P2P){for(let i=0;i<3;i++){try{R=await p2pRoom(role==='host',code);return true;}catch(e){if(e==='unavailable-id')return 'taken';await new Promise(r=>setTimeout(r,800));}}}
  if(room){let r=room;try{r=await room.join('bs-'+code.toLowerCase());}catch(e){r=room;}R=r;return true;}
  return false;
}
function clearPresence(){if(R)R.presence({c:null,r:null,hr:null,st:null,in:null,nm:null,ch:null}).catch(()=>{});}
async function leaveOnline(){const r=R;clearPresence();R=null;if(r&&r!==room&&r.leave){try{await r.leave();}catch(e){}}}
function findPartner(){if(!R)return null;const want=role==='host'?'g':'h';for(const p of R.peers()){if(p.sameTab)continue;const pr=p.presence;if(pr&&pr.c===code&&pr.r===want)return p;}return null;}
const r2=v=>Math.round(v*100)/100;
function packState(){
  return {ph:G.phase,t:r2(G.time),
    g:[r2(golem.pos.x),r2(golem.pos.y),r2(golem.pos.z),r2(golem.yaw),r2(golem.vel.x),r2(golem.vel.z),golem.holding?1:0,golem.charging?1:0,r2(golem.charge),golem.runes,golem.onGround?1:0,golem.pushVis>0?1:0],
    s:[r2(sprite.pos.x),r2(sprite.pos.y),r2(sprite.pos.z),r2(sprite.yaw),r2(sprite.vel.x),r2(sprite.vel.y),r2(sprite.vel.z),sprite.held?1:0,sprite.gliding?1:0,sprite.onGround?1:0],
    b:[r2(block.pos.x),r2(block.pos.y),r2(block.pos.z)],
    r:runes.map(r=>[RS.indexOf(r.state),r2(r.pos.x),r2(r.pos.y),r2(r.pos.z)]),
    d:[gate.open?1:0,bridge.open?1:0,port.open?1:0,r2(latch.t),plates[0].on?1:0,plates[1].on?1:0,levers[0].pulled?1:0,levers[1].pulled?1:0,crank.used?1:0,r2(gate.t),r2(bridge.t),r2(port.t)],
    pl:G.placed,en:G.ending?1:0,et:r2(G.endT),f:G.falls,fn:G.fallN,lf:G.lastFall,th:G.throws,pk:G.pick,us:G.useN,
    rg:G.region,sc:[G.scene,G.line,r2(G.lineT)],cd:G.card,fo:G.fountainOn?1:0,
    ev:[G.poundN,r2(G.poundAt[0]),r2(G.poundAt[1]),r2(G.poundAt[2]),G.crackN,G.launchN,G.launchBig,G.seedN,G.petalN,G.secretN,G.lastSecret,G.wsN,G.lastWs,G.splashN,G.lastSplash,G.plantN,G.waitN,G.dlgN,G.dlg,G.travelReq,G.hopN||0],
    x:[r2(seesaw.tilt),crack.broken?1:0,stones.raised?1:0,r2(stones.t),levers[2]&&levers[2].pulled?1:0,golem.pound?1:0,r2(golem.airT||0)],
    ch:[G.ch.seeds,G.ch.petals,G.ch.secrets,G.ch.launches],
    pg:{r:PROG.roots,ws:Object.keys(PROG.ws).join(','),sd:Object.keys(PROG.seeds).join(','),pt:Object.keys(PROG.petals).join(','),se:Object.keys(PROG.secrets).join(','),pl:PROG.planted,sn:Object.keys(PROG.seen).join(','),c1:PROG.ch1.done,b1:PROG.ch1.best}};
}
const keySet=v=>{const o={};if(typeof v==='string'&&v)for(const k of v.split(',').slice(0,400))if(k)o[k.slice(0,24)]=1;return o;};
const RS=['rest','perched','vault','rolling','free','carried','placed'];
const tgtG=new V3(),tgtS=new V3();
function applyState(st){
  if(!st||!Array.isArray(st.g))return;
  const ph=['brief','play','end'].includes(st.ph)?st.ph:'brief';
  if(ph==='end'&&G.phase==='play'&&$('scrEnd').hidden)G.firstClear=false;
  if(ph==='play'&&G.phase!=='play'){camSnap=true;}
  G.phase=ph;G.time=+st.t||0;
  const g=st.g,s=st.s;
  tgtG.set(+g[0],+g[1],+g[2]);golem.yaw=+g[3];golem.vel.set(+g[4],0,+g[5]);golem.holding=!!g[6];golem.charging=!!g[7];golem.charge=+g[8];golem.runes=g[9]|0;golem.onGround=!!g[10];golem.pushing=!!g[11];
  tgtS.set(+s[0],+s[1],+s[2]);sprite.yaw=+s[3];sprite.vel.set(+s[4],+s[5],+s[6]);sprite.held=!!s[7];sprite.gliding=!!s[8];sprite.onGround=!!s[9];
  if(Array.isArray(st.b))block.pos.set(+st.b[0],+st.b[1],+st.b[2]);
  if(Array.isArray(st.r))st.r.forEach((a,i)=>{const r=runes[i];if(!r||!Array.isArray(a))return;r.state=RS[a[0]]||r.state;r.pos.set(+a[1],+a[2],+a[3]);});
  const d=st.d||[];gate.open=!!d[0];bridge.open=!!d[1];port.open=!!d[2];latch.t=+d[3]||0;plates[0].on=!!d[4];plates[1].on=!!d[5];levers[0].pulled=!!d[6];levers[1].pulled=!!d[7];crank.used=!!d[8];
  gate.t=+d[9]||0;bridge.t=+d[10]||0;port.t=+d[11]||0;
  if(typeof st.rg==='string'&&REG[st.rg]&&st.rg!==G.region){enterRegion(st.rg);if(st.rg==='vale')VALE.wake=(Array.isArray(st.sc)&&st.sc[0]==='root1')?0:valeWakeTarget();}
  if(Array.isArray(st.sc)){G.scene=SCENES[st.sc[0]]?st.sc[0]:'';G.line=st.sc[1]|0;G.lineT=+st.sc[2]||0;}
  G.card=MEMS.some(m=>m.id===st.cd)?st.cd:'';G.fountainOn=!!st.fo;
  if(Array.isArray(st.ev)){const e=st.ev;G.poundN=e[0]|0;G.poundAt=[+e[1]||0,+e[2]||0,+e[3]||0];G.crackN=e[4]|0;G.launchN=e[5]|0;G.launchBig=e[6]|0;G.seedN=e[7]|0;G.petalN=e[8]|0;G.secretN=e[9]|0;G.lastSecret=String(e[10]||'').slice(0,40);
    G.wsN=e[11]|0;G.lastWs=String(e[12]||'').slice(0,40);G.splashN=e[13]|0;G.lastSplash=e[14]==='g'?'g':'s';G.plantN=e[15]|0;G.waitN=e[16]|0;G.dlgN=e[17]|0;G.dlg=DLG[e[18]]?e[18]:'';G.travelReq=e[19]|0;G.hopN=e[20]|0;}
  if(Array.isArray(st.x)){const x=st.x;seesaw.tilt=+x[0]||-1;crack.broken=!!x[1];stones.raised=!!x[2];stones.t=+x[3]||0;if(levers[2])levers[2].pulled=!!x[4];golem.pound=!!x[5];golem.airT=+x[6]||0;}
  if(Array.isArray(st.ch))G.ch={seeds:st.ch[0]|0,petals:st.ch[1]|0,secrets:st.ch[2]|0,launches:st.ch[3]|0};
  if(st.pg&&typeof st.pg==='object'){const p=st.pg;PROG.roots=clamp(p.r|0,0,7);PROG.ws=keySet(p.ws);PROG.seeds=keySet(p.sd);PROG.petals=keySet(p.pt);PROG.secrets=keySet(p.se);PROG.planted=p.pl|0;PROG.seen=keySet(p.sn);PROG.ch1.done=p.c1?1:0;PROG.ch1.best=p.b1|0;}
  G.placed=st.pl|0;G.ending=!!st.en;G.endT=+st.et||0;G.falls=st.f|0;G.lastFall=st.lf==='g'?'g':'s';G.fallN=st.fn|0;G.throws=st.th|0;G.pick=st.pk|0;G.useN=st.us|0;
}
function guestSmooth(dt){
  const k=1-Math.exp(-dt*16);
  if(golem.pos.distanceTo(tgtG)>4)golem.pos.copy(tgtG);else golem.pos.lerp(tgtG,k);
  if(sprite.pos.distanceTo(tgtS)>4||sprite.held)sprite.pos.copy(tgtS);else sprite.pos.lerp(tgtS,k);
  for(const l of levers)l.t=approach(l.t,l.pulled?1:0,dt/.35);crank.t=approach(crank.t,crank.used?1:0,dt/2.6);
}
let guestJN=0,guestAN=0,lastPush=0,lastIn='';
function pushGuest(now){const r=rawOnline();
  if(r.jump&&!edgeMe.j)guestJN++;if(r.act&&!edgeMe.a)guestAN++;edgeMe.j=r.jump;edgeMe.a=r.act;
  const inp=[r2(r.mx),r2(r.mz),r.jump,guestJN,r.act,guestAN];const sig=inp.join();
  if(sig!==lastIn||now-lastPush>300){lastIn=sig;lastPush=now;R.presence({c:code,r:'g',in:inp,nm:myName,cn:chatNonce,ch:myChat}).catch(()=>{});}}
const partnerEdge={jn:-1,an:-1};
function partnerInput(p){
  const a=p&&p.presence&&Array.isArray(p.presence.in)?p.presence.in:null;if(!a)return NOIN;
  const jn=a[3]|0,an=a[5]|0;const jumpP=partnerEdge.jn>=0&&jn!==partnerEdge.jn?1:0,actP=partnerEdge.an>=0&&an!==partnerEdge.an?1:0;partnerEdge.jn=jn;partnerEdge.an=an;
  return {mx:clamp(+a[0]||0,-1,1),mz:clamp(+a[1]||0,-1,1),jump:a[2]?1:0,act:a[4]?1:0,jumpP,actP};
}

