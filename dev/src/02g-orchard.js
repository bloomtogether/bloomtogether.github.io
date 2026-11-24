// ================= Chapter 1: the upper terrace and the Hanging Orchard =================
// A raised orchard north of the ravine, east of the main garden. The way up: the Sprite reaches the hidden
// balcony with a ground-pound seesaw launch and pulls a lever that raises a stone stair for the Giant; from the
// balcony an old aqueduct walk crosses the ravine to the orchard. Up there: a belvedere tower (a landmark you can
// see from the whole garden), a waystone, and an optional throw puzzle that opens the Sun Pavilion. Inside the
// pavilion, both standing on the sun together call down the morning light and the Giant is crowned with sun-flowers
// (the secret, and a crown the Giant keeps wearing everywhere).
const ORCH={x0:12,x1:44,z0:-80,z1:-36,y:4.94};
const TOWER={x0:34,x1:40,z0:-73,z1:-67,h:10.5,ledge:{x0:32.5,x1:34,z0:-71.6,z1:-68.4,y:3.9}};
const PAV={x0:15,x1:25,z0:-77,z1:-67,h:2.3,door:{x0:18.8,x1:21.2}};
const stair={raised:false,t:0,steps:[]};
const pav={open:false,t:0,door:null,lit:false,hold:0,glow:0,cx:20,cz:-72};
const ORCH_TREES=[];
function inOrchard(x,z,m){m=m||0;return x>ORCH.x0-m&&x<ORCH.x1+m&&z>ORCH.z0-m&&z<ORCH.z1+m;}
// ground height in Chapter 1 for grass and trees: the orchard plateau, else the garden floor
function ch1H(x,z){return inOrchard(x,z)?ORCH.y:0;}

