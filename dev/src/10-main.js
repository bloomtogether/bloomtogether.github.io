// ================= screens =================
function show(id){
  if(document.activeElement&&document.activeElement.blur&&document.activeElement!==$('chatIn'))document.activeElement.blur();
  for(const s of ['scrTitle','scrBrief','scrPause','scrEnd'])$(s).hidden=s!==id;
  if(overlayOpen&&id!=='scrTitle')closeOverlay();
  $('hud').hidden=!(G.phase==='play');
  const chatOn=mode==='online'&&['brief','play','end'].includes(G.phase);$('chat').hidden=!chatOn;if(!chatOn&&chatOpen)closeChat();
}
let readyG=false,readyS=false;
function updateReady(){
  for(const [id,r,key,on] of [['readyG','g','Space',readyG],['readyS','s','Enter',readyS]]){
    const el=$(id);el.classList.toggle('on',on);el.textContent='';
    const who=cleanName($(r==='g'?'nameG':'nameS').value)||ROLE[r];
    if(on)el.append(who+' is ready');else{el.append(who+': press ');const k=document.createElement('kbd');k.textContent=key;el.append(k,' when ready');}
  }
  if(mode==='local'&&readyG&&readyS&&G.phase==='brief')startPlay();
}
for(const id of ['nameG','nameS','nameIn'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();if(id==='nameIn')$('nameIn').dispatchEvent(new Event('change'));}});
$('nameG').addEventListener('input',updateReady);$('nameS').addEventListener('input',updateReady);
function openBrief(){
  G.phase='brief';readyG=readyS=false;
  fillKeys($('keysG'),'g');fillKeys($('keysS'),'s');
  const online=mode==='online';
  $('lobbyInfo').hidden=!online;$('readyRow').hidden=online;$('lobbyText').hidden=!online;$('tipChat').hidden=!online;
  $('nameGWrap').hidden=online;$('nameSWrap').hidden=online;
  if(!online){if(!$('nameG').value)$('nameG').value=recall('bs_nameG');if(!$('nameS').value)$('nameS').value=recall('bs_nameS');}
  $('briefEyebrow').textContent=online?'Online room':'Before you set out';
  updateWho();
  $('bBegin').hidden=online&&role!=='host';
  updateReady();show('scrBrief');
}
function updateWho(){
  if(mode==='online'){const other=myRole==='g'?'s':'g';
    $(myRole==='g'?'whoG':'whoS').textContent=(myName||'You')+' (you)';
    $(other==='g'?'whoG':'whoS').textContent=partnerName?partnerName:'waiting for partner…';}
  else{$('whoG').textContent='left hand';$('whoS').textContent='right hand';}
}
function startPlay(){
  if(mode!=='online'||role==='host'){const sp=startSpot();G.scene='';G.card='';travel(sp.reg,sp.g,sp.s,Math.PI);G.time=0;}
  if(mode==='local'){names.g=cleanName($('nameG').value);names.s=cleanName($('nameS').value);store('bs_nameG',names.g);store('bs_nameS',names.s);}
  else{names[myRole]=myName;names[myRole==='g'?'s':'g']=partnerName;}
  G.phase='play';G.paused=false;resetWatch();hudCache={};camYaw=camYawT=0;
  fillKeys($('ckeysG'),'g');fillKeys($('ckeysS'),'s');fillKeys($('hkeysG'),'g');fillKeys($('hkeysS'),'s');$('helpChat').hidden=mode!=='online';
  helpOpen=false;$('help').hidden=true;chipT=0;objShowT=10;cntShowT=4;$('promptG').dataset.who='Giant';$('promptS').dataset.who='Sprite';fillKeys($('pkeysG'),'g');fillKeys($('pkeysS'),'s');
  const online=mode==='online';
  $('cardG').hidden=online&&myRole!=='g';$('cardS').hidden=online&&myRole!=='s';
  $('cardG').classList.toggle('solo',online);$('cardS').classList.toggle('solo',online);
  refreshNames();show(null);camSnap=true;
}
function togglePause(){
  if(G.phase!=='play')return;
  if(chatOpen){closeChat();return;}
  const open=$('scrPause').hidden;
  if(open){G.paused=mode==='local';$('pauseEyebrow').textContent=(mode==='local'?'Paused':'Menu (the game keeps running online)')+' · '+curReg.name;$('pauseObj').textContent=objectiveText();
    const boss=mode!=='online'||role==='host';$('bRestart').hidden=!boss||G.region!=='ch1';$('bToVale').hidden=!boss||G.region!=='ch1';$('scrPause').hidden=false;}
  else{G.paused=false;$('scrPause').hidden=true;}
}
function toTitle(){if(mode==='online'){leaveOnline();if(role!=='host'){const st=PROG.settings;PROG=freshProgress();loadProgress();PROG.settings=st;}}
  G.scene='';G.card='';closeOverlay();refreshTitleSave();mode=null;G.phase='title';G.paused=false;clearChat();partnerName='';partnerHere=false;names.g=names.s='';show('scrTitle');}
