// Big & Small. Built from dev/src/*.js by dev/build.sh. Three.js r149 (ES modules), characters and props modelled in Blender with Poly Haven textures (CC0).
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {Water} from 'three/addons/objects/Water.js';
(() => {
"use strict";
THREE.ColorManagement.legacyMode=false; // colours are authored in sRGB and lit in linear space
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
renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.NoToneMapping;
const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const scene=new THREE.Scene();
let ROOT=scene; // where world-building helpers add meshes (each region builds into its own group)
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
  M.crack=lam({map:crackTexture()});
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
    mesh.castShadow=opt.cast!==false;mesh.receiveShadow=true;(opt.parent||ROOT).add(mesh);
    if(opt.fade||(opt.fade!==false&&!opt.parent&&y1-y0>1.1))markFade(mesh,opt.linked);}
  if(opt.collide===false) return {mesh};
  const c={min:new V3(x0,y0,z0),max:new V3(x1,y1,z1),kind:opt.kind||'static',on:true,mesh,surface:opt.surface||surfaceOf(mat)};
  colliders.push(c);return c;
}
const invis=(xa,xb,ya,yb,za,zb)=>box(xa,xb,ya,yb,za,zb,null);
// footstep surface for a material
function surfaceOf(m){if(!m)return 'stone';if(m===M.ground||m===M.cliffTop||m===M.tuft)return 'grass';if(m===M.wood||m===M.woodPH)return 'wood';return 'stone';}
// a wall: sandstone body plus a lighter cap that overhangs a little (reads clearly from above)
function wall(xa,xb,za,zb,h,extend){
  const cap=box(Math.min(xa,xb)-.06,Math.max(xa,xb)+.06,h,h+.16,Math.min(za,zb)-.06,Math.max(za,zb)+.06,M.wallTop,{collide:false,fade:false}).mesh;
  const c=box(xa,xb,0,h,za,zb,M.wall,{linked:[cap]});
  if(extend!==false)invis(xa,xb,h,14,za,zb);
  return c;
}
function floorSlab(xa,xb,za,zb,mat,deep){if(CH1R.on&&mat===M.ground)CH1R.grassRects.push([xa,xb,za,zb]);box(xa,xb,-0.4,0,za,zb,mat,{cast:false,fade:false});box(xa,xb,deep?-12:-2,-0.4,za,zb,deep?M.cliff:mat,{cast:false,fade:false});}

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
  const m=new THREE.Mesh(CH1R.on?realRockGeo(s,s*.65,s*.85,seed):lowPoly(s,s*.65,s*.85,0,seed*13,.35),mat||M.rock);m.position.set(x,y,z);m.rotation.y=seed;m.castShadow=true;m.receiveShadow=true;ROOT.add(m);
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
  if(!CH1R.on){const plant=new THREE.Mesh(lowPoly(.3*s,.22*s,.3*s,0,x*7+z,.3),M.leaf2);plant.position.set(x,.95*s,z);plant.castShadow=true;ROOT.add(plant);}
  box(x-.35*s,x+.35*s,0,.9*s,z-.35*s,z+.35*s,null);
}
function addTree(x,z,s,seed){
  if(CH1R.on){CH1R.trees.push([x,z,.3+s*.18]);return;}
  const h=2.4*s,trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.26*s,h,6),M.bark);trunk.position.set(x,h/2,z);trunk.castShadow=true;ROOT.add(trunk);
  const parts=[];const n=2+Math.floor(hash2(seed,1,7)*2);
  for(let i=0;i<n;i++){const a=hash2(seed,i,8)*6.28,r=i?(.6+hash2(seed,i,9)*.5)*s:0,fs=(i?1.0:1.35)*s*(.9+hash2(seed,i,10)*.3);
    const f=new THREE.Mesh(lowPoly(fs,fs*.85,fs,1,seed*31+i,.18),[M.leaf,M.leaf2,M.leafDark][(seed+i)%3]);
    f.position.set(x+Math.cos(a)*r,h+fs*.5+(i?-.2:.3)*s,z+Math.sin(a)*r);f.castShadow=true;f.receiveShadow=true;ROOT.add(f);parts.push(f);}
  markFade(parts[0],[trunk,...parts.slice(1)]);
}
function addCypress(x,z,s,seed){
  if(CH1R.on){CH1R.trees.push([x,z,.26+s*.16]);return;}
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12*s,.18*s,1.0*s,6),M.bark);trunk.position.set(x,.5*s,z);ROOT.add(trunk);
  const f=new THREE.Mesh(lowPoly(.85*s,2.8*s,.85*s,1,seed*17,.12),M.leafDark);f.position.set(x,3.4*s,z);f.castShadow=true;ROOT.add(f);
  markFade(f,[trunk]);
}
function addBush(x,z,s,seed){if(CH1R.on)return;const b=new THREE.Mesh(lowPoly(.7*s,.5*s,.7*s,0,seed*11,.3),seed%2?M.leaf:M.leaf2);b.position.set(x,.3*s,z);b.castShadow=true;b.receiveShadow=true;ROOT.add(b);}

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
function inPlayZone(x,z,m){return (x>11-m&&x<41+m&&z<5+m&&z>-24-m)||(x>-41-m&&x<-11+m&&z<-43.5+m&&z>-66.5-m)||(x>ORCH.x0-1-m&&x<ORCH.x1+m&&z>ORCH.z0-m&&z<-23+m);}
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
  W.hemi=new THREE.HemisphereLight('#e3f0ff','#7f9a6a',0.62);scene.add(W.hemi);
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
  if(!CH1R.on)for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=140+hash2(i,1,2)*40,s=35+hash2(i,3,4)*30;const m=new THREE.Mesh(lowPoly(s,s*.32,s,1,i,.1),i%2?M.leaf:M.leaf2);m.position.set(Math.cos(a)*r,-3,-40+Math.sin(a)*r);ROOT.add(m);}

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
  addTree(-16,-38,1.4,7);addCypress(-44,-48,1.2,10);addTree(-20,-20,1.3,11);addTree(21,-27.5,1.2,12);
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
  addCypress(-15,-70,1.4,13);addTree(-17,-86,1.6,15);addTree(17,-88,1.6,16);addTree(0,-92,1.7,17);addCypress(-6,-90,1.5,18);addCypress(7,-91,1.5,19);
  for(let i=0;i<22;i++){const side=i%2?1:-1,x=side*(24+hash2(i,1,99)*40),z=10-hash2(i,2,99)*110;if((z<-25&&z>-35)||inPlayZone(x,z,3))continue;(i%3?addTree:addCypress)(x,z,1.1+hash2(i,3,99)*.6,40+i);}
  for(let i=0;i<30;i++){const side=i%2?1:-1,x=side*(13+hash2(i,5,98)*12),z=8-hash2(i,6,98)*100;if((z<-25&&z>-35)||inPlayZone(x,z,1))continue;addBush(x,z,.8+hash2(i,7,98)*.8,i);}
  if(!CH1R.on)buildTufts();
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

// ================= saved progress & settings =================
// One save per laptop. Online, the host's save is the one that counts; the guest mirrors it while playing.
const SAVE_KEY='bs_save_v1';
const DEFAULT_SETTINGS={music:.55,sfx:.8,camMotion:'full',reduceFlash:false,shake:false};
function freshProgress(){return {v:1,roots:0,ws:{vale_meadow:1},seeds:{},petals:{},secrets:{},planted:0,seen:{},ch1:{done:0,best:0},ch2:{done:0,best:0,lan:0,door:0},settings:Object.assign({},DEFAULT_SETTINGS)};}
let PROG=freshProgress();
function loadProgress(){try{const t=localStorage.getItem(SAVE_KEY);if(!t)return;const o=JSON.parse(t);if(!o||o.v!==1)return;
  const f=freshProgress();PROG=Object.assign(f,o);PROG.settings=Object.assign({},DEFAULT_SETTINGS,o.settings||{});PROG.ch1=Object.assign(f.ch1,o.ch1||{});PROG.ch2=Object.assign(f.ch2,o.ch2||{});}catch(e){}}
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
    fog:o.fog||[70,190],fogReal:o.fogReal||null,spawn:o.spawn,secrets:o.secrets||[],talk:o.talk||[],chapter:o.chapter||0,dark:o.dark||null};
  r.group.visible=false;r.group.name='region-'+id;scene.add(r.group);REG[id]=r;ROOT=r.group;colliders.length=0;fadeables.length=0;return r;
}
function endRegion(r){r.colliders=colliders.slice();r.fadeables=fadeables.slice();colliders.length=0;fadeables.length=0;ROOT=scene;}
function enterRegion(id){
  const r=REG[id];if(!r)return;
  for(const k in REG)REG[k].group.visible=k===id;
  curReg=r;G.region=id;
  colliders.length=0;colliders.push(...r.colliders,golem.col);
  fadeables.length=0;fadeables.push(...r.fadeables);
  const fg=REAL.ready&&r.fogReal?r.fogReal:r.fog;scene.fog.near=fg[0];scene.fog.far=fg[1];camSnap=true;applyLook(r);
  for(const b of [golem,sprite]){b.safe=null;b.winding=false;}
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
  const g=prop('waystone',true);if(REAL.ready)realifyProp(g);g.position.set(x,y,z);g.rotation.y=rotY||0;ROOT.add(g);
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
function chapterOpens(n){return n===2;}
function gateReady(n){return n===1||(n===2&&!!PROG.ch1.done);}
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
  buildValeLamps();
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
  updateValeLamps(dt);
  for(const g of GATES){g.ready=gateReady(g.ch);const ready=g.ready;g.bar.on=!ready;if(g.labOpen){g.labOpen.visible=ready;g.lab.visible=!ready;}
    const flicker=!ready&&g.ch===PROG.roots+1; // the next sealed gate flickers faintly
    g.veil.visible=ready||flicker;if(ready)g.veil.material.opacity=PROG.settings.reduceFlash?.3:.26+.1*Math.sin(t*1.6);
    else if(flicker)g.veil.material.opacity=PROG.settings.reduceFlash?.08:.05+.06*Math.max(0,Math.sin(t*2.3)*Math.sin(t*.7));
    for(const k of g.key){k.material.emissiveIntensity=ready?1.2:.05;k.material.color.set(ready?'#2fd6c0':'#6f7d82');}}
  if(!PROG.settings.reduceFlash&&Math.random()<dt*6){const gg=GATES[0];emit(gg.pos.x+(Math.random()-.5)*5,gg.pos.y+Math.random()*7,gg.pos.z+(Math.random()-.5)*.6,0,.4,0,.5,1,.85,.12,1.6,0,.3);}
}

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
  // the golden sun in the pavilion floor and its rays
  for(let j=0;j<C.nz;j++)for(let i=0;i<C.nx;i++){const x=C.x0+(i+.5)*C.cell,z=C.z0+(j+.5)*C.cell;if(Math.hypot(x-pav.cx,z-pav.cz)<2.7)mk[j*C.nx+i]=0;}
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

// ================= Chapter 1: the upper terrace and the Hanging Orchard =================
// A raised orchard north of the ravine, east of the main garden. The way up: the Sprite reaches the hidden
// balcony with a ground-pound seesaw launch and pulls a lever that raises a stone stair for the Giant; from the
// balcony an old aqueduct walk crosses the ravine to the orchard. Up there: a belvedere tower (a landmark you can
// see from the whole garden), a waystone, and an optional throw puzzle that opens the Sun Pavilion. Inside the
// pavilion, both standing on the sun together call down the morning light and the Giant is crowned with sun-flowers
// (the secret, and a crown the Giant keeps wearing everywhere).
const ORCH={x0:12,x1:44,z0:-80,z1:-36,y:4.94};
const TOWER={x0:34,x1:40,z0:-73,z1:-67,h:10.5,ledge:{x0:32.5,x1:34,z0:-71.6,z1:-68.4,y:3.9}};
const PAV={x0:15,x1:25,z0:-77,z1:-67,h:2.3,door:{x0:18.8,x1:21.2}};
const stair={raised:false,t:0,steps:[]};
const pav={open:false,t:0,door:null,lit:false,hold:0,glow:0,cx:20,cz:-72};
const ORCH_TREES=[];
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
  for(const x of [26.3,29.2])box(x,x+.5,Y,7.4,-22.7,-23.5,M.stone,{fade:true});

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
  // the sun: a gold disc set in the floor with rays; a shaft of light comes down when both stand on it
  const cx=pav.cx,cz=pav.cz;
  const sun=new THREE.Mesh(new THREE.CircleGeometry(1.5,32),new THREE.MeshStandardMaterial({color:'#e9b949',emissive:'#f2a43a',emissiveIntensity:.25,roughness:.35,metalness:.6}));
  sun.rotation.x=-Math.PI/2;sun.position.set(cx,Y+.03,cz);ROOT.add(sun);pav.sun=sun;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=new THREE.Mesh(new THREE.PlaneGeometry(.22,i%2?.9:1.5),sun.material);r.rotation.x=-Math.PI/2;r.rotation.z=-a;
    const d=1.5+(i%2?.5:.8);r.position.set(cx+Math.sin(a)*d,Y+.025,cz+Math.cos(a)*d);ROOT.add(r);}
  const cv=document.createElement('canvas');cv.width=4;cv.height=64;const cx2=cv.getContext('2d'),gr=cx2.createLinearGradient(0,0,0,64);
  gr.addColorStop(0,'#000');gr.addColorStop(.55,'#8c8c8c');gr.addColorStop(1,'#fff');cx2.fillStyle=gr;cx2.fillRect(0,0,4,64);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.55,16,32,1,true),new THREE.MeshBasicMaterial({color:'#ffe2a0',alphaMap:new THREE.CanvasTexture(cv),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  shaft.position.set(cx,Y+8,cz);shaft.visible=false;ROOT.add(shaft);pav.shaft=shaft;
  // an old carved tablet on the back wall hints at what to do
  const tab=labelSprite('Two who stand in the sun','are crowned by the morning','#8a6448');tab.scale.set(3.8,1.18,1);tab.position.set(cx,Y+1.7,P.z0+.6);ROOT.add(tab);pav.tablet=tab;
  for(const [x,z] of [[P.x0+1.2,P.z0+1.2],[P.x1-1.2,P.z0+1.2]])addUrnAt(x,Y,z,1.1);

  // ---------- orchard trees, a bench, the waystone ----------
  // two orchard blocks either side of a clear walk from the aqueduct to the tower; small trees in rows
  const rows=[];for(const x0 of [15,34])for(let i=0;i<2;i++)for(let j=0;j<3;j++){const x=x0+i*6+(j%2)*1.5,z=-44-j*7.5;rows.push([x,z]);}
  // small fruit trees (about 3 m) so the camera sees over them
  for(const [x,z] of rows)orchardTree(x,z,.14+hash2(x|0,z|0,71)*.025);
  for(const [x,z] of [[42,-77],[14.5,-62],[42,-62]])orchardTree(x,z,.18+hash2(x|0,z|0,72)*.03);
  orchardFruit();
  box(36,39,Y,Y+.45,-45.2,-46,M.wood,{fade:false,surface:'wood'});
  addWaystone('ch1_orchard','Hanging Orchard',30.5,Y,-41.5,0);

  // ---------- collectibles ----------
  [[28,Y,-29],[28,Y,-33.6],[17.5,Y,-38.6],[40,Y,-39.5],[22,Y,-53],[36,Y,-57],[14.5,Y,-78],[33.3,Y+L.y,-68.9],[33.3,Y+L.y,-71.1],[20,Y,-72]]
    .forEach(([x,y,z],i)=>addSeed('c1o'+i,x,y,z));
}
// a tree on the plateau (realistic Jacaranda when the real assets loaded, else a simple tree raised to the plateau)
function orchardTree(x,z,s){ORCH_TREES.push([x,z,s]);
  if(CH1R.on){CH1R.trees.push([x,z,s]);return;}
  const g=new THREE.Group();g.position.y=ORCH.y;ROOT.add(g);const R0=ROOT;ROOT=g;addTree(x,z,s*2.6,(x*7+z)|0);ROOT=R0;
}
// apricots hanging in the orchard trees' crowns
function orchardFruit(){
  const n=ORCH_TREES.length*14,im=new THREE.InstancedMesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshStandardMaterial({color:'#e8862e',roughness:.55,emissive:'#5a2208',emissiveIntensity:.25}),n);
  const m4=new THREE.Matrix4(),col=new THREE.Color();let k=0;
  ORCH_TREES.forEach(([x,z,s],i)=>{for(let j=0;j<14;j++){const a=hash2(i,j,73)*6.283,r=(.35+hash2(i,j,74)*.5)*11*s,h=(CH1R.on?7+hash2(i,j,75)*7:3.2+hash2(i,j,75)*1.6)*s*(CH1R.on?1:2.6);
    m4.makeTranslation(x+Math.cos(a)*r,ORCH.y+h,z+Math.sin(a)*r);im.setMatrixAt(k,m4);im.setColorAt(k,col.setHSL(.06+hash2(i,j,76)*.04,.8,.5+hash2(i,j,77)*.1));k++;}});
  ROOT.add(im);}
function addUrnAt(x,y,z,s){const g=new THREE.Group();g.position.y=y;ROOT.add(g);const R0=ROOT;ROOT=g;addUrn(x,z,s);ROOT=R0;
  // addUrn's collider was made at floor level: lift it with the group
  const c=colliders[colliders.length-1];c.min.y+=y;c.max.y+=y;}

// a block that rises under someone lifts them onto its top instead of trapping them inside it
function liftOnto(c){for(const b of [golem,sprite]){if(b.held)continue;if(ov(b,c)){b.pos.y=c.max.y+.01;b.vel.y=0;if(b===golem)syncGolemCol();}}}
// ---- per-step: the stair rises and the pavilion gate sinks once their levers are pulled ----
function stepOrchard(dt){
  stair.t=approach(stair.t,stair.raised?1:0,dt/2.6);for(const c of stair.steps){const on=stair.t>.96;if(on&&!c.on)liftOnto(c);c.on=on;}
  pav.t=approach(pav.t,pav.open?1:0,dt/1.8);if(pav.door)pav.door.on=pav.t<.5;
  // both on the sun together for a moment: the light comes down and the Giant is crowned
  if(pav.open&&!pav.lit&&dt>0){const on=b=>Math.hypot(b.pos.x-pav.cx,b.pos.z-pav.cz)<1.9&&b.pos.y>ORCH.y-.4&&b.pos.y<ORCH.y+3;
    pav.hold=on(golem)&&on(sprite)?pav.hold+dt:Math.max(0,pav.hold-dt*2);
    if(pav.hold>1.2){pav.lit=true;PROG.ch1.crown=1;saveSoon();if(!talked.c14){talked.c14=1;G.dlg='c14';G.dlgN++;}}}
}
function updateOrchardVis(){
  const k=smooth(0,1,stair.t);for(let i=0;i<stair.steps.length;i++){const c=stair.steps[i],kk=smooth(i/stair.steps.length*.5,.5+i/stair.steps.length*.5,k);c.mesh.position.y=c.top/2-(c.top+.05)*(1-kk);}
  if(pav.door&&pav.door.mesh)pav.door.mesh.position.y=ORCH.y+PAV.h/2-PAV.h*smooth(0,1,pav.t);
  if(pav.sun){const dt=1/60,was=pav.glow;pav.glow=approach(pav.glow,pav.lit?1:0,dt/1.4);
    const pulse=PROG.settings.reduceFlash?0:.08*Math.sin(performance.now()/500);
    pav.sun.material.emissiveIntensity=.25+(pav.open?.15*smooth(0,1.2,pav.hold)+pulse*(pav.lit?0:1)*(pav.open?1:0):0)+pav.glow*.9;
    pav.shaft.visible=pav.glow>0||pav.hold>0;pav.shaft.material.opacity=Math.max(pav.glow*.2,smooth(0,1.2,pav.hold)*.14);
    if(was<.02&&pav.glow>=.02)sparkle({x:pav.cx,y:ORCH.y+.2,z:pav.cz},40);
    if(pav.glow>.3&&Math.random()<.25)sparkle({x:pav.cx+(Math.random()-.5)*2,y:ORCH.y+.2,z:pav.cz+(Math.random()-.5)*2},1);}
}
// ---- the sun-flower crown: once earned, the Giant wears it everywhere (online too: it follows pav.lit) ----
const CROWN={m:null,head:null,rel:null,_q:new THREE.Quaternion(),_p:new V3(),_o:new V3()};
function makeCrown(){
  let head=null;golem.root.traverse(o=>{if(o.isBone&&o.name==='head')head=o;});if(!head)return;
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.05,8,28),new THREE.MeshStandardMaterial({color:'#4f6b2a',roughness:.8}));ring.rotation.x=Math.PI/2;g.add(ring);
  const leaf=new THREE.MeshStandardMaterial({color:'#6f8f36',roughness:.7,side:THREE.DoubleSide}),pet=new THREE.MeshStandardMaterial({color:'#f6c33b',emissive:'#a8620a',emissiveIntensity:.35,roughness:.5}),mid=new THREE.MeshStandardMaterial({color:'#7a3f12',roughness:.8});
  // nine flowers, drawn as three instanced meshes (petals, centres, leaves) so the crown costs four draw calls
  const P=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,6,4),pet,54),Cn=new THREE.InstancedMesh(new THREE.SphereGeometry(.04,6,4),mid,9),Lf=new THREE.InstancedMesh(new THREE.PlaneGeometry(.09,.18),leaf,9);
  const fm=new THREE.Object3D(),pm=new THREE.Object3D();fm.add(pm);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;fm.position.set(Math.cos(a)*.34,.04,Math.sin(a)*.34);fm.rotation.set(0,-a,.5);
    for(let j=0;j<6;j++){const b=j/6*Math.PI*2;pm.position.set(0,Math.cos(b)*.07,Math.sin(b)*.07);pm.rotation.set(b,0,0);pm.scale.set(1,.35,.6);fm.updateMatrixWorld(true);P.setMatrixAt(i*6+j,pm.matrixWorld);}
    pm.position.set(.02,0,0);pm.rotation.set(0,0,0);pm.scale.set(1,1,1);fm.updateMatrixWorld(true);Cn.setMatrixAt(i,pm.matrixWorld);
    pm.position.set(0,-.02,.1);pm.rotation.set(.3,.9,0);fm.updateMatrixWorld(true);Lf.setMatrixAt(i,pm.matrixWorld);}
  for(const m of [P,Cn,Lf])m.frustumCulled=false; // instances sit round the ring, away from each mesh's own bounds
  g.add(P,Cn,Lf);
  g.visible=false;scene.add(g);
  // the head's resting turn relative to the body, so the crown sits level and turns with the head
  golem.root.updateMatrixWorld(true);const hq=head.getWorldQuaternion(new THREE.Quaternion()),rq=golem.root.getWorldQuaternion(new THREE.Quaternion());
  CROWN.rel=rq.invert().multiply(hq).invert();CROWN.m=g;CROWN.head=head;
}
function updateCrown(){
  if(!CROWN.m){if(!golem.model||CROWN.none)return;makeCrown();if(!CROWN.m){CROWN.none=true;return;}}
  const C=CROWN,show=pav.lit&&golem.root.visible&&G.phase!=='title';C.m.visible=show;if(!show)return;
  C.head.getWorldPosition(C._p);C.head.getWorldQuaternion(C._q).multiply(C.rel);
  C.m.quaternion.copy(C._q);C.m.position.copy(C._p).add(C._o.set(0,.42,-.02).applyQuaternion(C._q));
  const s=smooth(0,1,pav.glow||1);C.m.scale.setScalar(.6+.4*s);
}
function resetOrchard(){
  stair.raised=!!PROG.ch1.stair;stair.t=stair.raised?1:0;pav.open=!!PROG.ch1.pav;pav.t=pav.open?1:0;
  pav.lit=!!PROG.ch1.crown;pav.glow=+pav.lit;pav.hold=0;
  for(const l of levers){if(l.id==='stair'){l.pulled=stair.raised;l.t=+stair.raised;}if(l.id==='pavilion'){l.pulled=pav.open;l.t=+pav.open;}}
  stepOrchard(0);updateOrchardVis();
}

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
    }else{ // three small clusters of pale quartz growing from the floor at the foot of the walls
      const qm=new THREE.MeshStandardMaterial({color:'#d8ecf2',emissive:'#7fb8c8',emissiveIntensity:.25,roughness:.25,metalness:0,transparent:true,opacity:.88});
      [[.4,1],[.65,-1],[.92,1]].forEach(([t,side],k)=>{const cx=lerp(m+d*3,e,t),cz=side<0?z0+.5:z1-.5;
        for(let j=0;j<4;j++){const h=.35+hash2(k,j,94)*.45,cm=new THREE.Mesh(new THREE.ConeGeometry(.09+hash2(k,j,95)*.06,h,5),qm);
          cm.position.set(cx+(hash2(k,j,96)-.5)*.6,f+h/2-.04,cz+(hash2(k,j,97)-.5)*.4);cm.rotation.set((hash2(k,j,98)-.5)*.7,hash2(k,j,99)*3,(hash2(k,j,93)-.5)*.7);ROOT.add(cm);}});}
    const lab=labelSprite(c.name,'Side cave','#8a6448');lab.scale.set(3.6,1.12,1);lab.position.set(m-d*1.5,f+7.6,c.z);ROOT.add(lab);
  }
  // ---------- Glow-worm Grotto: the door with a gap at the bottom ----------
  {const c=CAVES[0],G0=VCAVE.grotto,f=c.f,d=c.dir,x0=c.x+d*.6,x1=c.x+d*1.2,z0=c.z-c.w/2,z1=c.z+c.w/2;
    G0.door=box(x0,x1,f+.55,f+5.2,z0,z1,null,{kind:'door'});
    G0.slab=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1-x0),4.65,c.w),REAL.ready?caveStone():M.stone);G0.slab.position.set((x0+x1)/2,f+.55+2.325,c.z);G0.slab.castShadow=true;G0.slab.receiveShadow=true;ROOT.add(G0.slab);markFade(G0.slab);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#5ff3cf',transparent:true,depthWrite:false,opacity:.55}));glow.scale.set(c.w*.8,.7,1);glow.position.set((x0+x1)/2-d*.3,f+.3,c.z);ROOT.add(glow);G0.glow=glow;
    VLEVERS.push(makeValeLever(c.x+d*(c.len-1.6),c.z+2.2,f,'grotto'));
    addPetal('m4',c.x+d*(c.len-2.4),f,c.z-1.6);
    [[3.5,-2.5],[6.5,2.6],[9.5,-2.4],[12.5,1.2]].forEach(([a,b],i)=>addSeed('vc'+i,c.x+d*a,f,c.z+b));}
  // ---------- Echo Cave: the wall across the mouth and the steps a lever raises ----------
  {const c=CAVES[1],E=VCAVE.echo,f=c.f,d=c.dir,z0=c.z-c.w/2,z1=c.z+c.w/2,wx0=c.x+d*.6,wx1=c.x+d*1.8;
    box(wx0,wx1,f,f+2.6,z0,z1,REAL.ready?caveStone():M.wall,{fade:true,surface:'stone'});
    for(const side of [-1,1])for(let i=0;i<6;i++){ // outside (side -1) and inside (side 1), each climbing to the wall top
      const top=f+.44*(i+1),xa=side<0?wx0-d*(6.6-i*1.1):wx1+d*(6.6-i*1.1),xb=side<0?xa+d*1.1:xa-d*1.1;
      const s=box(xa,xb,f-.5,top,c.z-1.2,c.z+1.2,REAL.ready?caveStone():M.stone,{fade:true,surface:'stone'});s.on=false;s.top=top-f;s.base=f;E.steps.push(s);}
    VLEVERS.push(makeValeLever(c.x+d*(c.len-1.6),c.z-2.2,f,'echo'));
    addPetal('m5',c.x+d*(c.len-2.4),f,c.z+1.6);
    [[4,2.6],[7,-2.6],[10,2.4],[13,-1]].forEach(([a,b],i)=>addSeed('vc'+(4+i),c.x+d*a,f,c.z+b));}
}
function makeValeLever(x,z,y,id){const l=makeLever(x,z,0,id,y);l.vale=true;return l;}
let _caveStone=null;function caveStone(){return REAL.ready?(_caveStone||(_caveStone=stoneMat('caveStone','#e6dccb'))):M.stone;}
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

// ================= Chapter 2: The Lantern Mines =================
// Dark caverns under the eastern hills, lit only by lanterns and by the Sprite's light pulse (interact with nothing
// nearby). The route, south to north:
//  Mine Mouth (a crystal bridge over the first chasm) -> Cart Yard (the Sprite flips the track switch up on the
//  scaffold, the Giant pushes the cart and it smashes the barricade) -> Crystal Gallery (bridges hold only while
//  lit; a throw to the far island; lantern stone 1) -> pulley shaft (the Giant winds the Sprite up, she frees the
//  counterweight and winds the Giant up) -> High Drift (lantern stone 2 sets off a boulder: hide in the hollow) ->
//  Great Lantern hall (a hidden crystal path across a dark pit to stone 3; set the stones, lob the Sprite to the
//  top, pulse). Optional: the lamp room (crawl hole), the far crystal island (a throw), the crystal cellar (ground pound).
const MINE={pulseR:6,tileR:3.6,litT:8,liftH:6,driftY:6,boulderR:2.7,driftZ:-62.5};
const MCP={g:[-1.5,0,-1.5],s:[1.5,0,-1.5]};
const GL={x:-17,z:-70,top:4.0,x0:-18.2,x1:-15.8,z0:-71.2,z1:-68.8,sock:new V3(-17,0,-67)}; // the Great Lantern
const WINCH_B=new V3(61.5,0,-62.5),WINCH_T=new V3(50.2,6,-65.5);
const mine={pulseCD:0,fx:{t:9,x:0,y:0,z:0},lan:0,lift:null,cart:null,sw:{b:false,t:0},bar:{broken:false,col:null,g:null},
  boulder:{st:'idle',x:51.5,y:22,t:0,v:0,vy:0,rot:0,col:null,m:null},wall:{broken:false,col:null,g:null},door:{open:false,t:0,col:null,g:null},
  crack:{broken:false,col:null,mesh:null},placed:0,pool:[],glight:null,gcrystal:null,sockets:[],poolT:0,winchA:[0,0]};
const LANTERNS=[],CRYST=[],MLEVERS=[],LSTONES=[];
const MM={};
let SPRITE_LIGHT=null;
const inCh2=()=>G.region==='ch2';

function mineMats(){
  const R=REAL.ready,lam=c=>new THREE.MeshLambertMaterial({color:c});
  MM.rock=R?rockMat('mineRock','#8c8274'):lam('#6e665c');
  MM.floor=R?rockMat('mineFloor','#8a8070'):lam('#5f574e');
  MM.deep=R?rockMat('mineDeep','#5c544a'):lam('#433d37');
  TILE.set(MM.rock,4.5);TILE.set(MM.floor,3.2);TILE.set(MM.deep,5);
  MM.crystal=new THREE.MeshStandardMaterial({color:'#c9f6ff',emissive:'#58d6ff',emissiveIntensity:0,roughness:.15,metalness:0,transparent:true,opacity:.1,depthWrite:false});
  MM.edge=new THREE.LineBasicMaterial({color:'#8ff0ff',transparent:true,opacity:.3,depthWrite:false});
  MM.amber=new THREE.MeshStandardMaterial({color:'#ffd58a',emissive:'#ffad3d',emissiveIntensity:1.5,roughness:.3});
  MM.lanOff=new THREE.MeshStandardMaterial({color:'#6b747c',emissive:'#1a2a33',emissiveIntensity:.4,roughness:.35});
  MM.quartz=new THREE.MeshStandardMaterial({color:'#c4eef7',emissive:'#4fb4cf',emissiveIntensity:.5,roughness:.25});
}
// a floor with its top at y, plus a rock body below it (the visible side of a chasm)
function mfloor(xa,xb,za,zb,y,deep){y=y||0;box(xa,xb,y-.5,y,za,zb,MM.floor,{cast:false,fade:false,surface:'stone'});
  if(deep!==0)box(xa,xb,y-(deep||9),y-.5,za,zb,MM.deep,{cast:false,fade:false,collide:false});}
function mrock(xa,xb,y0,y1,za,zb,opt){return box(xa,xb,y0,y1,za,zb,MM.rock,Object.assign({cast:false,surface:'stone'},opt||{}));}

