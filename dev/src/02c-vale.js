// ================= the Everbloom Vale: the open hub around the Heart Tree =================
// About 230 m of walkable land inside a ring of soft mountains. The Heart Tree stands in the middle.
const RIVER=[[-175,64],[-120,46],[-78,57],[-36,44],[0,52],[42,41],[84,56],[128,44],[175,54]];
const RIVER_W=5;              // half width of the flat bed; banks slope 5 m beyond
const RIVER_BED=-1.9,RIVER_WATER=-.75;
const VALE_HILL={x:72,z:-66};
const VALE_SPAWN={g:[-1.6,0,88],s:[1.6,0,88]};
// side caves cut into the hills at the edge (built in 02h-caves.js); the ground is flattened where they are
const CAVES=[{id:'grotto',name:'Glow-worm Grotto',x:-110,z:26,dir:-1,len:16,w:8},{id:'echo',name:'Echo Cave',x:110,z:22,dir:1,len:16,w:8}];
function caveRect(c){const a=c.x-c.dir*3.5,b=c.x+c.dir*(c.len+1.6);return {x0:Math.min(a,b),x1:Math.max(a,b),z0:c.z-c.w/2-1.6,z1:c.z+c.w/2+1.6};}
function caveDist(c,x,z){const r=caveRect(c);return Math.max(r.x0-x,x-r.x1,r.z0-z,z-r.z1);}
function inCave(x,z,m){for(const c of CAVES)if(caveDist(c,x,z)<(m||0))return c;return null;}
function riverDist(x,z){let best=1e9;for(let i=0;i<RIVER.length-1;i++){const [ax,az]=RIVER[i],[bx,bz]=RIVER[i+1];const dx=bx-ax,dz=bz-az;
  const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);const d=Math.hypot(x-ax-dx*t,z-az-dz*t);if(d<best)best=d;}return best;}
function riverZ(x){for(let i=0;i<RIVER.length-1;i++){const [ax,az]=RIVER[i],[bx,bz]=RIVER[i+1];if(x>=ax&&x<=bx)return lerp(az,bz,(x-ax)/(bx-ax));}return 50;}
function valeBase(x,z){
  let h=.9*Math.sin(x*.031+1.3)*Math.cos(z*.027-.4)+.7*Math.sin((x+z)*.019+2.1)+.45*Math.cos(x*.05-z*.04);
  h+=2.6*smooth(36,0,Math.hypot(x,z));                                  // the Heart Tree's mound
  h+=7.5*smooth(26,3,Math.hypot(x-VALE_HILL.x,z-VALE_HILL.z));           // the lookout hill
  const e=Math.max(Math.abs(x),Math.abs(z));if(e>108){const k=(e-108)/30;h+=Math.pow(k,1.5)*15+fbm(x*.02+9,z*.02+3,1e6,3,41)*14*smooth(0,.8,k);} // wooded hills ring the Vale
  return h;
}
CAVES.forEach(c=>c.f=valeBase(c.x-c.dir*3,c.z));
const BRIDGES=[0,-78,84].map(x=>{const z=riverZ(x);return {x,z,y:(valeBase(x,z-11)+valeBase(x,z+11))/2+.05};});
function valeH(x,z){
  let h=valeBase(x,z);
  for(const b of BRIDGES){const ax=Math.abs(x-b.x),az=Math.abs(z-b.z);if(ax<6&&az<16)h=lerp(h,b.y,smooth(6,3.2,ax)*smooth(16,10,az));}
  const d=riverDist(x,z);if(d<RIVER_W+5)h=lerp(h,RIVER_BED,smooth(RIVER_W+5,RIVER_W,d));
  for(const c of CAVES){const cd=caveDist(c,x,z);if(cd<3)h=lerp(h,c.f,smooth(3,0,cd));}
  return h;
}
const VALE_PATHS=[[[0,92],[0,62],[0,40],[0,30]],[[0,-30],[0,-70],[0,-104]],[[72,-66],[52,-50],[26,-22]],[[-14,80],[-6,84]],[[7,-100],[0,-96]]];
function pathDist(x,z){let best=1e9;
  for(const P of VALE_PATHS)for(let i=0;i<P.length-1;i++){const [ax,az]=P[i],[bx,bz]=P[i+1];const dx=bx-ax,dz=bz-az;const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,Math.hypot(x-ax-dx*t,z-az-dz*t));}
  const r=Math.hypot(x,z);best=Math.min(best,Math.abs(r-31));   // ring path around the tree
  return best;}
