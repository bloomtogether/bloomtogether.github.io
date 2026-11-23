// ================= Chapter 1: the upper terrace and the Hanging Orchard =================
// A raised orchard north of the ravine, east of the main garden. The way up: the Sprite reaches the hidden
// balcony with a ground-pound seesaw launch and pulls a lever that raises a stone stair for the Giant; from the
// balcony an old aqueduct walk crosses the ravine to the orchard. Up there: a belvedere tower (a landmark you can
// see from the whole garden), a waystone, and an optional throw puzzle that opens the Sun Pavilion (a secret).
const ORCH={x0:12,x1:44,z0:-80,z1:-36,y:4.94};
const TOWER={x0:34,x1:40,z0:-73,z1:-67,h:10.5,ledge:{x0:32.5,x1:34,z0:-71.6,z1:-68.4,y:3.9}};
const PAV={x0:15,x1:25,z0:-77,z1:-67,h:2.3,door:{x0:18.8,x1:21.2}};
const stair={raised:false,t:0,steps:[]};
const pav={open:false,t:0,door:null};
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
  const sun=new THREE.Mesh(new THREE.CircleGeometry(1.4,24),new THREE.MeshLambertMaterial({color:'#f2c14e',emissive:'#f2a43a',emissiveIntensity:.35}));
  sun.rotation.x=-Math.PI/2;sun.position.set((P.x0+P.x1)/2,Y+.02,(P.z0+P.z1)/2);ROOT.add(sun);
  for(const [x,z] of [[P.x0+1.2,P.z0+1.2],[P.x1-1.2,P.z0+1.2]])addUrnAt(x,Y,z,1.1);

  // ---------- orchard trees, a bench, the waystone ----------
  // two orchard blocks either side of a clear walk from the aqueduct to the tower; small trees in rows
  const rows=[];for(const x0 of [15,34])for(let i=0;i<2;i++)for(let j=0;j<3;j++){const x=x0+i*6+(j%2)*1.5,z=-44-j*7.5;rows.push([x,z]);}
  for(const [x,z] of rows)orchardTree(x,z,.2+hash2(x|0,z|0,71)*.07);
  for(const [x,z] of [[42,-77],[14.5,-62],[42,-62]])orchardTree(x,z,.26+hash2(x|0,z|0,72)*.06);
  box(36,39,Y,Y+.45,-45.2,-46,M.wood,{fade:false,surface:'wood'});
  addWaystone('ch1_orchard','Hanging Orchard',30.5,Y,-41.5,0);

  // ---------- collectibles ----------
  [[28,Y,-29],[28,Y,-33.6],[17.5,Y,-38.6],[40,Y,-39.5],[22,Y,-53],[36,Y,-57],[14.5,Y,-78],[33.3,Y+L.y,-68.9],[33.3,Y+L.y,-71.1],[20,Y,-72]]
    .forEach(([x,y,z],i)=>addSeed('c1o'+i,x,y,z));
}
// a tree on the plateau (realistic Jacaranda when the real assets loaded, else a simple tree raised to the plateau)
function orchardTree(x,z,s){
  if(CH1R.on){CH1R.trees.push([x,z,s]);return;}
  const g=new THREE.Group();g.position.y=ORCH.y;ROOT.add(g);const R0=ROOT;ROOT=g;addTree(x,z,s*2.6,(x*7+z)|0);ROOT=R0;
}
function addUrnAt(x,y,z,s){const g=new THREE.Group();g.position.y=y;ROOT.add(g);const R0=ROOT;ROOT=g;addUrn(x,z,s);ROOT=R0;
  // addUrn's collider was made at floor level: lift it with the group
  const c=colliders[colliders.length-1];c.min.y+=y;c.max.y+=y;}

// a block that rises under someone lifts them onto its top instead of trapping them inside it
function liftOnto(c){for(const b of [golem,sprite]){if(b.held)continue;if(ov(b,c)){b.pos.y=c.max.y+.01;b.vel.y=0;if(b===golem)syncGolemCol();}}}
// ---- per-step: the stair rises and the pavilion gate sinks once their levers are pulled ----
function stepOrchard(dt){
  stair.t=approach(stair.t,stair.raised?1:0,dt/2.6);for(const c of stair.steps){const on=stair.t>.96;if(on&&!c.on)liftOnto(c);c.on=on;}
  pav.t=approach(pav.t,pav.open?1:0,dt/1.8);if(pav.door)pav.door.on=pav.t<.5;
}
function updateOrchardVis(){
  const k=smooth(0,1,stair.t);for(let i=0;i<stair.steps.length;i++){const c=stair.steps[i],kk=smooth(i/stair.steps.length*.5,.5+i/stair.steps.length*.5,k);c.mesh.position.y=c.top/2-(c.top+.05)*(1-kk);}
  if(pav.door&&pav.door.mesh)pav.door.mesh.position.y=ORCH.y+PAV.h/2-PAV.h*smooth(0,1,pav.t);
}
function resetOrchard(){
  stair.raised=!!PROG.ch1.stair;stair.t=stair.raised?1:0;pav.open=!!PROG.ch1.pav;pav.t=pav.open?1:0;
  for(const l of levers){if(l.id==='stair'){l.pulled=stair.raised;l.t=+stair.raised;}if(l.id==='pavilion'){l.pulled=pav.open;l.t=+pav.open;}}
  stepOrchard(0);updateOrchardVis();
}
