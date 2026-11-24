// ================= Chapter 1 additions: terraced east garden, secret cellar, flooded west garden =================
const POOL={x0:-36,x1:-16,z0:-63,z1:-47,y:-.3};
const CELLAR={x0:30,x1:40,z0:-5,z1:3,floor:-3,hole:{x0:33,x1:37,z0:-2.4,z1:0}};
const SEESAW={x:24,z:-13.5,A:.2,pivot:.75,half:3.2};
const seesaw={tilt:-1,tiltT:-1,hold:0,segs:[],plank:null,launches:0,big:0};
const crack={broken:false,col:null,mesh:null};
const stones={raised:false,t:0,list:[]};
const exitGate={pos:new V3(0,0,4.4)};

function buildCh1Extras(){
  // ---------- exit gate back to the Vale (south wall gets an opening) ----------
  const g=prop('gate');if(CH1R.on)realifyProp(g);g.position.set(0,-.05,4.5);g.rotation.y=Math.PI;g.scale.setScalar(.82);ROOT.add(g);
  {const gm=[];g.traverse(o=>{if(o.isMesh)gm.push(o);});if(gm.length)markFadeGroup(gm);}
  for(const s of [-1,1])box(s>0?2.62:-4.3,s>0?4.3:-2.62,0,6.5,3.3,5.7,null,{surface:'stone'});
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(5.2,7.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  veil.position.set(0,3.9,4.9);ROOT.add(veil);exitGate.veil=veil;
  const lab=labelSprite('The Vale','Walk through together','#1fb3a3');lab.scale.set(4.4,1.4,1);lab.position.set(0,9,4.6);ROOT.add(lab);
  addWaystone('ch1_court','Courtyard',8.2,0,1.2,Math.PI);

  // ---------- east: terraced garden ----------
  wall(11,41,4,5,3);wall(40,41,4,-24,4);wall(11,26.8,-23,-24,4.5);wall(29.2,41,-23,-24,4.5);box(26.8,29.2,0,4.5,-23,-24,M.wall); // the aqueduct walk leaves over the gap
  // opening from the courtyard gets a stone arch frame
  box(10,11,3.4,4,-1,-6,M.wallTop,{collide:false,fade:true});
  // raised terrace along the east wall with two steps
  box(34,35,0,.4,-6,-23,M.stone);box(35,40,0,.8,-6,-23,M.wall,{fade:false});box(34.94,40,.8,.92,-5.94,-23,M.wallTop,{fade:false});
  addUrn(38.6,-7.2,1.1);addUrn(38.6,-21.6,1.1);addBush(37.5,-12,1.3,3);addBush(37.8,-18,1.1,4);
  // the seesaw
  const ss=prop('seesaw',true);if(CH1R.on)realifyProp(ss);ss.position.set(SEESAW.x,0,SEESAW.z);ROOT.add(ss);
  const ful=propPart(ss,'Seesaw_Fulcrum');if(ful)ful.scale.y=.72;
  seesaw.plank=propPart(ss,'Seesaw_Plank');if(seesaw.plank)seesaw.plank.position.y=SEESAW.pivot;
  box(SEESAW.x-.9,SEESAW.x+.9,0,.62,SEESAW.z-.8,SEESAW.z+.8,null,{surface:'stone'});
  for(let i=0;i<4;i++){const c=box(0,1,0,1,0,1,null,{kind:'seesaw',surface:'wood'});c.lx=-2.4+i*1.6;seesaw.segs.push(c);}
  syncSeesaw();
  const sl=labelSprite('Seesaw','Giant jumps on the orange end','#f2873a');sl.scale.set(3.4,1.08,1);sl.position.set(SEESAW.x,4.6,SEESAW.z+1.2);ROOT.add(sl);seesaw.label=sl;
  // a stone ledge the Sprite reaches with an ordinary launch
  box(29,33,0,2.6,-10,-16,M.wall);box(28.94,33.06,2.6,2.72,-9.94,-16.06,M.wallTop,{fade:false});
  // the hidden balcony: only a ground-pound launch gets the Sprite this high
  box(25,31,0,4.8,-17,-23,M.wall);box(24.94,31.06,4.8,4.94,-16.94,-23,M.wallTop,{fade:false});
  box(25,25.3,4.94,5.5,-17,-20.6,M.stone,{fade:false});box(30.7,31,4.94,5.5,-17,-23,M.stone,{fade:false}); // the west rail stops short: the stair arrives at the back
  box(25,26.4,4.94,5.5,-16.95,-17.25,M.stone,{fade:false});box(29.6,31,4.94,5.5,-16.95,-17.25,M.stone,{fade:false});
  // a doorway at the back of the balcony: the old aqueduct walk to the Hanging Orchard
  box(26.6,29.4,7.4,7.7,-22.7,-23.1,M.wallTop,{collide:false,fade:true});
  addColumn(13.5,-18.6,3.4,.42,false);addColumn(20.5,-18.4,2.2,.42,true);addColumn(16,-3.5,1.4,.42,true);
  addRock(20,.15,2.6,.6,12.1,true);addRock(33.5,.15,-19.5,.5,13.3,false);
  // ---------- the cracked floor and the cellar beneath it ----------
  const C=CELLAR,Hh=C.hole;
  box(C.x0,C.x1,C.floor-.4,C.floor,C.z0,C.z1,M.pave,{cast:false,fade:false});
  for(const [a,b,c,d] of [[C.x0-.4,C.x0,C.z0-.4,C.z1+.4],[C.x1,C.x1+.4,C.z0-.4,C.z1+.4],[C.x0,C.x1,C.z0-.4,C.z0],[C.x0,C.x1,C.z1,C.z1+.4]])box(a,b,C.floor,-.4,c,d,M.wall,{fade:false,cast:false});
  // ceiling = the garden floor, with a cracked slab over the hole. It fades when someone is below.
  for(const [a,b,c,d] of [[C.x0,Hh.x0,C.z0,C.z1],[Hh.x1,C.x1,C.z0,C.z1],[Hh.x0,Hh.x1,C.z0,Hh.z0],[Hh.x0,Hh.x1,Hh.z1,C.z1]])box(a,b,-.4,0,c,d,M.ground,{fade:true,cast:false});
  crack.col=box(Hh.x0,Hh.x1,-.4,0,Hh.z0,Hh.z1,M.crack,{kind:'crack',fade:false,cast:false,surface:'stone'});crack.mesh=crack.col.mesh;crack.mesh.geometry=new THREE.BoxGeometry(Hh.x1-Hh.x0,.4,Hh.z1-Hh.z0);
  // a rubble step and mound under the hole so both can climb back out
  box(Hh.x0,Hh.x0+1.2,C.floor,-1.0,Hh.z0,Hh.z1,M.rock,{fade:false});box(Hh.x0+1.2,Hh.x0+2.4,C.floor,-2.0,Hh.z0,Hh.z1,M.rock,{fade:false}); // mound, step, then an open strip down to the floor
  // a faded mural of two figures on the cellar wall
  const mural=new THREE.Mesh(new THREE.PlaneGeometry(4,1.8),new THREE.MeshLambertMaterial({map:muralTexture(),emissive:'#3a2c22',emissiveIntensity:.35}));mural.position.set(37,-1.6,C.z0+.02);ROOT.add(mural);
  for(const [x,z] of [[31,2],[39,2],[39,-4.2]]){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.22),M.gem);m.position.set(x,C.floor+.3,z);m.scale.y=1.6;ROOT.add(m);}

  // ---------- west: the flooded garden ----------
  wall(-41,-11,-43.6,-44,3.5);wall(-41,-11,-66,-66.4,3.5);wall(-41,-40.6,-43.6,-66.4,3.5);
  box(-11,-10,3.4,4,-52.5,-56.5,M.wallTop,{collide:false,fade:true});
  const P=POOL;
  box(P.x0,P.x1,-1.6,-1.2,P.z0,P.z1,M.cliffDark,{cast:false,fade:false});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(P.x1-P.x0,P.z1-P.z0),M.water);water.rotation.x=-Math.PI/2;water.position.set((P.x0+P.x1)/2,P.y,(P.z0+P.z1)/2);ROOT.add(water);
  const stone=(x,z,r,top,mat)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.08,top+1.2,14),mat||M.stone);m.position.set(x,(top-1.2)/2,z);m.castShadow=m.receiveShadow=true;ROOT.add(m);return {m,col:box(x-r,x+r,-1.2,top,z-r,z+r,null,{surface:'stone'})};};
  stone(-17.4,-55,.7,.25);stone(-19.6,-54.4,.7,.25);stone(-21.8,-55.2,.7,.25);
  box(-26,-23,-1.2,.25,-53.5,-56.5,M.pave,{fade:false});                    // middle platform
  stone(-34,-55,2.4,.25,M.pave);                                              // the island
  for(const [x,z] of [[-27.3,-55],[-29,-54.6],[-30.6,-55.2]]){const s=stone(x,z,.7,.25);s.col.on=false;stones.list.push(s);}
  stones.home=stones.list.map(s=>s.m.position.y);
  levers.push(makeLever(-33.3,-57.6,0,'stones',.25));
  // lily pads and reeds
  for(let i=0;i<16;i++){const x=lerp(P.x0+1,P.x1-1,hash2(i,1,61)),z=lerp(P.z0+1,P.z1-1,hash2(i,2,61));if(Math.abs(z+55)<2.6)continue;
    const pad=new THREE.Mesh(new THREE.CircleGeometry(.35+hash2(i,3,61)*.3,10),M.leaf2);pad.rotation.x=-Math.PI/2;pad.position.set(x,P.y+.02,z);ROOT.add(pad);}
  for(let i=0;i<22;i++){const side=i%2,x=side?lerp(P.x0,P.x1,hash2(i,4,62)):(hash2(i,6,62)<.5?P.x0+.3:P.x1-.3),z=side?(hash2(i,5,62)<.5?P.z0+.3:P.z1-.3):lerp(P.z0,P.z1,hash2(i,7,62));
    const r=new THREE.Mesh(new THREE.ConeGeometry(.08,1.1,4),M.leafDark);r.position.set(x,P.y+.5,z);ROOT.add(r);}
  addUrn(-13,-46,1);addUrn(-13,-64.6,1);addCypress(-38.5,-46,1.2,31);addCypress(-38.5,-64,1.2,32);addTree(-38,-55,1.1,33);

  // ---------- collectibles ----------
  const S=[[-3,0,0],[3,0,-4],[-7.5,2.4,-6.8],[8,0,-10],[0,0,-17],[-5,0,-12],
    [14,0,-3],[18,0,1],[22,0,-6],[19,0,-20],[36,.92,-9],[37.5,.92,-15],[36,.92,-21],
    [30,2.72,-12],[32,2.72,-12],[31,2.72,-14.5],
    [26.4,4.94,-19],[28,4.94,-21],[29.6,4.94,-19],
    [31,-3,1.5],[32,-3,-3.5],[38,-3,-3.5],[38.5,-3,1.5],
    [-6,0,-24.5],[6,0,-25],[-3,0,-36],[8,0,-41],
    [-2,0,-50],[3,0,-58],[8.6,0,-54],[-8,0,-46.2],
    [-14,0,-50],[-14,0,-60],[-19.6,.25,-54.4],[-24.5,.25,-55],[-33,.25,-53.6],[-35,.25,-56.4],
    [-6,0,-68],[6,0,-76],[0,0,-79]];
  S.forEach(([x,y,z],i)=>addSeed('c1s'+i,x,y,z));
  addPetal('m1',28,4.94,-21.6);
  addPetal('m2',37,-3,-.4);
  addPetal('m3',-34.6,.25,-55);
}
// soft painted mural for the cellar: a big figure and a tiny glowing one holding a seed
function muralTexture(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=230;const c=cv.getContext('2d');
  c.fillStyle='#cdb48e';c.fillRect(0,0,512,230);c.globalAlpha=.85;
  c.fillStyle='#a47e5a';c.beginPath();c.ellipse(190,150,58,72,0,0,7);c.fill();c.beginPath();c.arc(190,62,30,0,7);c.fill();
  c.fillStyle='#5fb8a0';c.beginPath();c.arc(300,120,13,0,7);c.fill();c.globalAlpha=.4;c.beginPath();c.arc(300,120,30,0,7);c.fill();c.globalAlpha=.85;
  c.fillStyle='#d9a441';c.beginPath();c.ellipse(250,150,12,16,0,0,7);c.fill();
  c.strokeStyle='#8a6448';c.lineWidth=6;c.beginPath();c.moveTo(20,215);c.quadraticCurveTo(256,170,492,215);c.stroke();
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t;
}
function crackTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');
  c.fillStyle='#c9c4b6';c.fillRect(0,0,256,256);c.strokeStyle='#6f6656';c.lineCap='round';
  const branch=(x,y,a,len,w,d)=>{if(d>4||len<8)return;c.lineWidth=w;c.beginPath();c.moveTo(x,y);const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;c.lineTo(x2,y2);c.stroke();
    branch(x2,y2,a+(hash2(d,len|0,3)-.5)*1.2,len*.75,w*.7,d+1);if(hash2(d,len|0,9)>.45)branch(x2,y2,a+(hash2(d,len|0,5)-.2)*1.6,len*.55,w*.6,d+1);};
  for(let k=0;k<5;k++)branch(128,128,k/5*6.28+.4,56,7,0);
  c.strokeStyle='#8f8676';c.lineWidth=5;c.strokeRect(3,3,250,250);
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=ANISO;return t;
}
function syncSeesaw(){
  const a=seesaw.tilt*SEESAW.A;
  if(seesaw.plank)seesaw.plank.rotation.z=a;
  for(const c of seesaw.segs){const top=SEESAW.pivot+Math.sin(a)*c.lx+.09;c.min.set(SEESAW.x+c.lx-.8,top-.3,SEESAW.z-.65);c.max.set(SEESAW.x+c.lx+.8,top,SEESAW.z+.65);}
}
function onSeesaw(b,side){const c=b.ground;if(!c||c.kind!=='seesaw'||!b.onGround)return false;return side<0?c.lx<0:c.lx>0;}
