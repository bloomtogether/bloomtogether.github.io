// ================= watchers (sounds, toasts, one-shot animations) — run on every client =================
const WATCH={};
function watch(key,val,fn){if(!(key in WATCH)){WATCH[key]=val;return;}if(WATCH[key]!==val){const old=WATCH[key];WATCH[key]=val;fn(val,old);}}
function resetWatch(){for(const k in WATCH)delete WATCH[k];}
function runWatchers(){
  watch('region',G.region,()=>{fadeIn();hudCache={};resetWatch();}); // every watcher starts fresh in a new region
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
  // ---- the Lantern Mines ----
  if(G.region==='ch2'){
    watch('pulse',G.pulseN||0,(v,o)=>{if(v>o){startPulseFx(G.pulseAt);SFX.pulse();}});
    watch('lan',mine.lan,(v,o)=>{if(v>o){SFX.chime();toast('Lantern lit ('+countBits(v)+' of '+LANTERNS.length+')');}});
    watch('cryst',G.crystN||0,(v,o)=>{if(v>o)SFX.crystal();});
    watch('sw',G.swN||0,(v,o)=>{if(v>o){SFX.clunk();toast(mine.sw.b?'Switch set: toward the barricade':'Switch set: the dead end');}});
    watch('smash',G.smashN||0,(v,o)=>{if(v>o){SFX.crash();puff(31.3,1.5,-40.1,30,2.4,[.6,.48,.34],.5,2.4);toast('The barricade bursts open!');celebrate();}});
    watch('bump',G.bumpN||0,(v,o)=>{if(v>o){SFX.thud(1);if(mine.cart.br===0&&!mine.bar.broken)toast('Dead end. Push the cart back and set the switch.');}});
    watch('cw',mine.lift.cw,v=>{if(v){SFX.clunk();SFX.rumble(1.2);toast('The counterweight drops free!');}});
    watch('rollB',G.rollN||0,(v,o)=>{if(v>o){SFX.rumble(3);toast('A boulder! Run, and hide in the hollow!');}});
    watch('bowl',G.bowlN||0,(v,o)=>{if(v>o){SFX.crash();toast('Bowled over! Back up the drift. Run for the hollow.');}});
    watch('wall',G.wallN||0,(v,o)=>{if(v>o){SFX.crash();puff(8.5,8,-62.5,36,3,[.6,.56,.5],.6,2.6);toast('The boulder smashes through the wall!');}});
    watch('boom',G.boomN||0,(v,o)=>{if(v>o){SFX.pound();puff(mine.boulder.x,.2,MINE.driftZ,26,3,[.55,.5,.45],.6,1.6);}});
    watch('door2',mine.door.open,v=>{if(v){SFX.clunk();SFX.rumble(2);toast('The iron door grinds open. A shortcut back to the yard.');}});
    LSTONES.forEach((st,i)=>watch('ls'+i,st.state,v=>{if(v==='carried'){SFX.chime();const n=LSTONES.filter(x=>x.state!=='rest').length;toast('Lantern stone found ('+n+'/3)');}if(v==='placed')SFX.place();}));
    watch('mplaced',mine.placed,v=>{if(minesDone()||G.ending)return;if(v>=3)toast('All three stones are set. Light the Great Lantern from the top!');else if(v>0)toast(v+' of 3 lantern stones set');});
    watch('fall2',G.fallN,()=>{SFX.splash();toast(nameOf(G.lastFall==='g'?'g':'s')+' fell into the dark. Back to safe ground');});
    watch('ending2',G.ending,v=>{if(v){SFX.swell();toast('The Great Lantern wakes!');celebrate();}});
  }
  // ---- the Windmill Heights ----
  if(G.region==='ch3'){
    watch('vane',G.vaneN||0,(v,o)=>{if(v>o){SFX.creak();toast(wheelWind()?'Both sails edge-on: the wind reaches the windmill wheel':VANES.some(vaneLifts)?'A sail catches the wind and sends it rising':'The sails turn');}});
    watch('hb1',hts.b1.open,v=>{if(v){SFX.clunk();SFX.creak();toast('The bridge lowers!');celebrate();}});
    watch('hb2',hts.b2.open,v=>{if(v){SFX.clunk();SFX.creak();toast('The bridge to the orchard lowers!');celebrate();}});
    watch('nudge',G.nudgeN||0,(v,o)=>{if(v>o)SFX.click();});
    watch('wheel',wheelWind(),v=>{if(v&&!heightsDone())toast('The windmill wheel starts to turn. Ride a platform up!');});
    COGS.forEach((c,i)=>watch('cog'+i,c.state,v=>{if(v==='carried'){SFX.chime();const n=COGS.filter(x=>x.state==='carried'||x.state==='placed').length;toast('Cog found ('+n+'/3)');}if(v==='placed')SFX.place();}));
    watch('hplaced',hts.placed,v=>{if(heightsDone()||G.ending)return;if(v>=3)toast('All three cogs are set. Wind rushes up the tower!');else if(v>0)toast(v+' of 3 cogs set');});
    watch('sw3',sprite.wind||'',(v,o)=>{if(v&&!o)SFX.hop();});
    watch('fall3',G.fallN,()=>{SFX.splash();toast(nameOf(G.lastFall==='g'?'g':'s')+' fell off the island. Back to safe ground');});
    watch('ending3',G.ending,v=>{if(v){SFX.swell();toast('The Great Windmill turns!');celebrate();}});
  }
}