function buildOrchard(){
  const O=ORCH,Y=O.y;
  // ---------- the stone stair along the east garden's north wall (sunk until the lever raises it) ----------
  for(let i=0;i<11;i++){const xa=13+i*1.09,xb=xa+1.09,top=+(.449*(i+1)).toFixed(3);
    const c=box(xa,xb,0,top,-20.8,-23,M.stone,{fade:false,surface:'stone'});c.on=false;c.top=top;c.mesh.position.y=top/2-top-.05;
    stair.steps.push(c);}
  levers.push(makeLever(30.3,-18.2,-Math.PI/2,'stair',4.94));

  // ---------- the aqueduct walk over the ravine, from the balcony doorway to the orchard ----------
  box(26.8,29.2,Y-.5,Y,-23,-36,M.pave,{fade:false,surface:'stone'});
  for(const x of [26.5,29.2]){box(x,x+.3,Y,Y+.8,-23.4,-36,M.wallTop,{fade:false});invis(x,x+.3,Y+.8,14,-23.4,-36);}
  for(const z of [-26.2,-32.8])box(27,29,-8,Y-.5,z,z-1,M.wall,{fade:false,cast:false}); // piers down into the ravine
  box(26.8,29.2,Y-1.4,Y-.5,-27.2,-32.8,M.wall,{fade:false,cast:false,collide:false});      // the arch's span
  // the doorway at the back of the balcony becomes a real opening: two posts under the old lintel
  for(const x of [26.3,29.2])box(x,x+.5,Y,7.4,-22.7,-23.5,M.stone,{fade:false});

  // ---------- the plateau: sandstone retaining walls, a grass top, a balustrade all round ----------
  box(O.x0,O.x1,0,Y-.4,O.z0,O.z1,M.wall,{fade:false,cast:false});
  box(O.x0,O.x1,Y-.4,Y,O.z0,O.z1,M.ground,{fade:false,cast:false,surface:'grass'});
  box(O.x0-.06,O.x1+.06,Y-.55,Y-.4,O.z0-.06,O.z1+.06,M.wallTop,{fade:false,collide:false});
  const rail=(xa,xb,za,zb)=>{box(xa,xb,Y,Y+.75,za,zb,M.wallTop,{fade:false});invis(xa,xb,Y+.75,14,za,zb);};
  rail(O.x0,O.x0+.35,O.z0,O.z1);rail(O.x1-.35,O.x1,O.z0,O.z1);rail(O.x0,O.x1,O.z0,O.z0+.35);
  rail(O.x0,26.8,O.z1-.35,O.z1);rail(29.2,O.x1,O.z1-.35,O.z1);
  // the walk crosses the gap between the ravine edge and the plateau
  box(26.8,29.2,Y-.5,Y,O.z1-.2,O.z1+.6,M.pave,{fade:false,surface:'stone'});

  // ---------- the belvedere tower: a landmark seen from the whole garden ----------
  const T=TOWER;
  box(T.x0,T.x1,Y,Y+T.h,T.z0,T.z1,M.wall,{fade:true});invis(T.x0,T.x1,Y+T.h,30,T.z0,T.z1);
  box(T.x0-.2,T.x1+.2,Y+T.h,Y+T.h+.35,T.z0-.2,T.z1+.2,M.wallTop,{fade:false,collide:false});
  const roof=new THREE.Mesh(new THREE.ConeGeometry(4.6,3.6,4,1),M.terracotta);roof.rotation.y=Math.PI/4;roof.position.set((T.x0+T.x1)/2,Y+T.h+.35+1.8,(T.z0+T.z1)/2);roof.castShadow=true;ROOT.add(roof);
  for(const yy of [3.2,6.6])for(const z of [-69,-71])box(T.x0-.03,T.x0,Y+yy,Y+yy+1.4,z-.35,z+.35,M.holeDark,{fade:false,collide:false,cast:false}); // windows
  // the ledge on its west face: too high to jump, a high lob from the Giant reaches it
  const L=T.ledge;box(L.x0,L.x1,Y+L.y-.3,Y+L.y,L.z0,L.z1,M.wallTop,{fade:false});
  for(const z of [L.z0,L.z1-.3])box(L.x0,L.x0+.25,Y+L.y,Y+L.y+.5,z,z+.3,M.stone,{fade:false});
  levers.push(makeLever(33.4,-70,Math.PI/2,'pavilion',Y+L.y));

  // ---------- the Sun Pavilion: walled, its gate opens from the tower ledge ----------
  const P=PAV,D=P.door;
  const pw=(xa,xb,za,zb)=>{box(xa,xb,Y,Y+P.h,za,zb,M.wall);invis(xa,xb,Y+P.h,14,za,zb);box(xa-.05,xb+.05,Y+P.h,Y+P.h+.14,za-.05,zb+.05,M.wallTop,{fade:false,collide:false});};
  pw(P.x0,P.x0+.4,P.z0,P.z1);pw(P.x1-.4,P.x1,P.z0,P.z1);pw(P.x0,P.x1,P.z0,P.z0+.4);
  pw(P.x0,D.x0,P.z1-.4,P.z1);pw(D.x1,P.x1,P.z1-.4,P.z1);
  pav.door=box(D.x0,D.x1,Y,Y+P.h,P.z1-.35,P.z1-.05,M.wood,{fade:false,kind:'door',surface:'wood'});
  // the sun: a gold disc set in the floor with rays; a shaft of light comes down when both stand on it
  const cx=pav.cx,cz=pav.cz;
  const sun=new THREE.Mesh(new THREE.CircleGeometry(1.5,32),new THREE.MeshStandardMaterial({color:'#e9b949',emissive:'#f2a43a',emissiveIntensity:.25,roughness:.35,metalness:.6}));
  sun.rotation.x=-Math.PI/2;sun.position.set(cx,Y+.03,cz);ROOT.add(sun);pav.sun=sun;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=new THREE.Mesh(new THREE.PlaneGeometry(.22,i%2?.9:1.5),sun.material);r.rotation.x=-Math.PI/2;r.rotation.z=-a;
    const d=1.5+(i%2?.5:.8);r.position.set(cx+Math.sin(a)*d,Y+.025,cz+Math.cos(a)*d);ROOT.add(r);}
  const cv=document.createElement('canvas');cv.width=4;cv.height=64;const cx2=cv.getContext('2d'),gr=cx2.createLinearGradient(0,0,0,64);
  gr.addColorStop(0,'#000');gr.addColorStop(.55,'#8c8c8c');gr.addColorStop(1,'#fff');cx2.fillStyle=gr;cx2.fillRect(0,0,4,64);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.55,16,32,1,true),new THREE.MeshBasicMaterial({color:'#ffe2a0',alphaMap:new THREE.CanvasTexture(cv),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  shaft.position.set(cx,Y+8,cz);shaft.visible=false;ROOT.add(shaft);pav.shaft=shaft;
  // an old carved tablet on the back wall hints at what to do
  const tab=labelSprite('Two who stand in the sun','are crowned by the morning','#8a6448');tab.scale.set(3.8,1.18,1);tab.position.set(cx,Y+1.7,P.z0+.6);ROOT.add(tab);pav.tablet=tab;
  for(const [x,z] of [[P.x0+1.2,P.z0+1.2],[P.x1-1.2,P.z0+1.2]])addUrnAt(x,Y,z,1.1);

  // ---------- orchard trees, a bench, the waystone ----------
  // two orchard blocks either side of a clear walk from the aqueduct to the tower; small trees in rows
  const rows=[];for(const x0 of [15,34])for(let i=0;i<2;i++)for(let j=0;j<3;j++){const x=x0+i*6+(j%2)*1.5,z=-44-j*7.5;rows.push([x,z]);}
  // small fruit trees (about 3 m) so the camera sees over them
  for(const [x,z] of rows)orchardTree(x,z,.14+hash2(x|0,z|0,71)*.025);
  for(const [x,z] of [[42,-77],[14.5,-62],[42,-62]])orchardTree(x,z,.18+hash2(x|0,z|0,72)*.03);
  orchardFruit();
  box(36,39,Y,Y+.45,-45.2,-46,M.wood,{fade:false,surface:'wood'});
  addWaystone('ch1_orchard','Hanging Orchard',30.5,Y,-41.5,0);

  // ---------- collectibles ----------
  [[28,Y,-29],[28,Y,-33.6],[17.5,Y,-38.6],[40,Y,-39.5],[22,Y,-53],[36,Y,-57],[14.5,Y,-78],[33.3,Y+L.y,-68.9],[33.3,Y+L.y,-71.1],[20,Y,-72]]
    .forEach(([x,y,z],i)=>addSeed('c1o'+i,x,y,z));
}
// a tree on the plateau (realistic Jacaranda when the real assets loaded, else a simple tree raised to the plateau)
function orchardTree(x,z,s){ORCH_TREES.push([x,z,s]);
  if(CH1R.on){CH1R.trees.push([x,z,s]);return;}
  const g=new THREE.Group();g.position.y=ORCH.y;ROOT.add(g);const R0=ROOT;ROOT=g;addTree(x,z,s*2.6,(x*7+z)|0);ROOT=R0;
}
// apricots hanging in the orchard trees' crowns
function orchardFruit(){
  const n=ORCH_TREES.length*14,im=new THREE.InstancedMesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshStandardMaterial({color:'#e8862e',roughness:.55,emissive:'#5a2208',emissiveIntensity:.25}),n);
  const m4=new THREE.Matrix4(),col=new THREE.Color();let k=0;
  ORCH_TREES.forEach(([x,z,s],i)=>{for(let j=0;j<14;j++){const a=hash2(i,j,73)*6.283,r=(.35+hash2(i,j,74)*.5)*11*s,h=(CH1R.on?7+hash2(i,j,75)*7:3.2+hash2(i,j,75)*1.6)*s*(CH1R.on?1:2.6);
    m4.makeTranslation(x+Math.cos(a)*r,ORCH.y+h,z+Math.sin(a)*r);im.setMatrixAt(k,m4);im.setColorAt(k,col.setHSL(.06+hash2(i,j,76)*.04,.8,.5+hash2(i,j,77)*.1));k++;}});
  im.castShadow=true;ROOT.add(im);}