// ---------- rails, lanterns, crystals ----------
const _sleepers=[];
function railLine(pts){
  for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw);
    for(const o of [-.42,.42]){const m=new THREE.Mesh(new THREE.BoxGeometry(.07,.09,L+.04),M.iron);m.position.set((ax+bx)/2+nx*o,.08,(az+bz)/2+nz*o);m.rotation.y=yaw;ROOT.add(m);}
    for(let d=.3;d<L;d+=.72)_sleepers.push([ax+dx*d/L,az+dz*d/L,yaw]);}
}
function buildSleepers(){
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1.15,.06,.2),M.wood,_sleepers.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new V3(),sc=new V3(1,1,1);
  _sleepers.forEach(([x,z,y],i)=>{p.set(x,.03,z);q.setFromAxisAngle(_yAx,y);m4.compose(p,q,sc);im.setMatrixAt(i,m4);});im.receiveShadow=true;ROOT.add(im);_sleepers.length=0;
}
function addLantern(x,y,z){
  const i=LANTERNS.length,g=new THREE.Group();g.position.set(x,y,z);ROOT.add(g);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,2.3,8),M.wood);post.position.y=1.15;g.add(post);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.26,.22,4),M.iron);cap.position.y=2.62;cap.rotation.y=Math.PI/4;g.add(cap);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4,bar=new THREE.Mesh(new THREE.BoxGeometry(.03,.42,.03),M.iron);bar.position.set(Math.cos(a)*.17,2.32,Math.sin(a)*.17);g.add(bar);}
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.05,8),M.iron);base.position.y=2.1;g.add(base);
  const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.13),MM.lanOff);cr.scale.y=1.5;cr.position.y=2.32;g.add(cr);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffc46a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));glow.scale.set(2.2,2.2,1);glow.position.y=2.32;g.add(glow);
  box(x-.16,x+.16,y,y+2.3,z-.16,z+.16,null);
  LANTERNS.push({i,pos:new V3(x,y+2.32,z),g,cr,glow,k:0});
}
const lanLit=l=>(mine.lan>>l.i)&1;
// a crystal bridge or hidden tile: solid only while lit. anchors are the glowing posts a pulse must reach
// (tiles have none: a pulse near the tile itself lights it)
function addCrystal(kind,xa,xb,za,zb,y,anchors,r){
  const th=.28,col=box(xa,xb,y-th,y,za,zb,null,{kind:'bridge',surface:'stone'});col.on=false;
  const mat=MM.crystal.clone(),geo=new THREE.BoxGeometry(Math.abs(xb-xa),th,Math.abs(zb-za));
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set((xa+xb)/2,y-th/2,(za+zb)/2);mesh.renderOrder=2;ROOT.add(mesh);
  const em=new THREE.LineSegments(new THREE.EdgesGeometry(geo),MM.edge.clone());em.position.copy(mesh.position);em.renderOrder=2;ROOT.add(em);
  const pm=MM.crystal.clone();pm.transparent=false;pm.opacity=1;pm.depthWrite=true;pm.emissiveIntensity=.2;
  for(const [ax,az] of anchors||[]){const g=new THREE.Group();g.position.set(ax,y,az);ROOT.add(g);
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.9,6),M.iron);p.position.y=.45;g.add(p);
    for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(.1,.55-.12*k,5),pm);c.position.set((k-1)*.1,1.12-k*.06,(k%2)*.07);c.rotation.z=(k-1)*.35;g.add(c);}
    box(ax-.15,ax+.15,y,y+.9,az-.15,az+.15,null);}
  const anc=(anchors&&anchors.length?anchors:[[(xa+xb)/2,(za+zb)/2]]).map(([ax,az])=>new V3(ax,y,az));
  CRYST.push({kind,col,mesh,mat,em,pm,anchors:anc,r:r||MINE.pulseR,t:0,y});
}

// ---------- the mine cart and its tracks ----------
function polyline(pts){const segs=[];let L=0;for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],len=Math.hypot(bx-ax,bz-az);segs.push({ax,az,dx:(bx-ax)/len,dz:(bz-az)/len,len,s0:L});L+=len;}return {segs,len:L};}
function polyAt(P,s,o){s=clamp(s,0,P.len);let sg=P.segs[P.segs.length-1];for(const q of P.segs)if(s<=q.s0+q.len){sg=q;break;}const d=s-sg.s0;o.x=sg.ax+sg.dx*d;o.z=sg.az+sg.dz*d;o.tx=sg.dx;o.tz=sg.dz;return o;}
const CART_T0=[[4,-23],[4,-36]],CART_A=[[4,-36],[4,-44.2]],CART_B=[[4,-36],[4.4,-37.8],[5.6,-39.2],[7.3,-39.9],[9,-40],[37,-40]];
function cartMesh(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.15,.62,1.45),M.wood);body.position.y=.62;body.castShadow=true;g.add(body);
  for(const y of [.36,.88])for(const z of [-.74,.74]){const b=new THREE.Mesh(new THREE.BoxGeometry(1.2,.08,.05),M.iron);b.position.set(0,y,z);g.add(b);}
  const ore=new THREE.Mesh(REAL.ready?realRockGeo(.5,.28,.62,3):lowPoly(.5,.28,.62,0,7,.4),MM.deep);ore.position.y=.98;g.add(ore);
  const wheels=[];for(const x of [-.5,.5])for(const z of [-.45,.45]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.08,12),M.iron);w.rotation.z=Math.PI/2;w.position.set(x,.2,z);g.add(w);wheels.push(w);}
  g.userData.wheels=wheels;return g;
}
function buildCart(){
  const C={paths:[polyline(CART_T0.concat(CART_A.slice(1))),polyline(CART_T0.concat(CART_B.slice(1)))],sJ:13,s:0,v:0,br:-1,p:{x:4,z:-23,tx:0,tz:-1},moved:0,roll:0};
  C.aEnd=C.paths[0].len-.75;C.sEnd=C.paths[1].len-.75;
  const o={};C.sBar=C.sEnd;for(let s=C.sJ;s<C.sEnd;s+=.05){polyAt(C.paths[1],s,o);if(o.x+.66>=31){C.sBar=s;break;}}
  C.g=cartMesh();ROOT.add(C.g);
  C.col=box(0,1,0,1.1,0,1,null,{kind:'cart',surface:'wood'});
  mine.cart=C;syncCart();
  railLine(CART_T0);railLine(CART_A);railLine(CART_B);
  // bumpers at both track ends, a buffer at the start
  for(const [x,z,ax] of [[4,-44.6,'z'],[37.4,-40,'x']]){const w=ax==='z'?[1.2,.4]:[.4,1.2];box(x-w[0]/2,x+w[0]/2,0,.7,z-w[1]/2,z+w[1]/2,M.wood,{fade:false});}
  // the switch: a sign at the junction shows which way the points are set
  const sg=new THREE.Group();sg.position.set(2.3,0,-35.2);ROOT.add(sg);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.8,6),M.wood);post.position.y=.9;sg.add(post);
  const arrowC=document.createElement('canvas');arrowC.width=128;arrowC.height=64;const ac=arrowC.getContext('2d');ac.fillStyle='#f2c14e';ac.strokeStyle='#5a3c22';ac.lineWidth=5;
  ac.beginPath();ac.moveTo(8,22);ac.lineTo(80,22);ac.lineTo(80,6);ac.lineTo(120,32);ac.lineTo(80,58);ac.lineTo(80,42);ac.lineTo(8,42);ac.closePath();ac.fill();ac.stroke();
  const at=new THREE.CanvasTexture(arrowC);at.encoding=THREE.sRGBEncoding;
  const arrow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.55),new THREE.MeshBasicMaterial({map:at,transparent:true,side:THREE.DoubleSide,color:'#bba98c'}));arrow.position.y=1.85;sg.add(arrow);
  mine.sw.arrow=arrow;box(2.2,2.4,0,1.8,-35.1,-35.3,null);
  // points: two short rail blades at the junction that swing between the branches
  mine.sw.blades=[];for(const o of [-.42,.42]){const b=new THREE.Mesh(new THREE.BoxGeometry(.08,.1,2.2),M.gold);b.position.set(4+o,.09,-37);ROOT.add(b);mine.sw.blades.push(b);}
}
function cartPath(){const C=mine.cart;return C.paths[C.br===1?1:0];}
function syncCart(){const C=mine.cart;polyAt(cartPath(),C.s,C.p);const h=.66;C.col.min.set(C.p.x-h,0,C.p.z-h);C.col.max.set(C.p.x+h,1.1,C.p.z+h);}
const cartRolling=()=>{const C=mine.cart;return C.br===1&&C.s>C.sJ+.5&&C.s<C.sEnd;};
// the Giant walking into the cart pushes it along the rails (called from moveBody)
function pushCart(ax,d){
  const C=mine.cart;if(!C||(C.br===1&&C.s>C.sJ+.5))return false;
  const t=ax==='x'?C.p.tx:C.p.tz;if(Math.abs(t)<.45)return false;
  let ns=C.s+t*d;
  if(ns>C.sJ&&C.br<0)C.br=mine.sw.b?1:0;
  ns=clamp(ns,0,C.br===1?C.sEnd:C.br===0?C.aEnd:C.sJ+.3);
  if(ns<C.sJ)C.br=-1;
  if(Math.abs(ns-C.s)<1e-5)return false;
  C.roll+=ns-C.s;C.s=ns;syncCart();C.moved=.25;return true;
}

// ---------- the pulley lift ----------
function buildLift(){
  const L={t:0,cw:false,x0:53.1,x1:55.7,z0:-63.9,z1:-61.3,col:null,g:null,moving:false,wheelA:0};
  L.col=box(L.x0,L.x1,-.25,0,L.z0,L.z1,null,{kind:'lift',surface:'wood'});
  const g=new THREE.Group();ROOT.add(g);L.g=g;const cx=(L.x0+L.x1)/2,cz=(L.z0+L.z1)/2;
  const deck=new THREE.Mesh(boxGeo(2.6,.22,2.6,1.6,0,0,0),M.wood);deck.position.set(cx,-.11,cz);deck.castShadow=deck.receiveShadow=true;g.add(deck);
  for(const sx of [-1,1])for(const sz of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(.08,2.7,.08),M.iron);b.position.set(cx+sx*1.25,1.35,cz+sz*1.25);g.add(b);}
  for(const sz of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(2.6,.08,.08),M.iron);b.position.set(cx,2.7,cz+sz*1.25);g.add(b);const r=new THREE.Mesh(new THREE.BoxGeometry(2.6,.06,.06),M.iron);r.position.set(cx,.9,cz+sz*1.25);g.add(r);}
  const yoke=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,2.6),M.iron);yoke.position.set(cx,2.7,cz);g.add(yoke);
  L.rope=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,6),M.wood);ROOT.add(L.rope);
  L.rope2=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,6),M.wood);ROOT.add(L.rope2);
  L.wheel=new THREE.Group();L.wheel.position.set(56.4,12,cz);ROOT.add(L.wheel);
  const tor=new THREE.Mesh(new THREE.TorusGeometry(2,.12,8,28),M.iron);L.wheel.add(tor);for(let k=0;k<4;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.1,4,.1),M.iron);sp.rotation.z=k*Math.PI/4;L.wheel.add(sp);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.4,.4,10),M.wood);beam.position.set(56.4,12,-62.6);ROOT.add(beam);
  // the counterweight hangs on the far side of the wheel, jammed on a hook until the Sprite frees it
  L.cwM=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.3,1.1),MM.deep);L.cwM.position.set(58.4,9.4,cz);ROOT.add(L.cwM);
  const hook=new THREE.Mesh(new THREE.TorusGeometry(.2,.05,6,12,Math.PI*1.4),M.gold);hook.position.set(58.4,10.3,cz);ROOT.add(hook);L.hook=hook;
  // the Giant's winch at the bottom, the Sprite's small winch up top
  const mkWinch=(p,r,col)=>{const w=new THREE.Group();w.position.copy(p);ROOT.add(w);
    const stand=new THREE.Mesh(new THREE.BoxGeometry(.3,r*1.6,.3),M.wood);stand.position.y=r*.8;w.add(stand);
    const wh=new THREE.Group();wh.position.y=r*1.6;wh.rotation.y=Math.PI/2;w.add(wh);
    const t=new THREE.Mesh(new THREE.TorusGeometry(r,.05,6,20),col);wh.add(t);for(let k=0;k<3;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.05,r*2,.05),col);sp.rotation.z=k*Math.PI/3;wh.add(sp);}
    box(p.x-.25,p.x+.25,p.y,p.y+r*1.6,p.z-.25,p.z+.25,null);return wh;};
  L.wB=mkWinch(WINCH_B,.55,M.gold);L.wT=mkWinch(WINCH_T,.3,M.gold);
  mine.lift=L;
}

// ---------- lantern stones (the chapter's three root stones) ----------
function addLStone(i,x,y,z,where){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),MM.amber);m.scale.set(.85,1.25,.85);m.castShadow=true;ROOT.add(m);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffbf5e',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.8}));glow.scale.set(1.7,1.7,1);ROOT.add(glow);
  LSTONES.push({i,pos:new V3(x,y,z),home:new V3(x,y,z),state:'rest',m,glow,where});
}
const stoneReach=(g,st)=>dxz(g.pos,st.pos)<1.9&&st.pos.y-g.pos.y>-.7&&st.pos.y-g.pos.y<2.2;

// ---------- small decorations ----------
function crate(x,z,s,y){y=y||0;const c=box(x-s/2,x+s/2,y,y+s,z-s/2,z+s/2,M.wood,{fade:false});if(c.mesh)c.mesh.rotation.y=0;return c;}
function timberPosts(list){for(const [x,z,h,y0] of list){const y=y0||0;box(x-.12,x+.12,y,y+h,z-.12,z+.12,M.wood,{fade:false,cast:false});}}
function beam(xa,xb,za,zb,y){box(xa,xb,y-.26,y,za,zb,M.wood,{collide:false,fade:true,cast:false});}
function rockPile(list){
  const geos=[0,1,2].map(k=>REAL.ready?realRockGeo(1,.62,.85,k*2.7+1):lowPoly(1,.62,.85,0,k*11+3,.35));
  const by=[[],[],[]];list.forEach((r,i)=>by[i%3].push(r));
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new V3(),sc=new V3();
  by.forEach((arr,k)=>{if(!arr.length)return;const im=new THREE.InstancedMesh(geos[k],MM.deep,arr.length);
    arr.forEach(([x,y,z,s],i)=>{p.set(x,y+s*.25,z);q.setFromAxisAngle(_yAx,x*1.7+z);sc.set(s,s,s);m4.compose(p,q,sc);im.setMatrixAt(i,m4);});im.receiveShadow=true;ROOT.add(im);});
}
function quartz(list){
  const n=list.length*3,im=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,1,5),MM.quartz,n),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new V3(),sc=new V3();
  let i=0;for(const [x,y,z,s] of list)for(let k=0;k<3;k++){const h=(.45+hash2(i,k,7)*.5)*s;p.set(x+(hash2(i,1,8)-.5)*.5*s,y+h*.42,z+(hash2(i,2,8)-.5)*.5*s);e.set((hash2(i,3,8)-.5)*.8,hash2(i,4,8)*3,(hash2(i,5,8)-.5)*.8);q.setFromEuler(e);sc.set(s,h,s);m4.compose(p,q,sc);im.setMatrixAt(i++,m4);}
  ROOT.add(im);
}
function mist(xa,xb,za,zb,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(xb-xa),Math.abs(zb-za)),new THREE.MeshBasicMaterial({color:'#0d1622',transparent:true,opacity:.72,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set((xa+xb)/2,y,(za+zb)/2);ROOT.add(m);}
function crackDecal(w,h){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.strokeStyle='rgba(20,14,10,.9)';c.lineCap='round';
  const br=(x,y,a,l,lw,d)=>{if(d>4||l<8)return;c.lineWidth=lw;c.beginPath();c.moveTo(x,y);const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;c.lineTo(x2,y2);c.stroke();br(x2,y2,a+(hash2(d,l|0,3)-.5)*1.3,l*.72,lw*.7,d+1);if(hash2(d,l|0,9)>.4)br(x2,y2,a+(hash2(d,l|0,5)-.3)*1.8,l*.5,lw*.6,d+1);};
  for(let k=0;k<6;k++)br(128,128,k/6*6.28+.3,60,9,0);
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));}
function minersMural(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=230;const c=cv.getContext('2d');
  c.fillStyle='#5b5046';c.fillRect(0,0,512,230);c.globalAlpha=.9;
  c.strokeStyle='#8a7a62';c.lineWidth=10;c.beginPath();c.moveTo(0,190);c.bezierCurveTo(150,150,330,210,512,160);c.stroke(); // a tunnel
  c.fillStyle='#a48c6e';c.beginPath();c.ellipse(170,140,46,56,0,0,7);c.fill();c.beginPath();c.arc(170,72,24,0,7);c.fill(); // the Giant
  c.strokeStyle='#c9b48e';c.lineWidth=6;c.beginPath();c.moveTo(205,118);c.lineTo(250,84);c.stroke(); // digging
  const g=c.createRadialGradient(300,90,0,300,90,46);g.addColorStop(0,'rgba(255,240,190,.95)');g.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=g;c.beginPath();c.arc(300,90,46,0,7);c.fill();
  c.fillStyle='#fff6dc';c.beginPath();c.arc(300,90,8,0,7);c.fill();
  c.strokeStyle='#d9b04a';c.lineWidth=4;c.beginPath();c.moveTo(512,175);c.bezierCurveTo(430,190,380,150,330,170);c.stroke(); // a root following
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t;
}

// ================= build =================
function buildMines(){
  curBuild='ch2';
  const R=beginRegion('ch2',{name:'Chapter 2: The Lantern Mines',short:'Lantern Mines',chapter:2,fog:[18,58],fogReal:[18,58],spawn:MCP,
    dark:{hemi:.3,sky:'#7d90ae',ground:'#30261d',exp:1.1,fog:'#05070a',bg:'#04060a'}});
  mineMats();
  // ---------- floors ----------
  mfloor(-9,9,6,-14);                    // the Mine Mouth
  mfloor(-9,30,-19,-48);                 // the Cart Yard
  mfloor(-17,-10,-23,-31);mfloor(-10,-9,-26.6,-27.4,0,0); // the lamp room and the crawl hole into it
  mfloor(30,34,-38,-42.2);               // the tunnel to the gallery
  mfloor(34,40,-32,-50);                 // the gallery's west shore
  mfloor(45.5,50.5,-38.5,-43.5,0,16);    // island 1
  mfloor(57.5,63.5,-37.5,-44.5,0,16);    // island 2
  mfloor(59,64,-26,-31.5,0,16);          // the far crystal island
  mfloor(53,67,-54,-67);                 // the bottom of the pulley shaft
  mfloor(-8.5,-6,-48,-50,0,0);           // the iron door between the yard and the hall
  // the Great Lantern hall: a dark pit in the south-west corner, a shelf beyond it, a cracked floor over a cellar
  mfloor(-22,-4,-50,-60);mfloor(-34,-4,-60,-76);mfloor(-34,-11,-76,-84);mfloor(-34,-30.5,-50,-53.5);
  for(const [a,b,c,d] of [[-11,-9.5,-76,-84],[-5.5,-4,-76,-84],[-9.5,-5.5,-76,-78],[-9.5,-5.5,-81,-84]])box(a,b,-.5,0,c,d,MM.floor,{fade:true,cast:false,surface:'stone'});
  mine.crack.col=box(-9.5,-5.5,-.5,0,-78,-81,M.crack,{kind:'crack',fade:false,cast:false,surface:'stone'});mine.crack.mesh=mine.crack.col.mesh;
  box(-11,-4,-3.5,-3,-76,-84,MM.floor,{cast:false,fade:false});                       // cellar floor
  box(-11.5,-11,-3.5,-.5,-76,-84,MM.rock,{fade:false,cast:false});box(-11,-4,-3.5,-.5,-75.5,-76,MM.rock,{fade:false,cast:false});
  box(-9.5,-8.3,-3,-1,-78,-81,MM.deep,{fade:false});box(-8.3,-7.1,-3,-2,-78,-81,MM.deep,{fade:false}); // rubble to climb out

  // ---------- walls ----------
  const H=6;
  mrock(-10,-9,0,H,5.7,-26.6);mrock(-10,-9,0,H,-27.4,-48);mrock(-10,-9,.55,H,-26.6,-27.4,{fade:true}); // west wall with the crawl hole
  holeMarker(-10,-9,-27.4,-26.6,['x+','x-'],-8.35,-27);
  mrock(9,10,0,H,5.7,-19);mrock(10,31,0,H,-18,-19);                                   // mouth east wall, yard south wall
  mrock(-10,-4.3,0,H,4,5.7);mrock(4.3,10,0,H,4,5.7);invis(-5,5,0,12,7.5,8.5);          // the south wall either side of the gate
  mrock(-18,-17,0,5,-22,-32);mrock(-18,-10,0,5,-31,-32);mrock(-18,-10,0,5,-22,-23);    // the lamp room
  mrock(-4,31,0,7,-48,-59);invis(-4,31,7,18,-48,-59);                                 // the rock under and beside the high drift
  mrock(-37,-8.5,0,10,-48,-50);mrock(-6,-1,0,10,-48,-50);                             // the wall between the yard and the hall
  mrock(30,34,0,7,-19,-38);mrock(30,34,0,7,-42.2,-55);                                // the rock between the yard and the gallery
  mrock(34,77,-12,7,-22,-25);mrock(74,77,-12,7,-25,-58);mrock(34,53,-12,7,-55,-59);mrock(67,77,-12,7,-55,-58); // the gallery
  invis(34,53,7,18,-55,-59);
  mrock(67,70,-1,14,-54,-70);mrock(53,70,-1,14,-67,-70);                              // the shaft
  // the high drift: the rock it runs on, its north wall with a hollow (the niche), and the cracked wall at its west end
  mrock(-4,53,0,6,-59,-66,{fade:false});
  mrock(-4,12,0,10,-66,-69);mrock(15.5,53,0,10,-66,-69);mrock(12,15.5,0,10,-68.4,-69.4);mrock(12,15.5,0,6,-66,-68.4,{fade:false});
  {const W=mine.wall;W.col=box(8,9,6,10.5,-59,-66,null,{kind:'door'});W.g=new THREE.Group();ROOT.add(W.g);
    const m=new THREE.Mesh(boxGeo(1,4.5,7,4.5,0,0,0),MM.rock);m.position.set(8.5,8.25,-62.5);W.g.add(m);
    for(const s of [1,-1]){const d=crackDecal(6.4,4.2);d.rotation.y=s*Math.PI/2;d.position.set(8.5+s*.51,8.2,-62.5);W.g.add(d);}}
  // the hall
  mrock(-37,-34,-4,10,-47,-87);mrock(-37,-1,-4,10,-84,-87);mrock(-4,-1,-4,10,-50,-59);mrock(-4,-1,-4,10,-66,-84);
  // chasm floors far below, lost in mist
  mist(-9,9,-14,-19,-4.5);mist(34,74,-25,-55,-6);mist(-34,-22,-50,-60,-4.5);

  // ---------- the Mine Mouth ----------
  {const g=prop('gate');if(REAL.ready)realifyProp(g);g.position.set(0,-.05,4.5);g.rotation.y=Math.PI;g.scale.setScalar(.82);ROOT.add(g);
    const gm=[];g.traverse(o=>{if(o.isMesh)gm.push(o);});if(gm.length)markFadeGroup(gm);
    for(const s of [-1,1])box(s>0?2.62:-4.3,s>0?4.3:-2.62,0,6.5,3.3,5.7,null,{surface:'stone'});
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(5.2,7.6),new THREE.MeshBasicMaterial({color:'#7ff0cf',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    veil.position.set(0,3.9,4.9);ROOT.add(veil);mine.veil=veil;
    const lab=labelSprite('The Vale','Walk through together','#1fb3a3');lab.scale.set(4.4,1.4,1);lab.position.set(0,9,4.6);ROOT.add(lab);
    // daylight spilling in through the gate
    const spill=new THREE.Mesh(new THREE.PlaneGeometry(13,12),new THREE.MeshBasicMaterial({map:TEX.glow,color:'#ffe9c4',transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));
    spill.rotation.x=-Math.PI/2;spill.position.set(0,.03,1.5);ROOT.add(spill);}
  addWaystone('ch2_mouth','Mine Mouth',6.4,0,0.6,Math.PI);
  timberPosts([[-8.6,-3,4.6],[8.6,-3,4.6],[-8.6,-10,4.6],[8.6,-10,4.6]]);beam(-8.8,8.8,-2.85,-3.15,4.6);beam(-8.8,8.8,-9.85,-10.15,4.6);
  addLantern(-5,0,-8);
  crate(7.4,-12.2,1);crate(6.3,-12.6,.8);rockPile([[-7.6,0,-12.8,.7],[-8,0,-5.4,.55],[7.8,0,-6.8,.5]]);
  // the first crystal bridge, over the first chasm
  addCrystal('bridge',-1.4,1.4,-14,-19,0,[[-2.5,-13.4],[2.5,-13.4],[-2.5,-19.6],[2.5,-19.6]]);

  // ---------- the Cart Yard ----------
  buildCart();
  // the scaffold with the switch lever on top (the Sprite leaps up from the Giant's head)
  {const x0=6,x1=9,z0=-31,z1=-34,h=3;box(x0,x1,0,h,z0,z1,null,{surface:'wood'});
    for(const [x,z] of [[x0+.12,z0-.12],[x1-.12,z0-.12],[x0+.12,z1+.12],[x1-.12,z1+.12]])box(x-.12,x+.12,0,h,z-.12,z+.12,M.wood,{collide:false,fade:false});
    box(x0,x1,h-.2,h,z0,z1,M.wood,{collide:false,fade:true});
    for(const z of [z0-.05,z1+.05]){const br=new THREE.Mesh(new THREE.BoxGeometry(3.4,.12,.08),M.wood);br.position.set((x0+x1)/2,h/2,z);br.rotation.z=.75;ROOT.add(br);}
    const lv=makeLever(7.5,-32.6,0,'switch',h);lv.mine=true;MLEVERS.push(lv);}
  // the barricade in the tunnel to the gallery
  {const B=mine.bar;B.g=new THREE.Group();ROOT.add(B.g);const parts=[];
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.18,3.3,.66),M.wood);m.position.set(31.3,1.65,-38.35-i*.7);m.rotation.x=(hash2(i,3,4)-.5)*.08;m.castShadow=true;B.g.add(m);parts.push(m);}
    for(const y of [.8,2.4]){const m=new THREE.Mesh(new THREE.BoxGeometry(.16,.22,4.4),M.wood);m.position.set(31.1,y,-40.1);m.rotation.x=y>1?.25:-.25;B.g.add(m);parts.push(m);}
    markFadeGroup(parts);B.col=box(31,31.6,0,3.4,-38,-42.2,null,{kind:'door'});}
  addLantern(20,0,-26);
  timberPosts([[30.6,-37.9,4],[30.6,-42.3,4],[33.4,-37.9,4],[33.4,-42.3,4]]);beam(30.4,30.8,-37.8,-42.4,4);beam(33.2,33.6,-37.8,-42.4,4);
  crate(26,-46.6,1.1);crate(27.2,-46.8,.9);crate(26.5,-45.4,.8);crate(-7.6,-20.6,1);crate(16,-20.2,.9);
  {const w=cartMesh();w.position.set(-6.4,0,-44.2);w.rotation.set(0,.9,.35);ROOT.add(w);box(-7.3,-5.5,0,1,-45.1,-43.3,null);}
  rockPile([[-8,0,-35,.9],[-7.8,0,-38,.6],[14,0,-47,.8],[22,0,-47.2,1],[29,0,-21,.7],[28.8,0,-29,.9],[12,0,-19.8,.6]]);
  // the lamp room behind the crawl hole (secret)
  addLantern(-15.6,0,-29.6);
  {const mural=new THREE.Mesh(new THREE.PlaneGeometry(4.4,2),new THREE.MeshLambertMaterial({map:minersMural(),emissive:'#3a2e24',emissiveIntensity:.4}));mural.position.set(-13.5,2,-30.98);ROOT.add(mural);
    const bed=new THREE.Mesh(new THREE.CylinderGeometry(.7,.8,.16,14),new THREE.MeshLambertMaterial({color:'#4f7d3c'}));bed.position.set(-12,.08,-24.2);ROOT.add(bed);}

  // ---------- the Crystal Gallery ----------
  addLantern(36,0,-47.6);
  addCrystal('bridge',40,45.5,-39.9,-42.1,0,[[39.3,-38.6],[39.3,-43.4],[46.1,-38.9],[46.1,-43.1]]);
  addCrystal('bridge',50.5,57.5,-39.9,-42.1,0,[[58.1,-38.6],[58.1,-43.4]]);          // its posts are on the far island only
  addCrystal('bridge',59.4,61.6,-44.5,-54,0,[[58.4,-44.1],[62.6,-44.1],[58.4,-54.6],[62.6,-54.6]]);
  addCrystal('bridge',60.4,62.6,-31.5,-37.5,0,[[59.6,-30.2],[63.8,-30.2]]);          // to the far island: lit from there only
  addLStone(0,61.6,0,-41,'Crystal gallery');
  quartz([[35,0,-33,1.2],[39.4,0,-49.4,1],[33.6,-3,-46,1.4],[46,0,-43,.8],[50,0,-38.8,.7],[63,0,-37.9,.9],[63,0,-44,1],[63.6,0,-26.4,1.1],[59.4,0,-26.4,.8],
    [44,-7,-30,2.2],[56,-8,-50,2.6],[70,-7,-40,2.4],[52,-9,-30,2],[40,-8,-53,1.8],[66,-9,-28,2.2]]);
  timberPosts([[34.3,-32.3,3.6],[34.3,-49.7,3.6]]);

  // ---------- the pulley shaft and the high drift ----------
  buildLift();
  addLantern(65.5,0,-56.5);
  {const lv=makeLever(52.2,-65.5,0,'cw',MINE.driftY);lv.mine=true;MLEVERS.push(lv);}
  box(46.8,48.2,6,7,-65.3,-66,MM.rock,{fade:false});addLStone(1,47.5,7,-65.65,'High drift');   // stone 2 on a small ledge
  addLantern(30,6,-65.6);addLantern(13.75,6,-68);                                       // the second lights the hollow
  timberPosts([[44,-65.85,3.8,6],[36,-65.85,3.8,6],[28,-65.85,3.8,6],[20,-65.85,3.8,6],[3,-65.85,3.8,6]]);
  rockPile([[66,0,-66,1.1],[54,0,-55,.8],[66.2,0,-60,.7]]);
  // the boulder that waits in the dark above the drift
  {const B=mine.boulder,Rr=MINE.boulderR;B.m=new THREE.Mesh(REAL.ready?realRockGeo(Rr,Rr*.94,Rr,11):lowPoly(Rr,Rr*.94,Rr,1,5,.25),MM.rock);B.m.castShadow=true;B.m.visible=false;ROOT.add(B.m);
    B.col=box(-30.1,-25.9,0,4.8,-64.6,-60.4,null);B.col.on=false;markFade(B.m);}

  // ---------- the Great Lantern hall ----------
  // the Great Lantern: a plinth, a tall iron cage with a platform on top, and a huge dark crystal floating above
  box(-19.4,-14.6,0,.42,-72.4,-67.6,MM.rock,{fade:false,surface:'stone'});
  box(GL.x0,GL.x1,.42,GL.top,GL.z0,GL.z1,null,{surface:'stone'});
  {const g=new THREE.Group();g.position.set(GL.x,0,GL.z);ROOT.add(g);
    const core=new THREE.Mesh(new THREE.BoxGeometry(2.2,GL.top-.42,2.2),MM.deep);core.position.y=(GL.top+.42)/2;g.add(core);
    for(const sx of [-1,1])for(const sz of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(.16,GL.top+3.4,.16),M.iron);b.position.set(sx*1.22,(GL.top+3.4)/2,sz*1.22);g.add(b);}
    const deck=new THREE.Mesh(new THREE.BoxGeometry(2.6,.16,2.6),M.iron);deck.position.y=GL.top-.08;g.add(deck);
    const crown=new THREE.Mesh(new THREE.TorusGeometry(1.7,.08,6,24),M.gold);crown.rotation.x=Math.PI/2;crown.position.y=GL.top+3.4;g.add(crown);
    const cm=new THREE.MeshStandardMaterial({color:'#ffe2a6',emissive:'#ff9f2e',emissiveIntensity:.05,roughness:.2,transparent:true,opacity:.92});
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.9,0),cm);cr.scale.set(1,1.5,1);cr.position.y=GL.top+2.1;g.add(cr);mine.gcrystal=cr;
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#ffc261',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));glow.scale.set(9,9,1);glow.position.y=GL.top+2.1;g.add(glow);mine.gglow=glow;
    for(let k=0;k<3;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(.42,.2,.3),M.socket);s.position.set((k-1)*.6,.95,1.16);g.add(s);
      const gm=new THREE.Mesh(new THREE.OctahedronGeometry(.17),MM.amber);gm.scale.y=1.4;gm.position.set((k-1)*.6,1.14,1.16);gm.visible=false;g.add(gm);mine.sockets.push(gm);}
    const L=new THREE.PointLight('#ffcf8a',0,48,1.6);L.position.set(GL.x,GL.top+2.6,GL.z);ROOT.add(L);mine.glight=L;}
  // the hidden crystal path across the pit, and the shelf with the third stone
  for(const [x,z] of [[-22.85,-58.35],[-24.55,-58.35],[-26.25,-58.35],[-26.25,-56.65],[-26.25,-54.95],[-27.95,-54.95],[-29.65,-54.95],[-29.65,-53.25]])
    addCrystal('tile',x-.85,x+.85,z-.85,z+.85,0,null,MINE.tileR);
  addLStone(2,-32.6,0,-51.8,'Dark pit');
  // the iron door back to the yard (opened from this side)
  {const D=mine.door;D.g=new THREE.Group();ROOT.add(D.g);const parts=[];
    for(let i=0;i<6;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.1,3.3,.1),M.iron);b.position.set(-8.3+i*.44,1.65,-49);D.g.add(b);parts.push(b);}
    for(const y of [.5,1.6,2.7]){const b=new THREE.Mesh(new THREE.BoxGeometry(2.5,.1,.12),M.iron);b.position.set(-7.25,y,-49);D.g.add(b);parts.push(b);}
    markFadeGroup(parts);D.col=box(-8.5,-6,0,3.4,-48.7,-49.3,null,{kind:'door'});
    const lv=makeLever(-5.1,-51.4,Math.PI/2,'door');lv.mine=true;MLEVERS.push(lv);}
  addWaystone('ch2_hall','Great Lantern',-7.2,0,-55.4,Math.PI/2);
  addLantern(-30.5,0,-78.5);addLantern(-6.6,0,-71.6);
  quartz([[-33.4,0,-66,1.3],[-33.2,0,-74,1],[-28,0,-83.4,1.2],[-20,0,-83.4,.9],[-4.6,0,-60.6,.8],[-33,0,-51.5,.9],[-31,-4,-56,1.6],[-25,-6,-52,2],[-10,-3,-83,1],[-5,-3,-79,.9],[-10.5,-3,-80,.7]]);
  rockPile([[-33,0,-62,.9],[-33.2,0,-80,1],[-24,0,-83.2,.8],[-12,0,-83.3,1],[-4.8,0,-82,.7],[-21,0,-50.8,.6]]);
  timberPosts([[-33.6,-60.6,5],[-33.6,-75.4,5],[-4.4,-75.4,5]]);

  // ---------- collectibles ----------
  const S=[[-6,0,-2],[6,0,-6],[0,0,-11],[-7,0,-11.2],                                  // mouth
    [-6,0,-22],[-4,0,-40],[2,0,-46.4],[12,0,-30],[16,0,-44],[24,0,-22],[27,0,-34],[7.5,3,-33.6],      // yard (one on the scaffold)
    [-12,0,-25],[-12,0,-29.6],[-14.6,0,-27],[-16.2,0,-24],                              // lamp room
    [38,0,-34.5],[37.4,0,-44.6],[47,0,-40],[49,0,-42.6],[59.4,0,-39],[62.6,0,-43.6],[62.8,0,-38.4],[60.4,0,-28.2],[62.6,0,-28.2],[61.5,0,-30.6], // gallery
    [56,0,-57],[64,0,-64.6],[60,0,-60],                                                // shaft
    [40,6,-62.5],[33,6,-62.5],[26,6,-62.5],[19,6,-62.5],                                // the drift (grab them on the run)
    [-20,0,-64],[-12,0,-58],[-28,0,-70],[-24,0,-82],[-31,0,-52.6],                       // hall
    [-10,-3,-77],[-5,-3,-83]];                                                          // cellar
  S.forEach(([x,y,z],i)=>addSeed('c2s'+i,x,y,z));
  addPetal('m6',-16,0,-24.6);addPetal('m7',-5.4,-3,-77);addPetal('m8',61.5,0,-27.6);

  // ---------- lights: a few shared lantern lights that follow the lit lanterns nearest the players ----------
  for(let i=0;i<4;i++){const L=new THREE.PointLight('#ffc672',0,14,1.7);L.position.set(0,-50,0);ROOT.add(L);mine.pool.push({L,lan:null,k:0});}
  // the light pulse: an expanding shell of light
  {const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),new THREE.MeshBasicMaterial({color:'#bff7ea',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide}));
    m.visible=false;ROOT.add(m);mine.fx.m=m;
    const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,40),new THREE.MeshBasicMaterial({color:'#c9fff0',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.visible=false;ROOT.add(ring);mine.fx.ring=ring;}
  mine.beacon=makeBeacon();
  buildSleepers();
  endRegion(R);
  buildSeedInstances('ch2');
  // the Sprite's own glow (only switched on in dark places)
  SPRITE_LIGHT=new THREE.PointLight('#c4f7ea',1.5,9,1.8);SPRITE_LIGHT.visible=false;scene.add(SPRITE_LIGHT);
}

