// ================= the Vale's side caves =================
// Two caves cut into the wooded hills at the edge of the Vale, each a small co-op puzzle with a memory petal,
// golden seeds and a secret. (CAVES, caveRect and caveCarve live in 02c-vale.js because the terrain uses them.)
//  - Glow-worm Grotto (west): a stone door with a low gap. Only the Sprite fits under it; a lever inside lifts it.
//  - Echo Cave (east): a rock wall across the mouth. The Sprite leaps over it from the Giant's head; a lever inside
//    raises stone steps on both sides so the Giant can climb over.
const VCAVE={grotto:{open:false,t:0,door:null,slab:null},echo:{raised:false,t:0,steps:[]}};
const VLEVERS=[];

function caveRock(){return REAL.ready?rockMat('caveRock','#9c9284'):M.rock;}
function buildCaves(){
  const RM=caveRock();
  for(const c of CAVES){
    const r=caveRect(c),f=c.f,d=c.dir,m=c.x,e=c.x+d*c.len,z0=c.z-c.w/2,z1=c.z+c.w/2;
    const xa=Math.min(m-d*.4,e+d*1.6),xb=Math.max(m-d*.4,e+d*1.6);
    // side walls, back wall, a roof that fades when it hides the players, boulders on top
    box(xa,xb,f-1,f+6.4,z0-1.6,z0,RM,{fade:false});box(xa,xb,f-1,f+6.4,z1,z1+1.6,RM,{fade:false});
    box(Math.min(e,e+d*1.6),Math.max(e,e+d*1.6),f-1,f+6.4,z0-1.6,z1+1.6,RM,{fade:false});
    box(xa,xb,f+5.2,f+6.4,z0-1.6,z1+1.6,RM,{fade:true,cast:true});
    for(let i=0;i<5;i++){const x=lerp(m,e,.15+i*.18),z=c.z+(hash2(i,c.len,91)-.5)*c.w,s=1.6+hash2(i,3,92)*1.4;
      const rk=new THREE.Mesh(REAL.ready?realRockGeo(s,s*.6,s*.8,i+c.len):lowPoly(s,s*.6,s*.8,0,i*13,.35),RM);rk.position.set(x,f+6.2,z);rk.rotation.y=i;rk.castShadow=true;ROOT.add(rk);}
    // boulders heaped either side of the mouth
    for(let i=0;i<6;i++){const side=i%2?1:-1,zz=c.z+side*(c.w/2+1.2+hash2(i,7,95)*1.6),x=m-d*(.5+hash2(i,8,95)*2.2),s=1+hash2(i,9,95)*1.3;
      const rk=new THREE.Mesh(REAL.ready?realRockGeo(s,s*.75,s*.9,i*3+c.len):lowPoly(s,s*.75,s*.9,0,i*7,.35),RM);rk.position.set(x,f+s*.35,zz);rk.rotation.y=i*1.3;rk.castShadow=true;rk.receiveShadow=true;ROOT.add(rk);
      box(x-s*.6,x+s*.6,f-1,f+s*.9,zz-s*.6,zz+s*.6,null);}
    // a lintel over the mouth and two rough posts
    for(const zz of [z0,z1-.9])box(m-d*.4,m+d*.5,f,f+5.2,zz,zz+.9,RM,{fade:false});
    // inside: a few lights so it reads as a cave, not a black box
    const L=new THREE.PointLight(c.id==='grotto'?'#9fffe0':'#bcd7ff',1.1,c.len+4,1.6);L.position.set(lerp(m,e,.55),f+3.8,c.z);ROOT.add(L);
    if(c.id==='grotto'){ // glow-worms on the ceiling
      const g=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:'#b8ffe9'}),90);const m4=new THREE.Matrix4();
      for(let i=0;i<90;i++){m4.makeTranslation(lerp(m+d*1.5,e,hash2(i,1,93)),f+5.16-hash2(i,4,93)*.1,lerp(z0+.3,z1-.3,hash2(i,2,93)));g.setMatrixAt(i,m4);}ROOT.add(g);
    }else{ // pale crystals along the walls
      for(let i=0;i<9;i++){const cm=new THREE.Mesh(new THREE.OctahedronGeometry(.25+hash2(i,1,94)*.25),M.gem);const side=i%2?z0+.25:z1-.25;cm.position.set(lerp(m+d*3,e-d*1,hash2(i,2,94)),f+.4+hash2(i,3,94)*2.6,side);cm.scale.y=1.7;cm.rotation.z=(hash2(i,5,94)-.5)*.8;ROOT.add(cm);}}
    const lab=labelSprite(c.name,'Side cave','#8a6448');lab.scale.set(3.6,1.12,1);lab.position.set(m-d*1.5,f+7.6,c.z);ROOT.add(lab);
  }
  // ---------- Glow-worm Grotto: the door with a gap at the bottom ----------
  {const c=CAVES[0],G0=VCAVE.grotto,f=c.f,d=c.dir,x0=c.x+d*.6,x1=c.x+d*1.2,z0=c.z-c.w/2,z1=c.z+c.w/2;
    G0.door=box(x0,x1,f+.55,f+5.2,z0,z1,null,{kind:'door'});
    G0.slab=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1-x0),4.65,c.w),REAL.ready?stoneReal():M.stone);G0.slab.position.set((x0+x1)/2,f+.55+2.325,c.z);G0.slab.castShadow=true;G0.slab.receiveShadow=true;ROOT.add(G0.slab);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#5ff3cf',transparent:true,depthWrite:false,opacity:.55}));glow.scale.set(c.w*.8,.7,1);glow.position.set((x0+x1)/2-d*.3,f+.3,c.z);ROOT.add(glow);G0.glow=glow;
    VLEVERS.push(makeValeLever(c.x+d*(c.len-1.6),c.z+2.2,f,'grotto'));
    addPetal('m4',c.x+d*(c.len-2.4),f,c.z-1.6);
    [[3.5,-2.5],[6.5,2.6],[9.5,-2.4],[12.5,1.2]].forEach(([a,b],i)=>addSeed('vc'+i,c.x+d*a,f,c.z+b));}
  // ---------- Echo Cave: the wall across the mouth and the steps a lever raises ----------
  {const c=CAVES[1],E=VCAVE.echo,f=c.f,d=c.dir,z0=c.z-c.w/2,z1=c.z+c.w/2,wx0=c.x+d*.6,wx1=c.x+d*1.8;
    box(wx0,wx1,f,f+2.6,z0,z1,REAL.ready?stoneReal():M.wall,{fade:false,surface:'stone'});
    for(const side of [-1,1])for(let i=0;i<6;i++){ // outside (side -1) and inside (side 1), each climbing to the wall top
      const top=f+.44*(i+1),xa=side<0?wx0-d*(6.6-i*1.1):wx1+d*(6.6-i*1.1),xb=side<0?xa+d*1.1:xa-d*1.1;
      const s=box(xa,xb,f-.5,top,c.z-1.2,c.z+1.2,REAL.ready?stoneReal():M.stone,{fade:false,surface:'stone'});s.on=false;s.top=top-f;s.base=f;E.steps.push(s);}
    VLEVERS.push(makeValeLever(c.x+d*(c.len-1.6),c.z-2.2,f,'echo'));
    addPetal('m5',c.x+d*(c.len-2.4),f,c.z+1.6);
    [[4,2.6],[7,-2.6],[10,2.4],[13,-1]].forEach(([a,b],i)=>addSeed('vc'+(4+i),c.x+d*a,f,c.z+b));}
}
function makeValeLever(x,z,y,id){const l=makeLever(x,z,0,id,y);l.vale=true;return l;}
function stoneReal(){return typeof stoneMat==='function'&&REAL.ready?stoneMat('caveStone','#e6dccb'):M.stone;}
// ---- the Sprite pulls a cave lever ----
function pullValeLever(l){l.pulled=true;PROG.vale=PROG.vale||{};
  if(l.id==='grotto'){VCAVE.grotto.open=true;PROG.vale.grotto=1;}else if(l.id==='echo'){VCAVE.echo.raised=true;PROG.vale.echo=1;}saveSoon();}
