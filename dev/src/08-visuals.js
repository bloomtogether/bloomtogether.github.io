// ================= camera: calm follow, quarter-turns with Q / R =================
const camTarget=new V3(0,1,0);let camSnap=true,camDist=14,camYaw=0,camYawT=0,camY=1,dbgDist=0;const PITCH=0.84;
function rotateCam(d){camYawT+=d*Math.PI/2;}
const _mid=new V3();
function updateCamera(dt,t){
  if(G.phase==='title'||G.phase==='loading'){const a=t*.04;camera.position.set(Math.sin(a)*18,11,-9+Math.cos(a)*18);camTarget.set(0,1.5,-10);camera.lookAt(camTarget);return;}
  const gy=Math.max(-1,golem.pos.y),sy=Math.max(-1,sprite.pos.y);
  _mid.set((golem.pos.x+sprite.pos.x)/2,(gy+sy)/2+1,(golem.pos.z+sprite.pos.z)/2);
  const sep=Math.hypot(golem.pos.x-sprite.pos.x,golem.pos.z-sprite.pos.z);
  let want=clamp(14.5+Math.max(0,sep-5)*.85,14.5,26);
  if(G.ending||G.phase==='end'){want=16;_mid.set(F.x,2.2,F.z);}
  if(dbgDist)want=dbgDist;
  const k=camSnap?1:1-Math.exp(-dt*4);
  camTarget.x=lerp(camTarget.x,_mid.x,k);camTarget.z=lerp(camTarget.z,_mid.z,k);
  camY=camSnap?_mid.y:lerp(camY,_mid.y,1-Math.exp(-dt*2.5));camTarget.y=camY;
  camDist=camSnap?want:lerp(camDist,want,1-Math.exp(-dt*1.2));
  camYaw=camSnap?camYawT:angLerp(camYaw,camYawT,1-Math.exp(-dt*7));
  camSnap=false;
  camera.position.set(camTarget.x+Math.sin(camYaw)*Math.cos(PITCH)*camDist,camTarget.y+Math.sin(PITCH)*camDist,camTarget.z+Math.cos(camYaw)*Math.cos(PITCH)*camDist);
  camera.lookAt(camTarget);
}

// ================= see-through walls =================
const _ray=new THREE.Raycaster(),_dir=new V3(),_tp=new V3();
function setOpacity(o,a){
  if(!o.material)return;
  if(!o.userData.ownMat){o.material=o.material.clone();o.userData.ownMat=true;}
  const m=o.material;m.transparent=a<.999;m.opacity=a;m.depthWrite=a>.98;
}
function updateFades(dt){
  for(const m of fadeables){const f=m.userData.fade;if(!f.leader)f.t=1;}
  if(G.phase==='play'||G.phase==='end'){
    const probes=[[golem,1.4],[golem,.4],[sprite,.25]];
    for(const [b,hgt] of probes){
      _tp.set(b.pos.x,b.pos.y+hgt,b.pos.z);_dir.subVectors(_tp,camera.position);const dist=_dir.length();if(dist<.5)continue;_dir.divideScalar(dist);
      _ray.set(camera.position,_dir);_ray.far=dist-.25;
      for(const h of _ray.intersectObjects(fadeables,false)){const f=h.object.userData.fade;(f.leader?f.leader.userData.fade:f).t=.1;}
    }
  }
  for(const m of fadeables){const f=m.userData.fade;if(f.leader||(f.o===1&&f.t===1))continue;
    f.o=approach(f.o,f.t,dt*(f.t<f.o?5:2.5));
    setOpacity(m,f.o);for(const o of f.linked)setOpacity(o,f.o);}
}

// ================= name tags, chat bubbles, off-screen arrows =================
const _pv=new V3();
function screenOf(x,y,z){_pv.set(x,y,z).project(camera);const behind=_pv.z>1;let sx=_pv.x,sy=_pv.y;if(behind){sx=-sx;sy=-sy;}
  return {x:(sx*.5+.5)*innerWidth,y:(-sy*.5+.5)*innerHeight,behind,inView:!behind&&Math.abs(sx)<.97&&Math.abs(sy)<.95};}
