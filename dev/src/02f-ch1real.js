// ================= Chapter 1, realistic: Poly Haven stone and ground, real grass, Jacaranda trees =================
// Runs only when the realistic assets loaded (REAL.ready). The level layout and every collider stay the same;
// only materials and decoration change, so the puzzles play exactly as before.
const CH1R={on:false,trees:[],grassRects:[],mask:null,x0:-92,z0:-172,cell:.5,nx:0,nz:0};

// a copy of a Poly Haven colour map marked sRGB, for plain PBR materials (the terrain shader decodes its own copy)
function srgbCopy(t){if(!t)return null;const c=t.clone();c.encoding=THREE.sRGBEncoding;c.needsUpdate=true;return c;}
function stoneMat(name,color,o,set){const T=REAL.tex;set=set||'sandstone';const m=new THREE.MeshStandardMaterial(Object.assign({map:T[set+'_col'],normalMap:T[set+'_nrm'],roughnessMap:T[set+'_rgh'],
  color:new THREE.Color(color),roughness:1,metalness:0,envMapIntensity:.7},o||{}));m.name=name;return m;}
let _rockCol=null;
function rockMat(name,color){const T=REAL.tex;_rockCol=_rockCol||srgbCopy(T.rock_col);
  const m=new THREE.MeshStandardMaterial({map:_rockCol,normalMap:T.rock_nrm,roughnessMap:T.rock_rgh,color:new THREE.Color(color),roughness:1,metalness:0,envMapIntensity:.6});m.name=name;return m;}

// swap the shared materials before Chapter 1 is built (the Vale is already built with its own)
function ch1RealBegin(){
  CH1R.on=true;
  const T=REAL.tex;
  M.wall=stoneMat('wall','#f2ece2');TILE.set(M.wall,3);
  M.wallTop=stoneMat('wallTop','#c9bfb0');TILE.set(M.wallTop,3);
  M.stone=stoneMat('stone','#f6f0e6');TILE.set(M.stone,3);
  M.pave=stoneMat('pave','#d6cec2',null,'paving');TILE.set(M.pave,2.6);
  M.ground=terrainMaterial();M.ground.name='ground';
  M.cliffTop=M.ground;
  M.rock=rockMat('rock','#a8a196');M.cliff=rockMat('cliff','#b8ab96');M.cliffDark=rockMat('cliffDark','#8c8173');TILE.set(M.rock,3);TILE.set(M.cliff,4);TILE.set(M.cliffDark,4);
  M.plate=rockMat('plate','#857a6c');TILE.set(M.plate,2);
  M.block=stoneMat('block','#a9bad2',null,'masonry');M.blockTop=stoneMat('blockTop','#c9d5e6',null,'masonry');
  let woodMap=null;for(const k in PROPS)PROPS[k].traverse(o=>{if(!woodMap&&o.isMesh&&o.material.name==='Wood'&&o.material.map)woodMap=o.material.map;});
  if(woodMap){woodMap=woodMap.clone();woodMap.wrapS=woodMap.wrapT=THREE.RepeatWrapping;woodMap.needsUpdate=true;}
  M.wood=new THREE.MeshStandardMaterial({map:woodMap,color:'#8f7d69',roughness:.85,metalness:0,name:'wood'});TILE.set(M.wood,1.6);
  M.terracotta=new THREE.MeshStandardMaterial({color:'#9c5534',roughness:.78,metalness:0,name:'terracotta'});
  M.leaf2=new THREE.MeshStandardMaterial({color:'#24361a',roughness:.45,metalness:0,side:THREE.DoubleSide});
  M.leafDark=new THREE.MeshStandardMaterial({color:'#4a5f2c',roughness:.8,metalness:0});
  const wn=T.water?T.water.clone():null;if(wn){wn.wrapS=wn.wrapT=THREE.RepeatWrapping;wn.repeat.set(6,6);wn.needsUpdate=true;}
  M.water=new THREE.MeshStandardMaterial({color:'#2f463d',roughness:.05,metalness:0,normalMap:wn,normalScale:new THREE.Vector2(.25,.25),envMapIntensity:1.15,transparent:true,opacity:.9});
}
// river-stone rock: a smooth irregular lump instead of a faceted one
function realRockGeo(rx,ry,rz,seed){
  const g=new THREE.SphereGeometry(1,20,14),p=g.attributes.position,n=g.attributes.normal,v=new V3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);
    const k=1+.16*Math.sin(v.x*2.1+seed)*Math.cos(v.z*1.7+seed*1.3)+.07*Math.sin(v.y*4.3+seed*2.1);
    const x=v.x*rx*k,y=Math.max(v.y,-.55)*ry*k,z=v.z*rz*k;p.setXYZ(i,x,y,z);}
  g.computeVertexNormals();return g;
}
// grass mask: 1 where a ground slab's open top is, cleared under anything standing on it
function ch1GrassMask(){
  const C=CH1R;C.nx=Math.ceil(184/C.cell);C.nz=Math.ceil(236/C.cell);const mk=new Uint8Array(C.nx*C.nz);C.mask=mk;
  const fill=(xa,xb,za,zb,val)=>{const i0=Math.max(0,Math.floor((Math.min(xa,xb)-C.x0)/C.cell)),i1=Math.min(C.nx-1,Math.floor((Math.max(xa,xb)-C.x0)/C.cell));
    const j0=Math.max(0,Math.floor((Math.min(za,zb)-C.z0)/C.cell)),j1=Math.min(C.nz-1,Math.floor((Math.max(za,zb)-C.z0)/C.cell));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)mk[j*C.nx+i]=val;};
  for(const r of C.grassRects)fill(r[0],r[1],r[2],r[3],1);
  for(const c of colliders){if(!c.on||c.kind==='golem')continue;if(c.max.y>.05&&c.min.y<.3)fill(c.min.x-.2,c.max.x+.2,c.min.z-.2,c.max.z+.2,0);}
  fill(-90,90,-26.6,-33.4,0);              // ravine
  fill(POOL.x0-.4,POOL.x1+.4,POOL.z0-.4,POOL.z1+.4,0);
  fill(CELLAR.hole.x0-.3,CELLAR.hole.x1+.3,CELLAR.hole.z0-.3,CELLAR.hole.z1+.3,0);
  fill(-2.2,2.2,6,2,0);                     // the exit gate threshold
  // the orchard plateau: grass on top, cleared under what stands on it
  const O=ORCH;fill(O.x0+.4,O.x1-.4,O.z0+.4,O.z1-.4,1);
  for(const c of colliders){if(!c.on||c.kind==='golem')continue;if(c.min.y>O.y-.3&&c.min.y<O.y+.3&&c.max.y>O.y+.05)fill(c.min.x-.2,c.max.x+.2,c.min.z-.2,c.max.z+.2,0);}
}
function ch1GrassAllowed(x,z){const C=CH1R;const i=Math.floor((x-C.x0)/C.cell),j=Math.floor((z-C.z0)/C.cell);
  if(i<0||j<0||i>=C.nx||j>=C.nz)return 0;return C.mask[j*C.nx+i]?.85:0;}
