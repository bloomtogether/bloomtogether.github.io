// ================= Chapter 5: The Mushroom Marsh =================
// A misty, glowing swamp of giant fungi. New: bouncy mushrooms and growing vines.
//  - Glowing pink mushrooms are springy: land on one to bounce, hold jump as you land to bounce high. A Giant's ground
//    pound on one throws him much higher, and throws anyone else standing on the same cap higher still.
//  - Dew lilies give the Sprite one dewdrop; she pours it on a seed-pod (or a wilted mushroom) and it grows.
//  - Fog Hollow's boardwalk lies sunk in the murk and rises only near the Sprite's light.
// The route, south to north:
//  Reed Landing (bounce over the reed wall) -> the stream (dew + seed-pod: a vine bridge) -> the Bounding Bog (a chain of
//  mushrooms) -> Glowcap Clearing, the hub. Three glow spores:
//   1. the Vine Ravine (east): the Sprite takes dew, stands on the big cap, the Giant slams it; both fly onto the ledge;
//      the Sprite waters the pod there and a vine bridge grows across to the east cliff.
//   2. Fog Hollow (west): the sunken boardwalk maze, lit only near the Sprite.
//   3. the Shelf (north-west): the Sprite waters a wilted mushroom; the Giant slams it and bounces up onto the shelf.
//  -> the Elder Glade: set the spores at the Elder Mushroom; its root cap wakes; the Sprite takes dew, the Giant slams
//     the root cap and the Sprite flies onto the Elder's cap to water her sleeping bud.
// Optional: the bog hummock (a side chain of mushrooms), the lost island in the fog, the hollow stump (a vine ladder).
const KCP={g:[-1.5,0,4.5],s:[1.5,0,4.5]};
const MK={ring:new V3(0,0,-85.5),bud:new V3(0,10.2,-90),hollow:{x0:-46,x1:-12,z0:-68,z1:-44},stream:{x0:-14,x1:14,z0:-21,z1:-17},bog:{x0:-14,x1:14,z0:-43,z1:-25},rav:{x0:20,x1:30}};
const mks={placed:0,bud:false,budT:0,fogK:0,rootT:0};
const SHROOMS=[],PODS=[],LILIES=[],SPORES=[],PLANKS=[];
const KM={};
const inCh5=()=>G.region==='ch5';

function marshMats(){
  const R=REAL.ready;
  KM.moss=R?M.ground:new THREE.MeshLambertMaterial({map:M.ground.map,color:'#93b07a'});if(!R)TILE.set(KM.moss,8);
  KM.rock=R?rockMat('marshRock','#a3aa96'):new THREE.MeshLambertMaterial({color:'#8c927f'});if(R)KM.rock.envMapIntensity=1.3;TILE.set(KM.rock,3.5);
  KM.root=new THREE.MeshStandardMaterial({map:M.wood.map,color:'#b08a68',roughness:.88,metalness:0,envMapIntensity:.9});TILE.set(KM.root,1.6);
  KM.murk=new THREE.MeshStandardMaterial({color:'#557463',roughness:.22,metalness:0,envMapIntensity:1});
  KM.stream=M.water;
  KM.stem=new THREE.MeshLambertMaterial({color:'#efe3cc'});
  KM.bouncy=new THREE.MeshStandardMaterial({color:'#e2589c',emissive:'#a8246a',emissiveIntensity:.55,roughness:.55});
  KM.decor=new THREE.MeshLambertMaterial({color:'#b5774a'});
  KM.decor2=new THREE.MeshLambertMaterial({color:'#7d9bd0',emissive:'#2a4a8a',emissiveIntensity:.4});
  KM.wilt=new THREE.MeshLambertMaterial({color:'#8d7a74'});
  KM.vine=new THREE.MeshLambertMaterial({color:'#4f8a3c'});
  KM.leaf=new THREE.MeshLambertMaterial({color:'#6fb04a',side:THREE.DoubleSide});
  KM.pod=new THREE.MeshStandardMaterial({color:'#9ccf5a',emissive:'#4f7a1f',emissiveIntensity:.5,roughness:.6});
  KM.lily=new THREE.MeshStandardMaterial({color:'#f4f0ff',emissive:'#7fb6ff',emissiveIntensity:.45,roughness:.5});
  KM.dew=new THREE.MeshStandardMaterial({color:'#bfe6ff',emissive:'#5fb4ff',emissiveIntensity:.8,roughness:.1,transparent:true,opacity:.85});
  KM.spore=new THREE.MeshStandardMaterial({color:'#c9fff0',emissive:'#3fe0b8',emissiveIntensity:1.5,roughness:.4});
  KM.elderCap=new THREE.MeshStandardMaterial({color:'#9b86b0',emissive:'#6b3fa0',emissiveIntensity:.05,roughness:.6});
  KM.reed=new THREE.MeshLambertMaterial({color:'#6f8a4a'});
  KM.pad=new THREE.MeshLambertMaterial({color:'#4f7d44'});
}
function mossFloor(xa,xb,za,zb,y,deep){const t=y||0;box(xa,xb,t-.5,t,za,zb,KM.moss,{cast:false,fade:false,surface:'grass'});if(deep!==0)box(xa,xb,t-(deep||4),t-.5,za,zb,KM.rock,{cast:false,fade:false,collide:false});}
function cliff(xa,xb,za,zb,h){return box(xa,xb,0,h,za,zb,KM.rock,{surface:'stone'});}
// a flat-topped rock with a mossy top you can stand on
function mesa(xa,xb,za,zb,h,y0){const b=y0||0;box(xa,xb,b,h,za,zb,null,{surface:'grass'});box(xa,xb,b,h-.1,za,zb,KM.rock,{collide:false});box(xa,xb,h-.1,h,za,zb,KM.moss,{collide:false,fade:false,cast:false});}
// a mushroom cap: flat on top (so feet sit on it), curling down at the rim
function capGeo(r){const pts=[new THREE.Vector2(.001,0),new THREE.Vector2(r*.4,-.01*r),new THREE.Vector2(r*.7,-.05*r),new THREE.Vector2(r*.88,-.12*r),new THREE.Vector2(r,-.26*r),new THREE.Vector2(r*.92,-.36*r),new THREE.Vector2(r*.5,-.3*r),new THREE.Vector2(.001,-.28*r)];
  const g=new THREE.LatheGeometry(pts.reverse(),20);g.computeVertexNormals();return g;} // reversed so the faces point outward
