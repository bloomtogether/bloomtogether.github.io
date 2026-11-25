// ================= Chapter 2: The Lantern Mines =================
// Dark caverns under the eastern hills, lit only by lanterns and by the Sprite's light pulse (interact with nothing
// nearby). The route, south to north:
//  Mine Mouth (a crystal bridge over the first chasm) -> Cart Yard (the Sprite flips the track switch up on the
//  scaffold, the Giant pushes the cart and it smashes the barricade) -> Crystal Gallery (bridges hold only while
//  lit; a throw to the far island; lantern stone 1) -> pulley shaft (the Giant winds the Sprite up, she frees the
//  counterweight and winds the Giant up) -> High Drift (lantern stone 2 sets off a boulder: hide in the hollow) ->
//  Great Lantern hall (a hidden crystal path across a dark pit to stone 3; set the stones, lob the Sprite to the
//  top, pulse). Optional: the lamp room (crawl hole), the far crystal island (a throw), the crystal cellar (ground pound).
const MINE={pulseR:6,tileR:3.6,litT:8,liftH:6,driftY:6,boulderR:2.7,driftZ:-62.5};
const MCP={g:[-1.5,0,-1.5],s:[1.5,0,-1.5]};
const GL={x:-17,z:-70,top:4.0,x0:-18.2,x1:-15.8,z0:-71.2,z1:-68.8,sock:new V3(-17,0,-67)}; // the Great Lantern
const WINCH_B=new V3(61.5,0,-62.5),WINCH_T=new V3(50.2,6,-65.5);
const mine={pulseCD:0,fx:{t:9,x:0,y:0,z:0},lan:0,lift:null,cart:null,sw:{b:false,t:0},bar:{broken:false,col:null,g:null},
  boulder:{st:'idle',x:51.5,y:22,t:0,v:0,vy:0,rot:0,col:null,m:null},wall:{broken:false,col:null,g:null},door:{open:false,t:0,col:null,g:null},
  crack:{broken:false,col:null,mesh:null},placed:0,pool:[],glight:null,gcrystal:null,sockets:[],poolT:0,winchA:[0,0]};
const LANTERNS=[],CRYST=[],MLEVERS=[],LSTONES=[];
const MM={};
let SPRITE_LIGHT=null;
const inCh2=()=>G.region==='ch2';

function mineMats(){
  const R=REAL.ready,lam=c=>new THREE.MeshLambertMaterial({color:c});
  MM.rock=R?rockMat('mineRock','#8c8274'):lam('#6e665c');
  MM.floor=R?rockMat('mineFloor','#8a8070'):lam('#5f574e');
  MM.deep=R?rockMat('mineDeep','#5c544a'):lam('#433d37');
  TILE.set(MM.rock,4.5);TILE.set(MM.floor,3.2);TILE.set(MM.deep,5);
  MM.crystal=new THREE.MeshStandardMaterial({color:'#c9f6ff',emissive:'#58d6ff',emissiveIntensity:0,roughness:.15,metalness:0,transparent:true,opacity:.1,depthWrite:false});
  MM.edge=new THREE.LineBasicMaterial({color:'#8ff0ff',transparent:true,opacity:.3,depthWrite:false});
  MM.amber=new THREE.MeshStandardMaterial({color:'#ffd58a',emissive:'#ffad3d',emissiveIntensity:1.5,roughness:.3});
  MM.lanOff=new THREE.MeshStandardMaterial({color:'#6b747c',emissive:'#1a2a33',emissiveIntensity:.4,roughness:.35});
  MM.quartz=new THREE.MeshStandardMaterial({color:'#c4eef7',emissive:'#4fb4cf',emissiveIntensity:.5,roughness:.25});
}
// a floor with its top at y, plus a rock body below it (the visible side of a chasm)
function mfloor(xa,xb,za,zb,y,deep){y=y||0;box(xa,xb,y-.5,y,za,zb,MM.floor,{cast:false,fade:false,surface:'stone'});
  if(deep!==0)box(xa,xb,y-(deep||9),y-.5,za,zb,MM.deep,{cast:false,fade:false,collide:false});}
function mrock(xa,xb,y0,y1,za,zb,opt){return box(xa,xb,y0,y1,za,zb,MM.rock,Object.assign({cast:false,surface:'stone'},opt||{}));}

// ---------- rails, lanterns, crystals ----------
const _sleepers=[];
function railLine(pts){
  for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw);
    for(const o of [-.42,.42]){const m=new THREE.Mesh(new THREE.BoxGeometry(.07,.09,L+.04),M.iron);m.position.set((ax+bx)/2+nx*o,.08,(az+bz)/2+nz*o);m.rotation.y=yaw;ROOT.add(m);}
    for(let d=.3;d<L;d+=.72)_sleepers.push([ax+dx*d/L,az+dz*d/L,yaw]);}
}
function buildSleepers(){
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1.15,.06,.2),M.wood,_sleepers.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new V3(),sc=new V3(1,1,1);
  _sleepers.forEach(([x,z,y],i)=>{p.set(x,.03,z);q.setFromAxisAngle(_yAx,y);m4.compose(p,q,sc);im.setMatrixAt(i,m4);});im.receiveShadow=true;ROOT.add(im);_sleepers.length=0;
}
function addLantern(x,y,z){
  const i=LANTERNS.length,g=new THREE.Group();g.position.set(x,y,z);ROOT.add(g);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,2.3,8),M.wood);post.position.y=1.15;g.add(post);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.26,.22,4),M.iron);cap.position.y=2.62;cap.rotation.y=Math.PI/4;g.add(cap);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4,bar=new THREE.Mesh(new THREE.BoxGeometry(.03,.42,.03),M.iron);bar.position.set(Math.cos(a)*.17,2.32,Math.sin(a)*.17);g.add(bar);}
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.05,8),M.iron);base.position.y=2.1;g.add(base);
  const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.13),MM.lanOff);cr.scale.y=1.5;cr.position.y=2.32;g.add(cr);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffc46a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));glow.scale.set(2.2,2.2,1);glow.position.y=2.32;g.add(glow);
  box(x-.16,x+.16,y,y+2.3,z-.16,z+.16,null);
  LANTERNS.push({i,pos:new V3(x,y+2.32,z),g,cr,glow,k:0});
}
const lanLit=l=>(mine.lan>>l.i)&1;
// a crystal bridge or hidden tile: solid only while lit. anchors are the glowing posts a pulse must reach
// (tiles have none: a pulse near the tile itself lights it)
function addCrystal(kind,xa,xb,za,zb,y,anchors,r){
  const th=.28,col=box(xa,xb,y-th,y,za,zb,null,{kind:'bridge',surface:'stone'});col.on=false;
  const mat=MM.crystal.clone(),geo=new THREE.BoxGeometry(Math.abs(xb-xa),th,Math.abs(zb-za));
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set((xa+xb)/2,y-th/2,(za+zb)/2);mesh.renderOrder=2;ROOT.add(mesh);
  const em=new THREE.LineSegments(new THREE.EdgesGeometry(geo),MM.edge.clone());em.position.copy(mesh.position);em.renderOrder=2;ROOT.add(em);
  const pm=MM.crystal.clone();pm.transparent=false;pm.opacity=1;pm.depthWrite=true;pm.emissiveIntensity=.2;
  for(const [ax,az] of anchors||[]){const g=new THREE.Group();g.position.set(ax,y,az);ROOT.add(g);
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.9,6),M.iron);p.position.y=.45;g.add(p);
    for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(.1,.55-.12*k,5),pm);c.position.set((k-1)*.1,1.12-k*.06,(k%2)*.07);c.rotation.z=(k-1)*.35;g.add(c);}
    box(ax-.15,ax+.15,y,y+.9,az-.15,az+.15,null);}
  const anc=(anchors&&anchors.length?anchors:[[(xa+xb)/2,(za+zb)/2]]).map(([ax,az])=>new V3(ax,y,az));
  CRYST.push({kind,col,mesh,mat,em,pm,anchors:anc,r:r||MINE.pulseR,t:0,y});
}

