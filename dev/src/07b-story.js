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
    {text:'Five roots still sleep. The gate to the Windmill Heights, at the eastern edge of the Vale, has begun to glow.',p:[[60,30,34],[72,34,16]],l:[[104,6,-8],[104,8,-8]]}]},
  ch3_intro:{title:'Chapter 3: The Windmill Heights',lines:[
    {text:'The Windmill Heights float above the clouds. Long ago their windmills pumped water all the way up to the orchards.',p:[[0,10,26],[8,14,16]],l:[[0,2,-10],[10,6,-40]]},
    {text:'Since the Hush the wind still blows, but nothing catches it. The Great Windmill\u2019s gearbox lies empty.',p:[[30,24,-50],[34,26,-60]],l:[[52,20,-84],[52,22,-84]]},
    {text:'Find its three cogs, set them in place and free the brake, and the third root will wake.',p:[[-6,14,-40],[20,18,-56]],l:[[0,0,-36],[14,6,-66]]},
    {text:'The wind is strong up here. Spread your wings, little one, and let it carry you.',p:[[0,5,14],[0,4,11]],l:[[0,1.2,4],[0,1.2,4]]}]},
  root3:{title:'The third root wakes',lines:[
    {text:'High above the eastern clouds, the third root wakes.',p:[[80,30,12],[92,26,0]],l:[[104,8,-8],[104,10,-8]]},
    {text:'Little windmills start to spin on the Vale\u2019s hills.',p:[[-26,14,64],[-8,12,44]],l:[[-40,4,38],[0,4,12]]},
    {text:'Four roots still sleep. The gate to the Frostmere Lake, in the south-east of the Vale, has begun to glow.',p:[[30,30,30],[12,34,22]],l:[[78,6,74],[78,8,74]]}]},
  ch4_intro:{title:'Chapter 4: The Frostmere Lake',lines:[
    {text:'The Frostmere Lake has been frozen since the Hush. Snow lies on the pines, and nothing moves on the ice.',p:[[0,9,24],[0,12,8]],l:[[0,1,-10],[0,1,-30]]},
    {text:'On its island stands the old hearth that once warmed the whole shore. It has gone cold.',p:[[10,14,-58],[6,12,-62]],l:[[0,2,-72],[0,2,-72]]},
    {text:'Bring it three embers and clear its chimney, and the fourth root will wake.',p:[[-20,16,-30],[20,16,-40]],l:[[-24,0,-58],[24,0,-52]]},
    {text:'Mind your feet. The ice is slippery, and some of it is very thin.',p:[[0,5,14],[0,4,11]],l:[[0,1.2,4],[0,1.2,4]]}]},
  root4:{title:'The fourth root wakes',lines:[
    {text:'Far across the snow, the fourth root wakes, and the Frostmere Lake begins to thaw.',p:[[60,26,90],[70,22,80]],l:[[78,6,74],[78,8,74]]},
    {text:'Frost lilies open along the river, cool and bright.',p:[[-30,10,70],[0,8,66]],l:[[-20,0,54],[20,0,50]]},
    {text:'Three roots still sleep. The gate to the Mushroom Marsh has begun to flicker. (Chapter 5 arrives in a later update.)',p:[[-30,30,40],[-50,34,40]],l:[[-78,6,74],[-78,8,74]]}]},
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
  h1:{who:'s',text:"So much sky! {g}, don't look down.",next:'h2'},
  h2:{who:'g',text:"I never look down, {s}. I'm a rock. Rocks sink."},
  h3:{who:'s',text:'That wind is rising! If I spread my wings in it…'},
  h4:{who:'g',text:"Too deep for you, {s}. Climb up. I'll wade."},
  h5:{who:'s',text:'There, on the stone in the middle! A cog. Grab it, {g}.'},
  h6:{who:'s',text:'The wind pours out of that old gate. The sails could steer it.'},
  h7:{who:'g',text:'If I turn the near sail aside, the wind reaches the far one.'},
  h8:{who:'s',text:'The big wheel is turning! We can ride it up, {g}.'},
  h9:{who:'g',text:'The cog is over there. Into the wind you go, {s}.'},
  h10:{who:'s',text:'Behind the waterfall… a hidden room! Wade in, {g}.'},
  h11:{who:'s',text:'The gearbox is empty. Three cogs, and the Great Windmill turns again.'},
  h12:{who:'g',text:"You're flying, {s}. Really flying."},
  f1:{who:'s',text:'Brr! Everything is frozen, {g}. Even the gate.'},
  f2:{who:'g',text:"Careful, {s}. I don't stop well on ice."},
  f3:{who:'s',text:'If that block slid all the way to the water…'},
  f4:{who:'g',text:'That ice is too thin for me. It creaks when I look at it.'},
  f5:{who:'s',text:"I'm light! I'll skate across and thaw that lever."},
  f6:{who:'g',text:'A snowball. If I keep rolling it, it will keep growing.'},
  f7:{who:'s',text:'Bigger, {g}! Big enough to fill that crack.'},
  f8:{who:'g',text:'The old hearth. We used to sit by it, didn\u2019t we, {s}?'},
  f9:{who:'s',text:'Something glows behind that ice wall. Let me warm it.'},
  f10:{who:'s',text:'A little hut, frozen shut. I wonder who fished here.'},
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
  {id:'m9',where:'Chapter 3: the cloud nest',title:'Naming Clouds',text:'On lazy afternoons they lay on the hill and named the clouds. The Sprite saw dragons and boats. The Giant only ever saw rocks, and said so, every single time.'},
  {id:'m10',where:'Chapter 3: behind the waterfall',title:'Carrying Water',text:'Every morning the Giant carried water up the hill to the young tree, one careful bucket at a time, until the Sprite drew a windmill in the mud and said, \u201cLet the wind carry it.\u201d'},
  {id:'m11',where:'Chapter 3: the windmill rooftop',title:'The Windiest Day',text:'On the windiest day of the year the Sprite let the wind lift her higher than the tree. Far below, the Giant held his breath until she came back down.'},
  {id:'m12',where:'Chapter 4: the fishing hut',title:'Winter Fish',text:'One hard winter the Giant cut a hole in the lake for the Sprite to fish through. The Sprite caught nothing all day, and then one silver fish that she let go again.'},
  {id:'m13',where:'Chapter 4: the thin-ice islet',title:'Skating',text:'The Sprite skated in circles on the thin ice where the Giant could never follow. He stood at the shore and clapped every time she spun.'},
  {id:'m14',where:'Chapter 4: the great boulder',title:'The First Snowman',text:'They built a snowman together. The Giant rolled the body as tall as himself; the Sprite made a tiny head and stuck a single pine needle on it for a smile.'},
];
function drawMemory(c,id,W,H){
  const sky=c.createLinearGradient(0,0,0,H);
  const pal={m0:['#ffd9a8','#f7a7a0'],m1:['#bfe3f2','#e6f3e0'],m2:['#9fb8c9','#d2dfe0'],m3:['#ffe7b8','#cfe9c8'],m4:['#c9d6e6','#f1f4f7'],m5:['#d9f0c4','#fff3cf'],m6:['#1f2a4a','#4a4f78'],m7:['#3a2c22','#5e4a38'],m8:['#141a2a','#2c3550'],m9:['#9fd0f2','#eaf6ff'],m10:['#ffe3b0','#d9efc7'],m11:['#7fbfe8','#e9f6ff'],m12:['#cfe2ee','#f4f9fc'],m13:['#bcd9ea','#eef7fb'],m14:['#dfe9f1','#ffffff']}[id]||['#bfe3f2','#e6f3e0'];
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
  else if(id==='m9'){c.fillStyle='rgba(255,255,255,.9)';for(const [x,y,r] of [[.2,.2,40],[.27,.18,30],[.6,.3,50],[.7,.26,36],[.82,.15,28]]){c.beginPath();c.arc(W*x,H*y,r,0,7);c.fill();}
    hill(H*.72,'#8fc46e',16,1.2);c.fillStyle='#8c7a6a';c.beginPath();c.ellipse(W*.42,H*.8,70,22,0,0,7);c.fill();c.beginPath();c.arc(W*.33,H*.78,20,0,7);c.fill();spr(W*.56,H*.76,.8);}
  else if(id==='m10'){hill(H*.6,'#a3cf84',22,.6);hill(H*.86,'#8a6a4c',6,1.6);c.strokeStyle='#5a4632';c.lineWidth=4;
    c.beginPath();c.moveTo(W*.7,H*.86);c.lineTo(W*.7,H*.66);c.moveTo(W*.62,H*.6);c.lineTo(W*.78,H*.72);c.moveTo(W*.78,H*.6);c.lineTo(W*.62,H*.72);c.stroke();
    c.fillStyle='#7aa7c7';c.fillRect(W*.24,H*.78,22,20);giant(W*.32,H*.94,.9);spr(W*.74,H*.58,.9);}
  else if(id==='m11'){c.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<8;i++){c.beginPath();c.ellipse(hash2(i,1,9)*W,hash2(i,2,9)*H*.5,40+hash2(i,3,9)*40,14,0,0,7);c.fill();}
    hill(H*.86,'#93c070',8,2.2);c.strokeStyle='#7a5a3c';c.lineWidth=4;c.beginPath();c.moveTo(W*.3,H*.88);c.lineTo(W*.3,H*.74);c.stroke();c.fillStyle='#6cbf52';c.beginPath();c.arc(W*.3,H*.72,16,0,7);c.fill();
    giant(W*.42,H*.97,.6);spr(W*.66,H*.2,1.1);}
  else if(id==='m12'||id==='m13'||id==='m14'){c.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<60;i++){c.beginPath();c.arc(hash2(i,1,12)*W,hash2(i,2,12)*H*.7,1+hash2(i,3,12)*2,0,7);c.fill();}
    hill(H*.74,'#eef4f8',10,1.4);c.fillStyle='#a9d3e6';c.beginPath();c.ellipse(W*.5,H*.86,W*.42,H*.1,0,0,7);c.fill();
    if(id==='m12'){c.fillStyle='#2d4f63';c.beginPath();c.ellipse(W*.6,H*.86,20,8,0,0,7);c.fill();giant(W*.38,H*.95,.9,true);spr(W*.62,H*.74,.9);c.fillStyle='#d8e6ee';c.beginPath();c.ellipse(W*.7,H*.7,12,5,.3,0,7);c.fill();}
    else if(id==='m13'){c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=2;c.beginPath();c.ellipse(W*.6,H*.86,60,12,0,0,7);c.stroke();spr(W*.6,H*.78,.9);giant(W*.2,H*.92,.8);}
    else{c.fillStyle='#ffffff';c.beginPath();c.arc(W*.6,H*.76,40,0,7);c.fill();c.beginPath();c.arc(W*.6,H*.6,14,0,7);c.fill();giant(W*.36,H*.95,.9);spr(W*.68,H*.55,.8);}}
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
  if(PROG.ch3.done)out.push(['The Windmill Heights','High above the clouds they found three cogs, rode the wind and freed the Great Windmill\u2019s brake. The third root woke, and little windmills spin on the Vale\u2019s hills.']);
  else if(PROG.ch2.done)out.push(['Next','The gate to the Windmill Heights glows at the eastern edge of the Vale. Up there the Great Windmill is missing three cogs.']);
  if(PROG.ch4.done)out.push(['The Frostmere Lake','On the frozen lake they slid ice, rolled a snowball as big as a bridge and melted their way to three embers. The old hearth burns again, the lake is thawing, and frost lilies line the Vale\u2019s river.']);
  else if(PROG.ch3.done)out.push(['Next','The gate to the Frostmere Lake glows in the south-east of the Vale. Its old hearth needs three embers.']);
  if(PROG.ch4.done)out.push(['Next','A fifth gate, to the Mushroom Marsh, has begun to flicker. Chapter 5 arrives in a later update.']);
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
    if(PROG.ch3.best)add('Best time, Chapter 3',Math.floor(PROG.ch3.best/60)+' min '+(PROG.ch3.best%60)+' s');
    if(PROG.ch4.best)add('Best time, Chapter 4',Math.floor(PROG.ch4.best/60)+' min '+(PROG.ch4.best%60)+' s');
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
  let x0,x1,z0,z1;if(G.region==='vale'){x0=-128;x1=128;z0=-128;z1=128;}else if(G.region==='ch2'){x0=-38;x1=78;z0=-88;z1=8;}else if(G.region==='ch3'){x0=-20;x1=64;z0=-92;z1=12;}else if(G.region==='ch4'){x0=-40;x1=34;z0=-86;z1=12;}else{x0=-44;x1=48;z0=-86;z1=8;}
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
  }else if(G.region==='ch4'){
    c.fillStyle='#dfe9ef';c.fillRect(X(x0),Z(z1),(x1-x0)*s,(z0-z1)*s);
    for(const k of REG.ch4.colliders){if(!k.mesh||!k.on)continue;const top=k.max.y;if(top>.05||top<-.05)continue;c.fillStyle=k.surface==='ice'?'#bfe0ee':'#ffffff';c.fillRect(X(k.min.x),Z(k.min.z),(k.max.x-k.min.x)*s,(k.max.z-k.min.z)*s);}
    c.fillStyle='#5d8fa6';c.fillRect(X(FR.chan.x0),Z(FR.chan.z0),(FR.chan.x1-FR.chan.x0)*s,2*s);c.fillStyle='rgba(93,143,166,.5)';c.fillRect(X(FR.bay.x0),Z(FR.bay.z0),(FR.bay.x1-FR.bay.x0)*s,(FR.bay.z1-FR.bay.z0)*s);
    c.fillStyle='#3a4148';c.fillRect(X(FR.crev.x0),Z(FR.crev.z0),(FR.crev.x1-FR.crev.x0)*s,(FR.crev.z1-FR.crev.z0)*s);
    c.fillStyle='#8a7a66';c.fillRect(X(-2),Z(-74),4*s,4*s);label(c,'Hearth',X(0),Z(-75),'#243039');
    label(c,'Shore Camp',X(0),Z(-2),'#243039');label(c,'Ice Field',X(0),Z(-26),'#243039');label(c,'Snowfield',X(-24),Z(-45),'#243039');label(c,'The Narrows',X(18),Z(-45),'#243039');label(c,'To the Vale',X(0),Z(11),'#118a6f');
    for(const p of PETALS)if(p.reg==='ch4'&&PROG.petals[p.id]){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
  }else if(G.region==='ch3'){
    c.fillStyle='#cfe3f0';c.fillRect(X(x0),Z(z1),(x1-x0)*s,(z0-z1)*s);
    for(const I of ISLES.slice().sort((a,b)=>a.y-b.y)){c.fillStyle=I.y>10?'#7fae5c':I.y<-1?'#9fc283':'#95c46f';c.fillRect(X(I.x0),Z(I.z0),(I.x1-I.x0)*s,(I.z1-I.z0)*s);}
    c.fillStyle='#6fb6cf';c.fillRect(X(POND.x0),Z(POND.z0),(POND.x1-POND.x0)*s,(POND.z1-POND.z0)*s);
    for(const B of HBRIDGES){const b=B.col;c.fillStyle=B.open?'#b98a5a':'rgba(185,138,90,.35)';c.fillRect(X(b.min.x),Z(b.min.z),(b.max.x-b.min.x)*s,(b.max.z-b.min.z)*s);}
    c.fillStyle='#c9bfae';c.fillRect(X(-2),Z(-54),4*s,4*s);
    c.strokeStyle='#8a6448';c.lineWidth=3;c.beginPath();c.arc(X(WHEEL.cx),Z(WHEEL.cz),WHEEL.R*s,0,7);c.stroke();
    c.fillStyle='#8a7a66';c.fillRect(X(49),Z(-87),6*s,6*s);label(c,'Great Windmill',X(52),Z(-88)-6,'#243039');
    for(const w of WINDS){if(!w.on())continue;c.fillStyle='rgba(255,255,255,.75)';if(w.kind==='up'){c.beginPath();c.arc(X(w.x),Z(w.z),Math.max(3,w.r*s),0,7);c.fill();}else c.fillRect(X(w.x0),Z(w.z)-2,(w.x1-w.x0)*s,4);}
    label(c,'Landing Isle',X(0),Z(-1),'#243039');label(c,'Wading Isle',X(0),Z(-47),'#243039');label(c,'Sail Terrace',X(-4),Z(-72),'#243039');label(c,'High Orchard',X(40),Z(-76),'#243039');label(c,'To the Vale',X(0),Z(11),'#118a6f');
    for(const p of PETALS)if(p.reg==='ch3'&&PROG.petals[p.id]){c.fillStyle='#ff8fc0';c.beginPath();c.arc(X(p.pos.x),Z(p.pos.z),5,0,7);c.fill();}
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
    b.append(({vale:'The Vale: ',ch1:'Chapter 1: ',ch2:'Chapter 2: ',ch3:'Chapter 3: ',ch4:'Chapter 4: '}[w.reg]||'')+w.name);const sm=document.createElement('small');sm.textContent=here?'you are here':(w.reg===G.region?'this area':'another area');b.append(sm);
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
function heightsHooks(){
  REG.ch3.secrets=[
    {id:'c3_nest',name:'The cloud nest',test:b=>b.pos.x>17.5&&b.pos.x<21&&b.pos.z>1&&b.pos.z<5&&b.pos.y<-5&&b.pos.y>-6.5},
    {id:'c3_grotto',name:'Behind the waterfall',test:b=>b.pos.x<-10.4&&b.pos.x>-14&&b.pos.z<-33&&b.pos.z>-39},
    {id:'c3_roof',name:'The windmill rooftop',test:b=>b.pos.x>49&&b.pos.x<55&&b.pos.z<-81&&b.pos.z>-87&&b.pos.y>27.5}];
  REG.ch3.talk=[
    {id:'h1',x:0,z:3,r:5},{id:'h3',x:7,z:-4,r:4,cond:()=>!hts.b1.open},{id:'h4',x:0,z:-26,r:5,cond:()=>COGS[0].state==='rest'},
    {id:'h5',x:0,z:-31,r:4,cond:()=>COGS[0].state==='rest'&&sprite.held},{id:'h6',x:-10,z:-60,r:6},{id:'h7',x:5,z:-60,r:5,cond:()=>COGS[1].state==='perched'},
    {id:'h8',x:34,z:-58,r:5,cond:()=>wheelWind()&&!heightsDone()},{id:'h9',x:22,z:-81,r:4,cond:()=>COGS[2].state==='rest'&&golem.pos.y>12},
    {id:'h10',x:-9,z:-36,r:3,cond:()=>!PROG.secrets.c3_grotto},{id:'h11',x:52,z:-78,r:6,cond:()=>hts.placed<3&&golem.pos.y>12},
    {id:'h12',x:52,z:-77.9,r:2.5,cond:()=>sprite.pos.y>19}];
}
function frostHooks(){
  REG.ch4.secrets=[
    {id:'c4_hut',name:'The fishing hut',test:b=>b.pos.x>14.2&&b.pos.x<17.8&&b.pos.z>-37.8&&b.pos.z<-34.2},
    {id:'c4_ring',name:'The thin-ice islet',test:b=>b.pos.x>12.6&&b.pos.x<15.4&&b.pos.z>-59.4&&b.pos.z<-56.6&&b.pos.y>-.2},
    {id:'c4_rock',name:'The great boulder',test:b=>b.pos.x>6.4&&b.pos.x<9.6&&b.pos.z>-79.6&&b.pos.z<-76.4&&b.pos.y>3}];
  REG.ch4.talk=[
    {id:'f1',x:0,z:-9,r:4,cond:()=>!frs.gate.open},{id:'f2',x:0,z:-15,r:4},{id:'f3',x:6,z:-22,r:4,cond:()=>!ICEB.sunk},
    {id:'f4',x:4,z:-48,r:4,cond:()=>EMBERS[0].state==='rest'},{id:'f5',x:4,z:-52,r:4,cond:()=>!frs.cause},
    {id:'f6',x:-20,z:-46.6,r:4,cond:()=>!SNOWB.bridged},{id:'f7',x:-24,z:-49,r:4,cond:()=>!SNOWB.bridged&&SNOWB.r>.9},
    {id:'f8',x:0,z:-68,r:4},{id:'f9',x:-5,z:-76,r:4,cond:()=>EMBERS[2].state==='rest'},{id:'f10',x:13.5,z:-36,r:3}];
}
function countBits(n){let c=0;while(n){c+=n&1;n>>>=1;}return c;}
