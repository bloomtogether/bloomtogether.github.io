// ================= audio =================
let AC=null,master=null,muted=false,noiseBuf=null,amb={};
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=muted?0:.7;master.connect(AC.destination);
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=.98*b+.02*w;d[i]=w*.5+b*3;}
  const loop=(type,f,q,vol)=>{const n=AC.createBufferSource();n.buffer=noiseBuf;n.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=vol;n.connect(fl);fl.connect(g);g.connect(master);n.start();return {g,fl};};
  amb.wind=loop('bandpass',380,.6,.05);amb.water=loop('lowpass',900,.5,0);amb.glide=loop('bandpass',2200,2,0);amb.grind=loop('lowpass',300,1,0);amb.fount=loop('bandpass',1400,.4,0);
  birdLoop();
}
function birdLoop(){if(!AC)return;setTimeout(birdLoop,2500+Math.random()*6000);if(G.phase!=='play'||muted||document.hidden)return;
  const base=2200+Math.random()*1600,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)tone(base*(1+Math.random()*.2),base*(.8+Math.random()*.5),.09,'sine',.018,i*.13);}
function tone(f0,f1,dur,type,vol,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.012);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+.05);}
function noiseHit(dur,vol,freq,type,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),n=AC.createBufferSource();n.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;const g=AC.createGain();
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);n.connect(f);f.connect(g);g.connect(master);n.start(t0,Math.random());n.stop(t0+dur+.05);}
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
  swell:()=>{[262,330,392,523,659].forEach((f,i)=>{tone(f,f*1.001,4.5,'sine',.05,i*.35);tone(f*2,f*2,3,'sine',.015,i*.35+.1);});noiseHit(5,.3,1200,'bandpass',.2);},
};
function setMuted(m){muted=m;if(master)master.gain.value=m?0:.7;$('bMute').textContent=m?'Unmute sound':'Mute sound';}
function updateAudio(dt){
  if(!AC)return;const t=AC.currentTime,focus=camTarget;
  const nearWater=Math.max(0,1-Math.abs(focus.z+30)/14)*.12+Math.max(0,1-Math.abs(focus.z+56)/8)*.04*(focus.x<0?1:.4);
  amb.water.g.gain.setTargetAtTime(G.phase==='play'?nearWater:0,t,.4);
  amb.wind.g.gain.setTargetAtTime(G.phase==='play'||G.phase==='title'?.05+Math.sin(t*.13)*.02:.02,t,.8);
  amb.glide.g.gain.setTargetAtTime(sprite.gliding&&G.phase==='play'?.04:0,t,.05);
  amb.grind.g.gain.setTargetAtTime(golem.pushVis>0?.25:0,t,.08);
  amb.fount.g.gain.setTargetAtTime(G.ending||G.phase==='end'?.12:0,t,.8);
}