// ---------- the mine cart and its tracks ----------
function polyline(pts){const segs=[];let L=0;for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],len=Math.hypot(bx-ax,bz-az);segs.push({ax,az,dx:(bx-ax)/len,dz:(bz-az)/len,len,s0:L});L+=len;}return {segs,len:L};}
function polyAt(P,s,o){s=clamp(s,0,P.len);let sg=P.segs[P.segs.length-1];for(const q of P.segs)if(s<=q.s0+q.len){sg=q;break;}const d=s-sg.s0;o.x=sg.ax+sg.dx*d;o.z=sg.az+sg.dz*d;o.tx=sg.dx;o.tz=sg.dz;return o;}
const CART_T0=[[4,-23],[4,-36]],CART_A=[[4,-36],[4,-44.2]],CART_B=[[4,-36],[4.4,-37.8],[5.6,-39.2],[7.3,-39.9],[9,-40],[37,-40]];
function cartMesh(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.15,.62,1.45),M.wood);body.position.y=.62;body.castShadow=true;g.add(body);
  for(const y of [.36,.88])for(const z of [-.74,.74]){const b=new THREE.Mesh(new THREE.BoxGeometry(1.2,.08,.05),M.iron);b.position.set(0,y,z);g.add(b);}
  const ore=new THREE.Mesh(REAL.ready?realRockGeo(.5,.28,.62,3):lowPoly(.5,.28,.62,0,7,.4),MM.deep);ore.position.y=.98;g.add(ore);
  const wheels=[];for(const x of [-.5,.5])for(const z of [-.45,.45]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.08,12),M.iron);w.rotation.z=Math.PI/2;w.position.set(x,.2,z);g.add(w);wheels.push(w);}
  g.userData.wheels=wheels;return g;
}
function buildCart(){
  const C={paths:[polyline(CART_T0.concat(CART_A.slice(1))),polyline(CART_T0.concat(CART_B.slice(1)))],sJ:13,s:0,v:0,br:-1,p:{x:4,z:-23,tx:0,tz:-1},moved:0,roll:0};
  C.aEnd=C.paths[0].len-.75;C.sEnd=C.paths[1].len-.75;
  const o={};C.sBar=C.sEnd;for(let s=C.sJ;s<C.sEnd;s+=.05){polyAt(C.paths[1],s,o);if(o.x+.66>=31){C.sBar=s;break;}}
  C.g=cartMesh();ROOT.add(C.g);
  C.col=box(0,1,0,1.1,0,1,null,{kind:'cart',surface:'wood'});
  mine.cart=C;syncCart();
  railLine(CART_T0);railLine(CART_A);railLine(CART_B);
  // bumpers at both track ends, a buffer at the start
  for(const [x,z,ax] of [[4,-44.6,'z'],[37.4,-40,'x']]){const w=ax==='z'?[1.2,.4]:[.4,1.2];box(x-w[0]/2,x+w[0]/2,0,.7,z-w[1]/2,z+w[1]/2,M.wood,{fade:false});}
  // the switch: a sign at the junction shows which way the points are set
  const sg=new THREE.Group();sg.position.set(2.3,0,-35.2);ROOT.add(sg);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.8,6),M.wood);post.position.y=.9;sg.add(post);
  const arrowC=document.createElement('canvas');arrowC.width=128;arrowC.height=64;const ac=arrowC.getContext('2d');ac.fillStyle='#f2c14e';ac.strokeStyle='#5a3c22';ac.lineWidth=5;
  ac.beginPath();ac.moveTo(8,22);ac.lineTo(80,22);ac.lineTo(80,6);ac.lineTo(120,32);ac.lineTo(80,58);ac.lineTo(80,42);ac.lineTo(8,42);ac.closePath();ac.fill();ac.stroke();
  const at=new THREE.CanvasTexture(arrowC);at.encoding=THREE.sRGBEncoding;
  const arrow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.55),new THREE.MeshBasicMaterial({map:at,transparent:true,side:THREE.DoubleSide,color:'#bba98c'}));arrow.position.y=1.85;sg.add(arrow);
  mine.sw.arrow=arrow;box(2.2,2.4,0,1.8,-35.1,-35.3,null);
  // points: two short rail blades at the junction that swing between the branches
  mine.sw.blades=[];for(const o of [-.42,.42]){const b=new THREE.Mesh(new THREE.BoxGeometry(.08,.1,2.2),M.gold);b.position.set(4+o,.09,-37);ROOT.add(b);mine.sw.blades.push(b);}
}
function cartPath(){const C=mine.cart;return C.paths[C.br===1?1:0];}
function syncCart(){const C=mine.cart;polyAt(cartPath(),C.s,C.p);const h=.66;C.col.min.set(C.p.x-h,0,C.p.z-h);C.col.max.set(C.p.x+h,1.1,C.p.z+h);}
const cartRolling=()=>{const C=mine.cart;return C.br===1&&C.s>C.sJ+.5&&C.s<C.sEnd;};
// the Giant walking into the cart pushes it along the rails (called from moveBody)
function pushCart(ax,d){
  const C=mine.cart;if(!C||(C.br===1&&C.s>C.sJ+.5))return false;
  const t=ax==='x'?C.p.tx:C.p.tz;if(Math.abs(t)<.45)return false;
  let ns=C.s+t*d;
  if(ns>C.sJ&&C.br<0)C.br=mine.sw.b?1:0;
  ns=clamp(ns,0,C.br===1?C.sEnd:C.br===0?C.aEnd:C.sJ+.3);
  if(ns<C.sJ)C.br=-1;
  if(Math.abs(ns-C.s)<1e-5)return false;
  C.roll+=ns-C.s;C.s=ns;syncCart();C.moved=.25;return true;
}

// ---------- the pulley lift ----------
function buildLift(){
  const L={t:0,cw:false,x0:53.1,x1:55.7,z0:-63.9,z1:-61.3,col:null,g:null,moving:false,wheelA:0};
  L.col=box(L.x0,L.x1,-.25,0,L.z0,L.z1,null,{kind:'lift',surface:'wood'});
  const g=new THREE.Group();ROOT.add(g);L.g=g;const cx=(L.x0+L.x1)/2,cz=(L.z0+L.z1)/2;
  const deck=new THREE.Mesh(boxGeo(2.6,.22,2.6,1.6,0,0,0),M.wood);deck.position.set(cx,-.11,cz);deck.castShadow=deck.receiveShadow=true;g.add(deck);
  for(const sx of [-1,1])for(const sz of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(.08,2.7,.08),M.iron);b.position.set(cx+sx*1.25,1.35,cz+sz*1.25);g.add(b);}
  for(const sz of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(2.6,.08,.08),M.iron);b.position.set(cx,2.7,cz+sz*1.25);g.add(b);const r=new THREE.Mesh(new THREE.BoxGeometry(2.6,.06,.06),M.iron);r.position.set(cx,.9,cz+sz*1.25);g.add(r);}
  const yoke=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,2.6),M.iron);yoke.position.set(cx,2.7,cz);g.add(yoke);
  L.rope=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,6),M.wood);ROOT.add(L.rope);
  L.rope2=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,6),M.wood);ROOT.add(L.rope2);
  L.wheel=new THREE.Group();L.wheel.position.set(56.4,12,cz);ROOT.add(L.wheel);
  const tor=new THREE.Mesh(new THREE.TorusGeometry(2,.12,8,28),M.iron);L.wheel.add(tor);for(let k=0;k<4;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.1,4,.1),M.iron);sp.rotation.z=k*Math.PI/4;L.wheel.add(sp);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.4,.4,10),M.wood);beam.position.set(56.4,12,-62.6);ROOT.add(beam);
  // the counterweight hangs on the far side of the wheel, jammed on a hook until the Sprite frees it
  L.cwM=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.3,1.1),MM.deep);L.cwM.position.set(58.4,9.4,cz);ROOT.add(L.cwM);
  const hook=new THREE.Mesh(new THREE.TorusGeometry(.2,.05,6,12,Math.PI*1.4),M.gold);hook.position.set(58.4,10.3,cz);ROOT.add(hook);L.hook=hook;
  // the Giant's winch at the bottom, the Sprite's small winch up top
  const mkWinch=(p,r,col)=>{const w=new THREE.Group();w.position.copy(p);ROOT.add(w);
    const stand=new THREE.Mesh(new THREE.BoxGeometry(.3,r*1.6,.3),M.wood);stand.position.y=r*.8;w.add(stand);
    const wh=new THREE.Group();wh.position.y=r*1.6;wh.rotation.y=Math.PI/2;w.add(wh);
    const t=new THREE.Mesh(new THREE.TorusGeometry(r,.05,6,20),col);wh.add(t);for(let k=0;k<3;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.05,r*2,.05),col);sp.rotation.z=k*Math.PI/3;wh.add(sp);}
    box(p.x-.25,p.x+.25,p.y,p.y+r*1.6,p.z-.25,p.z+.25,null);return wh;};
  L.wB=mkWinch(WINCH_B,.55,M.gold);L.wT=mkWinch(WINCH_T,.3,M.gold);
  mine.lift=L;
}

