// ================= physics =================
const GRAV=22;
const GOLEM={speed:3.4,jumpV:Math.sqrt(2*GRAV*1.4)},SPR={speed:5.2,jumpV:Math.sqrt(2*GRAV*1.1)};
function ov(b,c){return b.pos.x-b.hw<c.max.x&&b.pos.x+b.hw>c.min.x&&b.pos.z-b.hw<c.max.z&&b.pos.z+b.hw>c.min.z&&b.pos.y<c.max.y&&b.pos.y+b.h>c.min.y;}
function ovBox(a,c){return a.min.x<c.max.x&&a.max.x>c.min.x&&a.min.z<c.max.z&&a.max.z>c.min.z&&a.min.y<c.max.y&&a.max.y>c.min.y;}
function listFor(b){const out=[],r=b.hw+3;for(const c of colliders){if(!c.on||c===b.col)continue;if(c.kind==='golem'&&b.kind!=='sprite')continue;
  if(c.max.x<b.pos.x-r||c.min.x>b.pos.x+r||c.max.z<b.pos.z-r||c.min.z>b.pos.z+r)continue;out.push(c);}return out;}
function freeAt(b,list){for(const c of list)if(ov(b,c))return false;return true;}
function pushBlock(ax,d){
  const b=block;if(!b.onGround)return false;const old=b.pos[ax];b.pos[ax]+=d;syncBlock();
  for(const c of colliders){if(!c.on||c===b.col||c.kind==='golem')continue;if(ovBox(b.col,c)){b.pos[ax]=old;syncBlock();return false;}}
  return true;
}
function moveBody(b,dt,list){
  const wasGround=b.onGround;b.onGround=false;b.ground=null;
  const dy=b.vel.y*dt;b.pos.y+=dy;
  for(const c of list){if(!ov(b,c))continue;const prevY=b.pos.y-dy;
    if(dy<=0&&prevY>=c.max.y-.05){b.pos.y=c.max.y;b.vel.y=0;b.onGround=true;b.ground=c;}
    else if(dy>0&&prevY+b.h<=c.min.y+.05){b.pos.y=c.min.y-b.h-1e-4;b.vel.y=0;}}
  for(const ax of ['x','z']){const d=b.vel[ax]*dt;if(d===0)continue;b.pos[ax]+=d;
    for(const c of list){if(!ov(b,c))continue;
      const rise=c.max.y-b.pos.y;
      if((b.onGround||wasGround)&&rise>0&&rise<=b.stepH){const oy=b.pos.y;b.pos.y=c.max.y+.001;if(freeAt(b,list)){b.onGround=true;continue;}b.pos.y=oy;}
      if(c.kind==='block'&&b.kind==='golem'&&(b.onGround||wasGround)&&rise>.35){if(pushBlock(ax,d)&&!ov(b,c)){b.pushing=true;continue;}}
      if(d>0)b.pos[ax]=c.min[ax]-b.hw-1e-4;else b.pos[ax]=c.max[ax]+b.hw+1e-4;b.vel[ax]=0;}}
}
function depenetrate(b,c){
  if(!c.on||!ov(b,c))return;
  const top=c.max.y-b.pos.y;if(top>0&&top<.25){b.pos.y=c.max.y;return;}
  const px1=c.max.x-(b.pos.x-b.hw),px2=(b.pos.x+b.hw)-c.min.x,pz1=c.max.z-(b.pos.z-b.hw),pz2=(b.pos.z+b.hw)-c.min.z,m=Math.min(px1,px2,pz1,pz2);
  if(m===px1)b.pos.x+=px1;else if(m===px2)b.pos.x-=px2;else if(m===pz1)b.pos.z+=pz1;else b.pos.z-=pz2;
}
function approach(v,t,m){return v<t?Math.min(t,v+m):Math.max(t,v-m);}
function angLerp(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t;}
const dxz=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// ================= game state =================
const G={phase:'loading',time:0,falls:0,throws:0,placed:0,ending:false,endT:0,lastFall:'',fallN:0,paused:false,pick:0,useN:0};
function headPos(out){const f=fwd(golem.yaw);return out.set(golem.pos.x+f.x*.15,golem.pos.y+golem.h+.08,golem.pos.z+f.z*.15);}
const _f=new V3();function fwd(y){return _f.set(Math.sin(y),0,Math.cos(y));}

function resetLevel(){
  G.time=0;G.falls=0;G.throws=0;G.placed=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;
  gate.open=false;gate.t=0;bridge.open=false;bridge.t=0;port.open=false;port.t=0;latch.t=0;
  for(const l of levers){l.pulled=false;l.t=0;}crank.used=false;crank.t=0;
  block.pos.copy(block.home);block.vel.set(0,0,0);syncBlock();
  runes.forEach(r=>{r.state=['rest','perched','vault'][r.i];r.pos.copy(r.home);r.vel.set(0,0,0);r.t=0;});
  golem.runes=0;golem.holding=false;golem.charging=false;golem.cp=0;sprite.held=false;sprite.cp=0;
  placeAt(golem,CP[0].g);placeAt(sprite,CP[0].s);golem.yaw=sprite.yaw=Math.PI;
  W.basinWater.visible=false;W.jet.visible=false;W.fLight.intensity=0;W.sockets.forEach(s=>s.visible=false);
  hintsShown.clear();camSnap=true;
}
function placeAt(b,p){b.pos.set(p[0],p[1],p[2]);b.vel.set(0,0,0);b.onGround=false;}

