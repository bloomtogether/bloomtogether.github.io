// ================= audio =================
let AC=null,master=null,sfxBus=null,musicBus=null,muted=false,noiseBuf=null,amb={};
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=muted?0:.8;master.connect(AC.destination);
  sfxBus=AC.createGain();sfxBus.connect(master);musicBus=AC.createGain();musicBus.connect(master);applyVolumes();
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=.98*b+.02*w;d[i]=w*.5+b*3;}
  const loop=(type,f,q,vol)=>{const n=AC.createBufferSource();n.buffer=noiseBuf;n.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=vol;n.connect(fl);fl.connect(g);g.connect(sfxBus);n.start();return {g,fl};};
  amb.wind=loop('bandpass',380,.6,.05);amb.water=loop('lowpass',900,.5,0);amb.glide=loop('bandpass',2200,2,0);amb.grind=loop('lowpass',300,1,0);amb.fount=loop('bandpass',1400,.4,0);
  birdLoop();
}
function birdLoop(){if(!AC)return;setTimeout(birdLoop,2500+Math.random()*6000);if(G.phase!=='play'||muted||document.hidden||G.region==='ch2')return;
  const base=2200+Math.random()*1600,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)tone(base*(1+Math.random()*.2),base*(.8+Math.random()*.5),.09,'sine',.018,i*.13);}