// ================= state =================
function resetMines(){
  const P=PROG.ch2,done=!!P.done;
  G.time=0;G.falls=0;G.throws=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;G.ch.pulses=0;
  mine.lan=done?(1<<LANTERNS.length)-1:(P.lan|0);
  mine.sw.b=done;mine.sw.t=+done;
  const C=mine.cart;C.br=done?1:-1;C.s=done?C.sEnd:0;C.v=0;syncCart();
  mine.bar.broken=done;mine.bar.col.on=!done;
  const L=mine.lift;L.t=0;L.cw=done;L.col.min.y=-.25;L.col.max.y=0;
  const B=mine.boulder;B.st=done?'done':'idle';B.x=done?-28:51.5;B.y=done?MINE.boulderR:22;B.t=0;B.v=0;B.col.on=done;
  mine.wall.broken=done;mine.wall.col.on=!done;
  mine.door.open=done||!!P.door;mine.door.t=+mine.door.open;
  mine.crack.broken=false;mine.crack.col.on=true;
  for(const st of LSTONES){st.state=done?'placed':'rest';st.pos.copy(st.home);}
  mine.placed=done?3:0;
  for(const c of CRYST){c.t=done?MINE.litT:0;c.col.on=done;}
  for(const l of MLEVERS){l.pulled=l.id==='switch'?mine.sw.b:l.id==='cw'?L.cw:mine.door.open;l.t=+l.pulled;}
  golem.runes=0;golem.holding=false;golem.charging=false;golem.pound=false;golem.winding=false;sprite.held=false;sprite.winding=false;
  placeAt(golem,MCP.g);placeAt(sprite,MCP.s);golem.yaw=sprite.yaw=Math.PI;
  mine.fx.t=9;hintsShown.clear();camSnap=true;
}
function minesDone(){return !!PROG.ch2.done;}
const onLanternTop=b=>b.pos.x>GL.x0-.1&&b.pos.x<GL.x1+.1&&b.pos.z>GL.z0-.1&&b.pos.z<GL.z1+.1&&b.pos.y>GL.top-.15;
// the Sprite's light pulse: lights lanterns and wakes crystals nearby
function lightPulse(){
  const s=sprite;if(mine.pulseCD>0)return;mine.pulseCD=.6;
  G.pulseN=(G.pulseN||0)+1;G.pulseAt=[s.pos.x,s.pos.y,s.pos.z];G.ch.pulses=(G.ch.pulses||0)+1;
  const p=s.pos;
  for(const l of LANTERNS)if(!lanLit(l)&&Math.hypot(l.pos.x-p.x,l.pos.z-p.z)<MINE.pulseR+.5&&Math.abs(l.pos.y-p.y)<4){mine.lan|=1<<l.i;PROG.ch2.lan=mine.lan;G.lanN=(G.lanN||0)+1;saveSoon();}
  for(const c of CRYST)for(const a of c.anchors){if(Math.hypot(a.x-p.x,a.z-p.z)<c.r&&Math.abs(a.y-p.y)<3){const was=c.col.on;c.t=MINE.litT;c.col.on=true;if(!was){liftOnto(c.col);G.crystN=(G.crystN||0)+1;}break;}}
  if(!G.ending&&mine.placed>=3&&!minesDone()&&onLanternTop(s)){G.ending=true;G.endT=0;chapterComplete(2);mine.lan=(1<<LANTERNS.length)-1;PROG.ch2.lan=mine.lan;}
}
function pullMineLever(l){
  if(l.id==='switch'){mine.sw.b=!mine.sw.b;l.pulled=mine.sw.b;G.swN=(G.swN||0)+1;return;}
  l.pulled=true;
  if(l.id==='cw'){mine.lift.cw=true;}
  else if(l.id==='door'){mine.door.open=true;PROG.ch2.door=1;saveSoon();}
}
function golemMineAction(){
  const g=golem;
  if(g.runes>0&&dxz(g.pos,GL.sock)<3.4&&Math.abs(g.pos.y-.4)<1){for(const st of LSTONES)if(st.state==='carried'){st.state='placed';mine.placed++;}g.runes=0;return true;}
  for(const st of LSTONES)if(st.state==='rest'&&stoneReach(g,st)){st.state='carried';g.runes++;G.pick++;if(st.i===1&&!mine.wall.broken&&mine.boulder.st==='idle'){mine.boulder.st='wait';mine.boulder.t=0;}return true;}
  if(dxz(g.pos,WINCH_B)<2.2&&Math.abs(g.pos.y-WINCH_B.y)<1&&!g.holding){g.winding=true;return true;}
  return false;
}
// ---- per step: before the characters move ----
function stepMinesA(dt,IG,IS){
  const g=golem,s=sprite,L=mine.lift;
  mine.pulseCD-=dt;
  if(g.winding&&(!IG.act||g.holding||!g.onGround||dxz(g.pos,WINCH_B)>2.6))g.winding=false;
  if(s.winding&&(!IS.act||s.held||!L.cw||dxz(s.pos,WINCH_T)>2||Math.abs(s.pos.y-WINCH_T.y)>1))s.winding=false;
  // the lift: wound up by the Giant (below) or, once balanced, by the Sprite (above); otherwise it sinks back
  const oldY=L.t*MINE.liftH,riders=[g,s].filter(b=>!(b===s&&s.held)&&b.onGround&&b.ground===L.col);
  let v=g.winding||s.winding?1/4:(!L.cw?-1/5:(riders.length?0:-1/7));
  let nt=clamp(L.t+v*dt,0,1);
  if(nt<L.t){const ny=nt*MINE.liftH;for(const b of [g,s]){if(b===s&&s.held)continue;
    if(b.pos.x+b.hw>L.x0&&b.pos.x-b.hw<L.x1&&b.pos.z+b.hw>L.z0&&b.pos.z-b.hw<L.z1&&b.pos.y<oldY-.2&&b.pos.y+b.h>ny-.35){nt=L.t;break;}}}
  L.t=nt;const ny=L.t*MINE.liftH,dy=ny-oldY;L.col.min.y=ny-.25;L.col.max.y=ny;L.moving=Math.abs(dy)>1e-5;L.wheelA+=dy*.5;
  if(dy>0)for(const b of riders){b.pos.y+=dy;if(b===g)syncGolemCol();}
}
// ---- per step: after the characters move ----
function stepMinesB(dt){
  const g=golem,s=sprite,C=mine.cart;
  if(cartRolling()){C.v=Math.min(7,Math.max(C.v,2.4)+2.2*dt);const ns=Math.min(C.sEnd,C.s+C.v*dt);C.roll+=ns-C.s;C.s=ns;if(C.s>=C.sEnd){C.v=0;G.bumpN=(G.bumpN||0)+1;}
    if(!mine.bar.broken&&C.s>=C.sBar){mine.bar.broken=true;mine.bar.col.on=false;G.smashN=(G.smashN||0)+1;}
    syncCart();depenetrate(g,C.col);syncGolemCol();if(!s.held)depenetrate(s,C.col);C.moved=.25;}
  C.moved-=dt;mine.sw.t=approach(mine.sw.t,mine.sw.b?1:0,dt/.4);
  if(C.br===0&&C.s>=C.aEnd-.01&&!mine.bar.broken&&!C.atA){C.atA=true;G.bumpN=(G.bumpN||0)+1;}if(C.br!==0||C.s<C.aEnd-.5)C.atA=false;
  const done=minesDone();
  for(const c of CRYST){if(done){c.t=MINE.litT;if(!c.col.on){c.col.on=true;liftOnto(c.col);}continue;}if(c.t>0){c.t=Math.max(0,c.t-dt);if(c.t<=0)c.col.on=false;}}
  stepBoulder(dt);
  const D=mine.door;D.t=approach(D.t,D.open?1:0,dt/2.2);D.col.min.y=D.t*3.3;D.col.max.y=3.4+D.t*3.3;
  for(const l of MLEVERS)l.t=approach(l.t,l.pulled?1:0,dt/.35);
}
const BSTATES=['idle','wait','roll','fall','land','done'];
function stepBoulder(dt){
  const B=mine.boulder,R=MINE.boulderR,Y=MINE.driftY;
  if(B.st==='wait'){B.t+=dt;if(B.t>1.25)B.y=Math.max(Y+R,lerp(Y+16,Y+R,(B.t-1.25)/.35));else B.y=22;if(B.t>1.6){B.st='roll';B.y=Y+R;B.v=1.2;G.rollN=(G.rollN||0)+1;}}
  else if(B.st==='roll'){B.v=Math.min(3,B.v+2.4*dt);B.x-=B.v*dt;B.rot+=B.v*dt/R;
    if(!mine.wall.broken&&B.x-R<9.1){mine.wall.broken=true;mine.wall.col.on=false;G.wallN=(G.wallN||0)+1;}
    if(B.x<-4.2){B.st='fall';B.vy=0;}
    for(const b of [golem,sprite]){if(b===sprite&&sprite.held)continue;
      if(b.pos.y>Y-.6&&b.pos.y<Y+2*R&&Math.abs(b.pos.x-B.x)<R*.8&&Math.abs(b.pos.z-MINE.driftZ)<R+b.hw-.35){bowled();return;}}}
  else if(B.st==='fall'){B.x-=3*dt;B.vy-=GRAV*dt;B.y+=B.vy*dt;B.rot+=3*dt/R;if(B.y<=R){B.y=R;B.st='land';B.v=3;G.boomN=(G.boomN||0)+1;}}
  else if(B.st==='land'){B.v=clamp((B.x+28)*2,1.5,5.5);B.x=Math.max(-28,B.x-B.v*dt);B.rot+=B.v*dt/R;if(B.x<=-28){B.st='done';}
    B.col.min.set(B.x-2.1,0,MINE.driftZ-2.1);B.col.max.set(B.x+2.1,4.8,MINE.driftZ+2.1);B.col.on=true;for(const b of [golem,sprite])if(!(b===sprite&&sprite.held))depenetrate(b,B.col);syncGolemCol();} // solid while it rolls: it shoves anyone in its way // rolls well clear of where the players drop in
  if(B.st==='done'&&!B.col.on){B.col.min.set(B.x-2.1,0,MINE.driftZ-2.1);B.col.max.set(B.x+2.1,4.8,MINE.driftZ+2.1);B.col.on=true;for(const b of [golem,sprite])depenetrate(b,B.col);syncGolemCol();}
}
function bowled(){
  const B=mine.boulder;G.bowlN=(G.bowlN||0)+1;B.st='wait';B.t=-1;B.x=51.5;B.y=22;B.v=0;
  golem.holding=false;golem.charging=false;golem.winding=false;sprite.held=false;
  placeAt(golem,[44,6,-61.6]);placeAt(sprite,[44,6,-63.6]);golem.yaw=sprite.yaw=-Math.PI/2;syncGolemCol();golem.safe=null;sprite.safe=null;camSnap=true;
}

// ================= visuals =================
function startPulseFx(p){if(!p)return;const F=mine.fx;F.t=0;F.x=p[0];F.y=p[1];F.z=p[2];}
function updateMinesVis(dt,t){
  const rf=PROG.settings.reduceFlash,done=minesDone();
  // the cart
  const C=mine.cart;C.g.position.set(C.p.x,0,C.p.z);C.g.rotation.y=Math.atan2(C.p.tx,C.p.tz);for(const w of C.g.userData.wheels)w.rotation.x=C.roll/.2;
  mine.sw.arrow.rotation.y=Math.PI/2*(1-mine.sw.t); // points north (the dead end) or east (toward the barricade)
  mine.sw.blades.forEach((b,i)=>{b.rotation.y=mine.sw.t*.32;b.position.x=4+(i?.42:-.42)+mine.sw.t*.32;});
  mine.bar.g.visible=!mine.bar.broken;
  // the lift
  const L=mine.lift,ly=L.t*MINE.liftH,cz=(L.z0+L.z1)/2;L.g.position.y=ly;
  const top=12-2,ropeLen=top-(ly+2.7);L.rope.position.set(54.4,ly+2.7+ropeLen/2,cz);L.rope.scale.y=Math.max(.1,ropeLen);
  const cwy=L.cw?lerp(9.4,3.4,L.t):9.4;L.cwM.position.y=cwy;const r2l=top-(cwy+.65);L.rope2.position.set(58.4,cwy+.65+r2l/2,cz);L.rope2.scale.y=Math.max(.1,r2l);L.hook.visible=!L.cw;
  L.wheel.rotation.z=-L.wheelA;if(golem.winding)L.wB.rotation.x+=dt*4;if(sprite.winding)L.wT.rotation.x+=dt*6;
  for(const l of MLEVERS)l.handle.rotation.z=lerp(-.7,.7,l.t);
  // the boulder, the cracked wall, the door
  const B=mine.boulder;B.m.visible=B.st!=='idle'&&!(B.st==='wait'&&B.t<1.25);B.m.position.set(B.x,B.y,MINE.driftZ);B.m.rotation.z=B.rot;
  mine.wall.g.visible=!mine.wall.broken;mine.door.g.position.y=mine.door.t*3.3;
  if(B.st==='wait'&&B.t>0&&B.t<1.3&&Math.random()<dt*30)puff(51.5+(Math.random()-.5)*3,MINE.driftY+3.5+Math.random()*2,MINE.driftZ+(Math.random()-.5)*4,1,.5,[.6,.56,.5],.25,-.6);
  if(B.st==='roll'&&Math.random()<dt*14)puff(B.x+1.6,MINE.driftY,MINE.driftZ+(Math.random()-.5)*4.6,2,.8,[.62,.58,.52],.4,.6);
  // the stones and the Great Lantern
  for(const st of LSTONES){const vis=st.state==='rest';st.m.visible=vis;st.glow.visible=vis;if(vis){const y=st.pos.y+.42+Math.sin(t*1.8+st.i)*.07;st.m.position.set(st.pos.x,y,st.pos.z);st.m.rotation.y=t*.8+st.i;st.glow.position.set(st.pos.x,y,st.pos.z);st.glow.material.opacity=rf?.7:.6+.2*Math.sin(t*2.4);}}
  mine.sockets.forEach((s,i)=>s.visible=i<mine.placed);
  const gk=done?1:(G.ending?Math.min(1,G.endT/2.5):0);
  mine.gcrystal.material.emissiveIntensity=.35+gk*1.9;mine.gcrystal.rotation.y=t*(.2+gk*.6);mine.gglow.material.opacity=.14+gk*.66; // a faint landmark glow even before it is lit
  mine.glight.intensity=gk*(rf?2.4:2.4+.15*Math.sin(t*3));
  if(G.ending&&Math.random()<dt*40){const a=Math.random()*6.28,sp=1+Math.random()*2;emit(GL.x,GL.top+2.1,GL.z,Math.cos(a)*sp,Math.random()*2,Math.sin(a)*sp,1,.82,.45,.09,1.6,.4,.3);}
  // lanterns: the crystal glows when lit; the nearest lit lanterns borrow one of the shared lights
  for(const l of LANTERNS){const on=lanLit(l);l.k=approach(l.k,on?1:0,dt*2);l.cr.material=l.k>.5?MM.amber:MM.lanOff;l.glow.material.opacity=l.k*(rf?.7:.62+.08*Math.sin(t*7+l.i*3));}
  mine.poolT-=dt;
  if(mine.poolT<=0){mine.poolT=.25;const lit=LANTERNS.filter(l=>lanLit(l)).map(l=>[l,l.pos.distanceToSquared(camTarget)]).sort((a,b)=>a[1]-b[1]).slice(0,mine.pool.length).map(a=>a[0]);mine.want=lit;}
  const want=mine.want||[];
  for(const P of mine.pool){if(P.lan&&!want.includes(P.lan)){P.k=approach(P.k,0,dt*3);if(P.k<=0)P.lan=null;}}
  for(const l of want)if(!mine.pool.some(P=>P.lan===l)){const P=mine.pool.find(P=>!P.lan);if(P){P.lan=l;P.k=0;}}
  for(const P of mine.pool){if(P.lan&&want.includes(P.lan))P.k=approach(P.k,P.lan.k,dt*3);
    if(P.lan){P.L.position.copy(P.lan.pos);P.L.intensity=P.k*(rf?1.6:1.55+.12*Math.sin(t*9+P.lan.i));}else P.L.intensity=0;}
  // crystals: bright while lit, a flicker in the last two seconds, then fade out
  for(const c of CRYST){let k=done?1:c.t>2?1:c.t/2;if(!done&&c.t>0&&c.t<2&&!rf)k*=.55+.45*(Math.sin(c.t*24)>-.3?1:0);
    const tile=c.kind==='tile';c.mat.opacity=lerp(tile?0:.06,.8,k);c.mat.emissiveIntensity=k*1.1;c.mesh.visible=!tile||k>.01;
    c.em.material.opacity=lerp(tile?0:.26,.95,k);c.em.visible=!tile||k>.01;c.pm.emissiveIntensity=lerp(.25,1.8,k);
    if(tile&&k<.01&&!rf&&Math.random()<dt*.35&&dxz(sprite.pos,c.anchors[0])<9)emit(c.anchors[0].x+(Math.random()-.5),.05,c.anchors[0].z+(Math.random()-.5),0,.25,0,.55,.9,1,.06,1.1,0,.3);}
  // the pulse: an expanding shell and a ring on the floor
  const F=mine.fx;F.t+=dt;const fk=F.t/.55;
  F.m.visible=fk<1;F.ring.visible=fk<1;
  if(fk<1){const r=.6+smooth(0,1,fk)*MINE.pulseR;F.m.position.set(F.x,F.y+.4,F.z);F.m.scale.setScalar(r);F.m.material.opacity=(1-fk)*(rf?.12:.22);
    F.ring.position.set(F.x,F.y+.05,F.z);F.ring.scale.setScalar(r);F.ring.material.opacity=(1-fk)*.7;}
  // the Sprite's own light: a soft glow, much brighter for a moment after a pulse
  if(SPRITE_LIGHT){const p=sprite.root?sprite.root.position:sprite.pos;SPRITE_LIGHT.position.set(p.x,p.y+.6,p.z);const boost=Math.max(0,1-F.t/1.4);
    SPRITE_LIGHT.intensity=1.7+boost*(rf?2:3.4);SPRITE_LIGHT.distance=11+boost*8;}
  mine.veil.material.opacity=rf?.24:.2+.1*Math.sin(t*1.6);
  // dust in the air near the Sprite's light
  if(!rf&&Math.random()<dt*5){const p=sprite.pos;emit(p.x+(Math.random()-.5)*6,p.y+.4+Math.random()*2.5,p.z+(Math.random()-.5)*6,(Math.random()-.5)*.1,.03,(Math.random()-.5)*.1,.85,.8,.7,.035,3,0,.2);}
}

// ================= the Vale's lantern posts (lit once the second root wakes) =================
function buildValeLamps(){
  // batched: one draw call each for the posts, caps, crystals and glows
  const spots=[[3.4,74],[-3.4,58],[3.4,44],[-3.4,-40],[3.4,-56],[-3.4,-74],[3.4,-88],[44,-38],[60,-54],[22,-24],[-23,20],[24,20],[-31,-3],[31,3]],n=spots.length;
  const mat=new THREE.MeshStandardMaterial({color:'#6b747c',emissive:'#ffad3d',emissiveIntensity:0,roughness:.35});VALE.lampMat=mat;
  const postG=new THREE.CylinderGeometry(.07,.09,2.2,8);postG.translate(0,1.1,0);const capG=new THREE.ConeGeometry(.24,.2,4);capG.rotateY(Math.PI/4);capG.translate(0,2.5,0);
  const crG=new THREE.OctahedronGeometry(.12);crG.scale(1,1.5,1);crG.translate(0,2.22,0);
  const ims=[[postG,M.wood],[capG,M.iron],[crG,mat]].map(([g,m])=>{const im=new THREE.InstancedMesh(g,m,n);im.castShadow=true;ROOT.add(im);return im;});
  const m4=new THREE.Matrix4(),gp=new Float32Array(n*3);
  spots.forEach(([x,z],i)=>{const y=valeH(x,z);m4.makeTranslation(x,y,z);for(const im of ims)im.setMatrixAt(i,m4);gp.set([x,y+2.22,z],i*3);box(x-.15,x+.15,y-1,y+2.2,z-.15,z+.15,null);});
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(gp,3));
  const glow=new THREE.Points(pg,new THREE.PointsMaterial({map:TEX.glow,color:'#ffc46a',size:1.7,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));
  glow.visible=false;ROOT.add(glow);VALE.lampGlow=glow;
}
function updateValeLamps(dt){if(!VALE.lampMat)return;const on=PROG.roots>=2&&!(G.scene==='root2'&&G.line<1);VALE.lampK=approach(VALE.lampK||0,on?1:0,dt/2.5);
  VALE.lampMat.emissiveIntensity=VALE.lampK*1.4;VALE.lampGlow.material.opacity=VALE.lampK*.6;VALE.lampGlow.visible=VALE.lampK>.01;}

// ================= dark regions: no sky, no sun, black fog, the Sprite's light =================
const LOOK={saved:null};
function applyLook(r){
  if(!LOOK.saved)LOOK.saved={env:scene.environment,bg:scene.background,fog:scene.fog.color.clone(),hemi:W.hemi?W.hemi.intensity:0,hs:W.hemi?W.hemi.color.clone():null,hg:W.hemi?W.hemi.groundColor.clone():null,exp:renderer.toneMappingExposure};
  const S=LOOK.saved,d=r.dark;
  scene.environment=d?null:S.env;scene.background=d?new THREE.Color(d.bg):S.bg;scene.fog.color.copy(d?new THREE.Color(d.fog):S.fog);
  if(W.sky)W.sky.visible=!d;if(W.sun)W.sun.visible=!d;
  if(W.hemi){W.hemi.intensity=d?d.hemi:S.hemi;W.hemi.color.copy(d?new THREE.Color(d.sky):S.hs);W.hemi.groundColor.copy(d?new THREE.Color(d.ground):S.hg);}
  renderer.toneMappingExposure=d?d.exp:S.exp;
  if(SPRITE_LIGHT)SPRITE_LIGHT.visible=!!d;
  // the Giant's stone body is lit mostly by the sky's reflections, which don't exist underground: give it a soft fill instead
  if(LOOK.gb===undefined){LOOK.gb=null;if(golem.model)golem.model.traverse(o=>{if(o.isMesh&&o.material.name==='GiantBody'&&!LOOK.gb){LOOK.gb=o.material;if(o.material.map){o.material.emissiveMap=o.material.map;o.material.needsUpdate=true;}}});}
  if(LOOK.gb)LOOK.gb.emissive.set(d?'#59636e':'#000000');
  // lights that belong to one region are switched off everywhere else (fewer lights to shade)
  for(const rn of runes)rn.light.visible=r.id==='ch1';if(W.fLight)W.fLight.visible=r.id==='ch1';if(VALE.treeLight)VALE.treeLight.visible=r.id==='vale';
}

// ================= characters =================
const golem={kind:'golem',pos:new V3(),vel:new V3(),hw:.6,h:2.3,stepH:.45,yaw:Math.PI,onGround:false,coyote:0,holding:false,charging:false,charge:0,runes:0,cp:0,pushing:false,anim:0,prev:new V3(),delta:new V3(),stepSound:0,walk:0};
const sprite={kind:'sprite',pos:new V3(),vel:new V3(),hw:.14,h:.4,stepH:.14,yaw:Math.PI,onGround:false,coyote:0,held:false,gliding:false,thrownT:0,cp:0,walk:0,anim:0,airT:0};
golem.col={min:new V3(),max:new V3(),kind:'golem',on:true};colliders.push(golem.col);
function syncGolemCol(){const g=golem;golem.col.min.set(g.pos.x-.52,g.pos.y,g.pos.z-.52);golem.col.max.set(g.pos.x+.52,g.pos.y+g.h,g.pos.z+.52);golem.col.on=!sprite.held;}

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
// prepare a character scene from Blender: shadows, PBR tweaks, scale to a target height (feet at 0)
function prepModel(gltf,targetH){
  const root=gltf.scene;
  root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;const m=o.material;
    if(m.transparent){m.depthWrite=false;m.side=THREE.DoubleSide;o.castShadow=false;o.renderOrder=4;}else{o.castShadow=true;o.receiveShadow=false;}
    if(m.map)m.map.anisotropy=ANISO;if('envMapIntensity' in m)m.envMapIntensity=.8;});
  const bb=new THREE.Box3().setFromObject(root),h=bb.max.y-bb.min.y,s=targetH/h;
  root.scale.setScalar(s);root.position.y=-bb.min.y*s;
  const holder=new THREE.Group();holder.add(root);return {holder,root,scale:s};
}