// ---- per-step and visuals ----
function stepCaves(dt){
  const G0=VCAVE.grotto,E=VCAVE.echo;
  G0.t=approach(G0.t,G0.open?1:0,dt/1.6);if(G0.door)G0.door.on=G0.t<.5;
  E.t=approach(E.t,E.raised?1:0,dt/2.2);for(const s of E.steps){const on=E.t>.96;if(on&&!s.on)liftOnto(s);s.on=on;}
}
function updateCavesVis(t){
  const G0=VCAVE.grotto,E=VCAVE.echo;
  if(G0.slab){const k=smooth(0,1,G0.t);G0.slab.position.y=CAVES[0].f+.55+2.325-k*5.3;/* sinks into the floor */G0.glow.material.opacity=(1-k)*(PROG.settings.reduceFlash?.45:.45+.15*Math.sin(t*2.2));}
  const k=smooth(0,1,E.t);for(const s of E.steps)if(s.mesh){const h=s.top+.5;s.mesh.position.y=s.base-.5+h/2-(h+.05)*(1-k);}
  for(const l of VLEVERS)l.t=approach(l.t,l.pulled?1:0,1/60/.35);
}
function resetCaves(){
  const p=PROG.vale||{};VCAVE.grotto.open=!!p.grotto;VCAVE.grotto.t=+!!p.grotto;VCAVE.echo.raised=!!p.echo;VCAVE.echo.t=+!!p.echo;
  for(const l of VLEVERS){l.pulled=l.id==='grotto'?!!p.grotto:!!p.echo;l.t=+l.pulled;}stepCaves(0);updateCavesVis(0);
}
