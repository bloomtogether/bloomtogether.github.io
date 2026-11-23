// ================= characters =================
const golem={kind:'golem',pos:new V3(),vel:new V3(),hw:.6,h:2.3,stepH:.45,yaw:Math.PI,onGround:false,coyote:0,holding:false,charging:false,charge:0,runes:0,cp:0,pushing:false,anim:0,prev:new V3(),delta:new V3(),stepSound:0,walk:0};
const sprite={kind:'sprite',pos:new V3(),vel:new V3(),hw:.14,h:.4,stepH:.14,yaw:Math.PI,onGround:false,coyote:0,held:false,gliding:false,thrownT:0,cp:0,walk:0,anim:0,airT:0};
golem.col={min:new V3(),max:new V3(),kind:'golem',on:true};colliders.push(golem.col);
function syncGolemCol(){const g=golem;golem.col.min.set(g.pos.x-.52,g.pos.y,g.pos.z-.52);golem.col.max.set(g.pos.x+.52,g.pos.y+g.h,g.pos.z+.52);golem.col.on=!sprite.held;}

let MODELS=null; // {giant: gltf, sprite: gltf} or null when loading failed

// A simple animation player with cross-fades and one-shot clips
function makeAnimator(root,clips){
  const mixer=new THREE.AnimationMixer(root),acts={};
  for(const c of clips){acts[c.name]=mixer.clipAction(c);}
  const A={mixer,acts,cur:null,curName:'',shotT:0,shotName:''};
  A.play=(name,fade=.2,ts=1)=>{const a=acts[name];if(!a)return;a.timeScale=ts;if(A.curName===name)return;
    a.reset();a.setLoop(THREE.LoopRepeat,Infinity);a.clampWhenFinished=false;a.enabled=true;a.setEffectiveWeight(1);a.play();
    if(A.cur)A.cur.crossFadeTo(a,fade,false);A.cur=a;A.curName=name;};
  A.shot=(name,ts=1,fade=.12)=>{const a=acts[name];if(!a)return;a.reset();a.timeScale=ts;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.enabled=true;a.setEffectiveWeight(1);a.play();
    if(A.cur&&A.cur!==a)A.cur.crossFadeTo(a,fade,false);A.cur=a;A.curName='#'+name;A.shotT=a.getClip().duration/ts-.12;A.shotName=name;};
  A.busy=()=>A.shotT>0;
  A.update=dt=>{if(A.shotT>0)A.shotT-=dt;mixer.update(dt);};
  return A;
}

// see-through silhouette: drawn only where the character is hidden behind something (stencil + reversed depth test)
function addXray(root,color){
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.62,depthWrite:false,depthFunc:THREE.GreaterDepth,
    stencilWrite:true,stencilRef:1,stencilFunc:THREE.NotEqualStencilFunc,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp});
  const list=[];root.traverse(o=>{if(o.isMesh)list.push(o);});
  for(const o of list){
    o.material.stencilWrite=true;o.material.stencilRef=1;o.material.stencilFunc=THREE.AlwaysStencilFunc;o.material.stencilZPass=THREE.ReplaceStencilOp;
    let x;
    if(o.isSkinnedMesh){x=new THREE.SkinnedMesh(o.geometry,mat);x.bind(o.skeleton,o.bindMatrix);}
    else x=new THREE.Mesh(o.geometry,mat);
    x.renderOrder=20;x.frustumCulled=false;x.castShadow=false;x.position.copy(o.position);x.quaternion.copy(o.quaternion);x.scale.copy(o.scale);
    o.parent.add(x);
  }
}
function findBone(root,name){let b=null;root.traverse(o=>{if(!b&&o.isBone&&o.name===name)b=o;});return b;}
// prepare a character scene from Blender: shadows, PBR tweaks, scale to a target height (feet at 0)
function prepModel(gltf,targetH){
  const root=gltf.scene;
  root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;const m=o.material;
    if(m.transparent){m.depthWrite=false;m.side=THREE.DoubleSide;o.castShadow=false;o.renderOrder=4;}else{o.castShadow=true;o.receiveShadow=false;}
    if(m.map)m.map.anisotropy=ANISO;if('envMapIntensity' in m)m.envMapIntensity=.8;});
  const bb=new THREE.Box3().setFromObject(root),h=bb.max.y-bb.min.y,s=targetH/h;
  root.scale.setScalar(s);root.position.y=-bb.min.y*s;
  const holder=new THREE.Group();holder.add(root);return {holder,root,scale:s};
}

