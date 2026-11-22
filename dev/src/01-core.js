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
