// ================= Chapter 4: The Frostmere Lake =================
// A frozen lake under snowy pines. New: ice. Ice is slippery (slow to start, slow to stop), thin ice holds the Sprite
// but cracks under the Giant, and the Sprite's glow melts frozen things (hold interact next to them).
// The route, south to north:
//  Shore Camp (melt the frozen gate latch) -> the Ice Field (the Giant slides an ice block west against a frozen rock,
//  then north into the open channel: it sinks level and becomes a step across) -> the hub on the north shore ->
//  the Narrows (east: thin ice. The Sprite crosses to the islet and melts its frozen lever, which raises a stone
//  causeway; the Giant crosses for ember 1) -> the Snowfield (west: the Giant rolls a snowball until it is big
//  enough to fill the crevasse; ember 2 beyond) -> Hearth Island (north: the Sprite melts the ice sealing a cave,
//  ember 3; set the embers in the hearth, lob the Sprite onto its roof, it melts the frozen chimney).
// Optional: the fishing hut (melt its door), the thin-ice ring islet (only light feet), the big boulder (a lob).
const FCP={g:[-1.5,0,4.5],s:[1.5,0,4.5]};
const FR={blockHome:new V3(6,0,-24),ballHome:new V3(-20,0,-46.6),rampX:-10,hearth:new V3(0,0,-68.8),bay:{x0:4,x1:30,z0:-60,z1:-44},chan:{x0:-20,x1:20,z0:-42.2,z1:-40},crev:{x0:-36,x1:-12,z0:-52.6,z1:-50}};
const frs={placed:0,flue:false,causeT:0,cause:false,causeCol:null,bridge:null};
const MELTS=[],EMBERS=[],THIN=[],FISL=[];
let ICEB=null,SNOWB=null;
const FM={};
const inCh4=()=>G.region==='ch4';

