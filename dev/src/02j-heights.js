// ================= Chapter 3: The Windmill Heights =================
// Islands floating above a sea of cloud. New: wind. Rising winds and wind currents carry the Sprite when it
// spreads its wings (hold jump); the Giant is too heavy to fly but wades through deep water with the Sprite on its head.
// The route, south to north:
//  Landing Isle (ride a rising wind to the lever that lowers the bridge) -> Wading Isle (the Giant wades the deep pond
//  with the Sprite on its head; cog 1 lies in the pond) -> Sail Terrace (the Giant turns two sails to steer the wind
//  from the Wind Gate: the right one lifts the Sprite to cog 2 on a pillar, it nudges the cog down; with both sails
//  edge-on the wind turns the windmill wheel) -> ride a wheel platform up to the High Orchard -> the Giant throws the
//  Sprite into a wind current over the gap; on the far islet it lowers a bridge (cog 3) -> the Great Windmill: set the
//  three cogs, the Sprite rides the tower's rising wind up to the balcony and releases the brake.
// Optional: the cloud nest under the Landing Isle, the grotto behind the pond's waterfall, the windmill's rooftop.
const HCP={g:[-1.5,0,4.5],s:[1.5,0,4.5]};
const HT={gate:new V3(0,0,8.5),gear:new V3(52,13,-79.4),winchB:null};
const WHEEL={cx:38,cy:7.6,cz:-63,R:6.5,hang:1.1,a:0,w:0,gond:[],g:null};
const POND={x0:-10,x1:10,z0:-44,z1:-28,y:-.05,grotto:{x0:-14,x1:-10,z0:-39,z1:-33}};
const hts={b1:null,b2:null,placed:0,brake:false,sails:0,fx:0};
const WINDS=[],VANES=[],COGS=[],HLEVERS=[],HBRIDGES=[];
const HM={};
const inCh3=()=>G.region==='ch3';

function heightsMats(){
  const R=REAL.ready,lam=c=>new THREE.MeshLambertMaterial({color:c});
  HM.rock=R?rockMat('isleRock','#a89c88'):lam('#9c8f7c');HM.under=R?rockMat('isleUnder','#8d8170'):lam('#7f7465');
  HM.bed=R?rockMat('pondBed','#7c7a62'):lam('#6f6c55');HM.stone=R?stoneMat('railStone','#e8e0d2'):M.stone;
  TILE.set(HM.rock,4);TILE.set(HM.under,5);TILE.set(HM.bed,3);TILE.set(HM.stone,2.4);
  HM.hedge=new THREE.MeshLambertMaterial({color:'#4f7d3a'});
  HM.sail=new THREE.MeshLambertMaterial({color:'#f3ead6',side:THREE.DoubleSide});
  HM.brass=new THREE.MeshStandardMaterial({color:'#d9a441',roughness:.35,metalness:.6});
  // wind streaks: soft vertical lines that scroll along the wind
  const cv=document.createElement('canvas');cv.width=64;cv.height=256;const c=cv.getContext('2d');c.clearRect(0,0,64,256);
  for(let i=0;i<18;i++){const x=hash2(i,1,5)*64,y=hash2(i,2,5)*256,l=40+hash2(i,3,5)*90,g=c.createLinearGradient(0,y,0,y+l);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,'+(.35+hash2(i,4,5)*.5)+')');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(x,y,1.5+hash2(i,5,5)*2,l);c.fillRect(x,y-256,1.5+hash2(i,5,5)*2,l);}
  HM.streak=new THREE.CanvasTexture(cv);HM.streak.wrapS=HM.streak.wrapT=THREE.RepeatWrapping;
  // clouds: soft lumps for the cloud sea far below
  const cc=document.createElement('canvas');cc.width=cc.height=256;const x=cc.getContext('2d'),im=x.createImageData(256,256);
  for(let j=0;j<256;j++)for(let i=0;i<256;i++){const n=fbm(i/256*4,j/256*4,4,4,71);const a=smooth(.42,.72,n);const k=(j*256+i)*4;im.data[k]=im.data[k+1]=im.data[k+2]=255;im.data[k+3]=Math.round(a*235);}
  x.putImageData(im,0,0);HM.cloud=new THREE.CanvasTexture(cc);HM.cloud.wrapS=HM.cloud.wrapT=THREE.RepeatWrapping;HM.cloud.repeat.set(5,5);
}
// an island floor: grass on top, rock below, a rough cone of rock hanging underneath
const ISLES=[];
function isle(xa,xb,za,zb,y,depth,cone){
  const x0=Math.min(xa,xb),x1=Math.max(xa,xb),z0=Math.min(za,zb),z1=Math.max(za,zb);
  box(x0,x1,y-.4,y,z0,z1,M.ground,{cast:false,fade:false,surface:'grass'});
  box(x0,x1,y-(depth||3),y-.4,z0,z1,HM.rock,{cast:false,fade:false,collide:false});
  if(cone!==false){const r=Math.min(x1-x0,z1-z0)*.5,h=Math.max(6,r*1.4);const m=new THREE.Mesh(REAL.ready?realRockGeo(r*.92,h,r*.92,x0+z0):lowPoly(r*.92,h,r*.92,1,x0|0,.3),HM.under);
    m.rotation.x=Math.PI;m.scale.set((x1-x0)/(2*r),1,(z1-z0)/(2*r));m.position.set((x0+x1)/2,y-(depth||3)-h*(REAL.ready?.55:1)+.3,(z0+z1)/2);ROOT.add(m);} // hangs below, dome down
  ISLES.push({x0,x1,z0,z1,y});
}
function rail(xa,xb,za,zb,y){box(xa,xb,y||0,(y||0)+.6,za,zb,HM.stone,{fade:false,cast:true,surface:'stone'});}
// the height of the ground on an island (for grass and trees)
function heightsH(x,z){let best=-99;for(const s of ISLES)if(x>s.x0&&x<s.x1&&z>s.z0&&z<s.z1&&s.y>best)best=s.y;return best;}

