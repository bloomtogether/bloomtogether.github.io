// Big & Small. Built from dev/src/*.js by dev/build.sh. Three.js r149 (ES modules), KayKit characters (CC0, Kay Lousberg).
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
(() => {
"use strict";
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function fail(msg){$('loadText').textContent=msg;const sp=document.querySelector('.spin');if(sp)sp.remove();}

// ================= renderer =================
const canvas=$('gl');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,stencil:true,powerPreference:'high-performance'}); }
catch(e){ fail('WebGL is not available in this browser. Try Chrome, Edge, Firefox or Safari on a laptop.'); return; }
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.NoToneMapping;
const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const scene=new THREE.Scene();
const HORIZON=new THREE.Color('#cfe9f1');
scene.fog=new THREE.Fog(HORIZON,70,190);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,0.1,600);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pMat.uniforms.uScale.value=innerHeight*renderer.getPixelRatio()*0.5;});

// ================= soft procedural textures (low contrast, low frequency: no shimmer) =================
function hash2(x,y,s){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function vnoise(x,y,p,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const w=a=>((a%p)+p)%p;const X0=w(xi),X1=w(xi+1),Y0=w(yi),Y1=w(yi+1);
  const a=hash2(X0,Y0,s),b=hash2(X1,Y0,s),c=hash2(X0,Y1,s),d=hash2(X1,Y1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,p,oct,s){let t=0,a=.5,f=1,n=0;for(let i=0;i<oct;i++){t+=a*vnoise(x*f,y*f,p*f,s+i*17);n+=a;a*=.5;f*=2;}return t/n;}
function setupTex(t,srgb){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=ANISO;if(srgb)t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;return t;}
function genTex(N,fn){
  const cv=document.createElement('canvas');cv.width=cv.height=N;const ctx=cv.getContext('2d');const im=ctx.createImageData(N,N);const o=[0,0,0];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){fn(x/N,y/N,o);const j=(y*N+x)*4;im.data[j]=clamp(o[0],0,255);im.data[j+1]=clamp(o[1],0,255);im.data[j+2]=clamp(o[2],0,255);im.data[j+3]=255;}
  ctx.putImageData(im,0,0);return setupTex(new THREE.CanvasTexture(cv),true);
}
function mixc(o,r,g,b,t){o[0]+=(r-o[0])*t;o[1]+=(g-o[1])*t;o[2]+=(b-o[2])*t;}
const TEX={};
function buildTextures(){
  // big sandstone blocks, soft light mortar
  TEX.wall=genTex(256,(u,v,o)=>{
    const rows=3,cols=2,ry=Math.floor(v*rows),off=(ry&1)*.5,bxf=u*cols+off,bx=Math.floor(bxf),fu=bxf-bx,fv=v*rows-ry;
    const e=Math.min(Math.min(fu,1-fu)*(2/cols)*1.0,Math.min(fv,1-fv)*(2/rows));
    const id=hash2(((bx%cols)+cols)%cols,ry,5),n=fbm(u*3,v*3,3,2,1);
    const tone=.94+.1*id+(n-.5)*.08;o[0]=218*tone;o[1]=190*tone;o[2]=150*tone;
    const m=1-smooth(.012,.03,e);mixc(o,186,158,120,m*.85);
    mixc(o,255,240,210,smooth(.85,1,1-fv)*.12);});
  // grass: two greens in big soft patches
  TEX.grass=genTex(256,(u,v,o)=>{
    const n=fbm(u*3,v*3,3,3,11),d=fbm(u*2+7,v*2,2,2,12);
    o[0]=lerp(104,130,n);o[1]=lerp(168,190,n);o[2]=lerp(86,100,n);
    mixc(o,148,186,108,smooth(.55,.75,d)*.4);});
  // paving: large square slabs, gentle grout
  TEX.pave=genTex(256,(u,v,o)=>{
    const C=3,px=u*C,py=v*C,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
    const e=Math.min(fx,1-fx,fy,1-fy),id=hash2(ix%C,iy%C,23),n=fbm(u*4,v*4,4,2,31);
    const tone=.95+.08*id+(n-.5)*.06;o[0]=192*tone;o[1]=190*tone;o[2]=182*tone;
    mixc(o,150,146,138,(1-smooth(.015,.035,e))*.9);});
  TEX.wood=genTex(128,(u,v,o)=>{
    const P=4,pu=u*P,pi=Math.floor(pu),fu=pu-pi,g=fbm(fu*2+pi*7.3,v*6,1e6,2,51);
    const t=.92+.14*g+(hash2(pi,0,53)-.5)*.12;o[0]=178*t;o[1]=118*t;o[2]=72*t;
    const gap=Math.min(fu,1-fu);if(gap<.05)mixc(o,110,68,40,1-gap/.05);});
  // rune glyphs (emissive)
  const rc=document.createElement('canvas');rc.width=512;rc.height=256;const rx=rc.getContext('2d');
  rx.fillStyle='#000';rx.fillRect(0,0,512,256);rx.strokeStyle='#fff';rx.lineCap='round';rx.lineJoin='round';
  for(let k=0;k<8;k++){const x=32+k*62,y=100;rx.lineWidth=9;rx.beginPath();const r=a=>hash2(k,a,91);rx.moveTo(x,y);rx.lineTo(x,y+60);
    if(r(1)>.5){rx.moveTo(x,y+10);rx.lineTo(x+22,y+28);} if(r(2)>.4){rx.moveTo(x,y+30);rx.lineTo(x+20,y+12);}
    if(r(3)>.5){rx.moveTo(x,y+60);rx.lineTo(x+20,y+44);} if(r(4)>.6){rx.moveTo(x-14,y+20);rx.lineTo(x,y+34);} rx.stroke();}
  TEX.glyph=setupTex(new THREE.CanvasTexture(rc),true);
  // soft glow
  const gc=document.createElement('canvas');gc.width=gc.height=128;const gx=gc.getContext('2d');const gr=gx.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');gx.fillStyle=gr;gx.fillRect(0,0,128,128);
  TEX.glow=new THREE.CanvasTexture(gc);
  // fairy wing
  const wc=document.createElement('canvas');wc.width=128;wc.height=96;const wx=wc.getContext('2d');
  const wg=wx.createRadialGradient(20,48,4,40,48,90);wg.addColorStop(0,'rgba(220,255,245,.95)');wg.addColorStop(.6,'rgba(160,250,220,.5)');wg.addColorStop(1,'rgba(160,250,220,0)');
  wx.fillStyle=wg;wx.beginPath();wx.ellipse(64,48,62,40,0,0,Math.PI*2);wx.fill();
  wx.strokeStyle='rgba(255,255,255,.7)';wx.lineWidth=2;for(let i=0;i<4;i++){wx.beginPath();wx.moveTo(6,48);wx.quadraticCurveTo(60,48+(i-1.5)*18,118,48+(i-1.5)*30);wx.stroke();}
  TEX.wing=new THREE.CanvasTexture(wc);
  // ground ring
  const ring=document.createElement('canvas');ring.width=ring.height=128;const rg=ring.getContext('2d');
  rg.strokeStyle='#fff';rg.lineWidth=10;rg.beginPath();rg.arc(64,64,52,0,Math.PI*2);rg.stroke();rg.globalAlpha=.25;rg.fillStyle='#fff';rg.beginPath();rg.arc(64,64,48,0,Math.PI*2);rg.fill();
  TEX.ring=new THREE.CanvasTexture(ring);
  // "only Sprite fits" icon for crawl holes: mint disc with a tiny winged figure
  const ic=document.createElement('canvas');ic.width=ic.height=128;const c=ic.getContext('2d');
  c.fillStyle='#22bf9c';c.beginPath();c.arc(64,64,58,0,Math.PI*2);c.fill();c.lineWidth=8;c.strokeStyle='#fff';c.stroke();
  c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.ellipse(40,56,20,12,-.5,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(88,56,20,12,.5,0,Math.PI*2);c.fill();
  c.fillStyle='#fff';c.beginPath();c.arc(64,46,13,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(64,78,13,20,0,0,Math.PI*2);c.fill();
  c.fillStyle='#22bf9c';c.beginPath();c.arc(59,45,2.6,0,Math.PI*2);c.arc(69,45,2.6,0,Math.PI*2);c.fill();
  TEX.holeIcon=new THREE.CanvasTexture(ic);TEX.holeIcon.encoding=THREE.sRGBEncoding;
  // down arrow for objective beacons
  const ac=document.createElement('canvas');ac.width=ac.height=128;const a=ac.getContext('2d');
  a.fillStyle='#ffd34d';a.strokeStyle='#fff';a.lineWidth=8;a.lineJoin='round';a.beginPath();a.moveTo(30,30);a.lineTo(98,30);a.lineTo(64,100);a.closePath();a.stroke();a.fill();
  TEX.arrow=new THREE.CanvasTexture(ac);TEX.arrow.encoding=THREE.sRGBEncoding;
}

// ================= materials =================
const M={};
function buildMaterials(){
  const lam=o=>new THREE.MeshLambertMaterial(o);
  M.wall=lam({map:TEX.wall});
  // palette: sandstone walls, terracotta trim on every top/edge, cream carved stone, blue-grey movable block, teal = runes only
  M.wallTop=lam({color:'#b9784a'});
  M.stone=lam({color:'#d3bb93'});
  M.block=lam({color:'#5b88c0'});M.blockTop=lam({color:'#86acd8'});
  M.ground=lam({map:TEX.grass});
  M.pave=lam({map:TEX.pave});
  M.rock=lam({color:'#7b746a',flatShading:true});
  M.cliff=lam({color:'#c9a983',flatShading:true});
  M.cliffDark=lam({color:'#a88a68',flatShading:true});
  M.wood=lam({map:TEX.wood});
  M.iron=new THREE.MeshStandardMaterial({color:'#56606c',roughness:.55,metalness:.35});
  M.leaf=lam({color:'#63b84a',flatShading:true});
  M.leaf2=lam({color:'#86cc55',flatShading:true});
  M.leafDark=lam({color:'#3f9a52',flatShading:true});
  M.bark=lam({color:'#8d6446',flatShading:true});
  M.terracotta=lam({color:'#df8d5d',flatShading:true});
  M.tuft=lam({color:'#5fae45',flatShading:true});
  M.rune=new THREE.MeshStandardMaterial({color:'#2fd6c0',emissive:new THREE.Color('#14b59f'),emissiveIntensity:.9,roughness:.35,metalness:.1,flatShading:true});
  M.gem=new THREE.MeshStandardMaterial({color:'#1ec9b3',emissive:'#4ff6d8',emissiveIntensity:1.2,roughness:.3});
  M.socket=lam({color:'#4a3a33'});
  M.water=new THREE.MeshStandardMaterial({color:'#3fc3d8',roughness:.15,metalness:.1,transparent:true,opacity:.88});
  M.jet=new THREE.MeshStandardMaterial({color:'#dff7ff',emissive:'#7fd9ec',emissiveIntensity:.35,roughness:.1,transparent:true,opacity:.7,depthWrite:false});
  M.plate=lam({color:'#6c5a4b'});
  M.plateRing=new THREE.MeshBasicMaterial({color:'#1fb3a3'});
  M.handle=lam({color:'#e8553d'});
  M.gold=new THREE.MeshStandardMaterial({color:'#f2c14e',roughness:.4,metalness:.4});
  M.holeRim=new THREE.MeshBasicMaterial({color:'#5ff3cf'});
  M.holeDark=new THREE.MeshBasicMaterial({color:'#1d2a2a'});
  M.cliffTop=lam({color:'#9fcf68'});
}

// box geometry with world-scaled UVs so textures keep a constant size
function boxGeo(w,h,d,tile,ox,oy,oz){
  const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv;
  const dims=[[d,h,oz,oy],[d,h,oz,oy],[w,d,ox,oz],[w,d,ox,oz],[w,h,ox,oy],[w,h,ox,oy]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i,D=dims[f];uv.setXY(k,(uv.getX(k)*D[0]+D[2])/tile,(uv.getY(k)*D[1]+D[3])/tile);}
  return g;
}
const TILE=new Map();
function tileFor(m){return TILE.get(m)||2;}

// ================= colliders & fadeable occluders =================
const colliders=[];
const fadeables=[]; // meshes that turn see-through when they hide a player
function markFade(mesh,linked){mesh.userData.fade={o:1,t:1,linked:linked||[]};fadeables.push(mesh);}
function markFadeGroup(list){const lead=list[0];markFade(lead,list.slice(1));for(const m of list.slice(1)){m.userData.fade={leader:lead};fadeables.push(m);}}
function box(xa,xb,ya,yb,za,zb,mat,opt){
  opt=opt||{};
  const x0=Math.min(xa,xb),x1=Math.max(xa,xb),y0=Math.min(ya,yb),y1=Math.max(ya,yb),z0=Math.min(za,zb),z1=Math.max(za,zb);
  let mesh=null;
  if(mat){mesh=new THREE.Mesh(boxGeo(x1-x0,y1-y0,z1-z0,tileFor(mat),x0,y0,z0),mat);mesh.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
    mesh.castShadow=opt.cast!==false;mesh.receiveShadow=true;(opt.parent||scene).add(mesh);
    if(opt.fade||(opt.fade!==false&&!opt.parent&&y1-y0>1.1))markFade(mesh,opt.linked);}
  if(opt.collide===false) return {mesh};
  const c={min:new V3(x0,y0,z0),max:new V3(x1,y1,z1),kind:opt.kind||'static',on:true,mesh};
  colliders.push(c);return c;
}
const invis=(xa,xb,ya,yb,za,zb)=>box(xa,xb,ya,yb,za,zb,null);
// a wall: sandstone body plus a lighter cap that overhangs a little (reads clearly from above)
function wall(xa,xb,za,zb,h,extend){
  const cap=box(Math.min(xa,xb)-.06,Math.max(xa,xb)+.06,h,h+.16,Math.min(za,zb)-.06,Math.max(za,zb)+.06,M.wallTop,{collide:false,fade:false}).mesh;
  const c=box(xa,xb,0,h,za,zb,M.wall,{linked:[cap]});
  if(extend!==false)invis(xa,xb,h,14,za,zb);
  return c;
}
function floorSlab(xa,xb,za,zb,mat,deep){box(xa,xb,-0.4,0,za,zb,mat,{cast:false,fade:false});box(xa,xb,deep?-12:-2,-0.4,za,zb,deep?M.cliff:mat,{cast:false,fade:false});}

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
  const m=new THREE.Mesh(lowPoly(s,s*.65,s*.85,0,seed*13,.35),mat||M.rock);m.position.set(x,y,z);m.rotation.y=seed;m.castShadow=true;m.receiveShadow=true;scene.add(m);
  if(collide) box(x-s*.7,x+s*.7,0,y+s*.55,z-s*.7,z+s*.7,null);
  return m;
}
function addColumn(x,z,h,r,broken,collide){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r,h,12,1),M.stone);m.position.set(x,h/2,z);m.castShadow=m.receiveShadow=true;scene.add(m);
  const base=new THREE.Mesh(new THREE.BoxGeometry(r*2.4,.3,r*2.4),M.wallTop);base.position.set(x,.15,z);base.castShadow=base.receiveShadow=true;scene.add(base);
  let top=null;if(!broken){top=new THREE.Mesh(new THREE.BoxGeometry(r*2.6,.35,r*2.6),M.wallTop);top.position.set(x,h+.17,z);top.castShadow=true;scene.add(top);}
  if(h>1.2)markFade(m,top?[top]:[]);
  if(collide!==false) box(x-r,x+r,0,h,z-r,z+r,null);
}
function addUrn(x,z,s){
  const pts=[[0,0],[.25,0],[.32,.08],[.42,.35],[.38,.6],[.24,.75],[.26,.86],[.32,.9]].map(p=>new THREE.Vector2(p[0]*s,p[1]*s));
  const m=new THREE.Mesh(new THREE.LatheGeometry(pts,10),M.terracotta);m.position.set(x,0,z);m.castShadow=m.receiveShadow=true;scene.add(m);
  const plant=new THREE.Mesh(lowPoly(.3*s,.22*s,.3*s,0,x*7+z,.3),M.leaf2);plant.position.set(x,.95*s,z);plant.castShadow=true;scene.add(plant);
  box(x-.35*s,x+.35*s,0,.9*s,z-.35*s,z+.35*s,null);
}
function addTree(x,z,s,seed){
  const h=2.4*s,trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.26*s,h,6),M.bark);trunk.position.set(x,h/2,z);trunk.castShadow=true;scene.add(trunk);
  const parts=[];const n=2+Math.floor(hash2(seed,1,7)*2);
  for(let i=0;i<n;i++){const a=hash2(seed,i,8)*6.28,r=i?(.6+hash2(seed,i,9)*.5)*s:0,fs=(i?1.0:1.35)*s*(.9+hash2(seed,i,10)*.3);
    const f=new THREE.Mesh(lowPoly(fs,fs*.85,fs,1,seed*31+i,.18),[M.leaf,M.leaf2,M.leafDark][(seed+i)%3]);
    f.position.set(x+Math.cos(a)*r,h+fs*.5+(i?-.2:.3)*s,z+Math.sin(a)*r);f.castShadow=true;f.receiveShadow=true;scene.add(f);parts.push(f);}
  markFade(parts[0],[trunk,...parts.slice(1)]);
}
function addCypress(x,z,s,seed){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12*s,.18*s,1.0*s,6),M.bark);trunk.position.set(x,.5*s,z);scene.add(trunk);
  const f=new THREE.Mesh(lowPoly(.85*s,2.8*s,.85*s,1,seed*17,.12),M.leafDark);f.position.set(x,3.4*s,z);f.castShadow=true;scene.add(f);
  markFade(f,[trunk]);
}
function addBush(x,z,s,seed){const b=new THREE.Mesh(lowPoly(.7*s,.5*s,.7*s,0,seed*11,.3),seed%2?M.leaf:M.leaf2);b.position.set(x,.3*s,z);b.castShadow=true;b.receiveShadow=true;scene.add(b);}

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
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#5ff3cf',transparent:true,depthWrite:false,opacity:.55}));glow.scale.set(1.6,1.0,1);glow.position.set((x0+x1)/2,.3,(z0+z1)/2);scene.add(glow);
  const icon=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.holeIcon,transparent:true,depthWrite:false}));icon.scale.set(.62,.62,1);icon.position.set(ix,1.35,iz);scene.add(icon);
  holeMarkers.push({icon,glow,base:1.35});
}

