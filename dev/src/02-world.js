// ================= world =================
const F={x:0,z:-72}; // fountain center
const CP=[
  {z:2,  g:[-1.5,0,-2.5], s:[1.5,0,-2.5]},
  {z:-23.5,g:[-1.5,0,-24.5],s:[1.5,0,-24.5]},
  {z:-34,g:[-1.5,0,-36], s:[1.5,0,-36]},
  {z:-45,g:[-1.5,0,-46.5],s:[1.5,0,-46.5]},
  {z:-64,g:[-1.5,0,-65], s:[1.5,0,-65]},
];
const W={}; // named world objects
function lowPoly(rx,ry,rz,detail,seed,amp){
  const g=new THREE.IcosahedronGeometry(1,detail),p=g.attributes.position,v=new V3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const k=1+(hash2(Math.round(v.x*97),Math.round(v.y*97)+Math.round(v.z*53),seed|0)-.5)*amp;p.setXYZ(i,v.x*rx*k,v.y*ry*k,v.z*rz*k);}
  g.computeVertexNormals();return g;
}
function addRock(x,y,z,s,seed,collide,mat){
  const m=new THREE.Mesh(lowPoly(s,s*.65,s*.85,0,seed*13,.35),mat||M.rock);m.position.set(x,y,z);m.rotation.y=seed;m.castShadow=true;m.receiveShadow=true;ROOT.add(m);
  if(collide) box(x-s*.7,x+s*.7,0,y+s*.55,z-s*.7,z+s*.7,null);
  return m;
}
function addColumn(x,z,h,r,broken,collide){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r,h,12,1),M.stone);m.position.set(x,h/2,z);m.castShadow=m.receiveShadow=true;ROOT.add(m);
  const base=new THREE.Mesh(new THREE.BoxGeometry(r*2.4,.3,r*2.4),M.wallTop);base.position.set(x,.15,z);base.castShadow=base.receiveShadow=true;ROOT.add(base);
  let top=null;if(!broken){top=new THREE.Mesh(new THREE.BoxGeometry(r*2.6,.35,r*2.6),M.wallTop);top.position.set(x,h+.17,z);top.castShadow=true;ROOT.add(top);}
  if(h>1.2)markFade(m,top?[top]:[]);
  if(collide!==false) box(x-r,x+r,0,h,z-r,z+r,null);
}
function addUrn(x,z,s){
  const pts=[[0,0],[.25,0],[.32,.08],[.42,.35],[.38,.6],[.24,.75],[.26,.86],[.32,.9]].map(p=>new THREE.Vector2(p[0]*s,p[1]*s));
  const m=new THREE.Mesh(new THREE.LatheGeometry(pts,10),M.terracotta);m.position.set(x,0,z);m.castShadow=m.receiveShadow=true;ROOT.add(m);
  const plant=new THREE.Mesh(lowPoly(.3*s,.22*s,.3*s,0,x*7+z,.3),M.leaf2);plant.position.set(x,.95*s,z);plant.castShadow=true;ROOT.add(plant);
  box(x-.35*s,x+.35*s,0,.9*s,z-.35*s,z+.35*s,null);
}
function addTree(x,z,s,seed){
  const h=2.4*s,trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.26*s,h,6),M.bark);trunk.position.set(x,h/2,z);trunk.castShadow=true;ROOT.add(trunk);
  const parts=[];const n=2+Math.floor(hash2(seed,1,7)*2);
  for(let i=0;i<n;i++){const a=hash2(seed,i,8)*6.28,r=i?(.6+hash2(seed,i,9)*.5)*s:0,fs=(i?1.0:1.35)*s*(.9+hash2(seed,i,10)*.3);
    const f=new THREE.Mesh(lowPoly(fs,fs*.85,fs,1,seed*31+i,.18),[M.leaf,M.leaf2,M.leafDark][(seed+i)%3]);
    f.position.set(x+Math.cos(a)*r,h+fs*.5+(i?-.2:.3)*s,z+Math.sin(a)*r);f.castShadow=true;f.receiveShadow=true;ROOT.add(f);parts.push(f);}
  markFade(parts[0],[trunk,...parts.slice(1)]);
}
function addCypress(x,z,s,seed){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12*s,.18*s,1.0*s,6),M.bark);trunk.position.set(x,.5*s,z);ROOT.add(trunk);
  const f=new THREE.Mesh(lowPoly(.85*s,2.8*s,.85*s,1,seed*17,.12),M.leafDark);f.position.set(x,3.4*s,z);f.castShadow=true;ROOT.add(f);
  markFade(f,[trunk]);
}
function addBush(x,z,s,seed){const b=new THREE.Mesh(lowPoly(.7*s,.5*s,.7*s,0,seed*11,.3),seed%2?M.leaf:M.leaf2);b.position.set(x,.3*s,z);b.castShadow=true;b.receiveShadow=true;ROOT.add(b);}