function buildGolem(){
  const R=new THREE.Group();scene.add(R);golem.root=R;
  if(MODELS){
    const m=prepModel(MODELS.giant,2.45);R.add(m.holder);golem.model=m.root;
    m.root.traverse(o=>{if(o.isMesh&&o.material.name==='GiantBody'){const k=o.material;k.color.setScalar(.8);if(k.normalScale)k.normalScale.multiplyScalar(1.8);k.roughness=.88;k.metalness=0;}
      if(o.isMesh&&o.material.name==='GiantEye'){o.material.emissive.set('#ff9a2e');o.material.emissiveIntensity=1.6;o.material.color.set('#ffb054');}});
    golem.A=makeAnimator(m.root,MODELS.giant.animations);golem.A.play('Idle',0);
    golem.armL=findBone(m.root,'upperarml');golem.armR=findBone(m.root,'upperarmr');golem.chest=findBone(m.root,'chest');golem.shoulder=findBone(m.root,'upperarml');
    // carry pose: both hands come up beside the head to steady the Sprite (worked out on the Blender rig)
    golem.carryPose=[['upperarml',-2.3,-.2],['upperarmr',-2.3,.2],['lowerarml',-1.4,.2],['lowerarmr',-1.4,-.2]].map(([n,x,z])=>{const b=findBone(m.root,n);
      return b?{b,q:b.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,0,z,'XYZ')))}:null;}).filter(Boolean);
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
  sprite.wingBones=null;sprite.wings=null;
  if(MODELS){
    const m=prepModel(MODELS.sprite,.8);R.add(m.holder);sprite.model=m.root;
    sprite.A=makeAnimator(m.root,MODELS.sprite.animations);sprite.A.play('Idle',0);
    m.root.updateMatrixWorld(true);
    // wings flap around the body's vertical axis, worked out in each wing bone's own space
    const wl=findBone(m.root,'wingl'),wr=findBone(m.root,'wingr');
    if(wl&&wr)sprite.wingBones=[wl,wr].map((b,i)=>{const q=new THREE.Quaternion();b.getWorldQuaternion(q);
      return {b,rest:b.quaternion.clone(),axis:new V3(0,1,0).applyQuaternion(q.invert()).normalize(),sign:i?-1:1};});
    addXray(m.root,'#22bf9c');
  }else{
    const mat=new THREE.MeshLambertMaterial({color:'#bff7e6',emissive:'#22bf9c',emissiveIntensity:.6});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),mat);body.position.y=.18;body.scale.y=1.3;R.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.1,14,10),mat);head.position.y=.38;R.add(head);
    addXray(R,'#22bf9c');
    const wm=new THREE.MeshBasicMaterial({map:TEX.wing,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.9});
    sprite.wings=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.02,.26,-.06);R.add(p);const w=new THREE.Mesh(new THREE.PlaneGeometry(.3,.21),wm);w.position.x=s*.15;w.scale.x=s;p.add(w);return p;});
  }
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:'#7dffd9',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.25}));halo.scale.set(.95,.95,.95);halo.position.y=.38;R.add(halo);sprite.halo=halo;
  sprite.light=new THREE.PointLight('#9fffe0',.6,4,2);sprite.light.position.y=.4;R.add(sprite.light);
  sprite.ring=groundRing('#22bf9c',.75);
}
const _wq=new THREE.Quaternion();
function flapWings(flap){
  const s=sprite;
  if(s.wingBones){for(const w of s.wingBones){_wq.setFromAxisAngle(w.axis,w.sign*(flap*.75-.15));w.b.quaternion.copy(w.rest).multiply(_wq);}}
  else if(s.wings){s.wings[0].rotation.y=-flap;s.wings[1].rotation.y=flap;}
}
// colored ring on the ground under a character so you always know who is where
function groundRing(color,size){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:TEX.ring,color,transparent:true,depthWrite:false,opacity:.9}));
  m.rotation.x=-Math.PI/2;m.renderOrder=2;scene.add(m);return m;
}
// put the ring on the floor directly below a character (finds the highest surface under it)
const _rayDown=new THREE.Raycaster(),_down=new V3(0,-1,0);
function floorBelow(p,skip){let best=-99;for(const c of colliders){if(!c.on||c===skip||c.kind==='golem')continue;if(p.x>c.min.x&&p.x<c.max.x&&p.z>c.min.z&&p.z<c.max.z&&c.max.y<=p.y+.05&&c.max.y>best)best=c.max.y;}
  const th=terrainAt(p.x,p.z);if(th<=p.y+.05&&th>best)best=th;
  if(G.region==='ch1'&&p.z<-27&&p.z>-33&&Math.abs(p.x)<11&&best<-1)return -99;return best<-50?0:best;}

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
  if(G.region==='ch1')for(const f of fireflies){f.ph+=dt;const x=f.x+Math.sin(f.ph*.7)*.8,y=f.y+Math.sin(f.ph*1.3)*.4,z=f.z+Math.cos(f.ph*.5)*.8;const a=(.5+.5*Math.sin(f.ph*2.3))*(G.fountainOn?1:.6);put(x,y,z,1,.9,.5,.08,a);}
  pGeo.setDrawRange(0,n);pGeo.attributes.position.needsUpdate=true;pGeo.attributes.aColor.needsUpdate=true;pGeo.attributes.aSize.needsUpdate=true;pGeo.attributes.aAlpha.needsUpdate=true;
  // dust (soft, not glowing)
  let m=0;for(let i=dust.length-1;i>=0;i--){const p=dust[i];p.life-=dt;if(p.life<=0){dust.splice(i,1);continue;}const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d-p.grav*dt;p.vz*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.size+=dt*p.grow;}
  for(const p of dust){if(m>=DMAX)break;const k=p.life/p.max;dPos[m*3]=p.x;dPos[m*3+1]=p.y;dPos[m*3+2]=p.z;dCol[m*3]=p.r;dCol[m*3+1]=p.g;dCol[m*3+2]=p.b;dSize[m]=p.size;dAlpha[m]=Math.min(1,k*1.6)*p.a;m++;}
  dGeo.setDrawRange(0,m);for(const k of ['position','aColor','aSize','aAlpha'])dGeo.attributes[k].needsUpdate=true;
}
const DMAX=260,dPos=new Float32Array(DMAX*3),dCol=new Float32Array(DMAX*3),dSize=new Float32Array(DMAX),dAlpha=new Float32Array(DMAX),dust=[];
const dGeo=new THREE.BufferGeometry();
dGeo.setAttribute('position',new THREE.BufferAttribute(dPos,3));dGeo.setAttribute('aColor',new THREE.BufferAttribute(dCol,3));dGeo.setAttribute('aSize',new THREE.BufferAttribute(dSize,1));dGeo.setAttribute('aAlpha',new THREE.BufferAttribute(dAlpha,1));
const dMat=pMat.clone();dMat.blending=THREE.NormalBlending;dMat.uniforms=pMat.uniforms;
const dPts=new THREE.Points(dGeo,dMat);dPts.frustumCulled=false;dPts.renderOrder=3;scene.add(dPts);
function puff(x,y,z,n,spread,col,size,up){if(dust.length>DMAX-n)return;const c=col||[.82,.74,.62];
  for(let i=0;i<n;i++){const a=Math.random()*6.28,sp=(spread||1)*(.6+Math.random()*.8);dust.push({x:x+Math.cos(a)*.2,y:y+.08,z:z+Math.sin(a)*.2,vx:Math.cos(a)*sp,vy:(up||.6)*(.5+Math.random()),vz:Math.sin(a)*sp,r:c[0],g:c[1],b:c[2],a:.55,size:size||.35,grow:.5,life:.7+Math.random()*.4,max:1.1,drag:3.2,grav:.4});}}

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
  const wasGround=b.onGround;b.wasGround=wasGround;b.onGround=false;b.ground=null;b.landVy=b.vel.y;
  const dy=b.vel.y*dt;b.pos.y+=dy;
  for(const c of list){if(!ov(b,c))continue;const prevY=b.pos.y-dy;
    if(dy<=0&&prevY>=c.max.y-.05){b.pos.y=c.max.y;b.vel.y=0;b.onGround=true;b.ground=c;}
    else if(dy>0&&prevY+b.h<=c.min.y+.05){b.pos.y=c.min.y-b.h-1e-4;b.vel.y=0;}}
  // smooth terrain (the Vale): stand on it, and stick to it when walking downhill
  const T=curReg&&curReg.terrain;
  if(T&&!b.onGround){const th=T(b.pos.x,b.pos.z);
    if(b.pos.y<=th){b.pos.y=th;if(b.vel.y<0)b.vel.y=0;b.onGround=true;b.ground=TERR;}
    else if(wasGround&&b.vel.y<=0&&b.pos.y-th<.45){b.pos.y=th;b.vel.y=0;b.onGround=true;b.ground=TERR;}}
  for(const ax of ['x','z']){const d=b.vel[ax]*dt;if(d===0)continue;const old=b.pos[ax];b.pos[ax]+=d;
    if(T){const th=T(b.pos.x,b.pos.z);if(th-b.pos.y>Math.max(.5,Math.abs(d)*1.3)){b.pos[ax]=old;b.vel[ax]=0;continue;}if(b.ground===TERR&&th>b.pos.y)b.pos.y=th;}
    for(const c of list){if(!ov(b,c))continue;
      const rise=c.max.y-b.pos.y;
      if((b.onGround||wasGround)&&rise>0&&rise<=b.stepH){const oy=b.pos.y;b.pos.y=c.max.y+.001;if(freeAt(b,list)){b.onGround=true;continue;}b.pos.y=oy;}
      if(c.kind==='block'&&b.kind==='golem'&&(b.onGround||wasGround)&&rise>.35){if(pushBlock(ax,d)&&!ov(b,c)){b.pushing=true;continue;}}
      if(c.kind==='cart'&&b.kind==='golem'&&(b.onGround||wasGround)&&rise>.35){if(pushCart(ax,d)&&!ov(b,c)){b.pushing=true;continue;}}
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
const G={phase:'loading',time:0,falls:0,throws:0,placed:0,ending:false,endT:0,lastFall:'',fallN:0,paused:false,pick:0,useN:0,
  region:'',regionN:0,scene:'',line:0,lineT:0,card:'',cardT:0,dlg:'',dlgN:0,poundN:0,poundAt:[0,0,0],crackN:0,launchN:0,launchBig:0,
  seedN:0,petalN:0,secretN:0,lastSecret:'',wsN:0,lastWs:'',splashN:0,lastSplash:'',plantN:0,waitN:0,travelReq:0,chT:0,ch:{seeds:0,petals:0,secrets:0,launches:0},fountainOn:false};
function headPos(out){const f=fwd(golem.yaw);return out.set(golem.pos.x+f.x*.15,golem.pos.y+golem.h+.08,golem.pos.z+f.z*.15);}
const _f=new V3();function fwd(y){return _f.set(Math.sin(y),0,Math.cos(y));}
const talked={};

// chapter 1 puzzle state back to the start (collectibles stay collected)
function resetLevel(){
  G.time=0;G.falls=0;G.throws=0;G.placed=0;G.ending=false;G.endT=0;G.fallN=0;G.pick=0;G.useN=0;G.fountainOn=false;
  gate.open=false;gate.t=0;bridge.open=false;bridge.t=0;port.open=false;port.t=0;latch.t=0;
  for(const l of levers){l.pulled=false;l.t=0;}crank.used=false;crank.t=0;
  block.pos.copy(block.home);block.vel.set(0,0,0);syncBlock();
  runes.forEach(r=>{r.state=['rest','perched','vault'][r.i];r.pos.copy(r.home);r.vel.set(0,0,0);r.t=0;});
  golem.runes=0;golem.holding=false;golem.charging=false;golem.pound=false;golem.cp=0;sprite.held=false;sprite.cp=0;
  seesaw.tilt=seesaw.tiltT=-1;seesaw.hold=0;syncSeesaw();crack.broken=false;crack.col.on=true;crack.mesh.visible=true;
  stones.raised=false;stones.t=0;
  if(PROG.ch1.done){ // the garden remembers: doors open, fountain running, runes set
    gate.open=bridge.open=port.open=true;gate.t=bridge.t=port.t=1;latch.t=1.1;levers[0].pulled=levers[1].pulled=true;levers[0].t=levers[1].t=1;crank.used=true;crank.t=1;
    runes.forEach(r=>r.state='placed');G.placed=3;G.fountainOn=true;}
  applyDoorColliders();resetOrchard();
  placeAt(golem,CP[0].g);placeAt(sprite,CP[0].s);golem.yaw=sprite.yaw=Math.PI;
  W.basinWater.visible=false;W.jet.visible=false;W.fLight.intensity=0;W.sockets.forEach(s=>s.visible=false);
  hintsShown.clear();camSnap=true;
}
function placeAt(b,p){b.pos.set(p[0],p[1],p[2]);b.vel.set(0,0,0);b.onGround=false;}
// move both players to a region (behind a short fade); runs on the host / local game only
function travel(reg,g,s,yaw){
  const from=G.region;
  if(from!==reg){enterRegion(reg);G.regionN++;for(const k in talked)delete talked[k];}
  if(reg==='ch1'&&from!=='ch1'){resetLevel();G.ch={seeds:seedsFoundIn('ch1'),petals:0,secrets:0,launches:0};}
  if(reg==='ch2'&&from!=='ch2'){G.ch={seeds:seedsFoundIn('ch2'),petals:0,secrets:0,launches:0,pulses:0};resetMines();}
  golem.holding=false;golem.charging=false;golem.pound=false;sprite.held=false;
  if(g)placeAt(golem,g);if(s)placeAt(sprite,s);if(yaw!=null)golem.yaw=sprite.yaw=yaw;
  golem.safe=null;sprite.safe=null;syncGolemCol();camSnap=true;CAVECAM.c=null;camYawT=Math.round(camYawT/(Math.PI*2))*Math.PI*2;
  if(reg==='vale'){VALE.wake=(PROG.roots>=1&&!PROG.seen.root1)?0:valeWakeTarget();resetCaves();}
  if(reg==='vale'&&!PROG.seen.prologue)playScene('prologue');
  else if(reg==='vale'&&PROG.roots>=1&&!PROG.seen.root1)playScene('root1');
  else if(reg==='vale'&&PROG.roots>=2&&!PROG.seen.root2)playScene('root2');
  else if(reg==='ch1'&&!PROG.seen.ch1_intro)playScene('ch1_intro');
  else if(reg==='ch2'&&!PROG.seen.ch2_intro)playScene('ch2_intro');
}
// just inside the Vale in front of a chapter's gate, facing the Heart Tree
function valeSpotAtGate(n){
  if(n===1){const z=-100.5;return {g:[-1.6,valeH(-1.6,z),z],s:[1.6,valeH(1.6,z),z],yaw:0};}
  const gt=GATES[n-1],l=Math.hypot(gt.pos.x,gt.pos.z),ix=-gt.pos.x/l,iz=-gt.pos.z/l,px=-iz,pz=ix,d=6.5;
  const at=(o)=>{const x=gt.pos.x+ix*d+px*o,z=gt.pos.z+iz*d+pz*o;return [x,valeH(x,z),z];};
  return {g:at(-1.6),s:at(1.6),yaw:Math.atan2(ix,iz)};
}
function startSpot(){return {reg:'vale',g:VALE_SPAWN.g.map((v,i)=>i===1?valeH(VALE_SPAWN.g[0],VALE_SPAWN.g[2]):v),s:VALE_SPAWN.s.map((v,i)=>i===1?valeH(VALE_SPAWN.s[0],VALE_SPAWN.s[2]):v)};}
function travelToWaystone(id){const w=WAYS.find(w=>w.id===id);if(!w)return;
  const gy=w.reg==='vale'?valeH(w.spawnG[0],w.spawnG[2]):w.spawnG[1],sy=w.reg==='vale'?valeH(w.spawnS[0],w.spawnS[2]):w.spawnS[1];
  travel(w.reg,[w.spawnG[0],gy,w.spawnG[2]],[w.spawnS[0],sy,w.spawnS[2]],Math.atan2(w.spawnG[0]-w.pos.x,w.spawnG[2]-w.pos.z));}
function nearWaystone(b,r){for(const w of WAYS)if(w.reg===G.region&&PROG.ws[w.id]&&dxz(b.pos,w.pos)<(r||2.6)&&Math.abs(b.pos.y-w.pos.y)<2)return w;return null;}

// ---- interactions ----
const inCh1=()=>G.region==='ch1';
function golemAction(){
  const g=golem;
  if(inCh1()){
    if(g.runes>0&&dxz(g.pos,F)<4.7){placeRunes();return;}
    for(const r of runes){if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2){r.state='carried';g.runes++;G.pick++;return;}}}
  }
  if(inCh2()&&golemMineAction())return;
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75){sprite.held=true;g.holding=true;sprite.vel.set(0,0,0);sprite.gliding=false;G.pick++;return;}}
  if(G.region==='vale'&&plotNear(g)&&seedsToPlant()>=5){plantSeeds();return;}
  if(nearWaystone(g)){G.travelReq++;return;}
}
function plotNear(b){return VALE.plot&&Math.hypot(b.pos.x-VALE.plot.x,b.pos.z-VALE.plot.z)<6.2;}
function seedsToPlant(){return seedsFound()-PROG.planted;}
function plantSeeds(){if(PROG.planted>=60)return;PROG.planted+=5;G.plantN++;saveSoon();}
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
  // the cave levers (deep inside, nothing to reach through) are forgiving: 1.8 m, and a little above or below
  const consider=(obj,p,label)=>{const lv=!!(obj&&obj.vale),d=dxz(s.pos,p)-(lv?.6:0);if(d<bd&&Math.abs(p.y-s.pos.y)<(lv?1.5:1.0)){bd=d;best={obj,label};}};
  if(inCh1()){
    for(const l of levers)if(!l.pulled)consider(l,l.pos,l.id==='stones'?'Pull the lever (raise the stones)':l.id==='stair'?'Pull the lever (raise the stair)':l.id==='pavilion'?'Pull the lever (open the pavilion)':'Pull the lever');
    if(!crank.used)consider(crank,crank.pos,'Turn the crank');
    const r1=runes[1];if(r1.state==='perched')consider(r1,r1.pos,'Nudge the rune stone off');
  }
  if(G.region==='vale')for(const l of VLEVERS)if(!l.pulled)consider(l,l.pos,l.id==='grotto'?'Pull the lever (lift the stone door)':'Pull the lever (raise the steps)');
  if(inCh2()){
    for(const l of MLEVERS){if(l.id==='switch')consider(l,l.pos,mine.sw.b?'Flip the track switch (back to the dead end)':'Flip the track switch (toward the barricade)');
      else if(!l.pulled)consider(l,l.pos,l.id==='cw'?'Free the counterweight':'Open the iron door');}
    if(mine.lift.cw)consider('winch',WINCH_T,'Hold to wind the lift');
  }
  if(!best){const w=nearWaystone(s,2.4);if(w)best={obj:w,label:'Travel from the waystone'};}
  if(!best&&G.region==='vale'&&plotNear(s)&&seedsToPlant()>=5)best={obj:'plot',label:'Plant 5 golden seeds'};
  return best;
}
function spriteAction(){
  const t=spriteTarget();if(!t){if(inCh2())lightPulse();return;}G.useN++;
  if(t.obj==='winch'){sprite.winding=true;return;}
  if(t.obj.mine){pullMineLever(t.obj);return;}
  if(t.obj==='plot'){plantSeeds();return;}
  if(WAYS.includes(t.obj)){G.travelReq++;return;}
  if(t.obj.vale){pullValeLever(t.obj);return;}
  if(t.obj===crank){crank.used=true;bridge.open=true;}
  else if(t.obj.kind==='rune'){const r=t.obj;r.state='free';r.pos.y+=.05;r.vel.set(-3.8,3.2,2.0);r.onGround=false;}
  else{t.obj.pulled=true;if(t.obj.id==='gate')gate.open=true;else if(t.obj.id==='stones')stones.raised=true;
    else if(t.obj.id==='stair'){stair.raised=true;PROG.ch1.stair=1;saveSoon();}else if(t.obj.id==='pavilion'){pav.open=true;PROG.ch1.pav=1;saveSoon();}else{const r=runes[2];if(r.state==='vault'){r.state='rolling';r.t=0;}}}
}

// ---- per-step simulation ----
const _h=new V3();
function stepSim(dt,IG,IS){
  if(G.phase!=='play')return;
  // story scenes and memory cards hold the world still; any jump/interact moves them on
  if(G.scene||G.card){const press=IG.jumpP||IG.actP||IS.jumpP||IS.actP;if(G.scene){G.lineT+=dt;if(press||G.lineT>14)storyNext();}else{G.cardT+=dt;if(press&&G.cardT>1)G.card='';}return;}
  if(!G.ending)G.time+=dt;
  if(G.ending){IG=NOIN;IS=NOIN;}
  const g=golem,s=sprite,ch1=inCh1(),ch2=inCh2();
  for(const b of [g,s])if(b.frz>0)b.frz-=dt;
  if(g.frz>0)IG=Object.assign({},IG,{mx:0,mz:0,jumpP:0,actP:0});if(s.frz>0)IS=Object.assign({},IS,{mx:0,mz:0,jumpP:0,actP:0});
  if(ch2){stepMinesA(dt,IG,IS);if(g.winding)IG=Object.assign({},IG,{mx:0,mz:0,jumpP:0});if(s.winding)IS=Object.assign({},IS,{mx:0,mz:0,jumpP:0});}
  g.prev.copy(g.pos);
  // ---- golem ----
  g.airT=g.onGround?0:(g.airT||0)+dt;
  if(IG.actP){if(g.holding){g.charging=true;g.charge=0;}else if(!g.onGround&&g.airT>.12&&!g.pound){g.pound=true;g.vel.set(0,-17,0);}else golemAction();}
  if(g.charging){g.charge=Math.min(1,g.charge+dt/.8);if(!IG.act)throwSprite();}
  {const len=Math.hypot(IG.mx,IG.mz),k=len>1?1/len:1,mx=g.pound?0:IG.mx*k,mz=g.pound?0:IG.mz*k;
   const spd=GOLEM.speed*(g.holding?.8:1)*(g.charging?.35:1)*(g.pushing?.6:1);g.pushing=false;
   const acc=(g.onGround?16:6)*dt*GOLEM.speed;
   if(g.pound){g.vel.x=g.vel.z=0;}else{g.vel.x=approach(g.vel.x,mx*spd,acc);g.vel.z=approach(g.vel.z,mz*spd,acc);}
   if(len>.15&&!g.pound)g.yaw=angLerp(g.yaw,Math.atan2(mx,mz),1-Math.exp(-dt*9));
   if(IG.jumpP&&g.coyote>0&&!g.holding&&!g.charging){g.vel.y=GOLEM.jumpV;g.coyote=0;}
   g.vel.y-=GRAV*dt;
   moveBody(g,dt,listFor(g));
   g.coyote=g.onGround?.12:g.coyote-dt;}
  const landed=g.onGround&&!g.wasGround,pounded=landed&&g.pound;
  if(g.onGround&&g.pound)g.pound=false;
  if(pounded){G.poundN++;G.poundAt=[g.pos.x,g.pos.y,g.pos.z];
    if(!s.held&&s.onGround&&dxz(s.pos,g.pos)<3.2&&Math.abs(s.pos.y-g.pos.y)<.6){s.vel.y=5.5;s.onGround=false;}
    if(ch1&&g.ground===crack.col&&!crack.broken){crack.broken=true;crack.col.on=false;G.crackN++;}
    if(ch2&&g.ground===mine.crack.col&&!mine.crack.broken){mine.crack.broken=true;mine.crack.col.on=false;G.crackN++;}}
  g.delta.subVectors(g.pos,g.prev);syncGolemCol();
  // ---- chapter 1 mechanisms ----
  if(ch1){
    // seesaw: the Giant landing on the orange end flips it and launches whoever stands in the mint cup
    if(landed&&onSeesaw(g,-1)&&seesaw.tilt<0){seesaw.tiltT=1;seesaw.hold=0;
      const cup=!s.held&&(onSeesaw(s,1)||(Math.abs(s.pos.x-(SEESAW.x+2.7))<1&&Math.abs(s.pos.z-SEESAW.z)<.9&&s.pos.y<1.2&&s.onGround));
      if(cup){s.pos.y=Math.max(s.pos.y,1.45);s.vel.set(s.vel.x*.3,pounded?15.6:11.2,s.vel.z*.3);s.onGround=false;s.thrownT=0;s.airT=0;G.launchN++;G.launchBig=pounded?1:0;G.ch.launches++;}
      else G.launchN+=0;}
    if(seesaw.tiltT>0){if(onSeesaw(g,-1))seesaw.hold=0;else{seesaw.hold+=dt;if(seesaw.hold>.7)seesaw.tiltT=-1;}}
    seesaw.tilt=approach(seesaw.tilt,seesaw.tiltT,dt*(seesaw.tiltT>seesaw.tilt?9:1.4));syncSeesaw();
    stones.t=approach(stones.t,stones.raised?1:0,dt/2.2);stones.list.forEach(st=>{const on=stones.t>.96;if(on&&!st.col.on)liftOnto(st.col);st.col.on=on;});
    stepOrchard(dt);
    // ---- block ----
    block.vel.y-=GRAV*dt;block.vel.x=block.vel.z=0;const l=listFor(block);moveBody(block,dt,l);syncBlock();if(block.pos.y<-4){block.pos.copy(block.home);block.vel.set(0,0,0);syncBlock();}
  }
  // ---- sprite ----
  if(s.held){headPos(s.pos);s.yaw=g.yaw;s.vel.set(0,0,0);s.onGround=false;s.gliding=false;
    if(IS.jumpP){s.held=false;g.holding=false;g.charging=false;const f=fwd(g.yaw);s.vel.set(IS.mx*2.6+f.x*.6,SPR.jumpV,IS.mz*2.6+f.z*.6);syncGolemCol();G.hopN=(G.hopN||0)+1;}}
  else{
    if(IS.actP)spriteAction();
    if(s.ground===golem.col)s.pos.add(g.delta);
    depenetrate(s,golem.col);if(ch1)depenetrate(s,block.col);if(ch2)depenetrate(s,mine.cart.col);
    const len=Math.hypot(IS.mx,IS.mz),k=len>1?1/len:1,mx=IS.mx*k,mz=IS.mz*k;
    s.gliding=!s.onGround&&IS.jump&&s.vel.y<0;
    const tgt=s.onGround?SPR.speed:(s.gliding?3.2:4.6),acc=s.onGround?42*dt:(len<.15?0:(s.thrownT>0?4:13)*dt);
    s.vel.x=approach(s.vel.x,mx*tgt,acc);s.vel.z=approach(s.vel.z,mz*tgt,acc);
    if(s.gliding&&s.thrownT<=0){const hsp=Math.hypot(s.vel.x,s.vel.z);if(hsp>3.6){const kk=Math.max(3.6,hsp-6*dt)/hsp;s.vel.x*=kk;s.vel.z*=kk;}}
    if(len>.15)s.yaw=angLerp(s.yaw,Math.atan2(mx,mz),1-Math.exp(-dt*14));
    else if(!s.onGround&&Math.hypot(s.vel.x,s.vel.z)>1)s.yaw=angLerp(s.yaw,Math.atan2(s.vel.x,s.vel.z),1-Math.exp(-dt*8));
    if(IS.jumpP&&s.coyote>0){s.vel.y=SPR.jumpV;s.coyote=0;G.hopN=(G.hopN||0)+1;}
    s.vel.y-=GRAV*dt;if(s.gliding)s.vel.y=Math.max(s.vel.y,-1.6);
    moveBody(s,dt,listFor(s));
    s.coyote=s.onGround?.1:s.coyote-dt;s.thrownT-=dt;if(s.onGround)s.thrownT=0;
    s.airT=s.onGround?0:s.airT+dt;
  }
  if(ch2)stepMinesB(dt);
  if(ch1){
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
  }
  // ---- falls, water, checkpoints ----
  for(const b of [g,s]){
    if(b===s&&s.held)continue;
    if(ch1&&b.onGround&&b.pos.y>-.5&&Math.abs(b.pos.x)<11){for(let i=CP.length-1;i>b.cp;i--)if(b.pos.z<=CP[i].z){b.cp=i;break;}}
    const wet=curReg.hazard&&curReg.hazard(b);
    if(!wet&&b.onGround&&b.ground&&!UNSAFE[b.ground.kind]&&wellOn(b)){(b.safe=b.safe||new V3()).copy(b.pos);}
    if(wet){const p=b.safe?[b.safe.x,b.safe.y+.05,b.safe.z]:(b===g?curReg.spawn.g:curReg.spawn.s);respawnAt(b,p);G.splashN++;G.lastSplash=b===g?'g':'s';
      if(b===g&&g.holding){g.holding=false;g.charging=false;s.held=false;placeAt(s,p);s.pos.x+=.8;}if(b===g)syncGolemCol();continue;}
    if(ch1&&b.pos.y<-5){
      const p=CP[b.cp][b===g?'g':'s'];respawnAt(b,p);G.falls++;G.fallN++;G.lastFall=b===g?'g':'s';
      if(b===g&&g.holding){g.holding=false;g.charging=false;s.held=false;placeAt(s,CP[s.cp].s);}
      if(b===g)syncGolemCol();
    }
    if(ch2&&b.pos.y<-6){ // a fall into a chasm: back to the last safe spot
      const p=b.safe?[b.safe.x,b.safe.y+.05,b.safe.z]:curReg.spawn[b===g?'g':'s'];respawnAt(b,p);G.falls++;G.fallN++;G.lastFall=b===g?'g':'s';
      if(b===g&&g.holding){g.holding=false;g.charging=false;s.held=false;placeAt(s,[p[0]+.8,p[1],p[2]]);}
      if(b===g)syncGolemCol();
    }
  }
  if(G.region==='vale')stepCaves(dt);
  worldChecks();
  // ---- ending ----
  if(ch1&&!G.ending&&!G.fountainOn&&G.placed>=3&&!s.held&&dxz(s.pos,W.spout)<.95&&s.pos.y>3.4&&s.pos.y<5){G.ending=true;G.endT=0;G.fountainOn=true;chapterComplete(1);}
  if(G.ending){G.endT+=dt;if(G.endT>7.5){G.phase='end';G.ending=false;}}
}
const NOIN={mx:0,mz:0,jump:0,jumpP:0,act:0,actP:0};
function applyDoorColliders(){
  gate.col.min.y=gate.base.y0+gate.t*3.5;gate.col.max.y=gate.base.y1+gate.t*3.5;
  port.col.min.y=port.base.y0+port.t*3.5;port.col.max.y=port.base.y1+port.t*3.5;
  bridge.col.on=bridge.t>=.97;
}
// a spot counts as safe ground only when the body stands well onto it (its centre at least half a body-width
// inside the edge), so a respawn never lands someone on the very lip of a drop where they slip straight off again
function wellOn(b){const c=b.ground;if(c===TERR)return true;const m=b.hw*.5;return b.pos.x>c.min.x+m&&b.pos.x<c.max.x-m&&b.pos.z>c.min.z+m&&b.pos.z<c.max.z-m;}
// back on safe ground after a fall: still, no slam or winding, and a moment before the keys move them again
function respawnAt(b,p){placeAt(b,p);b.pound=false;b.winding=false;b.charging=false;b.frz=.5;b.airT=0;}
const UNSAFE={seesaw:1,crack:1,golem:1,block:1,bridge:1,cart:1,lift:1,door:1};
function chapterComplete(n){
  const P=PROG['ch'+n],first=!P.done;P.done=1;PROG.roots=Math.max(PROG.roots,n);G.endCh=n;
  if(!P.best||G.time<P.best)P.best=Math.round(G.time);G.firstClear=first;saveProgress();
}
// collectibles, secrets, waystones, gates and dialogue: things found by walking somewhere
function worldChecks(){
  const g=golem,s=sprite,reg=G.region;
  for(const sd of SEEDS){if(sd.reg!==reg||PROG.seeds[sd.id])continue;
    const hit=(b,r,h)=>Math.hypot(b.pos.x-sd.pos.x,b.pos.z-sd.pos.z)<r&&b.pos.y>sd.pos.y-.6&&b.pos.y<sd.pos.y+h;
    if(hit(g,1.0,1.2)||(!s.held&&hit(s,.6,.9))||(s.held&&hit(g,1.0,2.4))){PROG.seeds[sd.id]=1;G.seedN++;if(reg!=='vale')G.ch.seeds++;saveSoon();}}
  for(const p of PETALS){if(p.reg!==reg||PROG.petals[p.id])continue;
    for(const b of [g,s]){if(Math.hypot(b.pos.x-p.pos.x,b.pos.z-p.pos.z)<1.1&&Math.abs(b.pos.y-p.pos.y)<1.6){PROG.petals[p.id]=1;G.petalN++;if(reg!=='vale')G.ch.petals++;G.card=p.id;G.cardT=0;saveProgress();break;}}}
  for(const sc of curReg.secrets){if(PROG.secrets[sc.id])continue;if(sc.test(g)||(!s.held&&sc.test(s))){PROG.secrets[sc.id]=1;G.secretN++;G.lastSecret=sc.name;if(reg!=='vale')G.ch.secrets++;saveSoon();}}
  for(const w of WAYS){if(w.reg!==reg||PROG.ws[w.id])continue;if(dxz(g.pos,w.pos)<3.2||dxz(s.pos,w.pos)<3.2){PROG.ws[w.id]=1;G.wsN++;G.lastWs=w.name;saveSoon();}}
  for(const t of curReg.talk){if(talked[t.id])continue;if(t.cond&&!t.cond())continue;
    if(Math.hypot(g.pos.x-t.x,g.pos.z-t.z)<t.r||Math.hypot(s.pos.x-t.x,s.pos.z-t.z)<t.r){talked[t.id]=1;G.dlg=t.id;G.dlgN++;if(DLG[t.id].next)dlgPending={id:DLG[t.id].next,t:3.6};break;}}
  tickDialogue(1/60);
  // walking through a gate together changes region
  const both=(p,r)=>dxz(g.pos,p)<r&&dxz(s.pos,p)<r;
  if(reg==='vale')for(const gt of GATES){if(!gt.ready||gt.ch>2)continue;
    if(dxz(g.pos,gt.pos)<2.6||dxz(s.pos,gt.pos)<2.6){if(both(gt.pos,11)){if(gt.ch===1)travel('ch1',CP[0].g,CP[0].s,Math.PI);else travel('ch2',MCP.g,MCP.s,Math.PI);}else if(G.chT<=0){G.waitN++;G.chT=4;}}}
  if(reg==='ch2'&&(g.pos.z>5.3||s.pos.z>5.3)&&Math.abs(g.pos.x)<5&&Math.abs(s.pos.x)<5){
    if(both(new V3(0,0,4.4),11)){const sp=valeSpotAtGate(2);travel('vale',sp.g,sp.s,sp.yaw);}
    else{for(const b of [g,s])if(b.pos.z>5.3){b.pos.z=5.2;b.vel.z=Math.min(0,b.vel.z);}if(G.chT<=0){G.waitN++;G.chT=4;}}}
  if(reg==='ch1'&&(g.pos.z>5.3||s.pos.z>5.3)&&Math.abs(g.pos.x)<5&&Math.abs(s.pos.x)<5){
    if(both(exitGate.pos,11)){const z=-100.5;travel('vale',[-1.6,valeH(-1.6,z),z],[1.6,valeH(1.6,z),z],0);}
    else{for(const b of [g,s])if(b.pos.z>5.3){b.pos.z=5.2;b.vel.z=Math.min(0,b.vel.z);}if(G.chT<=0){G.waitN++;G.chT=4;}}}
  G.chT-=1/60;
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
  if(e.code==='Escape'){
    if(overlayOpen){closeOverlay();return;}
    const boss=mode==='local'||role==='host';
    if(G.phase==='play'&&G.scene&&boss&&$('scrPause').hidden){skipScene();return;}
    if(G.phase==='play'&&G.card&&boss&&$('scrPause').hidden){G.card='';return;}
    togglePause();return;}
  if(e.code==='KeyM'){if(e.shiftKey||G.phase!=='play')setMuted(!muted);else if(!chatOpen&&!G.scene){if(overlayOpen==='scrMap')closeOverlay();else if(!overlayOpen)openMap();}}
  if(e.code==='KeyH'&&G.phase==='play'){helpOpen=!helpOpen;$('help').hidden=!helpOpen;helpUsed=true;}
  if(G.phase==='play'&&(e.code==='KeyQ'||e.code==='KeyR'))rotateCam(e.code==='KeyQ'?-1:1);
  if(mode==='online'&&(G.phase==='play'||G.phase==='brief'||G.phase==='end')&&$('scrPause').hidden){
    if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();keys[e.code]=false;openChat();return;}
    const qm=/^(Digit|Numpad)([1-4])$/.exec(e.code);if(qm)sendChat(QUICK[+qm[2]-1],true);
  }
  if(G.phase==='brief'&&mode==='local'){if(e.code==='Space')readyG=true;if(e.code==='Enter'||e.code==='KeyO')readyS=true;updateReady();}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let helpOpen=false,helpUsed=false,objShowT=0,cntShowT=0,chipT=0;