const beacons=[]; // bouncing arrows over the next thing to use
function makeBeacon(){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.arrow,transparent:true,depthWrite:false}));s.scale.set(.5,.5,1);s.visible=false;scene.add(s);beacons.push(s);return s;}

function buildWorld(){
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

  // ---------- outer land (with the ravine cutting through) ----------
  floorSlab(-90,-11,60,-27,M.ground,true);floorSlab(-90,-11,-33,-170,M.ground,true);
  floorSlab(11,90,60,-27,M.ground,true);floorSlab(11,90,-33,-170,M.ground,true);
  floorSlab(-11,11,5,60,M.ground,false);floorSlab(-11,11,-83,-170,M.ground,false);
  // ravine: teal water far below, chunky cliff rocks
  const water=new THREE.Mesh(new THREE.PlaneGeometry(180,6.2),M.water.clone());water.material.opacity=.95;water.rotation.x=-Math.PI/2;water.position.set(0,-7,-30);scene.add(water);W.ravineWater=water;
  for(let i=0;i<30;i++){const x=-70+i*4.8+hash2(i,2,3)*3,z=-30+(hash2(i,4,5)-.5)*4.5;addRock(x,-6.6,z,.8+hash2(i,6,7)*1.2,i*1.7,false,i%2?M.cliff:M.cliffDark);}
  // distant soft hills
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=140+hash2(i,1,2)*40,s=35+hash2(i,3,4)*30;const m=new THREE.Mesh(lowPoly(s,s*.32,s,1,i,.1),i%2?M.leaf:M.leaf2);m.position.set(Math.cos(a)*r,-3,-40+Math.sin(a)*r);scene.add(m);}

  // ---------- AREA 1: courtyard ----------
  floorSlab(-11,11,5,-22,M.ground,false);
  wall(-11,11,4,5,3);
  wall(-11,-10,4,-22,4);
  wall(10,11,4,-15.1,4); wall(10,11,-15.7,-22,4);
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
  const fallen=new THREE.Mesh(new THREE.CylinderGeometry(.4,.42,2.6,12),M.stone);fallen.rotation.z=Math.PI/2;fallen.rotation.y=.6;fallen.position.set(4.6,.4,-12.5);fallen.castShadow=fallen.receiveShadow=true;scene.add(fallen);box(3.4,5.8,0,.8,-12,-13.2,null);
  addUrn(-9.2,3,1.1);addUrn(9.2,3,1.1);addUrn(-9.2,-20.5,1.1);addUrn(8.6,-20.5,1.1);
  addRock(8.2,0.2,-6.5,.6,3.1,true);addRock(-3.5,.1,3,.4,4.2,false);addRock(2.5,.15,-15,.5,5.5,false);addRock(-8.5,.2,-14,.7,6.6,true);
  addTree(-15,-6,1.3,1);addTree(-17,4,1.5,2);addTree(17,0,1.4,3);addTree(19,-10,1.2,4);addCypress(-14,-16,1.1,5);addCypress(14.5,-22,1.2,6);
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
  addTree(-16,-38,1.4,7);addTree(18,-40,1.5,8);addCypress(15,-46,1.3,9);addCypress(-15,-48,1.2,10);addTree(-20,-20,1.3,11);addTree(21,-24,1.2,12);
  // ---------- AREA 3: waterworks ----------
  floorSlab(-11,11,-44,-62.6,M.pave,false);
  wall(-11,-10,-44,-62,4);wall(10,11,-44,-62,4);
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
  const ch=new THREE.Mesh(new THREE.PlaneGeometry(.9,10),M.water);ch.rotation.x=-Math.PI/2;ch.position.set(-8.6,.22,-56);scene.add(ch);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,10,10),M.iron);pipe.rotation.x=Math.PI/2;pipe.position.set(9.7,2.4,-50);pipe.castShadow=true;scene.add(pipe);
  // portcullis wall
  wall(-11,-2,-62,-62.6,4.5);wall(2,11,-62,-62.6,4.5);box(-2,2,3.6,4.5,-62,-62.6,M.wall,{fade:true});invis(-2,2,4.5,14,-62,-62.6);
  addUrn(-3.5,-60.5,1);addUrn(3.5,-60.5,1);addRock(3,.15,-46,.45,9.9,false);
  // ---------- AREA 4: fountain chamber ----------
  floorSlab(-11,11,-62.6,-83,M.pave,false);
  wall(-11,-10,-62.6,-82,5.5);wall(10,11,-62.6,-82,5.5);wall(-11,11,-82,-83,5.5);
  for(const z of [-66,-72,-78]){addColumn(-8.3,z,5.2,.45,false);addColumn(8.3,z,5.2,.45,false);}
  buildFountain();
  addCypress(-15,-70,1.4,13);addCypress(15,-74,1.4,14);addTree(-17,-86,1.6,15);addTree(17,-88,1.6,16);addTree(0,-92,1.7,17);addCypress(-6,-90,1.5,18);addCypress(7,-91,1.5,19);
  for(let i=0;i<22;i++){const side=i%2?1:-1,x=side*(24+hash2(i,1,99)*40),z=10-hash2(i,2,99)*110;if(z<-25&&z>-35)continue;(i%3?addTree:addCypress)(x,z,1.1+hash2(i,3,99)*.6,40+i);}
  for(let i=0;i<30;i++){const side=i%2?1:-1,x=side*(13+hash2(i,5,98)*12),z=8-hash2(i,6,98)*100;if(z<-25&&z>-35)continue;addBush(x,z,.8+hash2(i,7,98)*.8,i);}
  buildTufts();
}

function buildFountain(){
  const pts=[[.01,.12],[2.55,.12],[2.62,.78],[2.8,.86],[3.0,.8],[3.06,.06],[3.0,0]].map(p=>new THREE.Vector2(p[0],p[1]));
  const basin=new THREE.Mesh(new THREE.LatheGeometry(pts,40),M.stone);basin.position.set(F.x,0,F.z);basin.castShadow=basin.receiveShadow=true;scene.add(basin);
  box(F.x-2.8,F.x+2.8,0,.8,F.z+2.8,F.z-2.8,null);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.42,.55,2.6,14),M.stone);col.position.set(F.x,.8+1.3,F.z);col.castShadow=col.receiveShadow=true;scene.add(col);
  const bpts=[[.01,0],[.3,.02],[.62,.2],[.72,.34],[.62,.36],[.4,.22],[.01,.2]].map(p=>new THREE.Vector2(p[0],p[1]));
  const bowl=new THREE.Mesh(new THREE.LatheGeometry(bpts,28),M.stone);bowl.position.set(F.x,3.38,F.z);bowl.castShadow=true;scene.add(bowl);
  markFade(col,[bowl]);
  box(F.x-.72,F.x+.72,.8,3.6,F.z-.72,F.z+.72,null);
  W.spout=new V3(F.x,3.6,F.z);
  W.basinWater=new THREE.Mesh(new THREE.CircleGeometry(2.56,40),M.water);W.basinWater.rotation.x=-Math.PI/2;W.basinWater.position.set(F.x,.14,F.z);W.basinWater.visible=false;scene.add(W.basinWater);
  W.jet=new THREE.Mesh(new THREE.CylinderGeometry(.06,.16,1.4,12,1,true),M.jet);W.jet.position.set(F.x,4.3,F.z);W.jet.visible=false;scene.add(W.jet);
  W.sockets=[];
  [-1.2,0,1.2].forEach((dx,i)=>{const sx=F.x+dx,sz=F.z+2.75-Math.abs(dx)*.12;
    const s=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.3),M.socket);s.position.set(sx,.84,sz);scene.add(s);
    const g=new THREE.Mesh(new THREE.OctahedronGeometry(.17),M.gem);g.scale.y=1.4;g.position.set(sx,1.02,sz);g.visible=false;scene.add(g);W.sockets.push(g);});
  W.fLight=new THREE.PointLight('#9fe8d6',0,14,2);W.fLight.position.set(F.x,4.2,F.z);scene.add(W.fLight);
}

// sparse, chunky grass tufts and flowers (static, nothing thin enough to shimmer)
function buildTufts(){
  const tuft=new THREE.IcosahedronGeometry(.17,0);tuft.scale(1,.55,1);tuft.translate(0,.05,0);
  const flower=new THREE.IcosahedronGeometry(.07,0);flower.translate(0,.16,0);
  const rects=[[-10,10,4,-22,.32],[-10,10,-23,-27,.32],[-10,10,-33,-44,.32],[-30,-11,30,-26,.12],[11,30,30,-26,.12],[-30,-11,-34,-95,.12],[11,30,-34,-95,.12],[-10,10,6,25,.12]];
  const rnd=(()=>{let s=99;return()=>{s=Math.imul(s^(s>>>15),2246822507)+0x6D2B79F5|0;return ((s>>>0)%100000)/100000;};})();
  const spots=[];
  for(const r of rects){const cnt=Math.floor(Math.abs((r[1]-r[0])*(r[3]-r[2]))*r[4]);
    for(let i=0;i<cnt;i++){const x=lerp(r[0],r[1],rnd()),z=lerp(r[2],r[3],rnd());
      let blocked=false;for(const c of colliders){if(c.max.y>.05&&c.min.y<.3&&x>c.min.x-.1&&x<c.max.x+.1&&z>c.min.z-.1&&z<c.max.z+.1){blocked=true;break;}}
      if(blocked||(z<-26.8&&z>-33.2))continue;spots.push([x,z]);}}
  const tufts=new THREE.InstancedMesh(tuft,new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true}),spots.length*2);
  const flowers=new THREE.InstancedMesh(flower,new THREE.MeshLambertMaterial({color:'#ffffff'}),spots.length);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new V3(),pos=new V3(),col=new THREE.Color();let n=0,nf=0;
  const FL=['#ffffff','#ffd84d','#ff9fb8','#b9a7ff'];
  for(const [x,z] of spots){
    if(rnd()<.18){pos.set(x,0,z);q.identity();const s=.9+rnd()*.4;sc.set(s,s,s);m4.compose(pos,q,sc);flowers.setMatrixAt(nf,m4);col.set(FL[Math.floor(rnd()*4)]);flowers.setColorAt(nf,col);nf++;continue;}
    for(let k=0;k<2;k++){pos.set(x+(rnd()-.5)*.3,0,z+(rnd()-.5)*.3);q.setFromAxisAngle(new V3(0,1,0),rnd()*6.28);const s=.7+rnd()*.7;sc.set(s,s,s);m4.compose(pos,q,sc);tufts.setMatrixAt(n,m4);
      col.setHSL(.27+rnd()*.04,.34+rnd()*.1,.34+rnd()*.08);tufts.setColorAt(n,col);n++;}}
  tufts.count=n;flowers.count=nf;
  for(const im of [tufts,flowers]){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.receiveShadow=true;im.castShadow=false;scene.add(im);}
}