function addUrnAt(x,y,z,s){const g=new THREE.Group();g.position.y=y;ROOT.add(g);const R0=ROOT;ROOT=g;addUrn(x,z,s);ROOT=R0;
  // addUrn's collider was made at floor level: lift it with the group
  const c=colliders[colliders.length-1];c.min.y+=y;c.max.y+=y;}

// a block that rises under someone lifts them onto its top instead of trapping them inside it
function liftOnto(c){for(const b of [golem,sprite]){if(b.held)continue;if(ov(b,c)){b.pos.y=c.max.y+.01;b.vel.y=0;if(b===golem)syncGolemCol();}}}
// ---- per-step: the stair rises and the pavilion gate sinks once their levers are pulled ----
function stepOrchard(dt){
  stair.t=approach(stair.t,stair.raised?1:0,dt/2.6);for(const c of stair.steps){const on=stair.t>.96;if(on&&!c.on)liftOnto(c);c.on=on;}
  pav.t=approach(pav.t,pav.open?1:0,dt/1.8);if(pav.door)pav.door.on=pav.t<.5;
  // both on the sun together for a moment: the light comes down and the Giant is crowned
  if(pav.open&&!pav.lit&&dt>0){const on=b=>Math.hypot(b.pos.x-pav.cx,b.pos.z-pav.cz)<1.9&&b.pos.y>ORCH.y-.4&&b.pos.y<ORCH.y+3;
    pav.hold=on(golem)&&on(sprite)?pav.hold+dt:Math.max(0,pav.hold-dt*2);
    if(pav.hold>1.2){pav.lit=true;PROG.ch1.crown=1;saveSoon();if(!talked.c14){talked.c14=1;G.dlg='c14';G.dlgN++;}}}
}
function updateOrchardVis(){
  const k=smooth(0,1,stair.t);for(let i=0;i<stair.steps.length;i++){const c=stair.steps[i],kk=smooth(i/stair.steps.length*.5,.5+i/stair.steps.length*.5,k);c.mesh.position.y=c.top/2-(c.top+.05)*(1-kk);}
  if(pav.door&&pav.door.mesh)pav.door.mesh.position.y=ORCH.y+PAV.h/2-PAV.h*smooth(0,1,pav.t);
  if(pav.sun){const dt=1/60,was=pav.glow;pav.glow=approach(pav.glow,pav.lit?1:0,dt/1.4);
    const pulse=PROG.settings.reduceFlash?0:.08*Math.sin(performance.now()/500);
    pav.sun.material.emissiveIntensity=.25+(pav.open?.15*smooth(0,1.2,pav.hold)+pulse*(pav.lit?0:1)*(pav.open?1:0):0)+pav.glow*.9;
    pav.shaft.visible=pav.glow>0||pav.hold>0;pav.shaft.material.opacity=Math.max(pav.glow*.2,smooth(0,1.2,pav.hold)*.14);
    if(was<.02&&pav.glow>=.02)sparkle({x:pav.cx,y:ORCH.y+.2,z:pav.cz},40);
    if(pav.glow>.3&&Math.random()<.25)sparkle({x:pav.cx+(Math.random()-.5)*2,y:ORCH.y+.2,z:pav.cz+(Math.random()-.5)*2},1);}
}
// ---- the sun-flower crown: once earned, the Giant wears it everywhere (online too: it follows pav.lit) ----
const CROWN={m:null,head:null,rel:null,_q:new THREE.Quaternion(),_p:new V3(),_o:new V3()};
function makeCrown(){
  let head=null;golem.root.traverse(o=>{if(o.isBone&&o.name==='head')head=o;});if(!head)return;
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.05,8,28),new THREE.MeshStandardMaterial({color:'#4f6b2a',roughness:.8}));ring.rotation.x=Math.PI/2;g.add(ring);
  const leaf=new THREE.MeshStandardMaterial({color:'#6f8f36',roughness:.7,side:THREE.DoubleSide}),pet=new THREE.MeshStandardMaterial({color:'#f6c33b',emissive:'#a8620a',emissiveIntensity:.35,roughness:.5}),mid=new THREE.MeshStandardMaterial({color:'#7a3f12',roughness:.8});
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2,f=new THREE.Group();f.position.set(Math.cos(a)*.34,.04,Math.sin(a)*.34);f.rotation.y=-a;f.rotation.z=.5;
    for(let j=0;j<6;j++){const p=new THREE.Mesh(new THREE.SphereGeometry(.055,6,4),pet);const b=j/6*Math.PI*2;p.scale.set(1,.35,.6);p.position.set(0,Math.cos(b)*.07,Math.sin(b)*.07);p.rotation.x=b;f.add(p);}
    const c=new THREE.Mesh(new THREE.SphereGeometry(.04,6,4),mid);c.position.x=.02;f.add(c);
    const l=new THREE.Mesh(new THREE.PlaneGeometry(.09,.18),leaf);l.position.set(0,-.02,.1);l.rotation.set(.3,.9,0);f.add(l);g.add(f);}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.visible=false;scene.add(g);
  // the head's resting turn relative to the body, so the crown sits level and turns with the head
  golem.root.updateMatrixWorld(true);const hq=head.getWorldQuaternion(new THREE.Quaternion()),rq=golem.root.getWorldQuaternion(new THREE.Quaternion());
  CROWN.rel=rq.invert().multiply(hq).invert();CROWN.m=g;CROWN.head=head;
}
function updateCrown(){
  if(!CROWN.m){if(!golem.model||CROWN.none)return;makeCrown();if(!CROWN.m){CROWN.none=true;return;}}
  const C=CROWN,show=pav.lit&&golem.root.visible&&G.phase!=='title';C.m.visible=show;if(!show)return;
  C.head.getWorldPosition(C._p);C.head.getWorldQuaternion(C._q).multiply(C.rel);
  C.m.quaternion.copy(C._q);C.m.position.copy(C._p).add(C._o.set(0,.42,-.02).applyQuaternion(C._q));
  const s=smooth(0,1,pav.glow||1);C.m.scale.setScalar(.6+.4*s);
}
function resetOrchard(){
  stair.raised=!!PROG.ch1.stair;stair.t=stair.raised?1:0;pav.open=!!PROG.ch1.pav;pav.t=pav.open?1:0;
  pav.lit=!!PROG.ch1.crown;pav.glow=+pav.lit;pav.hold=0;
  for(const l of levers){if(l.id==='stair'){l.pulled=stair.raised;l.t=+stair.raised;}if(l.id==='pavilion'){l.pulled=pav.open;l.t=+pav.open;}}
  stepOrchard(0);updateOrchardVis();
}