// ---- springy mushrooms ----
// H: bounce height when holding jump; P: a Giant's slam; L: what a slam throws someone else on the same cap
function addShroom(id,x,z,r,top,o){
  o=o||{};const g=new THREE.Group();g.position.set(x,0,z);ROOT.add(g);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(r*.28,r*.38,top-.15,10),KM.stem);stem.position.y=(top-.15)/2;stem.castShadow=true;g.add(stem);
  const cap=new THREE.Mesh(capGeo(r),KM.bouncy);cap.position.y=top;cap.castShadow=true;cap.receiveShadow=true;g.add(cap);
  const hw=r*.8,col=box(x-hw,x+hw,0,top,z-hw,z+hw,null,{kind:'shroom',surface:'shroom'});
  const sh={id,pos:new V3(x,0,z),r,top,H:o.H||3.4,P:o.P||8,L:o.L||9,col,g,cap,stem,sq:0,awake:o.asleep?false:true,grow:o.asleep?0:1,sleep:null};col.sh=sh;
  if(o.asleep){sh.sleep=box(x-r*.5,x+r*.5,0,.35,z-r*.5,z+r*.5,null,{surface:'grass'});col.on=false;}
  SHROOMS.push(sh);return sh;
}
// ---- dew lilies and seed-pods ----
function addLily(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);ROOT.add(g);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.7,5),KM.vine);st.position.y=.35;g.add(st);
  for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),KM.lily);p.scale.set(.5,.25,1);const a=i/5*Math.PI*2;p.position.set(Math.sin(a)*.18,.74,Math.cos(a)*.18);p.rotation.y=a;p.rotation.x=-.5;g.add(p);}
  const drop=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),KM.dew);drop.position.y=.86;g.add(drop);
  LILIES.push({pos:new V3(x,y,z),g,drop});box(x-.2,x+.2,y,y+.6,z-.2,z+.2,null,{collide:false});}
function addPod(id,x,y,z,label,cols,onGrow){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.4,12,10),KM.pod);m.scale.set(1,.8,1);m.position.set(x,y+.32,z);m.castShadow=true;ROOT.add(m);
  const P={id,pos:new V3(x,y,z),label,grown:false,t:0,cols:cols||[],onGrow:onGrow||null,m,parts:[]};for(const c of P.cols)c.on=false;PODS.push(P);return P;}
const podReach=(s,p)=>dxz(s.pos,p.pos)<1.3&&Math.abs(s.pos.y-p.pos.y)<1;
// ---- glow spores (the chapter's root stones) ----
function addSpore(i,x,y,z,where){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.3,1),KM.spore);m.castShadow=true;ROOT.add(m);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#7ff7d8',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.75}));glow.scale.set(1.8,1.8,1);ROOT.add(glow);
  SPORES.push({i,pos:new V3(x,y,z),home:new V3(x,y,z),state:'rest',m,glow,where});}