function padState(i){const ps=navigator.getGamepads?navigator.getGamepads():[];const pads=[];for(const p of ps)if(p&&p.connected)pads.push(p);const p=pads[i];if(!p)return null;
  const dz=v=>Math.abs(v)<.22?0:v;return {mx:dz(p.axes[0]||0),mz:dz(p.axes[1]||0),jump:!!(p.buttons[0]&&p.buttons[0].pressed),act:!!((p.buttons[2]&&p.buttons[2].pressed)||(p.buttons[1]&&p.buttons[1].pressed))};}
const K=(...c)=>c.some(k=>keys[k])?1:0;
// screen-relative input -> world direction, following the camera's current turn
function toWorld(r){const c=Math.cos(camYaw),s=Math.sin(camYaw);const mx=r.mx*c+r.mz*s,mz=-r.mx*s+r.mz*c;r.mx=mx;r.mz=mz;return r;}
// test hook: the scripted playthrough (dev/tests) steers both characters with world-space input
let BOT=null;
function rawLocal(which){ // which: 'g'|'s'
  if(BOT&&BOT[which])return BOT[which]();
  let r;
  if(which==='g')r={mx:K('KeyD')-K('KeyA'),mz:K('KeyS')-K('KeyW'),jump:K('Space'),act:K('KeyE','KeyF')};
  else r={mx:K('ArrowRight','KeyL')-K('ArrowLeft','KeyJ'),mz:K('ArrowDown','KeyK')-K('ArrowUp','KeyI'),jump:K('Enter','KeyO'),act:K('ShiftRight','KeyU','Slash')};
  const p=padState(which==='g'?0:1);if(p){if(p.mx||p.mz){r.mx=p.mx;r.mz=p.mz;}r.jump=r.jump||p.jump;r.act=r.act||p.act;}
  return toWorld(r);
}
function rawOnline(){
  if(chatOpen||overlayOpen)return {mx:0,mz:0,jump:0,act:0};
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
let AC=null,master=null,sfxBus=null,musicBus=null,muted=false,noiseBuf=null,amb={};
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=muted?0:.8;master.connect(AC.destination);
  sfxBus=AC.createGain();sfxBus.connect(master);musicBus=AC.createGain();musicBus.connect(master);applyVolumes();
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=.98*b+.02*w;d[i]=w*.5+b*3;}
  const loop=(type,f,q,vol)=>{const n=AC.createBufferSource();n.buffer=noiseBuf;n.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=vol;n.connect(fl);fl.connect(g);g.connect(sfxBus);n.start();return {g,fl};};
  amb.wind=loop('bandpass',380,.6,.05);amb.water=loop('lowpass',900,.5,0);amb.glide=loop('bandpass',2200,2,0);amb.grind=loop('lowpass',300,1,0);amb.fount=loop('bandpass',1400,.4,0);
  birdLoop();
}
function birdLoop(){if(!AC)return;setTimeout(birdLoop,2500+Math.random()*6000);if(G.phase!=='play'||muted||document.hidden||G.region==='ch2')return;
  const base=2200+Math.random()*1600,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)tone(base*(1+Math.random()*.2),base*(.8+Math.random()*.5),.09,'sine',.018,i*.13);}
function tone(f0,f1,dur,type,vol,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.012);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+dur+.05);}
function noiseHit(dur,vol,freq,type,delay){if(!AC)return;const t0=AC.currentTime+(delay||0),n=AC.createBufferSource();n.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;const g=AC.createGain();
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0008,t0+dur);n.connect(f);f.connect(g);g.connect(sfxBus);n.start(t0,Math.random());n.stop(t0+dur+.05);}
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
  step:(surf,v)=>{v=v||1;if(surf==='wood'){tone(190,150,.09,'triangle',.07*v);noiseHit(.06,.08*v,900);}else if(surf==='stone'){noiseHit(.07,.13*v,1400,'bandpass');tone(95,60,.12,'sine',.16*v);}else{noiseHit(.12,.12*v,420);tone(70,45,.14,'sine',.12*v);}},
  tick:surf=>{noiseHit(.03,surf==='grass'?.035:.05,surf==='wood'?1500:2600,'bandpass');},
  pound:()=>{noiseHit(.5,.45,220);tone(90,32,.5,'sine',.4);noiseHit(.3,.15,900,'bandpass',.05);},
  crash:()=>{noiseHit(.9,.4,600);noiseHit(1.2,.25,180);for(let i=0;i<6;i++)tone(300+Math.random()*500,120,.15,'square',.02,.05+i*.08);},
  boing:big=>{tone(160,big?620:420,.35,'triangle',.09);tone(320,big?1240:840,.3,'sine',.04,.03);},
  seed:()=>{tone(1318,1318,.18,'sine',.05);tone(1760,1760,.25,'sine',.04,.07);},
  petal:()=>{[659,784,988,1318].forEach((f,i)=>tone(f,f,1.6,'sine',.06,i*.12));},
  secret:()=>{[523,659,784,1046,1318].forEach((f,i)=>tone(f,f*1.002,.9,'triangle',.045,i*.09));},
  stone:()=>{noiseHit(1.6,.18,260);tone(110,140,1.4,'sine',.07);},
  hum:()=>{tone(392,392,1.4,'sine',.05);tone(587,587,1.6,'sine',.04,.15);tone(784,784,1.8,'sine',.03,.3);},
  twinkle:()=>{tone(1760,2349,.12,'sine',.025);},
  pulse:()=>{tone(523,1046,.5,'sine',.07);tone(784,1568,.6,'sine',.045,.05);tone(1318,1760,.7,'sine',.025,.12);noiseHit(.4,.05,3200,'bandpass');},
  crystal:()=>{[1568,2093,2637].forEach((f,i)=>tone(f,f*1.003,.9,'sine',.03,i*.06));},
  drip:()=>{const f=1500+Math.random()*900;tone(f,f*.62,.07,'sine',.05);tone(f*.6,f*.4,.12,'sine',.022,.11);},
  swell:()=>{[262,330,392,523,659].forEach((f,i)=>{tone(f,f*1.001,4.5,'sine',.05,i*.35);tone(f*2,f*2,3,'sine',.015,i*.35+.1);});noiseHit(5,.3,1200,'bandpass',.2);},
};
function setMuted(m){muted=m;if(master)master.gain.value=m?0:.8;$('bMute').textContent=m?'Unmute sound':'Mute sound';}
function applyVolumes(){if(!AC)return;const st=PROG.settings;sfxBus.gain.value=st.sfx;musicBus.gain.value=st.music*.55;}
function updateAudio(dt){
  if(!AC)return;const t=AC.currentTime,focus=camTarget;
  let nearWater=0;
  if(G.region==='ch1')nearWater=Math.max(0,1-Math.abs(focus.z+30)/14)*.12+Math.max(0,1-Math.abs(focus.z+56)/8)*.04*(focus.x<0?1:.4)+(focus.x<-14&&focus.z<-44&&focus.z>-66?.08:0);
  else if(G.region==='vale'&&VALE.wake>.5)nearWater=Math.max(0,1-riverDist(focus.x,focus.z)/18)*.11;
  amb.water.g.gain.setTargetAtTime(G.phase==='play'?nearWater:0,t,.4);
  amb.wind.g.gain.setTargetAtTime(G.region==='ch2'&&G.phase==='play'?.018:(G.phase==='play'||G.phase==='title'?.05+Math.sin(t*.13)*.02:.02),t,.8);
  amb.glide.g.gain.setTargetAtTime(sprite.gliding&&G.phase==='play'?.04:0,t,.05);
  const ch2=G.region==='ch2'&&G.phase==='play',moving=ch2&&((mine.cart&&mine.cart.moved>0)||(mine.lift&&mine.lift.moving)||mine.boulder.st==='roll');
  amb.grind.g.gain.setTargetAtTime(golem.pushVis>0||moving?(mine.boulder.st==='roll'&&ch2?.45:.25):0,t,.08);
  if(ch2&&!muted&&Math.random()<dt*.45)SFX.drip();
  amb.fount.g.gain.setTargetAtTime(G.region==='ch1'&&(G.fountainOn||G.phase==='end')&&Math.hypot(focus.x-F.x,focus.z-F.z)<30?.12:0,t,.8);
  updateMusic(t);
}

// ================= calm generated music: a soft pad and a few plucks, per region =================
// Each bar picks the next chord of a short loop and plays it very quietly; plucks are sparse pentatonic notes.
const MUSIC={next:0,bar:0,key:''};
const SONGS={
  vale:{root:196.0,bar:4.8,prog:[[0,7,16],[-3,4,12],[-7,5,12],[-5,2,11]],pent:[0,2,4,7,9,12,14,16]},
  ch1:{root:174.6,bar:4.2,prog:[[0,7,14,16],[5,9,16],[-3,4,12],[2,9,14]],pent:[0,2,4,7,9,12,14]},
  ch2:{root:146.8,bar:6,prog:[[0,7,15],[-4,3,12],[-2,5,14],[-5,2,10]],pent:[0,3,5,7,10,12,15]},
  title:{root:220.0,bar:5.5,prog:[[0,7,16],[5,12,16],[-3,7,12],[-5,7,14]],pent:[0,2,4,7,9,12]},
};
const semi=(f,n)=>f*Math.pow(2,n/12);
function padNote(f,t0,dur,vol){const o=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),lp=AC.createBiquadFilter();
  o.type='triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*1.004;lp.type='lowpass';lp.frequency.value=1100;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+dur*.35);g.gain.linearRampToValueAtTime(0,t0+dur*1.15);
  o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(musicBus);o.start(t0);o2.start(t0);o.stop(t0+dur*1.2);o2.stop(t0+dur*1.2);}
function pluck(f,t0,vol){const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.01);g.gain.exponentialRampToValueAtTime(.0006,t0+1.6);o.connect(g);g.connect(musicBus);o.start(t0);o.stop(t0+1.7);}
function updateMusic(now){
  if(!AC||!musicBus||muted||document.hidden||PROG.settings.music<=0)return;
  const key=G.phase==='title'||G.phase==='brief'?'title':(G.region==='ch1'?'ch1':G.region==='ch2'?'ch2':'vale');
  if(key!==MUSIC.key){MUSIC.key=key;MUSIC.bar=0;MUSIC.next=Math.max(MUSIC.next,now+.3);}
  if(now<MUSIC.next-.25)return;
  const S=SONGS[key],t0=Math.max(now,MUSIC.next),ch=S.prog[MUSIC.bar%S.prog.length];
  for(const n of ch)padNote(semi(S.root,n),t0,S.bar,.035);
  padNote(semi(S.root,ch[0]-12),t0,S.bar,.03);
  const k=2+Math.floor(Math.random()*3);
  for(let i=0;i<k;i++){const n=S.pent[Math.floor(Math.random()*S.pent.length)]+12;pluck(semi(S.root,n),t0+(i+Math.random()*.6)*S.bar/k,.028);}
  MUSIC.bar++;MUSIC.next=t0+S.bar;
}