// ---------- wind ----------
function windMat(){const t=HM.streak.clone();t.needsUpdate=true;t.repeat.set(3,1.5);return new THREE.MeshBasicMaterial({map:t,color:'#e9fbff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:true});}
function addUpdraft(id,x,z,r,y0,y1,on){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.15,y1-y0,20,1,true),windMat());m.position.set(x,(y0+y1)/2,z);m.renderOrder=3;ROOT.add(m);
  const base=new THREE.Mesh(new THREE.RingGeometry(r*.4,r*1.1,24),new THREE.MeshBasicMaterial({color:'#dff8ff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  base.rotation.x=-Math.PI/2;base.position.set(x,y0+.04,z);ROOT.add(base);
  const w={id,kind:'up',x,z,r,y0,y1,on,m,base,k:0};WINDS.push(w);return w;
}
function addFlow(id,x0,x1,z,y0,y1,dx,on){
  const r=(y1-y0)/2,L=Math.abs(x1-x0),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,20,1,true),windMat());m.rotation.z=Math.PI/2;m.position.set((x0+x1)/2,(y0+y1)/2,z);m.renderOrder=3;ROOT.add(m);
  const w={id,kind:'flow',x0:Math.min(x0,x1),x1:Math.max(x0,x1),z,r,y0,y1,dx,dz:0,on,m,base:null,k:0};WINDS.push(w);return w;
}
function windAt(b){
  for(const w of WINDS){if(!w.on())continue;
    if(w.kind==='up'){if(Math.hypot(b.pos.x-w.x,b.pos.z-w.z)<w.r&&b.pos.y>w.y0-.6&&b.pos.y<w.y1+.4)return w;}
    else if(b.pos.x>w.x0&&b.pos.x<w.x1&&Math.abs(b.pos.z-w.z)<w.r+.2&&b.pos.y>w.y0-.3&&b.pos.y<w.y1+.3)return w;}
  return null;
}
// the Sprite spreads its wings (holds jump) in the wind and is carried; without wings a rising wind only slows its fall
function rideWind(s,IS,dt){
  const w=windAt(s);s.wind=w?w.id:'';if(!w||s.onGround)return;
  if(!IS.jump){if(w.kind==='up')s.vel.y=Math.max(s.vel.y,-2.4);return;}
  s.gliding=true;
  if(w.kind==='up'){const top=w.y1-.5;s.vel.y=s.pos.y<top?approach(s.vel.y,6.2,32*dt):approach(s.vel.y,0,30*dt);}
  else{s.vel.x=approach(s.vel.x,w.dx*6.5,24*dt);s.vel.z=approach(s.vel.z,(w.z-s.pos.z)*2,10*dt);s.vel.y=approach(s.vel.y,(((w.y0+w.y1)/2)-s.pos.y)*1.5,14*dt);s.thrownT=0;}
}
// the wind from the Wind Gate blows east along the terrace until the first sail that faces it
function windStopX(){let x=1e9;for(const v of VANES)if(v.catch&&v.x<x)x=v.x;return x;}
const vaneLifts=v=>v.catch&&windStopX()===v.x;
const wheelWind=()=>windStopX()>1e8;

// ---------- sails (the Giant turns their capstans) ----------
function addVane(i,x,z,catching){
  const v={i,x,z,catch:catching,t:+catching,col:null,g:null,cap:null,capPos:new V3(x,0,-58.6)};
  const g=new THREE.Group();g.position.set(x,0,z);ROOT.add(g);v.g=g;
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,5.4,10),M.wood);post.position.y=2.7;post.castShadow=true;g.add(post);
  const sail=new THREE.Group();g.add(sail);v.sail=sail;
  const cloth=new THREE.Mesh(new THREE.PlaneGeometry(3,3.8,6,6),HM.sail);const p=cloth.geometry.attributes.position;for(let k=0;k<p.count;k++){const u=p.getX(k);p.setZ(k,.25*Math.cos(u/1.5*Math.PI/2));}cloth.geometry.computeVertexNormals();
  cloth.position.y=2.6;cloth.castShadow=true;sail.add(cloth);
  for(const y of [.7,4.5]){const b=new THREE.Mesh(new THREE.BoxGeometry(3.1,.1,.1),M.wood);b.position.y=y;sail.add(b);}
  box(x-.2,x+.2,0,5.4,z-.2,z+.2,null);
  v.col=box(0,1,.6,4.6,0,1,null,{surface:'wood'});setVaneCol(v);
  // the capstan, south of the sail, with a rope running to it
  const cg=new THREE.Group();cg.position.copy(v.capPos);ROOT.add(cg);
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(.42,.48,.9,12),M.wood);drum.position.y=.45;cg.add(drum);
  for(let k=0;k<4;k++){const bar=new THREE.Mesh(new THREE.BoxGeometry(1.7,.09,.09),M.iron);bar.position.y=.82;bar.rotation.y=k*Math.PI/4;cg.add(bar);}
  v.cap=cg;box(x-.5,x+.5,0,.9,-59.1,-58.1,null,{surface:'wood'});
  VANES.push(v);return v;
}
function setVaneCol(v){const c=v.col;if(v.catch){c.min.set(v.x-.12,.6,v.z-1.5);c.max.set(v.x+.12,4.6,v.z+1.5);}else{c.min.set(v.x-1.5,.6,v.z-.12);c.max.set(v.x+1.5,4.6,v.z+.12);}}
function turnVane(v){v.catch=!v.catch;setVaneCol(v);for(const b of [golem,sprite])if(!(b===sprite&&sprite.held))depenetrate(b,v.col);syncGolemCol();G.vaneN=(G.vaneN||0)+1;}