function frostMats(){
  const R=REAL.ready;
  FM.snow=new THREE.MeshStandardMaterial({color:'#e6edf2',roughness:.92,metalness:0,envMapIntensity:.6});
  FM.ice=new THREE.MeshStandardMaterial({color:'#8fc3dc',roughness:.12,metalness:0,envMapIntensity:1.3});
  FM.thin=new THREE.MeshStandardMaterial({color:'#e2f4fa',roughness:.2,metalness:0,transparent:true,opacity:.78,envMapIntensity:1.1});
  FM.block=new THREE.MeshStandardMaterial({color:'#a9dcef',roughness:.1,metalness:0,transparent:true,opacity:.9,envMapIntensity:1.4});
  FM.rock=R?rockMat('frostRock','#9aa3ab'):new THREE.MeshLambertMaterial({color:'#8a939b'});TILE.set(FM.rock,3.5);
  FM.wood=M.wood;FM.pine=new THREE.MeshLambertMaterial({color:'#2f5a3f',flatShading:true});FM.cap=new THREE.MeshLambertMaterial({color:'#f6fbff',flatShading:true});
  FM.ember=new THREE.MeshStandardMaterial({color:'#ffb36b',emissive:'#ff6a1f',emissiveIntensity:1.6,roughness:.4});
  FM.frozen=new THREE.MeshStandardMaterial({color:'#d8f1fb',roughness:.08,metalness:0,transparent:true,opacity:.82,envMapIntensity:1.5});
  FM.water=M.water;
}
function snowFloor(xa,xb,za,zb,y,deep){box(xa,xb,(y||0)-.5,y||0,za,zb,FM.snow,{cast:false,fade:false,surface:'snow'});if(deep!==0)box(xa,xb,(y||0)-(deep||6),(y||0)-.5,za,zb,FM.rock,{cast:false,fade:false,collide:false});}
function iceFloor(xa,xb,za,zb){box(xa,xb,-.4,0,za,zb,FM.ice,{cast:false,fade:false,surface:'ice'});}
function bank(xa,xb,za,zb,h){box(xa,xb,0,h||1.6,za,zb,FM.snow,{surface:'snow'});}
function frock(x,z,s,h){const m=new THREE.Mesh(REAL.ready?realRockGeo(s,h||s*.8,s,x+z):lowPoly(s,h||s*.8,s,0,(x*7+z)|0,.35),FM.rock);m.position.set(x,0,z);m.castShadow=m.receiveShadow=true;ROOT.add(m);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(s*.8,12,6,0,Math.PI*2,0,Math.PI/2),FM.cap);cap.scale.y=.25;cap.position.set(x,(h||s*.8)*.92,z);ROOT.add(cap);return m;}
function pines(list){
  const n=list.length,cone=new THREE.ConeGeometry(1,1.6,7),capG=new THREE.ConeGeometry(.55,.6,7),trunk=new THREE.CylinderGeometry(.16,.22,1.2,6);trunk.translate(0,.6,0);
  const a=new THREE.InstancedMesh(cone,FM.pine,n*3),b=new THREE.InstancedMesh(capG,FM.cap,n*3),t=new THREE.InstancedMesh(trunk,M.wood,n);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new V3(),sc=new V3();
  list.forEach(([x,z,s],i)=>{p.set(x,0,z);q.identity();sc.set(s,s,s);m4.compose(p,q,sc);t.setMatrixAt(i,m4);
    for(let k=0;k<3;k++){const w=(1.6-k*.42)*s,y=(1.5+k*1.1)*s;p.set(x,y,z);sc.set(w,s*(1.4-k*.2),w);m4.compose(p,q,sc);a.setMatrixAt(i*3+k,m4);p.set(x,y+.45*s*(1.4-k*.2),z);sc.set(w,s,w);m4.compose(p,q,sc);b.setMatrixAt(i*3+k,m4);}
    box(x-.3*s,x+.3*s,0,3*s,z-.3*s,z+.3*s,null,{surface:'wood'});});
  for(const im of [a,b,t]){im.castShadow=true;im.receiveShadow=true;ROOT.add(im);}
}
// ---- melting: the Sprite holds interact next to frozen things ----
function addMelt(id,x,y,z,w,h,d,label,onDone,ready){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),FM.frozen.clone());m.position.set(x,y+h/2,z);m.castShadow=true;ROOT.add(m);
  const M0={id,pos:new V3(x,y,z),t:0,done:false,m,label,onDone,ready:ready||(()=>true),col:null,w,h,d};MELTS.push(M0);return M0;
}
const meltReach=(s,M0)=>Math.max(Math.abs(s.pos.x-M0.pos.x)-M0.w/2,Math.abs(s.pos.z-M0.pos.z)-M0.d/2)<1.1&&s.pos.y>M0.pos.y-.9&&s.pos.y<M0.pos.y+M0.h+.6;
function meltTarget(){for(const M0 of MELTS)if(!M0.done&&M0.ready()&&meltReach(sprite,M0))return M0;return null;}
// ---- embers (the chapter's root stones) ----
function addEmber(i,x,y,z,where){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),FM.ember);m.castShadow=true;ROOT.add(m);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ff9a4a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.75}));glow.scale.set(1.7,1.7,1);ROOT.add(glow);
  EMBERS.push({i,pos:new V3(x,y,z),home:new V3(x,y,z),state:'rest',m,glow,where});}
const emberReach=(g,e)=>dxz(g.pos,e.pos)<1.9&&e.pos.y-g.pos.y>-.8&&e.pos.y-g.pos.y<2.2;