// after Chapter 1 is built: ground colours, trees, grass, props
function ch1RealFinish(){
  // the terrain shader reads layer weights from vertex colours; Chapter 1's ground is the plain grass layer
  ROOT.traverse(o=>{if(o.isMesh&&o.material===M.ground&&!o.geometry.attributes.color){const n=o.geometry.attributes.position.count;o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));}});
  // trees: the hand-placed ones plus a ring that hides the edge of the land
  const spots=CH1R.trees.slice();let seed=7;const rnd=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x6D2B79F5|0;return ((seed>>>0)%100000)/100000;};
  const ok=(x,z)=>!((z<-24&&z>-36))&&!inPlayZone(x,z,4)&&!inOrchard(x,z,6)&&!(Math.abs(x)<13&&z<8&&z>-86)&&spots.every(s=>Math.hypot(x-s[0],z-s[1])>8);
  for(let i=0;i<900&&spots.length<150;i++){
    const side=Math.floor(rnd()*4);let x,z;
    if(side<2){x=(side?1:-1)*lerp(46,86,rnd());z=lerp(-160,52,rnd());}else{x=lerp(-86,86,rnd());z=side===2?lerp(14,52,rnd()):lerp(-96,-160,rnd());}
    if(ok(x,z))spots.push([x,z,.42+rnd()*.22]);}
  buildRealForest(spots,{h:ch1H});
  // grass
  ch1GrassMask();
  GRASS_CH1=newGrassField(ch1GrassAllowed,ch1H,()=>1);buildGrass(GRASS_CH1);
}