// ---------- drawbridges ----------
function addDrawbridge(id,x0,x1,z0,z1,y,axis){ // axis 'z': hinged at z1 (the near side), 'x': hinged at x0
  const B={id,open:false,t:0,axis,col:null,piv:new THREE.Group()};
  if(axis==='z'){B.piv.position.set((x0+x1)/2,y,z1);const L=z1-z0;for(let i=0;i<5;i++){const w=(x1-x0)/5;box(x0-(x0+x1)/2+i*w+.02,x0-(x0+x1)/2+(i+1)*w-.02,-.28,0,-L,0,M.wood,{parent:B.piv,collide:false});}
    for(const z of [-L*.2,-L*.5,-L*.8])box(-(x1-x0)/2-.05,(x1-x0)/2+.05,-.34,-.24,z,z+.18,M.iron,{parent:B.piv,collide:false});}
  else{B.piv.position.set(x0,y,(z0+z1)/2);const L=x1-x0;for(let i=0;i<5;i++){const w=(z1-z0)/5;box(0,L,-.28,0,z0-(z0+z1)/2+i*w+.02,z0-(z0+z1)/2+(i+1)*w-.02,M.wood,{parent:B.piv,collide:false});}
    for(const x of [L*.2,L*.5,L*.8])box(x,x+.18,-.34,-.24,-(z1-z0)/2-.05,(z1-z0)/2+.05,M.iron,{parent:B.piv,collide:false});}
  ROOT.add(B.piv);B.col=box(x0,x1,y-.3,y,z0,z1,null,{kind:'bridge',surface:'wood'});B.col.on=false;
  HBRIDGES.push(B);return B;
}
function hlever(x,y,z,id,rot){const l=makeLever(x,z,rot||0,id,y);l.ch3=true;HLEVERS.push(l);return l;}

// ---------- cogs (the chapter's three root stones) ----------
function cogMesh(){const g=new THREE.Group();const disc=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.14,16),HM.brass);disc.rotation.x=Math.PI/2;g.add(disc);
  for(let k=0;k<8;k++){const t=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,.14),HM.brass);const a=k/8*Math.PI*2;t.position.set(Math.cos(a)*.34,Math.sin(a)*.34,0);t.rotation.z=a;g.add(t);}
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.2,10),M.iron);hub.rotation.x=Math.PI/2;g.add(hub);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}
function addCog(i,x,y,z,state,where){const m=cogMesh();ROOT.add(m);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffd86a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.6}));glow.scale.set(1.5,1.5,1);ROOT.add(glow);
  COGS.push({i,pos:new V3(x,y,z),home:new V3(x,y,z),home0:state,state,m,glow,where,vel:new V3(),hw:.25,h:.3,kind:'cog',stepH:.1,onGround:false});}
const cogReach=(g,c)=>dxz(g.pos,c.pos)<1.9&&c.pos.y-g.pos.y>-.9&&c.pos.y-g.pos.y<2.2;