function showEnd(){
  const dl=$('endStats');dl.textContent='';const m=Math.floor(G.time/60),s=Math.floor(G.time%60);
  const add=(a,b)=>{const dt=document.createElement('dt');dt.textContent=a;const dd=document.createElement('dd');dd.textContent=b;dl.append(dt,dd);};
  add('Time',m+' min '+s+' s');add('Golden seeds',seedsFoundIn('ch1')+' of '+seedsIn('ch1').length);
  add('Memory petals',PETALS.filter(p=>p.reg==='ch1'&&PROG.petals[p.id]).length+' of 3');add('Secrets',REG.ch1.secrets.filter(x=>PROG.secrets[x.id]).length+' of 3');
  add(nameOf('s')+' thrown',G.throws+' times');add('Seesaw launches',String(G.ch.launches));add('Falls',String(G.falls));
  $('endLede').textContent=nameOf('g')+' and '+nameOf('s')+' woke the fountain together. Far away, under the Vale, the first root stirs.';
  const boss=mode!=='online'||role==='host';$('bAgain').hidden=!boss;$('bEndMenu').hidden=!boss;$('endWait').hidden=boss;show('scrEnd');
}
$('bLocal').onclick=()=>{initAudio();mode='local';myRole='g';role=null;clearChat();resetLevel();openBrief();};
$('bOnline').onclick=()=>{initAudio();const box=$('onlineBox');box.hidden=!box.hidden;if(!box.hidden&&!$('nameIn').value)$('nameIn').focus();};
function netWorking(on,msg){netBusy=on;setNetReady();if(msg)$('netNote').textContent=msg;}
function takeName(){myName=cleanName($('nameIn').value);if(!myName){$('netNote').textContent='Type your name first, so your partner knows who joined.';$('nameIn').focus();return false;}store('bs_name',myName);return true;}
const host=async r=>{if(!netOk()||netBusy||!takeName())return;initAudio();netWorking(true,'Creating a room…');mode='online';role='host';myRole=r;partnerName='';clearChat();
  let ok=false;for(let i=0;i<4&&ok!==true;i++){code=randCode();ok=await enterRoom();}
  if(ok!==true){mode=null;role=null;netWorking(false,'Could not create a room. Check the internet connection and try again.');return;}
  netWorking(false);$('lobbyCode').textContent=code;resetLevel();openBrief();};
$('bHostG').onclick=()=>host('g');$('bHostS').onclick=()=>host('s');
$('bJoin').onclick=async()=>{if(!netOk()||netBusy||!takeName())return;initAudio();const c=$('codeIn').value.toUpperCase().replace(/[^A-Z]/g,'');if(c.length!==4){$('netNote').textContent='Room codes are 4 letters. Check the code your partner sent.';return;}
  netWorking(true,'Connecting…');mode='online';role='guest';myRole='s';code=c;partnerName='';clearChat();const ok=await enterRoom();
  if(ok!==true){mode=null;role=null;netWorking(false,'Could not connect. Check the internet connection and try again.');return;}
  netWorking(false);$('lobbyCode').textContent=code;resetLevel();openBrief();};