// ================= HUD helpers =================
let toastT=0,hintT=0;
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;toastT=3.2;}
const hintsShown=new Set();
function hint(id,text){if(hintsShown.has(id))return;hintsShown.add(id);$('hint').textContent=text;$('hint').style.opacity=1;hintT=8;}
function keysFor(role){
  if(mode==='online')return role==='g'?
    [['Move','WASD / Arrows'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']]:
    [['Move','WASD / Arrows'],['Jump · glide','Space (hold)'],['Interact · light pulse','E'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']];
  return role==='g'?[['Move','W A S D'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R']]:
    [['Move','Arrow keys or I J K L'],['Jump · glide','Enter or O (hold)'],['Interact · light pulse','Right Shift, U or /']];
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
  if(g.holding&&inCh3()&&heightsCogTarget())return k+': take the cog';
  if(g.holding)return 'Tap '+k+' for a high lob, or hold '+k+' for a long throw';
  if(g.pound)return 'Slam!';
  const ch1=G.region==='ch1';
  if(inCh2()){
    if(g.winding)return 'Keep holding '+k+': winding the lift';
    if(g.runes>0&&dxz(g.pos,GL.sock)<3.4&&Math.abs(g.pos.y-.4)<1)return k+': set the lantern stones in the Great Lantern';
    for(const st of LSTONES)if(st.state==='rest'&&stoneReach(g,st))return k+': take the lantern stone';
    if(dxz(g.pos,WINCH_B)<2.2&&Math.abs(g.pos.y)<1)return 'Hold '+k+': wind the lift up';
  }
  if(inCh3()){
    if(g.runes>0&&dxz(g.pos,HT.gear)<3&&Math.abs(g.pos.y-13)<1)return k+': set the cogs in the gearbox';
    if(heightsCogTarget())return k+': take the cog';
    for(const v of VANES)if(dxz(g.pos,v.capPos)<2&&g.pos.y<1)return k+': turn the sail ('+(v.catch?'to edge-on':'to face the wind')+')';
    if(g.wading)return g.holding?'Wading. Deep water, but '+nameOf('s')+' is safe up top':'Wading through deep water';
  }
  if(ch1&&g.runes>0&&dxz(g.pos,F)<4.7)return k+': set the rune stones in the fountain';
  if(ch1)for(const r of runes)if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2)return k+': take the rune stone';}
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75)return k+': pick up '+nameOf('s');}
  if(G.region==='vale'&&plotNear(g)&&seedsToPlant()>=5)return k+': plant 5 golden seeds ('+seedsToPlant()+' to plant)';
  if(nearWaystone(g))return k+': travel from the waystone';
  if(!g.onGround&&g.airT>.12&&hintsShown.has('pound'))return k+' in mid-air: ground pound';
  if(ch1&&dxz(g.pos,block.pos)<1.8&&g.pos.y<block.pos.y+.3)return 'Walk into the block to push it';
  if(inCh2()&&dxz(g.pos,mine.cart.p)<2&&g.pos.y<.5&&!(mine.cart.br===1&&mine.cart.s>mine.cart.sJ+.5))return 'Walk into the cart to push it along the rails';
  if(ch1&&dxz(g.pos,{x:SEESAW.x-2.55,z:SEESAW.z})<2.6&&seesaw.tilt<0)return 'Jump onto the orange end of the seesaw';
  return '';
}
function spritePrompt(){
  const s=sprite;if(G.ending)return '';
  if(s.held)return jumpKey('s')+': leap off. Or wait to be thrown';
  if(s.winding)return 'Keep holding '+actKey('s')+': winding the lift';
  const t=spriteTarget();if(t)return actKey('s')+': '+t.label.toLowerCase();
  if(inCh2()&&!G.ending)return actKey('s')+': light pulse';
  if(inCh3()&&!s.onGround&&windAt(s))return 'Hold '+jumpKey('s')+' to ride the wind';
  if(inCh3()&&s.onGround&&windAt(s))return 'Jump and hold '+jumpKey('s')+' to ride the wind up';
  if(!s.onGround&&!s.gliding&&s.vel.y<0)return 'Hold '+jumpKey('s')+' to glide';
  if(G.region==='ch1'&&!G.fountainOn&&G.placed>=3&&dxz(s.pos,W.spout)<4)return 'Get onto the spout at the top of the fountain';
  if(G.region==='ch1'&&seesaw.tilt<0&&Math.abs(s.pos.x-(SEESAW.x+2.7))<1.6&&Math.abs(s.pos.z-SEESAW.z)<1.4)return 'Stand in the mint cup, then wait for the Giant';
  return '';
}
function objectiveText(){
  if(G.region==='vale'){
    if(!PROG.ch1.done)return 'Explore the Vale. When you are ready, walk through the glowing North Gate together to enter Chapter 1: The Sunken Garden.';
    if(seedsToPlant()>=5)return 'You have '+seedsToPlant()+' golden seeds to plant. Bring them to the Seed Garden by the Meadow waystone.';
    if(!PROG.ch2.done)return 'The first root is awake. The gate to the Lantern Mines glows in the eastern hills, past the lookout: walk through it together for Chapter 2.';
    if(!PROG.ch3.done)return 'Two roots are awake. The gate to the Windmill Heights glows at the eastern edge of the Vale: walk through it together for Chapter 3.';
    return 'Three roots are awake. Explore the Vale, plant seeds, or return to any chapter for what you missed. Chapter 4 arrives in a later update.';}
  if(inCh2())return mineObjective();
  if(inCh3())return heightsObjective();
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
  const ch1=G.region==='ch1',ch2=G.region==='ch2',ch3=G.region==='ch3';$('runeList').hidden=ch2?minesDone():ch3?heightsDone():(!ch1||G.fountainOn);$('timerWrap').hidden=!ch1&&!ch2&&!ch3;
  setText('regName',curReg?curReg.short:'');setText('seedCount',String(seedsFound()));setText('petalCount',countKeys(PROG.petals)+'/'+MEMS.length);
  const rl=$('runeList');const list=ch2?LSTONES:ch3?COGS:runes,sig=G.region+list.map(r=>r.state).join();
  if(hudCache.runes!==sig){hudCache.runes=sig;rl.textContent='';for(const r of list){const d=document.createElement('div');const st=r.state==='carried'?'carried':r.state==='placed'?'placed':'';d.className=st;
    d.textContent=(ch2||ch3?r.where:r.where.split(' ')[1].replace(/^./,c=>c.toUpperCase()))+(st==='carried'?' · carried':st==='placed'?' · set':'');d.title=r.where;rl.appendChild(d);}}
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
  // the Giant at a lever: only the Sprite's small hands can pull one
  if(mineG){for(const l of (G.region==='vale'?VLEVERS:inCh1()?levers:inCh2()?MLEVERS:inCh3()?HLEVERS:[]))if(!(l.pulled&&l.id!=='switch')&&dxz(golem.pos,l.pos)<2.4&&Math.abs(golem.pos.y-l.pos.y)<1.6&&dxz(sprite.pos,l.pos)>1.6){hint('glever','Only the Sprite can pull levers. Bring the Sprite here and press '+actKey('s')+'.');break;}}
  if(G.region==='vale'){
    {const E=CAVES[1];if(mineS&&!VCAVE.echo.raised&&(sprite.pos.x-E.x)*E.dir>2.2&&inCave(sprite.pos.x,sprite.pos.z,0)===E)hint('echolever','Sprite: pull the lever at the back of the cave ('+actKey('s')+'). It raises steps for the Giant.');}
    if(mineS&&!VCAVE.grotto.open&&inCave(sprite.pos.x,sprite.pos.z,4)===CAVES[0])hint('grotto','Sprite: slip under the stone door, then pull the lever inside to lift it for the Giant.');
    if(!VCAVE.echo.raised&&(inCave(golem.pos.x,golem.pos.z,4)===CAVES[1])&&(sprite.pos.x-CAVES[1].x)*CAVES[1].dir<2.2)hint('echo','Giant: lift the Sprite. Sprite: jump from the Giant\'s head over the wall.');
    if(mineG||mineS){if(plotNear(golem)||plotNear(sprite))hint('plot','Seed Garden: every 5 golden seeds you plant here grow into flowers. Your garden shows your progress.');}
    return;}
  if(ch2){mineHints(mineG,mineS);return;}
  if(ch3){heightsHints(mineG,mineS);return;}
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

// ================= the Lantern Mines: goal, hints =================
function mineObjective(){
  const g=golem,s=sprite,C=mine.cart,B=mine.boulder,L=mine.lift;
  if(G.ending)return 'The Great Lantern wakes.';
  if(minesDone())return 'The mines glow again, and the crystal bridges stay lit. Look for missed seeds, memory petals and secrets, or walk back out through the Mine Mouth to the Vale.';
  if(g.pos.z>-14&&s.pos.z>-14&&!mine.bar.broken)return lanLit(LANTERNS[0])?'Cross the chasm on the crystal bridge. Sprite: send a light pulse next to its glowing posts, then cross together before the light fades.':'It is dark down here. Sprite: press '+actKey('s')+' with nothing nearby to send out a light pulse. Light the lantern, then the crystal bridge.';
  if(!mine.bar.broken){if(C.br===0&&C.s>C.sJ)return 'The cart rolled to the dead end. Giant: push it back past the junction. Sprite: flip the switch on the scaffold toward the barricade.';
    return mine.sw.b?'The switch points at the barricade. Giant: push the cart along the rails, past the junction, and let it roll.':'A barricade blocks the tunnel east. Send the mine cart crashing into it: the Sprite flips the track switch up on the scaffold, the Giant pushes the cart.';}
  if(LSTONES[0].state==='rest')return 'Cross the Crystal Gallery to the far island and take the lantern stone. Bridges only hold while lit; one can only be lit from the far side.';
  if(LSTONES[1].state==='rest'){
    if(g.pos.y<5){if(!L.cw)return s.pos.y>5?'Sprite: free the jammed counterweight up top. Then the lift is light enough for you to wind the Giant up.':'Ride the pulley lift up to the high drift. Sprite: step into the lift. Giant: hold '+actKey('g')+' at the big winch, and keep holding until the Sprite is off.';
      return 'Giant: step into the lift. Sprite: hold '+actKey('s')+' at the little winch up top to wind the Giant up.';}
    return 'Take the lantern stone from the ledge on the high drift.';}
  if(!mine.wall.broken||B.st==='roll'||B.st==='wait')return 'Run west along the drift and hide in the hollow in the north wall. Let the boulder roll past.';
  if(g.pos.y>4.5&&g.pos.x>-4)return 'The boulder broke through into a great hall. Walk west along the drift and jump down into it.';
  if(LSTONES[2].state==='rest')return 'The last lantern stone sits across the dark pit in the hall. A hidden crystal path crosses it: the Sprite walks ahead and keeps pulsing, the Giant steps only where it glows.';
  if(mine.placed<3)return 'Giant: stand by the Great Lantern and set the lantern stones into its base.';
  return 'Light the Great Lantern. Giant: stand on its plinth, lift the Sprite and tap '+actKey('g')+' to lob it onto the top. Sprite: send out a light pulse from there.';
}
function mineHints(mineG,mineS){
  const g=golem,s=sprite,C=mine.cart,L=mine.lift,B=mine.boulder;
  if(G.time>1.5&&G.time<3&&!lanLit(LANTERNS[0]))hint('pulse','New: Light Pulse. Sprite, press '+actKey('s')+' with nothing nearby to send out a pulse of light. It lights lanterns and wakes crystals.');
  if(!minesDone()&&CRYST[0].t<=0&&(g.pos.z<-11&&g.pos.z>-14||s.pos.z<-11&&s.pos.z>-14)&&lanLit(LANTERNS[0]))hint('cbridge','Crystal bridges only hold while lit. Sprite: pulse next to the glowing posts, then cross together before the light fades.');
  if(!mine.bar.broken&&dxz(g.pos,C.p)<3)hint('cart','Giant: walk into the cart to push it along the rails. Where it goes depends on the track switch.');
  if(!mine.bar.broken&&!mine.sw.b&&(dxz(g.pos,{x:6,z:-34})<4||dxz(s.pos,{x:6,z:-34})<4))hint('switch','The track switch lever is up on the scaffold. Giant: lift the Sprite with '+actKey('g')+' so it can leap up from your head.');
  if(LSTONES[0].state==='rest'&&s.pos.x>45.5&&s.pos.x<50.5&&s.pos.z<-38.5&&s.pos.z>-43.5&&s.pos.y<1&&CRYST[2].t<=0)hint('throwI2','The next bridge can only be lit from the far island. Giant: throw the Sprite across.');
  if(!L.cw&&g.pos.x>52&&g.pos.y<1&&g.pos.z<-54)hint('liftA','Sprite: step into the lift. Giant: hold '+actKey('g')+' at the big winch to wind it up, and keep holding until the Sprite is off.');
  if(!L.cw&&s.pos.y>5&&s.pos.x>40&&mineS)hint('liftB','Sprite: free the counterweight with '+actKey('s')+'. Then the lift is light enough for you to wind it.');
  if(L.cw&&g.pos.y<1&&g.pos.x>52&&LSTONES[1].state==='rest')hint('liftC','Giant: step into the lift. Sprite: hold '+actKey('s')+' at the little winch up top.');
  if(B.st==='wait'||B.st==='roll')hint('chase','Run west along the drift and hide in the hollow in the wall!');
  if(LSTONES[2].state==='rest'&&(dxz(g.pos,{x:-21,z:-57})<4||dxz(s.pos,{x:-21,z:-57})<4))hint('pit','A path crosses the pit, hidden in the dark. Sprite: walk ahead and keep pulsing. Giant: step only where it glows.');
  if(mine.placed>=3&&(dxz(g.pos,{x:GL.x,z:GL.z})<6))hint('glob','Giant: stand on the plinth, lift the Sprite and tap '+actKey('g')+' to lob it onto the Great Lantern. Sprite: pulse from the top.');
  if(!mine.crack.broken&&dxz(g.pos,{x:-7.5,z:-79.5})<3)hint('crack2','This floor sounds hollow. Giant: a ground pound might break it.');
  if(mineS&&dxz(s.pos,{x:-9.5,z:-27})<3.5)hint('hole2','Sprite: the glowing gap in the wall is just your size.');
}

// ================= the Windmill Heights: goal, hints =================
function heightsObjective(){
  const g=golem,s=sprite;
  if(G.ending)return 'The Great Windmill turns.';
  if(heightsDone())return 'The Great Windmill turns again and water climbs to the orchards. Look for missed seeds, memory petals and secrets, or walk back out through the gate on the Landing Isle.';
  if(!hts.b1.open)return 'The bridge to the next island is raised. Its lever is up on the high ledge. Sprite: jump into the rising wind and hold '+jumpKey('s')+' to ride it up.';
  if(COGS[0].state==='rest')return 'The pond is too deep for the Sprite. Giant: lift the Sprite onto your head and wade across. A cog lies on a stone in the middle: take it as you pass.';
  if(COGS[1].state!=='carried'&&COGS[1].state!=='placed'){
    if(COGS[1].state==='free')return 'The cog fell from the pillar. Giant: pick it up.';
    return 'Steer the wind from the Wind Gate. Giant: turn the sails at their capstans. When only the far sail faces the wind, it rises beside the cog pillar: Sprite, ride it up and nudge the cog down.';}
  if(g.pos.y<11&&!wheelWind())return 'Turn both sails edge-on so the wind reaches the windmill wheel, then ride one of its platforms up to the High Orchard.';
  if(g.pos.y<11)return 'Ride a windmill platform up to the High Orchard together: step on as one comes level with the deck, step off at the top.';
  if(COGS[2].state==='rest'){if(!hts.b2.open)return 'The last cog is on the islet across the gap. Giant: throw the Sprite into the wind current over the gap (Sprite: hold '+jumpKey('s')+'). Then pull the lever for the bridge.';
    return 'Cross the bridge to the islet and take the last cog.';}
  if(hts.placed<3)return 'Giant: set the cogs in the gearbox at the foot of the Great Windmill.';
  return 'Sprite: ride the rising wind up the windmill tower (hold '+jumpKey('s')+') and release the brake on the balcony.';
}
function heightsHints(mineG,mineS){
  const g=golem,s=sprite;
  if(G.time>1.5&&G.time<3)hint('wind','New: Wind. Sprite, in a rising wind or a wind current, hold '+jumpKey('s')+' to spread your wings and ride it.');
  if(!hts.b1.open&&dxz(s.pos,{x:7,z:-4})<3)hint('tut3','Sprite: jump into the rising wind and keep holding '+jumpKey('s')+'. At the top, steer onto the ledge.');
  if(COGS[0].state==='rest'&&(g.pos.z<-26&&g.pos.z>-30||s.pos.z<-26&&s.pos.z>-30))hint('wade','New: Wading. The Giant can wade through deep water; the Sprite can\'t swim. Giant: pick up the Sprite with '+actKey('g')+' and walk in.');
  if(COGS[1].state==='perched'&&(g.pos.z<-55&&g.pos.y<1))hint('sails','The sails steer the wind. Giant: turn them at the capstans with '+actKey('g')+'. A sail facing the wind sends it rising, and blocks it for anything further along.');
  if(COGS[1].state==='perched'&&s.pos.y>8.5&&s.pos.x>13&&s.pos.x<17)hint('nudge','Sprite: nudge the cog off the pillar with '+actKey('s')+'.');
  if(COGS[1].state!=='perched'&&!wheelWind()&&g.pos.x>20&&g.pos.y<1)hint('wheelwind','The windmill wheel is still. Turn both sails edge-on so the wind can reach it.');
  if(wheelWind()&&g.pos.x>28&&g.pos.y<1)hint('ride','Step onto a platform when it comes level with the deck. Step off at the top onto the High Orchard.');
  if(COGS[2].state==='rest'&&!hts.b2.open&&g.pos.y>12&&g.pos.x<26)hint('gapthrow','Giant: lift the Sprite, face the islet and throw it into the wind current. Sprite: hold '+jumpKey('s')+' and ride it across.');
  if(hts.placed>=3&&!G.ending&&dxz(s.pos,{x:52,z:-77.9})<5)hint('tower','Sprite: jump into the rising wind by the gearbox and hold '+jumpKey('s')+' all the way up. Land on the balcony.');
  if(mineS&&s.pos.x>11&&s.pos.z>0&&s.pos.z<6&&s.pos.y>-.5&&s.pos.y<1)hint('nest','Something glints on a little rock below the edge. Only wings could get down there and back.');
}