// ================= build =================
function buildHeights(){
  curBuild='ch3';
  const R=beginRegion('ch3',{name:'Chapter 3: The Windmill Heights',short:'Windmill Heights',chapter:3,fog:[80,330],fogReal:[90,420],spawn:HCP,
    hazard:b=>b===sprite&&!sprite.held&&inPond(b.pos.x,b.pos.z)&&b.pos.y<POND.y-.12});
  heightsMats();
  // ---------- the Landing Isle ----------
  isle(-12,12,10,-12,0,4);
  {const g=prop('gate');if(REAL.ready)realifyProp(g);g.position.set(0,-.05,8.5);g.rotation.y=Math.PI;g.scale.setScalar(.82);ROOT.add(g);
    const gm=[];g.traverse(o=>{if(o.isMesh)gm.push(o);});if(gm.length)markFadeGroup(gm);
    for(const s of [-1,1])box(s>0?2.62:-4.3,s>0?4.3:-2.62,0,6.5,7.3,9.7,null,{surface:'stone'});
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(5.2,7.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    veil.position.set(0,3.9,8.9);ROOT.add(veil);hts.veil=veil;
    const lab=labelSprite('The Vale','Walk through together','#1fb3a3');lab.scale.set(4.4,1.4,1);lab.position.set(0,9,8.6);ROOT.add(lab);invis(-5,5,0,12,11,12);}
  rail(-12,-4.3,9.4,10);rail(4.3,12,9.4,10);rail(-12.4,-12,10,-12);rail(12,12.4,10,6);rail(12,12.4,0,-12);rail(-12,-1.8,-11.6,-12);rail(1.8,12,-11.6,-12);
  addWaystone('ch3_landing','Landing Isle',-7,0,5,Math.PI);
  // the first rising wind, and the ledge with the bridge lever
  addUpdraft('tut',7,-4,1.2,0,7.2,()=>true);
  box(8.6,11.8,0,5.5,-6,-10,HM.rock,{surface:'stone'});box(8.56,11.84,5.5,5.62,-5.96,-10.04,M.ground,{collide:false,fade:false});
  hlever(10.6,5.5,-8.6,'b1',Math.PI/2);
  hts.b1=addDrawbridge('b1',-1.6,1.6,-22,-12,0,'z');
  // the cloud nest below the east edge (only wings get there and back)
  box(17.5,21,-6.4,-6,1,5,M.ground,{kind:'nest',fade:false,cast:false,surface:'grass'});box(17.5,21,-8,-6.4,1,5,HM.rock,{collide:false,fade:false});
  {const m=new THREE.Mesh(REAL.ready?realRockGeo(1.8,3,1.8,7):lowPoly(1.8,3,1.8,1,7,.3),HM.under);m.rotation.x=Math.PI;m.position.set(19.25,-8-(REAL.ready?1.65:3)+.2,3);ROOT.add(m);}
  addUpdraft('nest',19.25,3,1.2,-6,5.4,()=>true);

  // ---------- the Wading Isle ----------
  const P=POND;
  isle(-14,14,-22,-28,0,4);isle(-14,14,-44,-50,0,4);
  box(-14,-10,-.4,0,-28,-33,M.ground,{fade:false,cast:false});box(-14,-10,-.4,0,-39,-44,M.ground,{fade:false,cast:false});box(10,14,-.4,0,-28,-44,M.ground,{fade:false,cast:false});
  box(-14,14,-4,-1.6,-28,-44,HM.rock,{collide:false,fade:false,cast:false});box(10,14,-1.6,-.4,-28,-44,HM.rock,{collide:false,fade:false,cast:false});
  box(-14,-10,-1.6,-.4,-28,-33,HM.rock,{collide:false,fade:false,cast:false});box(-14,-10,-1.6,-.4,-39,-44,HM.rock,{collide:false,fade:false,cast:false});
  {const m=new THREE.Mesh(REAL.ready?realRockGeo(13,10,13,3):lowPoly(13,10,13,1,3,.3),HM.under);m.rotation.x=Math.PI;m.scale.set(1.1,1,1.1);m.position.set(0,-4-(REAL.ready?5.5:10)+.3,-36);ROOT.add(m);}
  // the pond: stepped banks down to a bed 1.2 m deep, a pedestal in the middle with the first cog
  for(const [za,zb,y] of [[-28,-29,-.4],[-29,-30,-.8],[-42,-43,-.8],[-43,-44,-.4]])box(P.x0,P.x1,-1.6,y,za,zb,HM.bed,{fade:false,cast:false,surface:'stone'});
  box(P.x0,P.x1,-1.6,-1.2,-30,-42,HM.bed,{fade:false,cast:false,surface:'stone'});
  box(-.6,.6,-1.2,-.6,-36.6,-35.4,HM.stone,{fade:false,surface:'stone'});
  addCog(0,0,-.6,-36,'rest','Pond');
  // hedges keep everyone from walking around the pond; the west hedge hides a grotto behind a waterfall
  const G0=P.grotto;
  box(-14,-10,0,3,-28,-33,HM.hedge,{surface:'grass'});box(-14,-10,0,3,-39,-44,HM.hedge,{surface:'grass'});box(10,14,0,3,-28,-44,HM.hedge,{surface:'grass'});
  box(G0.x0,G0.x1,-1.6,-1.2,G0.z0,G0.z1,HM.bed,{fade:false,cast:false,surface:'stone'});
  box(G0.x0-.6,G0.x0,-1.6,3,G0.z0-.4,G0.z1+.4,HM.rock,{fade:false});box(G0.x0,G0.x1,1.6,3,G0.z0,G0.z1,HM.rock,{fade:true});
  box(G0.x0,G0.x1,-1.6,3,G0.z0-.4,G0.z0,HM.rock,{fade:true});box(G0.x0,G0.x1,-1.6,3,G0.z1,G0.z1+.4,HM.rock,{fade:true});
  {const fallM=new THREE.MeshBasicMaterial({map:(()=>{const t=HM.streak.clone();t.needsUpdate=true;t.repeat.set(4,1);return t;})(),color:'#eaffff',transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide});
    const fall=new THREE.Mesh(new THREE.PlaneGeometry(G0.z1-G0.z0,3),fallM);fall.rotation.y=Math.PI/2;fall.position.set(G0.x1+.05,1.45,(G0.z0+G0.z1)/2);ROOT.add(fall);hts.fall=fallM;}
  {const w=new THREE.Mesh(new THREE.PlaneGeometry(P.x1-G0.x0,P.z1-P.z0),M.water);w.rotation.x=-Math.PI/2;w.position.set((G0.x0+P.x1)/2,P.y,(P.z0+P.z1)/2);ROOT.add(w);}
  for(let i=0;i<10;i++){const x=lerp(P.x0+1,P.x1-1,hash2(i,1,61)),z=lerp(P.z0+1,P.z1-1,hash2(i,2,61));if(Math.abs(x)<2.5)continue;const pad=new THREE.Mesh(new THREE.CircleGeometry(.4+hash2(i,3,61)*.3,10),M.leaf2);pad.rotation.x=-Math.PI/2;pad.position.set(x,P.y+.02,z);ROOT.add(pad);}
  rail(-14.4,-14,-22,-28);rail(14,14.4,-22,-28);rail(-14.4,-14,-44,-50);rail(14,14.4,-44,-50);rail(-14,-2,-22,-22.4);rail(2,14,-22,-22.4);rail(-14,-2,-49.6,-50);rail(2,14,-49.6,-50);
  // a stone bridge on to the terrace
  box(-2,2,-.5,0,-50,-54,HM.stone,{fade:false,cast:false,surface:'stone'});rail(-2.3,-2,-50,-54);rail(2,2.3,-50,-54);

  // ---------- the Sail Terrace ----------
  isle(-16,30,-54,-70,0,4);isle(30,42,-54,-61.6,0,4,false);
  rail(-16,-2,-54,-54.4);rail(2,42,-54,-54.4);rail(42,42.4,-54,-61.6);rail(-16,20,-69.6,-70);
  // the Wind Gate: an old stone arch the wind pours out of
  {const S=HM.stone;box(-16.6,-15.4,0,6,-60.4,-61.4,S,{fade:false});box(-16.6,-15.4,0,6,-64.6,-65.6,S,{fade:false});box(-16.8,-15.2,6,7,-60.2,-65.8,S,{fade:false});
    box(-19,-16.6,0,7,-58,-68,HM.rock,{fade:false});
    const t=HM.streak.clone();t.needsUpdate=true;t.repeat.set(8,1);
    const gust=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,1,18,1,true),new THREE.MeshBasicMaterial({map:t,color:'#f1fdff',transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    gust.rotation.z=Math.PI/2;gust.position.set(0,2.4,-63);gust.renderOrder=3;ROOT.add(gust);hts.gust=gust;}
  addVane(0,2,-63,true);addVane(1,14,-63,false);
  addUpdraft('v0',3.4,-63,1.2,0,8.2,()=>vaneLifts(VANES[0]));addUpdraft('v1',15.4,-63,1.2,0,10.4,()=>vaneLifts(VANES[1]));
  box(2.2,4.6,0,7,-64.6,-67,HM.rock,{surface:'stone'});box(2.16,4.64,7,7.1,-64.56,-67.04,M.ground,{collide:false,fade:false});     // a ledge (seeds)
  box(14.2,16.6,0,9,-64.6,-67,HM.rock,{surface:'stone'});box(14.16,16.64,9,9.1,-64.56,-67.04,M.ground,{collide:false,fade:false});   // the pillar with the second cog
  addCog(1,15.4,9,-65.8,'perched','Sail pillar');

  // ---------- the windmill wheel: four level platforms on the ends of its sails ----------
  {const W=WHEEL;W.g=new THREE.Group();W.g.position.set(W.cx,W.cy,W.cz-.3);ROOT.add(W.g);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.8,16),M.wood);hub.rotation.x=Math.PI/2;W.g.add(hub);
    for(let k=0;k<4;k++){const arm=new THREE.Group();arm.rotation.z=k*Math.PI/2;W.g.add(arm);
      const spar=new THREE.Mesh(new THREE.BoxGeometry(W.R,.3,.3),M.wood);spar.position.x=W.R/2;arm.add(spar);
      const cloth=new THREE.Mesh(new THREE.PlaneGeometry(W.R*.8,1.6),HM.sail);cloth.position.set(W.R*.5,.9,-.05);arm.add(cloth);}
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(1,1.6,W.cy+12,10),HM.stone);tower.position.set(W.cx,(W.cy-12)/2,W.cz-3.2);ROOT.add(tower);
    const axle=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,3,8),M.iron);axle.rotation.x=Math.PI/2;axle.position.set(W.cx,W.cy,W.cz-1.8);ROOT.add(axle);
    for(let k=0;k<4;k++){const g=new THREE.Group();ROOT.add(g);
      const deck=new THREE.Mesh(boxGeo(2.4,.25,2.4,1.6,0,0,0),M.wood);deck.position.y=-.125;deck.castShadow=deck.receiveShadow=true;g.add(deck);
      for(const sx of [-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,2.4),M.iron);rail.position.set(sx*1.15,.7,0);g.add(rail);
        const rod=new THREE.Mesh(new THREE.BoxGeometry(.05,W.hang,.05),M.iron);rod.position.set(sx*.5,W.hang/2,0);g.add(rod);}
      const col=box(0,1,0,1,0,1,null,{kind:'gondola',surface:'wood'});W.gond.push({g,col,k,x:0,y:0});}
    placeGondolas();}

  // ---------- the High Orchard ----------
  isle(20,60,-64.3,-90,13,4);
  rail(20,36.8,-64.3,-64.7);rail(39.2,60,-64.3,-64.7);rail(59.6,60,-64.3,-90);rail(20,60,-89.6,-90);rail(20,20.4,-64.3,-79.6);rail(20,20.4,-82.8,-90);
  addWaystone('ch3_orchard','High Orchard',24,13,-71,Math.PI/2);
  // the far islet, the wind current over the gap, the bridge the Sprite lowers
  isle(2,10,-77,-85,13,4);rail(1.6,2,-77,-85);rail(2,10,-76.6,-77);rail(2,10,-85,-85.4);
  addFlow('gap',19.6,8,-81.2,15,18.2,-1,()=>true);
  hts.b2=addDrawbridge('b2',10,20,-82.4,-80,13,'x');
  hlever(8.8,13,-78.2,'b2',0);
  addCog(2,5,13,-81.2,'rest','Far islet');
  // the Great Windmill: a stone tower, a gearbox at its foot, a balcony with the brake, sails on its east face
  {const S=HM.stone;box(49,55,13,28,-81,-87,S,{surface:'stone'});
    // a little roof on four posts over the rooftop (a lookout)
    const roofM=new THREE.MeshLambertMaterial({color:'#9c5534'});const cap=new THREE.Mesh(new THREE.ConeGeometry(2.6,1.8,4),roofM);cap.position.set(52,31.3,-84);cap.rotation.y=Math.PI/4;ROOT.add(cap);
    for(const [x,z] of [[50,-82],[54,-82],[50,-86],[54,-86]])box(x-.12,x+.12,28.2,30.4,z-.12,z+.12,M.wood,{fade:false,cast:true});
    box(49.6,54.4,28,28.2,-81.6,-86.4,M.wood,{fade:false,surface:'wood'});
    box(50,54,13,14.2,-80.2,-81,M.wood,{surface:'wood'});
    for(let k=0;k<3;k++){const m=cogMesh();m.position.set(51+k,13.75,-80.1);m.visible=false;ROOT.add(m);(hts.sockets=hts.sockets||[]).push(m);}
    box(50.3,53.7,24.7,25,-79.4,-81,M.wood,{surface:'wood'});rail(50.3,53.7,25,-79.4,-79.6);
    hlever(52,25,-80.3,'brake',0);
    const sails=new THREE.Group();sails.position.set(55.4,25.2,-84);ROOT.add(sails);hts.sailsG=sails;
    for(let k=0;k<4;k++){const arm=new THREE.Group();arm.rotation.x=k*Math.PI/2;sails.add(arm);const spar=new THREE.Mesh(new THREE.BoxGeometry(.3,9,.3),M.wood);spar.position.y=4.5;arm.add(spar);
      const cloth=new THREE.Mesh(new THREE.PlaneGeometry(1.8,7),HM.sail);cloth.rotation.y=Math.PI/2;cloth.position.set(.05,5,.9);arm.add(cloth);}}
  addUpdraft('tower',52,-77.9,1.2,13,30.5,()=>hts.placed>=3);
  // ---------- the cloud sea far below ----------
  {const m=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshBasicMaterial({map:HM.cloud,transparent:true,opacity:.95,depthWrite:false,color:'#ffffff'}));m.rotation.x=-Math.PI/2;m.position.set(20,-26,-40);m.renderOrder=-1;ROOT.add(m);hts.clouds=m;
    const under=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshBasicMaterial({color:'#dbe8f0'}));under.rotation.x=-Math.PI/2;under.position.set(20,-34,-40);ROOT.add(under);}

  // ---------- collectibles ----------
  const S=[[-4,0,2],[6,0,4],[-8,0,-6],[3,0,-9],[10,5.5,-6.8],
    [18.3,-6,1.8],[20.2,-6,1.8],[19.2,-6,4.4],
    [-6,0,-25],[6,0,-25],[0,-1.2,-32],[4,-1.2,-39],[-6,0,-47],[6,0,-47],
    [-12,-1.2,-34.4],[-12,-1.2,-37.6],
    [-10,0,-58],[-6,0,-68],[8,0,-56],[22,0,-57],[26,0,-68],[2.8,7,-65.2],[4,7,-65.2],[3.4,7,-66.4],
    [34,0,-56],[40,0,-56],
    [26,13,-74],[32,13,-86],[40,13,-70],[44,13,-80],[58,13,-68],[58,13,-88],[36,13,-78],[48,13,-72],
    [3.5,13,-78.5],[3.5,13,-83.8],[8,13,-84],
    [51.2,25,-79.8],[52.8,25,-79.8],[52,28.2,-85.6]];
  S.forEach(([x,y,z],i)=>addSeed('c3s'+i,x,y,z));
  addPetal('m9',18.2,-6,3.8);addPetal('m10',-12.8,-1.2,-36);addPetal('m11',52,28.2,-84);
  // orchard trees and grass on the islands (realistic look only)
  if(REAL.ready){
    ROOT.traverse(o=>{if(o.isMesh&&o.material===M.ground&&!o.geometry.attributes.color){const n=o.geometry.attributes.position.count;o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));}});
    // small orchard trees (like the Sunken Garden's orchard): big canopies over the paths cost a lot to draw
    const trees=[[-9,-8],[-9,7],[9,6],[-11,-25],[11,-47],[-13,-57],[-13,-68],[24,-88],[30,-87],[42,-88],[58,-66],[58,-88],[26,-76],[36,-84],[44,-70]].map(([x,z],i)=>[x,z,.17+hash2(i,4,9)*.04]);
    buildRealForest(trees,{h:(x,z)=>Math.max(0,heightsH(x,z))});
    for(const [x,z,sc] of trees){const y=heightsH(x,z),r=1.6*sc;box(x-r,x+r,y,y+4,z-r,z+r,null,{surface:'wood'});}
    GRASS_CH3=newGrassField(heightsGrass,(x,z)=>heightsH(x,z),()=>1);buildGrass(GRASS_CH3);}
  hts.beacon=makeBeacon();
  endRegion(R);
  buildSeedInstances('ch3');
}
let GRASS_CH3=null;
function inPond(x,z){const P=POND,G0=P.grotto;return (x>P.x0&&x<P.x1&&z>P.z0&&z<P.z1)||(x>G0.x0&&x<G0.x1&&z>G0.z0&&z<G0.z1);}
function heightsGrass(x,z){const h=heightsH(x,z);if(h<-50)return 0;if(inPond(x,z))return 0;
  if(Math.abs(x)<5&&z>4&&z<11)return 0;if(h>12&&x>48&&x<56&&z<-78&&z>-88)return 0;
  for(const v of VANES)if(Math.hypot(x-v.x,z-v.z)<2||Math.hypot(x-v.capPos.x,z-v.capPos.z)<1.2)return 0;
  return h>12?.6:.75;}