// ================= watchers (sounds, toasts, one-shot animations) — run on every client =================
const WATCH={};
function watch(key,val,fn){if(!(key in WATCH)){WATCH[key]=val;return;}if(WATCH[key]!==val){const old=WATCH[key];WATCH[key]=val;fn(val,old);}}
function resetWatch(){for(const k in WATCH)delete WATCH[k];}
function runWatchers(){
  watch('region',G.region,()=>{fadeIn();hudCache={};resetWatch();}); // every watcher starts fresh in a new region
  const ch1=G.region==='ch1';
  watch('gate',gate.open,v=>{if(v&&ch1&&!G.fountainOn){SFX.clunk();SFX.rumble(2.4);toast('The gate grinds open!');celebrate();}});
  watch('bridge',bridge.open,v=>{if(v&&ch1&&!G.fountainOn){SFX.clunk();SFX.creak();toast('The drawbridge lowers!');celebrate();}});
  watch('port',port.open,v=>{if(v&&ch1&&!G.fountainOn){SFX.clunk();SFX.rumble(2.2);toast('The portcullis locks open!');celebrate();}});
  watch('stones',stones.raised,v=>{if(v){SFX.stone();toast('Stepping stones rise from the water!');}});
  watch('pound',G.poundN,()=>poundFx(G.poundAt));
  watch('crack',G.crackN,()=>{SFX.crash();puff(34.8,0,-1.2,26,2.2,[.7,.66,.58],.5,2.2);toast('The floor gives way!');});
  watch('launch',G.launchN,()=>{SFX.boing(G.launchBig);sparkle(sprite.pos,G.launchBig?40:22);if(G.launchBig)hint('steer','Sprite: steer while you fly to land on a ledge.');else hint('pound','New: Ground Pound. Giant, jump and then press '+actKey('g')+' in mid-air to slam down. A slam on the seesaw throws the Sprite much higher.');});
  watch('seed',G.seedN,(v,o)=>{if(v>o){SFX.seed();const el=$('seedCount');el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');const n=seedsFound();if(n%10===0)toast(n+' golden seeds!');}});
  watch('petal',G.petalN,(v,o)=>{if(v>o)SFX.petal();});
  watch('secret',G.secretN,(v,o)=>{if(v>o){SFX.secret();toast('Secret found: '+G.lastSecret);}});
  watch('ws',G.wsN,(v,o)=>{if(v>o){SFX.hum();toast('Waystone awakened: '+G.lastWs);hint('ways','Waystones: press interact next to one to travel to any waystone you have woken.');}});
  watch('splash',G.splashN,(v,o)=>{if(v>o){SFX.splash();toast(nameOf(G.lastSplash)+' slipped into the water');}});
  watch('plant',G.plantN,(v,o)=>{if(v>o){SFX.chime();puff(VALE.plot.x,VALE.plot.y+.3,VALE.plot.z,18,1.6,[.95,.8,.9],.4,1.4);toast('Five seeds planted. Something is growing!');}});
  watch('wait',G.waitN,(v,o)=>{if(v>o)toast('Walk through together: '+(mode==='online'?'wait for your partner':'both of you')+'.');});
  watch('dlg',G.dlgN,(v,o)=>{if(v>o)showDialogue(G.dlg);});
  watch('travel',G.travelReq,(v,o)=>{if(v>o)openTravel();});
  watch('hop',G.hopN||0,(v,o)=>{if(v>o){SFX.twinkle();sparkle(sprite.pos,8);}});
  watch('pa',plates[0].on,v=>{if(v)SFX.click();});watch('pb',plates[1].on,v=>{if(v)SFX.click();});
  levers.forEach((l,i)=>watch('lv'+i,l.pulled,v=>{if(v)SFX.clunk();}));
  runes.forEach((r,i)=>watch('r'+i,r.state,(v,o)=>{
    if(v==='carried'){SFX.chime();const n=runes.filter(x=>x.state==='carried'||x.state==='placed').length;toast('Rune stone found ('+n+'/3)');}
    if(v==='placed'){SFX.place();}
    if(v==='free'&&o==='perched'){SFX.click();}
    if(v==='rolling'){SFX.rumble(1.4);}
  }));
  watch('placed',G.placed,v=>{if(G.fountainOn)return;if(v>=3)toast('All three runes are set. Wake the spout!');else if(v>0)toast(v+' of 3 runes set');});
  watch('fallN',G.fallN,()=>{if(!ch1)return;SFX.splash();toast(nameOf(G.lastFall==='g'?'g':'s')+' fell. Back to the checkpoint');});
  watch('held',sprite.held,v=>{if(v)SFX.lift();});
  watch('pick',G.pick,()=>{if(golem.A)golem.A.shot('PickUp',1.8);});
  watch('throws',G.throws,()=>{SFX.toss();if(golem.A)golem.A.shot('Throw',1.6);});
  watch('use',G.useN,()=>{if(sprite.A)sprite.A.shot('Interact',1.4);});
  watch('ending',G.ending,v=>{if(v){SFX.swell();toast('The fountain wakes!');celebrate();}});
  watch('sg',sprite.onGround,v=>{if(v&&!sprite.held)SFX.land();});
  // ---- the Lantern Mines ----
  if(G.region==='ch2'){
    watch('pulse',G.pulseN||0,(v,o)=>{if(v>o){startPulseFx(G.pulseAt);SFX.pulse();}});
    watch('lan',mine.lan,(v,o)=>{if(v>o){SFX.chime();toast('Lantern lit ('+countBits(v)+' of '+LANTERNS.length+')');}});
    watch('cryst',G.crystN||0,(v,o)=>{if(v>o)SFX.crystal();});
    watch('sw',G.swN||0,(v,o)=>{if(v>o){SFX.clunk();toast(mine.sw.b?'Switch set: toward the barricade':'Switch set: the dead end');}});
    watch('smash',G.smashN||0,(v,o)=>{if(v>o){SFX.crash();puff(31.3,1.5,-40.1,30,2.4,[.6,.48,.34],.5,2.4);toast('The barricade bursts open!');celebrate();}});
    watch('bump',G.bumpN||0,(v,o)=>{if(v>o){SFX.thud(1);if(mine.cart.br===0&&!mine.bar.broken)toast('Dead end. Push the cart back and set the switch.');}});
    watch('cw',mine.lift.cw,v=>{if(v){SFX.clunk();SFX.rumble(1.2);toast('The counterweight drops free!');}});
    watch('rollB',G.rollN||0,(v,o)=>{if(v>o){SFX.rumble(3);toast('A boulder! Run, and hide in the hollow!');}});
    watch('bowl',G.bowlN||0,(v,o)=>{if(v>o){SFX.crash();toast('Bowled over! Back up the drift. Run for the hollow.');}});
    watch('wall',G.wallN||0,(v,o)=>{if(v>o){SFX.crash();puff(8.5,8,-62.5,36,3,[.6,.56,.5],.6,2.6);toast('The boulder smashes through the wall!');}});
    watch('boom',G.boomN||0,(v,o)=>{if(v>o){SFX.pound();puff(mine.boulder.x,.2,MINE.driftZ,26,3,[.55,.5,.45],.6,1.6);}});
    watch('door2',mine.door.open,v=>{if(v){SFX.clunk();SFX.rumble(2);toast('The iron door grinds open. A shortcut back to the yard.');}});
    LSTONES.forEach((st,i)=>watch('ls'+i,st.state,v=>{if(v==='carried'){SFX.chime();const n=LSTONES.filter(x=>x.state!=='rest').length;toast('Lantern stone found ('+n+'/3)');}if(v==='placed')SFX.place();}));
    watch('mplaced',mine.placed,v=>{if(minesDone()||G.ending)return;if(v>=3)toast('All three stones are set. Light the Great Lantern from the top!');else if(v>0)toast(v+' of 3 lantern stones set');});
    watch('fall2',G.fallN,()=>{SFX.splash();toast(nameOf(G.lastFall==='g'?'g':'s')+' fell into the dark. Back to safe ground');});
    watch('ending2',G.ending,v=>{if(v){SFX.swell();toast('The Great Lantern wakes!');celebrate();}});
  }
}

// ================= HUD helpers =================
let toastT=0,hintT=0;
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;toastT=3.2;}
const hintsShown=new Set();
function hint(id,text){if(hintsShown.has(id))return;hintsShown.add(id);$('hint').textContent=text;$('hint').style.opacity=1;hintT=8;}
function keysFor(role){
  if(mode==='online')return role==='g'?
    [['Move','WASD / Arrows'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']]:
    [['Move','WASD / Arrows'],['Jump · glide','Space (hold)'],['Interact · light pulse','E'],['Camera','Q / R'],['Chat','Enter, 1–4 quick']];
  return role==='g'?[['Move','W A S D'],['Jump','Space'],['Pick up · throw','E (hold to charge)'],['Camera','Q / R']]:
    [['Move','Arrow keys or I J K L'],['Jump · glide','Enter or O (hold)'],['Interact · light pulse','Right Shift, U or /']];
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
  if(g.pound)return 'Slam!';
  const ch1=G.region==='ch1';
  if(inCh2()){
    if(g.winding)return 'Keep holding '+k+': winding the lift';
    if(g.runes>0&&dxz(g.pos,GL.sock)<3.4&&Math.abs(g.pos.y-.4)<1)return k+': set the lantern stones in the Great Lantern';
    for(const st of LSTONES)if(st.state==='rest'&&stoneReach(g,st))return k+': take the lantern stone';
    if(dxz(g.pos,WINCH_B)<2.2&&Math.abs(g.pos.y)<1)return 'Hold '+k+': wind the lift up';
  }
  if(ch1&&g.runes>0&&dxz(g.pos,F)<4.7)return k+': set the rune stones in the fountain';
  if(ch1)for(const r of runes)if((r.state==='rest'||r.state==='free')&&dxz(g.pos,r.pos)<1.9){const dy=r.pos.y-g.pos.y;if(dy>-.7&&dy<2.2)return k+': take the rune stone';}
  if(!sprite.held&&dxz(g.pos,sprite.pos)<1.75){const dy=sprite.pos.y-g.pos.y;if(dy>-.7&&dy<2.75)return k+': pick up '+nameOf('s');}
  if(G.region==='vale'&&plotNear(g)&&seedsToPlant()>=5)return k+': plant 5 golden seeds ('+seedsToPlant()+' to plant)';
  if(nearWaystone(g))return k+': travel from the waystone';
  if(!g.onGround&&g.airT>.12&&hintsShown.has('pound'))return k+' in mid-air: ground pound';
  if(ch1&&dxz(g.pos,block.pos)<1.8&&g.pos.y<block.pos.y+.3)return 'Walk into the block to push it';
  if(inCh2()&&dxz(g.pos,mine.cart.p)<2&&g.pos.y<.5&&!(mine.cart.br===1&&mine.cart.s>mine.cart.sJ+.5))return 'Walk into the cart to push it along the rails';
  if(ch1&&dxz(g.pos,{x:SEESAW.x-2.55,z:SEESAW.z})<2.6&&seesaw.tilt<0)return 'Jump onto the orange end of the seesaw';
  return '';
}
function spritePrompt(){
  const s=sprite;if(G.ending)return '';
  if(s.held)return jumpKey('s')+': leap off. Or wait to be thrown';
  if(s.winding)return 'Keep holding '+actKey('s')+': winding the lift';
  const t=spriteTarget();if(t)return actKey('s')+': '+t.label.toLowerCase();
  if(inCh2()&&!G.ending)return actKey('s')+': light pulse';
  if(!s.onGround&&!s.gliding&&s.vel.y<0)return 'Hold '+jumpKey('s')+' to glide';
  if(G.region==='ch1'&&!G.fountainOn&&G.placed>=3&&dxz(s.pos,W.spout)<4)return 'Get onto the spout at the top of the fountain';
  if(G.region==='ch1'&&seesaw.tilt<0&&Math.abs(s.pos.x-(SEESAW.x+2.7))<1.6&&Math.abs(s.pos.z-SEESAW.z)<1.4)return 'Stand in the mint cup, then wait for the Giant';
  return '';
}
function objectiveText(){
  if(G.region==='vale'){
    if(!PROG.ch1.done)return 'Explore the Vale. When you are ready, walk through the glowing North Gate together to enter Chapter 1: The Sunken Garden.';
    if(seedsToPlant()>=5)return 'You have '+seedsToPlant()+' golden seeds to plant. Bring them to the Seed Garden by the Meadow waystone.';
    if(!PROG.ch2.done)return 'The first root is awake. The gate to the Lantern Mines glows in the eastern hills, past the lookout: walk through it together for Chapter 2.';
    return 'Two roots are awake. Explore the Vale, plant seeds, or return to the Sunken Garden and the Lantern Mines for what you missed. Chapter 3 arrives in a later update.';}
  if(inCh2())return mineObjective();
  if(G.ending)return 'The fountain wakes.';
  if(G.fountainOn)return 'The fountain runs again. Look for missed seeds, memory petals and secrets, or walk back through the south gate to the Vale.';
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
  const obj=objectiveText();if(hudCache.objText!==obj)objShowT=10;setText('objText',obj);
  if(helpOpen)setText('helpGoal',obj);
  const cs=seedsFound()+'|'+countKeys(PROG.petals)+'|'+G.region;if(hudCache.cnt!==cs){if(hudCache.cnt)cntShowT=4;hudCache.cnt=cs;}
  objShowT-=dt;cntShowT-=dt;chipT+=dt;
  const ch1=G.region==='ch1',ch2=G.region==='ch2';$('runeList').hidden=ch2?minesDone():(!ch1||G.fountainOn);$('timerWrap').hidden=!ch1&&!ch2;
  setText('regName',curReg?curReg.short:'');setText('seedCount',String(seedsFound()));setText('petalCount',countKeys(PROG.petals)+'/'+MEMS.length);
  const rl=$('runeList');const list=ch2?LSTONES:runes,sig=G.region+list.map(r=>r.state).join();
  if(hudCache.runes!==sig){hudCache.runes=sig;rl.textContent='';for(const r of list){const d=document.createElement('div');const st=r.state==='carried'?'carried':r.state==='placed'?'placed':'';d.className=st;
    d.textContent=(ch2?r.where:r.where.split(' ')[1].replace(/^./,c=>c.toUpperCase()))+(st==='carried'?' · carried':st==='placed'?' · set':'');d.title=r.where;rl.appendChild(d);}}
  const inWW=ch1&&(golem.pos.z<-44||sprite.pos.z<-44)&&golem.pos.x>-11&&!port.open;$('plates').hidden=!inWW;
  if(inWW){$('plA').classList.toggle('on',plates[0].on);$('plB').classList.toggle('on',plates[1].on);$('latch').firstChild.style.width=(latch.t/1.1*100)+'%';}
  const m=Math.floor(G.time/60),s=Math.floor(G.time%60);setText('timer',m+':'+(s<10?'0':'')+s);
  const pg=golemPrompt(),ps=spritePrompt();setText('promptG',pg);setText('promptS',ps);
  $('cardG').classList.toggle('empty',!pg);$('cardS').classList.toggle('empty',!ps);
  $('obj').classList.toggle('show',helpOpen||objShowT>0||inWW);$('topRight').classList.toggle('show',helpOpen||cntShowT>0);
  $('helpChip').classList.toggle('off',helpUsed||chipT>30);
  const ch=$('charge');const showCh=golem.charging&&(mode==='local'||myRole==='g');ch.hidden=!showCh;if(showCh)ch.querySelector('b').style.width=(golem.charge*100)+'%';
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0;}
  if(hintT>0){hintT-=dt;if(hintT<=0)$('hint').style.opacity=0;}
  const mineG=mode==='local'||myRole==='g',mineS=mode==='local'||myRole==='s';
  // the Giant at a lever: only the Sprite's small hands can pull one
  if(mineG){for(const l of (G.region==='vale'?VLEVERS:inCh1()?levers:inCh2()?MLEVERS:[]))if(!(l.pulled&&l.id!=='switch')&&dxz(golem.pos,l.pos)<2.4&&Math.abs(golem.pos.y-l.pos.y)<1.6&&dxz(sprite.pos,l.pos)>1.6){hint('glever','Only the Sprite can pull levers. Bring the Sprite here and press '+actKey('s')+'.');break;}}
  if(G.region==='vale'){
    {const E=CAVES[1];if(mineS&&!VCAVE.echo.raised&&(sprite.pos.x-E.x)*E.dir>2.2&&inCave(sprite.pos.x,sprite.pos.z,0)===E)hint('echolever','Sprite: pull the lever at the back of the cave ('+actKey('s')+'). It raises steps for the Giant.');}
    if(mineS&&!VCAVE.grotto.open&&inCave(sprite.pos.x,sprite.pos.z,4)===CAVES[0])hint('grotto','Sprite: slip under the stone door, then pull the lever inside to lift it for the Giant.');
    if(!VCAVE.echo.raised&&(inCave(golem.pos.x,golem.pos.z,4)===CAVES[1])&&(sprite.pos.x-CAVES[1].x)*CAVES[1].dir<2.2)hint('echo','Giant: lift the Sprite. Sprite: jump from the Giant\'s head over the wall.');
    if(mineG||mineS){if(plotNear(golem)||plotNear(sprite))hint('plot','Seed Garden: every 5 golden seeds you plant here grow into flowers. Your garden shows your progress.');}
    return;}
  if(ch2){mineHints(mineG,mineS);return;}
  if(dxz(golem.pos,{x:SEESAW.x,z:SEESAW.z})<6.5||dxz(sprite.pos,{x:SEESAW.x,z:SEESAW.z})<6.5)hint('seesaw','Seesaw: the Sprite stands in the mint cup. The Giant jumps onto the orange end, and the Sprite flies.');
  if(!crack.broken&&dxz(golem.pos,{x:34.8,z:-1.2})<3){if(hintsShown.has('pound'))hint('crack','A cracked slab. A ground pound might break it.');else hint('pound','New: Ground Pound. Giant, jump and then press '+actKey('g')+' in mid-air to slam down. That cracked slab looks weak.');}
  if(stones.raised===false&&(dxz(sprite.pos,{x:-24.5,z:-55})<2.5||dxz(golem.pos,{x:-24.5,z:-55})<2.5))hint('island','Too far to jump. Giant: throw the Sprite to the island.');
  if(G.time>1.5&&G.time<2.5)hint('start','Press H any time for help: your goal and every key.');
  if(mineS&&!gate.open&&dxz(sprite.pos,{x:10.5,z:-15.4})<4)hint('hole','Sprite: the glowing gap in the east wall is just big enough for you.');
  if(mineG&&runes[0].state==='rest'&&dxz(golem.pos,block.pos)<3)hint('block','Giant: push the stone block against the ledge, then climb up to the rune stone.');
  if(gate.open&&!bridge.open&&(golem.pos.z<-24||sprite.pos.z<-24))hint('ravine','Too far to jump. Giant: pick up the Sprite with '+actKey('g')+', hold it to charge a long throw. The Sprite can glide.');
  if(bridge.open&&runes[1].state==='perched'&&dxz(golem.pos,runes[1].pos)<6)hint('column','The rune stone is too high. Giant: tap '+actKey('g')+' for a short high lob onto the column.');
  if(gate.open&&runes[2].state==='vault'&&dxz(sprite.pos,{x:-6.2,z:-47.3})<4&&mineS)hint('vault','Sprite: crawl into the vault through the glowing slot and pull the lever.');
  if(!port.open&&(golem.pos.z<-50||sprite.pos.z<-50))hint('plates','Two plates must be held at once. Giant on the big one, Sprite slips into the alcove on the right.');
  if(port.open&&(golem.pos.z<-64||sprite.pos.z<-64))hint('fountain','Giant: set the runes into the fountain. Then lift the Sprite and let it leap onto the spout.');
  if(mineS&&sprite.airT>.45&&!sprite.held&&G.region==='ch1')hint('glide','Sprite: hold jump while falling to glide.');
  if(!stair.raised&&PROG.secrets.c1_balcony&&dxz(golem.pos,{x:19,z:-21.9})<4)hint('stair','A stair is sunk into the ground here. Its lever must be up on the balcony.');
  if(!pav.open&&dxz(golem.pos,{x:31,z:-70})<6)hint('tower','Giant: lift the Sprite and tap '+actKey('g')+' for a high lob onto the tower ledge.');
  if(!pav.open&&dxz(golem.pos,{x:20,z:-66})<4.5)hint('pavgate','The Sun Pavilion is locked. Its lever is up on the tower ledge.');
  if(pav.open&&!pav.lit&&(dxz(golem.pos,{x:pav.cx,z:pav.cz})<4.5||dxz(sprite.pos,{x:pav.cx,z:pav.cz})<4.5))hint('sun','Stand on the golden sun together.');
}

// ================= the Lantern Mines: goal, hints =================
function mineObjective(){
  const g=golem,s=sprite,C=mine.cart,B=mine.boulder,L=mine.lift;
  if(G.ending)return 'The Great Lantern wakes.';
  if(minesDone())return 'The mines glow again, and the crystal bridges stay lit. Look for missed seeds, memory petals and secrets, or walk back out through the Mine Mouth to the Vale.';
  if(g.pos.z>-14&&s.pos.z>-14&&!mine.bar.broken)return lanLit(LANTERNS[0])?'Cross the chasm on the crystal bridge. Sprite: send a light pulse next to its glowing posts, then cross together before the light fades.':'It is dark down here. Sprite: press '+actKey('s')+' with nothing nearby to send out a light pulse. Light the lantern, then the crystal bridge.';
  if(!mine.bar.broken){if(C.br===0&&C.s>C.sJ)return 'The cart rolled to the dead end. Giant: push it back past the junction. Sprite: flip the switch on the scaffold toward the barricade.';
    return mine.sw.b?'The switch points at the barricade. Giant: push the cart along the rails, past the junction, and let it roll.':'A barricade blocks the tunnel east. Send the mine cart crashing into it: the Sprite flips the track switch up on the scaffold, the Giant pushes the cart.';}
  if(LSTONES[0].state==='rest')return 'Cross the Crystal Gallery to the far island and take the lantern stone. Bridges only hold while lit; one can only be lit from the far side.';
  if(LSTONES[1].state==='rest'){
    if(g.pos.y<5){if(!L.cw)return s.pos.y>5?'Sprite: free the jammed counterweight up top. Then the lift is light enough for you to wind the Giant up.':'Ride the pulley lift up to the high drift. Sprite: step into the lift. Giant: hold '+actKey('g')+' at the big winch, and keep holding until the Sprite is off.';
      return 'Giant: step into the lift. Sprite: hold '+actKey('s')+' at the little winch up top to wind the Giant up.';}
    return 'Take the lantern stone from the ledge on the high drift.';}
  if(!mine.wall.broken||B.st==='roll'||B.st==='wait')return 'Run west along the drift and hide in the hollow in the north wall. Let the boulder roll past.';
  if(g.pos.y>4.5&&g.pos.x>-4)return 'The boulder broke through into a great hall. Walk west along the drift and jump down into it.';
  if(LSTONES[2].state==='rest')return 'The last lantern stone sits across the dark pit in the hall. A hidden crystal path crosses it: the Sprite walks ahead and keeps pulsing, the Giant steps only where it glows.';
  if(mine.placed<3)return 'Giant: stand by the Great Lantern and set the lantern stones into its base.';
  return 'Light the Great Lantern. Giant: stand on its plinth, lift the Sprite and tap '+actKey('g')+' to lob it onto the top. Sprite: send out a light pulse from there.';
}
function mineHints(mineG,mineS){
  const g=golem,s=sprite,C=mine.cart,L=mine.lift,B=mine.boulder;
  if(G.time>1.5&&G.time<3&&!lanLit(LANTERNS[0]))hint('pulse','New: Light Pulse. Sprite, press '+actKey('s')+' with nothing nearby to send out a pulse of light. It lights lanterns and wakes crystals.');
  if(!minesDone()&&CRYST[0].t<=0&&(g.pos.z<-11&&g.pos.z>-14||s.pos.z<-11&&s.pos.z>-14)&&lanLit(LANTERNS[0]))hint('cbridge','Crystal bridges only hold while lit. Sprite: pulse next to the glowing posts, then cross together before the light fades.');
  if(!mine.bar.broken&&dxz(g.pos,C.p)<3)hint('cart','Giant: walk into the cart to push it along the rails. Where it goes depends on the track switch.');
  if(!mine.bar.broken&&!mine.sw.b&&(dxz(g.pos,{x:6,z:-34})<4||dxz(s.pos,{x:6,z:-34})<4))hint('switch','The track switch lever is up on the scaffold. Giant: lift the Sprite with '+actKey('g')+' so it can leap up from your head.');
  if(LSTONES[0].state==='rest'&&s.pos.x>45.5&&s.pos.x<50.5&&s.pos.z<-38.5&&s.pos.z>-43.5&&s.pos.y<1&&CRYST[2].t<=0)hint('throwI2','The next bridge can only be lit from the far island. Giant: throw the Sprite across.');
  if(!L.cw&&g.pos.x>52&&g.pos.y<1&&g.pos.z<-54)hint('liftA','Sprite: step into the lift. Giant: hold '+actKey('g')+' at the big winch to wind it up, and keep holding until the Sprite is off.');
  if(!L.cw&&s.pos.y>5&&s.pos.x>40&&mineS)hint('liftB','Sprite: free the counterweight with '+actKey('s')+'. Then the lift is light enough for you to wind it.');
  if(L.cw&&g.pos.y<1&&g.pos.x>52&&LSTONES[1].state==='rest')hint('liftC','Giant: step into the lift. Sprite: hold '+actKey('s')+' at the little winch up top.');
  if(B.st==='wait'||B.st==='roll')hint('chase','Run west along the drift and hide in the hollow in the wall!');
  if(LSTONES[2].state==='rest'&&(dxz(g.pos,{x:-21,z:-57})<4||dxz(s.pos,{x:-21,z:-57})<4))hint('pit','A path crosses the pit, hidden in the dark. Sprite: walk ahead and keep pulsing. Giant: step only where it glows.');
  if(mine.placed>=3&&(dxz(g.pos,{x:GL.x,z:GL.z})<6))hint('glob','Giant: stand on the plinth, lift the Sprite and tap '+actKey('g')+' to lob it onto the Great Lantern. Sprite: pulse from the top.');
  if(!mine.crack.broken&&dxz(g.pos,{x:-7.5,z:-79.5})<3)hint('crack2','This floor sounds hollow. Giant: a ground pound might break it.');
  if(mineS&&dxz(s.pos,{x:-9.5,z:-27})<3.5)hint('hole2','Sprite: the glowing gap in the wall is just your size.');
}

// ================= story: scenes, dialogue, memory cards =================
// Narration says "the Giant" and "the Sprite"; dialogue uses the players' own names.
const SCENES={
  prologue:{title:'Book 1: The Seven Roots',lines:[
    {text:'Long ago, the Everbloom Vale was kept alive by one great Heart Tree. Its seven roots carried water to seven realms.',p:[[46,44,124],[28,30,104]],l:[[0,22,0],[0,24,0]]},
    {text:'Then came the Hush: a long, silent storm. The roots stopped. The rivers dried, the gardens sank, and the Heart Tree fell asleep.',p:[[-40,26,104],[-8,20,96]],l:[[-20,0,50],[16,0,48]]},
    {text:'Before it slept, the tree woke its two oldest caretakers: a Giant shaped from riverstone, and a Sprite made from one of its blossoms.',p:[[18,6,74],[8,10,62]],l:[[0,14,0],[0,22,0]]},
    {text:'They remember nothing. Not the Vale, not the tree, not even each other.',p:[[7,4.5,97],[3.5,3.6,93.5]],l:[[0,1.6,88],[0,1.4,87.5]]},
    {text:'The first root runs north, to the Sunken Garden. Its gate is already glowing.',p:[[0,15,-58],[0,10,-86]],l:[[0,6,-108],[0,6,-108]]}],
    after(){hint('map','Press M for the map. Esc opens the menu, the journal and settings.');}},
  ch1_intro:{title:'Chapter 1: The Sunken Garden',lines:[
    {text:'The Sunken Garden was the first realm the Heart Tree fed. Its fountain has stood dry since the Hush.',p:[[14,12,-58],[8,9,-65]],l:[[0,2,-72],[0,2,-72]]},
    {text:'Three rune stones are hidden in its walls. Set them in the fountain and the first root will wake.',p:[[0,17,-18],[0,17,-42]],l:[[0,0,-30],[0,0,-50]]},
    {text:'Look closely, too. Some memories do not want to stay buried.',p:[[17,10,2],[21,11,-3]],l:[[28,3,-18],[28,4.5,-21]]},
    {text:'Work together. Neither of you can do this alone.',p:[[0,9,9],[0,7,4.5]],l:[[0,1,-3],[0,1,-3]]}]},
  root1:{title:'The first root wakes',lines:[
    {text:'Far away, deep under the Vale, the first root stirs.',p:[[44,14,74],[30,16,58]],l:[[0,4,0],[0,10,0]]},
    {text:'Water returns to the riverbed. The grey trees remember their green.',p:[[-20,16,80],[22,15,82]],l:[[-12,0,52],[20,0,48]]},
    {text:'Six roots still sleep. A second gate, to the Lantern Mines in the eastern hills, has begun to glow.',p:[[30,30,-6],[44,26,-24]],l:[[78,8,-72],[78,8,-72]]}]},
  ch2_intro:{title:'Chapter 2: The Lantern Mines',lines:[
    {text:'The Lantern Mines run deep under the eastern hills. Long ago, someone dug them to lead the young roots through the dark.',p:[[0,7,15],[0,5,9]],l:[[0,1.6,0],[0,1.6,-7]]},
    {text:'Since the Hush, every lantern has gone out. Even the crystals have stopped shining.',p:[[10,15,-14],[18,17,-26]],l:[[8,0,-32],[40,0,-40]]},
    {text:'Three lantern stones are lost somewhere in the dark. Set them in the Great Lantern and the second root will wake.',p:[[-4,18,-52],[-9,16,-56]],l:[[-17,3,-70],[-17,4,-70]]},
    {text:'Stay close to the Sprite. Its light is the brightest thing down here.',p:[[0,6,6],[0,4.6,3.5]],l:[[0,1,-2],[0,1,-2]]}]},
  root2:{title:'The second root wakes',lines:[
    {text:'Deep under the eastern hills, the second root wakes.',p:[[96,30,-34],[88,24,-50]],l:[[78,6,-72],[78,9,-72]]},
    {text:'One by one, lanterns flicker on along the Vale\u2019s old paths.',p:[[-10,9,78],[8,8,50]],l:[[0,1.5,48],[0,1.5,16]]},
    {text:'Five roots still sleep. The gate to the Windmill Heights has begun to flicker. (Chapter 3 arrives in a later update.)',p:[[60,30,34],[72,34,16]],l:[[104,6,-8],[104,8,-8]]}]},
};
function playScene(id){if(!SCENES[id])return;G.scene=id;G.line=0;G.lineT=0;PROG.seen[id]=1;saveSoon();}
function storyNext(){const S=SCENES[G.scene];if(!S){G.scene='';return;}G.line++;G.lineT=0;if(G.line>=S.lines.length){const id=G.scene;G.scene='';G.line=0;camSnap=true;if(S.after)S.after();}}
function skipScene(){let n=0;while(G.scene&&n++<20)storyNext();}
// camera during a scene: a slow glide from one framing to the next (a still shot with reduced camera motion)
function sceneCamera(){
  const S=SCENES[G.scene];if(!S)return false;const L=S.lines[Math.min(G.line,S.lines.length-1)];
  const k=PROG.settings.camMotion==='reduced'?1:smooth(0,1,Math.min(1,G.lineT/8));
  camera.position.set(lerp(L.p[0][0],L.p[1][0],k),lerp(L.p[0][1],L.p[1][1],k),lerp(L.p[0][2],L.p[1][2],k));
  camTarget.set(lerp(L.l[0][0],L.l[1][0],k),lerp(L.l[0][1],L.l[1][1],k),lerp(L.l[0][2],L.l[1][2],k));camera.lookAt(camTarget);return true;
}
let storySig='';
function updateStoryUI(){
  const on=!!G.scene&&G.phase==='play';$('story').hidden=!on;$('hud').classList.toggle('scene',on||!!G.card);$('overlay').classList.toggle('scene',on);if(!on){storySig='';return;}
  const S=SCENES[G.scene],sig=G.scene+G.line;if(sig===storySig)return;storySig=sig;
  $('storyTitle').textContent=S.title;$('storyText').textContent=S.lines[G.line].text;
  $('storyDots').textContent=S.lines.map((_,i)=>i===G.line?'●':'○').join(' ');
  $('storyHelp').textContent=mode==='online'?(role==='host'?'Either of you: jump or interact to continue · Esc skips':'Either of you: jump or interact to continue'):'Jump or interact to continue · Esc skips';
}

// short lines spoken by the characters (speech bubbles + chat log), triggered by walking somewhere
const DLG={
  v1:{who:'s',text:"{g}? I think that's your name. Why do I know your name?",next:'v1b'},
  v1b:{who:'g',text:"{s}… I don't remember either. But that big tree feels like home."},
  v2:{who:'g',text:"It's asleep. I can hear it breathing, very slowly.",next:'v2b'},
  v2b:{who:'s',text:"The glow is coming from the north gate. Let's go, {g}!"},
  v3:{who:'s',text:'The Sunken Garden… We go through together, okay?'},
  v4:{who:'s',text:'A seed garden! {g}, we could plant the golden seeds we find.'},
  v5:{who:'g',text:'This gate is sealed. Its root must still be asleep.'},
  v6:{who:'s',text:"The river's back! Don't fall in, {g}. You'd sink like a stone.",next:'v6b'},
  v6b:{who:'g',text:'I am a stone, {s}.'},
  v7:{who:'s',text:'You can see the whole Vale from up here.'},
  v8:{who:'s',text:"A cave! The door is stuck, but there's a gap under it just my size."},
  v9:{who:'g',text:'This wall is too high for me. Up on my head, {s}, and over you go.'},
  v10:{who:'s',text:'Hello… hello… hello! {g}, it answers!'},
  c1:{who:'s',text:"It's so quiet here… stay close, {g}."},
  c2:{who:'s',text:"{g}, if you jump on the orange end, I bet I'd fly!"},
  c3:{who:'g',text:'Higher? Maybe if I really slam it down…'},
  c4:{who:'g',text:'This floor sounds hollow, {s}.'},
  c5:{who:'s',text:'Too deep for me. Too deep for you too, {g}.'},
  c6:{who:'g',text:'Too far to jump. Ready to fly, {s}?'},
  c7:{who:'s',text:'Listen. Water, deep under the stones.'},
  c8:{who:'s',text:'A lever! Maybe it lifts those sunken stones.'},
  c9:{who:'s',text:'I can fly back… no, I really can’t. Pull the lever?'},
  c10:{who:'s',text:"{g}! There's a lever up here, and the stones along the wall look loose."},
  c11:{who:'g',text:'An old water walk. It still holds. Look how far you can see, {s}.'},
  c12:{who:'s',text:'That ledge on the tower is too high for me. Toss me up, {g}?'},
  c13:{who:'g',text:'Someone stood on that sun every morning, side by side. I think it was us. Come stand with me, {s}.'},
  c14:{who:'s',text:'Hold still, {g}… there. A crown of sun-flowers. It suits you.'},
  mi1:{who:'s',text:"It's so dark… stay close to my light, {g}."},
  mi2:{who:'g',text:'Can you make it brighter, {s}? Like a little sun?'},
  mi3:{who:'s',text:'A bridge made of crystal! It only shines while I do.'},
  mi4:{who:'g',text:'A mine cart, still full of ore. If I give it a good shove…'},
  mi5:{who:'s',text:'The track switch is up on that scaffold. Give me a lift, {g}?'},
  mi6:{who:'g',text:"Those bridges won't wait for me. You light them, I run."},
  mi7:{who:'s',text:"Throw me across, {g}. I'll light the way back for you."},
  mi8:{who:'g',text:'A lift. I wind, you ride, {s}.'},
  mi9:{who:'s',text:'The counterweight is jammed up here. If I free it, even I could wind this thing.'},
  mi10:{who:'s',text:'Run, {g}! Into the hollow in the wall!'},
  mi11:{who:'g',text:'The Great Lantern… I remember carving it. Long, long ago.'},
  mi12:{who:'s',text:"There's a path across, hidden in the dark. Follow my light, {g}."},
  mi13:{who:'s',text:'Someone lived down here. Look: a tiny bed of moss, just my size.'},
  mi14:{who:'g',text:'That was close, {s}. Too close.'},
};
const fill=t=>t.replace(/\{g\}/g,nameOf('g')).replace(/\{s\}/g,nameOf('s'));
let dlgPending=null;
function showDialogue(id){const d=DLG[id];if(!d)return;const t=fill(d.text);showBubble(d.who,t);if(mode==='online')addChatLine(d.who,t);}
function tickDialogue(dt){if(dlgPending){dlgPending.t-=dt;if(dlgPending.t<=0){G.dlg=dlgPending.id;G.dlgN++;dlgPending=null;}}}

// ================= memory petals =================
const MEMS=[
  {id:'m0',where:'The Vale: the lookout hill',title:'Two Shadows',text:'A memory with no beginning: two shadows on a hillside, one huge and one tiny, watching the same sunrise.'},
  {id:'m1',where:'Chapter 1: the hidden balcony',title:'The First Seed',text:'A muddy riverbank and a tiny light. The Sprite was guarding a single seed, far too heavy to carry alone. A stone Giant knelt down and held out one hand.'},
  {id:'m2',where:'Chapter 1: the cellar',title:'Across the Vale',text:'Nine days of walking. The Giant carried the seed; the Sprite rode on the Giant’s head and sang to keep the rain away.'},
  {id:'m3',where:'Chapter 1: the flooded island',title:'Where Water Sleeps',text:'They found a hollow where the river bent. “Here,” said the Sprite. The Giant pressed the seed into the soft earth with one careful thumb.'},
  {id:'m4',where:'The Vale: the glow-worm grotto',title:'The Long Winter',text:'Snow filled the hollow. The Giant sat around the little shoot all winter like a wall, and the Sprite slept in a crack in his shoulder, glowing just enough to keep it warm.'},
  {id:'m5',where:'The Vale: the echo cave',title:'First Leaves',text:'In spring the shoot opened its first leaves. The Sprite gave every leaf a name. The Giant could never remember them, but he laughed each time he tried.'},
  {id:'m6',where:'Chapter 2: the lamp room',title:'Little Lanterns',text:'The young tree was afraid of the dark. Every night the Sprite sat in its branches and glowed, and the Giant carved little crystal lanterns so she could rest.'},
  {id:'m7',where:'Chapter 2: the crystal cellar',title:'Tunnels for the Roots',text:'When the roots grew deep, the Giant dug tunnels ahead of them so they would never lose their way. The Sprite walked in front, lighting every turn.'},
  {id:'m8',where:'Chapter 2: the far crystal island',title:'The First Glow',text:'One night a root shone for the very first time, a thread of light running through the dark. The Sprite cheered so loudly the whole mountain echoed, and the Giant laughed until the tunnels shook.'},
];
function drawMemory(c,id,W,H){
  const sky=c.createLinearGradient(0,0,0,H);
  const pal={m0:['#ffd9a8','#f7a7a0'],m1:['#bfe3f2','#e6f3e0'],m2:['#9fb8c9','#d2dfe0'],m3:['#ffe7b8','#cfe9c8'],m4:['#c9d6e6','#f1f4f7'],m5:['#d9f0c4','#fff3cf'],m6:['#1f2a4a','#4a4f78'],m7:['#3a2c22','#5e4a38'],m8:['#141a2a','#2c3550']}[id]||['#bfe3f2','#e6f3e0'];
  sky.addColorStop(0,pal[0]);sky.addColorStop(1,pal[1]);c.fillStyle=sky;c.fillRect(0,0,W,H);
  const hill=(y,col,amp,ph)=>{c.fillStyle=col;c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=8)c.lineTo(x,y+Math.sin(x/W*Math.PI*2*1.2+ph)*amp);c.lineTo(W,H);c.fill();};
  const giant=(x,y,s,kneel)=>{c.fillStyle='#8c7a6a';c.beginPath();c.ellipse(x,y-60*s*(kneel?.75:1),42*s,58*s*(kneel?.75:1),0,0,7);c.fill();c.beginPath();c.arc(x+(kneel?14*s:0),y-(kneel?112:128)*s,24*s,0,7);c.fill();
    c.fillStyle='#a7957f';c.beginPath();c.ellipse(x-30*s,y-70*s,13*s,30*s,.4,0,7);c.fill();c.beginPath();c.ellipse(x+34*s,y-(kneel?50:70)*s,13*s,30*s,kneel?-1.1:-.4,0,7);c.fill();};
  const spr=(x,y,s)=>{const g=c.createRadialGradient(x,y,0,x,y,34*s);g.addColorStop(0,'rgba(220,255,245,.95)');g.addColorStop(1,'rgba(120,240,210,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,34*s,0,7);c.fill();
    c.fillStyle='#e9fff8';c.beginPath();c.arc(x,y,7*s,0,7);c.fill();c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.ellipse(x-10*s,y-6*s,9*s,5*s,-.5,0,7);c.fill();c.beginPath();c.ellipse(x+10*s,y-6*s,9*s,5*s,.5,0,7);c.fill();};
  const seed=(x,y,s)=>{c.fillStyle='#e2a93b';c.beginPath();c.ellipse(x,y,10*s,13*s,0,0,7);c.fill();c.fillStyle='#9a6a3e';c.beginPath();c.ellipse(x,y-11*s,11*s,5*s,0,0,7);c.fill();};
  if(id==='m0'){c.fillStyle='#fff2c6';c.beginPath();c.arc(W*.72,H*.62,46,0,7);c.fill();hill(H*.66,'#9cc47a',14,1);hill(H*.8,'#7fb062',10,2.5);
    c.fillStyle='rgba(60,50,60,.35)';c.beginPath();c.ellipse(W*.32,H*.82,90,14,0,0,7);c.fill();giant(W*.35,H*.8,1.1);spr(W*.47,H*.62,1.2);}
  else if(id==='m1'){hill(H*.6,'#9cc47a',12,.4);c.fillStyle='#7fb7c9';c.beginPath();c.moveTo(0,H*.74);c.bezierCurveTo(W*.3,H*.68,W*.6,H*.86,W,H*.76);c.lineTo(W,H*.9);c.bezierCurveTo(W*.6,H*.98,W*.3,H*.82,0,H*.88);c.fill();
    hill(H*.9,'#a98d6a',6,3);seed(W*.62,H*.86,1.2);spr(W*.68,H*.74,1);giant(W*.4,H*.92,1.15,true);}
  else if(id==='m2'){hill(H*.55,'#a6bfa6',18,1.6);hill(H*.75,'#8fb08a',12,.2);c.strokeStyle='#e6d3a8';c.lineWidth=14;c.beginPath();c.moveTo(W*.1,H);c.bezierCurveTo(W*.3,H*.8,W*.6,H*.86,W*.86,H*.62);c.stroke();
    c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;for(let i=0;i<46;i++){const x=hash2(i,1,4)*W,y=hash2(i,2,4)*H*.7;c.beginPath();c.moveTo(x,y);c.lineTo(x-6,y+16);c.stroke();}
    giant(W*.5,H*.88,1);spr(W*.5,H*.88-150,.9);seed(W*.5+36,H*.88-62,1.1);}
  else if(id==='m4'){hill(H*.66,'#e9eef3',12,1.1);hill(H*.84,'#dfe6ee',8,2.6);c.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<70;i++){c.beginPath();c.arc(hash2(i,1,5)*W,hash2(i,2,5)*H*.8,1.5+hash2(i,3,5)*2,0,7);c.fill();}
    c.fillStyle='#6cbf52';c.beginPath();c.ellipse(W*.52,H*.8,3,9,0,0,7);c.fill();giant(W*.44,H*.9,1.1,true);spr(W*.5,H*.52,.8);}
  else if(id==='m5'){hill(H*.64,'#b5dc8f',12,.8);hill(H*.86,'#93c070',8,2);c.strokeStyle='#7a5a3c';c.lineWidth=5;c.beginPath();c.moveTo(W*.56,H*.86);c.lineTo(W*.56,H*.62);c.stroke();
    c.fillStyle='#7cc35c';for(let i=0;i<5;i++){c.beginPath();c.ellipse(W*.56+(i-2)*14,H*.6-Math.abs(i-2)*6,10,6,(i-2)*.4,0,7);c.fill();}giant(W*.36,H*.92,1);spr(W*.64,H*.56,.9);}
  else if(id==='m6'){c.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<40;i++){c.beginPath();c.arc(hash2(i,1,6)*W,hash2(i,2,6)*H*.5,1+hash2(i,3,6)*1.4,0,7);c.fill();}
    hill(H*.78,'#2f3d3a',10,1.3);c.strokeStyle='#4a3a2c';c.lineWidth=7;c.beginPath();c.moveTo(W*.55,H*.8);c.lineTo(W*.55,H*.5);c.moveTo(W*.55,H*.6);c.lineTo(W*.47,H*.5);c.moveTo(W*.55,H*.58);c.lineTo(W*.63,H*.48);c.stroke();
    c.fillStyle='#3e6b45';c.beginPath();c.ellipse(W*.55,H*.45,50,26,0,0,7);c.fill();spr(W*.58,H*.44,.9);
    for(const [x,y] of [[.3,.74],[.4,.8],[.7,.79],[.8,.73]]){const gl=c.createRadialGradient(W*x,H*y,0,W*x,H*y,22);gl.addColorStop(0,'rgba(255,214,140,.95)');gl.addColorStop(1,'rgba(255,190,100,0)');c.fillStyle=gl;c.beginPath();c.arc(W*x,H*y,22,0,7);c.fill();}
    giant(W*.22,H*.98,.85,true);}
  else if(id==='m7'){c.fillStyle='#2a2019';c.beginPath();c.moveTo(0,H*.25);c.bezierCurveTo(W*.4,H*.15,W*.6,H*.35,W,H*.22);c.lineTo(W,0);c.lineTo(0,0);c.fill();
    c.fillStyle='#4a3a2c';c.beginPath();c.ellipse(W*.5,H*.62,W*.44,H*.24,0,0,7);c.fill();c.strokeStyle='#d9b04a';c.lineWidth=4;c.beginPath();c.moveTo(0,H*.7);c.bezierCurveTo(W*.25,H*.6,W*.4,H*.72,W*.62,H*.64);c.stroke();
    giant(W*.7,H*.9,.95,true);spr(W*.84,H*.5,.9);}
  else if(id==='m8'){c.fillStyle='#0f1422';c.fillRect(0,H*.7,W,H*.3);const gr=c.createLinearGradient(0,0,W,0);gr.addColorStop(0,'rgba(255,210,120,0)');gr.addColorStop(.5,'rgba(255,220,140,1)');gr.addColorStop(1,'rgba(255,210,120,0)');
    c.strokeStyle=gr;c.lineWidth=6;c.beginPath();c.moveTo(0,H*.78);c.bezierCurveTo(W*.3,H*.62,W*.6,H*.9,W,H*.7);c.stroke();c.globalAlpha=.35;c.lineWidth=18;c.stroke();c.globalAlpha=1;
    giant(W*.32,H*.94,1,true);spr(W*.58,H*.5,1.2);}
  else{hill(H*.62,'#a3cf84',12,2.2);c.fillStyle='#7fb7c9';c.beginPath();c.ellipse(W*.25,H*.82,150,26,-.1,0,7);c.fill();hill(H*.86,'#8a6a4c',4,1);
    giant(W*.58,H*.94,1.1,true);c.fillStyle='#6cbf52';c.beginPath();c.ellipse(W*.7,H*.84,4,12,0,0,7);c.fill();c.beginPath();c.ellipse(W*.7+8,H*.8,9,4,.4,0,7);c.fill();spr(W*.76,H*.7,1);}
  // soft vignette like an old storybook page
  const v=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.65);v.addColorStop(0,'rgba(255,250,240,0)');v.addColorStop(1,'rgba(120,90,60,.28)');c.fillStyle=v;c.fillRect(0,0,W,H);
}
let cardShown='';
function updateCardUI(){
  const id=G.phase==='play'?G.card:'';if(id===cardShown)return;cardShown=id;$('scrCard').hidden=!id;if(!id)return;
  const m=MEMS.find(m=>m.id===id);if(!m)return;
  drawMemory($('cardArt').getContext('2d'),id,640,340);
  $('cardEyebrow').textContent='Memory petal · '+m.where;$('cardTitle').textContent=m.title;$('cardText').textContent=m.text;
  const found=MEMS.filter(x=>PROG.petals[x.id]).length;
  $('cardHelp').textContent=found+' of '+MEMS.length+' memories in Book 1 so far. '+(mode==='online'?'Either of you: jump or interact to continue.':'Jump or interact to continue.');
}