const sporeReach=(g,e)=>dxz(g.pos,e.pos)<1.9&&e.pos.y-g.pos.y>-.8&&e.pos.y-g.pos.y<2.2;
// ---- Fog Hollow's sunken boardwalk: axis-aligned runs, cut into ~2 m planks ----
function boardwalk(runs){
  const tiles=[];
  for(const [ax,az,bx,bz] of runs){const len=Math.hypot(bx-ax,bz-az)+1.6,n=Math.max(1,Math.round(len/2)),alongX=Math.abs(bx-ax)>Math.abs(bz-az);
    const sx=Math.sign(bx-ax)||1,sz=Math.sign(bz-az)||1;
    for(let k=0;k<n;k++){const a=-.8+len*k/n,b=-.8+len*(k+1)/n;
      if(alongX){const x0=ax+sx*a,x1=ax+sx*b;tiles.push([Math.min(x0,x1),Math.max(x0,x1),az-.8,az+.8]);}
      else{const z0=az+sz*a,z1=az+sz*b;tiles.push([ax-.8,ax+.8,Math.min(z0,z1),Math.max(z0,z1)]);}}}
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),M.wood,tiles.length);im.castShadow=false;im.receiveShadow=true;
  tiles.forEach(([x0,x1,z0,z1],i)=>{const col=box(x0,x1,-.2,0,z0,z1,null,{kind:'plank',surface:'wood'});col.on=false;
    PLANKS.push({col,i,t:0,lit:false,cx:(x0+x1)/2,cz:(z0+z1)/2,w:x1-x0-.06,d:z1-z0-.06,vis:-1});});
  ROOT.add(im);mks.plankIM=im;
}