// ================= interactive objects =================
const gate={t:0,open:false},bridge={t:0,open:false},port={t:0,open:false},latch={t:0};
const levers=[],plates=[];let crank=null,block=null;const runes=[];
function buildInteractives(){
  // gate (wood + iron)
  gate.group=new THREE.Group();const gParts=[];
  for(let i=0;i<6;i++){gParts.push(box(-2+i*.667,-2+(i+1)*.667-.04,0,3.6,-22.32,-22.68,M.wood,{parent:gate.group,collide:false}).mesh);}
  for(const y of [.6,1.8,3.0]) gParts.push(box(-2,2,y,y+.16,-22.25,-22.75,M.iron,{parent:gate.group,collide:false}).mesh);
  scene.add(gate.group);markFadeGroup(gParts);
  gate.col=box(-2,2,0,3.6,-22.25,-22.75,null,{kind:'door'});gate.base={y0:0,y1:3.6};
  // drawbridge (pivot at far edge)
  bridge.pivot=new THREE.Group();bridge.pivot.position.set(0,0,-33);scene.add(bridge.pivot);
  for(let i=0;i<5;i++)box(-1.5+i*.6+.02,-1.5+(i+1)*.6-.02,-.28,0,0,6,M.wood,{parent:bridge.pivot,collide:false});
  for(const z of [.6,3,5.4])box(-1.55,1.55,-.34,-.24,z,z+.18,M.iron,{parent:bridge.pivot,collide:false});
  bridge.col=box(-1.5,1.5,-.3,0,-27,-33,null,{kind:'door'});bridge.col.on=false;
  box(-1.9,-1.6,0,2.2,-33.1,-33.5,M.stone);box(1.6,1.9,0,2.2,-33.1,-33.5,M.stone);
  // portcullis
  port.group=new THREE.Group();const pParts=[];
  for(let i=0;i<9;i++)pParts.push(box(-2+i*.5-.05,-2+i*.5+.05,0,3.6,-62.22,-62.38,M.iron,{parent:port.group,collide:false}).mesh);
  for(const y of [.4,1.3,2.2,3.1])pParts.push(box(-2,2,y,y+.1,-62.2,-62.4,M.iron,{parent:port.group,collide:false}).mesh);
  scene.add(port.group);markFadeGroup(pParts);
  port.col=box(-2,2,0,3.6,-62.1,-62.5,null,{kind:'door'});port.base={y0:0,y1:3.6};
  // levers
  levers.push(makeLever(13.9,-15.4,-Math.PI/2,'gate'),makeLever(-9.3,-46.1,Math.PI/2,'vault'));
  // crank (gold wheel)
  crank={pos:new V3(2.9,0,-34.4),t:0,used:false};
  box(2.6,3.2,0,.75,-34.15,-34.65,M.stone);
  crank.wheel=new THREE.Group();crank.wheel.position.set(2.9,1.05,-34.4);crank.wheel.rotation.y=Math.PI/2;scene.add(crank.wheel);
  const tor=new THREE.Mesh(new THREE.TorusGeometry(.32,.06,8,20),M.gold);tor.castShadow=true;crank.wheel.add(tor);
  for(let k=0;k<4;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.06,.62,.06),M.gold);sp.rotation.z=k*Math.PI/4;crank.wheel.add(sp);}
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.4,8),M.iron);axle.position.set(2.9,1.05,-34.4);axle.rotation.z=Math.PI/2;scene.add(axle);
  // plates
  plates.push(makePlate(-5,-55,1.0,8,'heavy','#f2873a'),makePlate(8.3,-55.8,.5,1,'light','#22bf9c'));
  // push block
  block={pos:new V3(-2,0,-7),vel:new V3(),hw:.6,h:1.2,kind:'block',stepH:0,onGround:false,home:new V3(-2,0,-7)};
  block.mesh=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),M.block);block.mesh.castShadow=block.mesh.receiveShadow=true;scene.add(block.mesh);
  const btop=new THREE.Mesh(new THREE.BoxGeometry(1.26,.14,1.26),M.blockTop);btop.position.y=.6;btop.castShadow=true;block.mesh.add(btop);
  block.col=box(0,1,0,1,0,1,null,{kind:'block'});block.col.body=block;syncBlock();
  // runes
  runes.push(makeRune(0,new V3(-8.3,2.4,-8),'rest','Courtyard ledge'),makeRune(1,new V3(6.4,3.8,-38.8),'perched','Ravine column'),makeRune(2,new V3(-8.6,0,-47.3),'vault','Waterworks vault'));
  W.beacon=makeBeacon();
}
function makeLever(x,z,rot,id){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  box(-.22,.22,0,.42,-.16,.16,M.stone,{parent:g,collide:false});
  const handle=new THREE.Group();handle.position.y=.42;g.add(handle);
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.04,.045,.55,8),M.wood);stick.position.y=.27;stick.castShadow=true;handle.add(stick);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.085,12,10),M.handle);knob.position.y=.56;handle.add(knob);
  handle.rotation.z=-.7;
  box(x-.22,x+.22,0,.42,z-.22,z+.22,null);
  return {id,pos:new V3(x,0,z),handle,t:0,pulled:false};
}
function makePlate(x,z,hw,need,label,ringColor){
  const m=new THREE.Mesh(boxGeo(hw*2,.12,hw*2,3,0,0,0),M.plate);m.position.set(x,0,z);m.receiveShadow=true;scene.add(m);
  const ring=new THREE.Mesh(new THREE.RingGeometry(hw*.5,hw*.72,32),M.plateRing.clone());ring.material.color.set(ringColor);ring.rotation.x=-Math.PI/2;ring.position.set(x,.065,z);ring.material.transparent=true;ring.material.opacity=.5;scene.add(ring);
  return {x,z,hw,need,label,on:false,mesh:m,ring};
}
function makeRune(i,pos,state,where){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),M.rune);m.scale.set(.85,1.25,.85);m.castShadow=true;scene.add(m);
  const light=new THREE.PointLight('#6ff0d4',.8,4,2);scene.add(light);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#5ff3cf',transparent:true,depthWrite:false,opacity:.7}));glow.scale.set(1.3,1.3,1);scene.add(glow);
  return {i,where,state,pos:pos.clone(),home:pos.clone(),vel:new V3(),hw:.2,h:.42,kind:'rune',stepH:.1,onGround:false,mesh:m,light,glow,t:0};
}
function syncBlock(){const b=block,c=block.col;c.min.set(b.pos.x-b.hw,b.pos.y,b.pos.z-b.hw);c.max.set(b.pos.x+b.hw,b.pos.y+b.h,b.pos.z+b.hw);}

// ================= characters =================
const golem={kind:'golem',pos:new V3(),vel:new V3(),hw:.6,h:2.3,stepH:.45,yaw:Math.PI,onGround:false,coyote:0,holding:false,charging:false,charge:0,runes:0,cp:0,pushing:false,anim:0,prev:new V3(),delta:new V3(),stepSound:0,walk:0};
const sprite={kind:'sprite',pos:new V3(),vel:new V3(),hw:.14,h:.4,stepH:.14,yaw:Math.PI,onGround:false,coyote:0,held:false,gliding:false,thrownT:0,cp:0,walk:0,anim:0,airT:0};
golem.col={min:new V3(),max:new V3(),kind:'golem',on:true};colliders.push(golem.col);
function syncGolemCol(){const g=golem;golem.col.min.set(g.pos.x-.52,g.pos.y,g.pos.z-.52);golem.col.max.set(g.pos.x+.52,g.pos.y+g.h,g.pos.z+.52);golem.col.on=!sprite.held;}

const HIDE_PARTS=/Axe|Shield|Mug|Knife|Crossbow|Throwable/;
let MODELS=null; // {giant: gltf, sprite: gltf} or null when loading failed

// A simple animation player with cross-fades and one-shot clips
function makeAnimator(root,clips){
  const mixer=new THREE.AnimationMixer(root),acts={};
  for(const c of clips){acts[c.name]=mixer.clipAction(c);}
  const A={mixer,acts,cur:null,curName:'',shotT:0,shotName:''};
  A.play=(name,fade=.2,ts=1)=>{const a=acts[name];if(!a)return;a.timeScale=ts;if(A.curName===name)return;
    a.reset();a.setLoop(THREE.LoopRepeat,Infinity);a.clampWhenFinished=false;a.enabled=true;a.setEffectiveWeight(1);a.play();
    if(A.cur)A.cur.crossFadeTo(a,fade,false);A.cur=a;A.curName=name;};
  A.shot=(name,ts=1,fade=.12)=>{const a=acts[name];if(!a)return;a.reset();a.timeScale=ts;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.enabled=true;a.setEffectiveWeight(1);a.play();
    if(A.cur&&A.cur!==a)A.cur.crossFadeTo(a,fade,false);A.cur=a;A.curName='#'+name;A.shotT=a.getClip().duration/ts-.12;A.shotName=name;};
  A.busy=()=>A.shotT>0;
  A.update=dt=>{if(A.shotT>0)A.shotT-=dt;mixer.update(dt);};
  return A;
}

// see-through silhouette: drawn only where the character is hidden behind something (stencil + reversed depth test)
function addXray(root,color){
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.62,depthWrite:false,depthFunc:THREE.GreaterDepth,
    stencilWrite:true,stencilRef:1,stencilFunc:THREE.NotEqualStencilFunc,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp});
  const list=[];root.traverse(o=>{if(o.isMesh)list.push(o);});
  for(const o of list){
    o.material.stencilWrite=true;o.material.stencilRef=1;o.material.stencilFunc=THREE.AlwaysStencilFunc;o.material.stencilZPass=THREE.ReplaceStencilOp;
    let x;
    if(o.isSkinnedMesh){x=new THREE.SkinnedMesh(o.geometry,mat);x.bind(o.skeleton,o.bindMatrix);}
    else x=new THREE.Mesh(o.geometry,mat);
    x.renderOrder=20;x.frustumCulled=false;x.castShadow=false;x.position.copy(o.position);x.quaternion.copy(o.quaternion);x.scale.copy(o.scale);
    o.parent.add(x);
  }
}
function findBone(root,name){let b=null;root.traverse(o=>{if(!b&&o.isBone&&o.name===name)b=o;});return b;}
// clean up a KayKit scene: drop weapons, set shadows, scale to a target height (feet at 0)
function prepModel(gltf,targetH,tint){
  const root=gltf.scene;const drop=[];
  root.traverse(o=>{if(o.isMesh){if(HIDE_PARTS.test(o.name))drop.push(o);else{o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;
    if(tint){o.material=o.material.clone();o.material.color.set(tint.color);o.material.emissive=new THREE.Color(tint.emissive);o.material.emissiveIntensity=tint.ei;}}}});
  drop.forEach(o=>o.parent.remove(o));
  const bb=new THREE.Box3().setFromObject(root),h=bb.max.y-bb.min.y,s=targetH/h;
  root.scale.setScalar(s);root.position.y=-bb.min.y*s;
  const holder=new THREE.Group();holder.add(root);return {holder,root,scale:s};
}

function buildGolem(){
  const R=new THREE.Group();scene.add(R);golem.root=R;
  if(MODELS){
    const m=prepModel(MODELS.giant,2.45,null);R.add(m.holder);golem.model=m.root;
    golem.A=makeAnimator(m.root,MODELS.giant.animations);golem.A.play('Idle',0);
    golem.armL=findBone(m.root,'upperarml');golem.armR=findBone(m.root,'upperarmr');golem.chest=findBone(m.root,'chest');
    addXray(m.root,'#f2873a');
  }else{
    const mat=new THREE.MeshLambertMaterial({color:'#f2a86a',flatShading:true});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,1.7,10),mat);body.position.y=1.05;body.castShadow=true;R.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10),mat);head.position.y=2.1;head.castShadow=true;R.add(head);
    addXray(R,'#f2873a');
  }
  // carried rune gems float around the giant's waist
  golem.gems=[];for(let i=0;i<3;i++){const g=new THREE.Mesh(new THREE.OctahedronGeometry(.11),M.gem);g.scale.y=1.4;g.visible=false;R.add(g);golem.gems.push(g);}
  golem.ring=groundRing('#f2873a',1.5);
}
function buildSprite(){
  const R=new THREE.Group();scene.add(R);sprite.root=R;
  let attach=R,wingY=.26;
  if(MODELS){
    const m=prepModel(MODELS.sprite,.72,{color:'#c9fff0',emissive:'#1fae8c',ei:.55});R.add(m.holder);sprite.model=m.root;
    sprite.A=makeAnimator(m.root,MODELS.sprite.animations);sprite.A.play('Idle',0);
    const chest=findBone(m.root,'chest');if(chest){attach=chest;wingY=0;}
    sprite.wingScale=chest?1/m.scale:1;
    addXray(m.root,'#22bf9c');
  }else{
    const mat=new THREE.MeshLambertMaterial({color:'#bff7e6',emissive:'#22bf9c',emissiveIntensity:.6});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),mat);body.position.y=.18;body.scale.y=1.3;R.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.1,14,10),mat);head.position.y=.38;R.add(head);
    sprite.wingScale=1;addXray(R,'#22bf9c');
  }
  const wm=new THREE.MeshBasicMaterial({map:TEX.wing,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.9});
  const ws=sprite.wingScale;
  sprite.wings=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.02*ws,wingY*ws,-.06*ws);attach.add(p);const w=new THREE.Mesh(new THREE.PlaneGeometry(.3*ws,.21*ws),wm);w.position.x=s*.15*ws;w.scale.x=s;p.add(w);return p;});
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#7dffd9',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.5}));halo.scale.set(1.15,1.15,1.15);halo.position.y=.32;R.add(halo);sprite.halo=halo;
  sprite.light=new THREE.PointLight('#9fffe0',1.1,5,2);sprite.light.position.y=.35;R.add(sprite.light);
  sprite.ring=groundRing('#22bf9c',.75);
}
// colored ring on the ground under a character so you always know who is where
function groundRing(color,size){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:TEX.ring,color,transparent:true,depthWrite:false,opacity:.9}));
  m.rotation.x=-Math.PI/2;m.renderOrder=2;scene.add(m);return m;
}
// put the ring on the floor directly below a character (finds the highest surface under it)
const _rayDown=new THREE.Raycaster(),_down=new V3(0,-1,0);
function floorBelow(p,skip){let best=-99;for(const c of colliders){if(!c.on||c===skip||c.kind==='golem')continue;if(p.x>c.min.x&&p.x<c.max.x&&p.z>c.min.z&&p.z<c.max.z&&c.max.y<=p.y+.05&&c.max.y>best)best=c.max.y;}
  if(p.z<-27&&p.z>-33&&best<-1)return -99;return best<-50?0:best;}