// glowing frame + floating icon marking a crawl hole only the Sprite fits through.
// (x0..x1, z0..z1) is the opening; face: which side(s) to frame ('x+' etc), icon at ix,iz
const holeMarkers=[];
function holeMarker(x0,x1,z0,z1,faces,ix,iz){
  const H=.55,t=.06;
  for(const f of faces){
    const ax=f[0],sgn=f[1]==='+'?1:-1;
    if(ax==='x'){const x=sgn>0?x1+.01:x0-.01;
      box(x-t/2,x+t/2,0,H+t,z0-t,z0,M.holeRim,{collide:false,cast:false,fade:false});box(x-t/2,x+t/2,0,H+t,z1,z1+t,M.holeRim,{collide:false,cast:false,fade:false});
      box(x-t/2,x+t/2,H,H+t,z0-t,z1+t,M.holeRim,{collide:false,cast:false,fade:false});}
    else{const z=sgn>0?z1+.01:z0-.01;
      box(x0-t,x0,0,H+t,z-t/2,z+t/2,M.holeRim,{collide:false,cast:false,fade:false});box(x1,x1+t,0,H+t,z-t/2,z+t/2,M.holeRim,{collide:false,cast:false,fade:false});
      box(x0-t,x1+t,H,H+t,z-t/2,z+t/2,M.holeRim,{collide:false,cast:false,fade:false});}
  }
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#5ff3cf',transparent:true,depthWrite:false,opacity:.55}));glow.scale.set(1.6,1.0,1);glow.position.set((x0+x1)/2,.3,(z0+z1)/2);ROOT.add(glow);
  const icon=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.holeIcon,transparent:true,depthWrite:false}));icon.scale.set(.62,.62,1);icon.position.set(ix,1.35,iz);ROOT.add(icon);
  holeMarkers.push({icon,glow,base:1.35});
}

// chapter 1 play areas outside the original strip (decor scatter keeps out of them)
function inPlayZone(x,z,m){return (x>11-m&&x<41+m&&z<5+m&&z>-24-m)||(x>-41-m&&x<-11+m&&z<-43.5+m&&z>-66.5-m);}
const beacons=[]; // bouncing arrows over the next thing to use
function makeBeacon(){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.arrow,transparent:true,depthWrite:false}));s.scale.set(.5,.5,1);s.visible=false;ROOT.add(s);beacons.push(s);return s;}