function tone(f0,f1,dur,type,vol,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.012);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+dur+.05);}
function noiseHit(dur,vol,freq,type,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),n=AC.createBufferSource();n.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;const g=AC.createGain();
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);n.connect(f);f.connect(g);g.connect(sfxBus);n.start(t0,Math.random());n.stop(t0+dur+.05);}
const SFX={
  thud:v=>{noiseHit(.18,.22*v,160);tone(70,40,.18,'sine',.25*v);},
  hop:()=>{tone(880,1320,.12,'sine',.06);tone(1320,1760,.1,'sine',.03,.05);},
  land:()=>tone(660,520,.06,'sine',.03),
  clunk:()=>{noiseHit(.15,.25,700);tone(180,90,.2,'square',.05);},
  rumble:d=>{noiseHit(d,.28,120);noiseHit(d*.8,.12,500,'bandpass');},
  creak:()=>{for(let i=0;i<5;i++)tone(240+i*30,180,.25,'sawtooth',.02,i*.35);noiseHit(2,.1,300);},
  chime:()=>{[523,659,784].forEach((f,i)=>tone(f,f,1.2,'sine',.07,i*.08));tone(1568,1568,1.4,'sine',.03,.24);},
  place:()=>{noiseHit(.2,.25,400);[392,494,587].forEach((f,i)=>tone(f,f,1.4,'sine',.07,i*.1));},
  lift:()=>tone(330,500,.15,'triangle',.06),
  toss:()=>{noiseHit(.25,.18,1600,'bandpass');tone(500,900,.2,'sine',.05);},
  splash:()=>{noiseHit(.5,.4,1800);noiseHit(.9,.2,500);},
  click:()=>{tone(1200,900,.05,'square',.04);noiseHit(.06,.15,2000,'highpass');},
  ping:q=>{tone(q?988:784,q?1318:1046,.16,'sine',.07);tone(q?1318:1046,q?1568:1318,.18,'sine',.04,.08);},
  step:(surf,v)=>{v=v||1;if(surf==='wood'){tone(190,150,.09,'triangle',.07*v);noiseHit(.06,.08*v,900);}else if(surf==='stone'){noiseHit(.07,.13*v,1400,'bandpass');tone(95,60,.12,'sine',.16*v);}else{noiseHit(.12,.12*v,420);tone(70,45,.14,'sine',.12*v);}},
  tick:surf=>{noiseHit(.03,surf==='grass'?.035:.05,surf==='wood'?1500:2600,'bandpass');},
  pound:()=>{noiseHit(.5,.45,220);tone(90,32,.5,'sine',.4);noiseHit(.3,.15,900,'bandpass',.05);},
  crash:()=>{noiseHit(.9,.4,600);noiseHit(1.2,.25,180);for(let i=0;i<6;i++)tone(300+Math.random()*500,120,.15,'square',.02,.05+i*.08);},
  boing:big=>{tone(160,big?620:420,.35,'triangle',.09);tone(320,big?1240:840,.3,'sine',.04,.03);},
  seed:()=>{tone(1318,1318,.18,'sine',.05);tone(1760,1760,.25,'sine',.04,.07);},
  petal:()=>{[659,784,988,1318].forEach((f,i)=>tone(f,f,1.6,'sine',.06,i*.12));},
  secret:()=>{[523,659,784,1046,1318].forEach((f,i)=>tone(f,f*1.002,.9,'triangle',.045,i*.09));},
  stone:()=>{noiseHit(1.6,.18,260);tone(110,140,1.4,'sine',.07);},
  hum:()=>{tone(392,392,1.4,'sine',.05);tone(587,587,1.6,'sine',.04,.15);tone(784,784,1.8,'sine',.03,.3);},
  twinkle:()=>{tone(1760,2349,.12,'sine',.025);},
  pulse:()=>{tone(523,1046,.5,'sine',.07);tone(784,1568,.6,'sine',.045,.05);tone(1318,1760,.7,'sine',.025,.12);noiseHit(.4,.05,3200,'bandpass');},
  crystal:()=>{[1568,2093,2637].forEach((f,i)=>tone(f,f*1.003,.9,'sine',.03,i*.06));},
  drip:()=>{const f=1500+Math.random()*900;tone(f,f*.62,.07,'sine',.05);tone(f*.6,f*.4,.12,'sine',.022,.11);},
  swell:()=>{[262,330,392,523,659].forEach((f,i)=>{tone(f,f*1.001,4.5,'sine',.05,i*.35);tone(f*2,f*2,3,'sine',.015,i*.35+.1);});noiseHit(5,.3,1200,'bandpass',.2);},
};
function setMuted(m){muted=m;if(master)master.gain.value=m?0:.8;$('bMute').textContent=m?'Unmute sound':'Mute sound';}
function applyVolumes(){if(!AC)return;const st=PROG.settings;sfxBus.gain.value=st.sfx;musicBus.gain.value=st.music*.55;}
function updateAudio(dt){
  if(!AC)return;const t=AC.currentTime,focus=camTarget;
  let nearWater=0;
  if(G.region==='ch3')nearWater=Math.max(0,1-Math.hypot(focus.x,focus.z+36)/16)*.1;
  else if(G.region==='ch1')nearWater=Math.max(0,1-Math.abs(focus.z+30)/14)*.12+Math.max(0,1-Math.abs(focus.z+56)/8)*.04*(focus.x<0?1:.4)+(focus.x<-14&&focus.z<-44&&focus.z>-66?.08:0);
  else if(G.region==='vale'&&VALE.wake>.5)nearWater=Math.max(0,1-riverDist(focus.x,focus.z)/18)*.11;
  amb.water.g.gain.setTargetAtTime(G.phase==='play'?nearWater:0,t,.4);
  amb.wind.g.gain.setTargetAtTime(G.region==='ch3'&&G.phase==='play'?.09+Math.sin(t*.21)*.03:G.region==='ch2'&&G.phase==='play'?.018:(G.phase==='play'||G.phase==='title'?.05+Math.sin(t*.13)*.02:.02),t,.8);
  amb.glide.g.gain.setTargetAtTime(sprite.gliding&&G.phase==='play'?.04:0,t,.05);
  const ch2=G.region==='ch2'&&G.phase==='play',moving=ch2&&((mine.cart&&mine.cart.moved>0)||(mine.lift&&mine.lift.moving)||mine.boulder.st==='roll');
  amb.grind.g.gain.setTargetAtTime(golem.pushVis>0||moving?(mine.boulder.st==='roll'&&ch2?.45:.25):0,t,.08);
  if(ch2&&!muted&&Math.random()<dt*.45)SFX.drip();
  amb.fount.g.gain.setTargetAtTime(G.region==='ch1'&&(G.fountainOn||G.phase==='end')&&Math.hypot(focus.x-F.x,focus.z-F.z)<30?.12:0,t,.8);
  updateMusic(t);
}