// ---------- lantern stones (the chapter's three root stones) ----------
function addLStone(i,x,y,z,where){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),MM.amber);m.scale.set(.85,1.25,.85);m.castShadow=true;ROOT.add(m);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffbf5e',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.8}));glow.scale.set(1.7,1.7,1);ROOT.add(glow);
  LSTONES.push({i,pos:new V3(x,y,z),home:new V3(x,y,z),state:'rest',m,glow,where});
}
const stoneReach=(g,st)=>dxz(g.pos,st.pos)<1.9&&st.pos.y-g.pos.y>-.7&&st.pos.y-g.pos.y<2.2;

// ---------- small decorations ----------
function crate(x,z,s,y){y=y||0;const c=box(x-s/2,x+s/2,y,y+s,z-s/2,z+s/2,M.wood,{fade:false});if(c.mesh)c.mesh.rotation.y=0;return c;}
function timberPosts(list){for(const [x,z,h,y0] of list){const y=y0||0;box(x-.12,x+.12,y,y+h,z-.12,z+.12,M.wood,{fade:false,cast:false});}}
function beam(xa,xb,za,zb,y){box(xa,xb,y-.26,y,za,zb,M.wood,{collide:false,fade:true,cast:false});}
function rockPile(list){
  const geos=[0,1,2].map(k=>REAL.ready?realRockGeo(1,.62,.85,k*2.7+1):lowPoly(1,.62,.85,0,k*11+3,.35));
  const by=[[],[],[]];list.forEach((r,i)=>by[i%3].push(r));
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new V3(),sc=new V3();
  by.forEach((arr,k)=>{if(!arr.length)return;const im=new THREE.InstancedMesh(geos[k],MM.deep,arr.length);
    arr.forEach(([x,y,z,s],i)=>{p.set(x,y+s*.25,z);q.setFromAxisAngle(_yAx,x*1.7+z);sc.set(s,s,s);m4.compose(p,q,sc);im.setMatrixAt(i,m4);});im.receiveShadow=true;ROOT.add(im);});
}
function quartz(list){
  const n=list.length*3,im=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,1,5),MM.quartz,n),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new V3(),sc=new V3();
  let i=0;for(const [x,y,z,s] of list)for(let k=0;k<3;k++){const h=(.45+hash2(i,k,7)*.5)*s;p.set(x+(hash2(i,1,8)-.5)*.5*s,y+h*.42,z+(hash2(i,2,8)-.5)*.5*s);e.set((hash2(i,3,8)-.5)*.8,hash2(i,4,8)*3,(hash2(i,5,8)-.5)*.8);q.setFromEuler(e);sc.set(s,h,s);m4.compose(p,q,sc);im.setMatrixAt(i++,m4);}
  ROOT.add(im);
}
function mist(xa,xb,za,zb,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(xb-xa),Math.abs(zb-za)),new THREE.MeshBasicMaterial({color:'#0d1622',transparent:true,opacity:.72,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set((xa+xb)/2,y,(za+zb)/2);ROOT.add(m);}
function crackDecal(w,h){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.strokeStyle='rgba(20,14,10,.9)';c.lineCap='round';
  const br=(x,y,a,l,lw,d)=>{if(d>4||l<8)return;c.lineWidth=lw;c.beginPath();c.moveTo(x,y);const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;c.lineTo(x2,y2);c.stroke();br(x2,y2,a+(hash2(d,l|0,3)-.5)*1.3,l*.72,lw*.7,d+1);if(hash2(d,l|0,9)>.4)br(x2,y2,a+(hash2(d,l|0,5)-.3)*1.8,l*.5,lw*.6,d+1);};
  for(let k=0;k<6;k++)br(128,128,k/6*6.28+.3,60,9,0);
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));}
function minersMural(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=230;const c=cv.getContext('2d');
  c.fillStyle='#5b5046';c.fillRect(0,0,512,230);c.globalAlpha=.9;
  c.strokeStyle='#8a7a62';c.lineWidth=10;c.beginPath();c.moveTo(0,190);c.bezierCurveTo(150,150,330,210,512,160);c.stroke(); // a tunnel
  c.fillStyle='#a48c6e';c.beginPath();c.ellipse(170,140,46,56,0,0,7);c.fill();c.beginPath();c.arc(170,72,24,0,7);c.fill(); // the Giant
  c.strokeStyle='#c9b48e';c.lineWidth=6;c.beginPath();c.moveTo(205,118);c.lineTo(250,84);c.stroke(); // digging
  const g=c.createRadialGradient(300,90,0,300,90,46);g.addColorStop(0,'rgba(255,240,190,.95)');g.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=g;c.beginPath();c.arc(300,90,46,0,7);c.fill();
  c.fillStyle='#fff6dc';c.beginPath();c.arc(300,90,8,0,7);c.fill();
  c.strokeStyle='#d9b04a';c.lineWidth=4;c.beginPath();c.moveTo(512,175);c.bezierCurveTo(430,190,380,150,330,170);c.stroke(); // a root following
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t;
}