function buildSky(){
  TILE.set(M.wall,2.4);TILE.set(M.ground,8);TILE.set(M.pave,4.5);TILE.set(M.wood,1.6);TILE.set(M.plate,3);
  // ---------- sky: clean gradient ----------
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vD;void main(){float h=clamp(vD.y,0.,1.);vec3 zen=vec3(.38,.66,.93);vec3 hor=vec3(.81,.91,.95);vec3 c=mix(hor,zen,pow(h,.6));gl_FragColor=vec4(c,1.);}'});
  W.sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),skyMat);scene.add(W.sky);
  // ---------- light: bright day, soft shadows ----------
  scene.add(new THREE.HemisphereLight('#e3f0ff','#7f9a6a',0.62));
  W.sunDir=new V3(-0.45,0.8,0.4).normalize();
  const sun=new THREE.DirectionalLight('#fff2dc',0.92);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-24;sc.right=24;sc.top=24;sc.bottom=-24;sc.near=1;sc.far=140;sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.03;sun.shadow.radius=4;
  scene.add(sun);scene.add(sun.target);W.sun=sun;
}
function buildWorld(){

  // ---------- outer land (with the ravine cutting through) ----------
  floorSlab(-90,-11,60,-27,M.ground,true);
  floorSlab(-90,-36,-33,-170,M.ground,true);floorSlab(-16,-11,-33,-170,M.ground,true);floorSlab(-36,-16,-33,-47,M.ground,true);floorSlab(-36,-16,-63,-170,M.ground,true); // gap: flooded garden pool
  floorSlab(11,30,60,-27,M.ground,true);floorSlab(40,90,60,-27,M.ground,true);floorSlab(30,40,60,3,M.ground,true);floorSlab(30,40,-5,-27,M.ground,true); // gap: secret cellar
  floorSlab(11,90,-33,-170,M.ground,true);
  floorSlab(-11,11,5,60,M.ground,false);floorSlab(-11,11,-83,-170,M.ground,false);
  // ravine: teal water far below, chunky cliff rocks
  const water=new THREE.Mesh(new THREE.PlaneGeometry(180,6.2),M.water.clone());water.material.opacity=.95;water.rotation.x=-Math.PI/2;water.position.set(0,-7,-30);ROOT.add(water);W.ravineWater=water;
  for(let i=0;i<30;i++){const x=-70+i*4.8+hash2(i,2,3)*3,z=-30+(hash2(i,4,5)-.5)*4.5;addRock(x,-6.6,z,.8+hash2(i,6,7)*1.2,i*1.7,false,i%2?M.cliff:M.cliffDark);}
  // distant soft hills
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=140+hash2(i,1,2)*40,s=35+hash2(i,3,4)*30;const m=new THREE.Mesh(lowPoly(s,s*.32,s,1,i,.1),i%2?M.leaf:M.leaf2);m.position.set(Math.cos(a)*r,-3,-40+Math.sin(a)*r);ROOT.add(m);}

  // ---------- AREA 1: courtyard ----------
  floorSlab(-11,11,5,-22,M.ground,false);
  wall(-11,-4.2,4,5,3);wall(4.2,11,4,5,3);
  wall(-11,-10,4,-22,4);
  wall(10,11,4,-1,4); wall(10,11,-6,-15.1,4); wall(10,11,-15.7,-22,4);
  box(10,11,.55,4,-15.1,-15.7,M.wall); invis(10,11,4,14,-15.1,-15.7);
  holeMarker(10,11,-15.7,-15.1,['x-','x+'],9.35,-15.4);
  // side room (lever 1)
  floorSlab(11,16,-12,-19,M.pave,false);
  wall(11,16,-12,-13,3,false); wall(11,16,-18,-19,3,false); wall(15,16,-13,-18,3,false);
  // rune ledge
  box(-10,-6.5,0,2.4,-6,-10,M.wall);box(-10.06,-6.44,2.4,2.52,-5.94,-10.06,M.wallTop,{collide:false,fade:false});
  // gate wall
  wall(-11,-2,-22,-23,4.5); wall(2,11,-22,-23,4.5); box(-2,2,3.6,4.5,-22,-23,M.wall,{fade:true}); invis(-2,2,4.5,14,-22,-23);
  // decor
  addColumn(6.5,-3,3.2,.42,false);addColumn(6.5,-9,1.6,.42,true);addColumn(-6.5,1,2.4,.42,true);addColumn(-4,-19,3.4,.42,false);addColumn(4.5,-19,3.4,.42,false);
  const fallen=new THREE.Mesh(new THREE.CylinderGeometry(.4,.42,2.6,12),M.stone);fallen.rotation.z=Math.PI/2;fallen.rotation.y=.6;fallen.position.set(4.6,.4,-12.5);fallen.castShadow=fallen.receiveShadow=true;ROOT.add(fallen);box(3.4,5.8,0,.8,-12,-13.2,null);
  addUrn(-9.2,3,1.1);addUrn(9.2,3,1.1);addUrn(-9.2,-20.5,1.1);addUrn(8.6,-20.5,1.1);
  addRock(8.2,0.2,-6.5,.6,3.1,true);addRock(-3.5,.1,3,.4,4.2,false);addRock(2.5,.15,-15,.5,5.5,false);addRock(-8.5,.2,-14,.7,6.6,true);
  addTree(-15,-6,1.3,1);addTree(-17,4,1.5,2);addTree(13.6,3.2,1.2,3);addTree(46,-8,1.4,4);addCypress(-14,-16,1.1,5);addCypress(14.5,-25.6,1.2,6);
  // ---------- AREA 2: ravine ----------
  floorSlab(-11,11,-22,-27,M.ground,true);
  floorSlab(-11,11,-33,-44,M.ground,true);
  wall(-11,-10,-23,-27,4);wall(10,11,-23,-27,4);wall(-11,-10,-33,-44,4);wall(10,11,-33,-44,4);
  invis(-11,-10,-12,14,-27,-33);invis(10,11,-12,14,-27,-33);
  // grassy lips on the ravine edges
  box(-90,90,-.02,.02,-26.9,-27.2,M.cliffTop,{collide:false,cast:false,fade:false});box(-90,90,-.02,.02,-32.8,-33.1,M.cliffTop,{collide:false,cast:false,fade:false});
  box(5.6,7.2,0,3.8,-38,-39.6,M.wall); // rune column
  box(5.54,7.26,3.8,3.92,-37.94,-39.66,M.wallTop,{collide:false,fade:false});
  addColumn(-6,-37,2.8,.42,true);addRock(-8,.2,-41.5,.8,7.7,true);addRock(-3.5,.15,-42.5,.5,8.8,false);addUrn(9,-42.6,1.0);
  addTree(-16,-38,1.4,7);addTree(18,-40,1.5,8);addCypress(15,-46,1.3,9);addCypress(-44,-48,1.2,10);addTree(-20,-20,1.3,11);addTree(21,-27.5,1.2,12);
  // ---------- AREA 3: waterworks ----------
  floorSlab(-11,11,-44,-62.6,M.pave,false);
  wall(-11,-10,-44,-52.5,4);wall(-11,-10,-56.5,-62,4);wall(10,11,-44,-62,4);
  // vault (rune 3)
  wall(-10,-6,-44.6,-45,3,false);wall(-10,-6,-49.6,-50,3,false);
  wall(-6.5,-6,-45,-47.0,3,false);wall(-6.5,-6,-47.6,-49.6,3,false);box(-6.5,-6,.55,3,-47.0,-47.6,M.wall);
  holeMarker(-6.5,-6,-47.6,-47.0,['x+'],-5.45,-47.3);
  // alcove (light plate)
  wall(6,10,-52.6,-53,3,false);wall(6,10,-58.6,-59,3,false);
  wall(6,6.4,-53,-55.5,3,false);wall(6,6.4,-56.1,-58.6,3,false);box(6,6.4,.55,3,-55.5,-56.1,M.wall);
  holeMarker(6,6.4,-56.1,-55.5,['x-'],5.45,-55.8);
  // water channel (decor) with curb
  box(-10,-9,0,.3,-51,-61,M.wallTop);box(-8.2,-7.9,0,.3,-51,-61,M.wallTop);
  const ch=new THREE.Mesh(new THREE.PlaneGeometry(.9,10),M.water);ch.rotation.x=-Math.PI/2;ch.position.set(-8.6,.22,-56);ROOT.add(ch);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,10,10),M.iron);pipe.rotation.x=Math.PI/2;pipe.position.set(9.7,2.4,-50);pipe.castShadow=true;ROOT.add(pipe);
  // portcullis wall
  wall(-11,-2,-62,-62.6,4.5);wall(2,11,-62,-62.6,4.5);box(-2,2,3.6,4.5,-62,-62.6,M.wall,{fade:true});invis(-2,2,4.5,14,-62,-62.6);
  addUrn(-3.5,-60.5,1);addUrn(3.5,-60.5,1);addRock(3,.15,-46,.45,9.9,false);
  // ---------- AREA 4: fountain chamber ----------
  floorSlab(-11,11,-62.6,-83,M.pave,false);
  wall(-11,-10,-62.6,-82,5.5);wall(10,11,-62.6,-82,5.5);wall(-11,11,-82,-83,5.5);
  for(const z of [-66,-72,-78]){addColumn(-8.3,z,5.2,.45,false);addColumn(8.3,z,5.2,.45,false);}
  buildFountain();
  addCypress(-15,-70,1.4,13);addCypress(15,-74,1.4,14);addTree(-17,-86,1.6,15);addTree(17,-88,1.6,16);addTree(0,-92,1.7,17);addCypress(-6,-90,1.5,18);addCypress(7,-91,1.5,19);
  for(let i=0;i<22;i++){const side=i%2?1:-1,x=side*(24+hash2(i,1,99)*40),z=10-hash2(i,2,99)*110;if((z<-25&&z>-35)||inPlayZone(x,z,3))continue;(i%3?addTree:addCypress)(x,z,1.1+hash2(i,3,99)*.6,40+i);}
  for(let i=0;i<30;i++){const side=i%2?1:-1,x=side*(13+hash2(i,5,98)*12),z=8-hash2(i,6,98)*100;if((z<-25&&z>-35)||inPlayZone(x,z,1))continue;addBush(x,z,.8+hash2(i,7,98)*.8,i);}
  buildTufts();
}