// ================= build =================
function buildFrost(){
  curBuild='ch4';
  const R=beginRegion('ch4',{name:'Chapter 4: The Frostmere Lake',short:'Frostmere Lake',chapter:4,fog:[60,240],fogReal:[70,300],spawn:FCP,
    hazard:b=>!(b===sprite&&sprite.held)&&b.pos.y<-.3&&frostWater(b.pos.x,b.pos.z)});
  frostMats();
  // ---------- Shore Camp ----------
  snowFloor(-16,16,10,-12);
  {const g=prop('gate');if(REAL.ready)realifyProp(g);g.position.set(0,-.05,8.5);g.rotation.y=Math.PI;g.scale.setScalar(.82);ROOT.add(g);
    const gm=[];g.traverse(o=>{if(o.isMesh)gm.push(o);});if(gm.length)markFadeGroup(gm);
    for(const s of [-1,1])box(s>0?2.62:-4.3,s>0?4.3:-2.62,0,6.5,7.3,9.7,null,{surface:'stone'});
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(5.2,7.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    veil.position.set(0,3.9,8.9);ROOT.add(veil);frs.veil=veil;
    const lab=labelSprite('The Vale','Walk through together','#1fb3a3');lab.scale.set(4.4,1.4,1);lab.position.set(0,9,8.6);ROOT.add(lab);invis(-5,5,0,12,11,12);}
  bank(-16,-4.3,9.2,10.4,1.4);bank(4.3,16,9.2,10.4,1.4);bank(-17.4,-16,10,-12,2);bank(16,17.4,10,-12,2);
  addWaystone('ch4_shore','Shore Camp',-7,0,5,Math.PI);
  // a fence along the shore with a gate whose latch is frozen shut
  for(const [a,b] of [[-16,-2],[2,16]]){box(a,b,0,1.6,-11.8,-12.2,M.wood,{surface:'wood'});for(let x=a;x<=b;x+=2)box(x-.1,x+.1,0,1.9,-11.85,-12.15,M.wood,{collide:false,fade:false});}
  frs.gate={open:false,t:0,col:box(-2,2,0,1.8,-11.8,-12.2,null,{kind:'door'}),g:new THREE.Group()};frs.gate.g.position.set(-2,0,-12);ROOT.add(frs.gate.g);
  for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.7,1.6,.12),M.wood);p.position.set(.4+i*.8,.85,0);p.castShadow=true;frs.gate.g.add(p);}
  addMelt('latch',2.5,0,-11.4,.7,1.1,.7,'Hold to melt the frozen latch',()=>{frs.gate.open=true;});
  {const logs=new THREE.Mesh(new THREE.CylinderGeometry(.9,1,.3,10),M.wood);logs.position.set(7,.15,-2);ROOT.add(logs);box(6,8,0,.4,-1,-3,null);}

  // ---------- the Ice Field and the open channel ----------
  iceFloor(-20,20,-12,-40);
  bank(-22,-20,-12,-42,1.6);bank(20,22,-12,-42,1.6);
  // frozen rocks: the one at x -11.5 stops a block sliding west in line with the ramp across the channel
  for(const [x,z,s] of [[-11.6,-24,1.1],[14,-30,1.2],[-4,-34.6,.9],[-17,-16,1],[12,-16,.8]]){frock(x,z,s);box(x-s*.85,x+s*.85,0,1.4,z-s*.85,z+s*.85,null,{surface:'stone'});}
  const C=FR.chan;box(C.x0,C.x1,-1.6,-1.2,C.z1,C.z0,FM.rock,{fade:false,cast:false,surface:'stone'});
  {const w=new THREE.Mesh(new THREE.PlaneGeometry(C.x1-C.x0,2.2),M.water);w.rotation.x=-Math.PI/2;w.position.set(0,-.12,-41.1);ROOT.add(w);}
  // the north shore: a snow cliff except for a gap in line with the ramp
  bank(-22,-12,-42.2,-43.6,3);bank(-8,22,-42.2,-43.6,3);
  ICEB={pos:FR.blockHome.clone(),vel:new V3(),hw:1,h:1.2,kind:'iceblock',stepH:0,onGround:false,sunk:false,lostT:0,
    mesh:new THREE.Mesh(new THREE.BoxGeometry(2,1.2,2),FM.block)};ICEB.mesh.castShadow=true;ROOT.add(ICEB.mesh);
  ICEB.col=box(0,1,0,1,0,1,null,{kind:'iceblock',surface:'ice'});ICEB.col.body=ICEB;syncIceBlock();
  // the fishing hut (secret): its door is frozen shut
  {const hx=16,hz=-36;box(hx-2,hx+2,0,2.4,hz+1.8,hz+2.2,M.wood);box(hx-2,hx+2,0,2.4,hz-2.2,hz-1.8,M.wood);box(hx+1.8,hx+2.2,0,2.4,hz-2,hz+2,M.wood);
    box(hx-2.2,hx-1.8,1.4,2.4,hz-2,hz+2,M.wood,{fade:true});box(hx-2.2,hx-1.8,0,1.4,hz-2,hz-.7,M.wood);box(hx-2.2,hx-1.8,0,1.4,hz+.7,hz+2,M.wood);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(3.2,1.4,4),FM.cap);roof.rotation.y=Math.PI/4;roof.position.set(hx,3.1,hz);ROOT.add(roof);frs.roof=roof;markFade(roof);
    const d=addMelt('hut',hx-2,0,hz,.4,1.4,1.4,'Hold to melt the frozen door',()=>{});d.col=box(hx-2.2,hx-1.8,0,1.4,hz-.7,hz+.7,null);}

  // ---------- the north shore: the hub, the Narrows (east), the Snowfield (west), Hearth Island (north) ----------
  snowFloor(-12,4,-43.6,-56);snowFloor(-12,-6,-56,-64);snowFloor(-12,-8,-42.2,-43.6,0,2); // the hub, the path north, the ramp up from the channel
  // the Narrows: a bay of thin ice and dark water, the islet with the frozen lever, the sunken causeway
  const B=FR.bay;box(B.x0,B.x1,-1.8,-1.4,B.z0,B.z1,FM.rock,{fade:false,cast:false,surface:'stone'});
  {const w=new THREE.Mesh(new THREE.PlaneGeometry(B.x1-B.x0,B.z1-B.z0),M.water);w.rotation.x=-Math.PI/2;w.position.set((B.x0+B.x1)/2,-.14,(B.z0+B.z1)/2);ROOT.add(w);}
  snowFloor(21,27,-49,-55,0,2);FISL.push([21,27,-55,-49]);
  snowFloor(12.6,15.4,-56.6,-59.4,0,2);FISL.push([12.6,15.4,-59.4,-56.6]);                                   // the ring islet
  bank(4,32,-43.6,-44,1.4);bank(30,32,-44,-60,1.4);bank(4,32,-60,-61.6,1.4);bank(2,4,-56,-61.6,1.4);
  {const tiles=[],cut=(lo,hi,edges)=>{const e=[...new Set([lo,hi,...edges.filter(v=>v>lo&&v<hi)])].sort((a,b)=>a-b),out=[];
      for(let k=0;k<e.length-1;k++){const n=Math.max(1,Math.round((e[k+1]-e[k])/2.6));for(let m=0;m<n;m++)out.push([e[k]+(e[k+1]-e[k])*m/n,e[k]+(e[k+1]-e[k])*(m+1)/n]);}return out;};
    // the thin ice is cut exactly at the islets' and the causeway's edges, so it meets them with no gap
    const xs=cut(B.x0,B.x1,FISL.flatMap(r=>[r[0],r[1]]).concat([21])),zs=cut(B.z0,B.z1,FISL.flatMap(r=>[r[2],r[3]]).concat([-53.4,-50.6]));
    for(const [x0,x1] of xs)for(const [z0,z1] of zs){const cx=(x0+x1)/2,cz=(z0+z1)/2;
      if(FISL.some(([a,b,c,d])=>cx>a&&cx<b&&cz>c&&cz<d))continue;if(cz>-53.4&&cz<-50.6&&cx<21)continue;tiles.push([x0,x1,z0,z1]);}
    const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.25,1),FM.thin,tiles.length),m4=new THREE.Matrix4();
    tiles.forEach(([x0,x1,z0,z1],i)=>{const col=box(x0,x1,-.25,0,z0,z1,null,{kind:'thinice',surface:'ice'});THIN.push({col,i,t:0,broken:false,re:0,x0,x1,z0,z1});
      m4.makeScale(x1-x0-.04,1,z1-z0-.04);m4.setPosition((x0+x1)/2,-.125,(z0+z1)/2);im.setMatrixAt(i,m4);});
    im.receiveShadow=true;ROOT.add(im);frs.thinIM=im;}
  frs.causeCol=box(4,21,-1.8,0,-50.6,-53.4,null,{surface:'stone'});frs.causeCol.on=false;
  frs.causeM=new THREE.Mesh(boxGeo(17,1.8,2.8,3,0,0,0),FM.rock);frs.causeM.position.set(12.5,-.9,-52);frs.causeM.castShadow=true;ROOT.add(frs.causeM);
  addMelt('lever',24,0,-50.2,.7,1.1,.7,'Hold to melt the frozen lever',()=>{frs.cause=true;});
  addEmber(0,25.4,0,-53.4,'The Narrows');
  // the Snowfield: room to roll a snowball, the crevasse, the ledge beyond
  const V=FR.crev;snowFloor(-36,-12,-43.6,-50);snowFloor(-36,-12,-52.6,-64);bank(-38,-36,-43.6,-64,2.4);bank(-36,-12,-64,-65.6,2.4);
  box(V.x0,V.x1,-6.4,-6,V.z0,V.z1,FM.rock,{fade:false,cast:false});
  SNOWB={pos:FR.ballHome.clone(),r:.5,rot:new THREE.Quaternion(),bridged:false,lostT:0,mesh:new THREE.Mesh(new THREE.SphereGeometry(1,20,14),FM.snow)};SNOWB.mesh.castShadow=true;ROOT.add(SNOWB.mesh);
  SNOWB.col=box(0,1,0,1,0,1,null,{kind:'snowball',surface:'snow'});syncSnowball();
  frs.bridge=box(0,1,-6,0,V.z0,V.z1,null,{surface:'snow'});frs.bridge.on=false;
  addEmber(1,-24,0,-59,'The Snowfield');
  // Hearth Island: the hearth with three sockets, a frozen chimney, the ice cave, a big boulder (secret)
  snowFloor(-12,12,-64,-82);bank(-14,-12,-64,-82,2.4);bank(12,14,-64,-82,2.4);bank(-14,14,-82,-84,2.4);bank(-6,12,-62.4,-64,2.4);
  box(-2,2,0,3.4,-70,-74,FM.rock,{surface:'stone'});
  {const roof=new THREE.Mesh(new THREE.BoxGeometry(4.4,.3,4.4),M.wood);roof.position.set(0,3.45,-72);ROOT.add(roof);
    box(-.7,.7,3.4,4,-72.7,-71.3,FM.rock,{fade:false});
    frs.fire=new THREE.PointLight('#ff8a3a',0,26,1.6);frs.fire.position.set(0,2,-68.4);ROOT.add(frs.fire);
    frs.mouth=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.2),new THREE.MeshBasicMaterial({color:'#1b1310'}));frs.mouth.position.set(0,1,-69.98);ROOT.add(frs.mouth);
    frs.sockets=[];for(let k=0;k<3;k++){const e=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,0),FM.ember);e.position.set(-.9+k*.9,2.2,-69.85);e.visible=false;ROOT.add(e);frs.sockets.push(e);}}
  addMelt('flue',0,4,-72,1.2,.7,1.2,'Hold to melt the ice in the chimney',()=>{frs.flue=true;if(!G.ending&&!frostDone()){G.ending=true;G.endT=0;chapterComplete(4);}},()=>frs.placed>=3);
  box(-12,-6,0,3,-73.4,-74,FM.rock);box(-12,-6,0,3,-78,-78.6,FM.rock);box(-12,-6,3,3.6,-73.4,-78.6,FM.rock,{fade:true});
  {const w=addMelt('cave',-5.7,0,-76,.6,3,4,'Hold to melt the ice wall',()=>{});w.col=box(-6,-5.4,0,3,-74,-78,null);}
  addEmber(2,-9.4,0,-76,'Ice cave');
  frock(8,-78,1.9,3.2);box(6.4,9.6,0,3.2,-76.4,-79.6,null,{surface:'stone'});
  addWaystone('ch4_hearth','Hearth Island',6,0,-66.4,Math.PI);
  pines([[-13,6,1],[13,6,1.1],[-14,-4,1.2],[14,-6,1],[-10,-1,.8],[-24,-14,1.4],[24,-18,1.3],[-24,-30,1.2],[24,-34,1.4],[-37,-46,1.1],[-37,-60,1.2],[-13,-63.4,.8],[-12.8,-80,1.1],[10.6,-80.6,1],[31,-46,1.1],[31,-58,1.2]]);
  // ---------- collectibles ----------
  const S=[[-5,0,2],[5,0,-4],[-10,0,-8],[10,0,-8],
    [-14,0,-18],[0,0,-20],[16,0,-22],[-6,0,-28],[8,0,-30],[-16,0,-36],[2,0,-38],[16,0,-36],
    [-10,0,-47],[-2,0,-46],[2,0,-47.6],
    [8,0,-46],[16,0,-46],[22,0,-50],[26,0,-50],[14,0,-58],[14.6,0,-57.4],
    [-30,0,-45],[-26,0,-48.6],[-18,0,-45],[-14,0,-48.6],[-30,0,-56],[-18,0,-56],[-28,0,-62],
    [-9,0,-56],[-9,0,-61],
    [-8,0,-68],[8,0,-70],[-4,0,-80],[4,0,-80],[-10.6,0,-74.6],[-10.6,0,-77.4],[8,3.2,-78.6],[7.4,3.2,-77.2],
    [17,0,-36.6],[15,0,-35.4]];
  S.forEach(([x,y,z],i)=>addSeed('c4s'+i,x,y,z));
  addPetal('m12',16.6,0,-36);addPetal('m13',14,0,-58.4);addPetal('m14',8.6,3.2,-78);
  frs.beacon=makeBeacon();
  endRegion(R);
  buildSeedInstances('ch4');
}
// icy water: the channel, the bay (under broken thin ice), the crevasse floor counts as a fall
function frostWater(x,z){const C=FR.chan,B=FR.bay;return (x>C.x0&&x<C.x1&&z>C.z0&&z<C.z1)||(x>B.x0&&x<B.x1&&z>B.z0&&z<B.z1);}
function syncIceBlock(){const b=ICEB,c=b.col,hz=b.sunk?1.1:b.hw;c.min.set(b.pos.x-b.hw,b.pos.y,b.pos.z-hz);c.max.set(b.pos.x+b.hw,b.pos.y+b.h,b.pos.z+hz);}
function syncSnowball(){const b=SNOWB,c=b.col,r=b.r*.92;c.min.set(b.pos.x-r,b.bridged?-6:0,b.pos.z-r);c.max.set(b.pos.x+r,b.bridged?0:b.r*1.8,b.pos.z+r);}
// the Giant walking into the ice block sets it sliding along that axis until it hits something
function pushIceBlock(ax,d){const b=ICEB;if(b.sunk||!b.onGround||Math.abs(b.vel.x)+Math.abs(b.vel.z)>.1)return false;b.vel[ax]=Math.sign(d)*7.5;G.slideN=(G.slideN||0)+1;return false;}
// the Giant rolls the snowball: it moves with the push and grows on snow
function pushSnowball(ax,d){const b=SNOWB;if(b.bridged)return false;const old=b.pos[ax];b.pos[ax]+=d;syncSnowball();
  for(const c of colliders){if(!c.on||c===b.col||c.kind==='golem')continue;if(ovBox(b.col,c)){b.pos[ax]=old;syncSnowball();return false;}}
  const r0=b.r;b.r=Math.min(1.6,b.r+Math.abs(d)*.05);b.pos[ax]+=Math.sign(d)*(b.r-r0)*.92; // grows forward, away from the one pushing
  const axis=ax==='x'?new V3(0,0,-Math.sign(d)):new V3(Math.sign(d),0,0);b.rot.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,Math.abs(d)/b.r));syncSnowball();return true;}

