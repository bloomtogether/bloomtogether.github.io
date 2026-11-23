// ================= saved progress & settings =================
// One save per laptop. Online, the host's save is the one that counts; the guest mirrors it while playing.
const SAVE_KEY='bs_save_v1';
const DEFAULT_SETTINGS={music:.55,sfx:.8,camMotion:'full',reduceFlash:false,shake:false};
function freshProgress(){return {v:1,roots:0,ws:{vale_meadow:1},seeds:{},petals:{},secrets:{},planted:0,seen:{},ch1:{done:0,best:0},settings:Object.assign({},DEFAULT_SETTINGS)};}
let PROG=freshProgress();
function loadProgress(){try{const t=localStorage.getItem(SAVE_KEY);if(!t)return;const o=JSON.parse(t);if(!o||o.v!==1)return;
  const f=freshProgress();PROG=Object.assign(f,o);PROG.settings=Object.assign({},DEFAULT_SETTINGS,o.settings||{});PROG.ch1=Object.assign(f.ch1,o.ch1||{});}catch(e){}}
let saveT=0;
function saveProgress(){if(mode==='online'&&role!=='host')return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(PROG));}catch(e){}}
function saveSoon(){saveT=.6;}
function eraseProgress(){const st=PROG.settings;PROG=freshProgress();PROG.settings=st;saveProgress();}
const countKeys=o=>Object.keys(o).length;
function seedsFound(){return countKeys(PROG.seeds);}
function seedsIn(reg){return SEEDS.filter(s=>s.reg===reg);}
function seedsFoundIn(reg){return seedsIn(reg).filter(s=>PROG.seeds[s.id]).length;}

// ================= regions: one area is loaded (visible and solid) at a time =================
const REG={};let curReg=null;
function beginRegion(id,o){
  const r={id,name:o.name,short:o.short||o.name,group:new THREE.Group(),colliders:[],fadeables:[],terrain:o.terrain||null,hazard:o.hazard||null,
    fog:o.fog||[70,190],spawn:o.spawn,secrets:o.secrets||[],talk:o.talk||[],chapter:o.chapter||0};
  r.group.visible=false;r.group.name='region-'+id;scene.add(r.group);REG[id]=r;ROOT=r.group;colliders.length=0;fadeables.length=0;return r;
}
function endRegion(r){r.colliders=colliders.slice();r.fadeables=fadeables.slice();colliders.length=0;fadeables.length=0;ROOT=scene;}
function enterRegion(id){
  const r=REG[id];if(!r)return;
  for(const k in REG)REG[k].group.visible=k===id;
  curReg=r;G.region=id;
  colliders.length=0;colliders.push(...r.colliders,golem.col);
  fadeables.length=0;fadeables.push(...r.fadeables);
  scene.fog.near=r.fog[0];scene.fog.far=r.fog[1];camSnap=true;
  for(const b of [golem,sprite]){b.safe=null;}
}
// smooth ground given by a height function (the Vale's hills). Acts like one more collider under everything.
const TERR={kind:'terrain',on:true,surface:'grass',min:new V3(-1e4,-1e4,-1e4),max:new V3(1e4,0,1e4)};
function terrainAt(x,z){return curReg&&curReg.terrain?curReg.terrain(x,z):-1e9;}

// ================= Blender props (assets/models/*.glb, textures from Poly Haven, CC0) =================
const PROP_FILES={tree:'heart_tree',gate:'region_gate',waystone:'waystone',seesaw:'seesaw',petal:'memory_petal',seed:'golden_seed',bridge:'stone_bridge'};
const PROPS={};
const _propMats=new Map();
// glTF materials arrive as PBR; the game uses soft Lambert shading everywhere, so convert once and share
function softMat(m){
  if(_propMats.has(m))return _propMats.get(m);
  if(m.map){m.map.anisotropy=ANISO;m.map.encoding=THREE.sRGBEncoding;m.map.needsUpdate=true;}
  const flat=/Leaf|Blossom/.test(m.name);
  const o={color:m.color.clone(),map:m.map||null,flatShading:flat,name:m.name};
  if(m.emissive&&(m.emissive.r+m.emissive.g+m.emissive.b)>0.01){o.emissive=m.emissive.clone();o.emissiveIntensity=m.emissiveIntensity||1;}
  const n=new THREE.MeshLambertMaterial(o);n.name=m.name;_propMats.set(m,n);return n;
}
async function loadProps(){
  const L=new GLTFLoader();
  await Promise.all(Object.entries(PROP_FILES).map(async([k,f])=>{
    try{const g=await L.loadAsync('assets/models/'+f+'.glb');g.scene.traverse(o=>{if(o.isMesh){o.material=softMat(o.material);o.castShadow=true;o.receiveShadow=true;}});PROPS[k]=g.scene;}
    catch(e){console.warn('Prop '+f+' failed to load',e);}
  }));
}
// a copy of a prop (shared geometry and materials). own:true gives it private materials so it can be tinted alone.
function prop(k,own){
  const src=PROPS[k];if(!src){const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),M.stone);m.position.y=.5;g.add(m);return g;}
  const c=src.clone(true);
  if(own)c.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
  return c;
}
function propPart(root,name){let f=null;root.traverse(o=>{if(!f&&o.name===name)f=o;});return f;}
function meshesByMat(root,matName){const out=[];root.traverse(o=>{if(o.isMesh&&o.material&&o.material.name===matName)out.push(o);});return out;}