// ================= build =================
function buildMines(){
  curBuild='ch2';
  const R=beginRegion('ch2',{name:'Chapter 2: The Lantern Mines',short:'Lantern Mines',chapter:2,fog:[18,58],fogReal:[18,58],spawn:MCP,
    dark:{hemi:.3,sky:'#7d90ae',ground:'#30261d',exp:1.1,fog:'#05070a',bg:'#04060a'}});
  mineMats();
  // ---------- floors ----------
  mfloor(-9,9,6,-14);                    // the Mine Mouth
  mfloor(-9,30,-19,-48);                 // the Cart Yard
  mfloor(-17,-10,-23,-31);mfloor(-10,-9,-26.6,-27.4,0,0); // the lamp room and the crawl hole into it
  mfloor(30,34,-38,-42.2);               // the tunnel to the gallery
  mfloor(34,40,-32,-50);                 // the gallery's west shore
  mfloor(45.5,50.5,-38.5,-43.5,0,16);    // island 1
  mfloor(57.5,63.5,-37.5,-44.5,0,16);    // island 2
  mfloor(59,64,-26,-31.5,0,16);          // the far crystal island
  mfloor(53,67,-54,-67);                 // the bottom of the pulley shaft
  mfloor(-8.5,-6,-48,-50,0,0);           // the iron door between the yard and the hall
  // the Great Lantern hall: a dark pit in the south-west corner, a shelf beyond it, a cracked floor over a cellar
  mfloor(-22,-4,-50,-60);mfloor(-34,-4,-60,-76);mfloor(-34,-11,-76,-84);mfloor(-34,-30.5,-50,-53.5);
  for(const [a,b,c,d] of [[-11,-9.5,-76,-84],[-5.5,-4,-76,-84],[-9.5,-5.5,-76,-78],[-9.5,-5.5,-81,-84]])box(a,b,-.5,0,c,d,MM.floor,{fade:true,cast:false,surface:'stone'});
  mine.crack.col=box(-9.5,-5.5,-.5,0,-78,-81,M.crack,{kind:'crack',fade:false,cast:false,surface:'stone'});mine.crack.mesh=mine.crack.col.mesh;
  box(-11,-4,-3.5,-3,-76,-84,MM.floor,{cast:false,fade:false});                       // cellar floor
  box(-11.5,-11,-3.5,-.5,-76,-84,MM.rock,{fade:false,cast:false});box(-11,-4,-3.5,-.5,-75.5,-76,MM.rock,{fade:false,cast:false});
  box(-9.5,-8.3,-3,-1,-78,-81,MM.deep,{fade:false});box(-8.3,-7.1,-3,-2,-78,-81,MM.deep,{fade:false}); // rubble to climb out

  // ---------- walls ----------
  const H=6;
  mrock(-10,-9,0,H,5.7,-26.6);mrock(-10,-9,0,H,-27.4,-48);mrock(-10,-9,.55,H,-26.6,-27.4,{fade:true}); // west wall with the crawl hole
  holeMarker(-10,-9,-27.4,-26.6,['x+','x-'],-8.35,-27);
  mrock(9,10,0,H,5.7,-19);mrock(10,31,0,H,-18,-19);                                   // mouth east wall, yard south wall
  mrock(-10,-4.3,0,H,4,5.7);mrock(4.3,10,0,H,4,5.7);invis(-5,5,0,12,7.5,8.5);          // the south wall either side of the gate
  mrock(-18,-17,0,5,-22,-32);mrock(-18,-10,0,5,-31,-32);mrock(-18,-10,0,5,-22,-23);    // the lamp room
  mrock(-4,31,0,7,-48,-59);invis(-4,31,7,18,-48,-59);                                 // the rock under and beside the high drift
  mrock(-37,-8.5,0,10,-48,-50);mrock(-6,-1,0,10,-48,-50);                             // the wall between the yard and the hall
  mrock(30,34,0,7,-19,-38);mrock(30,34,0,7,-42.2,-55);                                // the rock between the yard and the gallery
  mrock(34,77,-12,7,-22,-25);mrock(74,77,-12,7,-25,-58);mrock(34,53,-12,7,-55,-59);mrock(67,77,-12,7,-55,-58); // the gallery
  invis(34,53,7,18,-55,-59);
  mrock(67,70,-1,14,-54,-70);mrock(53,70,-1,14,-67,-70);                              // the shaft
  // the high drift: the rock it runs on, its north wall with a hollow (the niche), and the cracked wall at its west end
  mrock(-4,53,0,6,-59,-66,{fade:false});
  mrock(-4,12,0,10,-66,-69);mrock(15.5,53,0,10,-66,-69);mrock(12,15.5,0,10,-68.4,-69.4);mrock(12,15.5,0,6,-66,-68.4,{fade:false});
  {const W=mine.wall;W.col=box(8,9,6,10.5,-59,-66,null,{kind:'door'});W.g=new THREE.Group();ROOT.add(W.g);
    const m=new THREE.Mesh(boxGeo(1,4.5,7,4.5,0,0,0),MM.rock);m.position.set(8.5,8.25,-62.5);W.g.add(m);
    for(const s of [1,-1]){const d=crackDecal(6.4,4.2);d.rotation.y=s*Math.PI/2;d.position.set(8.5+s*.51,8.2,-62.5);W.g.add(d);}}
  // the hall
  mrock(-37,-34,-4,10,-47,-87);mrock(-37,-1,-4,10,-84,-87);mrock(-4,-1,-4,10,-50,-59);mrock(-4,-1,-4,10,-66,-84);
  // chasm floors far below, lost in mist
  mist(-9,9,-14,-19,-4.5);mist(34,74,-25,-55,-6);mist(-34,-22,-50,-60,-4.5);

  // ---------- the Mine Mouth ----------
  {const g=prop('gate');if(REAL.ready)realifyProp(g);g.position.set(0,-.05,4.5);g.rotation.y=Math.PI;g.scale.setScalar(.82);ROOT.add(g);
    const gm=[];g.traverse(o=>{if(o.isMesh)gm.push(o);});if(gm.length)markFadeGroup(gm);
    for(const s of [-1,1])box(s>0?2.62:-4.3,s>0?4.3:-2.62,0,6.5,3.3,5.7,null,{surface:'stone'});
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(5.2,7.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    veil.position.set(0,3.9,4.9);ROOT.add(veil);mine.veil=veil;
    const lab=labelSprite('The Vale','Walk through together','#1fb3a3');lab.scale.set(4.4,1.4,1);lab.position.set(0,9,4.6);ROOT.add(lab);
    // daylight spilling in through the gate
    const spill=new THREE.Mesh(new THREE.PlaneGeometry(13,12),new THREE.MeshBasicMaterial({map:TEX.glow,color:'#ffe9c4',transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));
    spill.rotation.x=-Math.PI/2;spill.position.set(0,.03,1.5);ROOT.add(spill);}
  addWaystone('ch2_mouth','Mine Mouth',6.4,0,0.6,Math.PI);
  timberPosts([[-8.6,-3,4.6],[8.6,-3,4.6],[-8.6,-10,4.6],[8.6,-10,4.6]]);beam(-8.8,8.8,-2.85,-3.15,4.6);beam(-8.8,8.8,-9.85,-10.15,4.6);
  addLantern(-5,0,-8);
  crate(7.4,-12.2,1);crate(6.3,-12.6,.8);rockPile([[-7.6,0,-12.8,.7],[-8,0,-5.4,.55],[7.8,0,-6.8,.5]]);
  // the first crystal bridge, over the first chasm
  addCrystal('bridge',-1.4,1.4,-14,-19,0,[[-2.5,-13.4],[2.5,-13.4],[-2.5,-19.6],[2.5,-19.6]]);

  // ---------- the Cart Yard ----------
  buildCart();
  // the scaffold with the switch lever on top (the Sprite leaps up from the Giant's head)
  {const x0=6,x1=9,z0=-31,z1=-34,h=3;box(x0,x1,0,h,z0,z1,null,{surface:'wood'});
    for(const [x,z] of [[x0+.12,z0-.12],[x1-.12,z0-.12],[x0+.12,z1+.12],[x1-.12,z1+.12]])box(x-.12,x+.12,0,h,z-.12,z+.12,M.wood,{collide:false,fade:false});
    box(x0,x1,h-.2,h,z0,z1,M.wood,{collide:false,fade:true});
    for(const z of [z0-.05,z1+.05]){const br=new THREE.Mesh(new THREE.BoxGeometry(3.4,.12,.08),M.wood);br.position.set((x0+x1)/2,h/2,z);br.rotation.z=.75;ROOT.add(br);}
    const lv=makeLever(7.5,-32.6,0,'switch',h);lv.mine=true;MLEVERS.push(lv);}
  // the barricade in the tunnel to the gallery
  {const B=mine.bar;B.g=new THREE.Group();ROOT.add(B.g);const parts=[];
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.18,3.3,.66),M.wood);m.position.set(31.3,1.65,-38.35-i*.7);m.rotation.x=(hash2(i,3,4)-.5)*.08;m.castShadow=true;B.g.add(m);parts.push(m);}
    for(const y of [.8,2.4]){const m=new THREE.Mesh(new THREE.BoxGeometry(.16,.22,4.4),M.wood);m.position.set(31.1,y,-40.1);m.rotation.x=y>1?.25:-.25;B.g.add(m);parts.push(m);}
    markFadeGroup(parts);B.col=box(31,31.6,0,3.4,-38,-42.2,null,{kind:'door'});}
  addLantern(20,0,-26);
  timberPosts([[30.6,-37.9,4],[30.6,-42.3,4],[33.4,-37.9,4],[33.4,-42.3,4]]);beam(30.4,30.8,-37.8,-42.4,4);beam(33.2,33.6,-37.8,-42.4,4);
  crate(26,-46.6,1.1);crate(27.2,-46.8,.9);crate(26.5,-45.4,.8);crate(-7.6,-20.6,1);crate(16,-20.2,.9);
  {const w=cartMesh();w.position.set(-6.4,0,-44.2);w.rotation.set(0,.9,.35);ROOT.add(w);box(-7.3,-5.5,0,1,-45.1,-43.3,null);}
  rockPile([[-8,0,-35,.9],[-7.8,0,-38,.6],[14,0,-47,.8],[22,0,-47.2,1],[29,0,-21,.7],[28.8,0,-29,.9],[12,0,-19.8,.6]]);
  // the lamp room behind the crawl hole (secret)
  addLantern(-15.6,0,-29.6);
  {const mural=new THREE.Mesh(new THREE.PlaneGeometry(4.4,2),new THREE.MeshLambertMaterial({map:minersMural(),emissive:'#3a2e24',emissiveIntensity:.4}));mural.position.set(-13.5,2,-30.98);ROOT.add(mural);
    const bed=new THREE.Mesh(new THREE.CylinderGeometry(.7,.8,.16,14),new THREE.MeshLambertMaterial({color:'#4f7d3c'}));bed.position.set(-12,.08,-24.2);ROOT.add(bed);}

  // ---------- the Crystal Gallery ----------
  addLantern(36,0,-47.6);
  addCrystal('bridge',40,45.5,-39.9,-42.1,0,[[39.3,-38.6],[39.3,-43.4],[46.1,-38.9],[46.1,-43.1]]);
  addCrystal('bridge',50.5,57.5,-39.9,-42.1,0,[[58.1,-38.6],[58.1,-43.4]]);          // its posts are on the far island only
  addCrystal('bridge',59.4,61.6,-44.5,-54,0,[[58.4,-44.1],[62.6,-44.1],[58.4,-54.6],[62.6,-54.6]]);
  addCrystal('bridge',60.4,62.6,-31.5,-37.5,0,[[59.6,-30.2],[63.8,-30.2]]);          // to the far island: lit from there only
  addLStone(0,61.6,0,-41,'Crystal gallery');
  quartz([[35,0,-33,1.2],[39.4,0,-49.4,1],[33.6,-3,-46,1.4],[46,0,-43,.8],[50,0,-38.8,.7],[63,0,-37.9,.9],[63,0,-44,1],[63.6,0,-26.4,1.1],[59.4,0,-26.4,.8],
    [44,-7,-30,2.2],[56,-8,-50,2.6],[70,-7,-40,2.4],[52,-9,-30,2],[40,-8,-53,1.8],[66,-9,-28,2.2]]);
  timberPosts([[34.3,-32.3,3.6],[34.3,-49.7,3.6]]);

  // ---------- the pulley shaft and the high drift ----------
  buildLift();
  addLantern(65.5,0,-56.5);
  {const lv=makeLever(52.2,-65.5,0,'cw',MINE.driftY);lv.mine=true;MLEVERS.push(lv);}
  box(46.8,48.2,6,7,-65.3,-66,MM.rock,{fade:false});addLStone(1,47.5,7,-65.65,'High drift');   // stone 2 on a small ledge
  addLantern(30,6,-65.6);addLantern(13.75,6,-68);                                       // the second lights the hollow
  timberPosts([[44,-65.85,3.8,6],[36,-65.85,3.8,6],[28,-65.85,3.8,6],[20,-65.85,3.8,6],[3,-65.85,3.8,6]]);
  rockPile([[66,0,-66,1.1],[54,0,-55,.8],[66.2,0,-60,.7]]);
  // the boulder that waits in the dark above the drift
  {const B=mine.boulder,Rr=MINE.boulderR;B.m=new THREE.Mesh(REAL.ready?realRockGeo(Rr,Rr*.94,Rr,11):lowPoly(Rr,Rr*.94,Rr,1,5,.25),MM.rock);B.m.castShadow=true;B.m.visible=false;ROOT.add(B.m);
    B.col=box(-30.1,-25.9,0,4.8,-64.6,-60.4,null);B.col.on=false;markFade(B.m);}

  // ---------- the Great Lantern hall ----------
  // the Great Lantern: a plinth, a tall iron cage with a platform on top, and a huge dark crystal floating above
  box(-19.4,-14.6,0,.42,-72.4,-67.6,MM.rock,{fade:false,surface:'stone'});
  box(GL.x0,GL.x1,.42,GL.top,GL.z0,GL.z1,null,{surface:'stone'});
  {const g=new THREE.Group();g.position.set(GL.x,0,GL.z);ROOT.add(g);
    const core=new THREE.Mesh(new THREE.BoxGeometry(2.2,GL.top-.42,2.2),MM.deep);core.position.y=(GL.top+.42)/2;g.add(core);
    for(const sx of [-1,1])for(const sz of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(.16,GL.top+3.4,.16),M.iron);b.position.set(sx*1.22,(GL.top+3.4)/2,sz*1.22);g.add(b);}
    const deck=new THREE.Mesh(new THREE.BoxGeometry(2.6,.16,2.6),M.iron);deck.position.y=GL.top-.08;g.add(deck);
    const crown=new THREE.Mesh(new THREE.TorusGeometry(1.7,.08,6,24),M.gold);crown.rotation.x=Math.PI/2;crown.position.y=GL.top+3.4;g.add(crown);
    const cm=new THREE.MeshStandardMaterial({color:'#ffe2a6',emissive:'#ff9f2e',emissiveIntensity:.05,roughness:.2,transparent:true,opacity:.92});
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.9,0),cm);cr.scale.set(1,1.5,1);cr.position.y=GL.top+2.1;g.add(cr);mine.gcrystal=cr;
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffc261',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));glow.scale.set(9,9,1);glow.position.y=GL.top+2.1;g.add(glow);mine.gglow=glow;
    for(let k=0;k<3;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(.42,.2,.3),M.socket);s.position.set((k-1)*.6,.95,1.16);g.add(s);
      const gm=new THREE.Mesh(new THREE.OctahedronGeometry(.17),MM.amber);gm.scale.y=1.4;gm.position.set((k-1)*.6,1.14,1.16);gm.visible=false;g.add(gm);mine.sockets.push(gm);}
    const L=new THREE.PointLight('#ffcf8a',0,48,1.6);L.position.set(GL.x,GL.top+2.6,GL.z);ROOT.add(L);mine.glight=L;}
  // the hidden crystal path across the pit, and the shelf with the third stone
  for(const [x,z] of [[-22.85,-58.35],[-24.55,-58.35],[-26.25,-58.35],[-26.25,-56.65],[-26.25,-54.95],[-27.95,-54.95],[-29.65,-54.95],[-29.65,-53.25]])
    addCrystal('tile',x-.85,x+.85,z-.85,z+.85,0,null,MINE.tileR);
  addLStone(2,-32.6,0,-51.8,'Dark pit');
  // the iron door back to the yard (opened from this side)
  {const D=mine.door;D.g=new THREE.Group();ROOT.add(D.g);const parts=[];
    for(let i=0;i<6;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.1,3.3,.1),M.iron);b.position.set(-8.3+i*.44,1.65,-49);D.g.add(b);parts.push(b);}
    for(const y of [.5,1.6,2.7]){const b=new THREE.Mesh(new THREE.BoxGeometry(2.5,.1,.12),M.iron);b.position.set(-7.25,y,-49);D.g.add(b);parts.push(b);}
    markFadeGroup(parts);D.col=box(-8.5,-6,0,3.4,-48.7,-49.3,null,{kind:'door'});
    const lv=makeLever(-5.1,-51.4,Math.PI/2,'door');lv.mine=true;MLEVERS.push(lv);}
  addWaystone('ch2_hall','Great Lantern',-7.2,0,-55.4,Math.PI/2);
  addLantern(-30.5,0,-78.5);addLantern(-6.6,0,-71.6);
  quartz([[-33.4,0,-66,1.3],[-33.2,0,-74,1],[-28,0,-83.4,1.2],[-20,0,-83.4,.9],[-4.6,0,-60.6,.8],[-33,0,-51.5,.9],[-31,-4,-56,1.6],[-25,-6,-52,2],[-10,-3,-83,1],[-5,-3,-79,.9],[-10.5,-3,-80,.7]]);
  rockPile([[-33,0,-62,.9],[-33.2,0,-80,1],[-24,0,-83.2,.8],[-12,0,-83.3,1],[-4.8,0,-82,.7],[-21,0,-50.8,.6]]);
  timberPosts([[-33.6,-60.6,5],[-33.6,-75.4,5],[-4.4,-75.4,5]]);

  // ---------- collectibles ----------
  const S=[[-6,0,-2],[6,0,-6],[0,0,-11],[-7,0,-11.2],                                  // mouth
    [-6,0,-22],[-4,0,-40],[2,0,-46.4],[12,0,-30],[16,0,-44],[24,0,-22],[27,0,-34],[7.5,3,-33.6],      // yard (one on the scaffold)
    [-12,0,-25],[-12,0,-29.6],[-14.6,0,-27],[-16.2,0,-24],                              // lamp room
    [38,0,-34.5],[37.4,0,-44.6],[47,0,-40],[49,0,-42.6],[59.4,0,-39],[62.6,0,-43.6],[62.8,0,-38.4],[60.4,0,-28.2],[62.6,0,-28.2],[61.5,0,-30.6], // gallery
    [56,0,-57],[64,0,-64.6],[60,0,-60],                                                // shaft
    [40,6,-62.5],[33,6,-62.5],[26,6,-62.5],[19,6,-62.5],                                // the drift (grab them on the run)
    [-20,0,-64],[-12,0,-58],[-28,0,-70],[-24,0,-82],[-31,0,-52.6],                       // hall
    [-10,-3,-77],[-5,-3,-83]];                                                          // cellar
  S.forEach(([x,y,z],i)=>addSeed('c2s'+i,x,y,z));
  addPetal('m6',-16,0,-24.6);addPetal('m7',-5.4,-3,-77);addPetal('m8',61.5,0,-27.6);

  // ---------- lights: a few shared lantern lights that follow the lit lanterns nearest the players ----------
  for(let i=0;i<4;i++){const L=new THREE.PointLight('#ffc672',0,14,1.7);L.position.set(0,-50,0);ROOT.add(L);mine.pool.push({L,lan:null,k:0});}
  // the light pulse: an expanding shell of light
  {const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),new THREE.MeshBasicMaterial({color:'#bff7ea',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide}));
    m.visible=false;ROOT.add(m);mine.fx.m=m;
    const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,40),new THREE.MeshBasicMaterial({color:'#c9fff0',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.visible=false;ROOT.add(ring);mine.fx.ring=ring;}
  mine.beacon=makeBeacon();
  buildSleepers();
  endRegion(R);
  buildSeedInstances('ch2');
  // the Sprite's own glow (only switched on in dark places)
  SPRITE_LIGHT=new THREE.PointLight('#c4f7ea',1.5,9,1.8);SPRITE_LIGHT.visible=false;scene.add(SPRITE_LIGHT);
}