// ================= state =================
function placeGondolas(){const W=WHEEL;for(const q of W.gond){const a=W.a+q.k*Math.PI/2,x=W.cx+W.R*Math.cos(a),y=W.cy+W.R*Math.sin(a)-W.hang;q.x=x;q.y=y;
  q.col.min.set(x-1.2,y-.25,W.cz-1.2);q.col.max.set(x+1.2,y,W.cz+1.2);}}
function resetHeights(){
  const done=!!PROG.ch3.done;
  G.time=0;G.falls=0;G.throws=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;
  for(const B of HBRIDGES){B.open=done;B.t=+done;B.col.on=done;}
  VANES[0].catch=!done;VANES[1].catch=false;for(const v of VANES){v.t=+v.catch;setVaneCol(v);}
  WHEEL.a=-Math.PI/2;WHEEL.w=0;placeGondolas();
  for(const c of COGS){c.state=done?'placed':c.home0;c.pos.copy(c.home);c.vel.set(0,0,0);}
  hts.placed=done?3:0;hts.brake=done;hts.sails=+done;
  for(const l of HLEVERS){l.pulled=l.id==='b1'?hts.b1.open:l.id==='b2'?hts.b2.open:hts.brake;l.t=+l.pulled;}
  golem.runes=0;golem.holding=false;golem.charging=false;golem.pound=false;sprite.held=false;
  placeAt(golem,HCP.g);placeAt(sprite,HCP.s);golem.yaw=sprite.yaw=Math.PI;hintsShown.clear();camSnap=true;
}
function heightsDone(){return !!PROG.ch3.done;}
const onPedestalCog=()=>COGS[0];
// ---- the Giant: take a cog (even with the Sprite on its head), set the cogs, turn a capstan ----
function heightsCogTarget(){const g=golem;for(const c of COGS)if((c.state==='rest'||c.state==='free')&&cogReach(g,c))return c;return null;}
function golemHeightsAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,HT.gear)<3&&Math.abs(g.pos.y-13)<1){for(const c of COGS)if(c.state==='carried'){c.state='placed';hts.placed++;}g.runes=0;return true;}
  const c=heightsCogTarget();if(c){c.state='carried';g.runes++;G.pick++;return true;}
  for(const v of VANES)if(dxz(g.pos,v.capPos)<2&&g.pos.y<1){turnVane(v);return true;}
  return false;
}
function pullHeightsLever(l){l.pulled=true;if(l.id==='b1')hts.b1.open=true;else if(l.id==='b2')hts.b2.open=true;
  else if(l.id==='brake'&&hts.placed>=3&&!G.ending&&!heightsDone()){hts.brake=true;G.ending=true;G.endT=0;chapterComplete(3);}}