$('codeIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('bJoin').click();});
$('bBegin').onclick=()=>{initAudio();if(mode==='local')startPlay();else if(role==='host'&&findPartner())startPlay();};
$('bBriefBack').onclick=toTitle;
$('bResume').onclick=togglePause;
$('bRestart').onclick=()=>{$('scrPause').hidden=true;if(G.region==='ch1')resetLevel();G.paused=false;resetWatch();};
$('bToVale').onclick=()=>{$('scrPause').hidden=true;G.paused=false;returnToVale();};
$('bJournal').onclick=()=>openJournal('story');$('bMapP').onclick=openMap;$('bSettings').onclick=openSettings;$('bSettingsT').onclick=()=>{initAudio();openSettings();};
$('bMute').onclick=()=>setMuted(!muted);
$('bQuit').onclick=()=>{$('scrPause').hidden=true;toTitle();};
function returnToVale(){const z=-100.5;G.phase='play';travel('vale',[-1.6,valeH(-1.6,z),z],[1.6,valeH(1.6,z),z],0);show(null);}
$('bAgain').onclick=returnToVale;
$('bEndMenu').onclick=()=>{G.phase='play';show(null);};
let partnerHere=false;
function notePartner(p){
  const here=!!p;names[myRole]=myName;
  if(here){const n=cleanName(p.presence.nm)||ROLE[myRole==='g'?'s':'g'];if(n!==partnerName){partnerName=n;names[myRole==='g'?'s':'g']=n;refreshNames();updateWho();}}
  if(here!==partnerHere){partnerHere=here;if(here)addChatLine(null,role==='host'?partnerName+' joined the room':'You joined '+partnerName+'\u2019s room',true);else if(partnerName)addChatLine(null,partnerName+' left or lost connection',true);updateWho();}
}
function lobbyTick(){
  if(G.phase!=='brief'||mode!=='online')return;
  const p=findPartner();const other=myRole==='g'?'Sprite':'Giant';
  if(role==='host'){$('bBegin').disabled=!p;$('lobbyText').textContent=p?(partnerName+' is here and plays the '+other+'. Press Begin when you have both read the controls.'):'Send this code to your partner. They choose Play online, type their name and the code, and press Join room.';}
  else{$('lobbyText').textContent=p?('Connected to '+partnerName+'. Waiting for them to press Begin. You play the '+(myRole==='g'?'Giant':'Sprite')+'.'):'Looking for room '+code+'. Ask your partner to create the room first, and check the code.';}
}

// ================= main loop =================
let last=performance.now(),acc=0;const STEP=1/60;
function frame(now){requestAnimationFrame(frame);tick(now);}
const PERF={acc:0,n:0,pr:Math.min(1.5,window.devicePixelRatio||1),max:Math.min(1.75,window.devicePixelRatio||1)};
function perfTune(rawDt){if(G.phase!=='play'&&G.phase!=='title')return;PERF.acc+=rawDt;PERF.n++;if(PERF.acc<1.5)return;
  const ms=PERF.acc/PERF.n*1000;PERF.acc=0;PERF.n=0;let pr=PERF.pr;
  if(ms>19)pr=Math.max(.75,pr-(ms>28?.25:.1));else if(ms<14.5)pr=Math.min(PERF.max,pr+.05);
  if(Math.abs(pr-PERF.pr)>.01){PERF.pr=pr;renderer.setPixelRatio(pr);renderer.setSize(innerWidth,innerHeight,false);pMat.uniforms.uScale.value=innerHeight*pr*.5;}}
function tick(now){
  const raw=(now-last)/1000;const dt=clamp(raw,0,.05);last=now;const t=now/1000;if(raw>0&&raw<.5)perfTune(raw);
  netPaused=false;
  if(mode==='online'&&R){
    const p=findPartner();if(p){lastSeen=now;partnerSeenEver=true;}
    notePartner(p);if(p)receiveChat(p.presence);
    if(role==='host'){
      const pin=partnerInput(p);
      if(G.phase==='play'&&!G.paused){
        netPaused=now-lastSeen>2500;
        if(!netPaused){acc+=dt;let first=true;while(acc>=STEP){const me=edge(edgeMe,rawOnline());const mine=first?me:Object.assign({},me,{jumpP:0,actP:0});const theirs=first?pin:Object.assign({},pin,{jumpP:0,actP:0});
          if(myRole==='g')stepSim(STEP,mine,theirs);else stepSim(STEP,theirs,mine);acc-=STEP;first=false;}} else acc=0;
      }
      R.presence({c:code,r:'h',hr:myRole,st:packState(),nm:myName,cn:chatNonce,ch:myChat}).catch(()=>{});
    } else {
      if(p&&p.presence!==lastPartnerPres){lastPartnerPres=p.presence;const nr=p.presence.hr==='s'?'g':'s';if(nr!==myRole){myRole=nr;updateWho();refreshNames();}
        const was=G.phase;applyState(p.presence.st);
        if(was!=='play'&&G.phase==='play')startPlay();}
      if(G.phase==='play'){guestSmooth(dt);netPaused=partnerSeenEver&&now-lastSeen>2500;}
      pushGuest(now);
    }
    lobbyTick();
  } else if(mode==='local'&&G.phase==='play'&&!G.paused){
    acc+=dt;let first=true;while(acc>=STEP){const ig=edge(edgeG,rawLocal('g')),is=edge(edgeS,rawLocal('s'));
      if(!first){ig.jumpP=ig.actP=0;is.jumpP=is.actP=0;}stepSim(STEP,ig,is);acc-=STEP;first=false;}
  } else acc=0;
  if(G.phase==='play'){
    runWatchers();updateHUD(dt);
    if(netPaused&&$('scrPause').hidden){$('pauseEyebrow').textContent='Waiting';$('pauseObj').textContent=(partnerName||'Your partner')+' disconnected. The game continues as soon as they are back in room '+code+'.';$('scrPause').hidden=false;}
    if(!netPaused&&mode==='online'&&$('pauseEyebrow').textContent==='Waiting'){$('scrPause').hidden=true;$('pauseEyebrow').textContent='Menu';}
  }
  if(G.phase==='end'&&$('scrEnd').hidden){$('hud').hidden=true;showEnd();}
  if(G.phase==='play'&&!$('scrEnd').hidden)show(null);
  if(mode==='online'&&role==='guest'&&G.phase==='brief'&&!$('scrEnd').hidden){openBrief();}
  updateCamera(dt,t);
  if(G.phase!=='loading'){updateVisuals(dt,t);updateParticles(dt);updateAudio(dt);updateFades(dt);}
  updateOverlay();updateChat(dt);updateStoryUI();updateCardUI();
  if(overlayOpen==='scrMap'&&Math.floor(t*4)!==Math.floor((t-dt)*4))drawMap($('mapCanvas'));
  if(saveT>0){saveT-=dt;if(saveT<=0)saveProgress();}
  renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else if(!muted)AC.resume();});