// ================= state =================
function resetMines(){
  const P=PROG.ch2,done=!!P.done;
  G.time=0;G.falls=0;G.throws=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;G.ch.pulses=0;
  mine.lan=done?(1<<LANTERNS.length)-1:(P.lan|0);
  mine.sw.b=done;mine.sw.t=+done;
  const C=mine.cart;C.br=done?1:-1;C.s=done?C.sEnd:0;C.v=0;syncCart();
  mine.bar.broken=done;mine.bar.col.on=!done;
  const L=mine.lift;L.t=0;L.cw=done;L.col.min.y=-.25;L.col.max.y=0;
  const B=mine.boulder;B.st=done?'done':'idle';B.x=done?-28:51.5;B.y=done?MINE.boulderR:22;B.t=0;B.v=0;B.col.on=done;
  mine.wall.broken=done;mine.wall.col.on=!done;
  mine.door.open=done||!!P.door;mine.door.t=+mine.door.open;
  mine.crack.broken=false;mine.crack.col.on=true;
  for(const st of LSTONES){st.state=done?'placed':'rest';st.pos.copy(st.home);}
  mine.placed=done?3:0;
  for(const c of CRYST){c.t=done?MINE.litT:0;c.col.on=done;}
  for(const l of MLEVERS){l.pulled=l.id==='switch'?mine.sw.b:l.id==='cw'?L.cw:mine.door.open;l.t=+l.pulled;}
  golem.runes=0;golem.holding=false;golem.charging=false;golem.pound=false;golem.winding=false;sprite.held=false;sprite.winding=false;
  placeAt(golem,MCP.g);placeAt(sprite,MCP.s);golem.yaw=sprite.yaw=Math.PI;
  mine.fx.t=9;hintsShown.clear();camSnap=true;
}
function minesDone(){return !!PROG.ch2.done;}
const onLanternTop=b=>b.pos.x>GL.x0-.1&&b.pos.x<GL.x1+.1&&b.pos.z>GL.z0-.1&&b.pos.z<GL.z1+.1&&b.pos.y>GL.top-.15;
// the Sprite's light pulse: lights lanterns and wakes crystals nearby
function lightPulse(){
  const s=sprite;if(mine.pulseCD>0)return;mine.pulseCD=.6;
  G.pulseN=(G.pulseN||0)+1;G.pulseAt=[s.pos.x,s.pos.y,s.pos.z];G.ch.pulses=(G.ch.pulses||0)+1;
  const p=s.pos;
  for(const l of LANTERNS)if(!lanLit(l)&&Math.hypot(l.pos.x-p.x,l.pos.z-p.z)<MINE.pulseR+.5&&Math.abs(l.pos.y-p.y)<4){mine.lan|=1<<l.i;PROG.ch2.lan=mine.lan;G.lanN=(G.lanN||0)+1;saveSoon();}
  for(const c of CRYST)for(const a of c.anchors){if(Math.hypot(a.x-p.x,a.z-p.z)<c.r&&Math.abs(a.y-p.y)<3){const was=c.col.on;c.t=MINE.litT;c.col.on=true;if(!was){liftOnto(c.col);G.crystN=(G.crystN||0)+1;}break;}}
  if(!G.ending&&mine.placed>=3&&!minesDone()&&onLanternTop(s)){G.ending=true;G.endT=0;chapterComplete(2);mine.lan=(1<<LANTERNS.length)-1;PROG.ch2.lan=mine.lan;}
}
function pullMineLever(l){
  if(l.id==='switch'){mine.sw.b=!mine.sw.b;l.pulled=mine.sw.b;G.swN=(G.swN||0)+1;return;}
  l.pulled=true;
  if(l.id==='cw'){mine.lift.cw=true;}
  else if(l.id==='door'){mine.door.open=true;PROG.ch2.door=1;saveSoon();}
}
function golemMineAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,GL.sock)<3.4&&Math.abs(g.pos.y-.4)<1){for(const st of LSTONES)if(st.state==='carried'){st.state='placed';mine.placed++;}g.runes=0;return true;}
  for(const st of LSTONES)if(st.state==='rest'&&stoneReach(g,st)){st.state='carried';g.runes++;G.pick++;if(st.i===1&&!mine.wall.broken&&mine.boulder.st==='idle'){mine.boulder.st='wait';mine.boulder.t=0;}return true;}
  if(dxz(g.pos,WINCH_B)<2.2&&Math.abs(g.pos.y-WINCH_B.y)<1&&!g.holding){g.winding=true;return true;}
  return false;
}
// ---- per step: before the characters move ----
function stepMinesA(dt,IG,IS){
  const g=golem,s=sprite,L=mine.lift;
  mine.pulseCD-=dt;
  if(g.winding&&(!IG.act||g.holding||!g.onGround||dxz(g.pos,WINCH_B)>2.6))g.winding=false;
  if(s.winding&&(!IS.act||s.held||!L.cw||dxz(s.pos,WINCH_T)>2||Math.abs(s.pos.y-WINCH_T.y)>1))s.winding=false;
  // the lift: wound up by the Giant (below) or, once balanced, by the Sprite (above); otherwise it sinks back
  const oldY=L.t*MINE.liftH,riders=[g,s].filter(b=>!(b===s&&s.held)&&b.onGround&&b.ground===L.col);
  let v=g.winding||s.winding?1/4:(!L.cw?-1/5:(riders.length?0:-1/7));
  let nt=clamp(L.t+v*dt,0,1);
  if(nt<L.t){const ny=nt*MINE.liftH;for(const b of [g,s]){if(b===s&&s.held)continue;
    if(b.pos.x+b.hw>L.x0&&b.pos.x-b.hw<L.x1&&b.pos.z+b.hw>L.z0&&b.pos.z-b.hw<L.z1&&b.pos.y<oldY-.2&&b.pos.y+b.h>ny-.35){nt=L.t;break;}}}
  L.t=nt;const ny=L.t*MINE.liftH,dy=ny-oldY;L.col.min.y=ny-.25;L.col.max.y=ny;L.moving=Math.abs(dy)>1e-5;L.wheelA+=dy*.5;
  if(dy>0)for(const b of riders){b.pos.y+=dy;if(b===g)syncGolemCol();}
}
// ---- per step: after the characters move ----
function stepMinesB(dt){
  const g=golem,s=sprite,C=mine.cart;
  if(cartRolling()){C.v=Math.min(7,Math.max(C.v,2.4)+2.2*dt);const ns=Math.min(C.sEnd,C.s+C.v*dt);C.roll+=ns-C.s;C.s=ns;if(C.s>=C.sEnd){C.v=0;G.bumpN=(G.bumpN||0)+1;}
    if(!mine.bar.broken&&C.s>=C.sBar){mine.bar.broken=true;mine.bar.col.on=false;G.smashN=(G.smashN||0)+1;}
    syncCart();depenetrate(g,C.col);syncGolemCol();if(!s.held)depenetrate(s,C.col);C.moved=.25;}
  C.moved-=dt;mine.sw.t=approach(mine.sw.t,mine.sw.b?1:0,dt/.4);
  if(C.br===0&&C.s>=C.aEnd-.01&&!mine.bar.broken&&!C.atA){C.atA=true;G.bumpN=(G.bumpN||0)+1;}if(C.br!==0||C.s<C.aEnd-.5)C.atA=false;
  const done=minesDone();
  for(const c of CRYST){if(done){c.t=MINE.litT;if(!c.col.on){c.col.on=true;liftOnto(c.col);}continue;}if(c.t>0){c.t=Math.max(0,c.t-dt);if(c.t<=0)c.col.on=false;}}
  stepBoulder(dt);
  const D=mine.door;D.t=approach(D.t,D.open?1:0,dt/2.2);D.col.min.y=D.t*3.3;D.col.max.y=3.4+D.t*3.3;
  for(const l of MLEVERS)l.t=approach(l.t,l.pulled?1:0,dt/.35);
}
const BSTATES=['idle','wait','roll','fall','land','done'];
function stepBoulder(dt){
  const B=mine.boulder,R=MINE.boulderR,Y=MINE.driftY;
  if(B.st==='wait'){B.t+=dt;if(B.t>1.25)B.y=Math.max(Y+R,lerp(Y+16,Y+R,(B.t-1.25)/.35));else B.y=22;if(B.t>1.6){B.st='roll';B.y=Y+R;B.v=1.2;G.rollN=(G.rollN||0)+1;}}
  else if(B.st==='roll'){B.v=Math.min(3,B.v+2.4*dt);B.x-=B.v*dt;B.rot+=B.v*dt/R;
    if(!mine.wall.broken&&B.x-R<9.1){mine.wall.broken=true;mine.wall.col.on=false;G.wallN=(G.wallN||0)+1;}
    if(B.x<-4.2){B.st='fall';B.vy=0;}
    for(const b of [golem,sprite]){if(b===sprite&&sprite.held)continue;
      if(b.pos.y>Y-.6&&b.pos.y<Y+2*R&&Math.abs(b.pos.x-B.x)<R*.8&&Math.abs(b.pos.z-MINE.driftZ)<R+b.hw-.35){bowled();return;}}}
  else if(B.st==='fall'){B.x-=3*dt;B.vy-=GRAV*dt;B.y+=B.vy*dt;B.rot+=3*dt/R;if(B.y<=R){B.y=R;B.st='land';B.v=3;G.boomN=(G.boomN||0)+1;}}
  else if(B.st==='land'){B.v=clamp((B.x+28)*2,1.5,5.5);B.x=Math.max(-28,B.x-B.v*dt);B.rot+=B.v*dt/R;if(B.x<=-28){B.st='done';}
    B.col.min.set(B.x-2.1,0,MINE.driftZ-2.1);B.col.max.set(B.x+2.1,4.8,MINE.driftZ+2.1);B.col.on=true;for(const b of [golem,sprite])if(!(b===sprite&&sprite.held))depenetrate(b,B.col);syncGolemCol();} // solid while it rolls: it shoves anyone in its way // rolls well clear of where the players drop in
  if(B.st==='done'&&!B.col.on){B.col.min.set(B.x-2.1,0,MINE.driftZ-2.1);B.col.max.set(B.x+2.1,4.8,MINE.driftZ+2.1);B.col.on=true;for(const b of [golem,sprite])depenetrate(b,B.col);syncGolemCol();}
}
function bowled(){
  const B=mine.boulder;G.bowlN=(G.bowlN||0)+1;B.st='wait';B.t=-1;B.x=51.5;B.y=22;B.v=0;
  golem.holding=false;golem.charging=false;golem.winding=false;sprite.held=false;
  placeAt(golem,[44,6,-61.6]);placeAt(sprite,[44,6,-63.6]);golem.yaw=sprite.yaw=-Math.PI/2;syncGolemCol();golem.safe=null;sprite.safe=null;camSnap=true;
}