// ---- per step: before the characters move (the wheel carries its riders) ----
function stepHeightsA(dt){
  const W=WHEEL,riders=[golem,sprite].filter(b=>!(b===sprite&&sprite.held)&&b.onGround&&b.ground&&b.ground.kind==='gondola');
  const before=riders.map(b=>{const q=W.gond.find(q=>q.col===b.ground);return [b,q,q.x,q.y];});
  W.w=approach(W.w,wheelWind()?.24:0,dt*.12);W.a+=W.w*dt;placeGondolas();
  for(const [b,q,x,y] of before){b.pos.x+=q.x-x;b.pos.y+=q.y-y;if(b===golem)syncGolemCol();}
  if(W.w>.01)for(const q of W.gond)for(const b of [golem,sprite]){if(b===sprite&&sprite.held)continue;if(b.ground!==q.col&&ov(b,q.col)){depenetrate(b,q.col);if(b===golem)syncGolemCol();}}
}
// ---- per step: after they move ----
function stepHeightsB(dt){
  for(const B of HBRIDGES){B.t=approach(B.t,B.open?1:0,dt/2.4);const on=B.t>=.97;if(on&&!B.col.on)liftOnto(B.col);B.col.on=on;}
  for(const v of VANES)v.t=approach(v.t,v.catch?1:0,dt/.6);
  for(const l of HLEVERS)l.t=approach(l.t,l.pulled?1:0,dt/.35);
  for(const c of COGS){if(c.state!=='free')continue;c.vel.y-=GRAV*dt;const dr=Math.exp(-(c.onGround?7:.4)*dt);c.vel.x*=dr;c.vel.z*=dr;moveBody(c,dt,listFor(c).filter(k=>k.kind!=='golem'));
    if(c.pos.y<-15){c.state=c.home0;c.pos.copy(c.home);c.vel.set(0,0,0);}}
  hts.sails=approach(hts.sails,hts.brake||heightsDone()?1:0,dt/3);
}