// ================= build =================
function buildMarsh(){
  curBuild='ch5';
  const R=beginRegion('ch5',{name:'Chapter 5: The Mushroom Marsh',short:'Mushroom Marsh',chapter:5,fog:[26,120],fogReal:[30,150],spawn:KCP,
    tint:{fog:'#9fb6a6'},glow:true,hazard:b=>!(b===sprite&&sprite.held)&&b.pos.y<-.3&&marshMire(b.pos.x,b.pos.z)});
  marshMats();
  const murk=(x0,x1,z0,z1,noPlane)=>{if(!noPlane){const w=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),KM.murk);w.rotation.x=-Math.PI/2;w.position.set((x0+x1)/2,-.12,(z0+z1)/2);w.receiveShadow=true;ROOT.add(w);}
    box(x0,x1,-1.6,-1.2,z0,z1,null,{surface:'stone'});};
  // ---------- Reed Landing ----------
  mossFloor(-14,14,10,-17);
  {const g=prop('gate');if(REAL.ready)realifyProp(g);g.position.set(0,-.05,8.5);g.rotation.y=Math.PI;g.scale.setScalar(.82);ROOT.add(g);
    const gm=[];g.traverse(o=>{if(o.isMesh)gm.push(o);});if(gm.length)markFadeGroup(gm);
    for(const s of [-1,1])box(s>0?2.62:-4.3,s>0?4.3:-2.62,0,6.5,7.3,9.7,null,{surface:'stone'});
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(5.2,7.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    veil.position.set(0,3.9,8.9);ROOT.add(veil);mks.veil=veil;
    const lab=labelSprite('The Vale','Walk through together','#1fb3a3');lab.scale.set(4.4,1.4,1);lab.position.set(0,9,8.6);ROOT.add(lab);invis(-5,5,0,12,11,12);}
  cliff(-14,-4.3,9.2,10.4,1.4);cliff(4.3,14,9.2,10.4,1.4);
  cliff(-16,-14,12,-43,4);cliff(14,16,12,-41,4);
  addWaystone('ch5_landing','Reed Landing',-7,0,5,Math.PI);
  // the reed wall: too high to jump, so bounce over it (a mushroom on each side)
  box(-14,14,0,2.2,-11,-13,KM.root,{surface:'wood'});
  addShroom('wallS',4,-8.8,1.5,.9);addShroom('wallN',-6,-15,1.5,.9);
  // the stream: too wide for the Giant; the Sprite grows a vine bridge
  const S0=MK.stream;murk(S0.x0,S0.x1,S0.z1,S0.z0,true);box(S0.x0,S0.x1,-1.6,-1.2,S0.z1,S0.z0,KM.rock,{cast:false,fade:false,collide:false});
  {const w=new THREE.Mesh(new THREE.PlaneGeometry(S0.x1-S0.x0,4),M.water);w.rotation.x=-Math.PI/2;w.position.set(0,-.1,-19);ROOT.add(w);}
  addLily(-9.5,0,-15.4);
  {const c=box(.4,2.6,-.3,0,-16.8,-21.2,null,{surface:'wood'});const v=new THREE.Group();v.position.set(1.5,-.15,-16.8);ROOT.add(v);
    const b=new THREE.Mesh(new THREE.BoxGeometry(2.1,.3,4.4),KM.vine);b.position.z=-2.2;b.receiveShadow=true;v.add(b);
    const P=addPod('stream',1.5,0,-16.2,'Water the seed-pod',[c]);P.vine=v;}
  mossFloor(-14,14,-21,-25);
  // ---------- the Bounding Bog: a chain of mushrooms ----------
  const B0=MK.bog;murk(B0.x0,B0.x1,B0.z1,B0.z0);
  for(const z of [-25.6,-29.4,-33.2,-37,-40.8])addShroom('bog'+z,0,z,1.5,.9);
  addShroom('side1',3.8,-33.2,1.5,.9);addShroom('side2',7.6,-33.2,1.5,.9);
  box(10,14,-1.2,1.6,-31,-35.4,KM.moss,{surface:'grass'}); // the hummock (secret)
  // ---------- Glowcap Clearing (the hub) ----------
  mossFloor(-12,20,-43,-64);mossFloor(12,20,-64,-70);
  cliff(14,44,-41,-43,4);
  addLily(4,0,-48);
  addWaystone('ch5_clearing','Glowcap Clearing',8,0,-58,-Math.PI/2);
  // the Shelf: a mushroom that has wilted; water it and slam it to bounce up
  mesa(-12,-6,-58,-64,6.5);
  const wilt=addShroom('wilt',-9,-55.6,1.6,.9,{asleep:true});
  addPod('wilt',-9,0,-55.6,'Water the wilted mushroom',[],()=>{wilt.awake=true;});
  PODS[PODS.length-1].m.visible=false;PODS[PODS.length-1].shroom=wilt;
  addSpore(2,-9,6.5,-61.5,'The Shelf');
  // ---------- the Vine Ravine (east) ----------
  box(20,30,-12.4,-12,-41,-72,KM.rock,{fade:false,cast:false});
  mesa(30,42,-43,-70,6.5,-12);
  cliff(42,44,-41,-72,10);cliff(12,44,-70,-72,7);
  mesa(13,20,-62,-70,6.5); // the ledge
  addShroom('ravine',16,-59.4,1.7,.9,{P:8,L:9});
  {const c=box(19.6,30.4,6.15,6.5,-64,-66,null,{surface:'wood'});const v=new THREE.Group();v.position.set(19.6,6.33,-65);ROOT.add(v);
    const b=new THREE.Mesh(new THREE.BoxGeometry(10.8,.35,2),KM.vine);b.position.x=5.4;b.castShadow=true;b.receiveShadow=true;v.add(b);
    for(let i=0;i<9;i++){const l=new THREE.Mesh(new THREE.CircleGeometry(.45,6),KM.leaf);l.rotation.x=-Math.PI/2+.3;l.position.set(.8+i*1.2,.22,i%2?.9:-.9);v.add(l);}
    const P=addPod('bridge',19.2,6.5,-63.4,'Water the seed-pod',[c]);P.vine=v;}
  addSpore(0,36,6.5,-48,'The Vine Ravine');
  addLily(33,6.5,-52);
  // the hollow stump (secret): a seed-pod at its foot grows a ladder of shelf fungi
  {box(36,40,6.5,11,-57.4,-64.4,KM.root,{surface:'wood'});const steps=[];
    [[-64.2,-62.8,.9],[-62.7,-61.3,1.8],[-61.2,-59.8,2.7],[-59.7,-58.3,3.6]].forEach(([z0,z1,h])=>{const c=box(34.4,36,6.5+h-.2,6.5+h,z0,z1,null,{surface:'wood'});steps.push(c);});
    const P=addPod('ladder',35.2,6.5,-65.6,'Water the seed-pod',steps);
    for(const c of steps){const m=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.22,12,1,false,Math.PI,Math.PI),KM.decor);m.scale.set(1,1,.85);m.position.set(36,c.max.y-.11,(c.min.z+c.max.z)/2);m.castShadow=true;ROOT.add(m);P.parts.push(m);}}
  // ---------- Fog Hollow (west): the sunken boardwalk ----------
  const H0=MK.hollow;murk(H0.x0,H0.x1,H0.z0,H0.z1);
  cliff(-48,-14,-42,-44,4);cliff(-48,-12,-68,-70,4);cliff(-48,-46,-42,-70,4);
  mossFloor(-44,-38,-58,-64,0,2);mossFloor(-44,-40,-44,-48,0,2);mossFloor(-30,-26,-48,-52,0,2);
  boardwalk([[-12,-50,-26,-50],[-19,-50,-19,-45],[-19,-45,-24,-45],[-30,-50,-35,-50],[-35,-50,-35,-46],[-35,-46,-40,-46],[-35,-50,-35,-61],[-35,-61,-38,-61],[-35,-55,-29,-55],[-29,-55,-29,-62]]);
  addSpore(1,-41,0,-61,'Fog Hollow');
  // ---------- the Elder Glade ----------
  mossFloor(-12,12,-64,-98);
  cliff(-14,-12,-64,-100,5);cliff(12,14,-70,-100,5);cliff(-14,14,-98,-100,5);
  {box(-2.5,2.5,0,9.6,-87.5,-92.5,null,{surface:'wood'});box(-7,7,9.6,10.2,-83,-97,null,{surface:'shroom'});
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(2.3,3.1,9.8,16),KM.stem);stalk.position.set(0,4.9,-90);stalk.castShadow=true;ROOT.add(stalk);markFade(stalk);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(7.2,7.7,.7,32),KM.elderCap);cap.position.set(0,9.85,-90);cap.castShadow=true;cap.receiveShadow=true;ROOT.add(cap);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(7.5,.45,8,40),KM.elderCap);rim.rotation.x=Math.PI/2;rim.position.set(0,9.6,-90);ROOT.add(rim);
    const gill=new THREE.Mesh(new THREE.ConeGeometry(7.4,1.6,32,1,true),KM.stem);gill.rotation.x=Math.PI;gill.position.set(0,8.8,-90);ROOT.add(gill);
    mks.elder=[cap,rim];markFadeGroup([cap,rim,gill]);
    const bud=new THREE.Mesh(new THREE.SphereGeometry(.55,14,10),new THREE.MeshStandardMaterial({color:'#d9b8f0',emissive:'#9a5fd0',emissiveIntensity:.3,roughness:.5}));bud.scale.set(1,1.3,1);bud.position.set(0,10.7,-90);ROOT.add(bud);mks.budM=bud;
    mks.light=new THREE.PointLight('#b98cff',0,30,1.6);mks.light.position.set(0,12,-90);ROOT.add(mks.light);
    mks.sockets=[];for(let k=0;k<3;k++){const x=-1.6+k*1.6,z=k===1?-87.3:-87;const st=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,.5,8),KM.rock);st.position.set(x,.25,z);ROOT.add(st);
      const e=new THREE.Mesh(new THREE.IcosahedronGeometry(.24,1),KM.spore);e.position.set(x,.75,z);e.visible=false;ROOT.add(e);mks.sockets.push(e);}}
  mks.root=addShroom('root',0,-80,1.8,.9,{asleep:true,L:11,P:6});
  addLily(6,0,-78);
  // ---------- scenery: giant fungi, reeds, lily pads ----------
  decorShrooms([[-11,-2,1.6,3.2],[11,-4,1.3,2.6],[-11,-22,1.2,2.2],[11,-22.6,1.4,2.8],[-10,-60,1.2,2],[17,-46,1.5,3.6],[10,-62.5,1.1,2.4],
    [-10,-72,2.2,5.5],[10,-74,2.6,6.4],[-10,-96,2.4,6],[10,-95,2,5],[-8,-80,1.2,2.6],[9,-86,1.3,2.8],[40,-44.6,1.4,3],[40.6,-68,1.6,3.4],[-44.6,-60,1.3,2.6],[-43,-63,1,1.8]]);
  reeds([[-13,-18],[13,-19.5],[-13,-27],[-13,-34],[-13,-41],[13,-27],[13,-39],[-14,-46],[-14,-56],[-20,-66],[-30,-66.5],[-45,-50],[-40,-43],[-26,-43],[-12.6,-63]]);
  lilyPads(B0);
  // ---------- collectibles ----------
  const SD=[[-8,0,0],[8,0,-2],[-10,0,-6],[10,0,-7],[-8,2.2,-12],[8,2.2,-12],[6,0,-15],[-10,0,-15.5],[-8,0,-23],[8,0,-23],
    [0,3.9,-31.3],[0,3.9,-38.9],[11,1.6,-32],[13,1.6,-34.4],
    [-8,0,-46],[10,0,-46],[-2,0,-52],[14,0,-50],[2,0,-60],[16,0,-45],[-7,6.5,-59],[14,6.5,-64.6],
    [33,6.5,-46],[40,6.5,-46],[33,6.5,-68],[40,6.5,-68],[35.2,8.3,-62],[35.2,10.1,-59],
    [-24,0,-45],[-29,0,-62],[-28,0,-50],[-42,0,-59.5],[-40,0,-62.5],[-43,0,-45],
    [-8,0,-70],[8,0,-72],[-9,0,-84],[9,0,-84],[-5,0,-95],[5,0,-95]];
  SD.forEach(([x,y,z],i)=>addSeed('c5s'+i,x,y,z));
  addPetal('m15',12,1.6,-33.2);addPetal('m16',-42,0,-46);addPetal('m17',38,11,-61);
  if(REAL.ready)ROOT.traverse(o=>{if(o.isMesh&&o.material===M.ground&&!o.geometry.attributes.color){const n=o.geometry.attributes.position.count;o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));}});
  SPORES.sort((a,b)=>a.i-b.i);
  mks.beacon=makeBeacon();
  endRegion(R);
  buildSeedInstances('ch5');
}
function decorShrooms(list){
  const n=list.length,sG=new THREE.CylinderGeometry(.3,.42,1,8);sG.translate(0,.5,0);const cG=capGeo(1);
  const a=new THREE.InstancedMesh(sG,KM.stem,n),b=new THREE.InstancedMesh(cG,KM.decor,n),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new V3(),sc=new V3();
  const c2=[];
  list.forEach(([x,z,r,h],i)=>{p.set(x,0,z);sc.set(r,h,r);m4.compose(p,q,sc);a.setMatrixAt(i,m4);p.set(x,h,z);sc.set(r,r,r);m4.compose(p,q,sc);b.setMatrixAt(i,m4);
    box(x-r*.3,x+r*.3,0,h,z-r*.3,z+r*.3,null,{surface:'wood'});if(i%3===1)c2.push(i);});
  b.instanceColor=null;for(const im of [a,b]){im.castShadow=true;im.receiveShadow=true;ROOT.add(im);}
  // every third one glows blue
  const g2=new THREE.InstancedMesh(cG,KM.decor2,c2.length);c2.forEach((i,k)=>{b.getMatrixAt(i,m4);g2.setMatrixAt(k,m4);m4.makeScale(0,0,0);b.setMatrixAt(i,m4);});ROOT.add(g2);
}
function reeds(spots){
  const n=spots.length*7,im=new THREE.InstancedMesh(new THREE.ConeGeometry(.06,1.8,4),KM.reed,n),m4=new THREE.Matrix4();let k=0;
  for(const [x,z] of spots)for(let i=0;i<7;i++){const h=.8+hash2(k,3,5)*.7;m4.makeScale(1,h,1);m4.setPosition(x+(hash2(k,1,5)-.5)*1.6,.9*h,z+(hash2(k,2,5)-.5)*1.6);im.setMatrixAt(k++,m4);}
  ROOT.add(im);
}
function lilyPads(B){
  const n=40,im=new THREE.InstancedMesh(new THREE.CircleGeometry(.5,8),KM.pad,n),m4=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),p=new V3(),sc=new V3();
  for(let i=0;i<n;i++){const x=lerp(B.x0+.6,B.x1-.6,hash2(i,1,7)),z=lerp(B.z0+.6,B.z1-.6,hash2(i,2,7));if(Math.abs(x)<2.2){sc.set(0,0,0);}else{const s=.6+hash2(i,3,7)*.8;sc.set(s,s,s);}p.set(x,-.06,z);m4.compose(p,q,sc);im.setMatrixAt(i,m4);}
  ROOT.add(im);
}
// murky water: the stream, the bog and the hollow (below the surface counts as a slip)
function marshMire(x,z){for(const R of [MK.stream,MK.bog,MK.hollow])if(x>R.x0&&x<R.x1&&z>R.z0&&z<R.z1)return true;return false;}