// ================= visuals =================
function startPulseFx(p){if(!p)return;const F=mine.fx;F.t=0;F.x=p[0];F.y=p[1];F.z=p[2];}
function updateMinesVis(dt,t){
  const rf=PROG.settings.reduceFlash,done=minesDone();
  // the cart
  const C=mine.cart;C.g.position.set(C.p.x,0,C.p.z);C.g.rotation.y=Math.atan2(C.p.tx,C.p.tz);for(const w of C.g.userData.wheels)w.rotation.x=C.roll/.2;
  mine.sw.arrow.rotation.y=Math.PI/2*(1-mine.sw.t); // points north (the dead end) or east (toward the barricade)
  mine.sw.blades.forEach((b,i)=>{b.rotation.y=mine.sw.t*.32;b.position.x=4+(i?.42:-.42)+mine.sw.t*.32;});
  mine.bar.g.visible=!mine.bar.broken;
  // the lift
  const L=mine.lift,ly=L.t*MINE.liftH,cz=(L.z0+L.z1)/2;L.g.position.y=ly;
  const top=12-2,ropeLen=top-(ly+2.7);L.rope.position.set(54.4,ly+2.7+ropeLen/2,cz);L.rope.scale.y=Math.max(.1,ropeLen);
  const cwy=L.cw?lerp(9.4,3.4,L.t):9.4;L.cwM.position.y=cwy;const r2l=top-(cwy+.65);L.rope2.position.set(58.4,cwy+.65+r2l/2,cz);L.rope2.scale.y=Math.max(.1,r2l);L.hook.visible=!L.cw;
  L.wheel.rotation.z=-L.wheelA;if(golem.winding)L.wB.rotation.x+=dt*4;if(sprite.winding)L.wT.rotation.x+=dt*6;
  for(const l of MLEVERS)l.handle.rotation.z=lerp(-.7,.7,l.t);
  // the boulder, the cracked wall, the door
  const B=mine.boulder;B.m.visible=B.st!=='idle'&&!(B.st==='wait'&&B.t<1.25);B.m.position.set(B.x,B.y,MINE.driftZ);B.m.rotation.z=B.rot;
  mine.wall.g.visible=!mine.wall.broken;mine.door.g.position.y=mine.door.t*3.3;
  if(B.st==='wait'&&B.t>0&&B.t<1.3&&Math.random()<dt*30)puff(51.5+(Math.random()-.5)*3,MINE.driftY+3.5+Math.random()*2,MINE.driftZ+(Math.random()-.5)*4,1,.5,[.6,.56,.5],.25,-.6);
  if(B.st==='roll'&&Math.random()<dt*14)puff(B.x+1.6,MINE.driftY,MINE.driftZ+(Math.random()-.5)*4.6,2,.8,[.62,.58,.52],.4,.6);
  // the stones and the Great Lantern
  for(const st of LSTONES){const vis=st.state==='rest';st.m.visible=vis;st.glow.visible=vis;if(vis){const y=st.pos.y+.42+Math.sin(t*1.8+st.i)*.07;st.m.position.set(st.pos.x,y,st.pos.z);st.m.rotation.y=t*.8+st.i;st.glow.position.set(st.pos.x,y,st.pos.z);st.glow.material.opacity=rf?.7:.6+.2*Math.sin(t*2.4);}}
  mine.sockets.forEach((s,i)=>s.visible=i<mine.placed);
  const gk=done?1:(G.ending?Math.min(1,G.endT/2.5):0);
  mine.gcrystal.material.emissiveIntensity=.35+gk*1.9;mine.gcrystal.rotation.y=t*(.2+gk*.6);mine.gglow.material.opacity=.14+gk*.66; // a faint landmark glow even before it is lit
  mine.glight.intensity=gk*(rf?2.4:2.4+.15*Math.sin(t*3));
  if(G.ending&&Math.random()<dt*40){const a=Math.random()*6.28,sp=1+Math.random()*2;emit(GL.x,GL.top+2.1,GL.z,Math.cos(a)*sp,Math.random()*2,Math.sin(a)*sp,1,.82,.45,.09,1.6,.4,.3);}
  // lanterns: the crystal glows when lit; the nearest lit lanterns borrow one of the shared lights
  for(const l of LANTERNS){const on=lanLit(l);l.k=approach(l.k,on?1:0,dt*2);l.cr.material=l.k>.5?MM.amber:MM.lanOff;l.glow.material.opacity=l.k*(rf?.7:.62+.08*Math.sin(t*7+l.i*3));}
  mine.poolT-=dt;
  if(mine.poolT<=0){mine.poolT=.25;const lit=LANTERNS.filter(l=>lanLit(l)).map(l=>[l,l.pos.distanceToSquared(camTarget)]).sort((a,b)=>a[1]-b[1]).slice(0,mine.pool.length).map(a=>a[0]);mine.want=lit;}
  const want=mine.want||[];
  for(const P of mine.pool){if(P.lan&&!want.includes(P.lan)){P.k=approach(P.k,0,dt*3);if(P.k<=0)P.lan=null;}}
  for(const l of want)if(!mine.pool.some(P=>P.lan===l)){const P=mine.pool.find(P=>!P.lan);if(P){P.lan=l;P.k=0;}}
  for(const P of mine.pool){if(P.lan&&want.includes(P.lan))P.k=approach(P.k,P.lan.k,dt*3);
    if(P.lan){P.L.position.copy(P.lan.pos);P.L.intensity=P.k*(rf?1.6:1.55+.12*Math.sin(t*9+P.lan.i));}else P.L.intensity=0;}
  // crystals: bright while lit, a flicker in the last two seconds, then fade out
  for(const c of CRYST){let k=done?1:c.t>2?1:c.t/2;if(!done&&c.t>0&&c.t<2&&!rf)k*=.55+.45*(Math.sin(c.t*24)>-.3?1:0);
    const tile=c.kind==='tile';c.mat.opacity=lerp(tile?0:.06,.8,k);c.mat.emissiveIntensity=k*1.1;c.mesh.visible=!tile||k>.01;
    c.em.material.opacity=lerp(tile?0:.26,.95,k);c.em.visible=!tile||k>.01;c.pm.emissiveIntensity=lerp(.25,1.8,k);
    if(tile&&k<.01&&!rf&&Math.random()<dt*.35&&dxz(sprite.pos,c.anchors[0])<9)emit(c.anchors[0].x+(Math.random()-.5),.05,c.anchors[0].z+(Math.random()-.5),0,.25,0,.55,.9,1,.06,1.1,0,.3);}
  // the pulse: an expanding shell and a ring on the floor
  const F=mine.fx;F.t+=dt;const fk=F.t/.55;
  F.m.visible=fk<1;F.ring.visible=fk<1;
  if(fk<1){const r=.6+smooth(0,1,fk)*MINE.pulseR;F.m.position.set(F.x,F.y+.4,F.z);F.m.scale.setScalar(r);F.m.material.opacity=(1-fk)*(rf?.12:.22);
    F.ring.position.set(F.x,F.y+.05,F.z);F.ring.scale.setScalar(r);F.ring.material.opacity=(1-fk)*.7;}
  // the Sprite's own light: a soft glow, much brighter for a moment after a pulse
  if(SPRITE_LIGHT){const p=sprite.root?sprite.root.position:sprite.pos;SPRITE_LIGHT.position.set(p.x,p.y+.6,p.z);const boost=Math.max(0,1-F.t/1.4);
    SPRITE_LIGHT.intensity=1.7+boost*(rf?2:3.4);SPRITE_LIGHT.distance=11+boost*8;}
  mine.veil.material.opacity=rf?.24:.2+.1*Math.sin(t*1.6);
  // dust in the air near the Sprite's light
  if(!rf&&Math.random()<dt*5){const p=sprite.pos;emit(p.x+(Math.random()-.5)*6,p.y+.4+Math.random()*2.5,p.z+(Math.random()-.5)*6,(Math.random()-.5)*.1,.03,(Math.random()-.5)*.1,.85,.8,.7,.035,3,0,.2);}
}