function buildGolem(){
  const R=new THREE.Group();scene.add(R);golem.root=R;
  if(MODELS){
    const m=prepModel(MODELS.giant,2.45);R.add(m.holder);golem.model=m.root;
    m.root.traverse(o=>{if(o.isMesh&&o.material.name==='GiantBody'){const k=o.material;k.color.setScalar(.8);if(k.normalScale)k.normalScale.multiplyScalar(1.8);k.roughness=.88;k.metalness=0;}
      if(o.isMesh&&o.material.name==='GiantEye'){o.material.emissive.set('#ff9a2e');o.material.emissiveIntensity=1.6;o.material.color.set('#ffb054');}});
    golem.A=makeAnimator(m.root,MODELS.giant.animations);golem.A.play('Idle',0);
    golem.armL=findBone(m.root,'upperarml');golem.armR=findBone(m.root,'upperarmr');golem.chest=findBone(m.root,'chest');
    // carry pose: both hands come up beside the head to steady the Sprite (worked out on the Blender rig)
    golem.carryPose=[['upperarml',-2.3,-.2],['upperarmr',-2.3,.2],['lowerarml',-1.4,.2],['lowerarmr',-1.4,-.2]].map(([n,x,z])=>{const b=findBone(m.root,n);
      return b?{b,q:b.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,0,z,'XYZ')))}:null;}).filter(Boolean);
    addXray(m.root,'#f2873a');
  }else{
    const mat=new THREE.MeshLambertMaterial({color:'#f2a86a',flatShading:true});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,1.7,10),mat);body.position.y=1.05;body.castShadow=true;R.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10),mat);head.position.y=2.1;head.castShadow=true;R.add(head);
    addXray(R,'#f2873a');
  }
  // carried rune gems float around the giant's waist
  golem.gems=[];for(let i=0;i<3;i++){const g=new THREE.Mesh(new THREE.OctahedronGeometry(.11),M.gem);g.scale.y=1.4;g.visible=false;R.add(g);golem.gems.push(g);}
  golem.ring=groundRing('#f2873a',1.5);
}
function buildSprite(){
  const R=new THREE.Group();scene.add(R);sprite.root=R;
  sprite.wingBones=null;sprite.wings=null;
  if(MODELS){
    const m=prepModel(MODELS.sprite,.8);R.add(m.holder);sprite.model=m.root;
    sprite.A=makeAnimator(m.root,MODELS.sprite.animations);sprite.A.play('Idle',0);
    m.root.updateMatrixWorld(true);
    // wings flap around the body's vertical axis, worked out in each wing bone's own space
    const wl=findBone(m.root,'wingl'),wr=findBone(m.root,'wingr');
    if(wl&&wr)sprite.wingBones=[wl,wr].map((b,i)=>{const q=new THREE.Quaternion();b.getWorldQuaternion(q);
      return {b,rest:b.quaternion.clone(),axis:new V3(0,1,0).applyQuaternion(q.invert()).normalize(),sign:i?-1:1};});
    addXray(m.root,'#22bf9c');
  }else{
    const mat=new THREE.MeshLambertMaterial({color:'#bff7e6',emissive:'#22bf9c',emissiveIntensity:.6});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),mat);body.position.y=.18;body.scale.y=1.3;R.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.1,14,10),mat);head.position.y=.38;R.add(head);
    addXray(R,'#22bf9c');
    const wm=new THREE.MeshBasicMaterial({map:TEX.wing,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.9});
    sprite.wings=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.02,.26,-.06);R.add(p);const w=new THREE.Mesh(new THREE.PlaneGeometry(.3,.21),wm);w.position.x=s*.15;w.scale.x=s;p.add(w);return p;});
  }
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#7dffd9',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.25}));halo.scale.set(.95,.95,.95);halo.position.y=.38;R.add(halo);sprite.halo=halo;
  sprite.light=new THREE.PointLight('#9fffe0',.6,4,2);sprite.light.position.y=.4;R.add(sprite.light);
  sprite.ring=groundRing('#22bf9c',.75);
}
const _wq=new THREE.Quaternion();
function flapWings(flap){
  const s=sprite;
  if(s.wingBones){for(const w of s.wingBones){_wq.setFromAxisAngle(w.axis,w.sign*(flap*.75-.15));w.b.quaternion.copy(w.rest).multiply(_wq);}}
  else if(s.wings){s.wings[0].rotation.y=-flap;s.wings[1].rotation.y=flap;}
}
// colored ring on the ground under a character so you always know who is where
function groundRing(color,size){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:TEX.ring,color,transparent:true,depthWrite:false,opacity:.9}));
  m.rotation.x=-Math.PI/2;m.renderOrder=2;scene.add(m);return m;
}
// put the ring on the floor directly below a character (finds the highest surface under it)
const _rayDown=new THREE.Raycaster(),_down=new V3(0,-1,0);
function floorBelow(p,skip){let best=-99;for(const c of colliders){if(!c.on||c===skip||c.kind==='golem')continue;if(p.x>c.min.x&&p.x<c.max.x&&p.z>c.min.z&&p.z<c.max.z&&c.max.y<=p.y+.05&&c.max.y>best)best=c.max.y;}
  const th=terrainAt(p.x,p.z);if(th<=p.y+.05&&th>best)best=th;
  if(G.region==='ch1'&&p.z<-27&&p.z>-33&&Math.abs(p.x)<11&&best<-1)return -99;return best<-50?0:best;}