function updateOverlay(){
  const show=G.phase==='play';$('overlay').hidden=!show;if(!show)return;
  for(const r of ['g','s']){
    const b=r==='g'?golem:sprite,top=r==='g'?2.85:(sprite.held?1.25:.8);
    const p=screenOf(b.pos.x,b.pos.y+top,b.pos.z);
    const tag=$(r==='g'?'tagG':'tagS');
    tag.style.display=p.inView?'':'none';
    if(p.inView)tag.style.transform='translate('+p.x.toFixed(1)+'px,'+p.y.toFixed(1)+'px) translate(-50%,-100%)';
    const edgeEl=$(r==='g'?'edgeG':'edgeS');
    const care=mode==='local'||r!==myRole;
    if(!p.inView&&care){
      const cx=innerWidth/2,cy=innerHeight/2;let dx=p.x-cx,dy=p.y-cy;const mx=cx-70,my=cy-60;const s=Math.min(mx/Math.max(1e-3,Math.abs(dx)),my/Math.max(1e-3,Math.abs(dy)));
      dx*=s;dy*=s;edgeEl.style.transform='translate('+(cx+dx).toFixed(1)+'px,'+(cy+dy).toFixed(1)+'px) translate(-50%,-50%)';
      edgeEl.firstChild.style.transform='rotate('+Math.atan2(dy,dx).toFixed(3)+'rad)';edgeEl.style.opacity=1;
    }else edgeEl.style.opacity=0;
  }
}
function refreshNames(){
  for(const r of ['g','s']){const n=nameOf(r);
    $(r==='g'?'tagGName':'tagSName').textContent=n;$(r==='g'?'edgeGName':'edgeSName').textContent=n;
    $(r==='g'?'cardGName':'cardSName').textContent=(mode==='online'&&r===myRole)?n+' (you)':n;
    $(r==='g'?'pnameG':'pnameS').textContent=n;}
}