// ================= particles =================
const PMAX=700;
const pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*3),pSize=new Float32Array(PMAX),pAlpha=new Float32Array(PMAX);
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('aColor',new THREE.BufferAttribute(pCol,3));pGeo.setAttribute('aSize',new THREE.BufferAttribute(pSize,1));pGeo.setAttribute('aAlpha',new THREE.BufferAttribute(pAlpha,1));
const pMat=new THREE.ShaderMaterial({uniforms:{uScale:{value:innerHeight*Math.min(2,window.devicePixelRatio||1)*.5}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'uniform float uScale;attribute vec3 aColor;attribute float aSize;attribute float aAlpha;varying vec3 vC;varying float vA;void main(){vC=aColor;vA=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying vec3 vC;varying float vA;void main(){float r=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,r);gl_FragColor=vec4(vC,a*vA);}'});
const pts=new THREE.Points(pGeo,pMat);pts.frustumCulled=false;scene.add(pts);
const parts=[];
function emit(x,y,z,vx,vy,vz,r,g,b,size,life,grav,drag){if(parts.length>=PMAX-80)return;parts.push({x,y,z,vx,vy,vz,r,g,b,size,life,max:life,grav:grav||0,drag:drag||0});}
const fireflies=[];
function initAmbientParticles(){for(let i=0;i<30;i++)fireflies.push({x:lerp(-9,9,Math.random()),y:.5+Math.random()*3,z:lerp(-64,-81,Math.random()),ph:Math.random()*10});}
function updateParticles(dt){
  let n=0;
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}
    p.vy-=p.grav*dt;const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;p.vz*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
  const put=(x,y,z,r,g,b,s,a)=>{if(n>=PMAX)return;pPos[n*3]=x;pPos[n*3+1]=y;pPos[n*3+2]=z;pCol[n*3]=r;pCol[n*3+1]=g;pCol[n*3+2]=b;pSize[n]=s;pAlpha[n]=a;n++;};
  for(const p of parts){const k=p.life/p.max;put(p.x,p.y,p.z,p.r,p.g,p.b,p.size,Math.min(1,k*2));}
  for(const f of fireflies){f.ph+=dt;const x=f.x+Math.sin(f.ph*.7)*.8,y=f.y+Math.sin(f.ph*1.3)*.4,z=f.z+Math.cos(f.ph*.5)*.8;const a=(.5+.5*Math.sin(f.ph*2.3))*(G.ending?1:.6);put(x,y,z,1,.9,.5,.08,a);}
  pGeo.setDrawRange(0,n);pGeo.attributes.position.needsUpdate=true;pGeo.attributes.aColor.needsUpdate=true;pGeo.attributes.aSize.needsUpdate=true;pGeo.attributes.aAlpha.needsUpdate=true;
}

// ================= physics =================
const GRAV=22;
const GOLEM={speed:3.4,jumpV:Math.sqrt(2*GRAV*1.4)},SPR={speed:5.2,jumpV:Math.sqrt(2*GRAV*1.1)};
function ov(b,c){return b.pos.x-b.hw<c.max.x&&b.pos.x+b.hw>c.min.x&&b.pos.z-b.hw<c.max.z&&b.pos.z+b.hw>c.min.z&&b.pos.y<c.max.y&&b.pos.y+b.h>c.min.y;}
function ovBox(a,c){return a.min.x<c.max.x&&a.max.x>c.min.x&&a.min.z<c.max.z&&a.max.z>c.min.z&&a.min.y<c.max.y&&a.max.y>c.min.y;}
function listFor(b){const out=[],r=b.hw+3;for(const c of colliders){if(!c.on||c===b.col)continue;if(c.kind==='golem'&&b.kind!=='sprite')continue;
  if(c.max.x<b.pos.x-r||c.min.x>b.pos.x+r||c.max.z<b.pos.z-r||c.min.z>b.pos.z+r)continue;out.push(c);}return out;}
function freeAt(b,list){for(const c of list)if(ov(b,c))return false;return true;}
function pushBlock(ax,d){
  const b=block;if(!b.onGround)return false;const old=b.pos[ax];b.pos[ax]+=d;syncBlock();
  for(const c of colliders){if(!c.on||c===b.col||c.kind==='golem')continue;if(ovBox(b.col,c)){b.pos[ax]=old;syncBlock();return false;}}
  return true;
}
function moveBody(b,dt,list){
  const wasGround=b.onGround;b.onGround=false;b.ground=null;
  const dy=b.vel.y*dt;b.pos.y+=dy;
  for(const c of list){if(!ov(b,c))continue;const prevY=b.pos.y-dy;
    if(dy<=0&&prevY>=c.max.y-.05){b.pos.y=c.max.y;b.vel.y=0;b.onGround=true;b.ground=c;}
    else if(dy>0&&prevY+b.h<=c.min.y+.05){b.pos.y=c.min.y-b.h-1e-4;b.vel.y=0;}}
  for(const ax of ['x','z']){const d=b.vel[ax]*dt;if(d===0)continue;b.pos[ax]+=d;
    for(const c of list){if(!ov(b,c))continue;
      const rise=c.max.y-b.pos.y;
      if((b.onGround||wasGround)&&rise>0&&rise<=b.stepH){const oy=b.pos.y;b.pos.y=c.max.y+.001;if(freeAt(b,list)){b.onGround=true;continue;}b.pos.y=oy;}
      if(c.kind==='block'&&b.kind==='golem'&&(b.onGround||wasGround)&&rise>.35){if(pushBlock(ax,d)&&!ov(b,c)){b.pushing=true;continue;}}
      if(d>0)b.pos[ax]=c.min[ax]-b.hw-1e-4;else b.pos[ax]=c.max[ax]+b.hw+1e-4;b.vel[ax]=0;}}
}
function depenetrate(b,c){
  if(!c.on||!ov(b,c))return;
  const top=c.max.y-b.pos.y;if(top>0&&top<.25){b.pos.y=c.max.y;return;}
  const px1=c.max.x-(b.pos.x-b.hw),px2=(b.pos.x+b.hw)-c.min.x,pz1=c.max.z-(b.pos.z-b.hw),pz2=(b.pos.z+b.hw)-c.min.z,m=Math.min(px1,px2,pz1,pz2);
  if(m===px1)b.pos.x+=px1;else if(m===px2)b.pos.x-=px2;else if(m===pz1)b.pos.z+=pz1;else b.pos.z-=pz2;
}
function approach(v,t,m){return v<t?Math.min(t,v+m):Math.max(t,v-m);}
function angLerp(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t;}
const dxz=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// ================= game state =================
const G={phase:'loading',time:0,falls:0,throws:0,placed:0,ending:false,endT:0,lastFall:'',fallN:0,paused:false,pick:0,useN:0};
function headPos(out){const f=fwd(golem.yaw);return out.set(golem.pos.x+f.x*.15,golem.pos.y+golem.h+.08,golem.pos.z+f.z*.15);}
const _f=new V3();function fwd(y){return _f.set(Math.sin(y),0,Math.cos(y));}

function resetLevel(){
  G.time=0;G.falls=0;G.throws=0;G.placed=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;
  gate.open=false;gate.t=0;bridge.open=false;bridge.t=0;port.open=false;port.t=0;latch.t=0;
  for(const l of levers){l.pulled=false;l.t=0;}crank.used=false;crank.t=0;
  block.pos.copy(block.home);block.vel.set(0,0,0);syncBlock();
  runes.forEach(r=>{r.state=['rest','perched','vault'][r.i];r.pos.copy(r.home);r.vel.set(0,0,0);r.t=0;});
  golem.runes=0;golem.holding=false;golem.charging=false;golem.cp=0;sprite.held=false;sprite.cp=0;
  placeAt(golem,CP[0].g);placeAt(sprite,CP[0].s);golem.yaw=sprite.yaw=Math.PI;
  W.basinWater.visible=false;W.jet.visible=false;W.fLight.intensity=0;W.sockets.forEach(s=>s.visible=false);
  hintsShown.clear();camSnap=true;
}
function placeAt(b,p){b.pos.set(p[0],p[1],p[2]);b.vel.set(0,0,0);b.onGround=false;}

// ---- interactions ----
function golemAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,F)<4.7){placeRunes();return;}
  for(const r of runes){if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2){r.state='carried';g.runes++;G.pick++;return;}}}
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75){sprite.held=true;g.holding=true;sprite.vel.set(0,0,0);sprite.gliding=false;G.pick++;return;}}
}
function placeRunes(){for(const r of runes)if(r.state==='carried'){r.state='placed';G.placed++;}golem.runes=0;}
function throwSprite(){
  const g=golem,c=g.charge,f=fwd(g.yaw),hs=3.4+5.4*c,vs=9.2-1.2*c;
  g.holding=false;g.charging=false;sprite.held=false;
  headPos(sprite.pos);sprite.pos.x+=f.x*.3;sprite.pos.z+=f.z*.3;
  if(!freeAt(sprite,listFor(sprite)))headPos(sprite.pos);
  sprite.vel.set(f.x*hs,vs,f.z*hs);sprite.thrownT=1.0;sprite.yaw=g.yaw;G.throws++;
}
function spriteTarget(){
  const s=sprite;let best=null,bd=1.2;
  const consider=(obj,p,label)=>{const d=dxz(s.pos,p);if(d<bd&&Math.abs(p.y-s.pos.y)<1.0){bd=d;best={obj,label};}};
  for(const l of levers)if(!l.pulled)consider(l,l.pos,'Pull the lever');
  if(!crank.used)consider(crank,crank.pos,'Turn the crank');
  const r1=runes[1];if(r1.state==='perched')consider(r1,r1.pos,'Nudge the rune stone off');
  return best;
}
function spriteAction(){
  const t=spriteTarget();if(!t)return;G.useN++;
  if(t.obj===crank){crank.used=true;bridge.open=true;}
  else if(t.obj.kind==='rune'){const r=t.obj;r.state='free';r.pos.y+=.05;r.vel.set(-3.8,3.2,2.0);r.onGround=false;}
  else{t.obj.pulled=true;if(t.obj.id==='gate')gate.open=true;else{const r=runes[2];if(r.state==='vault'){r.state='rolling';r.t=0;}}}
}

// ---- per-step simulation ----
const _h=new V3();
function stepSim(dt,IG,IS){
  if(G.phase!=='play')return;
  if(!G.ending)G.time+=dt;
  if(G.ending){IG=NOIN;IS=NOIN;}
  const g=golem,s=sprite;
  g.prev.copy(g.pos);
  // ---- golem ----
  if(IG.actP){if(g.holding){g.charging=true;g.charge=0;}else golemAction();}
  if(g.charging){g.charge=Math.min(1,g.charge+dt/.8);if(!IG.act)throwSprite();}
  {const len=Math.hypot(IG.mx,IG.mz),k=len>1?1/len:1,mx=IG.mx*k,mz=IG.mz*k;
   const spd=GOLEM.speed*(g.holding?.8:1)*(g.charging?.35:1)*(g.pushing?.6:1);g.pushing=false;
   const acc=(g.onGround?16:6)*dt*GOLEM.speed;
   g.vel.x=approach(g.vel.x,mx*spd,acc);g.vel.z=approach(g.vel.z,mz*spd,acc);
   if(len>.15)g.yaw=angLerp(g.yaw,Math.atan2(mx,mz),1-Math.exp(-dt*9));
   if(IG.jumpP&&g.coyote>0&&!g.holding&&!g.charging){g.vel.y=GOLEM.jumpV;g.coyote=0;}
   g.vel.y-=GRAV*dt;
   moveBody(g,dt,listFor(g));
   g.coyote=g.onGround?.12:g.coyote-dt;}
  g.delta.subVectors(g.pos,g.prev);syncGolemCol();
  // ---- block ----
  {block.vel.y-=GRAV*dt;block.vel.x=block.vel.z=0;const l=listFor(block);moveBody(block,dt,l);syncBlock();if(block.pos.y<-4){block.pos.copy(block.home);block.vel.set(0,0,0);syncBlock();}}
  // ---- sprite ----
  if(s.held){headPos(s.pos);s.yaw=g.yaw;s.vel.set(0,0,0);s.onGround=false;s.gliding=false;
    if(IS.jumpP){s.held=false;g.holding=false;g.charging=false;const f=fwd(g.yaw);s.vel.set(IS.mx*2.6+f.x*.6,SPR.jumpV,IS.mz*2.6+f.z*.6);syncGolemCol();}}
  else{
    if(IS.actP)spriteAction();
    if(s.ground===golem.col)s.pos.add(g.delta);
    depenetrate(s,golem.col);depenetrate(s,block.col);
    const len=Math.hypot(IS.mx,IS.mz),k=len>1?1/len:1,mx=IS.mx*k,mz=IS.mz*k;
    s.gliding=!s.onGround&&IS.jump&&s.vel.y<0;
    const tgt=s.onGround?SPR.speed:(s.gliding?3.2:4.6),acc=s.onGround?42*dt:(len<.15?0:(s.thrownT>0?4:13)*dt);
    s.vel.x=approach(s.vel.x,mx*tgt,acc);s.vel.z=approach(s.vel.z,mz*tgt,acc);
    if(s.gliding&&s.thrownT<=0){const hsp=Math.hypot(s.vel.x,s.vel.z);if(hsp>3.6){const kk=Math.max(3.6,hsp-6*dt)/hsp;s.vel.x*=kk;s.vel.z*=kk;}}
    if(len>.15)s.yaw=angLerp(s.yaw,Math.atan2(mx,mz),1-Math.exp(-dt*14));
    else if(!s.onGround&&Math.hypot(s.vel.x,s.vel.z)>1)s.yaw=angLerp(s.yaw,Math.atan2(s.vel.x,s.vel.z),1-Math.exp(-dt*8));
    if(IS.jumpP&&s.coyote>0){s.vel.y=SPR.jumpV;s.coyote=0;}
    s.vel.y-=GRAV*dt;if(s.gliding)s.vel.y=Math.max(s.vel.y,-1.6);
    moveBody(s,dt,listFor(s));
    s.coyote=s.onGround?.1:s.coyote-dt;s.thrownT-=dt;if(s.onGround)s.thrownT=0;
    s.airT=s.onGround?0:s.airT+dt;
  }
  // ---- runes ----
  for(const r of runes){
    if(r.state==='rolling'){r.t+=dt/1.4;const a=Math.min(1,r.t);r.pos.set(lerp(-8.6,-4.9,a),0,-47.3);if(a>=1){r.state='free';r.vel.set(.8,0,0);}}
    else if(r.state==='free'){r.vel.y-=GRAV*dt;const dr=Math.exp(-(r.onGround?7:.6)*dt);r.vel.x*=dr;r.vel.z*=dr;moveBody(r,dt,listFor(r).filter(c=>c.kind!=='golem'));
      if(r.pos.y<-4){r.pos.set(r.i===1?4.4:-4.5,0,r.i===1?-40:-47.3);r.vel.set(0,0,0);}}
  }
  // ---- plates & doors ----
  for(const p of plates){let w=0;const on=(b,wt)=>{if(Math.abs(b.pos.x-p.x)<p.hw+.05&&Math.abs(b.pos.z-p.z)<p.hw+.05&&b.pos.y<.25&&b.pos.y>-.2&&b.onGround)w+=wt;};
    on(g,10);on(block,10);if(!s.held)on(s,1);for(const r of runes)if(r.state==='free')on(r,2);p.on=w>=p.need;}
  if(!port.open){if(plates[0].on&&plates[1].on)latch.t+=dt;else latch.t=Math.max(0,latch.t-dt*1.5);if(latch.t>=1.1){port.open=true;latch.t=1.1;}}
  gate.t=approach(gate.t,gate.open?1:0,dt/2.4);bridge.t=approach(bridge.t,bridge.open?1:0,dt/2.6);port.t=approach(port.t,port.open?1:0,dt/2.2);
  for(const l of levers)l.t=approach(l.t,l.pulled?1:0,dt/.35);crank.t=approach(crank.t,crank.used?1:0,dt/2.6);
  applyDoorColliders();
  // ---- falls & checkpoints ----
  for(const b of [g,s]){
    if(b===s&&s.held)continue;
    if(b.onGround&&b.pos.y>-.5){for(let i=CP.length-1;i>b.cp;i--)if(b.pos.z<=CP[i].z){b.cp=i;break;}}
    if(b.pos.y<-5){
      const p=CP[b.cp][b===g?'g':'s'];placeAt(b,p);G.falls++;G.fallN++;G.lastFall=b===g?'g':'s';
      if(b===g&&g.holding){g.holding=false;g.charging=false;s.held=false;placeAt(s,CP[s.cp].s);}
      if(b===g)syncGolemCol();
    }
  }
  // ---- ending ----
  if(!G.ending&&G.placed>=3&&!s.held&&dxz(s.pos,W.spout)<.95&&s.pos.y>3.4&&s.pos.y<5){G.ending=true;G.endT=0;}
  if(G.ending){G.endT+=dt;if(G.endT>7.5){G.phase='end';}}
}
const NOIN={mx:0,mz:0,jump:0,jumpP:0,act:0,actP:0};
function applyDoorColliders(){
  gate.col.min.y=gate.base.y0+gate.t*3.5;gate.col.max.y=gate.base.y1+gate.t*3.5;
  port.col.min.y=port.base.y0+port.t*3.5;port.col.max.y=port.base.y1+port.t*3.5;
  bridge.col.on=bridge.t>=.97;
}