// ================= the Vale's lantern posts (lit once the second root wakes) =================
function buildValeLamps(){
  // batched: one draw call each for the posts, caps, crystals and glows
  const spots=[[3.4,74],[-3.4,58],[3.4,44],[-3.4,-40],[3.4,-56],[-3.4,-74],[3.4,-88],[44,-38],[60,-54],[22,-24],[-23,20],[24,20],[-31,-3],[31,3]],n=spots.length;
  const mat=new THREE.MeshStandardMaterial({color:'#6b747c',emissive:'#ffad3d',emissiveIntensity:0,roughness:.35});VALE.lampMat=mat;
  const postG=new THREE.CylinderGeometry(.07,.09,2.2,8);postG.translate(0,1.1,0);const capG=new THREE.ConeGeometry(.24,.2,4);capG.rotateY(Math.PI/4);capG.translate(0,2.5,0);
  const crG=new THREE.OctahedronGeometry(.12);crG.scale(1,1.5,1);crG.translate(0,2.22,0);
  const ims=[[postG,M.wood],[capG,M.iron],[crG,mat]].map(([g,m])=>{const im=new THREE.InstancedMesh(g,m,n);im.castShadow=true;ROOT.add(im);return im;});
  const m4=new THREE.Matrix4(),gp=new Float32Array(n*3);
  spots.forEach(([x,z],i)=>{const y=valeH(x,z);m4.makeTranslation(x,y,z);for(const im of ims)im.setMatrixAt(i,m4);gp.set([x,y+2.22,z],i*3);box(x-.15,x+.15,y-1,y+2.2,z-.15,z+.15,null);});
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(gp,3));
  const glow=new THREE.Points(pg,new THREE.PointsMaterial({map:TEX.glow,color:'#ffc46a',size:1.7,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));
  glow.visible=false;ROOT.add(glow);VALE.lampGlow=glow;
}
function updateValeLamps(dt){if(!VALE.lampMat)return;const on=PROG.roots>=2&&!(G.scene==='root2'&&G.line<1);VALE.lampK=approach(VALE.lampK||0,on?1:0,dt/2.5);
  VALE.lampMat.emissiveIntensity=VALE.lampK*1.4;VALE.lampGlow.material.opacity=VALE.lampK*.6;VALE.lampGlow.visible=VALE.lampK>.01;}