// ---- interactions ----
function golemAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,F)<4.7){placeRunes();return;}
  for(const r of runes){if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2){r.state='carried';g.runes++;G.pick++;return;}}}
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75){sprite.held=true;g.holding=true;sprite.vel.set(0,0,0);sprite.gliding=false;G.pick++;return;}}
}
function placeRunes(){for(const r of runes)if(r.state==='carried'){r.state='placed';G.placed++;}golem.runes=0;}
function throwSprite(){
  const g=golem,c=g.charge,f=fwd(g.yaw),hs=3.4+5.4*c,vs=9.2-1.2*c;
  g.holding=false;g.charging=false;sprite.held=false;
  headPos(sprite.pos);sprite.pos.x+=f.x*.3;sprite.pos.z+=f.z*.3;
  if(!freeAt(sprite,listFor(sprite)))headPos(sprite.pos);
  sprite.vel.set(f.x*hs,vs,f.z*hs);sprite.thrownT=1.0;sprite.yaw=g.yaw;G.throws++;
}
function spriteTarget(){
  const s=sprite;let best=null,bd=1.2;
  const consider=(obj,p,label)=>{const d=dxz(s.pos,p);if(d<bd&&Math.abs(p.y-s.pos.y)<1.0){bd=d;best={obj,label};}};
  for(const l of levers)if(!l.pulled)consider(l,l.pos,'Pull the lever');
  if(!crank.used)consider(crank,crank.pos,'Turn the crank');
  const r1=runes[1];if(r1.state==='perched')consider(r1,r1.pos,'Nudge the rune stone off');
  return best;
}
function spriteAction(){
  const t=spriteTarget();if(!t)return;G.useN++;
  if(t.obj===crank){crank.used=true;bridge.open=true;}
  else if(t.obj.kind==='rune'){const r=t.obj;r.state='free';r.pos.y+=.05;r.vel.set(-3.8,3.2,2.0);r.onGround=false;}
  else{t.obj.pulled=true;if(t.obj.id==='gate')gate.open=true;else{const r=runes[2];if(r.state==='vault'){r.state='rolling';r.t=0;}}}
}

