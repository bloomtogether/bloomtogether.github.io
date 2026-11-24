// ================= realistic look: Poly Haven sky + PBR ground, real grass, water, trees =================
// Sky: "Sunflowers (Pure Sky)", ground sets, Jacaranda tree: Poly Haven (CC0). Water normals: three.js examples (MIT).
const REAL={ready:false,tex:{},sun:new V3(.59,.68,-.43).normalize(),grass:null,water:null,forest:[],heart:null,leafMats:[]};
const texLoader=new THREE.TextureLoader();
function loadTex(url,srgb,rep,tries){tries=tries||0;return new Promise(res=>texLoader.load(url,t=>{t.wrapS=t.wrapT=rep===false?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.anisotropy=ANISO;if(srgb)t.encoding=THREE.sRGBEncoding;res(t);},undefined,()=>{if(tries<3)setTimeout(()=>loadTex(url,srgb,rep,tries+1).then(res),400*(tries+1));else res(null);}));}
const DRACO=new DRACOLoader();DRACO.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.149.0/examples/jsm/libs/draco/gltf/');
async function loadReal(){
  const T=REAL.tex,jobs=[];
  for(const n of ['ground','path','riverbed','rock','masonry','sandstone','paving'])for(const [k,s] of [['col',1],['nrm',0],['rgh',0]])jobs.push(loadTex('assets/tex/'+n+'_'+k+'.jpg',s&&/masonry|sandstone|paving/.test(n)).then(t=>T[n+'_'+k]=t));
  jobs.push(loadTex('assets/tex/waternormals.jpg',0).then(t=>T.water=t));
  jobs.push(loadTex('assets/env/sky_4k.jpg',1,false).then(t=>T.sky=t));
  jobs.push(new Promise(res=>new RGBELoader().load('assets/env/sky_1k.hdr',t=>{T.hdr=t;res();},undefined,()=>res())));
  const L=new GLTFLoader();L.setDRACOLoader(DRACO);
  jobs.push(L.loadAsync('assets/models/heart_tree_real.glb').then(g=>REAL.heartSrc=g.scene).catch(e=>console.warn('heart tree',e)));
  jobs.push(L.loadAsync('assets/models/tree_jacaranda.glb').then(g=>REAL.treeSrc=g.scene).catch(e=>console.warn('tree',e)));
  await Promise.all(jobs);REAL.ready=true;
}
// sky dome + image lighting from the same sphere, so the sun in the sky matches the light
function setupSky(){
  const T=REAL.tex;
  scene.background=null;
  if(T.sky){const sky=new THREE.Mesh(new THREE.SphereGeometry(480,64,32),new THREE.MeshBasicMaterial({map:T.sky,side:THREE.BackSide,fog:false,depthWrite:false,toneMapped:false}));
    sky.renderOrder=-10;scene.add(sky);if(W.sky)scene.remove(W.sky);W.sky=sky;}
  if(T.hdr){const s=new THREE.Scene();s.add(new THREE.Mesh(new THREE.SphereGeometry(10,64,32),new THREE.MeshBasicMaterial({map:T.hdr,side:THREE.BackSide})));
    const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(s,0,.1,100).texture;pm.dispose();T.hdr.dispose();}
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  W.sunDir.copy(REAL.sun);W.sun.color.set('#ffe7c6');W.sun.intensity=1.9;
  W.sun.shadow.mapSize.set(2048,2048);renderer.shadowMap.type=THREE.PCFShadowMap;W.sun.shadow.bias=-.0004;W.sun.shadow.normalBias=.04;W.sun.shadow.radius=3;
  if(W.hemi)W.hemi.intensity=.28;
  scene.fog=new THREE.Fog('#bfcfd8',90,520);
}
const pbr=(n,rep,o)=>{const T=REAL.tex;const m=new THREE.MeshStandardMaterial(Object.assign({map:T[n+'_col'],normalMap:T[n+'_nrm'],roughnessMap:T[n+'_rgh'],roughness:1,metalness:0},o||{}));m.name=n;return m;};
// ----- the ground: four Poly Haven sets blended by weights stored in vertex colours (r=path, g=riverbed, b=rock) -----
function terrainMaterial(){
  const T=REAL.tex,m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,envMapIntensity:.45});
  const U={};for(const n of ['ground','path','riverbed','rock'])for(const k of ['col','nrm','rgh'])U['t_'+n+'_'+k]={value:T[n+'_'+k]};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    const decl=Object.keys(U).map(k=>'uniform sampler2D '+k+';').join('\n');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;\n'+decl+`
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
`)
    .replace('#include <map_fragment>',`