// ================= state =================
function resetMarsh(){
  const done=!!PROG.ch5.done;
  G.time=0;G.falls=0;G.throws=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;
  for(const P of PODS){P.grown=done;P.t=+done;for(const c of P.cols)c.on=done;}
  for(const sh of SHROOMS){if(!sh.sleep)continue;sh.awake=done;sh.grow=+done;sh.col.on=done;sh.sleep.on=!done;}
  for(const e of SPORES){e.state=done?'placed':'rest';e.pos.copy(e.home);}
  mks.placed=done?3:0;mks.bud=done;mks.budT=+done;
  for(const p of PLANKS){p.t=0;p.lit=false;p.col.on=false;}
  golem.runes=0;golem.holding=false;golem.charging=false;golem.pound=false;sprite.held=false;sprite.dew=0;
  placeAt(golem,KCP.g);placeAt(sprite,KCP.s);golem.yaw=sprite.yaw=Math.PI;hintsShown.clear();camSnap=true;
}
function marshDone(){return !!PROG.ch5.done;}
function sporeTarget(){const g=golem;for(const e of SPORES)if(e.state==='rest'&&sporeReach(g,e))return e;return null;}
function golemMarshAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,MK.ring)<3&&g.pos.y<1){for(const e of SPORES)if(e.state==='carried'){e.state='placed';mks.placed++;}g.runes=0;return true;}
  const e=sporeTarget();if(e){e.state='carried';g.runes++;G.pick++;return true;}
  return false;
}
// what the Sprite can use here: a lily (no dewdrop yet), a pod (with one), the Elder's bud (with one, at the top)
function marshTarget(){
  const s=sprite;
  if(s.dew){
    if(mks.placed>=3&&!mks.bud&&dxz(s.pos,MK.bud)<1.6&&Math.abs(s.pos.y-MK.bud.y)<1)return {obj:{marsh:'bud'},label:'Water the Elder’s bud'};
    for(const P of PODS)if(!P.grown&&podReach(s,P))return {obj:{marsh:'pod',P},label:P.label};
    return null;}
  for(const L of LILIES)if(dxz(s.pos,L.pos)<1.2&&Math.abs(s.pos.y-L.pos.y)<1)return {obj:{marsh:'lily',L},label:'Collect a dewdrop'};
  return null;
}
function marshUse(o){
  const s=sprite;
  if(o.marsh==='lily'){s.dew=1;G.dewN=(G.dewN||0)+1;return;}
  if(o.marsh==='pod'){s.dew=0;o.P.grown=true;G.growN=(G.growN||0)+1;G.lastGrow=o.P.id;return;}
  if(o.marsh==='bud'){s.dew=0;mks.bud=true;if(!G.ending&&!marshDone()){G.ending=true;G.endT=0;chapterComplete(5);}}
}
// landing on a springy cap: hold jump to bounce high; a Giant's slam goes higher and throws whoever else is on the cap
function marshLand(b,landed,pounded,hold){
  if(!landed)return;const c=b.ground;if(!c||c.kind!=='shroom'||!c.sh)return;const sh=c.sh,v=-(b.landVy||0);let H=0;
  if(pounded){H=sh.P;G.bigBounceN=(G.bigBounceN||0)+1;
    const o=sprite;if(b===golem&&!o.held&&o.ground===c&&Math.abs(o.pos.y-c.max.y)<.15){o.vel.set(o.vel.x*.3,Math.sqrt(2*GRAV*sh.L),o.vel.z*.3);o.onGround=false;o.thrownT=0;o.airT=0;o.coyote=0;G.launchN++;G.launchBig=1;G.ch.launches++;}}
  else if(hold)H=sh.H;
  else if(v*.55>3.2)H=(v*.55)*(v*.55)/(2*GRAV);
  if(H<=0)return;
  b.vel.y=Math.sqrt(2*GRAV*H);b.onGround=false;b.coyote=0;sh.sq=1;G.bounceN=(G.bounceN||0)+1;G.ch.bounces=(G.ch.bounces||0)+1;
}
// the boardwalk rises where the Sprite's light reaches (with a little give so planks don't flicker), and a plank
// someone is standing on stays up: nobody drops in just because the other one walked on ahead
const onPlank=(b,p)=>Math.abs(b.pos.x-p.cx)<p.w/2+b.hw&&Math.abs(b.pos.z-p.cz)<p.d/2+b.hw&&Math.abs(b.pos.y)<.3;
function stepPlanks(dt,solid){
  const s=sprite;
  for(const p of PLANKS){const d=Math.hypot(s.pos.x-p.cx,s.pos.z-p.cz);p.lit=d<(p.lit?6.6:5.6)||(p.t>.55&&(onPlank(golem,p)||(!s.held&&onPlank(s,p))));p.t=approach(p.t,p.lit?1:0,dt/.45);
    if(solid){const on=p.t>.55;if(on&&!p.col.on)liftOnto(p.col);p.col.on=on;}}
}
function stepMarshB(dt){
  for(const P of PODS){if(!P.grown||P.t>=1)continue;P.t=Math.min(1,P.t+dt/2.2);if(P.t>=1){for(const c of P.cols){c.on=true;liftOnto(c);}if(P.shroom)wakeShroom(P.shroom);if(P.onGrow)P.onGrow();}}
  if(mks.placed>=3&&!mks.root.awake)wakeShroom(mks.root);
  for(const sh of SHROOMS)if(sh.awake&&sh.grow<1)sh.grow=Math.min(1,sh.grow+dt/1.6);
  stepPlanks(dt,true);
  mks.budT=approach(mks.budT,mks.bud?1:0,dt/2.5);
}
function wakeShroom(sh){if(sh.awake&&sh.col.on)return;sh.awake=true;sh.col.on=true;if(sh.sleep)sh.sleep.on=false;liftOnto(sh.col);G.wakeN=(G.wakeN||0)+1;G.lastWake=sh.id;}