// ================= names =================
const ROLE={g:'Giant',s:'Sprite'};
const names={g:'',s:''};
function nameOf(r){return names[r]||ROLE[r];}
function store(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function recall(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}}
const cleanName=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,16);

// ================= input =================
const keys={};
const GAME_KEYS=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Slash','ShiftRight','Tab'];
let chatOpen=false;
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  if(GAME_KEYS.includes(e.code))e.preventDefault();
  initAudio();
  if(e.repeat)return;keys[e.code]=true;
  if(e.code==='Escape'){togglePause();return;}
  if(e.code==='KeyM')setMuted(!muted);
  if(e.code==='KeyH'){cardsCollapsed=!cardsCollapsed;$('cardG').classList.toggle('collapsed',cardsCollapsed);$('cardS').classList.toggle('collapsed',cardsCollapsed);}
  if(G.phase==='play'&&(e.code==='KeyQ'||e.code==='KeyR'))rotateCam(e.code==='KeyQ'?-1:1);
  if(mode==='online'&&(G.phase==='play'||G.phase==='brief'||G.phase==='end')&&$('scrPause').hidden){
    if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();keys[e.code]=false;openChat();return;}
    const qm=/^(Digit|Numpad)([1-4])$/.exec(e.code);if(qm)sendChat(QUICK[+qm[2]-1],true);
  }
  if(G.phase==='brief'&&mode==='local'){if(e.code==='Space')readyG=true;if(e.code==='Enter'||e.code==='KeyO')readyS=true;updateReady();}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let cardsCollapsed=false;
function padState(i){const ps=navigator.getGamepads?navigator.getGamepads():[];const pads=[];for(const p of ps)if(p&&p.connected)pads.push(p);const p=pads[i];if(!p)return null;
  const dz=v=>Math.abs(v)<.22?0:v;return {mx:dz(p.axes[0]||0),mz:dz(p.axes[1]||0),jump:!!(p.buttons[0]&&p.buttons[0].pressed),act:!!((p.buttons[2]&&p.buttons[2].pressed)||(p.buttons[1]&&p.buttons[1].pressed))};}
const K=(...c)=>c.some(k=>keys[k])?1:0;
// screen-relative input -> world direction, following the camera's current turn
function toWorld(r){const c=Math.cos(camYaw),s=Math.sin(camYaw);const mx=r.mx*c+r.mz*s,mz=-r.mx*s+r.mz*c;r.mx=mx;r.mz=mz;return r;}
function rawLocal(which){ // which: 'g'|'s'
  let r;
  if(which==='g')r={mx:K('KeyD')-K('KeyA'),mz:K('KeyS')-K('KeyW'),jump:K('Space'),act:K('KeyE','KeyF')};
  else r={mx:K('ArrowRight','KeyL')-K('ArrowLeft','KeyJ'),mz:K('ArrowDown','KeyK')-K('ArrowUp','KeyI'),jump:K('Enter','KeyO'),act:K('ShiftRight','KeyU','Slash')};
  const p=padState(which==='g'?0:1);if(p){if(p.mx||p.mz){r.mx=p.mx;r.mz=p.mz;}r.jump=r.jump||p.jump;r.act=r.act||p.act;}
  return toWorld(r);
}
function rawOnline(){
  if(chatOpen)return {mx:0,mz:0,jump:0,act:0};
  const r={mx:K('KeyD','ArrowRight')-K('KeyA','ArrowLeft'),mz:K('KeyS','ArrowDown')-K('KeyW','ArrowUp'),jump:K('Space'),act:K('KeyE','KeyF','ShiftRight')};
  const p=padState(0);if(p){if(p.mx||p.mz){r.mx=p.mx;r.mz=p.mz;}r.jump=r.jump||p.jump;r.act=r.act||p.act;}return toWorld(r);
}
function edge(state,raw){const o={mx:raw.mx,mz:raw.mz,jump:raw.jump,act:raw.act,jumpP:raw.jump&&!state.j?1:0,actP:raw.act&&!state.a?1:0};state.j=raw.jump;state.a=raw.act;return o;}
const edgeG={j:0,a:0},edgeS={j:0,a:0},edgeMe={j:0,a:0};

// ================= chat (online) =================
const QUICK=['Over here!','Throw me!','Wait for me','Got it!'];
const chatNonce=Math.random().toString(36).slice(2,9);let chatSeq=0,lastChatSent=0;const myChat=[];const seenChat={};const chatLines=[];
const bubbles={g:{el:null,t:0},s:{el:null,t:0}};
function openChat(){if(chatOpen)return;chatOpen=true;for(const k in keys)keys[k]=false;$('chatForm').hidden=false;$('chat').classList.add('open');$('chatIn').value='';$('chatIn').focus();}
function closeChat(){chatOpen=false;$('chatForm').hidden=true;$('chat').classList.remove('open');if(document.activeElement===$('chatIn'))$('chatIn').blur();}
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const t=$('chatIn').value.replace(/\s+/g,' ').trim();if(t)sendChat(t,false);closeChat();});
$('chatIn').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeChat();}});
$('chatIn').addEventListener('blur',()=>{if(chatOpen)setTimeout(()=>{if(chatOpen&&document.activeElement!==$('chatIn'))closeChat();},0);});
function sendChat(text,quick){
  const now=performance.now();if(now-lastChatSent<500)return;lastChatSent=now;
  text=String(text).slice(0,140);chatSeq++;myChat.push([chatSeq,text,quick?1:0]);if(myChat.length>6)myChat.shift();
  lastIn='';addChatLine(myRole,text);showBubble(myRole,text);SFX.ping(quick);
}
function receiveChat(pres){
  if(!pres||!Array.isArray(pres.ch)||typeof pres.cn!=='string')return;
  const last=seenChat[pres.cn]||0;let top=last;const r=myRole==='g'?'s':'g';
  for(const m of pres.ch){if(!Array.isArray(m))continue;const seq=m[0]|0;if(seq<=last)continue;const text=String(m[1]||'').slice(0,140);if(!text)continue;
    addChatLine(r,text);showBubble(r,text);SFX.ping(!!m[2]);if(seq>top)top=seq;}
  seenChat[pres.cn]=top;
}
function addChatLine(r,text,sys){
  const d=document.createElement('div');d.className='msg '+(sys?'sys':r);
  if(!sys){const b=document.createElement('b');b.textContent=nameOf(r);d.appendChild(b);}
  d.appendChild(document.createTextNode(text));$('chatLog').appendChild(d);chatLines.push({el:d,t:performance.now()});
  while(chatLines.length>8){const o=chatLines.shift();o.el.remove();}
}
function showBubble(r,text){const b=bubbles[r];b.el=b.el||$(r==='g'?'bubG':'bubS');b.el.textContent=text;b.el.hidden=false;b.t=4.5;}
function updateChat(dt){
  const now=performance.now();for(const l of chatLines)l.el.classList.toggle('old',now-l.t>9000);
  for(const r of ['g','s']){const b=bubbles[r];if(b.t>0){b.t-=dt;if(b.t<=0&&b.el)b.el.hidden=true;}}
}
function clearChat(){$('chatLog').textContent='';chatLines.length=0;for(const r of ['g','s']){const b=bubbles[r];b.t=0;const el=$(r==='g'?'bubG':'bubS');el.hidden=true;}}

// ================= audio =================
let AC=null,master=null,muted=false,noiseBuf=null,amb={};
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=muted?0:.7;master.connect(AC.destination);
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=.98*b+.02*w;d[i]=w*.5+b*3;}
  const loop=(type,f,q,vol)=>{const n=AC.createBufferSource();n.buffer=noiseBuf;n.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=vol;n.connect(fl);fl.connect(g);g.connect(master);n.start();return {g,fl};};
  amb.wind=loop('bandpass',380,.6,.05);amb.water=loop('lowpass',900,.5,0);amb.glide=loop('bandpass',2200,2,0);amb.grind=loop('lowpass',300,1,0);amb.fount=loop('bandpass',1400,.4,0);
  birdLoop();
}
function birdLoop(){if(!AC)return;setTimeout(birdLoop,2500+Math.random()*6000);if(G.phase!=='play'||muted||document.hidden)return;
  const base=2200+Math.random()*1600,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)tone(base*(1+Math.random()*.2),base*(.8+Math.random()*.5),.09,'sine',.018,i*.13);}
function tone(f0,f1,dur,type,vol,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.012);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+.05);}
function noiseHit(dur,vol,freq,type,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),n=AC.createBufferSource();n.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;const g=AC.createGain();
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);n.connect(f);f.connect(g);g.connect(master);n.start(t0,Math.random());n.stop(t0+dur+.05);}
const SFX={
  thud:v=>{noiseHit(.18,.22*v,160);tone(70,40,.18,'sine',.25*v);},
  hop:()=>{tone(880,1320,.12,'sine',.06);tone(1320,1760,.1,'sine',.03,.05);},
  land:()=>tone(660,520,.06,'sine',.03),
  clunk:()=>{noiseHit(.15,.25,700);tone(180,90,.2,'square',.05);},
  rumble:d=>{noiseHit(d,.28,120);noiseHit(d*.8,.12,500,'bandpass');},
  creak:()=>{for(let i=0;i<5;i++)tone(240+i*30,180,.25,'sawtooth',.02,i*.35);noiseHit(2,.1,300);},
  chime:()=>{[523,659,784].forEach((f,i)=>tone(f,f,1.2,'sine',.07,i*.08));tone(1568,1568,1.4,'sine',.03,.24);},
  place:()=>{noiseHit(.2,.25,400);[392,494,587].forEach((f,i)=>tone(f,f,1.4,'sine',.07,i*.1));},
  lift:()=>tone(330,500,.15,'triangle',.06),
  toss:()=>{noiseHit(.25,.18,1600,'bandpass');tone(500,900,.2,'sine',.05);},
  splash:()=>{noiseHit(.5,.4,1800);noiseHit(.9,.2,500);},
  click:()=>{tone(1200,900,.05,'square',.04);noiseHit(.06,.15,2000,'highpass');},
  ping:q=>{tone(q?988:784,q?1318:1046,.16,'sine',.07);tone(q?1318:1046,q?1568:1318,.18,'sine',.04,.08);},
  swell:()=>{[262,330,392,523,659].forEach((f,i)=>{tone(f,f*1.001,4.5,'sine',.05,i*.35);tone(f*2,f*2,3,'sine',.015,i*.35+.1);});noiseHit(5,.3,1200,'bandpass',.2);},
};
function setMuted(m){muted=m;if(master)master.gain.value=m?0:.7;$('bMute').textContent=m?'Unmute sound':'Mute sound';}
function updateAudio(dt){
  if(!AC)return;const t=AC.currentTime,focus=camTarget;
  const nearWater=Math.max(0,1-Math.abs(focus.z+30)/14)*.12+Math.max(0,1-Math.abs(focus.z+56)/8)*.04*(focus.x<0?1:.4);
  amb.water.g.gain.setTargetAtTime(G.phase==='play'?nearWater:0,t,.4);
  amb.wind.g.gain.setTargetAtTime(G.phase==='play'||G.phase==='title'?.05+Math.sin(t*.13)*.02:.02,t,.8);
  amb.glide.g.gain.setTargetAtTime(sprite.gliding&&G.phase==='play'?.04:0,t,.05);
  amb.grind.g.gain.setTargetAtTime(golem.pushVis>0?.25:0,t,.08);
  amb.fount.g.gain.setTargetAtTime(G.ending||G.phase==='end'?.12:0,t,.8);
}

// ================= watchers (sounds, toasts, one-shot animations) — run on every client =================
const WATCH={};
function watch(key,val,fn){if(!(key in WATCH)){WATCH[key]=val;return;}if(WATCH[key]!==val){const old=WATCH[key];WATCH[key]=val;fn(val,old);}}
function resetWatch(){for(const k in WATCH)delete WATCH[k];}
function runWatchers(){
  watch('gate',gate.open,v=>{if(v){SFX.clunk();SFX.rumble(2.4);toast('The gate grinds open!');}});
  watch('bridge',bridge.open,v=>{if(v){SFX.clunk();SFX.creak();toast('The drawbridge lowers!');}});
  watch('port',port.open,v=>{if(v){SFX.clunk();SFX.rumble(2.2);toast('The portcullis locks open!');}});
  watch('pa',plates[0].on,v=>{if(v)SFX.click();});watch('pb',plates[1].on,v=>{if(v)SFX.click();});
  levers.forEach((l,i)=>watch('lv'+i,l.pulled,v=>{if(v)SFX.clunk();}));
  runes.forEach((r,i)=>watch('r'+i,r.state,(v,o)=>{
    if(v==='carried'){SFX.chime();const n=runes.filter(x=>x.state==='carried'||x.state==='placed').length;toast('Rune stone found ('+n+'/3)');}
    if(v==='placed'){SFX.place();}
    if(v==='free'&&o==='perched'){SFX.click();}
    if(v==='rolling'){SFX.rumble(1.4);}
  }));
  watch('placed',G.placed,v=>{if(v>=3)toast('All three runes are set. Wake the spout!');else if(v>0)toast(v+' of 3 runes set');});
  watch('fallN',G.fallN,()=>{SFX.splash();toast(nameOf(G.lastFall==='g'?'g':'s')+' fell. Back to the checkpoint');});
  watch('held',sprite.held,v=>{if(v)SFX.lift();});
  watch('pick',G.pick,()=>{if(golem.A)golem.A.shot('PickUp',1.8);});
  watch('throws',G.throws,()=>{SFX.toss();if(golem.A)golem.A.shot('Throw',1.6);});
  watch('use',G.useN,()=>{if(sprite.A)sprite.A.shot('Interact',1.4);});
  watch('ending',G.ending,v=>{if(v){SFX.swell();toast('The fountain wakes!');}});
  watch('sg',sprite.onGround,v=>{if(v&&!sprite.held)SFX.land();});
}