// ================= characters & world animation =================
function nextBeaconTarget(){
  if(!gate.open)return levers[0].pos;
  if(!bridge.open)return crank.pos;
  if(runes[2].state==='vault')return levers[1].pos;
  return null;
}
function updateVisuals(dt,t){
  const sun=W.sun;sun.target.position.copy(camTarget);sun.position.copy(camTarget).addScaledVector(W.sunDir,60);
  const sc=sun.shadow.camera,ext=clamp(camDist*1.15,16,30);if(Math.abs(sc.right-ext)>.5){sc.left=-ext;sc.right=ext;sc.top=ext;sc.bottom=-ext;sc.updateProjectionMatrix();}
  W.sky.position.copy(camera.position);
  // doors & mechanisms
  gate.group.position.y=gate.t*3.5;port.group.position.y=port.t*3.5;bridge.pivot.rotation.x=-1.45*(1-bridge.t);
  crank.wheel.rotation.x=crank.t*Math.PI*6;
  for(const l of levers)l.handle.rotation.z=lerp(-.7,.7,l.t);
  const pulse=.5+.5*Math.sin(t*3.2);
  for(const p of plates){p.mesh.position.y=p.on?-.04:0;p.ring.material.opacity=p.on?1:(port.open?.25:.35+.45*pulse);}
  for(const h of holeMarkers){h.icon.position.y=h.base+Math.sin(t*2)*.08;h.glow.material.opacity=.35+.3*pulse;}
  const bt=G.phase==='play'?nextBeaconTarget():null;W.beacon.visible=!!bt;if(bt){W.beacon.position.set(bt.x,bt.y+1.55+Math.abs(Math.sin(t*3))*.25,bt.z);}
  block.mesh.position.set(block.pos.x,block.pos.y+.6,block.pos.z);
  // runes
  for(const r of runes){
    const vis=r.state!=='carried'&&r.state!=='placed';r.mesh.visible=vis;r.glow.visible=vis;r.light.intensity=vis?.8:0;
    if(vis){const hover=(r.state==='rest'||r.state==='perched')?.3+Math.sin(t*1.8+r.i)*.06:.22;r.mesh.position.set(r.pos.x,r.pos.y+hover,r.pos.z);r.mesh.rotation.y=t*.8+r.i;
      r.light.position.set(r.pos.x,r.pos.y+.7,r.pos.z);r.glow.position.set(r.pos.x,r.pos.y+hover,r.pos.z);r.glow.material.opacity=.45+.25*pulse;}
  }
  W.sockets.forEach((s,i)=>s.visible=i<G.placed);
  updateGiant(dt,t);updateSpriteVis(dt,t);
  // ending: water and light
  if(G.ending||G.phase==='end'){
    const e=G.phase==='end'?8:G.endT;W.jet.visible=true;const js=Math.min(1,e/1.2);W.jet.scale.set(1,js,1);W.jet.position.y=3.6+.7*js;
    W.basinWater.visible=true;W.basinWater.position.y=lerp(.14,.68,Math.min(1,e/5));W.fLight.intensity=Math.min(2,e*.5);
    if(Math.random()<dt*35){const a=Math.random()*6.28,sp=.6+Math.random()*1.4;emit(F.x,5,F.z,Math.cos(a)*sp,1+Math.random()*1.5,Math.sin(a)*sp,.8,.97,1,.07,1.4,9,.2);}
  }
}
function placeRing(ring,b,size){
  const fy=floorBelow(b.pos,b===sprite?null:golem.col);const gap=b.pos.y-fy;
  if(fy<-50||gap>8){ring.visible=false;return;}
  ring.visible=true;ring.position.set(b.pos.x,fy+.03,b.pos.z);const k=clamp(1-gap/6,.35,1);ring.scale.setScalar(k);ring.material.opacity=.9*k;
}
function updateGiant(dt,t){
  const g=golem,gr=g.root;gr.position.copy(g.pos);gr.rotation.y=g.yaw;
  const hs=Math.hypot(g.vel.x,g.vel.z);
  g.pushVis=Math.max(0,(g.pushVis||0)-dt);if(g.pushing)g.pushVis=.15;
  g.carryA=lerp(g.carryA||0,g.holding?1:0,1-Math.exp(-dt*10));
  if(g.A){
    let n='Idle',ts=1;
    if(G.ending||G.phase==='end')n='Cheer';
    else if(!g.onGround&&Math.abs(g.vel.y)>2)n='Jump_Idle';
    else if(g.pushVis>0){n='Walking_B';ts=.75;}
    else if(hs>.35){n='Walking_A';ts=clamp(hs/2.6,.55,1.45);}
    if(!g.A.busy())g.A.play(n,.22,ts);
    g.A.update(dt);
    if(g.carryA>.01&&g.armL&&g.armR&&!g.A.busy()){g.armL.rotation.x-=2.6*g.carryA;g.armR.rotation.x-=2.6*g.carryA;}
    if(g.charging&&g.chest){g.chest.rotation.x-=.35*g.charge;}
  }
  g.gems.forEach((m,i)=>{m.visible=i<g.runes;const a=t*1.6+i*2.094;m.position.set(Math.cos(a)*.85,1.15+Math.sin(t*2+i)*.08,Math.sin(a)*.85);m.rotation.y=t*2;});
  g.walk+=dt*hs*2.1;const step=Math.floor(g.walk/Math.PI);if(step!==g.stepSound&&hs>1&&g.onGround){g.stepSound=step;SFX.thud(.45+Math.min(1,hs/3.4)*.35);}
  placeRing(g.ring,g,1.5);
}
function updateSpriteVis(dt,t){
  const s=sprite,sr=s.root;sr.position.copy(s.pos);sr.rotation.y=s.yaw;
  const ss=Math.hypot(s.vel.x,s.vel.z);
  if(s.A){
    let n='Idle',ts=1;
    if(G.ending||G.phase==='end')n='Cheer';
    else if(s.held)n='Sit_Floor_Idle';
    else if(!s.onGround)n='Jump_Idle';
    else if(ss>.35){n='Running_A';ts=clamp(ss/3.2,.6,1.6);}
    if(!s.A.busy())s.A.play(n,.15,ts);
    s.A.update(dt);
  }
  const flap=s.gliding?Math.sin(t*30)*.45+.9:(s.onGround?Math.sin(t*5)*.1+.3:Math.sin(t*20)*.5+.6);
  s.wings[0].rotation.y=-flap;s.wings[1].rotation.y=flap;
  sr.position.y+=s.onGround?0:.02*Math.sin(t*4);
  s.halo.material.opacity=.4+Math.sin(t*3)*.1;
  if(Math.random()<dt*(s.onGround?(ss>.5?10:3):22))emit(s.pos.x+(Math.random()-.5)*.12,s.pos.y+.22,s.pos.z+(Math.random()-.5)*.12,(Math.random()-.5)*.2,.15+Math.random()*.2,(Math.random()-.5)*.2,.55,1,.85,.06,.9,-.1,.6);
  placeRing(s.ring,s,.75);if(s.held)s.ring.visible=false;
}