// ================= visuals =================
function updateHeightsVis(dt,t){
  const rf=PROG.settings.reduceFlash;
  for(const w of WINDS){const on=w.on();w.k=approach(w.k,on?1:0,dt*1.5);w.m.visible=w.k>.01;w.m.material.opacity=w.k*(rf?.16:.26);
    w.m.material.map.offset.y-=dt*(w.kind==='up'?.9:1.2)*(w.kind==='flow'?w.dx:1);if(w.base){w.base.material.opacity=w.k*.35;w.base.visible=w.k>.01;}
    if(on&&!rf&&Math.random()<dt*(w.kind==='up'?7:6)){if(w.kind==='up'){const a=Math.random()*6.28,r=Math.random()*w.r;emit(w.x+Math.cos(a)*r,w.y0+.3,w.z+Math.sin(a)*r,0,4+Math.random()*2,0,.95,1,.9,.07,(w.y1-w.y0)/5.5,0,.1);}
      else{const y=lerp(w.y0,w.y1,Math.random());emit(w.dx>0?w.x0:w.x1,y,w.z+(Math.random()-.5)*w.r*1.6,w.dx*6,0,0,.95,1,.9,.07,(w.x1-w.x0)/6,0,.1);}}}
  // the gust from the Wind Gate stops at the first sail facing it
  const stop=Math.min(windStopX()-.3,46),gx0=-15.5,len=stop-gx0;hts.gust.scale.set(1,len,1);hts.gust.position.x=gx0+len/2;hts.gust.material.map.offset.y+=dt*1.4;
  if(!rf&&Math.random()<dt*10)emit(gx0+Math.random()*len*.3,.8+Math.random()*3,-63+(Math.random()-.5)*2.6,7,0,0,.95,1,.92,.07,len/7,0,.05);
  for(const v of VANES){v.sail.rotation.y=lerp(0,Math.PI/2,smooth(0,1,v.t));v.cap.rotation.y=v.t*Math.PI*1.5;}
  const W=WHEEL;W.g.rotation.z=W.a;for(const q of W.gond)q.g.position.set(q.x,q.y,W.cz);
  for(const B of HBRIDGES){const k=1.45*(1-B.t);if(B.axis==='z')B.piv.rotation.x=k;else B.piv.rotation.z=k;}
  for(const l of HLEVERS)l.handle.rotation.z=lerp(-.7,.7,l.t);
  for(const c of COGS){const vis=c.state==='rest'||c.state==='perched'||c.state==='free';c.m.visible=vis;c.glow.visible=vis&&c.state!=='free';
    if(vis){const y=c.pos.y+(c.state==='free'?.3:.5+Math.sin(t*1.8+c.i)*.07);c.m.position.set(c.pos.x,y,c.pos.z);c.m.rotation.y=t*.9+c.i;c.glow.position.set(c.pos.x,y,c.pos.z);c.glow.material.opacity=rf?.5:.45+.2*Math.sin(t*2.4);}}
  (hts.sockets||[]).forEach((m,i)=>{m.visible=i<hts.placed;m.rotation.z=hts.sails*t*2*(i%2?-1:1);});
  hts.sailsG.rotation.x-=dt*hts.sails*.8;
  hts.clouds.material.map.offset.x+=dt*.004;hts.fall.map.offset.y+=dt*1.6;hts.veil.material.opacity=rf?.24:.2+.1*Math.sin(t*1.6);
  if(G.ending&&Math.random()<dt*30){const a=Math.random()*6.28;emit(52+Math.cos(a)*4,24+Math.random()*4,-84+Math.sin(a)*4,Math.cos(a)*2,1+Math.random(),Math.sin(a)*2,1,.95,.7,.08,1.6,.3,.2);}
}