function buildFountain(){
  const pts=[[.01,.12],[2.55,.12],[2.62,.78],[2.8,.86],[3.0,.8],[3.06,.06],[3.0,0]].map(p=>new THREE.Vector2(p[0],p[1]));
  const basin=new THREE.Mesh(new THREE.LatheGeometry(pts,40),M.stone);basin.position.set(F.x,0,F.z);basin.castShadow=basin.receiveShadow=true;ROOT.add(basin);
  box(F.x-2.8,F.x+2.8,0,.8,F.z+2.8,F.z-2.8,null);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.42,.55,2.6,14),M.stone);col.position.set(F.x,.8+1.3,F.z);col.castShadow=col.receiveShadow=true;ROOT.add(col);
  const bpts=[[.01,0],[.3,.02],[.62,.2],[.72,.34],[.62,.36],[.4,.22],[.01,.2]].map(p=>new THREE.Vector2(p[0],p[1]));
  const bowl=new THREE.Mesh(new THREE.LatheGeometry(bpts,28),M.stone);bowl.position.set(F.x,3.38,F.z);bowl.castShadow=true;ROOT.add(bowl);
  markFade(col,[bowl]);
  box(F.x-.72,F.x+.72,.8,3.6,F.z-.72,F.z+.72,null);
  W.spout=new V3(F.x,3.6,F.z);
  W.basinWater=new THREE.Mesh(new THREE.CircleGeometry(2.56,40),M.water);W.basinWater.rotation.x=-Math.PI/2;W.basinWater.position.set(F.x,.14,F.z);W.basinWater.visible=false;ROOT.add(W.basinWater);
  W.jet=new THREE.Mesh(new THREE.CylinderGeometry(.06,.16,1.4,12,1,true),M.jet);W.jet.position.set(F.x,4.3,F.z);W.jet.visible=false;ROOT.add(W.jet);
  W.sockets=[];
  [-1.2,0,1.2].forEach((dx,i)=>{const sx=F.x+dx,sz=F.z+2.75-Math.abs(dx)*.12;
    const s=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.3),M.socket);s.position.set(sx,.84,sz);ROOT.add(s);
    const g=new THREE.Mesh(new THREE.OctahedronGeometry(.17),M.gem);g.scale.y=1.4;g.position.set(sx,1.02,sz);g.visible=false;ROOT.add(g);W.sockets.push(g);});
  W.fLight=new THREE.PointLight('#9fe8d6',0,14,2);W.fLight.position.set(F.x,4.2,F.z);scene.add(W.fLight);
}