// ================= journal, map, settings, travel =================
let overlayOpen='';
function openOverlay(id){overlayOpen=id;for(const s of ['scrJournal','scrMap','scrSettings','scrTravel'])$(s).hidden=s!==id;if(mode==='local'&&G.phase==='play')G.paused=true;}
function closeOverlay(){if(!overlayOpen)return;$(overlayOpen).hidden=true;overlayOpen='';if(mode==='local'&&$('scrPause').hidden)G.paused=false;}
function storySoFar(){
  const out=[];
  out.push(['The Hush','The Heart Tree fell asleep when the Hush stopped its seven roots. Before it slept it woke the Giant and the Sprite, who remember nothing.']);
  if(PROG.ch1.done)out.push(['The Sunken Garden','The Giant and the Sprite found three rune stones and woke the dry fountain. The first root stirred, the river came back and the Vale turned green again.']);
  else out.push(['Now','The north gate glows. The first root runs under the Sunken Garden, where three rune stones wait to be set in a dry fountain.']);
  if(PROG.ch2.done)out.push(['The Lantern Mines','Deep under the eastern hills they found three lantern stones and lit the Great Lantern. The second root woke, and lanterns came on along the Vale\u2019s paths.']);
  else if(PROG.ch1.done)out.push(['Next','The gate to the Lantern Mines glows in the eastern hills. Somewhere in the dark, three lantern stones wait to light the Great Lantern.']);
  if(PROG.ch2.done)out.push(['Next','A third gate, to the Windmill Heights, has begun to flicker. Chapter 3 arrives in a later update.']);
  return out;
}
let jTab='story';
function openJournal(tab){jTab=tab||jTab;openOverlay('scrJournal');renderJournal();}
function renderJournal(){
  for(const b of document.querySelectorAll('#scrJournal .tab'))b.classList.toggle('on',b.dataset.tab===jTab);
  $('jStory').hidden=jTab!=='story';$('jMem').hidden=jTab!=='mem';$('jMap').hidden=jTab!=='map';
  $('jTitle').textContent={story:'The story so far',mem:'Memories',map:'Map'}[jTab];
  if(jTab==='story'){const el=$('jStory');el.textContent='';
    for(const [h,t] of storySoFar()){const d=document.createElement('div');d.className='jentry';const b=document.createElement('h3');b.textContent=h;const p=document.createElement('p');p.textContent=t;d.append(b,p);el.appendChild(d);}
    const st=document.createElement('dl');st.className='stats';const add=(a,b)=>{const dt=document.createElement('dt');dt.textContent=a;const dd=document.createElement('dd');dd.textContent=b;st.append(dt,dd);};
    add('Roots awake',PROG.roots+' of 7');add('Golden seeds found',seedsFound()+' (planted '+PROG.planted+')');add('Memory petals',countKeys(PROG.petals)+' of '+MEMS.length);add('Secrets',countKeys(PROG.secrets)+' of '+Object.values(REG).reduce((a,r)=>a+r.secrets.length,0));add('Waystones',countKeys(PROG.ws)+' of '+WAYS.length);
    if(PROG.ch1.best)add('Best time, Chapter 1',Math.floor(PROG.ch1.best/60)+' min '+(PROG.ch1.best%60)+' s');
    if(PROG.ch2.best)add('Best time, Chapter 2',Math.floor(PROG.ch2.best/60)+' min '+(PROG.ch2.best%60)+' s');
    if(PROG.ch1.done)add('Lanterns lit, Chapter 2',countBits(PROG.ch2.lan|0)+' of '+LANTERNS.length);
    el.appendChild(st);}
  if(jTab==='mem'){const el=$('jMem');el.textContent='';
    for(const m of MEMS){const got=PROG.petals[m.id];const d=document.createElement('button');d.className='memthumb'+(got?'':' locked');d.disabled=!got;
      const cv=document.createElement('canvas');cv.width=320;cv.height=170;if(got){const c=cv.getContext('2d');c.scale(.5,.5);drawMemory(c,m.id,640,340);}
      const t=document.createElement('b');t.textContent=got?m.title:'Not found yet';const w=document.createElement('span');w.textContent=got?m.where:'Somewhere in '+m.where.split(':')[0];
      d.append(cv,t,w);if(got)d.onclick=()=>{const p=$('jMemView');p.hidden=false;drawMemory($('jMemArt').getContext('2d'),m.id,640,340);$('jMemTitle').textContent=m.title;$('jMemText').textContent=m.text;};el.appendChild(d);}
    $('jMemView').hidden=true;}
  if(jTab==='map')drawMap($('jMapCanvas'));
}
// ---- map ----
let valeMapImg=null;
function buildValeMapImage(){const N=200,cv=document.createElement('canvas');cv.width=cv.height=N;const c=cv.getContext('2d'),im=c.createImageData(N,N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=lerp(-128,128,i/(N-1)),z=lerp(-128,128,j/(N-1)),h=valeBase(x,z);valeColor(x,z,h,_vc).convertLinearToSRGB();
    const k=(j*N+i)*4;im.data[k]=Math.round(_vc.r*255);im.data[k+1]=Math.round(_vc.g*255);im.data[k+2]=Math.round(_vc.b*255);im.data[k+3]=255;}
  c.putImageData(im,0,0);valeMapImg=cv;}
function drawMap(cv){
  const c=cv.getContext('2d'),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);c.fillStyle='#e9e2d0';c.fillRect(0,0,W,H);
  let x0,x1,z0,z1;if(G.region==='vale'){x0=-128;x1=128;z0=-128;z1=128;}else if(G.region==='ch2'){x0=-38;x1=78;z0=-88;z1=8;}else{x0=-44;x1=48;z0=-86;z1=8;}
  const s=Math.min((W-40)/(x1-x0),(H-40)/(z1-z0)),ox=(W-(x1-x0)*s)/2,oz=(H-(z1-z0)*s)/2;
  const X=x=>ox+(x-x0)*s,Z=z=>oz+(z-z0)*s;
  if(G.region==='vale'){
    if(!valeMapImg)buildValeMapImage();c.imageSmoothingEnabled=true;c.drawImage(valeMapImg,X(-128),Z(-128),256*s,256*s);
    c.save();c.beginPath();c.rect(X(-128),Z(-128),256*s,256*s);c.clip();
    c.strokeStyle=VALE.wake>.5?'#4fb9cf':'#d8c39a';c.lineWidth=Math.max(3,(RIVER_W*1.6)*s);c.lineCap='round';c.beginPath();RIVER.forEach(([x,z],i)=>{i?c.lineTo(X(x),Z(z)):c.moveTo(X(x),Z(z));});c.stroke();
    for(const b of BRIDGES){c.fillStyle='#c9a983';c.fillRect(X(b.x)-3*s,Z(b.z)-9*s,6*s,18*s);}
    c.restore();
    c.fillStyle='#4e8f43';c.beginPath();c.arc(X(0),Z(0),15*s,0,7);c.fill();c.fillStyle='#ffb3cf';c.beginPath();c.arc(X(0),Z(0),6*s,0,7);c.fill();
    label(c,'Heart Tree',X(0),Z(0)+20*s+12,'#243039');
    for(const g of GATES){c.fillStyle=g.ready?'#f2873a':'#8f9aa3';c.beginPath();c.arc(X(g.pos.x),Z(g.pos.z),7,0,7);c.fill();label(c,g.ch+' · '+g.name,X(g.pos.x),Z(g.pos.z)+(g.pos.z<0?-14:22),g.ready?'#c9621a':'#5c6b76');}
    for(const cv of CAVES){const r=caveRect(cv);c.fillStyle='#4b4038';c.fillRect(X(r.x0),Z(r.z0),(r.x1-r.x0)*s,(r.z1-r.z0)*s);label(c,cv.name,X(cv.x-cv.dir*4),Z(cv.z)-12,'#5c4636');}
    c.fillStyle='#8a6448';c.beginPath();c.arc(X(VALE.plot.x),Z(VALE.plot.z),6,0,7);c.fill();label(c,'Seed Garden',X(VALE.plot.x)-26,Z(VALE.plot.z)+4,'#5c6b76');
  }else if(G.region==='ch2'){
    c.fillStyle='#1c2128';c.fillRect(X(x0),Z(z1),(x1-x0)*s,(z0-z1)*s);
    const cols=REG.ch2.colliders.filter(k=>k.mesh);
    for(const k of cols){const top=k.max.y;if(k.max.y-k.min.y>1.2&&!(top>5.9&&top<6.1))continue;if(top<-.2||(top>.2&&top<5.8)||top>6.2)continue;
      c.fillStyle=top>5?'#7d7466':'#a69c8c';c.fillRect(X(k.min.x),Z(k.min.z),(k.max.x-k.min.x)*s,(k.max.z-k.min.z)*s);}
    for(const k of cols)if(k.max.y-k.min.y>1.2&&k.max.y>6.5&&k.mesh&&k.mesh.material===MM.rock){c.fillStyle='#3c3a37';c.fillRect(X(k.min.x),Z(k.min.z),Math.max(1.5,(k.max.x-k.min.x)*s),Math.max(1.5,(k.max.z-k.min.z)*s));}
    for(const cr of CRYST){if(cr.kind==='tile'&&!minesDone())continue;const b=cr.col;c.fillStyle=cr.t>0||minesDone()?'#8fe6ff':'rgba(143,230,255,.35)';c.fillRect(X(b.min.x),Z(b.min.z),(b.max.x-b.min.x)*s,(b.max.z-b.min.z)*s);}
    c.strokeStyle='#ffc46a';c.lineWidth=3;c.beginPath();c.arc(X(GL.x),Z(GL.z),2.4*s,0,7);c.stroke();label(c,'Great Lantern',X(GL.x),Z(GL.z)+3*s+14,'#f2e6c8');
    for(const l of LANTERNS){c.fillStyle=lanLit(l)?'#ffc46a':'#5f6870';c.beginPath();c.arc(X(l.pos.x),Z(l.pos.z),4,0,7);c.fill();}
    label(c,'To the Vale',X(0),Z(7),'#7ff0cf');label(c,'Cart Yard',X(12),Z(-21.5),'#d9d2c4');label(c,'Crystal Gallery',X(54),Z(-23),'#d9d2c4');label(c,'High Drift',X(30),Z(-70.5),'#d9d2c4');label(c,'Pulley',X(60),Z(-69),'#d9d2c4');
    for(const p of PETALS)if(p.reg==='ch2'&&PROG.petals[p.id]){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
  }else{
    const cols=REG.ch1.colliders.filter(k=>k.mesh&&k.mesh.visible!==false);
    c.fillStyle='#20343d';c.fillRect(X(-44),Z(-33),88*s,6*s);
    for(const k of cols)if(k.max.y<=.3&&k.max.y>-.5&&k.max.y-k.min.y<1){c.fillStyle=k.mesh.material===M.pave?'#d9d4c8':'#b9d79a';c.fillRect(X(k.min.x),Z(k.min.z),(k.max.x-k.min.x)*s,(k.max.z-k.min.z)*s);}
    c.fillStyle='#7fc4d6';c.fillRect(X(POOL.x0),Z(POOL.z0),(POOL.x1-POOL.x0)*s,(POOL.z1-POOL.z0)*s);
    for(const k of cols)if(k.max.y>.3&&k.kind==='static'){c.fillStyle=k.max.y>3.6?'#8a7a66':'#b39c7e';c.fillRect(X(k.min.x),Z(k.min.z),Math.max(1.5,(k.max.x-k.min.x)*s),Math.max(1.5,(k.max.z-k.min.z)*s));}
    const O=ORCH;c.fillStyle='#a9cf8a';c.fillRect(X(O.x0),Z(O.z0),(O.x1-O.x0)*s,(O.z1-O.z0)*s);c.fillStyle='#d9d4c8';c.fillRect(X(26.8),Z(-36),2.4*s,13*s);
    for(const k of cols)if(k.min.y>O.y-.3&&k.max.y>O.y+.3&&k.kind!=='door'){c.fillStyle=k.max.y>O.y+3?'#8a7a66':'#b39c7e';c.fillRect(X(k.min.x),Z(k.min.z),Math.max(1.5,(k.max.x-k.min.x)*s),Math.max(1.5,(k.max.z-k.min.z)*s));}
    label(c,'Hanging Orchard',X(28),Z(-52),'#5c6b76');
    c.strokeStyle='#5fb8a0';c.lineWidth=3;c.beginPath();c.arc(X(F.x),Z(F.z),3*s,0,7);c.stroke();label(c,'Fountain',X(F.x),Z(F.z)+4*s+14,'#243039');
    label(c,'To the Vale',X(0),Z(7),'#118a6f');label(c,'Terraced garden',X(26),Z(-1),'#5c6b76');label(c,'Flooded garden',X(-26),Z(-45.5),'#5c6b76');
    for(const p of PETALS)if(p.reg==='ch1'&&PROG.petals[p.id]){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
  }
  for(const w of WAYS){if(w.reg!==G.region)continue;const on=PROG.ws[w.id];c.fillStyle=on?'#1fb3a3':'#a9b3ba';c.beginPath();c.moveTo(X(w.pos.x),Z(w.pos.z)-9);c.lineTo(X(w.pos.x)+6,Z(w.pos.z)+5);c.lineTo(X(w.pos.x)-6,Z(w.pos.z)+5);c.fill();}
  for(const p of PETALS)if(p.reg===G.region&&PROG.petals[p.id]&&G.region==='vale'){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
  for(const [b,col,r] of [[golem,'#f2873a','g'],[sprite,'#22bf9c','s']]){c.fillStyle='#fff';c.beginPath();c.arc(X(b.pos.x),Z(b.pos.z),9,0,7);c.fill();c.fillStyle=col;c.beginPath();c.arc(X(b.pos.x),Z(b.pos.z),6.5,0,7);c.fill();
    label(c,nameOf(r),X(b.pos.x),Z(b.pos.z)-14,col==='#f2873a'?'#c9621a':'#118a6f');}
}
function label(c,t,x,y,col){c.font='700 13px Nunito, sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(255,251,243,.9)';c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y);}
function openMap(){openOverlay('scrMap');renderMap();}
function renderMap(){const reg=curReg;$('mapTitle').textContent=reg.name;drawMap($('mapCanvas'));
  const L=$('mapLegend');L.textContent='';const add=(cls,t)=>{const s=document.createElement('span');s.className='lg '+cls;s.textContent=t;L.appendChild(s);};
  add('seed','Golden seeds here: '+seedsFoundIn(G.region)+' of '+seedsIn(G.region).length);
  add('petal','Memory petals here: '+PETALS.filter(p=>p.reg===G.region&&PROG.petals[p.id]).length+' of '+PETALS.filter(p=>p.reg===G.region).length);
  const sec=reg.secrets;add('secret','Secrets here: '+sec.filter(x=>PROG.secrets[x.id]).length+' of '+sec.length);
  add('way','Waystones: triangles');}
// ---- settings ----
function openSettings(){openOverlay('scrSettings');const st=PROG.settings;
  $('setMusic').value=Math.round(st.music*100);$('setSfx').value=Math.round(st.sfx*100);$('setCam').checked=st.camMotion==='reduced';$('setFlash').checked=!!st.reduceFlash;$('setShake').checked=!!st.shake;
  $('bErase').textContent='Erase saved progress';$('bErase').dataset.arm='';}
function wireSettings(){
  const upd=()=>{const st=PROG.settings;st.music=$('setMusic').value/100;st.sfx=$('setSfx').value/100;st.camMotion=$('setCam').checked?'reduced':'full';st.reduceFlash=$('setFlash').checked;st.shake=$('setShake').checked;applyVolumes();try{localStorage.setItem(SAVE_KEY,JSON.stringify(PROG));}catch(e){}};
  for(const id of ['setMusic','setSfx','setCam','setFlash','setShake'])$(id).addEventListener('input',upd);
  $('bSetClose').onclick=closeOverlay;
  $('bErase').onclick=()=>{const b=$('bErase');if(!b.dataset.arm){b.dataset.arm='1';b.textContent='Press again to erase everything';return;}
    eraseProgress();b.dataset.arm='';b.textContent='Progress erased';refreshTitleSave();if(G.phase==='play'){closeOverlay();$('scrPause').hidden=true;toTitle();}};
  for(const b of document.querySelectorAll('#scrJournal .tab'))b.onclick=()=>{jTab=b.dataset.tab;renderJournal();};
  $('bJClose').onclick=closeOverlay;$('bMapClose').onclick=closeOverlay;$('bTravelClose').onclick=closeOverlay;
  $('bJMemClose').onclick=()=>{$('jMemView').hidden=true;};
}
// ---- waystone travel (the host or the local game chooses; both travel) ----
function openTravel(){
  if(mode==='online'&&role!=='host'){toast(nameOf(myRole==='g'?'s':'g')+' chooses where to travel');return;}
  openOverlay('scrTravel');const L=$('travelList');L.textContent='';
  for(const w of WAYS){if(!PROG.ws[w.id])continue;const b=document.createElement('button');b.className='btn';const here=w.reg===G.region&&(dxz(golem.pos,w.pos)<4||dxz(sprite.pos,w.pos)<4);
    b.append(({vale:'The Vale: ',ch1:'Chapter 1: ',ch2:'Chapter 2: '}[w.reg]||'')+w.name);const sm=document.createElement('small');sm.textContent=here?'you are here':(w.reg===G.region?'this area':'another area');b.append(sm);
    b.disabled=here;b.onclick=()=>{closeOverlay();travelToWaystone(w.id);};L.appendChild(b);}
}
function refreshTitleSave(){
  const has=PROG.seen.prologue;const el=$('saveNote');el.hidden=!has;
  if(has)el.textContent='Saved on this laptop: '+PROG.roots+' of 7 roots awake, '+seedsFound()+' golden seeds, '+countKeys(PROG.petals)+' memories. You continue in the Vale.';
}

// ================= chapter 1 and Vale story hooks (secrets and lines) =================
function storyHooks(){
  const hy=valeH(VALE_HILL.x,VALE_HILL.z);
  const deep=(c,b)=>{const t=(b.pos.x-c.x)*c.dir;return t>c.len*.55&&t<c.len&&Math.abs(b.pos.z-c.z)<c.w/2;};
  REG.vale.secrets=[{id:'v_lookout',name:'The lookout hill',test:b=>Math.hypot(b.pos.x-VALE_HILL.x,b.pos.z-VALE_HILL.z)<4&&b.pos.y>hy-.6},
    {id:'v_grotto',name:'The glow-worm grotto',test:b=>deep(CAVES[0],b)},{id:'v_echo',name:'The echo cave',test:b=>deep(CAVES[1],b)}];
  REG.vale.talk=[
    {id:'v1',x:0,z:88,r:7,cond:()=>!PROG.ch1.done},{id:'v2',x:0,z:30,r:9,cond:()=>!PROG.ch1.done},{id:'v3',x:0,z:-100,r:9,cond:()=>!PROG.ch1.done},{id:'v4',x:VALE.plot.x,z:VALE.plot.z,r:8,cond:()=>seedsToPlant()>=5},
    ...GATES.slice(1).map(g=>({id:'v5',x:g.pos.x,z:g.pos.z,r:10})),
    {id:'v6',x:0,z:52,r:14,cond:()=>VALE.wake>.9},{id:'v7',x:VALE_HILL.x,z:VALE_HILL.z,r:5},
    {id:'v8',x:CAVES[0].x+4,z:CAVES[0].z,r:6,cond:()=>!VCAVE.grotto.open},{id:'v9',x:CAVES[1].x-4,z:CAVES[1].z,r:6,cond:()=>!VCAVE.echo.raised},{id:'v10',x:CAVES[1].x+9,z:CAVES[1].z,r:3}];
  const C=CELLAR;
  REG.ch1.secrets=[
    {id:'c1_balcony',name:'The hidden balcony',test:b=>b.pos.x>25&&b.pos.x<31&&b.pos.z<-17&&b.pos.z>-23&&b.pos.y>4.5},
    {id:'c1_cellar',name:'The secret cellar',test:b=>b.pos.x>C.x0&&b.pos.x<C.x1&&b.pos.z>C.z0&&b.pos.z<C.z1&&b.pos.y<-1.5},
    {id:'c1_island',name:'The flooded island',test:b=>Math.hypot(b.pos.x+34,b.pos.z+55)<2.4&&b.pos.y>0},
    {id:'c1_pavilion',name:'The sun crown',test:()=>pav.lit}];
  REG.ch1.talk=[
    {id:'c1',x:0,z:-2,r:5},{id:'c2',x:SEESAW.x,z:SEESAW.z,r:6.5},{id:'c3',x:SEESAW.x,z:SEESAW.z,r:9,cond:()=>G.ch.launches>=1&&!PROG.secrets.c1_balcony},
    {id:'c4',x:34.8,z:-1.2,r:3.2,cond:()=>!crack.broken},{id:'c5',x:-13.5,z:-54.5,r:4},{id:'c6',x:0,z:-25,r:4.5,cond:()=>!bridge.open},
    {id:'c7',x:0,z:-66,r:6,cond:()=>!G.fountainOn},{id:'c8',x:-34,z:-55,r:2.6,cond:()=>!stones.raised},
    {id:'c10',x:30.3,z:-18.2,r:2.6,cond:()=>!stair.raised},{id:'c11',x:28,z:-30,r:3},{id:'c12',x:31,z:-66,r:6,cond:()=>!pav.open},{id:'c13',x:20,z:-72,r:3}];
  REG.ch2.secrets=[
    {id:'c2_lamproom',name:'The lamp room',test:b=>b.pos.x<-10.4&&b.pos.x>-17&&b.pos.z<-23&&b.pos.z>-31},
    {id:'c2_island',name:'The far crystal island',test:b=>b.pos.x>59&&b.pos.x<64&&b.pos.z>-31.5&&b.pos.z<-26&&b.pos.y>-.5},
    {id:'c2_cellar',name:'The crystal cellar',test:b=>b.pos.x>-11&&b.pos.x<-4&&b.pos.z<-76&&b.pos.z>-84&&b.pos.y<-1.5}];
  const notDone=()=>!minesDone();
  REG.ch2.talk=[
    {id:'mi1',x:0,z:-1.5,r:5},{id:'mi2',x:-5,z:-8,r:3.6,cond:()=>!lanLit(LANTERNS[0])},{id:'mi3',x:0,z:-12.6,r:4,cond:notDone},
    {id:'mi4',x:4,z:-22.5,r:3.6,cond:()=>!mine.bar.broken},{id:'mi5',x:6,z:-35,r:4,cond:()=>!mine.bar.broken},{id:'mi6',x:37,z:-41,r:4,cond:notDone},
    {id:'mi7',x:48,z:-41,r:3,cond:()=>LSTONES[0].state==='rest'},{id:'mi8',x:60,z:-60,r:5,cond:()=>!mine.lift.cw},
    {id:'mi9',x:50.5,z:-63,r:3.5,cond:()=>!mine.lift.cw&&sprite.pos.y>5},{id:'mi10',x:47.5,z:-63,r:6,cond:()=>mine.boulder.st==='wait'||mine.boulder.st==='roll'},
    {id:'mi11',x:-8,z:-62.5,r:6,cond:()=>golem.pos.y<1},{id:'mi12',x:-21,z:-58.4,r:3.6,cond:()=>LSTONES[2].state==='rest'},{id:'mi13',x:-13.5,z:-27,r:3},
    {id:'mi14',x:13.75,z:-67,r:2.5,cond:()=>mine.wall.broken&&mine.boulder.st!=='idle'}];
}
function countBits(n){let c=0;while(n){c+=n&1;n>>>=1;}return c;}

// ================= camera: calm follow, quarter-turns with Q / R =================
const CAVECAM={c:null,saved:0};
const camTarget=new V3(0,1,0);let camLift=0,camSnap=true,camDist=14,camYaw=0,camYawT=0,camY=1,dbgDist=0,PITCH=0.84,camPitch=.84;
function rotateCam(d){camYawT+=d*Math.PI/2;}
const _mid=new V3();
function updateCamera(dt,t){
  if(G.phase==='title'||G.phase==='loading'||G.phase==='brief'){const a=t*.035;camera.position.set(Math.sin(a)*78,30,Math.cos(a)*78);camTarget.set(0,18,0);camera.lookAt(camTarget);camSnap=true;return;}
  if(G.scene&&sceneCamera())return;
  const gy=Math.max(-1,golem.pos.y),sy=Math.max(-1,sprite.pos.y);
  _mid.set((golem.pos.x+sprite.pos.x)/2,(gy+sy)/2+1,(golem.pos.z+sprite.pos.z)/2);
  const sep=Math.hypot(golem.pos.x-sprite.pos.x,golem.pos.z-sprite.pos.z);
  const vale=G.region==='vale';
  // in a side cave the hillside and the cave's own walls hide the players from the usual camera, so it swings
  // round to look in through the mouth (and goes back to where it was on the way out)
  const cave=vale&&G.phase==='play'?(inCave(golem.pos.x,golem.pos.z,0)||inCave(sprite.pos.x,sprite.pos.z,0)):null;
  if(cave!==CAVECAM.c){if(cave&&!CAVECAM.c)CAVECAM.saved=camYawT;else if(!cave)camYawT=CAVECAM.saved;CAVECAM.c=cave;}
  if(cave){const yw=cave.dir<0?Math.PI/2:-Math.PI/2;camYawT=yw+Math.round((camYaw-yw)/(Math.PI*2))*Math.PI*2;}
  // the Vale gets a low, cinematic camera (horizon and the Heart Tree in view); puzzle areas stay a little higher
  // landmark framing: facing the Heart Tree from the meadow, tilt up so its canopy is in view
  let lookUp=0;if(vale&&!cave){const tx=-_mid.x,tz=-_mid.z,d=Math.hypot(tx,tz);const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw);
    const facing=d>1?(tx*fx+tz*fz)/d:0;lookUp=smooth(.55,.9,facing)*smooth(24,40,d)*smooth(150,90,d);}
  const pitchT=cave?.2:vale?lerp(.30,.16,lookUp):(REAL.ready?.5:.6);camPitch=camSnap?pitchT:lerp(camPitch,pitchT,1-Math.exp(-dt*2));PITCH=camPitch;
  camLift=camSnap?lookUp*2.6:lerp(camLift,lookUp*2.6,1-Math.exp(-dt*2));
  const fov=vale?50:42;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
  let want=vale?clamp(9.5+Math.max(0,sep-4)*.8,9.5,cave?14:24):clamp(11+Math.max(0,sep-5)*.85,11,23);
  _mid.y+=vale?.9+camLift:.4;
  if(G.region==='ch1'&&(G.ending||G.phase==='end')){want=16;_mid.set(F.x,2.2,F.z);}
  if(G.region==='ch2'&&(G.ending||G.phase==='end')){want=19;_mid.set(GL.x,3.2,GL.z);}
  if(G.region==='ch1'&&(golem.pos.y<-1.5||sprite.pos.y<-1.5)&&golem.pos.x>29&&sprite.pos.x>29)want=Math.min(want,13);
  if(dbgDist)want=dbgDist;
  const k=camSnap?1:1-Math.exp(-dt*4);
  camTarget.x=lerp(camTarget.x,_mid.x,k);camTarget.z=lerp(camTarget.z,_mid.z,k);
  camY=camSnap?_mid.y:lerp(camY,_mid.y,1-Math.exp(-dt*2.5));camTarget.y=camY;
  camDist=camSnap?want:lerp(camDist,want,1-Math.exp(-dt*1.2));
  camYaw=camSnap?camYawT:angLerp(camYaw,camYawT,1-Math.exp(-dt*7));
  camSnap=false;
  camera.position.set(camTarget.x+Math.sin(camYaw)*Math.cos(PITCH)*camDist,camTarget.y+Math.sin(PITCH)*camDist,camTarget.z+Math.cos(camYaw)*Math.cos(PITCH)*camDist);
  const gh=terrainAt(camera.position.x,camera.position.z);if(camera.position.y<gh+1.4)camera.position.y=gh+1.4;
  if(cave&&inCave(camera.position.x,camera.position.z,-2.5)===cave)camera.position.y=Math.min(camera.position.y,cave.f+4.6); // under the cave roof
  camera.lookAt(camTarget);
  if(shakeT>0){shakeT-=dt;const a=shakeT*.3;camera.position.x+=(Math.random()-.5)*a;camera.position.y+=(Math.random()-.5)*a;}
}

// ================= see-through walls =================
let shadowFrame=0,lastShadowX=0,lastShadowZ=0;
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
    const bp=r==='s'&&sprite.root?sprite.root.position:b.pos;const p=screenOf(bp.x,bp.y+top,bp.z);
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
    $(r==='g'?'pnameG':'pnameS').textContent=n;$(r==='g'?'hnameG':'hnameS').textContent=n;$(r==='g'?'promptG':'promptS').dataset.who=n;}
}

// ================= characters & world animation =================
function nextBeaconTarget(){
  if(G.region==='ch2'){if(minesDone()||G.ending)return null;
    if(!mine.bar.broken&&!mine.sw.b)return MLEVERS[0].pos;
    if(!mine.lift.cw&&sprite.pos.y>5)return MLEVERS[1].pos;return null;}
  if(G.region!=='ch1'||G.fountainOn)return null;
  if(!gate.open)return levers[0].pos;
  if(!bridge.open)return crank.pos;
  if(runes[2].state==='vault')return levers[1].pos;
  return null;
}
function updateVisuals(dt,t){
  const sun=W.sun;const sx=Math.round(camTarget.x/2)*2,sz=Math.round(camTarget.z/2)*2;sun.target.position.set(sx,camTarget.y,sz);sun.position.copy(sun.target.position).addScaledVector(W.sunDir,60);
  shadowFrame++;const moved=Math.abs(sx-lastShadowX)+Math.abs(sz-lastShadowZ)>0;lastShadowX=sx;lastShadowZ=sz;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=moved||shadowFrame%2===0||G.region!=='vale';
  const sc=sun.shadow.camera,ext=G.region==='vale'?32:clamp(camDist*1.15,16,30);if(Math.abs(sc.right-ext)>.5){sc.left=-ext;sc.right=ext;sc.top=ext;sc.bottom=-ext;sc.updateProjectionMatrix();}
  W.sky.position.copy(camera.position);
  // doors & mechanisms
  gate.group.position.y=gate.t*3.5;port.group.position.y=port.t*3.5;bridge.pivot.rotation.x=-1.45*(1-bridge.t);
  crank.wheel.rotation.x=crank.t*Math.PI*6;
  for(const l of levers)l.handle.rotation.z=lerp(-.7,.7,l.t);for(const l of VLEVERS)l.handle.rotation.z=lerp(-.7,.7,l.t);
  const pulse=.5+.5*Math.sin(t*3.2);
  for(const p of plates){p.mesh.position.y=p.on?-.04:0;p.ring.material.opacity=p.on?1:(port.open?.25:.35+.45*pulse);}
  for(const h of holeMarkers){h.icon.position.y=h.base+Math.sin(t*2)*.08;h.glow.material.opacity=.35+.3*pulse;}
  const bt=G.phase==='play'?nextBeaconTarget():null,bcn=G.region==='ch2'&&mine.beacon?mine.beacon:W.beacon;bcn.visible=!!bt;if(bt){bcn.position.set(bt.x,bt.y+1.55+Math.abs(Math.sin(t*3))*.25,bt.z);}
  block.mesh.position.set(block.pos.x,block.pos.y+.6,block.pos.z);
  // runes
  for(const r of runes){
    const vis=r.state!=='carried'&&r.state!=='placed';r.mesh.visible=vis;r.glow.visible=vis;r.light.intensity=vis?.8:0;
    if(vis){const hover=(r.state==='rest'||r.state==='perched')?.3+Math.sin(t*1.8+r.i)*.06:.22;r.mesh.position.set(r.pos.x,r.pos.y+hover,r.pos.z);r.mesh.rotation.y=t*.8+r.i;
      r.light.position.set(r.pos.x,r.pos.y+.7,r.pos.z);r.glow.position.set(r.pos.x,r.pos.y+hover,r.pos.z);r.glow.material.opacity=.45+.25*pulse;}
  }
  W.sockets.forEach((s,i)=>s.visible=i<G.placed);
  // chapter 1 additions
  if(G.region==='ch1'){syncSeesaw();crack.mesh.visible=!crack.broken;
    stones.list.forEach((st,i)=>{st.m.position.y=stones.home[i]-(1-smooth(0,1,stones.t))*1.3;});
    exitGate.veil.material.opacity=PROG.settings.reduceFlash?.24:.2+.1*Math.sin(t*1.6);
    if(stones.t>0&&stones.t<1&&Math.random()<dt*20){const st=stones.list[Math.floor(Math.random()*3)];puff(st.m.position.x,POOL.y,st.m.position.z,2,.6,[.85,.95,1],.3,.8);}}
  for(const r of runes)if(G.region!=='ch1')r.light.intensity=0;
  if(G.region==='ch1')updateOrchardVis();
  if(G.region==='ch2')updateMinesVis(dt,t);
  updateSeedInstances(t);updatePetals(t);updateWaystones(t);updateVale(dt,t);updateReal(dt,t);updateRings(dt);
  updateGreet(dt);updateGiant(dt,t);updateSpriteVis(dt,t);updateCrown();
  // ending: water and light
  W.fLight.intensity=0;
  if(G.region==='ch1'&&(G.ending||G.phase==='end'||G.fountainOn)){
    const e=G.ending?G.endT:8;W.jet.visible=true;const js=Math.min(1,e/1.2);W.jet.scale.set(1,js,1);W.jet.position.y=3.6+.7*js;
    W.basinWater.visible=true;W.basinWater.position.y=lerp(.14,.68,Math.min(1,e/5));W.fLight.intensity=Math.min(2,e*.5);
    if(Math.random()<dt*35){const a=Math.random()*6.28,sp=.6+Math.random()*1.4;emit(F.x,5,F.z,Math.cos(a)*sp,1+Math.random()*1.5,Math.sin(a)*sp,.8,.97,1,.07,1.4,9,.2);}
  }
}
// a wave when the two meet again after being apart for a while (whoever is standing still waves)
const GREET={apart:0,cool:0,pend:[]};
function updateGreet(dt){
  const d=dxz(golem.pos,sprite.pos);GREET.cool-=dt;
  const still=b=>b.A&&!b.A.busy()&&b.onGround&&Math.hypot(b.vel.x,b.vel.z)<1.2;
  const wave=b=>b.A.shot('Wave',b===golem?1.1:1.2);
  // the one who was still walking when they met waves as soon as it stops (within a couple of seconds)
  GREET.pend=GREET.pend.filter(p=>{p.t-=dt;if(p.t<=0||d>6)return false;if(still(p.b)){wave(p.b);return false;}return true;});
  if(d>9){GREET.apart+=dt;return;}
  if(d>4.5)return;if(GREET.apart<4){GREET.apart=0;return;}
  if(GREET.cool>0||sprite.held||G.phase!=='play'||G.ending)return;
  const gs=still(golem),ss=still(sprite);if(!gs&&!ss)return;
  for(const [b,st] of [[golem,gs],[sprite,ss]]){if(st)wave(b);else GREET.pend.push({b,t:2.5});}
  GREET.apart=0;GREET.cool=10;
}
// while waving, the body turns toward the partner (visual only; the game's facing is unchanged)
function faceYaw(b,o,dt){const w=b.A&&b.A.busy()&&b.A.shotName==='Wave'?1:0;b.faceW=approach(b.faceW||0,w,dt*4);
  if(b.faceW<=0)return b.yaw;const want=Math.atan2(o.pos.x-b.pos.x,o.pos.z-b.pos.z);let d=want-b.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));return b.yaw+d*smooth(0,1,b.faceW);}