// floating world label (region names over gates, waystone names)
function labelSprite(title,sub,color){
  const cv=document.createElement('canvas');cv.width=512;cv.height=160;const c=cv.getContext('2d');
  c.font='700 52px Fredoka, "Trebuchet MS", sans-serif';const w=Math.min(500,Math.max(c.measureText(title).width,sub?(c.font='700 30px Nunito, sans-serif',c.measureText(sub).width):0)+56);
  c.fillStyle='rgba(255,251,243,.94)';const x0=(512-w)/2;c.beginPath();if(c.roundRect)c.roundRect(x0,14,w,sub?132:86,30);else c.rect(x0,14,w,sub?132:86);c.fill();
  c.lineWidth=6;c.strokeStyle=color||'#1fb3a3';c.stroke();
  c.textAlign='center';c.fillStyle='#243039';c.font='700 52px Fredoka, "Trebuchet MS", sans-serif';c.fillText(title,256,76);
  if(sub){c.font='700 30px Nunito, sans-serif';c.fillStyle='#5c6b76';c.fillText(sub,256,124);}
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=ANISO;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(6.4,2,1);s.renderOrder=5;return s;
}

// ================= collectibles: golden seeds, memory petals =================
const SEEDS=[],PETALS=[];
function addSeed(id,x,y,z){SEEDS.push({id,reg:curBuild,pos:new V3(x,y,z),idx:0});}
let curBuild='';
// one instanced mesh per seed part, per region
const seedSets={};
function buildSeedInstances(reg){
  const list=seedsIn(reg);if(!list.length)return;
  const src=PROPS.seed;const parts=[];
  if(src){src.updateMatrixWorld(true);src.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push([g,o.material]);}});}
  else parts.push([new THREE.OctahedronGeometry(.14),M.gold]);
  const set={list,meshes:[]};
  for(const [g,m] of parts){const im=new THREE.InstancedMesh(g,m,list.length);im.castShadow=true;im.frustumCulled=false;REG[reg].group.add(im);set.meshes.push(im);}
  list.forEach((s,i)=>s.idx=i);seedSets[reg]=set;
}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_sc=new V3(),_ps=new V3(),_yAx=new V3(0,1,0);
function updateSeedInstances(t){
  const set=curReg&&seedSets[curReg.id];if(!set)return;
  for(const s of set.list){
    const got=!!PROG.seeds[s.id];const k=got?0:1.7;
    _ps.set(s.pos.x,s.pos.y+.32+Math.sin(t*2+s.idx)*.06,s.pos.z);_q.setFromAxisAngle(_yAx,t*1.6+s.idx);_sc.set(k,k,k);_m4.compose(_ps,_q,_sc);
    for(const im of set.meshes)im.setMatrixAt(s.idx,_m4);
    if(!got&&!PROG.settings.reduceFlash&&Math.random()<.012&&s.pos.distanceToSquared(camTarget)<900)emit(s.pos.x+(Math.random()-.5)*.3,s.pos.y+.5,s.pos.z+(Math.random()-.5)*.3,0,.35,0,1,.85,.35,.07,.9,0,.5);
  }
  for(const im of set.meshes)im.instanceMatrix.needsUpdate=true;
}
function addPetal(id,x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);ROOT.add(g);
  const p=prop('petal');p.scale.setScalar(1.5);g.add(p);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ff8fc0',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.75}));glow.scale.set(1.9,1.9,1);glow.position.y=.95;g.add(glow);
  PETALS.push({id,reg:curBuild,pos:new V3(x,y,z),g,p,glow});
}
function updatePetals(t){
  for(const p of PETALS){if(p.reg!==G.region)continue;const got=!!PROG.petals[p.id];p.g.visible=!got;if(got)continue;
    p.p.position.y=.55+Math.sin(t*1.7)*.1;p.p.rotation.y=t*1.2;p.glow.material.opacity=PROG.settings.reduceFlash?.55:.55+.25*Math.sin(t*2.4);
    if(!PROG.settings.reduceFlash&&Math.random()<.05)emit(p.pos.x+(Math.random()-.5)*.5,p.pos.y+.5+Math.random()*.6,p.pos.z+(Math.random()-.5)*.5,0,.25,0,1,.6,.8,.08,1.2,0,.4);}
}

// ================= waystones (fast travel) =================
const WAYS=[];
function addWaystone(id,name,x,y,z,rotY){
  const g=prop('waystone',true);g.position.set(x,y,z);g.rotation.y=rotY||0;ROOT.add(g);
  const crystal=propPart(g,'Waystone_Crystal');const runes=meshesByMat(g,'Glow');
  box(x-.6,x+.6,y,y+3.2,z-.6,z+.6,null);box(x-1.3,x+1.3,y,y+.35,z-1.3,z+1.3,null,{surface:'stone'});
  const lab=labelSprite(name,'Waystone','#1fb3a3');lab.scale.set(3.6,1.12,1);lab.position.set(x,y+5.4,z);ROOT.add(lab);
  const f=fwd(rotY||0);
  WAYS.push({id,name,reg:curBuild,pos:new V3(x,y,z),g,crystal,runes,lab,
    spawnG:[x+f.x*2.6-f.z*1.2,y,z+f.z*2.6+f.x*1.2],spawnS:[x+f.x*2.6+f.z*1.2,y,z+f.z*2.6-f.x*1.2]});
}
function updateWaystones(t){
  for(const w of WAYS){if(w.reg!==G.region)continue;const on=!!PROG.ws[w.id];
    if(w.crystal){w.crystal.position.y=3.85+(on?Math.sin(t*1.5)*.15:-.4);w.crystal.rotation.y=on?t*.9:0;w.crystal.material.emissiveIntensity=on?1.2:.08;}
    for(const r of w.runes)r.material.emissiveIntensity=on?(PROG.settings.reduceFlash?.9:.8+.3*Math.sin(t*2)):.08;
    w.lab.material.opacity=on?1:.75;}
}