// ================= dark regions: no sky, no sun, black fog, the Sprite's light =================
const LOOK={saved:null};
function applyLook(r){
  if(!LOOK.saved)LOOK.saved={env:scene.environment,bg:scene.background,fog:scene.fog.color.clone(),hemi:W.hemi?W.hemi.intensity:0,hs:W.hemi?W.hemi.color.clone():null,hg:W.hemi?W.hemi.groundColor.clone():null,exp:renderer.toneMappingExposure};
  const S=LOOK.saved,d=r.dark;
  scene.environment=d?null:S.env;scene.background=d?new THREE.Color(d.bg):S.bg;scene.fog.color.copy(d?new THREE.Color(d.fog):S.fog);
  if(W.sky)W.sky.visible=!d;if(W.sun)W.sun.visible=!d;
  if(W.hemi){W.hemi.intensity=d?d.hemi:S.hemi;W.hemi.color.copy(d?new THREE.Color(d.sky):S.hs);W.hemi.groundColor.copy(d?new THREE.Color(d.ground):S.hg);}
  renderer.toneMappingExposure=d?d.exp:S.exp;
  if(SPRITE_LIGHT)SPRITE_LIGHT.visible=!!d;
  // the Giant's stone body is lit mostly by the sky's reflections, which don't exist underground: give it a soft fill instead
  if(LOOK.gb===undefined){LOOK.gb=null;if(golem.model)golem.model.traverse(o=>{if(o.isMesh&&o.material.name==='GiantBody'&&!LOOK.gb){LOOK.gb=o.material;if(o.material.map){o.material.emissiveMap=o.material.map;o.material.needsUpdate=true;}}});}
  if(LOOK.gb)LOOK.gb.emissive.set(d?'#59636e':'#000000');
  // lights that belong to one region are switched off everywhere else (fewer lights to shade)
  for(const rn of runes)rn.light.visible=r.id==='ch1';if(W.fLight)W.fLight.visible=r.id==='ch1';if(VALE.treeLight)VALE.treeLight.visible=r.id==='vale';
}