// ================= boot =================
async function boot(){
  loadProgress();
  try{buildTextures();buildMaterials();}catch(e){console.error(e);fail('Something went wrong while preparing the garden: '+e.message);return;}
  $('loadText').textContent='Waking the Giant and the Sprite…';
  const L=new GLTFLoader();L.setDRACOLoader(DRACO);
  const chars=Promise.all([L.loadAsync('assets/models/giant.glb'),L.loadAsync('assets/models/sprite.glb')]).then(([a,b])=>{MODELS={giant:a,sprite:b};}).catch(e=>{console.warn('Character models could not load, using simple shapes.',e);MODELS=null;});
  $('loadText').textContent='Fetching the sky, trees and textures…';
  await Promise.all([chars,loadProps(),loadReal()]);
  $('loadText').textContent='Growing the Vale…';await new Promise(r=>setTimeout(r,30));
  try{
    buildSky();if(REAL.ready)setupSky();
    buildVale();
    curBuild='ch1';
    const R=beginRegion('ch1',{name:'Chapter 1: The Sunken Garden',short:'Sunken Garden',chapter:1,fog:[70,190],spawn:{g:CP[0].g,s:CP[0].s},
      hazard:b=>b.pos.x>POOL.x0&&b.pos.x<POOL.x1&&b.pos.z>POOL.z0&&b.pos.z<POOL.z1&&b.pos.y<POOL.y-.3});
    if(REAL.ready)ch1RealBegin();
    buildWorld();buildInteractives();buildCh1Extras();if(REAL.ready)ch1RealFinish();endRegion(R);buildSeedInstances('ch1');curBuild='';
    storyHooks();
    buildGolem();buildSprite();initAmbientParticles();
    enterRegion('ch1');resetLevel();enterRegion('vale');
    const sp=startSpot();placeAt(golem,sp.g);placeAt(sprite,sp.s);
  }
  catch(e){console.error(e);fail('Something went wrong while building the Vale: '+e.message);return;}
  wireSettings();
  try{renderer.compile(scene,camera);}catch(e){}
  $('loading').hidden=true;G.phase='title';show('scrTitle');refreshTitleSave();
  $('nameIn').value=recall('bs_name');
  if(matchMedia('(pointer: coarse)').matches&&!matchMedia('(pointer: fine)').matches){$('netNote').textContent='This game needs a keyboard. On a phone or tablet it can only be watched.';}
  requestAnimationFrame(t=>{last=t;frame(t);});
}
// small debug handle used by automated tests
window.__bs={get PROG(){return PROG;},REG,travel,travelToWaystone,seesaw,crack,stones,SEEDS,PETALS,WAYS,GATES,VALE,playScene,skipScene,storyNext,valeH,saveProgress,eraseProgress,openMap,closeOverlay,get overlay(){return overlayOpen;},
  G,golem,sprite,get block(){return block;},runes,gate,bridge,port,plates,levers,get crank(){return crank;},latch,stepSim,resetLevel,startLocal:()=>{mode='local';resetLevel();startPlay();},NOIN,W,fadeables,camera,
  get camYaw(){return camYaw;},rotateCam,set dbgDist(v){dbgDist=v;},advance:(sec)=>{let n=performance.now();for(let i=0;i<sec*60;i++){n+=1000/60;tick(n);}},get models(){return MODELS;}};
boot();