const _vc=new THREE.Color(),_vc2=new THREE.Color();
const VCOL={grass:new THREE.Color('#8cc75e'),grass2:new THREE.Color('#9fd068'),meadow:new THREE.Color('#7cbd57'),sand:new THREE.Color('#e2cfa2'),path:new THREE.Color('#ecdcb4'),hill:new THREE.Color('#78b062'),rock:new THREE.Color('#bcae99')};
function valeColor(x,z,h,out){
  const n=fbm(x*.012+40,z*.012+40,1e6,2,77);
  out.copy(VCOL.meadow).lerp(VCOL.grass2,smooth(.35,.7,n));
  const e=Math.max(Math.abs(x),Math.abs(z));out.lerp(VCOL.hill,smooth(108,122,e));out.lerp(VCOL.rock,smooth(12,22,h)*.85);
  out.lerp(VCOL.path,smooth(2.2,1.1,pathDist(x,z))*.85);
  const d=riverDist(x,z);out.lerp(VCOL.sand,smooth(RIVER_W+3.5,RIVER_W+1,d));
  return out;
}
// the parts of the Vale that change as roots wake
const VALE={wake:0,wakeT:0,river:null,foliage:[],ground:null,tree:null,roots:[],leaf:null,blossom:null,beds:[],gates:[]};
const GATES=[];
// chapters built so far; a gate opens once the chapter before it is complete
function chapterOpens(n){return n>=2&&n<=4;}
function gateReady(n){return n===1||(n===2&&!!PROG.ch1.done)||(n===3&&!!PROG.ch2.done)||(n===4&&!!PROG.ch3.done);}
const CHAPTERS=[
  {n:1,name:'The Sunken Garden',ready:true},{n:2,name:'The Lantern Mines'},{n:3,name:'The Windmill Heights'},{n:4,name:'The Frostmere Lake'},
  {n:5,name:'The Mushroom Marsh'},{n:6,name:'The Clockwork Library'},{n:7,name:'The Sunstone Desert'}];