// ================= visuals =================
function updateMarshVis(dt,t){
  const rf=PROG.settings.reduceFlash,guest=mode==='online'&&role!=='host';
  if(guest)stepPlanks(dt,false);
  for(const sh of SHROOMS){sh.sq=Math.max(0,sh.sq-dt*4);const k=sh.sleep?(sh.awake?smooth(0,1,sh.grow):0):1;
    const s=sh.sleep?.35+.65*k:1,sq=1-.32*Math.sin(Math.min(1,sh.sq)*Math.PI);sh.g.scale.set(s,s*sq,s);
    sh.cap.material=k>.5||!sh.sleep?KM.bouncy:KM.wilt;sh.g.rotation.z=sh.sleep?(1-k)*.5:0;}
  for(const P of PODS){const k=smooth(0,1,P.t);P.m.scale.setScalar(P.grown?Math.max(.01,1-k):1+.06*Math.sin(t*2.4));
    if(P.vine){P.vine.visible=k>.02;if(P.id==='bridge')P.vine.scale.set(Math.max(.01,k),1,1);else P.vine.scale.set(1,1,Math.max(.01,k));}
    for(const m of P.parts){m.visible=k>.02;m.scale.set(Math.max(.01,k),1,.85*Math.max(.01,k));}
    if(P.grown&&P.t<1&&!rf&&Math.random()<dt*25)emit(P.pos.x+(Math.random()-.5),P.pos.y+.4,P.pos.z+(Math.random()-.5),0,1,0,.6,1,.5,.1,1,-.2,.3);}
  for(const L of LILIES){L.drop.visible=true;L.drop.position.y=.86+Math.sin(t*2+L.pos.x)*.03;}
  // the boardwalk
  const im=mks.plankIM,m4=new THREE.Matrix4();let dirty=false;
  for(const p of PLANKS){const k=Math.round(smooth(0,1,p.t)*40)/40;if(k===p.vis)continue;p.vis=k;dirty=true;m4.makeScale(p.w,.2,p.d);m4.setPosition(p.cx,-.1-.42*(1-k),p.cz);im.setMatrixAt(p.i,m4);}
  if(dirty)im.instanceMatrix.needsUpdate=true;
  for(const e of SPORES){const vis=e.state==='rest';e.m.visible=e.glow.visible=vis;if(vis){const y=e.pos.y+.6+Math.sin(t*1.6+e.i)*.08;e.m.position.set(e.pos.x,y,e.pos.z);e.m.rotation.y=t*.7;e.glow.position.set(e.pos.x,y,e.pos.z);e.glow.material.opacity=rf?.7:.55+.2*Math.sin(t*2.6+e.i);}}
  mks.sockets.forEach((m,i)=>m.visible=i<mks.placed);
  const awake=mks.bud||marshDone(),b=smooth(0,1,awake?Math.max(mks.budT,marshDone()?1:0):0);
  mks.budM.scale.set(1+b*.8,1.3-b*.5,1+b*.8);mks.budM.material.emissiveIntensity=.3+b*1.4;
  KM.elderCap.emissiveIntensity=.05+(mks.placed/3)*.15+b*.6;mks.light.intensity=approach(mks.light.intensity,b*2.4+mks.placed*.2,dt*2);
  mks.veil.material.opacity=rf?.24:.2+.1*Math.sin(t*1.6);
  // the dewdrop the Sprite carries
  if(!mks.dewM){mks.dewM=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),KM.dew);ROOT.add(mks.dewM);}
  if(mks.dewM.parent!==REG.ch5.group)REG.ch5.group.add(mks.dewM);
  mks.dewM.visible=!!sprite.dew;if(sprite.dew){const p=sprite.root?sprite.root.position:sprite.pos;mks.dewM.position.set(p.x,p.y+.75+Math.sin(t*4)*.04,p.z);}
  // Fog Hollow: the mist closes in, and the Sprite's light matters
  const inH=camTarget.x<-13&&camTarget.z<-42&&camTarget.z>-69;mks.fogK=approach(mks.fogK,inH?1:0,dt*.7);
  const fg=REAL.ready?REG.ch5.fogReal:REG.ch5.fog,fk=smooth(0,1,mks.fogK);scene.fog.near=lerp(fg[0],7,fk);scene.fog.far=lerp(fg[1],32,fk);
  if(SPRITE_LIGHT){const p=sprite.root?sprite.root.position:sprite.pos;SPRITE_LIGHT.position.set(p.x,p.y+.6,p.z);SPRITE_LIGHT.intensity=.7+fk*1.8;SPRITE_LIGHT.distance=8+fk*4;}
  // drifting glow motes
  if(!rf&&Math.random()<dt*10)emit(camTarget.x+(Math.random()-.5)*24,camTarget.y+Math.random()*4,camTarget.z+(Math.random()-.5)*24,(Math.random()-.5)*.2,.15,(Math.random()-.5)*.2,.6,1,.85,.06,5,0,.05);
}
// ================= the Vale: glowing mushrooms under the trees once the fifth root wakes =================
function buildValeGlowshrooms(){
  const n=90,sG=new THREE.CylinderGeometry(.05,.07,.4,6);sG.translate(0,.2,0);const cG=capGeo(.22);cG.translate(0,.4,0);
  const a=new THREE.InstancedMesh(sG,new THREE.MeshLambertMaterial({color:'#e8f1ff'}),n),b=new THREE.InstancedMesh(cG,new THREE.MeshLambertMaterial({color:'#9fc4ff',emissive:'#4f86e0',emissiveIntensity:.6}),n),m4=new THREE.Matrix4();
  let k=0;for(let i=0;i<600&&k<n;i++){const ang=hash2(i,1,21)*Math.PI*2,r=lerp(36,104,hash2(i,2,21)),x=Math.cos(ang)*r,z=Math.sin(ang)*r;
    if(riverDist(x,z)<RIVER_W+4||pathDist(x,z)<3)continue;const s=1.3+hash2(i,3,21)*1.4;m4.makeScale(s,s,s);m4.setPosition(x,valeH(x,z),z);a.setMatrixAt(k,m4);b.setMatrixAt(k,m4);k++;}
  a.count=b.count=k;a.visible=b.visible=false;ROOT.add(a);ROOT.add(b);VALE.glowsh=[a,b];
}
function updateValeGlowshrooms(){if(!VALE.glowsh)return;const on=PROG.roots>=5&&!(G.scene==='root5'&&G.line<1);for(const m of VALE.glowsh)m.visible=on;}