function placeRing(ring,b,size){
  const fy=floorBelow(b.pos,b===sprite?null:golem.col);const gap=b.pos.y-fy;
  if(fy<-50||gap>8){ring.visible=false;return;}
  ring.visible=true;ring.position.set(b.pos.x,fy+.03,b.pos.z);const k=clamp(1-gap/6,.35,1);ring.scale.setScalar(k);ring.material.opacity=.9*k;
}
function updateGiant(dt,t){
  const g=golem,gr=g.root;gr.position.copy(g.pos);gr.rotation.y=faceYaw(g,sprite,dt);
  const hs=Math.hypot(g.vel.x,g.vel.z);
  g.pushVis=Math.max(0,(g.pushVis||0)-dt);if(g.pushing)g.pushVis=.15;
  g.carryA=lerp(g.carryA||0,g.holding?1:0,1-Math.exp(-dt*10));
  if(g.A){
    let n='Idle',ts=1;
    if(G.ending||G.phase==='end')n='Cheer';
    else if(g.pound){n='Jump_Idle';ts=.4;}
    else if(!g.onGround&&Math.abs(g.vel.y)>2)n='Jump_Idle';
    else if(g.pushVis>0){n='Walking_B';ts=.75;}
    else if(hs>.35){n='Walking_A';ts=clamp(hs/2.6,.55,1.45);}
    if(!g.A.busy())g.A.play(n,.22,ts);
    g.A.update(dt);
    if(g.carryA>.01&&g.carryPose&&!g.A.busy())for(const c of g.carryPose)c.b.quaternion.slerp(c.q,g.carryA);
    if(g.charging&&g.chest){g.chest.rotation.x-=.35*g.charge;}
  }
  g.gems.forEach((m,i)=>{m.visible=i<g.runes;const a=t*1.6+i*2.094;m.position.set(Math.cos(a)*.85,1.15+Math.sin(t*2+i)*.08,Math.sin(a)*.85);m.rotation.y=t*2;});
  g.walk+=dt*hs*2.1;const step=Math.floor(g.walk/Math.PI);if(step!==g.stepSound&&hs>1&&g.onGround){g.stepSound=step;const sf=surfaceUnder(g);SFX.step(sf,.55+Math.min(1,hs/3.4)*.45);
    if(sf!=='stone'||Math.random()<.5){const f=fwd(g.yaw),side=(step&1)?.35:-.35;puff(g.pos.x-f.z*side,g.pos.y,g.pos.z+f.x*side,3,.5,sf==='grass'?[.72,.8,.6]:[.82,.76,.66],.3,.4);}}
  if(g.onGround&&!g.visGround&&(g.lastVy||0)<-6){puff(g.pos.x,g.pos.y,g.pos.z,10,1.4,null,.4,.6);SFX.step(surfaceUnder(g),1.1);}
  g.visGround=g.onGround;g.lastVy=g.vel.y;
  placeRing(g.ring,g,1.5);
}
// shoulder sit: when both stand still close together for a few seconds, the Sprite flies up and sits on the
// Giant's shoulder. Visual only (the Sprite's real position stays put), so it works the same online.
const PERCH={idle:0,a:0,pos:new V3(),_p:new V3()};
function updatePerch(dt){
  const g=golem,s=sprite,P=PERCH;
  const calm=b=>b.onGround&&Math.hypot(b.vel.x,b.vel.z)<.15&&Math.abs(b.vel.y)<.1&&!(b.A&&b.A.busy());
  const ok=G.phase==='play'&&!G.ending&&!G.scene&&!s.held&&!g.holding&&!g.charging&&dxz(g.pos,s.pos)<3.2&&Math.abs(g.pos.y-s.pos.y)<.6&&calm(g)&&calm(s);
  P.idle=ok?P.idle+dt:0;
  P.a=approach(P.a,P.idle>3.5?1:0,dt/(P.idle>3.5?.9:.35));
  if(P.a<=0)return false;
  const b=g.shoulder;if(b){b.getWorldPosition(P._p);P._p.y+=.12;}else P._p.set(g.pos.x,g.pos.y+2.1,g.pos.z);
  const k=smooth(0,1,P.a);P.pos.lerpVectors(s.pos,P._p,k);P.pos.y+=Math.sin(Math.PI*k)*.6;return true;
}
function updateSpriteVis(dt,t){
  const s=sprite,sr=s.root;const perched=updatePerch(dt);
  if(perched){sr.position.copy(PERCH.pos);const gy=golem.root.rotation.y;sr.rotation.y=angLerp(s.yaw,gy,smooth(0,1,PERCH.a));}
  else{sr.position.copy(s.pos);sr.rotation.y=faceYaw(s,golem,dt);}
  const ss=Math.hypot(s.vel.x,s.vel.z);
  if(s.A){
    let n='Idle',ts=1;
    if(G.ending||G.phase==='end')n='Cheer';
    else if(s.held||PERCH.a>.6)n='Sit_Floor_Idle';
    else if(!s.onGround)n='Jump_Idle';
    else if(ss>.35){n='Running_A';ts=clamp(ss/3.2,.6,1.6);}
    if(!s.A.busy())s.A.play(n,.15,ts);
    s.A.update(dt);
  }
  const flap=s.gliding?Math.sin(t*30)*.45+.9:(s.onGround?Math.sin(t*5)*.1+.3:Math.sin(t*20)*.5+.6);
  flapWings(flap);
  if(!perched)sr.position.y+=s.onGround?0:.02*Math.sin(t*4);
  s.halo.material.opacity=.2+Math.sin(t*3)*.05;
  if(Math.random()<dt*(PROG.settings.reduceFlash?.4:1)*(s.onGround?(ss>.5?6:1.5):(s.gliding?24:12)))emit(sr.position.x+(Math.random()-.5)*.12,sr.position.y+.22,sr.position.z+(Math.random()-.5)*.12,(Math.random()-.5)*.2,.15+Math.random()*.2,(Math.random()-.5)*.2,.55,1,.85,.06,.9,-.1,.6);
  placeRing(s.ring,s,.75);if(s.held||PERCH.a>.3)s.ring.visible=false;
  s.walk+=dt*ss*2.6;const st=Math.floor(s.walk/Math.PI);if(st!==s.stepSound&&ss>1.2&&s.onGround){s.stepSound=st;SFX.tick(surfaceUnder(s));}
}

// ================= feel: dust, rings, sparkles, celebrations, fades =================
const _surfP=new V3();
function surfaceUnder(b){
  if(b.ground&&b.ground.surface)return b.ground.surface;
  if(G.region==='vale')return riverDist(b.pos.x,b.pos.z)<RIVER_W+1.5?'stone':'grass';
  let best=-99,sf='grass';for(const c of colliders){if(!c.on||c.kind==='golem'||!c.mesh)continue;if(b.pos.x>c.min.x&&b.pos.x<c.max.x&&b.pos.z>c.min.z&&b.pos.z<c.max.z&&c.max.y<=b.pos.y+.06&&c.max.y>best){best=c.max.y;sf=c.surface||'stone';}}
  return sf;
}
const rings=[];
function impactRing(x,y,z,color,size){const m=new THREE.Mesh(new THREE.RingGeometry(.7,1,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y+.06,z);m.renderOrder=3;scene.add(m);rings.push({m,t:0,size:size||4});}
function updateRings(dt){for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt/.55;const k=smooth(0,1,r.t);r.m.scale.setScalar(.4+k*r.size);r.m.material.opacity=.8*(1-r.t);if(r.t>=1){scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();rings.splice(i,1);}}}
let shakeT=0;
function poundFx(p){const [x,y,z]=p;SFX.pound();impactRing(x,y,z,'#f2873a',4.2);puff(x,y,z,22,2.6,null,.55,.5);if(PROG.settings.shake&&!reduceMotion)shakeT=.35;}
function sparkle(p,n){if(PROG.settings.reduceFlash)n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=Math.random()*6.28,sp=.6+Math.random()*1.8;emit(p.x,p.y+.25,p.z,Math.cos(a)*sp,.5+Math.random()*1.6,Math.sin(a)*sp,.7,1,.9,.07,.8,1.5,.8);}}
function celebrate(){if(golem.A)golem.A.shot('Cheer',1.25);if(sprite.A)sprite.A.shot('Cheer',1.35);if(!PROG.settings.reduceFlash)sparkle(sprite.pos,20);}
function fadeIn(){const f=$('fade');f.classList.remove('go');f.style.opacity=1;void f.offsetWidth;f.classList.add('go');f.style.opacity=0;}

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
    pl:G.placed,en:G.ending?1:0,et:r2(G.endT),f:G.falls,fn:G.fallN,lf:G.lastFall,th:G.throws,pk:G.pick,us:G.useN,
    rg:G.region,sc:[G.scene,G.line,r2(G.lineT)],cd:G.card,fo:G.fountainOn?1:0,
    ev:[G.poundN,r2(G.poundAt[0]),r2(G.poundAt[1]),r2(G.poundAt[2]),G.crackN,G.launchN,G.launchBig,G.seedN,G.petalN,G.secretN,G.lastSecret,G.wsN,G.lastWs,G.splashN,G.lastSplash,G.plantN,G.waitN,G.dlgN,G.dlg,G.travelReq,G.hopN||0],
    x:[r2(seesaw.tilt),crack.broken?1:0,stones.raised?1:0,r2(stones.t),levers[2]&&levers[2].pulled?1:0,golem.pound?1:0,r2(golem.airT||0),stair.raised?1:0,r2(stair.t),pav.open?1:0,r2(pav.t),VCAVE.grotto.open?1:0,r2(VCAVE.grotto.t),VCAVE.echo.raised?1:0,r2(VCAVE.echo.t),pav.lit?1:0],
    ch:[G.ch.seeds,G.ch.petals,G.ch.secrets,G.ch.launches,G.ch.pulses|0],
    m2:G.region==='ch2'?packMines():null,
    pg:{r:PROG.roots,ws:Object.keys(PROG.ws).join(','),sd:Object.keys(PROG.seeds).join(','),pt:Object.keys(PROG.petals).join(','),se:Object.keys(PROG.secrets).join(','),pl:PROG.planted,sn:Object.keys(PROG.seen).join(','),c1:PROG.ch1.done,b1:PROG.ch1.best,c2:PROG.ch2.done,b2:PROG.ch2.best,l2:PROG.ch2.lan|0,d2:PROG.ch2.door|0}};
}
// the Lantern Mines (only sent while the players are there)
function packMines(){const C=mine.cart,L=mine.lift,B=mine.boulder,pa=G.pulseAt||[0,0,0];
  return [mine.lan,CRYST.map(c=>r2(c.t)),r2(C.s),C.br,mine.sw.b?1:0,mine.bar.broken?1:0,r2(L.t),L.cw?1:0,BSTATES.indexOf(B.st),r2(B.x),r2(B.y),r2(B.rot),mine.wall.broken?1:0,
    LSTONES.map(x=>RS.indexOf(x.state)),mine.placed,mine.door.open?1:0,r2(mine.door.t),mine.crack.broken?1:0,
    [G.pulseN|0,r2(pa[0]),r2(pa[1]),r2(pa[2]),G.crystN|0,G.swN|0,G.smashN|0,G.bumpN|0,G.rollN|0,G.bowlN|0,G.wallN|0,G.boomN|0,G.lanN|0],golem.winding?1:0,sprite.winding?1:0,r2(C.roll),C.moved>0?1:0,L.moving?1:0];}
function applyMines(m){
  if(!Array.isArray(m))return;const C=mine.cart,L=mine.lift,B=mine.boulder;
  mine.lan=m[0]|0;if(Array.isArray(m[1]))m[1].forEach((t,i)=>{const c=CRYST[i];if(c){c.t=+t||0;c.col.on=c.t>0;}});
  C.s=+m[2]||0;C.br=m[3]===1?1:m[3]===0?0:-1;syncCart();mine.sw.b=!!m[4];mine.bar.broken=!!m[5];mine.bar.col.on=!mine.bar.broken;
  L.t=clamp(+m[6]||0,0,1);L.col.min.y=L.t*MINE.liftH-.25;L.col.max.y=L.t*MINE.liftH;L.cw=!!m[7];
  B.st=BSTATES[m[8]]||'idle';B.x=+m[9]||0;B.y=+m[10]||0;B.rot=+m[11]||0;mine.wall.broken=!!m[12];mine.wall.col.on=!mine.wall.broken;
  if(Array.isArray(m[13]))m[13].forEach((k,i)=>{if(LSTONES[i])LSTONES[i].state=RS[k]||'rest';});
  mine.placed=m[14]|0;mine.door.open=!!m[15];mine.door.t=+m[16]||0;mine.crack.broken=!!m[17];mine.crack.col.on=!mine.crack.broken;
  if(Array.isArray(m[18])){const e=m[18];G.pulseN=e[0]|0;G.pulseAt=[+e[1]||0,+e[2]||0,+e[3]||0];G.crystN=e[4]|0;G.swN=e[5]|0;G.smashN=e[6]|0;G.bumpN=e[7]|0;G.rollN=e[8]|0;G.bowlN=e[9]|0;G.wallN=e[10]|0;G.boomN=e[11]|0;G.lanN=e[12]|0;}
  golem.winding=!!m[19];sprite.winding=!!m[20];C.roll=+m[21]||0;C.moved=m[22]?.25:0;L.moving=!!m[23];
  for(const l of MLEVERS)l.pulled=l.id==='switch'?mine.sw.b:l.id==='cw'?L.cw:mine.door.open;
}
const keySet=v=>{const o={};if(typeof v==='string'&&v)for(const k of v.split(',').slice(0,400))if(k)o[k.slice(0,24)]=1;return o;};
const RS=['rest','perched','vault','rolling','free','carried','placed'];
const tgtG=new V3(),tgtS=new V3();
function applyState(st){
  if(!st||!Array.isArray(st.g))return;
  const ph=['brief','play','end'].includes(st.ph)?st.ph:'brief';
  if(ph==='end'&&G.phase==='play'&&$('scrEnd').hidden)G.firstClear=false;
  if(ph==='play'&&G.phase!=='play'){camSnap=true;}
  G.phase=ph;G.time=+st.t||0;
  const g=st.g,s=st.s;
  tgtG.set(+g[0],+g[1],+g[2]);golem.yaw=+g[3];golem.vel.set(+g[4],0,+g[5]);golem.holding=!!g[6];golem.charging=!!g[7];golem.charge=+g[8];golem.runes=g[9]|0;golem.onGround=!!g[10];golem.pushing=!!g[11];
  tgtS.set(+s[0],+s[1],+s[2]);sprite.yaw=+s[3];sprite.vel.set(+s[4],+s[5],+s[6]);sprite.held=!!s[7];sprite.gliding=!!s[8];sprite.onGround=!!s[9];
  if(Array.isArray(st.b))block.pos.set(+st.b[0],+st.b[1],+st.b[2]);
  if(Array.isArray(st.r))st.r.forEach((a,i)=>{const r=runes[i];if(!r||!Array.isArray(a))return;r.state=RS[a[0]]||r.state;r.pos.set(+a[1],+a[2],+a[3]);});
  const d=st.d||[];gate.open=!!d[0];bridge.open=!!d[1];port.open=!!d[2];latch.t=+d[3]||0;plates[0].on=!!d[4];plates[1].on=!!d[5];levers[0].pulled=!!d[6];levers[1].pulled=!!d[7];crank.used=!!d[8];
  gate.t=+d[9]||0;bridge.t=+d[10]||0;port.t=+d[11]||0;
  if(typeof st.rg==='string'&&REG[st.rg]&&st.rg!==G.region){enterRegion(st.rg);if(st.rg==='vale')VALE.wake=(Array.isArray(st.sc)&&st.sc[0]==='root1')?0:valeWakeTarget();}
  if(Array.isArray(st.sc)){G.scene=SCENES[st.sc[0]]?st.sc[0]:'';G.line=st.sc[1]|0;G.lineT=+st.sc[2]||0;}
  G.card=MEMS.some(m=>m.id===st.cd)?st.cd:'';G.fountainOn=!!st.fo;
  if(Array.isArray(st.ev)){const e=st.ev;G.poundN=e[0]|0;G.poundAt=[+e[1]||0,+e[2]||0,+e[3]||0];G.crackN=e[4]|0;G.launchN=e[5]|0;G.launchBig=e[6]|0;G.seedN=e[7]|0;G.petalN=e[8]|0;G.secretN=e[9]|0;G.lastSecret=String(e[10]||'').slice(0,40);
    G.wsN=e[11]|0;G.lastWs=String(e[12]||'').slice(0,40);G.splashN=e[13]|0;G.lastSplash=e[14]==='g'?'g':'s';G.plantN=e[15]|0;G.waitN=e[16]|0;G.dlgN=e[17]|0;G.dlg=DLG[e[18]]?e[18]:'';G.travelReq=e[19]|0;G.hopN=e[20]|0;}
  if(Array.isArray(st.x)){const x=st.x;seesaw.tilt=+x[0]||-1;crack.broken=!!x[1];stones.raised=!!x[2];stones.t=+x[3]||0;if(levers[2])levers[2].pulled=!!x[4];golem.pound=!!x[5];golem.airT=+x[6]||0;
    stair.raised=!!x[7];stair.t=+x[8]||0;pav.open=!!x[9];pav.t=+x[10]||0;pav.lit=!!x[15];for(const l of levers){if(l.id==='stair')l.pulled=stair.raised;if(l.id==='pavilion')l.pulled=pav.open;}stepOrchard(0);
    VCAVE.grotto.open=!!x[11];VCAVE.grotto.t=+x[12]||0;VCAVE.echo.raised=!!x[13];VCAVE.echo.t=+x[14]||0;for(const l of VLEVERS)l.pulled=l.id==='grotto'?VCAVE.grotto.open:VCAVE.echo.raised;stepCaves(0);}
  if(Array.isArray(st.ch))G.ch={seeds:st.ch[0]|0,petals:st.ch[1]|0,secrets:st.ch[2]|0,launches:st.ch[3]|0,pulses:st.ch[4]|0};
  if(G.region==='ch2'&&st.m2)applyMines(st.m2);
  if(st.pg&&typeof st.pg==='object'){const p=st.pg;PROG.roots=clamp(p.r|0,0,7);PROG.ws=keySet(p.ws);PROG.seeds=keySet(p.sd);PROG.petals=keySet(p.pt);PROG.secrets=keySet(p.se);PROG.planted=p.pl|0;PROG.seen=keySet(p.sn);PROG.ch1.done=p.c1?1:0;PROG.ch1.best=p.b1|0;PROG.ch2.done=p.c2?1:0;PROG.ch2.best=p.b2|0;PROG.ch2.lan=p.l2|0;PROG.ch2.door=p.d2|0;}
  G.placed=st.pl|0;G.ending=!!st.en;G.endT=+st.et||0;G.falls=st.f|0;G.lastFall=st.lf==='g'?'g':'s';G.fallN=st.fn|0;G.throws=st.th|0;G.pick=st.pk|0;G.useN=st.us|0;
}
function guestSmooth(dt){
  const k=1-Math.exp(-dt*16);
  if(golem.pos.distanceTo(tgtG)>4)golem.pos.copy(tgtG);else golem.pos.lerp(tgtG,k);
  if(sprite.pos.distanceTo(tgtS)>4||sprite.held)sprite.pos.copy(tgtS);else sprite.pos.lerp(tgtS,k);
  for(const l of levers)l.t=approach(l.t,l.pulled?1:0,dt/.35);crank.t=approach(crank.t,crank.used?1:0,dt/2.6);
  for(const l of MLEVERS)l.t=approach(l.t,l.pulled?1:0,dt/.35);
  if(G.region==='ch2'){const L=mine.lift;if(L.moving)L.wheelA+=dt*.5;mine.sw.t=approach(mine.sw.t,mine.sw.b?1:0,dt/.4);}
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
  if(overlayOpen&&id!=='scrTitle')closeOverlay();
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
  if(mode!=='online'||role==='host'){const sp=startSpot();G.scene='';G.card='';travel(sp.reg,sp.g,sp.s,Math.PI);G.time=0;}
  if(mode==='local'){names.g=cleanName($('nameG').value);names.s=cleanName($('nameS').value);store('bs_nameG',names.g);store('bs_nameS',names.s);}
  else{names[myRole]=myName;names[myRole==='g'?'s':'g']=partnerName;}
  G.phase='play';G.paused=false;resetWatch();hudCache={};camYaw=camYawT=0;
  fillKeys($('ckeysG'),'g');fillKeys($('ckeysS'),'s');fillKeys($('hkeysG'),'g');fillKeys($('hkeysS'),'s');$('helpChat').hidden=mode!=='online';
  helpOpen=false;$('help').hidden=true;chipT=0;objShowT=10;cntShowT=4;$('promptG').dataset.who='Giant';$('promptS').dataset.who='Sprite';fillKeys($('pkeysG'),'g');fillKeys($('pkeysS'),'s');
  const online=mode==='online';
  $('cardG').hidden=online&&myRole!=='g';$('cardS').hidden=online&&myRole!=='s';
  $('cardG').classList.toggle('solo',online);$('cardS').classList.toggle('solo',online);
  refreshNames();show(null);camSnap=true;
}
function togglePause(){
  if(G.phase!=='play')return;
  if(chatOpen){closeChat();return;}
  const open=$('scrPause').hidden;
  if(open){G.paused=mode==='local';$('pauseEyebrow').textContent=(mode==='local'?'Paused':'Menu (the game keeps running online)')+' · '+curReg.name;$('pauseObj').textContent=objectiveText();
    const boss=mode!=='online'||role==='host',inCh=G.region==='ch1'||G.region==='ch2';$('bRestart').hidden=!boss||!inCh;$('bToVale').hidden=!boss||!inCh;$('scrPause').hidden=false;}
  else{G.paused=false;$('scrPause').hidden=true;}
}
function toTitle(){if(mode==='online'){leaveOnline();if(role!=='host'){const st=PROG.settings;PROG=freshProgress();loadProgress();PROG.settings=st;}}
  G.scene='';G.card='';closeOverlay();refreshTitleSave();mode=null;G.phase='title';G.paused=false;clearChat();partnerName='';partnerHere=false;names.g=names.s='';show('scrTitle');}
function showEnd(){
  const dl=$('endStats');dl.textContent='';const m=Math.floor(G.time/60),s=Math.floor(G.time%60),n=G.region==='ch2'?2:1,reg='ch'+n;
  const add=(a,b)=>{const dt=document.createElement('dt');dt.textContent=a;const dd=document.createElement('dd');dd.textContent=b;dl.append(dt,dd);};
  add('Time',m+' min '+s+' s');add('Golden seeds',seedsFoundIn(reg)+' of '+seedsIn(reg).length);
  const pc=PETALS.filter(p=>p.reg===reg);add('Memory petals',pc.filter(p=>PROG.petals[p.id]).length+' of '+pc.length);add('Secrets',REG[reg].secrets.filter(x=>PROG.secrets[x.id]).length+' of '+REG[reg].secrets.length);
  if(n===1){add(nameOf('s')+' thrown',G.throws+' times');add('Seesaw launches',String(G.ch.launches));}
  else{add('Lanterns lit',countBits(mine.lan)+' of '+LANTERNS.length);add('Light pulses',String(G.ch.pulses|0));add(nameOf('s')+' thrown',G.throws+' times');}
  add('Falls',String(G.falls));
  $('endEyebrow').textContent=n===1?'Chapter 1 · The Sunken Garden':'Chapter 2 · The Lantern Mines';$('endTitle').textContent=n===1?'The fountain wakes':'The Great Lantern wakes';
  $('endLede').textContent=n===1?nameOf('g')+' and '+nameOf('s')+' woke the fountain together. Far away, under the Vale, the first root stirs.':nameOf('g')+' and '+nameOf('s')+' lit the Great Lantern together. Deep under the hills, the second root wakes.';
  $('bEndMenu').firstChild.textContent=n===1?'Keep exploring the garden ':'Keep exploring the mines ';
  const boss=mode!=='online'||role==='host';$('bAgain').hidden=!boss;$('bEndMenu').hidden=!boss;$('endWait').hidden=boss;show('scrEnd');
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
$('bRestart').onclick=()=>{$('scrPause').hidden=true;if(G.region==='ch1')resetLevel();else if(G.region==='ch2')resetMines();G.paused=false;resetWatch();};
$('bToVale').onclick=()=>{$('scrPause').hidden=true;G.paused=false;returnToVale();};
$('bJournal').onclick=()=>openJournal('story');$('bMapP').onclick=openMap;$('bSettings').onclick=openSettings;$('bSettingsT').onclick=()=>{initAudio();openSettings();};
$('bMute').onclick=()=>setMuted(!muted);
$('bQuit').onclick=()=>{$('scrPause').hidden=true;toTitle();};
function returnToVale(){const sp=valeSpotAtGate(G.region==='ch2'?2:1);G.phase='play';travel('vale',sp.g,sp.s,sp.yaw);show(null);}
$('bAgain').onclick=returnToVale;
$('bEndMenu').onclick=()=>{G.phase='play';show(null);};
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
const PERF={acc:0,n:0,pr:Math.min(1.5,window.devicePixelRatio||1),max:Math.min(1.75,window.devicePixelRatio||1)};
function perfTune(rawDt){if(G.phase!=='play'&&G.phase!=='title')return;PERF.acc+=rawDt;PERF.n++;if(PERF.acc<1.5)return;
  const ms=PERF.acc/PERF.n*1000;PERF.acc=0;PERF.n=0;let pr=PERF.pr;
  if(ms>19)pr=Math.max(.75,pr-(ms>28?.25:.1));else if(ms<14.5)pr=Math.min(PERF.max,pr+.05);
  if(Math.abs(pr-PERF.pr)>.01){PERF.pr=pr;renderer.setPixelRatio(pr);renderer.setSize(innerWidth,innerHeight,false);pMat.uniforms.uScale.value=innerHeight*pr*.5;}}
function tick(now){
  const raw=(now-last)/1000;const dt=clamp(raw,0,.05);last=now;const t=now/1000;if(raw>0&&raw<.5)perfTune(raw);
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
  if(G.phase==='play'&&!$('scrEnd').hidden)show(null);
  if(mode==='online'&&role==='guest'&&G.phase==='brief'&&!$('scrEnd').hidden){openBrief();}
  updateCamera(dt,t);
  if(G.phase!=='loading'){updateVisuals(dt,t);updateParticles(dt);updateAudio(dt);updateFades(dt);}
  updateOverlay();updateChat(dt);updateStoryUI();updateCardUI();
  if(overlayOpen==='scrMap'&&Math.floor(t*4)!==Math.floor((t-dt)*4))drawMap($('mapCanvas'));
  if(saveT>0){saveT-=dt;if(saveT<=0)saveProgress();}
  renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else if(!muted)AC.resume();});

// ================= boot =================
const BOOTMS={};
async function boot(){const tb=performance.now();
  loadProgress();
  try{buildTextures();buildMaterials();}catch(e){console.error(e);fail('Something went wrong while preparing the garden: '+e.message);return;}
  $('loadText').textContent='Waking the Giant and the Sprite…';
  const L=new GLTFLoader();L.setDRACOLoader(DRACO);
  const chars=Promise.all([L.loadAsync('assets/models/giant.glb'),L.loadAsync('assets/models/sprite.glb')]).then(([a,b])=>{MODELS={giant:a,sprite:b};}).catch(e=>{console.warn('Character models could not load, using simple shapes.',e);MODELS=null;});
  $('loadText').textContent='Fetching the sky, trees and textures…';
  await Promise.all([chars,loadProps(),loadReal()]);
  $('loadText').textContent='Growing the Vale…';await new Promise(r=>setTimeout(r,30));
  try{
    const tb0=performance.now();buildSky();if(REAL.ready)setupSky();
    buildVale();const tb1=performance.now();
    curBuild='ch1';
    const R=beginRegion('ch1',{name:'Chapter 1: The Sunken Garden',short:'Sunken Garden',chapter:1,fog:[70,190],fogReal:[80,320],spawn:{g:CP[0].g,s:CP[0].s},
      hazard:b=>b.pos.x>POOL.x0&&b.pos.x<POOL.x1&&b.pos.z>POOL.z0&&b.pos.z<POOL.z1&&b.pos.y<POOL.y-.3});
    if(REAL.ready)ch1RealBegin();
    buildWorld();buildInteractives();buildCh1Extras();buildOrchard();if(REAL.ready)ch1RealFinish();endRegion(R);buildSeedInstances('ch1');curBuild='';BOOTMS.vale=Math.round(tb1-tb0);BOOTMS.ch1=Math.round(performance.now()-tb1);
    const tb2=performance.now();buildMines();curBuild='';BOOTMS.ch2=Math.round(performance.now()-tb2);
    storyHooks();
    buildGolem();buildSprite();initAmbientParticles();
    enterRegion('ch1');resetLevel();enterRegion('ch2');resetMines();enterRegion('vale');resetCaves();
    const sp=startSpot();placeAt(golem,sp.g);placeAt(sprite,sp.s);
  }
  catch(e){console.error(e);fail('Something went wrong while building the Vale: '+e.message);return;}
  wireSettings();
  try{renderer.compile(scene,camera);}catch(e){}
  // the tree-fade shaders too, so the first tree that fades doesn't stutter
  try{const sw=v=>{for(const F of REAL.forestSets||[])for(const g of F.groups){g.fullWood.material=v?F.woodFade:F.woodMat;g.fullLeaf.material=v?F.leafFade:F.leafMat;}};sw(true);renderer.compile(scene,camera);sw(false);}catch(e){}
  BOOTMS.total=Math.round(performance.now()-tb);
  $('loading').hidden=true;G.phase='title';show('scrTitle');refreshTitleSave();
  $('nameIn').value=recall('bs_name');
  if(matchMedia('(pointer: coarse)').matches&&!matchMedia('(pointer: fine)').matches){$('netNote').textContent='This game needs a keyboard. On a phone or tablet it can only be watched.';}
  requestAnimationFrame(t=>{last=t;frame(t);});
}
// small debug handle used by automated tests
window.__bs={get PROG(){return PROG;},REG,travel,travelToWaystone,seesaw,crack,stones,SEEDS,PETALS,WAYS,GATES,VALE,playScene,skipScene,storyNext,valeH,saveProgress,eraseProgress,openMap,closeOverlay,get overlay(){return overlayOpen;},
  G,golem,sprite,get block(){return block;},runes,gate,bridge,port,plates,levers,get crank(){return crank;},latch,stepSim,resetLevel,startLocal:()=>{mode='local';resetLevel();startPlay();},NOIN,W,fadeables,camera,
  get camYaw(){return camYaw;},rotateCam,set dbgDist(v){dbgDist=v;},advance:(sec)=>{let n=performance.now();for(let i=0;i<sec*60;i++){n+=1000/60;tick(n);}},get models(){return MODELS;},set bot(v){BOT=v;},get bot(){return BOT;},
  get ch1(){return {CP,F,SEESAW,POOL,CELLAR,levers,crank,runes,plates,stones,crack,exitGate,W,ORCH,TOWER,PAV,stair,pav};},get colliders(){return colliders;},get curReg(){return curReg;},get greet(){return GREET;},get perch(){return PERCH;},get caves(){return {CAVES,VCAVE,VLEVERS};},get ch2(){return {mine,MCP,GL,LANTERNS,CRYST,MLEVERS,LSTONES,WINCH_B,WINCH_T,MINE,lightPulse,resetMines,BSTATES};},packState,applyState,get renderer(){return renderer;},BOOTMS,scene,travelReq:()=>G.travelReq};
boot();

})();