// ================= state =================
function resetFrost(){
  const done=!!PROG.ch4.done;
  G.time=0;G.falls=0;G.throws=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;
  for(const M0 of MELTS){M0.done=done&&M0.id!=='hut'&&M0.id!=='cave'?true:false;M0.t=+M0.done;if(M0.col)M0.col.on=!M0.done;}
  if(done){for(const M0 of MELTS){M0.done=true;M0.t=1;if(M0.col)M0.col.on=false;}}
  frs.gate.open=done;frs.gate.t=+done;frs.gate.col.on=!done;
  const b=ICEB;b.pos.copy(done?new V3(FR.rampX,-1.2,-41.1):FR.blockHome);b.vel.set(0,0,0);b.sunk=done;b.lostT=0;syncIceBlock();
  const s=SNOWB;s.r=done?1.45:.5;s.bridged=done;s.lostT=0;s.pos.copy(done?new V3(-24,0,-51.3):FR.ballHome);syncSnowball();setSnowBridge();
  frs.cause=done;frs.causeT=+done;frs.causeCol.on=done;
  for(const t of THIN){t.broken=false;t.t=0;t.re=0;t.col.on=true;}
  for(const e of EMBERS){e.state=done?'placed':'rest';e.pos.copy(e.home);}
  frs.placed=done?3:0;frs.flue=done;
  golem.runes=0;golem.holding=false;golem.charging=false;golem.pound=false;sprite.held=false;sprite.melting=null;
  placeAt(golem,FCP.g);placeAt(sprite,FCP.s);golem.yaw=sprite.yaw=Math.PI;hintsShown.clear();camSnap=true;
}
function frostDone(){return !!PROG.ch4.done;}
function setSnowBridge(){const s=SNOWB,c=frs.bridge;if(s.bridged){c.min.set(s.pos.x-s.r,-6,FR.crev.z0);c.max.set(s.pos.x+s.r,0,FR.crev.z1);c.on=true;}else c.on=false;}
function emberTarget(){const g=golem;for(const e of EMBERS)if(e.state==='rest'&&emberReach(g,e))return e;return null;}
function golemFrostAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,FR.hearth)<3&&g.pos.y<1){for(const e of EMBERS)if(e.state==='carried'){e.state='placed';frs.placed++;}g.runes=0;return true;}
  const e=emberTarget();if(e){e.state='carried';g.runes++;G.pick++;return true;}
  return false;
}
// ---- per step ----
function stepFrostA(dt,IS){
  const s=sprite;
  // melting: hold interact next to something frozen
  if(s.melting){const M0=s.melting;if(!IS.act||s.held||M0.done||!meltReach(s,M0))s.melting=null;
    else{M0.t=Math.min(1,M0.t+dt/1.6);if(M0.t>=1){M0.done=true;if(M0.col)M0.col.on=false;s.melting=null;G.meltN=(G.meltN||0)+1;G.lastMelt=M0.id;M0.onDone();}}}
}
function stepFrostB(dt){
  const g=golem;
  // the ice block slides until something stops it; in the channel it sinks level with the ice
  const b=ICEB;
  if(!b.sunk){b.vel.y-=GRAV*dt;moveBody(b,dt,listFor(b).filter(c=>c.kind!=='golem'));
    if(b.onGround&&Math.abs(b.vel.x)+Math.abs(b.vel.z)<.05)b.vel.x=b.vel.z=0;
    syncIceBlock();if(b.pos.y<-1.1&&b.onGround){b.sunk=true;b.vel.set(0,0,0);b.pos.z=(FR.chan.z0+FR.chan.z1)/2;b.pos.y=-1.2;syncIceBlock();G.sinkN=(G.sinkN||0)+1;} // settles to fill the channel edge to edge
    for(const o of [golem,sprite])if(!(o===sprite&&sprite.held))depenetrate(o,b.col);syncGolemCol();}
  else if(Math.abs(b.pos.x-FR.rampX)>1.2){b.lostT+=dt;if(b.lostT>2.5){b.pos.copy(FR.blockHome);b.vel.set(0,0,0);b.sunk=false;b.lostT=0;syncIceBlock();G.blockBackN=(G.blockBackN||0)+1;}}
  // the snowball: into the crevasse it goes (a bridge if it is big enough, otherwise lost and remade)
  const s=SNOWB,V=FR.crev;
  if(!s.bridged&&s.pos.z<V.z1+.2&&s.pos.z>V.z0-1){if(s.r>=1.3){s.bridged=true;s.pos.z=(V.z0+V.z1)/2;syncSnowball();setSnowBridge();G.snowN=(G.snowN||0)+1;}
    else{s.lostT+=dt;if(s.lostT>.01){s.pos.copy(FR.ballHome);s.r=.5;s.lostT=0;syncSnowball();G.snowLostN=(G.snowLostN||0)+1;}}}
  // thin ice cracks under the Giant (and freezes over again a little later)
  for(const t of THIN){if(t.broken){t.re-=dt;if(t.re<=0&&!ov(golem,t.col)&&!ov(sprite,t.col)){t.broken=false;t.col.on=true;t.t=0;}continue;}
    if(g.onGround&&g.ground===t.col){t.t+=dt;if(t.t>.3){t.broken=true;t.col.on=false;t.re=6;G.crackN++;}}else t.t=Math.max(0,t.t-dt);}
  frs.causeT=approach(frs.causeT,frs.cause?1:0,dt/2.4);const on=frs.causeT>.97;if(on&&!frs.causeCol.on)liftOnto(frs.causeCol);frs.causeCol.on=on;
  frs.gate.t=approach(frs.gate.t,frs.gate.open?1:0,dt/1.2);frs.gate.col.on=frs.gate.t<.6;
}
// ================= visuals =================
function updateFrostVis(dt,t){
  const rf=PROG.settings.reduceFlash;
  ICEB.mesh.position.set(ICEB.pos.x,ICEB.pos.y+.6,ICEB.pos.z);ICEB.mesh.scale.z=ICEB.sunk?1.1:1;
  const s=SNOWB;s.mesh.position.set(s.pos.x,s.bridged?-s.r*.55:s.r*.92,s.pos.z);s.mesh.scale.set(s.r,s.bridged?s.r*.8:s.r*.92,s.r);s.mesh.quaternion.copy(s.rot);
  for(const M0 of MELTS){const k=1-M0.t;M0.m.visible=!M0.done;M0.m.scale.set(.3+.7*k,.2+.8*k,.3+.7*k);M0.m.position.y=M0.pos.y+M0.h*(.2+.8*k)/2;
    M0.m.material.emissive=M0.m.material.emissive||new THREE.Color();
    if(sprite.melting===M0&&!rf&&Math.random()<dt*30)emit(M0.pos.x+(Math.random()-.5)*M0.w,M0.pos.y+M0.h*k,M0.pos.z+(Math.random()-.5)*M0.d,0,1.2,0,.95,.97,1,.12,1.2,-.4,.3);}
  frs.gate.g.rotation.y=-frs.gate.t*1.9;
  const im=frs.thinIM,m4=new THREE.Matrix4();let dirty=false;
  for(const tl of THIN){const want=tl.broken?0:1;if(tl.vis!==want){tl.vis=want;dirty=true;m4.makeScale((tl.x1-tl.x0-.04)*want||1e-4,want||1e-4,(tl.z1-tl.z0-.04)*want||1e-4);m4.setPosition((tl.x0+tl.x1)/2,-.125,(tl.z0+tl.z1)/2);im.setMatrixAt(tl.i,m4);}}
  if(dirty)im.instanceMatrix.needsUpdate=true;
  frs.causeM.position.y=-.9-(1-smooth(0,1,frs.causeT))*1.6;
  for(const e of EMBERS){const vis=e.state==='rest';e.m.visible=e.glow.visible=vis;if(vis){const y=e.pos.y+.5+Math.sin(t*1.8+e.i)*.07;e.m.position.set(e.pos.x,y,e.pos.z);e.m.rotation.y=t;e.glow.position.set(e.pos.x,y,e.pos.z);e.glow.material.opacity=rf?.7:.6+.2*Math.sin(t*3+e.i);}}
  frs.sockets.forEach((m,i)=>m.visible=i<frs.placed);
  const fire=frs.flue||frostDone()?1:frs.placed/3*.35;frs.fire.intensity=approach(frs.fire.intensity,fire*(rf?2:2+.4*Math.sin(t*9)),dt*2);
  frs.mouth.material.color.set(frs.flue||frostDone()?'#ff8a3a':'#1b1310');
  if((frs.flue||frostDone())&&Math.random()<dt*20)emit((Math.random()-.5)*.6,4.6,-72+(Math.random()-.5)*.6,0,1.4,0,.75,.72,.7,.2,2.4,-.3,.3);
  frs.veil.material.opacity=rf?.24:.2+.1*Math.sin(t*1.6);
  // gentle snowfall around the camera
  if(!rf&&Math.random()<dt*14)emit(camTarget.x+(Math.random()-.5)*26,camTarget.y+8+Math.random()*4,camTarget.z+(Math.random()-.5)*26,(Math.random()-.5)*.3,-1.2,(Math.random()-.5)*.3,1,1,1,.07,7,0,.05);
}
// ================= the Vale: frost lilies along the river once the fourth root wakes =================
function buildValeLilies(){
  const n=60,im=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.16,0),new THREE.MeshLambertMaterial({color:'#dff4ff',emissive:'#7fc8e8',emissiveIntensity:.35}),n),m4=new THREE.Matrix4();
  for(let i=0;i<n;i++){const x=-110+i*3.7+hash2(i,1,4)*2,z=riverZ(x)+(i%2?1:-1)*(RIVER_W+2.2+hash2(i,2,4)*2);m4.makeTranslation(x,valeH(x,z)+.15,z);im.setMatrixAt(i,m4);}
  im.visible=false;ROOT.add(im);VALE.lilies=im;
}
function updateValeLilies(){if(VALE.lilies)VALE.lilies.visible=PROG.roots>=4&&!(G.scene==='root4'&&G.line<1);}