// ================= the Vale: pinwheels spin on the hills once the third root wakes =================
function buildValePinwheels(){
  VALE.pins=[];const spots=[[-40,38],[40,40],[-56,-10],[58,-14],[-24,-62],[26,-58],[-70,60],[70,60]];
  const mat=new THREE.MeshLambertMaterial({color:'#f2873a',side:THREE.DoubleSide}),mat2=new THREE.MeshLambertMaterial({color:'#fff3d6',side:THREE.DoubleSide});
  const postG=new THREE.CylinderGeometry(.06,.08,2.4,6);postG.translate(0,1.2,0);const posts=new THREE.InstancedMesh(postG,M.wood,spots.length);ROOT.add(posts);
  const m4=new THREE.Matrix4();
  spots.forEach(([x,z],i)=>{const y=valeH(x,z);m4.makeTranslation(x,y,z);posts.setMatrixAt(i,m4);
    const g=new THREE.Group();g.position.set(x,y+2.4,z);g.rotation.y=Math.atan2(-x,-z);ROOT.add(g);
    for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.PlaneGeometry(.7,.28),k%2?mat:mat2);b.position.set(Math.cos(k*Math.PI/2)*.36,Math.sin(k*Math.PI/2)*.36,0);b.rotation.z=k*Math.PI/2+.4;g.add(b);}
    g.visible=false;VALE.pins.push(g);});
  posts.visible=false;VALE.pinPosts=posts;
}
function updateValePinwheels(dt){if(!VALE.pins)return;const on=PROG.roots>=3&&!(G.scene==='root3'&&G.line<1);VALE.pinPosts.visible=on;
  VALE.pins.forEach((g,i)=>{g.visible=on;g.rotation.z+=dt*(2.5+i*.3);});}