// sparse, chunky grass tufts and flowers (static, nothing thin enough to shimmer)
function buildTufts(){
  const tuft=new THREE.IcosahedronGeometry(.17,0);tuft.scale(1,.55,1);tuft.translate(0,.05,0);
  const flower=new THREE.IcosahedronGeometry(.07,0);flower.translate(0,.16,0);
  const rects=[[11,40,4,-23,.18],[-40,-11,-44,-66,.2],[-10,10,4,-22,.32],[-10,10,-23,-27,.32],[-10,10,-33,-44,.32],[-30,-11,30,-26,.12],[11,30,30,-26,.12],[-30,-11,-34,-95,.12],[11,30,-34,-95,.12],[-10,10,6,25,.12]];
  const rnd=(()=>{let s=99;return()=>{s=Math.imul(s^(s>>>15),2246822507)+0x6D2B79F5|0;return ((s>>>0)%100000)/100000;};})();
  const spots=[];
  for(const r of rects){const cnt=Math.floor(Math.abs((r[1]-r[0])*(r[3]-r[2]))*r[4]);
    for(let i=0;i<cnt;i++){const x=lerp(r[0],r[1],rnd()),z=lerp(r[2],r[3],rnd());
      let blocked=false;for(const c of colliders){if(c.max.y>.05&&c.min.y<.3&&x>c.min.x-.1&&x<c.max.x+.1&&z>c.min.z-.1&&z<c.max.z+.1){blocked=true;break;}}
      if(blocked||(z<-26.8&&z>-33.2)||(x>-36.2&&x<-15.8&&z<-46.8&&z>-63.2)||(x>29.8&&x<40.2&&z<3.2&&z>-5.2))continue;spots.push([x,z]);}}
  const tufts=new THREE.InstancedMesh(tuft,new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true}),spots.length*2);
  const flowers=new THREE.InstancedMesh(flower,new THREE.MeshLambertMaterial({color:'#ffffff'}),spots.length);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new V3(),pos=new V3(),col=new THREE.Color();let n=0,nf=0;
  const FL=['#ffffff','#ffd84d','#ff9fb8','#b9a7ff'];
  for(const [x,z] of spots){
    if(rnd()<.18){pos.set(x,0,z);q.identity();const s=.9+rnd()*.4;sc.set(s,s,s);m4.compose(pos,q,sc);flowers.setMatrixAt(nf,m4);col.set(FL[Math.floor(rnd()*4)]);flowers.setColorAt(nf,col);nf++;continue;}
    for(let k=0;k<2;k++){pos.set(x+(rnd()-.5)*.3,0,z+(rnd()-.5)*.3);q.setFromAxisAngle(new V3(0,1,0),rnd()*6.28);const s=.7+rnd()*.7;sc.set(s,s,s);m4.compose(pos,q,sc);tufts.setMatrixAt(n,m4);
      col.setHSL(.27+rnd()*.04,.34+rnd()*.1,.34+rnd()*.08);tufts.setColorAt(n,col);n++;}}
  tufts.count=n;flowers.count=nf;
  for(const im of [tufts,flowers]){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.receiveShadow=true;im.castShadow=false;ROOT.add(im);}
}