// ================= HUD helpers =================
let toastT=0,hintT=0;
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;toastT=3.2;}
const hintsShown=new Set();
function hint(id,text){if(hintsShown.has(id))return;hintsShown.add(id);$('hint').textContent=text;$('hint').style.opacity=1;hintT=8;}
function keysFor(role){
  if(mode==='online')return role==='g'?
    [['Move','WASD / Arrows'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']]:
    [['Move','WASD / Arrows'],['Jump · glide','Space (hold)'],['Interact','E'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']];
  return role==='g'?[['Move','W A S D'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R']]:
    [['Move','Arrow keys or I J K L'],['Jump · glide','Enter or O (hold)'],['Interact','Right Shift, U or /']];
}
function fillKeys(el,role){el.textContent='';for(const [a,b] of keysFor(role)){const s1=document.createElement('span');s1.textContent=a;const s2=document.createElement('span');
  let main=b,extra='';const pi=b.indexOf(' (');if(pi>=0){main=b.slice(0,pi);extra=b.slice(pi);}
  main.split(/( or | \/ |, )/).forEach(part=>{if(!part)return;if(/^( or | \/ |, )$/.test(part)){s2.appendChild(document.createTextNode(part));}else{const k=document.createElement('kbd');k.textContent=part;s2.appendChild(k);}});
  if(extra)s2.appendChild(document.createTextNode(extra));el.append(s1,s2);}}
function actKey(role){return mode==='online'?'E':(role==='g'?'E':'Right Shift');}
function jumpKey(role){return mode==='online'?'Space':(role==='g'?'Space':'Enter');}
function golemPrompt(){
  const g=golem,k=actKey('g');
  if(G.ending)return '';
  if(g.charging)return 'Release '+k+' to throw!';
  if(g.holding)return 'Tap '+k+' for a high lob, or hold '+k+' for a long throw';
  if(g.runes>0&&dxz(g.pos,F)<4.7)return k+': set the rune stones in the fountain';
  for(const r of runes)if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2)return k+': take the rune stone';}
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75)return k+': pick up '+nameOf('s');}
  if(dxz(g.pos,block.pos)<1.8&&g.pos.y<block.pos.y+.3)return 'Walk into the block to push it';
  return '';
}
function spritePrompt(){
  const s=sprite;if(G.ending)return '';
  if(s.held)return jumpKey('s')+': leap off. Or wait to be thrown';
  const t=spriteTarget();if(t)return actKey('s')+': '+t.label.toLowerCase();
  if(!s.onGround&&!s.gliding&&s.vel.y<0)return 'Hold '+jumpKey('s')+' to glide';
  if(G.placed>=3&&dxz(s.pos,W.spout)<4)return 'Get onto the spout at the top of the fountain';
  return '';
}
function objectiveText(){
  if(G.ending)return 'The fountain wakes.';
  if(!gate.open)return 'Open the north gate. Its lever is in a small room behind the east wall. Only the Sprite fits through the glowing gap.';
  if(!bridge.open)return 'Cross the ravine. The Giant can pick up the Sprite and throw it over to the drawbridge crank.';
  if(!port.open)return 'Open the portcullis: hold both pressure plates at once. Giant on the big one, Sprite on the small one inside the walled alcove.';
  if(G.placed<3){const missing=runes.filter(r=>r.state!=='carried'&&r.state!=='placed');if(missing.length)return 'Find the missing rune stones ('+missing.map(r=>r.where.toLowerCase()).join(', ')+'), then bring them to the fountain.';
    return 'Giant: stand by the fountain and set the rune stones into its rim.';}
  return 'Wake the fountain: get the Sprite onto the spout at the very top. The Giant can lift it, and the Sprite can leap from its hands.';
}
let hudCache={};
function setText(id,t){if(hudCache[id]!==t){hudCache[id]=t;$(id).textContent=t;}}
function updateHUD(dt){
  setText('objText',objectiveText());
  const rl=$('runeList');const sig=runes.map(r=>r.state).join();
  if(hudCache.runes!==sig){hudCache.runes=sig;rl.textContent='';for(const r of runes){const d=document.createElement('div');const st=r.state==='carried'?'carried':r.state==='placed'?'placed':'';d.className=st;
    d.textContent=r.where.split(' ')[1].replace(/^./,c=>c.toUpperCase())+(st==='carried'?' · carried':st==='placed'?' · set':'');d.title=r.where;rl.appendChild(d);}}
  const inWW=(golem.pos.z<-44||sprite.pos.z<-44)&&!port.open;$('plates').hidden=!inWW;
  if(inWW){$('plA').classList.toggle('on',plates[0].on);$('plB').classList.toggle('on',plates[1].on);$('latch').firstChild.style.width=(latch.t/1.1*100)+'%';}
  const m=Math.floor(G.time/60),s=Math.floor(G.time%60);setText('timer',m+':'+(s<10?'0':'')+s);
  setText('promptG',golemPrompt());setText('promptS',spritePrompt());
  const ch=$('charge');const showCh=golem.charging&&(mode==='local'||myRole==='g');ch.hidden=!showCh;if(showCh)ch.querySelector('b').style.width=(golem.charge*100)+'%';
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0;}
  if(hintT>0){hintT-=dt;if(hintT<=0)$('hint').style.opacity=0;}
  const mineG=mode==='local'||myRole==='g',mineS=mode==='local'||myRole==='s';
  if(G.time>1.5&&G.time<2.5)hint('start',mode==='online'?'Your goal is in the top-left. Press Q or R to turn the camera, Enter to chat.':'Your goal is in the top-left. Press Q or R to turn the camera.');
  if(mineS&&!gate.open&&dxz(sprite.pos,{x:10.5,z:-15.4})<4)hint('hole','Sprite: the glowing gap in the east wall is just big enough for you.');
  if(mineG&&runes[0].state==='rest'&&dxz(golem.pos,block.pos)<3)hint('block','Giant: push the stone block against the ledge, then climb up to the rune stone.');
  if(gate.open&&!bridge.open&&(golem.pos.z<-24||sprite.pos.z<-24))hint('ravine','Too far to jump. Giant: pick up the Sprite with '+actKey('g')+', hold it to charge a long throw. The Sprite can glide.');
  if(bridge.open&&runes[1].state==='perched'&&dxz(golem.pos,runes[1].pos)<6)hint('column','The rune stone is too high. Giant: tap '+actKey('g')+' for a short high lob onto the column.');
  if(gate.open&&runes[2].state==='vault'&&dxz(sprite.pos,{x:-6.2,z:-47.3})<4&&mineS)hint('vault','Sprite: crawl into the vault through the glowing slot and pull the lever.');
  if(!port.open&&(golem.pos.z<-50||sprite.pos.z<-50))hint('plates','Two plates must be held at once. Giant on the big one, Sprite slips into the alcove on the right.');
  if(port.open&&(golem.pos.z<-64||sprite.pos.z<-64))hint('fountain','Giant: set the runes into the fountain. Then lift the Sprite and let it leap onto the spout.');
  if(mineS&&sprite.airT>.45&&!sprite.held)hint('glide','Sprite: hold jump while falling to glide.');
}

// ================= camera: calm follow, quarter-turns with Q / R =================
const camTarget=new V3(0,1,0);let camSnap=true,camDist=14,camYaw=0,camYawT=0,camY=1,dbgDist=0;const PITCH=0.84;
function rotateCam(d){camYawT+=d*Math.PI/2;}
const _mid=new V3();
function updateCamera(dt,t){
  if(G.phase==='title'||G.phase==='loading'){const a=t*.04;camera.position.set(Math.sin(a)*18,11,-9+Math.cos(a)*18);camTarget.set(0,1.5,-10);camera.lookAt(camTarget);return;}
  const gy=Math.max(-1,golem.pos.y),sy=Math.max(-1,sprite.pos.y);
  _mid.set((golem.pos.x+sprite.pos.x)/2,(gy+sy)/2+1,(golem.pos.z+sprite.pos.z)/2);
  const sep=Math.hypot(golem.pos.x-sprite.pos.x,golem.pos.z-sprite.pos.z);
  let want=clamp(14.5+Math.max(0,sep-5)*.85,14.5,26);
  if(G.ending||G.phase==='end'){want=16;_mid.set(F.x,2.2,F.z);}
  if(dbgDist)want=dbgDist;
  const k=camSnap?1:1-Math.exp(-dt*4);
  camTarget.x=lerp(camTarget.x,_mid.x,k);camTarget.z=lerp(camTarget.z,_mid.z,k);
  camY=camSnap?_mid.y:lerp(camY,_mid.y,1-Math.exp(-dt*2.5));camTarget.y=camY;
  camDist=camSnap?want:lerp(camDist,want,1-Math.exp(-dt*1.2));
  camYaw=camSnap?camYawT:angLerp(camYaw,camYawT,1-Math.exp(-dt*7));
  camSnap=false;
  camera.position.set(camTarget.x+Math.sin(camYaw)*Math.cos(PITCH)*camDist,camTarget.y+Math.sin(PITCH)*camDist,camTarget.z+Math.cos(camYaw)*Math.cos(PITCH)*camDist);
  camera.lookAt(camTarget);
}

// ================= see-through walls =================
const _ray=new THREE.Raycaster(),_dir=new V3(),_tp=new V3();
function setOpacity(o,a){
  if(!o.material)return;
  if(!o.userData.ownMat){o.material=o.material.clone();o.userData.ownMat=true;}
  const m=o.material;m.transparent=a<.999;m.opacity=a;m.depthWrite=a>.98;
}
function updateFades(dt){
  for(const m of fadeables){const f=m.userData.fade;if(!f.leader)f.t=1;}
  if(G.phase==='play'||G.phase==='end'){
    const probes=[[golem,1.4],[golem,.4],[sprite,.25]];
    for(const [b,hgt] of probes){
      _tp.set(b.pos.x,b.pos.y+hgt,b.pos.z);_dir.subVectors(_tp,camera.position);const dist=_dir.length();if(dist<.5)continue;_dir.divideScalar(dist);
      _ray.set(camera.position,_dir);_ray.far=dist-.25;
      for(const h of _ray.intersectObjects(fadeables,false)){const f=h.object.userData.fade;(f.leader?f.leader.userData.fade:f).t=.1;}
    }
  }
  for(const m of fadeables){const f=m.userData.fade;if(f.leader||(f.o===1&&f.t===1))continue;
    f.o=approach(f.o,f.t,dt*(f.t<f.o?5:2.5));
    setOpacity(m,f.o);for(const o of f.linked)setOpacity(o,f.o);}
}

// ================= name tags, chat bubbles, off-screen arrows =================
const _pv=new V3();
function screenOf(x,y,z){_pv.set(x,y,z).project(camera);const behind=_pv.z>1;let sx=_pv.x,sy=_pv.y;if(behind){sx=-sx;sy=-sy;}
  return {x:(sx*.5+.5)*innerWidth,y:(-sy*.5+.5)*innerHeight,behind,inView:!behind&&Math.abs(sx)<.97&&Math.abs(sy)<.95};}
function updateOverlay(){
  const show=G.phase==='play';$('overlay').hidden=!show;if(!show)return;
  for(const r of ['g','s']){
    const b=r==='g'?golem:sprite,top=r==='g'?2.85:(sprite.held?1.25:.8);
    const p=screenOf(b.pos.x,b.pos.y+top,b.pos.z);
    const tag=$(r==='g'?'tagG':'tagS');
    tag.style.display=p.inView?'':'none';
    if(p.inView)tag.style.transform='translate('+p.x.toFixed(1)+'px,'+p.y.toFixed(1)+'px) translate(-50%,-100%)';
    const edgeEl=$(r==='g'?'edgeG':'edgeS');
    const care=mode==='local'||r!==myRole;
    if(!p.inView&&care){
      const cx=innerWidth/2,cy=innerHeight/2;let dx=p.x-cx,dy=p.y-cy;const mx=cx-70,my=cy-60;const s=Math.min(mx/Math.max(1e-3,Math.abs(dx)),my/Math.max(1e-3,Math.abs(dy)));
      dx*=s;dy*=s;edgeEl.style.transform='translate('+(cx+dx).toFixed(1)+'px,'+(cy+dy).toFixed(1)+'px) translate(-50%,-50%)';
      edgeEl.firstChild.style.transform='rotate('+Math.atan2(dy,dx).toFixed(3)+'rad)';edgeEl.style.opacity=1;
    }else edgeEl.style.opacity=0;
  }
}
function refreshNames(){
  for(const r of ['g','s']){const n=nameOf(r);
    $(r==='g'?'tagGName':'tagSName').textContent=n;$(r==='g'?'edgeGName':'edgeSName').textContent=n;
    $(r==='g'?'cardGName':'cardSName').textContent=(mode==='online'&&r===myRole)?n+' (you)':n;
    $(r==='g'?'pnameG':'pnameS').textContent=n;}
}

// ================= characters & world animation =================
function nextBeaconTarget(){
  if(!gate.open)return levers[0].pos;
  if(!bridge.open)return crank.pos;
  if(runes[2].state==='vault')return levers[1].pos;
  return null;
}
function updateVisuals(dt,t){
  const sun=W.sun;sun.target.position.copy(camTarget);sun.position.copy(camTarget).addScaledVector(W.sunDir,60);
  const sc=sun.shadow.camera,ext=clamp(camDist*1.15,16,30);if(Math.abs(sc.right-ext)>.5){sc.left=-ext;sc.right=ext;sc.top=ext;sc.bottom=-ext;sc.updateProjectionMatrix();}
  W.sky.position.copy(camera.position);
  // doors & mechanisms
  gate.group.position.y=gate.t*3.5;port.group.position.y=port.t*3.5;bridge.pivot.rotation.x=-1.45*(1-bridge.t);
  crank.wheel.rotation.x=crank.t*Math.PI*6;
  for(const l of levers)l.handle.rotation.z=lerp(-.7,.7,l.t);
  const pulse=.5+.5*Math.sin(t*3.2);
  for(const p of plates){p.mesh.position.y=p.on?-.04:0;p.ring.material.opacity=p.on?1:(port.open?.25:.35+.45*pulse);}
  for(const h of holeMarkers){h.icon.position.y=h.base+Math.sin(t*2)*.08;h.glow.material.opacity=.35+.3*pulse;}
  const bt=G.phase==='play'?nextBeaconTarget():null;W.beacon.visible=!!bt;if(bt){W.beacon.position.set(bt.x,bt.y+1.55+Math.abs(Math.sin(t*3))*.25,bt.z);}
  block.mesh.position.set(block.pos.x,block.pos.y+.6,block.pos.z);
  // runes
  for(const r of runes){
    const vis=r.state!=='carried'&&r.state!=='placed';r.mesh.visible=vis;r.glow.visible=vis;r.light.intensity=vis?.8:0;
    if(vis){const hover=(r.state==='rest'||r.state==='perched')?.3+Math.sin(t*1.8+r.i)*.06:.22;r.mesh.position.set(r.pos.x,r.pos.y+hover,r.pos.z);r.mesh.rotation.y=t*.8+r.i;
      r.light.position.set(r.pos.x,r.pos.y+.7,r.pos.z);r.glow.position.set(r.pos.x,r.pos.y+hover,r.pos.z);r.glow.material.opacity=.45+.25*pulse;}
  }
  W.sockets.forEach((s,i)=>s.visible=i<G.placed);
  updateGiant(dt,t);updateSpriteVis(dt,t);
  // ending: water and light
  if(G.ending||G.phase==='end'){
    const e=G.phase==='end'?8:G.endT;W.jet.visible=true;const js=Math.min(1,e/1.2);W.jet.scale.set(1,js,1);W.jet.position.y=3.6+.7*js;
    W.basinWater.visible=true;W.basinWater.position.y=lerp(.14,.68,Math.min(1,e/5));W.fLight.intensity=Math.min(2,e*.5);
    if(Math.random()<dt*35){const a=Math.random()*6.28,sp=.6+Math.random()*1.4;emit(F.x,5,F.z,Math.cos(a)*sp,1+Math.random()*1.5,Math.sin(a)*sp,.8,.97,1,.07,1.4,9,.2);}
  }
}
function placeRing(ring,b,size){
  const fy=floorBelow(b.pos,b===sprite?null:golem.col);const gap=b.pos.y-fy;
  if(fy<-50||gap>8){ring.visible=false;return;}
  ring.visible=true;ring.position.set(b.pos.x,fy+.03,b.pos.z);const k=clamp(1-gap/6,.35,1);ring.scale.setScalar(k);ring.material.opacity=.9*k;
}
function updateGiant(dt,t){
  const g=golem,gr=g.root;gr.position.copy(g.pos);gr.rotation.y=g.yaw;
  const hs=Math.hypot(g.vel.x,g.vel.z);
  g.pushVis=Math.max(0,(g.pushVis||0)-dt);if(g.pushing)g.pushVis=.15;
  g.carryA=lerp(g.carryA||0,g.holding?1:0,1-Math.exp(-dt*10));
  if(g.A){
    let n='Idle',ts=1;
    if(G.ending||G.phase==='end')n='Cheer';
    else if(!g.onGround&&Math.abs(g.vel.y)>2)n='Jump_Idle';
    else if(g.pushVis>0){n='Walking_B';ts=.75;}
    else if(hs>.35){n='Walking_A';ts=clamp(hs/2.6,.55,1.45);}
    if(!g.A.busy())g.A.play(n,.22,ts);
    g.A.update(dt);
    if(g.carryA>.01&&g.armL&&g.armR&&!g.A.busy()){g.armL.rotation.x-=2.6*g.carryA;g.armR.rotation.x-=2.6*g.carryA;}
    if(g.charging&&g.chest){g.chest.rotation.x-=.35*g.charge;}
  }
  g.gems.forEach((m,i)=>{m.visible=i<g.runes;const a=t*1.6+i*2.094;m.position.set(Math.cos(a)*.85,1.15+Math.sin(t*2+i)*.08,Math.sin(a)*.85);m.rotation.y=t*2;});
  g.walk+=dt*hs*2.1;const step=Math.floor(g.walk/Math.PI);if(step!==g.stepSound&&hs>1&&g.onGround){g.stepSound=step;SFX.thud(.45+Math.min(1,hs/3.4)*.35);}
  placeRing(g.ring,g,1.5);
}
function updateSpriteVis(dt,t){
  const s=sprite,sr=s.root;sr.position.copy(s.pos);sr.rotation.y=s.yaw;
  const ss=Math.hypot(s.vel.x,s.vel.z);
  if(s.A){
    let n='Idle',ts=1;
    if(G.ending||G.phase==='end')n='Cheer';
    else if(s.held)n='Sit_Floor_Idle';
    else if(!s.onGround)n='Jump_Idle';
    else if(ss>.35){n='Running_A';ts=clamp(ss/3.2,.6,1.6);}
    if(!s.A.busy())s.A.play(n,.15,ts);
    s.A.update(dt);
  }
  const flap=s.gliding?Math.sin(t*30)*.45+.9:(s.onGround?Math.sin(t*5)*.1+.3:Math.sin(t*20)*.5+.6);
  s.wings[0].rotation.y=-flap;s.wings[1].rotation.y=flap;
  sr.position.y+=s.onGround?0:.02*Math.sin(t*4);
  s.halo.material.opacity=.4+Math.sin(t*3)*.1;
  if(Math.random()<dt*(s.onGround?(ss>.5?10:3):22))emit(s.pos.x+(Math.random()-.5)*.12,s.pos.y+.22,s.pos.z+(Math.random()-.5)*.12,(Math.random()-.5)*.2,.15+Math.random()*.2,(Math.random()-.5)*.2,.55,1,.85,.06,.9,-.1,.6);
  placeRing(s.ring,s,.75);if(s.held)s.ring.visible=false;
}

// ================= online =================
// Two transports with the same small interface (presence / peers / leave):
// a direct peer-to-peer link (PeerJS, works from any browser and from the plain file),
// and the claude.ai live room as a fallback when the peer link can't be made.
let myName='',partnerName='',mode=null,myRole='g',room=null,R=null,role=null,code='',lastSeen=0,partnerSeenEver=false,lastPartnerPres=null,netPaused=false,netBusy=false;
const HAS_P2P=typeof window.Peer==='function';
const NET_READY='Online is ready. One of you creates a room, the other joins with its code.';
const roomP=Promise.resolve(null);
function netOk(){return HAS_P2P||!!room;}
function setNetReady(){['bHostG','bHostS','bJoin'].forEach(id=>$(id).disabled=!netOk()||netBusy);
  $('netNote').textContent=netOk()?NET_READY:'Online play could not load. Check the internet connection and reload the page. Playing on one keyboard works anywhere.';}
setNetReady();roomP.then(r=>{room=r;if(!netBusy)setNetReady();});
function randCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s;}
const P2P_ID='bigsmall-sunken-garden-';
function p2pRoom(isHost,c){
  return new Promise((resolve,reject)=>{
    let peer;try{peer=isHost?new Peer(P2P_ID+c.toLowerCase(),{debug:0}):new Peer(P2P_ID+'guest-'+Math.random().toString(36).slice(2,12),{debug:0});}catch(e){reject('error');return;}
    const conns=new Set();let mine=null,dirty=false,dead=false,opened=false,cur=null,curT=0;
    const kill=()=>{dead=true;clearInterval(tick);clearInterval(watch);try{peer.destroy();}catch(e){}};
    const api={
      presence(o){mine=o;dirty=true;return Promise.resolve();},
      peers(){const out=[];for(const k of conns)if(k.open&&k.pres)out.push({sameTab:false,presence:k.pres});return out;},
      leave(){kill();return Promise.resolve();}
    };
    const tick=setInterval(()=>{if(dead||!dirty||!mine)return;dirty=false;for(const k of conns)if(k.open){try{k.send(mine);}catch(e){}}},33);
    function wire(k){conns.add(k);k.pres=null;
      k.on('open',()=>{dirty=true;});
      k.on('data',d=>{if(d&&typeof d==='object')k.pres=d;});
      const gone=()=>{k.gone=true;conns.delete(k);};k.on('close',gone);k.on('error',gone);}
    function connect(){
      if(dead)return;
      if(peer.disconnected){try{peer.reconnect();}catch(e){}return;}
      if(cur&&!cur.gone){try{cur.close();}catch(e){}}conns.clear();
      try{cur=peer.connect(P2P_ID+c.toLowerCase(),{serialization:'json',reliable:true});}catch(e){cur=null;return;}
      curT=performance.now();if(cur)wire(cur);}
    // guest: keep trying until the host's room answers, and reconnect if the link drops
    const watch=isHost?0:setInterval(()=>{if(dead||!opened)return;if(!cur||cur.gone||(!cur.open&&performance.now()-curT>6000))connect();},2000);
    peer.on('open',()=>{if(dead)return;opened=true;if(!isHost)connect();resolve(api);});
    peer.on('connection',k=>{if(!isHost||dead)return;for(const o of conns){try{o.close();}catch(e){}}conns.clear();wire(k);});
    peer.on('disconnected',()=>{if(!dead)setTimeout(()=>{try{if(!dead&&peer.disconnected)peer.reconnect();}catch(e){}},1500);});
    peer.on('error',e=>{const t=(e&&e.type)||'error';if(!opened){kill();reject(t);}});
    setTimeout(()=>{if(!opened&&!dead){kill();reject('timeout');}},15000);
  });
}
// returns true when connected to a room transport, 'taken' when the room code is already in use, false on failure
async function enterRoom(){
  lastSeen=performance.now();partnerSeenEver=false;lastPartnerPres=null;R=null;
  if(HAS_P2P){for(let i=0;i<3;i++){try{R=await p2pRoom(role==='host',code);return true;}catch(e){if(e==='unavailable-id')return 'taken';await new Promise(r=>setTimeout(r,800));}}}
  if(room){let r=room;try{r=await room.join('bs-'+code.toLowerCase());}catch(e){r=room;}R=r;return true;}
  return false;
}
function clearPresence(){if(R)R.presence({c:null,r:null,hr:null,st:null,in:null,nm:null,ch:null}).catch(()=>{});}
async function leaveOnline(){const r=R;clearPresence();R=null;if(r&&r!==room&&r.leave){try{await r.leave();}catch(e){}}}
function findPartner(){if(!R)return null;const want=role==='host'?'g':'h';for(const p of R.peers()){if(p.sameTab)continue;const pr=p.presence;if(pr&&pr.c===code&&pr.r===want)return p;}return null;}
const r2=v=>Math.round(v*100)/100;
function packState(){
  return {ph:G.phase,t:r2(G.time),
    g:[r2(golem.pos.x),r2(golem.pos.y),r2(golem.pos.z),r2(golem.yaw),r2(golem.vel.x),r2(golem.vel.z),golem.holding?1:0,golem.charging?1:0,r2(golem.charge),golem.runes,golem.onGround?1:0,golem.pushVis>0?1:0],
    s:[r2(sprite.pos.x),r2(sprite.pos.y),r2(sprite.pos.z),r2(sprite.yaw),r2(sprite.vel.x),r2(sprite.vel.y),r2(sprite.vel.z),sprite.held?1:0,sprite.gliding?1:0,sprite.onGround?1:0],
    b:[r2(block.pos.x),r2(block.pos.y),r2(block.pos.z)],
    r:runes.map(r=>[RS.indexOf(r.state),r2(r.pos.x),r2(r.pos.y),r2(r.pos.z)]),
    d:[gate.open?1:0,bridge.open?1:0,port.open?1:0,r2(latch.t),plates[0].on?1:0,plates[1].on?1:0,levers[0].pulled?1:0,levers[1].pulled?1:0,crank.used?1:0,r2(gate.t),r2(bridge.t),r2(port.t)],
    pl:G.placed,en:G.ending?1:0,et:r2(G.endT),f:G.falls,fn:G.fallN,lf:G.lastFall,th:G.throws,pk:G.pick,us:G.useN};
}
const RS=['rest','perched','vault','rolling','free','carried','placed'];
const tgtG=new V3(),tgtS=new V3();
function applyState(st){
  if(!st||!Array.isArray(st.g))return;
  const ph=['brief','play','end'].includes(st.ph)?st.ph:'brief';
  if(ph==='play'&&G.phase!=='play'){camSnap=true;}
  G.phase=ph;G.time=+st.t||0;
  const g=st.g,s=st.s;
  tgtG.set(+g[0],+g[1],+g[2]);golem.yaw=+g[3];golem.vel.set(+g[4],0,+g[5]);golem.holding=!!g[6];golem.charging=!!g[7];golem.charge=+g[8];golem.runes=g[9]|0;golem.onGround=!!g[10];golem.pushing=!!g[11];
  tgtS.set(+s[0],+s[1],+s[2]);sprite.yaw=+s[3];sprite.vel.set(+s[4],+s[5],+s[6]);sprite.held=!!s[7];sprite.gliding=!!s[8];sprite.onGround=!!s[9];
  if(Array.isArray(st.b))block.pos.set(+st.b[0],+st.b[1],+st.b[2]);
  if(Array.isArray(st.r))st.r.forEach((a,i)=>{const r=runes[i];if(!r||!Array.isArray(a))return;r.state=RS[a[0]]||r.state;r.pos.set(+a[1],+a[2],+a[3]);});
  const d=st.d||[];gate.open=!!d[0];bridge.open=!!d[1];port.open=!!d[2];latch.t=+d[3]||0;plates[0].on=!!d[4];plates[1].on=!!d[5];levers[0].pulled=!!d[6];levers[1].pulled=!!d[7];crank.used=!!d[8];
  gate.t=+d[9]||0;bridge.t=+d[10]||0;port.t=+d[11]||0;
  G.placed=st.pl|0;G.ending=!!st.en;G.endT=+st.et||0;G.falls=st.f|0;G.lastFall=st.lf==='g'?'g':'s';G.fallN=st.fn|0;G.throws=st.th|0;G.pick=st.pk|0;G.useN=st.us|0;
}
function guestSmooth(dt){
  const k=1-Math.exp(-dt*16);
  if(golem.pos.distanceTo(tgtG)>4)golem.pos.copy(tgtG);else golem.pos.lerp(tgtG,k);
  if(sprite.pos.distanceTo(tgtS)>4||sprite.held)sprite.pos.copy(tgtS);else sprite.pos.lerp(tgtS,k);
  for(const l of levers)l.t=approach(l.t,l.pulled?1:0,dt/.35);crank.t=approach(crank.t,crank.used?1:0,dt/2.6);
}
let guestJN=0,guestAN=0,lastPush=0,lastIn='';
function pushGuest(now){const r=rawOnline();
  if(r.jump&&!edgeMe.j)guestJN++;if(r.act&&!edgeMe.a)guestAN++;edgeMe.j=r.jump;edgeMe.a=r.act;
  const inp=[r2(r.mx),r2(r.mz),r.jump,guestJN,r.act,guestAN];const sig=inp.join();
  if(sig!==lastIn||now-lastPush>300){lastIn=sig;lastPush=now;R.presence({c:code,r:'g',in:inp,nm:myName,cn:chatNonce,ch:myChat}).catch(()=>{});}}