// ================= particles =================
const PMAX=700;
const pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*3),pSize=new Float32Array(PMAX),pAlpha=new Float32Array(PMAX);
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('aColor',new THREE.BufferAttribute(pCol,3));pGeo.setAttribute('aSize',new THREE.BufferAttribute(pSize,1));pGeo.setAttribute('aAlpha',new THREE.BufferAttribute(pAlpha,1));
const pMat=new THREE.ShaderMaterial({uniforms:{uScale:{value:innerHeight*Math.min(2,window.devicePixelRatio||1)*.5}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'uniform float uScale;attribute vec3 aColor;attribute float aSize;attribute float aAlpha;varying vec3 vC;varying float vA;void main(){vC=aColor;vA=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying vec3 vC;varying float vA;void main(){float r=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,r);gl_FragColor=vec4(vC,a*vA);}'});
const pts=new THREE.Points(pGeo,pMat);pts.frustumCulled=false;scene.add(pts);
const parts=[];
function emit(x,y,z,vx,vy,vz,r,g,b,size,life,grav,drag){if(parts.length>=PMAX-80)return;parts.push({x,y,z,vx,vy,vz,r,g,b,size,life,max:life,grav:grav||0,drag:drag||0});}
const fireflies=[];
function initAmbientParticles(){for(let i=0;i<30;i++)fireflies.push({x:lerp(-9,9,Math.random()),y:.5+Math.random()*3,z:lerp(-64,-81,Math.random()),ph:Math.random()*10});}
function updateParticles(dt){
  let n=0;
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}
    p.vy-=p.grav*dt;const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;p.vz*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
  const put=(x,y,z,r,g,b,s,a)=>{if(n>=PMAX)return;pPos[n*3]=x;pPos[n*3+1]=y;pPos[n*3+2]=z;pCol[n*3]=r;pCol[n*3+1]=g;pCol[n*3+2]=b;pSize[n]=s;pAlpha[n]=a;n++;};
  for(const p of parts){const k=p.life/p.max;put(p.x,p.y,p.z,p.r,p.g,p.b,p.size,Math.min(1,k*2));}
  if(G.region==='ch1')for(const f of fireflies){f.ph+=dt;const x=f.x+Math.sin(f.ph*.7)*.8,y=f.y+Math.sin(f.ph*1.3)*.4,z=f.z+Math.cos(f.ph*.5)*.8;const a=(.5+.5*Math.sin(f.ph*2.3))*(G.fountainOn?1:.6);put(x,y,z,1,.9,.5,.08,a);}
  pGeo.setDrawRange(0,n);pGeo.attributes.position.needsUpdate=true;pGeo.attributes.aColor.needsUpdate=true;pGeo.attributes.aSize.needsUpdate=true;pGeo.attributes.aAlpha.needsUpdate=true;
  // dust (soft, not glowing)
  let m=0;for(let i=dust.length-1;i>=0;i--){const p=dust[i];p.life-=dt;if(p.life<=0){dust.splice(i,1);continue;}const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d-p.grav*dt;p.vz*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.size+=dt*p.grow;}
  for(const p of dust){if(m>=DMAX)break;const k=p.life/p.max;dPos[m*3]=p.x;dPos[m*3+1]=p.y;dPos[m*3+2]=p.z;dCol[m*3]=p.r;dCol[m*3+1]=p.g;dCol[m*3+2]=p.b;dSize[m]=p.size;dAlpha[m]=Math.min(1,k*1.6)*p.a;m++;}
  dGeo.setDrawRange(0,m);for(const k of ['position','aColor','aSize','aAlpha'])dGeo.attributes[k].needsUpdate=true;
}
const DMAX=260,dPos=new Float32Array(DMAX*3),dCol=new Float32Array(DMAX*3),dSize=new Float32Array(DMAX),dAlpha=new Float32Array(DMAX),dust=[];
const dGeo=new THREE.BufferGeometry();
dGeo.setAttribute('position',new THREE.BufferAttribute(dPos,3));dGeo.setAttribute('aColor',new THREE.BufferAttribute(dCol,3));dGeo.setAttribute('aSize',new THREE.BufferAttribute(dSize,1));dGeo.setAttribute('aAlpha',new THREE.BufferAttribute(dAlpha,1));
const dMat=pMat.clone();dMat.blending=THREE.NormalBlending;dMat.uniforms=pMat.uniforms;
const dPts=new THREE.Points(dGeo,dMat);dPts.frustumCulled=false;dPts.renderOrder=3;scene.add(dPts);
function puff(x,y,z,n,spread,col,size,up){if(dust.length>DMAX-n)return;const c=col||[.82,.74,.62];
  for(let i=0;i<n;i++){const a=Math.random()*6.28,sp=(spread||1)*(.6+Math.random()*.8);dust.push({x:x+Math.cos(a)*.2,y:y+.08,z:z+Math.sin(a)*.2,vx:Math.cos(a)*sp,vy:(up||.6)*(.5+Math.random()),vz:Math.sin(a)*sp,r:c[0],g:c[1],b:c[2],a:.55,size:size||.35,grow:.5,life:.7+Math.random()*.4,max:1.1,drag:3.2,grav:.4});}}