function buildVale(){
  curBuild='vale';
  const R=beginRegion('vale',{name:'The Everbloom Vale',short:'The Vale',terrain:valeH,fog:[90,330],fogReal:[120,620],spawn:VALE_SPAWN,
    hazard:b=>VALE.wake>.5&&riverDist(b.pos.x,b.pos.z)<RIVER_W+2.2&&b.pos.y<RIVER_WATER-.35&&!onBridge(b)});
  // ---------- ground ----------
  const S=340,N=170,geo=new THREE.PlaneGeometry(S,S,N,N);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,cols=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=valeH(x,z);pos.setY(i,h);
    const e=Math.max(Math.abs(x),Math.abs(z));let wp=smooth(2.1,.9,pathDist(x,z)),wr=smooth(RIVER_W+3.8,RIVER_W+.6,riverDist(x,z)),wk=Math.max(smooth(16,30,h)*.7,inCave(x,z,1.5)?.95:0);
    const sum=wp+wr+wk;if(sum>1){wp/=sum;wr/=sum;wk/=sum;}cols[i*3]=wp;cols[i*3+1]=wr;cols[i*3+2]=wk;}
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.computeVertexNormals();
  VALE.groundMat=REAL.ready?terrainMaterial():new THREE.MeshLambertMaterial({vertexColors:true});
  const ground=new THREE.Mesh(geo,VALE.groundMat);ground.receiveShadow=true;ROOT.add(ground);VALE.ground=ground;
  // keep everyone inside the Vale
  for(const [a,b,c,d] of [[-130,130,-131,-128],[-130,130,128,131],[-131,-128,-130,130],[128,131,-130,130]])box(a,b,-20,60,c,d,null);
  // ---------- river (dry until the first root wakes) ----------
  const pts=[];for(let x=-175;x<=175;x+=5)pts.push(new V3(x,0,riverZ(x)));
  const rg=new THREE.BufferGeometry(),rv=[],ri=[];
  pts.forEach((p,i)=>{const q=pts[Math.min(i+1,pts.length-1)],o=pts[Math.max(i-1,0)];const dx=q.x-o.x,dz=q.z-o.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;const w=RIVER_W+2.6;
    rv.push(p.x+nx*w,RIVER_WATER,p.z+nz*w,p.x-nx*w,RIVER_WATER,p.z-nz*w);if(i){const k=i*2;ri.push(k-2,k-1,k,k-1,k+1,k);}});
  rg.setAttribute('position',new THREE.Float32BufferAttribute(rv,3));rg.setIndex(ri);rg.computeVertexNormals();
  const rmat=M.water.clone();rmat.opacity=.9;rmat.side=THREE.DoubleSide;VALE.river=new THREE.Mesh(rg,rmat);VALE.river.visible=false;
  if(REAL.ready&&REAL.tex.water)buildWater();else ROOT.add(VALE.river);
  // ---------- bridges ----------
  for(const b of BRIDGES){const m=prop('bridge');if(REAL.ready)realifyProp(m);m.rotation.y=Math.PI/2;m.scale.set(1.3,1,1);m.position.set(b.x,b.y-.1,b.z);ROOT.add(m);
    const L=7.5*1.3;box(b.x-2.3,b.x+2.3,b.y-.55,b.y,b.z-L,b.z+L,null,{surface:'stone'});
    box(b.x-2.3,b.x-1.95,b.y,b.y+1.0,b.z-L,b.z+L,null);box(b.x+1.95,b.x+2.3,b.y,b.y+1.0,b.z-L,b.z+L,null);}
  // ---------- the Heart Tree ----------
  const th=valeH(0,0)-.25;
  const real=REAL.ready&&buildRealHeartTree(th);
  if(real){VALE.tree=real;const ox=-.07*2.3,oz=-.4*2.3;
    box(ox-3.6,ox+3.6,th,th+40,oz-3.6,oz+3.6,null,{surface:'wood'});
}
  else{const tree=prop('tree',true);tree.position.set(0,th,0);ROOT.add(tree);VALE.tree=tree;
  for(let k=1;k<=7;k++){const r=propPart(tree,'HT_Root'+k);if(r)VALE.roots.push(r);}
  VALE.leaf=meshesByMat(tree,'Leaf')[0];VALE.blossom=meshesByMat(tree,'Blossom')[0];
  box(-4.6,4.6,th,th+40,-4.6,4.6,null);
  for(let k=0;k<7;k++){const a=k/7*Math.PI*2+.2;
    for(const [r,s,hh] of [[6.6,3.2,3.6],[9.6,2.6,2.0],[12.6,2.0,1.05],[15.2,1.4,.5]]){const x=Math.cos(a)*r,z=-Math.sin(a)*r,y=valeH(x,z);box(x-s/2,x+s/2,y-1,th+hh,z-s/2,z+s/2,null,{surface:'wood'});}}}
  const tl=new THREE.PointLight('#9fe8d6',0,30,2);tl.position.set(0,th+8,0);scene.add(tl);VALE.treeLight=tl;
  // ---------- region gates around the edge ----------
  const gateAt=[[0,-108],[78,-72],[104,-8],[78,74],[-78,74],[-104,-8],[-78,-72]];
  CHAPTERS.forEach((c,i)=>{
    const [x,z]=gateAt[i],y=valeH(x,z),rot=Math.atan2(-x,-z);
    const g=prop('gate',true);if(REAL.ready)realifyProp(g);g.position.set(x,y-.1,z);g.rotation.y=rot;ROOT.add(g);
    const key=meshesByMat(g,'Glow');
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(6.4,9.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false}));
    veil.position.set(0,4.8,0);g.add(veil);
    const lab=labelSprite(c.n+' · '+c.name,c.ready?'Chapter '+c.n:'Sealed',c.ready?'#f2873a':'#9aa7b0');lab.position.set(x,y+14.6,z);ROOT.add(lab);
    // a chapter that opens during play gets a second label to swap in
    let labOpen=null;if(chapterOpens(c.n)){labOpen=labelSprite(c.n+' · '+c.name,'Chapter '+c.n,'#f2873a');labOpen.position.copy(lab.position);labOpen.visible=false;ROOT.add(labOpen);}
    // pillars (approximated as squares) + a barrier in the opening for sealed gates
    const fx=Math.cos(rot),fz=-Math.sin(rot); // gate's local +x axis in world
    for(const s of [-1,1]){const px=x+fx*4.2*s,pz=z+fz*4.2*s;box(px-1.3,px+1.3,y-1,y+8,pz-1.3,pz+1.3,null,{surface:'stone'});}
    const bar=box(x-3,x+3,y-1,y+8,z-3,z+3,null,{kind:'door'});bar.on=!c.ready;
    if(c.ready||chapterOpens(c.n)){const bx=x-Math.sin(rot)*4.6,bz=z-Math.cos(rot)*4.6;box(bx-3.4,bx+3.4,y-1,y+10,bz-3.4,bz+3.4,null);}
    GATES.push({ch:c.n,name:c.name,ready:!!c.ready,pos:new V3(x,y,z),rot,g,key,veil,lab,labOpen,bar});
  });
  // ---------- waystones ----------
  addWaystone('vale_meadow','Meadow',8,valeH(8,84),84,0);
  addWaystone('vale_tree','Heart Tree',6,valeH(6,36),36,0);
  addWaystone('vale_north','North Gate',8,valeH(8,-96),-96,Math.PI);
  // ---------- seed garden: plant golden seeds, flowers grow ----------
  const PX=-15,PZ=80,py=valeH(PX,PZ);
  const bed=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.9,.3,24),new THREE.MeshLambertMaterial({color:'#8a6448'}));bed.position.set(PX,py+.05,PZ);bed.receiveShadow=true;ROOT.add(bed);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(4.8,.22,6,32),M.stone);rim.rotation.x=Math.PI/2;rim.position.set(PX,py+.2,PZ);ROOT.add(rim);
  VALE.plot={x:PX,z:PZ,y:py};
  const sign=labelSprite('Seed Garden','Plant golden seeds here','#f2c14e');sign.scale.set(4.2,1.3,1);sign.position.set(PX,py+3.6,PZ);ROOT.add(sign);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=i<6?2.0:3.6,x=PX+Math.cos(a+(i<6?0:.26))*r,z=PZ+Math.sin(a+(i<6?0:.26))*r;
    const g=new THREE.Group();g.position.set(x,py+.2,z);g.visible=false;ROOT.add(g);
    const b=new THREE.Mesh(lowPoly(.55,.45,.55,1,i*7+3,.25),i%2?M.leaf:M.leaf2);b.position.y=.35;b.castShadow=true;g.add(b);
    const FC=['#ff9fb8','#ffd84d','#b9a7ff','#ffffff','#ff8a6a'];
    for(let k=0;k<5;k++){const f=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,0),new THREE.MeshLambertMaterial({color:FC[(i+k)%5]}));const fa=k/5*6.28;f.position.set(Math.cos(fa)*.42,.6+(k%2)*.14,Math.sin(fa)*.42);g.add(f);}
    VALE.beds.push(g);}
  // ---------- ruins ----------
  const RS=REAL.ready?stoneReal():M.stone,RT=REAL.ready?stoneReal():M.wallTop;if(REAL.ready)TILE.set(RS,3);
  const ruin=(x,z,h,r,broken)=>{const y=valeH(x,z);const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r,h,16),RS);m.position.set(x,y+h/2-.2,z);m.castShadow=m.receiveShadow=true;ROOT.add(m);
    const b=new THREE.Mesh(new THREE.BoxGeometry(r*2.4,.3,r*2.4),RT);b.position.set(x,y+.05,z);ROOT.add(b);
    if(!broken){const t=new THREE.Mesh(new THREE.BoxGeometry(r*2.6,.35,r*2.6),RT);t.position.set(x,y+h,z);t.castShadow=true;ROOT.add(t);}
    box(x-r,x+r,y-1,y+h,z-r,z+r,null);};
  for(const [cx,cz] of [[-38,-42],[42,-30],[-58,24],[52,22],[-44,104],[30,100]]){
    for(let k=0;k<5;k++){const a=k/5*6.28+cx;const x=cx+Math.cos(a)*5.5,z=cz+Math.sin(a)*5.5;ruin(x,z,1.4+hash2(k,cx|0,3)*3,.5,hash2(k,cz|0,5)>.45);}
    const y=valeH(cx,cz);box(cx-2.4,cx+2.4,y-1,y+.5,cz-1.2,cz+1.2,RS,{fade:false});}
  // lookout on the hill
  const hy=valeH(VALE_HILL.x,VALE_HILL.z);
  for(let k=0;k<6;k++){const a=k/6*6.28;ruin(VALE_HILL.x+Math.cos(a)*6,VALE_HILL.z+Math.sin(a)*6,2.4+(k%2)*1.4,.45,k%3===0);}
  box(VALE_HILL.x-1.6,VALE_HILL.x+1.6,hy-1,hy+.35,VALE_HILL.z-1.6,VALE_HILL.z+1.6,REAL.ready?stoneReal():M.pave,{fade:false,surface:'stone'});
  buildCaves();
  buildValeLamps();buildValePinwheels();buildValeLilies();
  // ---------- forests (batched) ----------
  buildValeForest();
  if(REAL.ready){GRASS=newGrassField(grassAllowed,valeH,()=>VALE.wake);buildGrass(GRASS);if(VALE.veinTex)GRASS.mat.uniforms.uVein.value=VALE.veinTex;}else buildValeTufts();
  // ---------- collectibles ----------
  addPetal('m0',VALE_HILL.x,hy+.35,VALE_HILL.z);
  const vs=[[-6,70],[6,64],[-3,46],[3,-36],[-4,-60],[4,-84],[24,30],[-26,-18],[-30,30],[34,-6],[60,-58],[66,-74],[80,-62],[-60,-28],[-48,92],[48,92],[-96,6],[96,-30],[-36,-42],[42,-30]];
  vs.forEach(([x,z],i)=>addSeed('vs'+i,x,valeH(x,z),z));
  endRegion(R);
  buildSeedInstances('vale');
}
function onBridge(b){for(const br of BRIDGES)if(Math.abs(b.pos.x-br.x)<2.4&&Math.abs(b.pos.z-br.z)<10&&b.pos.y>br.y-.6)return true;return false;}
function buildValeForest(){
  const spots=[];
  const ok=(x,z,clear)=>{if(Math.hypot(x,z)<40||pathDist(x,z)<4||riverDist(x,z)<RIVER_W+6)return false;
    for(const g of [[0,-108],[78,-72],[104,-8],[78,74],[-78,74],[-104,-8],[-78,-72],[0,88],[-15,80],[8,84],[6,36],[8,-96],[VALE_HILL.x,VALE_HILL.z]])if(Math.hypot(x-g[0],z-g[1])<(clear||14))return false;
    if(inCave(x,z,18))return false; // a clearing in front of each cave
    for(const s of spots)if(Math.hypot(x-s[0],z-s[1])<(REAL.ready?10:4.2))return false;return true;};
  let seed=1;const rnd=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x6D2B79F5|0;return ((seed>>>0)%100000)/100000;};
  for(let i=0;i<1400&&spots.length<(REAL.ready?170:240);i++){const a=rnd()*Math.PI*2,r=lerp(96,165,rnd());const x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.max(Math.abs(x),Math.abs(z))>(REAL.ready?150:134))continue;if(ok(x,z))spots.push([x,z,.9+rnd()*.7]);}
  for(const [cx,cz,cr,n] of [[-62,-50,14,14],[58,8,12,12],[-70,40,12,12],[28,-74,10,9],[-30,72,9,8],[60,96,10,8],[-22,-80,10,9]])
    {let left=n;for(let i=0;i<n*6&&left>0;i++){const a=rnd()*6.28,r=Math.sqrt(rnd())*cr;const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(ok(x,z)){spots.push([x,z,.9+rnd()*.6]);left--;}}}
  if(REAL.ready&&REAL.treeSrc){const sp=spots.map(([x,z,s])=>[x,z,.42+s*.28]);buildRealForest(sp);
    for(const [x,z,s] of sp){if(Math.max(Math.abs(x),Math.abs(z))<126){const y=valeH(x,z),r=1.1*s;box(x-r,x+r,y-1,y+6,z-r,z+r,null,{surface:'wood'});}}return;}
  const trunkG=new THREE.CylinderGeometry(.18,.3,2.6,6);trunkG.translate(0,1.3,0);
  const blobG=lowPoly(1,.85,1,1,5,.18);
  const trunks=new THREE.InstancedMesh(trunkG,M.bark,spots.length);
  const leafMat=new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true});VALE.foliageMat=leafMat;
  const blobs=new THREE.InstancedMesh(blobG,leafMat,spots.length*2);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new V3(),p=new V3(),col=new THREE.Color();
  const greens=['#63b84a','#86cc55','#3f9a52','#72b84e'];
  spots.forEach(([x,z,s],i)=>{const y=valeH(x,z);p.set(x,y-.1,z);q.setFromAxisAngle(_yAx,i);sc.set(s,s,s);m4.compose(p,q,sc);trunks.setMatrixAt(i,m4);
    for(let k=0;k<2;k++){const fs=s*(k?1.0:1.45);p.set(x+(k?.7*s:0),y+2.6*s+fs*.5+(k?-.3:.2)*s,z+(k?.4*s:0));sc.set(fs,fs,fs);m4.compose(p,q,sc);blobs.setMatrixAt(i*2+k,m4);col.set(greens[(i+k)%4]);blobs.setColorAt(i*2+k,col);}
    if(Math.max(Math.abs(x),Math.abs(z))<126)box(x-.35*s,x+.35*s,y-1,y+3*s,z-.35*s,z+.35*s,null,{surface:'wood'});});
  for(const im of [trunks,blobs]){im.castShadow=true;im.receiveShadow=true;im.instanceMatrix.needsUpdate=true;ROOT.add(im);}
  blobs.instanceColor.needsUpdate=true;
}
function buildValeTufts(){
  const tuft=new THREE.IcosahedronGeometry(.2,0);tuft.scale(1,.55,1);tuft.translate(0,.05,0);
  const flower=new THREE.IcosahedronGeometry(.08,0);flower.translate(0,.18,0);
  let seed=7;const rnd=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x6D2B79F5|0;return ((seed>>>0)%100000)/100000;};
  const spots=[];for(let i=0;i<9000&&spots.length<3200;i++){const x=lerp(-120,120,rnd()),z=lerp(-120,120,rnd());if(riverDist(x,z)<RIVER_W+3||pathDist(x,z)<1.6||Math.hypot(x,z)<8)continue;spots.push([x,z]);}
  const tufts=new THREE.InstancedMesh(tuft,new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true}),spots.length);
  const flowers=new THREE.InstancedMesh(flower,new THREE.MeshLambertMaterial({color:'#ffffff'}),spots.length);VALE.flowers=flowers;
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new V3(),pos=new V3(),col=new THREE.Color();let n=0,nf=0;const FL=['#ffffff','#ffd84d','#ff9fb8','#b9a7ff'];
  for(const [x,z] of spots){const y=valeH(x,z);
    if(rnd()<.2){pos.set(x,y,z);q.identity();const s=1+rnd()*.4;sc.set(s,s,s);m4.compose(pos,q,sc);flowers.setMatrixAt(nf,m4);col.set(FL[Math.floor(rnd()*4)]);flowers.setColorAt(nf,col);nf++;continue;}
    pos.set(x,y,z);q.setFromAxisAngle(_yAx,rnd()*6.28);const s=.8+rnd()*.8;sc.set(s,s,s);m4.compose(pos,q,sc);tufts.setMatrixAt(n,m4);col.setHSL(.27+rnd()*.04,.34+rnd()*.1,.34+rnd()*.08);tufts.setColorAt(n,col);n++;}
  tufts.count=n;flowers.count=nf;
  for(const im of [tufts,flowers]){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.receiveShadow=true;ROOT.add(im);}
}
// how awake the Vale looks: 0 = grey and dry, 1 = the first root is awake (river full, green trees)
const _realLeafSleep=new THREE.Color('#b9b6a4'),_sleepLeaf=new THREE.Color('#c8c6b4'),_wakeLeaf=new THREE.Color('#ffffff'),_sleepGround=new THREE.Color('#d9dccb'),_treeLeafSleep=new THREE.Color('#a4ad97'),_treeLeafWake=new THREE.Color('#6cbf52');
function valeWakeTarget(){return PROG.roots>=1?1:0;}
function updateVale(dt,t){
  if(G.region!=='vale')return;
  updateCavesVis(t);
  VALE.wakeT=(G.scene==='root1'&&G.line<1)?0:valeWakeTarget();
  VALE.wake=approach(VALE.wake,VALE.wakeT,dt/3.5);
  const w=VALE.wake;
  if(VALE.foliageMat)VALE.foliageMat.color.copy(_sleepLeaf).lerp(_wakeLeaf,w);
  VALE.groundMat.color.copy(_sleepGround).lerp(_wakeLeaf,w);
  if(VALE.flowers)VALE.flowers.visible=w>.5;
  if(!REAL.water){VALE.river.visible=w>.02;VALE.river.position.y=lerp(-1.3,0,w);VALE.river.material.opacity=.9*Math.min(1,w*2);}
  if(VALE.leaf&&REAL.ready)VALE.leaf.material.color.copy(_realLeafSleep).lerp(_wakeLeaf,.35+.4*Math.min(1,PROG.roots/7)+.25*w);
  else if(VALE.leaf)VALE.leaf.material.color.copy(_treeLeafSleep).lerp(_treeLeafWake,.2+.25*Math.min(1,PROG.roots/7)+.1*w);
  if(VALE.blossom)VALE.blossom.material.color.set(PROG.roots>=7?'#ffb3cf':'#e6dade');
  VALE.roots.forEach((r,i)=>{if(r.vein){const u=r.material.uniforms;u.uT.value=t;u.uOn.value=approach(u.uOn.value,i<PROG.roots?(PROG.settings.reduceFlash?.6:1):0,dt*.6);if(GRASS&&GRASS.mat)GRASS.mat.uniforms.uRootOn.value[i]=u.uOn.value;return;}const on=i<PROG.roots,em=r.material.emissive;if(on){em.set('#1fb3a3');r.material.emissiveIntensity=PROG.settings.reduceFlash?.35:.3+.15*Math.sin(t*1.5+i);}else r.material.emissiveIntensity=0;});
  VALE.treeLight.intensity=PROG.roots>0?.6:0;
  const planted=Math.floor(PROG.planted/5);VALE.beds.forEach((g,i)=>g.visible=i<planted);
  updateValeLamps(dt);updateValePinwheels(dt);updateValeLilies();
  for(const g of GATES){g.ready=gateReady(g.ch);const ready=g.ready;g.bar.on=!ready;if(g.labOpen){g.labOpen.visible=ready;g.lab.visible=!ready;}
    const flicker=!ready&&g.ch===PROG.roots+1; // the next sealed gate flickers faintly
    g.veil.visible=ready||flicker;if(ready)g.veil.material.opacity=PROG.settings.reduceFlash?.3:.26+.1*Math.sin(t*1.6);
    else if(flicker)g.veil.material.opacity=PROG.settings.reduceFlash?.08:.05+.06*Math.max(0,Math.sin(t*2.3)*Math.sin(t*.7));
    for(const k of g.key){k.material.emissiveIntensity=ready?1.2:.05;k.material.color.set(ready?'#2fd6c0':'#6f7d82');}}
  if(!PROG.settings.reduceFlash&&Math.random()<dt*6){const gg=GATES[0];emit(gg.pos.x+(Math.random()-.5)*5,gg.pos.y+Math.random()*7,gg.pos.z+(Math.random()-.5)*.6,0,.4,0,.5,1,.85,.12,1.6,0,.3);}
}
