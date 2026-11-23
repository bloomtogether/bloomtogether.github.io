// ================= calm generated music: a soft pad and a few plucks, per region =================
// Each bar picks the next chord of a short loop and plays it very quietly; plucks are sparse pentatonic notes.
const MUSIC={next:0,bar:0,key:''};
const SONGS={
  vale:{root:196.0,bar:4.8,prog:[[0,7,16],[-3,4,12],[-7,5,12],[-5,2,11]],pent:[0,2,4,7,9,12,14,16]},
  ch1:{root:174.6,bar:4.2,prog:[[0,7,14,16],[5,9,16],[-3,4,12],[2,9,14]],pent:[0,2,4,7,9,12,14]},
  title:{root:220.0,bar:5.5,prog:[[0,7,16],[5,12,16],[-3,7,12],[-5,7,14]],pent:[0,2,4,7,9,12]},
};
const semi=(f,n)=>f*Math.pow(2,n/12);
function padNote(f,t0,dur,vol){const o=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),lp=AC.createBiquadFilter();
  o.type='triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*1.004;lp.type='lowpass';lp.frequency.value=1100;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+dur*.35);g.gain.linearRampToValueAtTime(0,t0+dur*1.15);
  o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(musicBus);o.start(t0);o2.start(t0);o.stop(t0+dur*1.2);o2.stop(t0+dur*1.2);}
function pluck(f,t0,vol){const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.01);g.gain.exponentialRampToValueAtTime(.0006,t0+1.6);o.connect(g);g.connect(musicBus);o.start(t0);o.stop(t0+1.7);}
function updateMusic(now){
  if(!AC||!musicBus||muted||document.hidden||PROG.settings.music<=0)return;
  const key=G.phase==='title'||G.phase==='brief'?'title':(G.region==='ch1'?'ch1':'vale');
  if(key!==MUSIC.key){MUSIC.key=key;MUSIC.bar=0;MUSIC.next=Math.max(MUSIC.next,now+.3);}
  if(now<MUSIC.next-.25)return;
  const S=SONGS[key],t0=Math.max(now,MUSIC.next),ch=S.prog[MUSIC.bar%S.prog.length];
  for(const n of ch)padNote(semi(S.root,n),t0,S.bar,.035);
  padNote(semi(S.root,ch[0]-12),t0,S.bar,.03);
  const k=2+Math.floor(Math.random()*3);
  for(let i=0;i<k;i++){const n=S.pent[Math.floor(Math.random()*S.pent.length)]+12;pluck(semi(S.root,n),t0+(i+Math.random()*.6)*S.bar/k,.028);}
  MUSIC.bar++;MUSIC.next=t0+S.bar;
}