vec3 cw=vColor;vec4 w=vec4(clamp(1.-cw.r-cw.g-cw.b,0.,1.),cw.r,cw.g,cw.b);vec2 p=vWP.xz;
vec2 uG=p/3.2,uP=p/2.6,uR=p/3.,uK=p/4.;
vec3 cG=mix(lin(texture2D(t_ground_col,uG).rgb),lin(texture2D(t_ground_col,uG*.23+.37).rgb),.4);
float dc=length(vWP.xz-cameraPosition.xz);float big=texture2D(t_ground_col,p/61.+.13).g*1.6;cG=mix(cG*vec3(.8,.95,.62),vec3(.045,.085,.02)*(.75+.5*big),.45+.4*smoothstep(14.,34.,dc));
vec3 alb=cG*w.x;if(w.y>.003)alb+=lin(texture2D(t_path_col,uP).rgb)*vec3(.62,.58,.52)*w.y;if(w.z>.003)alb+=lin(texture2D(t_riverbed_col,uR).rgb)*w.z;if(w.w>.003)alb+=lin(texture2D(t_rock_col,uK).rgb)*w.w;
diffuseColor.rgb*=alb;`)
    .replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness*(texture2D(t_ground_rgh,uG).g*w.x+(w.y>.003?texture2D(t_path_rgh,uP).g*w.y:0.)+(w.z>.003?texture2D(t_riverbed_rgh,uR).g*w.z:0.)+(w.w>.003?texture2D(t_rock_rgh,uK).g*w.w:0.));`)
    .replace('#include <normal_fragment_maps>',`
vec3 nT=texture2D(t_ground_nrm,uG).xyz*w.x;if(w.y>.003)nT+=texture2D(t_path_nrm,uP).xyz*w.y;if(w.z>.003)nT+=texture2D(t_riverbed_nrm,uR).xyz*w.z;if(w.w>.003)nT+=texture2D(t_rock_nrm,uK).xyz*w.w;nT=nT*2.-1.;
nT.xy*=.9;vec3 Tv=normalize((viewMatrix*vec4(1.,0.,0.,0.)).xyz);Tv=normalize(Tv-normal*dot(normal,Tv));vec3 Bv=cross(Tv,normal);
normal=normalize(mat3(Tv,Bv,normal)*normalize(nT));`)
    .replace('#include <color_fragment>','');
  };
  return m;
}
// ----- grass: real blades around the camera, laid out in 8 m chunks that follow the players -----
function newGrassField(allowed,height,wake){return {chunk:8,R:3,per:2300,slots:[],center:[1e9,1e9],allowed,height,wake};}
let GRASS=null,GRASS_CH1=null;
function buildGrass(GRASS){
  const n=(GRASS.R*2+1)**2,count=n*GRASS.per;
  const blade=new THREE.BufferGeometry();
  // a tapered blade: 3 segments + tip, bends forward with height
  const P=[],UV=[],I=[];const segs=3;
  for(let i=0;i<=segs;i++){const t=i/segs,w=.026*(1-t*.8);P.push(-w,t,0,w,t,0);UV.push(0,t,1,t);if(i<segs){const k=i*2;I.push(k,k+1,k+2,k+1,k+3,k+2);}}
  blade.setAttribute('position',new THREE.Float32BufferAttribute(P,3));blade.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));blade.setIndex(I);
  const g=new THREE.InstancedBufferGeometry();g.index=blade.index;g.attributes.position=blade.attributes.position;g.attributes.uv=blade.attributes.uv;
  const ofs=new Float32Array(count*4),rnd=new Float32Array(count*4);
  g.setAttribute('ofs',new THREE.InstancedBufferAttribute(ofs,4));g.setAttribute('rnd',new THREE.InstancedBufferAttribute(rnd,4));g.instanceCount=count;
  const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,lights:false,
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uSun:{value:REAL.sun.clone()},uCam:{value:new V3()},uR:{value:GRASS.chunk*(GRASS.R+.5)},uWake:{value:1},uPush:{value:[new V3(0,-99,0),new V3(0,-99,0)]},uVein:{value:VEIN_NONE},uRootOn:{value:new Array(7).fill(0)}}]),
    vertexShader:`attribute vec4 ofs;attribute vec4 rnd;uniform float uTime;uniform vec3 uCam;uniform float uR;uniform vec3 uPush[2];uniform sampler2D uVein;uniform float uRootOn[7];varying vec2 vUv;varying float vShade;varying vec3 vCol;varying float vGlow;
#include <fog_pars_vertex>
void main(){vUv=uv;float h=ofs.w;if(h<=0.){gl_Position=vec4(2.,2.,2.,1.);return;}
 float d=length(ofs.xz-uCam.xz);float fade=smoothstep(uR,uR*.72,d);h*=fade;
 float a=rnd.x*6.2832;float c=cos(a),s=sin(a);vec3 p=position;p.y*=h;p.x*=.85+rnd.y*.5;
 float t=uv.y;float bend=t*t;
 vec2 wind=vec2(sin(uTime*1.3+ofs.x*.21+ofs.z*.17)+.5*sin(uTime*2.7+ofs.x*.6),cos(uTime*1.1+ofs.z*.23))*(.10+.06*rnd.z);
 vec3 wp=vec3(p.x*c,p.y,p.x*s)+ofs.xyz;wp.xz+=wind*bend*h+vec2(c,s)*bend*h*.25*(rnd.w-.5);
 for(int i=0;i<2;i++){vec3 q=uPush[i];vec2 dd=wp.xz-q.xz;float l=length(dd);float k=smoothstep(1.1,.2,l)*step(abs(q.y-ofs.y),1.5);wp.xz+=normalize(dd+1e-4)*k*bend*h*.9;wp.y-=k*bend*h*.35;}
 vec3 vn=texture2D(uVein,ofs.xz/240.+.5).rgb;int ri=int(clamp(vn.g*8.,0.,6.));vGlow=vn.r*uRootOn[ri]*(.7+.3*sin(vn.b*18.-uTime*1.6))*t;
 vShade=t;vCol=mix(vec3(.075,.15,.03),vec3(.22,.34,.07),rnd.y)*mix(.85,1.15,rnd.z);
 if(rnd.w>.95)vCol=vec3(.36,.33,.13);
 vec4 mvPosition=viewMatrix*vec4(wp,1.);gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`,
    fragmentShader:`uniform vec3 uSun;uniform float uWake;varying vec2 vUv;varying float vShade;varying vec3 vCol;varying float vGlow;
#include <common>
#include <fog_pars_fragment>
void main(){float ao=mix(.28,1.,smoothstep(0.,.8,vShade));
 vec3 sunC=vec3(1.,.9,.78)*1.9;vec3 sky=vec3(.5,.62,.75)*.5;
 vec3 col=vCol*(sky+sunC*.6*(.5+.5*vShade))*ao;
 col=mix(col*vec3(.92,.92,.9),col,uWake);
 col+=vec3(.2,.85,.7)*vGlow*1.1;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <encodings_fragment>
 #include <fog_fragment>
}`});
  const mesh=new THREE.Mesh(g,mat);mesh.frustumCulled=false;mesh.receiveShadow=false;ROOT.add(mesh);
  GRASS.mesh=mesh;GRASS.ofs=ofs;GRASS.rnd=rnd;GRASS.geo=g;GRASS.mat=mat;
  for(let i=0;i<n;i++)GRASS.slots.push({key:null,i});
}
function grassAllowed(x,z){
  if(inCave(x,z,.5))return 0;
  if(Math.max(Math.abs(x),Math.abs(z))>118)return 0;
  if(riverDist(x,z)<RIVER_W+2.2)return 0;
  const pd=pathDist(x,z);if(pd<1.3)return 0;
  const r=Math.hypot(x,z);if(r<5)return 0;
  if(VALE.plot&&Math.hypot(x-VALE.plot.x,z-VALE.plot.z)<5.2)return 0;
  return clamp((pd-1.3)/1.5,0,1)*(r<16?.5:1);
}
function fillChunk(GRASS,slot,cx,cz){
  const S=GRASS.chunk,base=slot.i*GRASS.per,o=GRASS.ofs,r=GRASS.rnd;let seed=(cx*73856093)^(cz*19349663);
  const rnd=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x6D2B79F5|0;return ((seed>>>0)%100000)/100000;};
  for(let k=0;k<GRASS.per;k++){const x=(cx+rnd())*S,z=(cz+rnd())*S,j=(base+k)*4;const a=GRASS.allowed(x,z);const keep=rnd()<a;
    o[j]=x;o[j+1]=keep?GRASS.height(x,z):0;o[j+2]=z;o[j+3]=keep?.22+rnd()*.38:0;r[j]=rnd();r[j+1]=rnd();r[j+2]=rnd();r[j+3]=rnd();}
  slot.key=cx+','+cz;
}
function updateGrass(GRASS,t){
  if(!GRASS||!GRASS.mesh)return;
  const S=GRASS.chunk,cx=Math.floor(camTarget.x/S),cz=Math.floor(camTarget.z/S);
  GRASS.mat.uniforms.uTime.value=t;GRASS.mat.uniforms.uCam.value.copy(camTarget);GRASS.mat.uniforms.uWake.value=GRASS.wake();
  GRASS.mat.uniforms.uPush.value[0].copy(golem.pos);GRASS.mat.uniforms.uPush.value[1].copy(sprite.pos);
  if(cx===GRASS.center[0]&&cz===GRASS.center[1])return;
  GRASS.center=[cx,cz];const want=new Set();for(let i=-GRASS.R;i<=GRASS.R;i++)for(let j=-GRASS.R;j<=GRASS.R;j++)want.add((cx+i)+','+(cz+j));
  const free=GRASS.slots.filter(s=>!want.has(s.key));const have=new Set(GRASS.slots.map(s=>s.key));
  for(const k of want)if(!have.has(k)){const s=free.pop();const [a,b]=k.split(',').map(Number);fillChunk(GRASS,s,a,b);}
  GRASS.geo.attributes.ofs.needsUpdate=true;GRASS.geo.attributes.rnd.needsUpdate=true;
}
// ----- water: reflective, slightly green like a slow river -----
function buildWater(){
  const pts=[];for(let x=-175;x<=175;x+=4)pts.push([x,riverZ(x)]);
  const g=new THREE.BufferGeometry(),v=[],idx=[],uv=[];
  pts.forEach((p,i)=>{const q=pts[Math.min(i+1,pts.length-1)],o=pts[Math.max(i-1,0)];const dx=q[0]-o[0],dz=q[1]-o[1],l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l,w=RIVER_W+3;
    v.push(p[0]+nx*w,-(p[1]+nz*w),0,p[0]-nx*w,-(p[1]-nz*w),0);uv.push(0,i/4,1,i/4);if(i){const k=i*2;idx.push(k-2,k,k-1,k-1,k,k+1);}});
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const T=REAL.tex;if(T.water){T.water.wrapS=T.water.wrapT=THREE.RepeatWrapping;}
  const nm=T.water;if(nm)nm.repeat.set(1,1);
  const mat=new THREE.MeshStandardMaterial({color:'#2c3d2a',roughness:.06,metalness:.0,normalMap:nm,normalScale:new THREE.Vector2(.35,.35),envMapIntensity:1.15,transparent:true,opacity:.93,side:THREE.DoubleSide});
  mat.onBeforeCompile=sh=>{sh.uniforms.uT={value:0};mat.userData.sh=sh;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWXZ;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWXZ=(modelMatrix*vec4(transformed,1.)).xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWXZ;uniform float uT;')
      .replace('#include <normal_fragment_maps>',`vec3 n1=texture2D(normalMap,vWXZ*.045+vec2(uT*.012,uT*.007)).xyz*2.-1.;vec3 n2=texture2D(normalMap,vWXZ*.11-vec2(uT*.009,-uT*.013)).xyz*2.-1.;
vec3 nT=normalize(vec3((n1.xy+n2.xy)*normalScale.x,1.));vec3 Tv=normalize((viewMatrix*vec4(1.,0.,0.,0.)).xyz);Tv=normalize(Tv-normal*dot(normal,Tv));vec3 Bv=cross(Tv,normal);normal=normalize(mat3(Tv,Bv,normal)*nT);`);};
  const w=new THREE.Mesh(g,mat);w.rotation.x=-Math.PI/2;w.position.y=RIVER_WATER;w.receiveShadow=true;ROOT.add(w);REAL.water=w;w.visible=false;
  return w;
}
// ----- trees -----
function treeParts(src){const parts=[];src.updateMatrixWorld(true);src.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push({name:o.name,geo:g,mat:o.material});}});return parts;}
function leafify(src){
  const m=new THREE.MeshLambertMaterial({map:src.map,vertexColors:true,color:src.color.clone(),name:'Leaves',emissive:new THREE.Color('#46592a'),emissiveMap:src.map});
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <alphatest_fragment>',`
#ifdef USE_MAP
 vec2 dUv=vUv*1024.;float lod=log2(max(length(dFdx(dUv)),length(dFdy(dUv))));diffuseColor.a*=1.+min(1.6,max(0.,lod)*.22);
#endif
 float camD=length(vViewPosition);if(camD<9.){float dz=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(dz>smoothstep(4.,9.,camD))discard;}
 if(diffuseColor.a<alphaTest)discard;`);};
  m.alphaTest=.45;m.side=THREE.DoubleSide;m.transparent=false;REAL.leafMats.push(m);
  const dm=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:m.map,alphaTest:.45});return {mat:m,depth:dm};}
// a copy of a tree material that fades by a per-instance amount (screen-door dither), for trees that stand
// between the camera and a player
function withFade(mat){const m=mat.clone();const prev=mat.onBeforeCompile;
  m.onBeforeCompile=(sh,r)=>{
    sh.vertexShader='attribute float aFade;\nvarying float vFade;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFade=aFade;');
    sh.fragmentShader='varying float vFade;\n'+sh.fragmentShader.replace('#include <alphatest_fragment>',
      'if(vFade>.001){float fd=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(fd<vFade)discard;}\n#include <alphatest_fragment>');
    if(prev)prev(sh,r);};
  m.customProgramCacheKey=()=>'treefade-'+(mat.name||'wood');if(REAL.leafMats.includes(mat))REAL.leafMats.push(m);return m;}
function buildRealForest(spots,opt){
  if(!REAL.treeSrc)return;
  opt=opt||{};const hAt=opt.h||valeH;
  // the forest uses the dense Jacaranda canopy (shared with the Heart Tree) over the lighter wood
  const parts=treeParts(REAL.treeSrc).filter(p=>!/Leaves/.test(p.name));
  if(REAL.heartSrc){let lv=null;REAL.heartSrc.traverse(o=>{if(o.isMesh&&/Leaves/.test(o.name))lv=o;});if(lv)parts.push({name:'Leaves',geo:lv.geometry,mat:lv.material.clone()});}
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new V3(),p=new V3(),col=new THREE.Color();
  const wood=parts.find(x=>!/Leaves/.test(x.name)),leaves=parts.find(x=>/Leaves/.test(x.name));
  const lf=leafify(leaves.mat);leaves.mat=lf.mat;const depth=lf.depth;if(!opt.h)VALE.foliageMat=lf.mat;
  wood.mat=new THREE.MeshLambertMaterial({map:wood.mat.map,color:wood.mat.color.clone()});
  const woodFade=withFade(wood.mat),leafFade=withFade(leaves.mat);
  // a light trunk for distant trees: the canopy hides the branches anyway
  const stub=new THREE.CylinderGeometry(.55,1.0,9,7,1,true);stub.translate(0,4.5,0);
  if(!leaves.sparse)leaves.sparse=sparseLeaves(leaves.geo,.5,1.3);
  if(!leaves.sparser)leaves.sparser=sparseLeaves(leaves.geo,.2,1.75); // far away, in the haze
  // trees are grouped by sector (for frustum culling); each group has a full-detail set and a light set,
  // and every few frames each tree goes into one or the other by its distance from the camera
  const sect=new Map();
  spots.forEach((sp,j)=>{const k=Math.floor((Math.atan2(sp[1],sp[0])+Math.PI)/(Math.PI*2)*12)+(Math.hypot(sp[0],sp[1])>60?12:0);if(!sect.has(k))sect.set(k,[]);sect.get(k).push(j);});
  const shared=(src)=>{const g=new THREE.BufferGeometry();g.index=src.index;for(const k in src.attributes)g.setAttribute(k,src.attributes[k]);return g;};
  const F={root:ROOT,groups:[],woodMat:wood.mat,leafMat:leaves.mat,woodFade,leafFade,near:opt.lodNear||42,mid:opt.lodMid||100,far:opt.lodFar||330,t:0,cam:new V3(1e9,0,0)};
  for(const idx of sect.values()){
    const box3=new THREE.Box3();for(const j of idx){const [x,z,sc]=spots[j];const y=hAt(x,z);box3.expandByPoint(new V3(x-14*sc,y-1,z-14*sc));box3.expandByPoint(new V3(x+14*sc,y+22*sc,z+14*sc));}
    const sphere=box3.getBoundingSphere(new THREE.Sphere());
    const mk=(geo,mat,leafy,full)=>{const g=shared(geo);g.boundingSphere=sphere.clone();g.boundingBox=box3.clone();
      if(full)g.setAttribute('aFade',new THREE.InstancedBufferAttribute(new Float32Array(idx.length),1));
      const im=new THREE.InstancedMesh(g,mat,idx.length);im.count=0;im.castShadow=full&&!leafy;im.receiveShadow=full;if(leafy)im.customDepthMaterial=depth;
      if(leafy){im.setColorAt(0,col.set('#fff'));}ROOT.add(im);REAL.forest.push(im);return im;};
    const trees=idx.map(j=>{const [x,z,sc]=spots[j];const y=hAt(x,z)-.15;p.set(x,y,z);q.setFromAxisAngle(_yAx,(j*2.399)%6.283);s.set(sc,sc*(.9+((j*7)%5)*.05),sc);
      return {x,z,y,s:sc,f:0,slot:-1,m:new THREE.Matrix4().compose(p,q,s),c:new THREE.Color().setHSL(.2+((j*13)%9)*.008,.2,.86+((j*5)%7)*.02)};});
    F.groups.push({trees,fullWood:mk(wood.geo,wood.mat,false,true),fullLeaf:mk(leaves.geo,leaves.mat,true,true),lightWood:mk(stub,wood.mat,false,false),lightLeaf:mk(leaves.sparse,leaves.mat,true,false),farLeaf:mk(leaves.sparser,leaves.mat,true,false)});
  }
  REAL.forestSets=REAL.forestSets||[];REAL.forestSets.push(F);updateForestLOD(F,true);
}
// re-sort trees into full detail (near the camera) and light (further away); far beyond the fog they are skipped
function updateForestLOD(F,force){
  const c=camera.position;if(!force&&Math.hypot(c.x-F.cam.x,c.z-F.cam.z)<3)return;F.cam.copy(c);
  const n2=F.near*F.near,m2=F.mid*F.mid,f2=F.far*F.far;
  for(const G of F.groups){let a=0,b=0,e=0;
    const fa=G.fullLeaf.geometry.attributes.aFade.array,fw=G.fullWood.geometry.attributes.aFade.array;
    for(const t of G.trees){t.slot=-1;const d2=(t.x-c.x)**2+(t.z-c.z)**2;if(d2>f2){t.f=0;continue;}
      if(d2<n2){G.fullWood.setMatrixAt(a,t.m);G.fullLeaf.setMatrixAt(a,t.m);G.fullLeaf.setColorAt(a,t.c);fa[a]=fw[a]=t.f*.88;t.slot=a;a++;}
      else{t.f=0;G.lightWood.setMatrixAt(b,t.m);b++;const L=d2<m2?G.lightLeaf:G.farLeaf,k=d2<m2?b-1-e:e;if(d2<m2)L.setMatrixAt(k,t.m),L.setColorAt(k,t.c);else{L.setMatrixAt(e,t.m);L.setColorAt(e,t.c);e++;}}}
    G.fullWood.count=G.fullLeaf.count=a;G.lightWood.count=b;G.lightLeaf.count=b-e;G.farLeaf.count=e;
    for(const im of [G.fullWood,G.fullLeaf,G.lightWood,G.lightLeaf,G.farLeaf]){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}
    G.fullLeaf.geometry.attributes.aFade.needsUpdate=G.fullWood.geometry.attributes.aFade.needsUpdate=true;}
}
// how much a tree's crown (an ellipsoid round its branches and leaves) blocks the line from the camera to a player
function treeBlocks(c,p,t){const R=12.5*t.s,H=10*t.s,cy=t.y+10.5*t.s;
  const ax=(c.x-t.x)/R,ay=(c.y-cy)/H,az=(c.z-t.z)/R,dx=(p.x-t.x)/R-ax,dy=(p.y+1-cy)/H-ay,dz=(p.z-t.z)/R-az;
  const L=dx*dx+dy*dy+dz*dz,k=L>0?clamp(-(ax*dx+ay*dy+az*dz)/L,0,1):0;
  const qx=ax+dx*k,qy=ay+dy*k,qz=az+dz*k;return smooth(1.12,.82,Math.sqrt(qx*qx+qy*qy+qz*qz));}
// trees near the camera that hide either player (or that the camera is inside) fade out, and back when clear
function updateTreeFade(F,dt){const c=camera.position,play=G.phase==='play'||G.phase==='end';
  for(const G0 of F.groups){const A=G0.fullLeaf.geometry.attributes.aFade,W=G0.fullWood.geometry.attributes.aFade;let ch=false;
    let any=false;
    for(const t of G0.trees){if(t.slot<0)continue;
      const want=play?Math.max(treeBlocks(c,golem.pos,t),treeBlocks(c,sprite.pos,t)):0;
      const f=approach(t.f,want,dt*(want>t.f?3:1.6));if(f!==t.f){t.f=f;A.array[t.slot]=W.array[t.slot]=f*.88;ch=true;}if(f>0)any=true;}
    if(ch)A.needsUpdate=W.needsUpdate=true;
    // the fading shaders cost a little (no early depth test), so a group uses them only while one of its trees fades
    G0.fullWood.material=any?F.woodFade:F.woodMat;G0.fullLeaf.material=any?F.leafFade:F.leafMat;}}
function updateForests(dt){if(!REAL.forestSets||!curReg)return;for(const F of REAL.forestSets)if(F.root===curReg.group){updateForestLOD(F);updateTreeFade(F,dt||1/60);}}
function buildRealHeartTree(th){
  if(!REAL.heartSrc)return null;
  const t=REAL.heartSrc;t.scale.setScalar(2.3);t.position.set(0,th-.3,0);
  t.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
    if(/Leaves/.test(o.name)){const lf=leafify(o.material);o.material=lf.mat;o.customDepthMaterial=lf.depth;VALE.leaf=o;}
    else if(/Root/.test(o.name)){o.visible=false;}
    else{o.material.envMapIntensity=.6;}});
  ROOT.add(t);buildRootVeins(th);return t;
}
// realistic stone for gates, waystones, bridges and ruins
let _stoneReal=null;
function stoneReal(){if(!_stoneReal){_stoneReal=pbr('masonry',1,{color:new THREE.Color('#d9cfbf')});}return _stoneReal;}
function realifyProp(root){root.traverse(o=>{if(!o.isMesh)return;const n=o.material.name;
  if(n==='Stone'||n==='Trim')o.material=n==='Trim'?(stoneReal.trim||(stoneReal.trim=pbr('masonry',1,{color:new THREE.Color('#a89a88')}))):stoneReal();
  else if(n==='Wood')o.material=new THREE.MeshStandardMaterial({map:o.material.map,color:'#8a7a68',roughness:.85});});}
function updateReal(dt,t){
  updateForests(dt);
  if(G.region==='ch1'){updateGrass(GRASS_CH1,t);return;}
  if(G.region!=='vale')return;
  updateGrass(GRASS,t);
  if(REAL.water){REAL.water.visible=VALE.wake>.02;REAL.water.position.y=lerp(RIVER_WATER-.7,RIVER_WATER,VALE.wake);const sh=REAL.water.material.userData.sh;if(sh)sh.uniforms.uT.value=t;}
}

// the seven roots run under the Vale: a woken root shows as a soft glowing vein through the grass
// a 240 m map of the roots for the grass: r = glow strength, g = which root, b = distance along it
const VEIN_NONE=new THREE.DataTexture(new Uint8Array(4),1,1);VEIN_NONE.needsUpdate=true;
function veinMap(paths){
  const N=256,d=new Uint8Array(N*N*4),px=240/N;
  paths.forEach((pts,k)=>{for(let i=0;i<pts.length-1;i++)for(let s=0;s<4;s++){const f=s/4,x=lerp(pts[i][0],pts[i+1][0],f),z=lerp(pts[i][1],pts[i+1][1],f),u=(i+f)/(pts.length-1);
    const rad=1.9*(1-u*.6),str=1-smooth(.75,1,u),cx=(x+120)/px,cz=(z+120)/px,rr=Math.ceil(rad/px)+1;
    for(let j=Math.floor(cz-rr);j<=cz+rr;j++)for(let q=Math.floor(cx-rr);q<=cx+rr;q++){if(q<0||j<0||q>=N||j>=N)continue;
      const dd=Math.hypot((q+.5-cx)*px,(j+.5-cz)*px),v=Math.max(0,1-dd/rad)*str*255,o=(j*N+q)*4;
      if(v>d[o]){d[o]=v;d[o+1]=(k+.5)/8*255;d[o+2]=u*255;}}}});
  const t=new THREE.DataTexture(d,N,N);t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}
function buildRootVeins(th){
  const ox=-.07*2.3,oz=-.4*2.3;const paths=[];
  for(let k=0;k<7;k++){const a=k/7*Math.PI*2+.2,pts=[];
    for(let i=0;i<=40;i++){const r=4+i*.62,w=Math.sin(i*.35+k*1.7)*.18+Math.sin(i*.9+k)*.06;pts.push([ox+Math.cos(a+w)*r,oz-Math.sin(a+w)*r]);}paths.push(pts);
    const v=[],idx=[],uv=[];
    pts.forEach((pt,i)=>{const q=pts[Math.min(i+1,pts.length-1)],o=pts[Math.max(i-1,0)];const dx=q[0]-o[0],dz=q[1]-o[1],l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l,wd=.55*(1-i/48);
      for(const sg of [1,-1]){const x=pt[0]+nx*wd*sg,z=pt[1]+nz*wd*sg;v.push(x,valeH(x,z)+.07,z);}uv.push(0,i/40,1,i/40);if(i){const b=i*2;idx.push(b-2,b-1,b,b-1,b+1,b);}});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uOn:{value:0},uT:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;uniform float uOn;uniform float uT;void main(){float e=1.-abs(vUv.x*2.-1.);float pulse=.75+.25*sin(vUv.y*18.-uT*1.6);float a=smoothstep(0.,.8,e)*(1.-smoothstep(.75,1.,vUv.y))*uOn*pulse;gl_FragColor=vec4(vec3(.25,.95,.8)*a*.9,1.);}'});
    const mesh=new THREE.Mesh(g,m);mesh.renderOrder=2;ROOT.add(mesh);VALE.roots.push({vein:mesh,material:m});}
  VALE.veinTex=veinMap(paths);if(GRASS&&GRASS.mat)GRASS.mat.uniforms.uVein.value=VALE.veinTex;
}

function sparseLeaves(src,keep,grow){
  const idx=src.index.array,pos=src.attributes.position,n=pos.count;
  const parent=new Int32Array(n);for(let i=0;i<n;i++)parent[i]=i;
  const find=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
  for(let t=0;t<idx.length;t+=3){const a=find(idx[t]),b=find(idx[t+1]),c=find(idx[t+2]);parent[b]=a;parent[c]=a;}
  const keepRoot=new Map();let seed=11;const rnd=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x6D2B79F5|0;return ((seed>>>0)%1000)/1000;};
  const out=[];for(let t=0;t<idx.length;t+=3){const r=find(idx[t]);if(!keepRoot.has(r))keepRoot.set(r,rnd()<keep);if(keepRoot.get(r))out.push(idx[t],idx[t+1],idx[t+2]);}
  const g=src.clone();g.setIndex(out);
  // grow each card about its centre
  const P=g.attributes.position,sum=new Map();for(let i=0;i<n;i++){const r=find(i);const c=sum.get(r)||[0,0,0,0];c[0]+=P.getX(i);c[1]+=P.getY(i);c[2]+=P.getZ(i);c[3]++;sum.set(r,c);}
  for(let i=0;i<n;i++){const c=sum.get(find(i));const cx=c[0]/c[3],cy=c[1]/c[3],cz=c[2]/c[3];P.setXYZ(i,cx+(P.getX(i)-cx)*grow,cy+(P.getY(i)-cy)*grow,cz+(P.getZ(i)-cz)*grow);}
  P.needsUpdate=true;return g;
}