const partnerEdge={jn:-1,an:-1};
function partnerInput(p){
  const a=p&&p.presence&&Array.isArray(p.presence.in)?p.presence.in:null;if(!a)return NOIN;
  const jn=a[3]|0,an=a[5]|0;const jumpP=partnerEdge.jn>=0&&jn!==partnerEdge.jn?1:0,actP=partnerEdge.an>=0&&an!==partnerEdge.an?1:0;partnerEdge.jn=jn;partnerEdge.an=an;
  return {mx:clamp(+a[0]||0,-1,1),mz:clamp(+a[1]||0,-1,1),jump:a[2]?1:0,act:a[4]?1:0,jumpP,actP};
}


// ================= screens =================
function show(id){
  if(document.activeElement&&document.activeElement.blur&&document.activeElement!==$('chatIn'))document.activeElement.blur();
  for(const s of ['scrTitle','scrBrief','scrPause','scrEnd'])$(s).hidden=s!==id;
  $('hud').hidden=!(G.phase==='play');
  const chatOn=mode==='online'&&['brief','play','end'].includes(G.phase);$('chat').hidden=!chatOn;if(!chatOn&&chatOpen)closeChat();
}
let readyG=false,readyS=false;
function updateReady(){
  for(const [id,r,key,on] of [['readyG','g','Space',readyG],['readyS','s','Enter',readyS]]){
    const el=$(id);el.classList.toggle('on',on);el.textContent='';
    const who=cleanName($(r==='g'?'nameG':'nameS').value)||ROLE[r];
    if(on)el.append(who+' is ready');else{el.append(who+': press ');const k=document.createElement('kbd');k.textContent=key;el.append(k,' when ready');}
  }
  if(mode==='local'&&readyG&&readyS&&G.phase==='brief')startPlay();
}
for(const id of ['nameG','nameS','nameIn'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();if(id==='nameIn')$('nameIn').dispatchEvent(new Event('change'));}});
$('nameG').addEventListener('input',updateReady);$('nameS').addEventListener('input',updateReady);
function openBrief(){
  G.phase='brief';readyG=readyS=false;
  fillKeys($('keysG'),'g');fillKeys($('keysS'),'s');
  const online=mode==='online';
  $('lobbyInfo').hidden=!online;$('readyRow').hidden=online;$('lobbyText').hidden=!online;$('tipChat').hidden=!online;
  $('nameGWrap').hidden=online;$('nameSWrap').hidden=online;
  if(!online){if(!$('nameG').value)$('nameG').value=recall('bs_nameG');if(!$('nameS').value)$('nameS').value=recall('bs_nameS');}
  $('briefEyebrow').textContent=online?'Online room':'Before you set out';
  updateWho();
  $('bBegin').hidden=online&&role!=='host';
  updateReady();show('scrBrief');
}
function updateWho(){
  if(mode==='online'){const other=myRole==='g'?'s':'g';
    $(myRole==='g'?'whoG':'whoS').textContent=(myName||'You')+' (you)';
    $(other==='g'?'whoG':'whoS').textContent=partnerName?partnerName:'waiting for partner…';}
  else{$('whoG').textContent='left hand';$('whoS').textContent='right hand';}
}
function startPlay(){
  if(mode!=='online'||role==='host'){resetLevel();}
  if(mode==='local'){names.g=cleanName($('nameG').value);names.s=cleanName($('nameS').value);store('bs_nameG',names.g);store('bs_nameS',names.s);}
  else{names[myRole]=myName;names[myRole==='g'?'s':'g']=partnerName;}
  G.phase='play';G.paused=false;resetWatch();hudCache={};camYaw=camYawT=0;
  fillKeys($('ckeysG'),'g');fillKeys($('ckeysS'),'s');fillKeys($('pkeysG'),'g');fillKeys($('pkeysS'),'s');
  const online=mode==='online';
  $('cardG').hidden=online&&myRole!=='g';$('cardS').hidden=online&&myRole!=='s';
  $('cardG').classList.toggle('solo',online);$('cardS').classList.toggle('solo',online);
  refreshNames();show(null);camSnap=true;
}
function togglePause(){
  if(G.phase!=='play')return;
  if(chatOpen){closeChat();return;}
  const open=$('scrPause').hidden;
  if(open){G.paused=mode==='local';$('pauseEyebrow').textContent=mode==='local'?'Paused':'Menu (the game keeps running online)';$('pauseObj').textContent=objectiveText();$('bRestart').hidden=mode==='online'&&role!=='host';$('scrPause').hidden=false;}
  else{G.paused=false;$('scrPause').hidden=true;}
}
function toTitle(){if(mode==='online')leaveOnline();mode=null;G.phase='title';G.paused=false;clearChat();partnerName='';partnerHere=false;names.g=names.s='';show('scrTitle');}
function showEnd(){
  const dl=$('endStats');dl.textContent='';const m=Math.floor(G.time/60),s=Math.floor(G.time%60);
  const add=(a,b)=>{const dt=document.createElement('dt');dt.textContent=a;const dd=document.createElement('dd');dd.textContent=b;dl.append(dt,dd);};
  add('Time',m+' min '+s+' s');add('Rune stones','3 of 3');add(nameOf('s')+' thrown',G.throws+' times');add('Falls into the ravine',String(G.falls));
  $('endLede').textContent=nameOf('g')+' and '+nameOf('s')+' woke the fountain together. Water runs through the garden again.';
  $('bAgain').hidden=mode==='online'&&role!=='host';show('scrEnd');
}
$('bLocal').onclick=()=>{initAudio();mode='local';myRole='g';role=null;clearChat();resetLevel();openBrief();};
$('bOnline').onclick=()=>{initAudio();const box=$('onlineBox');box.hidden=!box.hidden;if(!box.hidden&&!$('nameIn').value)$('nameIn').focus();};
function netWorking(on,msg){netBusy=on;setNetReady();if(msg)$('netNote').textContent=msg;}
function takeName(){myName=cleanName($('nameIn').value);if(!myName){$('netNote').textContent='Type your name first, so your partner knows who joined.';$('nameIn').focus();return false;}store('bs_name',myName);return true;}
const host=async r=>{if(!netOk()||netBusy||!takeName())return;initAudio();netWorking(true,'Creating a room…');mode='online';role='host';myRole=r;partnerName='';clearChat();
  let ok=false;for(let i=0;i<4&&ok!==true;i++){code=randCode();ok=await enterRoom();}
  if(ok!==true){mode=null;role=null;netWorking(false,'Could not create a room. Check the internet connection and try again.');return;}
  netWorking(false);$('lobbyCode').textContent=code;resetLevel();openBrief();};