// ================= interactive objects =================
const gate={t:0,open:false},bridge={t:0,open:false},port={t:0,open:false},latch={t:0};
const levers=[],plates=[];let crank=null,block=null;const runes=[];
function buildInteractives(){
  // gate (wood + iron)
  gate.group=new THREE.Group();const gParts=[];
  for(let i=0;i<6;i++){gParts.push(box(-2+i*.667,-2+(i+1)*.667-.04,0,3.6,-22.32,-22.68,M.wood,{parent:gate.group,collide:false}).mesh);}
  for(const y of [.6,1.8,3.0]) gParts.push(box(-2,2,y,y+.16,-22.25,-22.75,M.iron,{parent:gate.group,collide:false}).mesh);
  ROOT.add(gate.group);markFadeGroup(gParts);
  gate.col=box(-2,2,0,3.6,-22.25,-22.75,null,{kind:'door'});gate.base={y0:0,y1:3.6};
  // drawbridge (pivot at far edge)
  bridge.pivot=new THREE.Group();bridge.pivot.position.set(0,0,-33);ROOT.add(bridge.pivot);
  for(let i=0;i<5;i++)box(-1.5+i*.6+.02,-1.5+(i+1)*.6-.02,-.28,0,0,6,M.wood,{parent:bridge.pivot,collide:false});
  for(const z of [.6,3,5.4])box(-1.55,1.55,-.34,-.24,z,z+.18,M.iron,{parent:bridge.pivot,collide:false});
  bridge.col=box(-1.5,1.5,-.3,0,-27,-33,null,{kind:'door'});bridge.col.on=false;
  box(-1.9,-1.6,0,2.2,-33.1,-33.5,M.stone);box(1.6,1.9,0,2.2,-33.1,-33.5,M.stone);
  // portcullis
  port.group=new THREE.Group();const pParts=[];
  for(let i=0;i<9;i++)pParts.push(box(-2+i*.5-.05,-2+i*.5+.05,0,3.6,-62.22,-62.38,M.iron,{parent:port.group,collide:false}).mesh);
  for(const y of [.4,1.3,2.2,3.1])pParts.push(box(-2,2,y,y+.1,-62.2,-62.4,M.iron,{parent:port.group,collide:false}).mesh);
  ROOT.add(port.group);markFadeGroup(pParts);
  port.col=box(-2,2,0,3.6,-62.1,-62.5,null,{kind:'door'});port.base={y0:0,y1:3.6};
  // levers
  levers.push(makeLever(13.9,-15.4,-Math.PI/2,'gate'),makeLever(-9.3,-46.1,Math.PI/2,'vault'));
  // crank (gold wheel)
  crank={pos:new V3(2.9,0,-34.4),t:0,used:false};
  box(2.6,3.2,0,.75,-34.15,-34.65,M.stone);
  crank.wheel=new THREE.Group();crank.wheel.position.set(2.9,1.05,-34.4);crank.wheel.rotation.y=Math.PI/2;ROOT.add(crank.wheel);
  const tor=new THREE.Mesh(new THREE.TorusGeometry(.32,.06,8,20),M.gold);tor.castShadow=true;crank.wheel.add(tor);
  for(let k=0;k<4;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.06,.62,.06),M.gold);sp.rotation.z=k*Math.PI/4;crank.wheel.add(sp);}
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.4,8),M.iron);axle.position.set(2.9,1.05,-34.4);axle.rotation.z=Math.PI/2;ROOT.add(axle);
  // plates
  plates.push(makePlate(-5,-55,1.0,8,'heavy','#f2873a'),makePlate(8.3,-55.8,.5,1,'light','#22bf9c'));
  // push block
  block={pos:new V3(-2,0,-7),vel:new V3(),hw:.6,h:1.2,kind:'block',stepH:0,onGround:false,home:new V3(-2,0,-7)};
  block.mesh=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),M.block);block.mesh.castShadow=block.mesh.receiveShadow=true;ROOT.add(block.mesh);
  const btop=new THREE.Mesh(new THREE.BoxGeometry(1.26,.14,1.26),M.blockTop);btop.position.y=.6;btop.castShadow=true;block.mesh.add(btop);
  block.col=box(0,1,0,1,0,1,null,{kind:'block'});block.col.body=block;syncBlock();
  // runes
  runes.push(makeRune(0,new V3(-8.3,2.4,-8),'rest','Courtyard ledge'),makeRune(1,new V3(6.4,3.8,-38.8),'perched','Ravine column'),makeRune(2,new V3(-8.6,0,-47.3),'vault','Waterworks vault'));
  W.beacon=makeBeacon();
}
function makeLever(x,z,rot,id,y){
  y=y||0;const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;ROOT.add(g);
  box(-.22,.22,0,.42,-.16,.16,M.stone,{parent:g,collide:false});
  const handle=new THREE.Group();handle.position.y=.42;g.add(handle);
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.04,.045,.55,8),M.wood);stick.position.y=.27;stick.castShadow=true;handle.add(stick);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.085,12,10),M.handle);knob.position.y=.56;handle.add(knob);
  handle.rotation.z=-.7;
  box(x-.22,x+.22,y,y+.42,z-.22,z+.22,null);
  return {id,pos:new V3(x,y,z),handle,t:0,pulled:false};
}
function makePlate(x,z,hw,need,label,ringColor){
  const m=new THREE.Mesh(boxGeo(hw*2,.12,hw*2,3,0,0,0),M.plate);m.position.set(x,0,z);m.receiveShadow=true;ROOT.add(m);
  const ring=new THREE.Mesh(new THREE.RingGeometry(hw*.5,hw*.72,32),M.plateRing.clone());ring.material.color.set(ringColor);ring.rotation.x=-Math.PI/2;ring.position.set(x,.065,z);ring.material.transparent=true;ring.material.opacity=.5;ROOT.add(ring);
  return {x,z,hw,need,label,on:false,mesh:m,ring};
}
function makeRune(i,pos,state,where){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),M.rune);m.scale.set(.85,1.25,.85);m.castShadow=true;ROOT.add(m);
  const light=new THREE.PointLight('#6ff0d4',.8,4,2);scene.add(light);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#5ff3cf',transparent:true,depthWrite:false,opacity:.7}));glow.scale.set(1.3,1.3,1);ROOT.add(glow);
  return {i,where,state,pos:pos.clone(),home:pos.clone(),vel:new V3(),hw:.2,h:.42,kind:'rune',stepH:.1,onGround:false,mesh:m,light,glow,t:0};
}
function syncBlock(){const b=block,c=block.col;c.min.set(b.pos.x-b.hw,b.pos.y,b.pos.z-b.hw);c.max.set(b.pos.x+b.hw,b.pos.y+b.h,b.pos.z+b.hw);}