// ---- per-step simulation ----
const _h=new V3();
function stepSim(dt,IG,IS){
  if(G.phase!=='play')return;
  if(!G.ending)G.time+=dt;
  if(G.ending){IG=NOIN;IS=NOIN;}
  const g=golem,s=sprite;
  g.prev.copy(g.pos);
  // ---- golem ----
  if(IG.actP){if(g.holding){g.charging=true;g.charge=0;}else golemAction();}
  if(g.charging){g.charge=Math.min(1,g.charge+dt/.8);if(!IG.act)throwSprite();}
  {const len=Math.hypot(IG.mx,IG.mz),k=len>1?1/len:1,mx=IG.mx*k,mz=IG.mz*k;
   const spd=GOLEM.speed*(g.holding?.8:1)*(g.charging?.35:1)*(g.pushing?.6:1);g.pushing=false;
   const acc=(g.onGround?16:6)*dt*GOLEM.speed;
   g.vel.x=approach(g.vel.x,mx*spd,acc);g.vel.z=approach(g.vel.z,mz*spd,acc);
   if(len>.15)g.yaw=angLerp(g.yaw,Math.atan2(mx,mz),1-Math.exp(-dt*9));
   if(IG.jumpP&&g.coyote>0&&!g.holding&&!g.charging){g.vel.y=GOLEM.jumpV;g.coyote=0;}
   g.vel.y-=GRAV*dt;
   moveBody(g,dt,listFor(g));
   g.coyote=g.onGround?.12:g.coyote-dt;}
  g.delta.subVectors(g.pos,g.prev);syncGolemCol();
  // ---- block ----
  {block.vel.y-=GRAV*dt;block.vel.x=block.vel.z=0;const l=listFor(block);moveBody(block,dt,l);syncBlock();if(block.pos.y<-4){block.pos.copy(block.home);block.vel.set(0,0,0);syncBlock();}}
  // ---- sprite ----
  if(s.held){headPos(s.pos);s.yaw=g.yaw;s.vel.set(0,0,0);s.onGround=false;s.gliding=false;
    if(IS.jumpP){s.held=false;g.holding=false;g.charging=false;const f=fwd(g.yaw);s.vel.set(IS.mx*2.6+f.x*.6,SPR.jumpV,IS.mz*2.6+f.z*.6);syncGolemCol();}}
  else{
    if(IS.actP)spriteAction();
    if(s.ground===golem.col)s.pos.add(g.delta);
    depenetrate(s,golem.col);depenetrate(s,block.col);
    const len=Math.hypot(IS.mx,IS.mz),k=len>1?1/len:1,mx=IS.mx*k,mz=IS.mz*k;
    s.gliding=!s.onGround&&IS.jump&&s.vel.y<0;
    const tgt=s.onGround?SPR.speed:(s.gliding?3.2:4.6),acc=s.onGround?42*dt:(len<.15?0:(s.thrownT>0?4:13)*dt);
    s.vel.x=approach(s.vel.x,mx*tgt,acc);s.vel.z=approach(s.vel.z,mz*tgt,acc);
    if(s.gliding&&s.thrownT<=0){const hsp=Math.hypot(s.vel.x,s.vel.z);if(hsp>3.6){const kk=Math.max(3.6,hsp-6*dt)/hsp;s.vel.x*=kk;s.vel.z*=kk;}}
    if(len>.15)s.yaw=angLerp(s.yaw,Math.atan2(mx,mz),1-Math.exp(-dt*14));
    else if(!s.onGround&&Math.hypot(s.vel.x,s.vel.z)>1)s.yaw=angLerp(s.yaw,Math.atan2(s.vel.x,s.vel.z),1-Math.exp(-dt*8));
    if(IS.jumpP&&s.coyote>0){s.vel.y=SPR.jumpV;s.coyote=0;}
    s.vel.y-=GRAV*dt;if(s.gliding)s.vel.y=Math.max(s.vel.y,-1.6);
    moveBody(s,dt,listFor(s));
    s.coyote=s.onGround?.1:s.coyote-dt;s.thrownT-=dt;if(s.onGround)s.thrownT=0;
    s.airT=s.onGround?0:s.airT+dt;
  }
  // ---- runes ----
  for(const r of runes){
    if(r.state==='rolling'){r.t+=dt/1.4;const a=Math.min(1,r.t);r.pos.set(lerp(-8.6,-4.9,a),0,-47.3);if(a>=1){r.state='free';r.vel.set(.8,0,0);}}
    else if(r.state==='free'){r.vel.y-=GRAV*dt;const dr=Math.exp(-(r.onGround?7:.6)*dt);r.vel.x*=dr;r.vel.z*=dr;moveBody(r,dt,listFor(r).filter(c=>c.kind!=='golem'));
      if(r.pos.y<-4){r.pos.set(r.i===1?4.4:-4.5,0,r.i===1?-40:-47.3);r.vel.set(0,0,0);}}
  }
  // ---- plates & doors ----
  for(const p of plates){let w=0;const on=(b,wt)=>{if(Math.abs(b.pos.x-p.x)<p.hw+.05&&Math.abs(b.pos.z-p.z)<p.hw+.05&&b.pos.y<.25&&b.pos.y>-.2&&b.onGround)w+=wt;};
    on(g,10);on(block,10);if(!s.held)on(s,1);for(const r of runes)if(r.state==='free')on(r,2);p.on=w>=p.need;}
  if(!port.open){if(plates[0].on&&plates[1].on)latch.t+=dt;else latch.t=Math.max(0,latch.t-dt*1.5);if(latch.t>=1.1){port.open=true;latch.t=1.1;}}
  gate.t=approach(gate.t,gate.open?1:0,dt/2.4);bridge.t=approach(bridge.t,bridge.open?1:0,dt/2.6);port.t=approach(port.t,port.open?1:0,dt/2.2);
  for(const l of levers)l.t=approach(l.t,l.pulled?1:0,dt/.35);crank.t=approach(crank.t,crank.used?1:0,dt/2.6);
  applyDoorColliders();
  // ---- falls & checkpoints ----
  for(const b of [g,s]){
    if(b===s&&s.held)continue;
    if(b.onGround&&b.pos.y>-.5){for(let i=CP.length-1;i>b.cp;i--)if(b.pos.z<=CP[i].z){b.cp=i;break;}}
    if(b.pos.y<-5){
      const p=CP[b.cp][b===g?'g':'s'];placeAt(b,p);G.falls++;G.fallN++;G.lastFall=b===g?'g':'s';
      if(b===g&&g.holding){g.holding=false;g.charging=false;s.held=false;placeAt(s,CP[s.cp].s);}
      if(b===g)syncGolemCol();
    }
  }
  // ---- ending ----
  if(!G.ending&&G.placed>=3&&!s.held&&dxz(s.pos,W.spout)<.95&&s.pos.y>3.4&&s.pos.y<5){G.ending=true;G.endT=0;}
  if(G.ending){G.endT+=dt;if(G.endT>7.5){G.phase='end';}}
}
const NOIN={mx:0,mz:0,jump:0,jumpP:0,act:0,actP:0};
function applyDoorColliders(){
  gate.col.min.y=gate.base.y0+gate.t*3.5;gate.col.max.y=gate.base.y1+gate.t*3.5;
  port.col.min.y=port.base.y0+port.t*3.5;port.col.max.y=port.base.y1+port.t*3.5;
  bridge.col.on=bridge.t>=.97;
}
