// ================= watchers (sounds, toasts, one-shot animations) — run on every client =================
const WATCH={};
function watch(key,val,fn){if(!(key in WATCH)){WATCH[key]=val;return;}if(WATCH[key]!==val){const old=WATCH[key];WATCH[key]=val;fn(val,old);}}
function resetWatch(){for(const k in WATCH)delete WATCH[k];}
function runWatchers(){
  watch('region',G.region,()=>{fadeIn();hudCache={};});
  const ch1=G.region==='ch1';
  watch('gate',gate.open,v=>{if(v&&ch1&&!G.fountainOn){SFX.clunk();SFX.rumble(2.4);toast('The gate grinds open!');celebrate();}});
  watch('bridge',bridge.open,v=>{if(v&&ch1&&!G.fountainOn){SFX.clunk();SFX.creak();toast('The drawbridge lowers!');celebrate();}});
  watch('port',port.open,v=>{if(v&&ch1&&!G.fountainOn){SFX.clunk();SFX.rumble(2.2);toast('The portcullis locks open!');celebrate();}});
  watch('stones',stones.raised,v=>{if(v){SFX.stone();toast('Stepping stones rise from the water!');}});
  watch('pound',G.poundN,()=>poundFx(G.poundAt));
  watch('crack',G.crackN,()=>{SFX.crash();puff(34.8,0,-1.2,26,2.2,[.7,.66,.58],.5,2.2);toast('The floor gives way!');});
  watch('launch',G.launchN,()=>{SFX.boing(G.launchBig);sparkle(sprite.pos,G.launchBig?40:22);if(G.launchBig)hint('steer','Sprite: steer while you fly to land on a ledge.');else hint('pound','New: Ground Pound. Giant, jump and then press '+actKey('g')+' in mid-air to slam down. A slam on the seesaw throws the Sprite much higher.');});
  watch('seed',G.seedN,(v,o)=>{if(v>o){SFX.seed();const el=$('seedCount');el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');const n=seedsFound();if(n%10===0)toast(n+' golden seeds!');}});
  watch('petal',G.petalN,(v,o)=>{if(v>o)SFX.petal();});
  watch('secret',G.secretN,(v,o)=>{if(v>o){SFX.secret();toast('Secret found: '+G.lastSecret);}});
  watch('ws',G.wsN,(v,o)=>{if(v>o){SFX.hum();toast('Waystone awakened: '+G.lastWs);hint('ways','Waystones: press interact next to one to travel to any waystone you have woken.');}});
  watch('splash',G.splashN,(v,o)=>{if(v>o){SFX.splash();toast(nameOf(G.lastSplash)+' slipped into the water');}});
  watch('plant',G.plantN,(v,o)=>{if(v>o){SFX.chime();puff(VALE.plot.x,VALE.plot.y+.3,VALE.plot.z,18,1.6,[.95,.8,.9],.4,1.4);toast('Five seeds planted. Something is growing!');}});
  watch('wait',G.waitN,(v,o)=>{if(v>o)toast('Walk through together: '+(mode==='online'?'wait for your partner':'both of you')+'.');});
  watch('dlg',G.dlgN,(v,o)=>{if(v>o)showDialogue(G.dlg);});
  watch('travel',G.travelReq,(v,o)=>{if(v>o)openTravel();});
  watch('hop',G.hopN||0,(v,o)=>{if(v>o){SFX.twinkle();sparkle(sprite.pos,8);}});
  watch('pa',plates[0].on,v=>{if(v)SFX.click();});watch('pb',plates[1].on,v=>{if(v)SFX.click();});
  levers.forEach((l,i)=>watch('lv'+i,l.pulled,v=>{if(v)SFX.clunk();}));
  runes.forEach((r,i)=>watch('r'+i,r.state,(v,o)=>{
    if(v==='carried'){SFX.chime();const n=runes.filter(x=>x.state==='carried'||x.state==='placed').length;toast('Rune stone found ('+n+'/3)');}
    if(v==='placed'){SFX.place();}
    if(v==='free'&&o==='perched'){SFX.click();}
    if(v==='rolling'){SFX.rumble(1.4);}
  }));
  watch('placed',G.placed,v=>{if(G.fountainOn)return;if(v>=3)toast('All three runes are set. Wake the spout!');else if(v>0)toast(v+' of 3 runes set');});
  watch('fallN',G.fallN,()=>{if(!ch1)return;SFX.splash();toast(nameOf(G.lastFall==='g'?'g':'s')+' fell. Back to the checkpoint');});
  watch('held',sprite.held,v=>{if(v)SFX.lift();});
  watch('pick',G.pick,()=>{if(golem.A)golem.A.shot('PickUp',1.8);});
  watch('throws',G.throws,()=>{SFX.toss();if(golem.A)golem.A.shot('Throw',1.6);});
  watch('use',G.useN,()=>{if(sprite.A)sprite.A.shot('Interact',1.4);});
  watch('ending',G.ending,v=>{if(v){SFX.swell();toast('The fountain wakes!');celebrate();}});
  watch('sg',sprite.onGround,v=>{if(v&&!sprite.held)SFX.land();});
}

// ================= HUD helpers =================
let toastT=0,hintT=0;
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;toastT=3.2;}
const hintsShown=new Set();
function hint(id,text){if(hintsShown.has(id))return;hintsShown.add(id);$('hint').textContent=text;$('hint').style.opacity=1;hintT=8;}
function keysFor(role){
  if(mode==='online')return role==='g'?
    [['Move','WASD / Arrows'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']]:
    [['Move','WASD / Arrows'],['Jump · glide','Space (hold)'],['Interact','E'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']];
  return role==='g'?[['Move','W A S D'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R']]:
    [['Move','Arrow keys or I J K L'],['Jump · glide','Enter or O (hold)'],['Interact','Right Shift, U or /']];
}
function fillKeys(el,role){el.textContent='';for(const [a,b] of keysFor(role)){const s1=document.createElement('span');s1.textContent=a;const s2=document.createElement('span');
  let main=b,extra='';const pi=b.indexOf(' (');if(pi>=0){main=b.slice(0,pi);extra=b.slice(pi);}
  main.split(/( or | \/ |, )/).forEach(part=>{if(!part)return;if(/^( or | \/ |, )$/.test(part)){s2.appendChild(document.createTextNode(part));}else{const k=document.createElement('kbd');k.textContent=part;s2.appendChild(k);}});
  if(extra)s2.appendChild(document.createTextNode(extra));el.append(s1,s2);}}
function actKey(role){return mode==='online'?'E':(role==='g'?'E':'Right Shift');}
function jumpKey(role){return mode==='online'?'Space':(role==='g'?'Space':'Enter');}
function golemPrompt(){
  const g=golem,k=actKey('g');
  if(G.ending)return '';
  if(g.charging)return 'Release '+k+' to throw!';
  if(g.holding)return 'Tap '+k+' for a high lob, or hold '+k+' for a long throw';
  if(g.pound)return 'Slam!';
  const ch1=G.region==='ch1';
  if(ch1&&g.runes>0&&dxz(g.pos,F)<4.7)return k+': set the rune stones in the fountain';
  if(ch1)for(const r of runes)if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2)return k+': take the rune stone';}
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75)return k+': pick up '+nameOf('s');}
  if(G.region==='vale'&&plotNear(g)&&seedsToPlant()>=5)return k+': plant 5 golden seeds ('+seedsToPlant()+' to plant)';
  if(nearWaystone(g))return k+': travel from the waystone';
  if(!g.onGround&&g.airT>.12&&hintsShown.has('pound'))return k+' in mid-air: ground pound';
  if(ch1&&dxz(g.pos,block.pos)<1.8&&g.pos.y<block.pos.y+.3)return 'Walk into the block to push it';
  if(ch1&&dxz(g.pos,{x:SEESAW.x-2.55,z:SEESAW.z})<2.6&&seesaw.tilt<0)return 'Jump onto the orange end of the seesaw';
  return '';
}
function spritePrompt(){
  const s=sprite;if(G.ending)return '';
  if(s.held)return jumpKey('s')+': leap off. Or wait to be thrown';
  const t=spriteTarget();if(t)return actKey('s')+': '+t.label.toLowerCase();
  if(!s.onGround&&!s.gliding&&s.vel.y<0)return 'Hold '+jumpKey('s')+' to glide';
  if(G.region==='ch1'&&!G.fountainOn&&G.placed>=3&&dxz(s.pos,W.spout)<4)return 'Get onto the spout at the top of the fountain';
  if(G.region==='ch1'&&seesaw.tilt<0&&Math.abs(s.pos.x-(SEESAW.x+2.7))<1.6&&Math.abs(s.pos.z-SEESAW.z)<1.4)return 'Stand in the mint cup, then wait for the Giant';
  return '';
}
function objectiveText(){
  if(G.region==='vale'){
    if(!PROG.ch1.done)return 'Explore the Vale. When you are ready, walk through the glowing North Gate together to enter Chapter 1: The Sunken Garden.';
    if(seedsToPlant()>=5)return 'You have '+seedsToPlant()+' golden seeds to plant. Bring them to the Seed Garden by the Meadow waystone.';
    return 'The first root is awake. Explore the Vale, find seeds and memory petals, or return to the Sunken Garden for what you missed. Chapter 2 arrives in the next update.';}
  if(G.ending)return 'The fountain wakes.';
  if(G.fountainOn)return 'The fountain runs again. Look for missed seeds, memory petals and secrets, or walk back through the south gate to the Vale.';
  if(!gate.open)return 'Open the north gate. Its lever is in a small room behind the east wall. Only the Sprite fits through the glowing gap.';
  if(!bridge.open)return 'Cross the ravine. The Giant can pick up the Sprite and throw it over to the drawbridge crank.';
  if(!port.open)return 'Open the portcullis: hold both pressure plates at once. Giant on the big one, Sprite on the small one inside the walled alcove.';
  if(G.placed<3){const missing=runes.filter(r=>r.state!=='carried'&&r.state!=='placed');if(missing.length)return 'Find the missing rune stones ('+missing.map(r=>r.where.toLowerCase()).join(', ')+'), then bring them to the fountain.';
    return 'Giant: stand by the fountain and set the rune stones into its rim.';}
  return 'Wake the fountain: get the Sprite onto the spout at the very top. The Giant can lift it, and the Sprite can leap from its hands.';
}
let hudCache={};
function setText(id,t){if(hudCache[id]!==t){hudCache[id]=t;$(id).textContent=t;}}
function updateHUD(dt){
  const obj=objectiveText();if(hudCache.objText!==obj)objShowT=10;setText('objText',obj);
  if(helpOpen)setText('helpGoal',obj);
  const cs=seedsFound()+'|'+countKeys(PROG.petals)+'|'+G.region;if(hudCache.cnt!==cs){if(hudCache.cnt)cntShowT=4;hudCache.cnt=cs;}
  objShowT-=dt;cntShowT-=dt;chipT+=dt;
  const ch1=G.region==='ch1';$('runeList').hidden=!ch1||G.fountainOn;$('timerWrap').hidden=!ch1;
  setText('regName',curReg?curReg.short:'');setText('seedCount',String(seedsFound()));setText('petalCount',countKeys(PROG.petals)+'/'+MEMS.length);
  const rl=$('runeList');const sig=runes.map(r=>r.state).join();
  if(hudCache.runes!==sig){hudCache.runes=sig;rl.textContent='';for(const r of runes){const d=document.createElement('div');const st=r.state==='carried'?'carried':r.state==='placed'?'placed':'';d.className=st;
    d.textContent=r.where.split(' ')[1].replace(/^./,c=>c.toUpperCase())+(st==='carried'?' · carried':st==='placed'?' · set':'');d.title=r.where;rl.appendChild(d);}}
  const inWW=ch1&&(golem.pos.z<-44||sprite.pos.z<-44)&&golem.pos.x>-11&&!port.open;$('plates').hidden=!inWW;
  if(inWW){$('plA').classList.toggle('on',plates[0].on);$('plB').classList.toggle('on',plates[1].on);$('latch').firstChild.style.width=(latch.t/1.1*100)+'%';}
  const m=Math.floor(G.time/60),s=Math.floor(G.time%60);setText('timer',m+':'+(s<10?'0':'')+s);
  const pg=golemPrompt(),ps=spritePrompt();setText('promptG',pg);setText('promptS',ps);
  $('cardG').classList.toggle('empty',!pg);$('cardS').classList.toggle('empty',!ps);
  $('obj').classList.toggle('show',helpOpen||objShowT>0||inWW);$('topRight').classList.toggle('show',helpOpen||cntShowT>0);
  $('helpChip').classList.toggle('off',helpUsed||chipT>30);
  const ch=$('charge');const showCh=golem.charging&&(mode==='local'||myRole==='g');ch.hidden=!showCh;if(showCh)ch.querySelector('b').style.width=(golem.charge*100)+'%';
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0;}
  if(hintT>0){hintT-=dt;if(hintT<=0)$('hint').style.opacity=0;}
  const mineG=mode==='local'||myRole==='g',mineS=mode==='local'||myRole==='s';
  if(G.region==='vale'){
    if(mineS&&!VCAVE.grotto.open&&inCave(sprite.pos.x,sprite.pos.z,4)===CAVES[0])hint('grotto','Sprite: slip under the stone door, then pull the lever inside to lift it for the Giant.');
    if(!VCAVE.echo.raised&&(inCave(golem.pos.x,golem.pos.z,4)===CAVES[1]))hint('echo','Giant: lift the Sprite. Sprite: jump from the Giant\'s head over the wall.');
    if(mineG||mineS){if(plotNear(golem)||plotNear(sprite))hint('plot','Seed Garden: every 5 golden seeds you plant here grow into flowers. Your garden shows your progress.');}
    return;}
  if(dxz(golem.pos,{x:SEESAW.x,z:SEESAW.z})<6.5||dxz(sprite.pos,{x:SEESAW.x,z:SEESAW.z})<6.5)hint('seesaw','Seesaw: the Sprite stands in the mint cup. The Giant jumps onto the orange end, and the Sprite flies.');
  if(!crack.broken&&dxz(golem.pos,{x:34.8,z:-1.2})<3){if(hintsShown.has('pound'))hint('crack','A cracked slab. A ground pound might break it.');else hint('pound','New: Ground Pound. Giant, jump and then press '+actKey('g')+' in mid-air to slam down. That cracked slab looks weak.');}
  if(stones.raised===false&&(dxz(sprite.pos,{x:-24.5,z:-55})<2.5||dxz(golem.pos,{x:-24.5,z:-55})<2.5))hint('island','Too far to jump. Giant: throw the Sprite to the island.');
  if(G.time>1.5&&G.time<2.5)hint('start','Press H any time for help: your goal and every key.');
  if(mineS&&!gate.open&&dxz(sprite.pos,{x:10.5,z:-15.4})<4)hint('hole','Sprite: the glowing gap in the east wall is just big enough for you.');
  if(mineG&&runes[0].state==='rest'&&dxz(golem.pos,block.pos)<3)hint('block','Giant: push the stone block against the ledge, then climb up to the rune stone.');
  if(gate.open&&!bridge.open&&(golem.pos.z<-24||sprite.pos.z<-24))hint('ravine','Too far to jump. Giant: pick up the Sprite with '+actKey('g')+', hold it to charge a long throw. The Sprite can glide.');
  if(bridge.open&&runes[1].state==='perched'&&dxz(golem.pos,runes[1].pos)<6)hint('column','The rune stone is too high. Giant: tap '+actKey('g')+' for a short high lob onto the column.');
  if(gate.open&&runes[2].state==='vault'&&dxz(sprite.pos,{x:-6.2,z:-47.3})<4&&mineS)hint('vault','Sprite: crawl into the vault through the glowing slot and pull the lever.');
  if(!port.open&&(golem.pos.z<-50||sprite.pos.z<-50))hint('plates','Two plates must be held at once. Giant on the big one, Sprite slips into the alcove on the right.');
  if(port.open&&(golem.pos.z<-64||sprite.pos.z<-64))hint('fountain','Giant: set the runes into the fountain. Then lift the Sprite and let it leap onto the spout.');
  if(mineS&&sprite.airT>.45&&!sprite.held&&G.region==='ch1')hint('glide','Sprite: hold jump while falling to glide.');
  if(!stair.raised&&PROG.secrets.c1_balcony&&dxz(golem.pos,{x:19,z:-21.9})<4)hint('stair','A stair is sunk into the ground here. Its lever must be up on the balcony.');
  if(!pav.open&&dxz(golem.pos,{x:31,z:-70})<6)hint('tower','Giant: lift the Sprite and tap '+actKey('g')+' for a high lob onto the tower ledge.');
  if(!pav.open&&dxz(golem.pos,{x:20,z:-66})<4.5)hint('pavgate','The Sun Pavilion is locked. Its lever is up on the tower ledge.');
  if(pav.open&&!pav.lit&&(dxz(golem.pos,{x:pav.cx,z:pav.cz})<4.5||dxz(sprite.pos,{x:pav.cx,z:pav.cz})<4.5))hint('sun','Stand on the golden sun together.');
}