$('bHostG').onclick=()=>host('g');$('bHostS').onclick=()=>host('s');
$('bJoin').onclick=async()=>{if(!netOk()||netBusy||!takeName())return;initAudio();const c=$('codeIn').value.toUpperCase().replace(/[^A-Z]/g,'');if(c.length!==4){$('netNote').textContent='Room codes are 4 letters. Check the code your partner sent.';return;}
  netWorking(true,'Connecting…');mode='online';role='guest';myRole='s';code=c;partnerName='';clearChat();const ok=await enterRoom();
  if(ok!==true){mode=null;role=null;netWorking(false,'Could not connect. Check the internet connection and try again.');return;}
  netWorking(false);$('lobbyCode').textContent=code;resetLevel();openBrief();};
$('codeIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('bJoin').click();});
$('bBegin').onclick=()=>{initAudio();if(mode==='local')startPlay();else if(role==='host'&&findPartner())startPlay();};
$('bBriefBack').onclick=toTitle;
$('bResume').onclick=togglePause;
$('bRestart').onclick=()=>{$('scrPause').hidden=true;resetLevel();G.paused=false;resetWatch();};
$('bMute').onclick=()=>setMuted(!muted);
$('bQuit').onclick=()=>{$('scrPause').hidden=true;toTitle();};
$('bAgain').onclick=()=>{startPlay();};
$('bEndMenu').onclick=toTitle;
let partnerHere=false;
function notePartner(p){
  const here=!!p;names[myRole]=myName;
  if(here){const n=cleanName(p.presence.nm)||ROLE[myRole==='g'?'s':'g'];if(n!==partnerName){partnerName=n;names[myRole==='g'?'s':'g']=n;refreshNames();updateWho();}}
  if(here!==partnerHere){partnerHere=here;if(here)addChatLine(null,role==='host'?partnerName+' joined the room':'You joined '+partnerName+'\u2019s room',true);else if(partnerName)addChatLine(null,partnerName+' left or lost connection',true);updateWho();}
}
function lobbyTick(){
  if(G.phase!=='brief'||mode!=='online')return;
  const p=findPartner();const other=myRole==='g'?'Sprite':'Giant';
  if(role==='host'){$('bBegin').disabled=!p;$('lobbyText').textContent=p?(partnerName+' is here and plays the '+other+'. Press Begin when you have both read the controls.'):'Send this code to your partner. They choose Play online, type their name and the code, and press Join room.';}
  else{$('lobbyText').textContent=p?('Connected to '+partnerName+'. Waiting for them to press Begin. You play the '+(myRole==='g'?'Giant':'Sprite')+'.'):'Looking for room '+code+'. Ask your partner to create the room first, and check the code.';}
}

// ================= main loop =================
let last=performance.now(),acc=0;const STEP=1/60;
function frame(now){requestAnimationFrame(frame);tick(now);}
function tick(now){
  const dt=clamp((now-last)/1000,0,.05);last=now;const t=now/1000;
  netPaused=false;
  if(mode==='online'&&R){
    const p=findPartner();if(p){lastSeen=now;partnerSeenEver=true;}
    notePartner(p);if(p)receiveChat(p.presence);
    if(role==='host'){
      const pin=partnerInput(p);
      if(G.phase==='play'&&!G.paused){
        netPaused=now-lastSeen>2500;
        if(!netPaused){acc+=dt;let first=true;while(acc>=STEP){const me=edge(edgeMe,rawOnline());const mine=first?me:Object.assign({},me,{jumpP:0,actP:0});const theirs=first?pin:Object.assign({},pin,{jumpP:0,actP:0});
          if(myRole==='g')stepSim(STEP,mine,theirs);else stepSim(STEP,theirs,mine);acc-=STEP;first=false;}} else acc=0;
      }
      R.presence({c:code,r:'h',hr:myRole,st:packState(),nm:myName,cn:chatNonce,ch:myChat}).catch(()=>{});
    } else {
      if(p&&p.presence!==lastPartnerPres){lastPartnerPres=p.presence;const nr=p.presence.hr==='s'?'g':'s';if(nr!==myRole){myRole=nr;updateWho();refreshNames();}
        const was=G.phase;applyState(p.presence.st);
        if(was!=='play'&&G.phase==='play')startPlay();}
      if(G.phase==='play'){guestSmooth(dt);netPaused=partnerSeenEver&&now-lastSeen>2500;}
      pushGuest(now);
    }
    lobbyTick();
  } else if(mode==='local'&&G.phase==='play'&&!G.paused){
    acc+=dt;let first=true;while(acc>=STEP){const ig=edge(edgeG,rawLocal('g')),is=edge(edgeS,rawLocal('s'));
      if(!first){ig.jumpP=ig.actP=0;is.jumpP=is.actP=0;}stepSim(STEP,ig,is);acc-=STEP;first=false;}
  } else acc=0;
  if(G.phase==='play'){
    runWatchers();updateHUD(dt);
    if(netPaused&&$('scrPause').hidden){$('pauseEyebrow').textContent='Waiting';$('pauseObj').textContent=(partnerName||'Your partner')+' disconnected. The game continues as soon as they are back in room '+code+'.';$('scrPause').hidden=false;}
    if(!netPaused&&mode==='online'&&$('pauseEyebrow').textContent==='Waiting'){$('scrPause').hidden=true;$('pauseEyebrow').textContent='Menu';}
  }
  if(G.phase==='end'&&$('scrEnd').hidden){$('hud').hidden=true;showEnd();}
  if(mode==='online'&&role==='guest'&&G.phase==='brief'&&!$('scrEnd').hidden){openBrief();}
  updateCamera(dt,t);
  if(G.phase!=='loading'){updateVisuals(dt,t);updateParticles(dt);updateAudio(dt);updateFades(dt);}
  updateOverlay();updateChat(dt);
  renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else if(!muted)AC.resume();});

// ================= boot =================
async function boot(){
  try{buildTextures();buildMaterials();}catch(e){console.error(e);fail('Something went wrong while preparing the garden: '+e.message);return;}
  $('loadText').textContent='Waking the Giant and the Sprite…';
  try{const L=new GLTFLoader();const [a,b]=await Promise.all([L.loadAsync('assets/Barbarian.glb'),L.loadAsync('assets/Rogue_Hooded.glb')]);MODELS={giant:a,sprite:b};}
  catch(e){console.warn('Character models could not load, using simple shapes.',e);MODELS=null;}
  try{buildWorld();buildInteractives();buildGolem();buildSprite();initAmbientParticles();resetLevel();}
  catch(e){console.error(e);fail('Something went wrong while building the garden: '+e.message);return;}
  try{renderer.compile(scene,camera);}catch(e){}
  $('loading').hidden=true;G.phase='title';show('scrTitle');
  $('nameIn').value=recall('bs_name');
  if(matchMedia('(pointer: coarse)').matches&&!matchMedia('(pointer: fine)').matches){$('netNote').textContent='This game needs a keyboard. On a phone or tablet it can only be watched.';}
  requestAnimationFrame(t=>{last=t;frame(t);});
}
// small debug handle used by automated tests
window.__bs={G,golem,sprite,get block(){return block;},runes,gate,bridge,port,plates,levers,get crank(){return crank;},latch,stepSim,resetLevel,startLocal:()=>{mode='local';resetLevel();startPlay();},NOIN,W,fadeables,camera,
  get camYaw(){return camYaw;},rotateCam,set dbgDist(v){dbgDist=v;},advance:(sec)=>{let n=performance.now();for(let i=0;i<sec*60;i++){n+=1000/60;tick(n);}},get models(){return MODELS;}};
boot();

})();
