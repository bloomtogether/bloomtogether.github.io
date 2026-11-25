// Scripted playthrough of Chapter 3: The Windmill Heights (every main puzzle and all three side areas), then the walk
// back out to the Vale and in again through the Windmill Heights gate.
// Both characters walk real routes (grid pathfinding around the level's colliders) and solve every puzzle with the
// same inputs a player has: riding the wind is holding jump, wading is walking. Nothing is teleported; the only help
// is that a throw is aimed by setting the Giant's facing before the throw.
//
// Run it in the browser console on the game page (local server or the live site), from the title screen:
//   const t = await import('/dev/tests/ch3-playthrough.js'); await t.run();
// It prints each step and returns {ok, steps, time}. It erases the save on this laptop first (and marks Chapters 1 and 2 done).

const FPS = 60, DT = 1 / FPS;

export async function run(opts = {}) {
  const B = window.__bs, L = B.ch1, g = B.golem, s = B.sprite, G = B.G;
  const log = opts.log || ((...a) => console.log('[ch3]', ...a));
  const steps = [];
  let simT = 0;

  // ---------------- input and stepping ----------------
  const IN = { g: blank(), s: blank() }, prev = { g: { j: 0, a: 0 }, s: { j: 0, a: 0 } };
  function blank() { return { mx: 0, mz: 0, jump: 0, act: 0 }; }
  function edged(w) { const r = IN[w], p = prev[w]; const o = { mx: r.mx, mz: r.mz, jump: r.jump, act: r.act, jumpP: r.jump && !p.j ? 1 : 0, actP: r.act && !p.a ? 1 : 0 }; p.j = r.jump; p.a = r.act; return o; }
  let ctl = { g: null, s: null }, frameN = 0; const seen = [];
  function frame() {
    if (G.card || G.scene) { // a memory card or story scene holds the world still: read it for a moment, then press on
      const id = G.card || G.scene; if (!seen.includes(id)) { seen.push(id); log('    shown:', G.card ? 'memory card ' + id : 'scene ' + id); }
      const p = { mx: 0, mz: 0, jump: 0, act: 0, jumpP: 0, actP: frameN % 40 === 39 ? 1 : 0 };
      B.stepSim(DT, p, p); simT += DT; frameN++; return;
    }
    for (const w of ['g', 's']) { const c = ctl[w]; Object.assign(IN[w], blank(), c ? c() || {} : {}); }
    B.stepSim(DT, edged('g'), edged('s')); simT += DT; frameN++;
    // every half second, let the real game loop run one frame too (visuals, HUD, story watchers), with the same movement
    if (frameN % 30 === 0 && !g.charging && !g.winding && !s.winding) { B.bot = { g: () => ({ ...IN.g, jump: 0, act: 0 }), s: () => ({ ...IN.s, jump: 0, act: 0 }) }; B.advance(DT); B.bot = null; }
  }
  async function until(cond, sec, what) {
    const end = simT + sec; let n = 0;
    while (simT < end) { if (cond()) return true; frame(); if (++n % 240 === 0) await new Promise(r => setTimeout(r, 0)); }
    if (cond()) return true;
    throw new Error('timed out: ' + what + ' (G at ' + fmt(g.pos) + ', S at ' + fmt(s.pos) + ')');
  }
  const wait = (sec) => until(() => false, sec, 'wait').catch(() => {});
  const fmt = p => '(' + p.x.toFixed(1) + ', ' + p.y.toFixed(1) + ', ' + p.z.toFixed(1) + ')';
  const dxz = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  async function step(name, fn) {
    const t0 = simT;
    try { await fn(); steps.push({ name, ok: true, sec: +(simT - t0).toFixed(1) }); log('ok  ', name, (simT - t0).toFixed(1) + 's'); }
    catch (e) { steps.push({ name, ok: false, err: e.message }); log('FAIL', name, e.message); throw e; }
  }

  // ---------------- pathfinding on a 0.25 m grid ----------------
  // Chapter 1 uses a fine 0.25 m grid; the Vale is much bigger, so 0.5 m, and its ground is the terrain
  let X0 = -48, Z0 = -86, CELL = .25, NX = 400, NZ = 380, terrainFloor = null;
  // the river (when awake it is deep water); bridges cross it at x = 0, -78 and 84
  const RIVER = [[-175, 64], [-120, 46], [-78, 57], [-36, 44], [0, 52], [42, 41], [84, 56], [128, 44], [175, 54]];
  function dry(x, z) {
    for (const bx of [0, -78, 84]) { let rz = 50; for (let i = 0; i < RIVER.length - 1; i++) if (bx >= RIVER[i][0] && bx <= RIVER[i + 1][0]) rz = RIVER[i][1] + (RIVER[i + 1][1] - RIVER[i][1]) * (bx - RIVER[i][0]) / (RIVER[i + 1][0] - RIVER[i][0]); if (Math.abs(x - bx) < 2 && Math.abs(z - rz) < 11) return true; }
    for (let i = 0; i < RIVER.length - 1; i++) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 7.6) return false; }
    return true;
  }
  function setGrid() {
    if (G.region === 'vale') { X0 = -130; Z0 = -130; CELL = .5; NX = 520; NZ = 520;
      if (!terrainFloor) { terrainFloor = new Uint8Array(NX * NZ); for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) terrainFloor[j * NX + i] = dry(X0 + i * CELL, Z0 + j * CELL) ? 1 : 0; } }
    else if (G.region === 'ch2') { X0 = -40; Z0 = -90; CELL = .25; NX = 480; NZ = 400; }
    else if (G.region === 'ch3') { X0 = -22; Z0 = -94; CELL = .25; NX = 360; NZ = 432; }
    else { X0 = -48; Z0 = -86; CELL = .25; NX = 400; NZ = 380; }
  }
  function grid(b) {
    setGrid();
    const y0 = b.pos.y, walk = new Uint8Array(NX * NZ), floor = new Uint8Array(NX * NZ), hw = b.hw + .02;
    const climb = Math.max(b.stepH, .35); // low curbs: the walker hops over them
    const mark = (arr, x0, x1, z0, z1, v) => {
      const i0 = Math.max(0, Math.ceil((x0 - X0) / CELL)), i1 = Math.min(NX - 1, Math.floor((x1 - X0) / CELL)); // cells whose centre is inside
      const j0 = Math.max(0, Math.ceil((z0 - Z0) / CELL)), j1 = Math.min(NZ - 1, Math.floor((z1 - Z0) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) arr[j * NX + i] = v;
    };
    const cols = B.colliders.filter(c => c.on && c !== b.col && c.kind !== 'golem');
    for (const c of cols) if (c.max.y <= y0 + b.stepH + .01 && c.max.y >= y0 - 1.25) mark(floor, c.min.x - .05, c.max.x + .05, c.min.z - .05, c.max.z + .05, 1);
    if (G.region === 'vale') for (let k = 0; k < walk.length; k++) floor[k] = floor[k] || terrainFloor[k];
    for (let k = 0; k < walk.length; k++) walk[k] = floor[k];
    for (const c of cols) if (c.max.y > y0 + climb + .01 && c.min.y < y0 + b.h) mark(walk, c.min.x - hw, c.max.x + hw, c.min.z - hw, c.max.z + hw, 0);
    return walk;
  }
  const cellOf = (x, z) => [Math.round((x - X0) / CELL), Math.round((z - Z0) / CELL)];
  function path(b, tx, tz) {
    const walk = grid(b), [si, sj] = cellOf(b.pos.x, b.pos.z);
    if (si < 0 || sj < 0 || si >= NX || sj >= NZ) return null;
    let [ti, tj] = cellOf(tx, tz);
    if (!walk[tj * NX + ti]) { // target inside something: aim for the nearest open cell
      let best = null, bd = 1e9; for (let r = 1; r < 24 && !best; r++) for (let j = tj - r; j <= tj + r; j++) for (let i = ti - r; i <= ti + r; i++) {
        if (i < 0 || j < 0 || i >= NX || j >= NZ || !walk[j * NX + i]) continue; const d = (i - ti) ** 2 + (j - tj) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
      if (best) [ti, tj] = best;
    }
    const N = NX * NZ, gS = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = []; const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const start = sj * NX + si, goal = tj * NX + ti, h = k => Math.hypot(k % NX - ti, Math.floor(k / NX) - tj);
    walk[start] = 1; gS[start] = 0; push(start, h(start));
    while (heap.length) {
      const [, k] = pop(); if (closed[k]) continue; closed[k] = 1; if (k === goal) break;
      const i = k % NX, j = Math.floor(k / NX);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
        const nk = nj * NX + ni; if (!walk[nk] || closed[nk]) continue; if (di && dj && (!walk[j * NX + ni] || !walk[nj * NX + i])) continue;
        const ng = gS[k] + (di && dj ? 1.414 : 1); if (ng < gS[nk]) { gS[nk] = ng; from[nk] = k; push(nk, ng + h(nk)); }
      }
    }
    if (from[goal] < 0 && goal !== start) return null;
    const out = []; for (let k = goal; k >= 0; k = from[k]) out.push([X0 + (k % NX) * CELL, Z0 + Math.floor(k / NX) * CELL]);
    return out.reverse();
  }
  // a controller that walks body b to (x, z); it re-plans when it stops making progress
  function walker(b, x, z, r = .45, extra = {}) {
    let p = null, idx = 0, replanT = 0, lastD = 1e9, stuckT = 0;
    const st = { done: false, fail: false };
    st.ctl = () => {
      const d = dxz(b.pos, x, z); if (d < r) { st.done = true; return { ...extra }; }
      if (!p || replanT <= 0) { p = path(b, x, z); idx = 0; replanT = 2; if (!p) { st.fail = true; return {}; } }
      replanT -= DT;
      while (idx < p.length - 1 && Math.hypot(p[idx][0] - b.pos.x, p[idx][1] - b.pos.z) < .5) idx++;
      const look = p[Math.min(idx + 3, p.length - 1)], ax = look[0] - b.pos.x, az = look[1] - b.pos.z, l = Math.hypot(ax, az) || 1;
      if (d < lastD - .02) { lastD = d; stuckT = 0; } else if ((stuckT += DT) > .7) {
        // stuck: hop only if a low curb is right ahead, otherwise re-plan
        replanT = 0; stuckT = 0; lastD = 1e9;
        const px = b.pos.x + ax / l * (b.hw + .3), pz = b.pos.z + az / l * (b.hw + .3);
        const curb = B.colliders.some(c => c.on && c.kind !== 'golem' && px > c.min.x && px < c.max.x && pz > c.min.z && pz < c.max.z && c.max.y > b.pos.y + b.stepH && c.max.y < b.pos.y + .7 && c.min.y < b.pos.y + .1);
        if (curb && b.onGround) return { ...extra, mx: ax / l, mz: az / l, jump: 1 };
      }
      const k = d < 1.2 ? Math.max(.35, d / 1.2) : 1;
      return { ...extra, mx: ax / l * k, mz: az / l * k };
    };
    return st;
  }
  async function walkTo(w, x, z, r, sec = 60, extra) {
    const b = w === 'g' ? g : s, st = walker(b, x, z, r, extra); ctl[w] = st.ctl;
    await until(() => st.done || st.fail, sec, (w === 'g' ? 'Giant' : 'Sprite') + ' walking to ' + x.toFixed(1) + ', ' + z.toFixed(1));
    ctl[w] = null; if (st.fail) throw new Error('no path for ' + (w === 'g' ? 'Giant' : 'Sprite') + ' to ' + x.toFixed(1) + ', ' + z.toFixed(1));
    await until(() => Math.hypot(b.vel.x, b.vel.z) < .3, 2, 'stopping');
  }
  async function walkBoth(gx, gz, sx, sz, sec = 60, rs = .45) {
    const a = walker(g, gx, gz), b = walker(s, sx, sz, rs); ctl.g = a.ctl; ctl.s = b.ctl;
    await until(() => (a.done || a.fail) && (b.done || b.fail), sec, 'both walking');
    ctl.g = ctl.s = null; if (a.fail || b.fail) throw new Error('no path while walking both');
  }
  async function press(w, key = 'act', frames = 2) { ctl[w] = () => ({ [key]: 1 }); for (let i = 0; i < frames; i++) frame(); ctl[w] = null; frame(); }
  async function pickUpSprite() {
    // the Sprite walks up to the Giant, then the Giant lifts it
    await walkTo('s', g.pos.x, g.pos.z, 1.4, 20);
    await press('g'); if (!s.held) throw new Error('Giant could not pick up the Sprite');
  }
  // jump from stone to stone: run at the next stone and jump when close to its edge
  async function hopAcross(w, stones) {
    const b = w === 'g' ? g : s;
    for (const [x, z] of stones) {
      let tog = 0;
      ctl[w] = () => { const ax = x - b.pos.x, az = z - b.pos.z, d = Math.hypot(ax, az); const k = Math.min(1, d / .6);
        return { mx: ax / (d || 1) * k, mz: az / (d || 1) * k, jump: b.onGround && d > .5 && d < 2.4 && (tog ^= 1) ? 1 : 0 }; };
      await until(() => b.onGround && b.pos.y > -.1 && dxz(b.pos, x, z) < .45, 8, (w === 'g' ? 'Giant' : 'Sprite') + ' hopping to the stone at ' + x.toFixed(1) + ', ' + z.toFixed(1));
      ctl[w] = null;
    }
    await until(() => Math.hypot(b.vel.x, b.vel.z) < .2, 2, 'standing still');
  }
  async function throwSprite(yaw, hold, glideTo) {
    g.yaw = yaw; ctl.g = () => ({ act: 1 }); for (let i = 0; i < Math.round(hold * FPS); i++) frame(); ctl.g = null;
    ctl.s = () => { if (!glideTo) return {}; const ax = glideTo[0] - s.pos.x, az = glideTo[1] - s.pos.z, l = Math.hypot(ax, az); if (l < .3) return {}; return { mx: ax / l, mz: az / l, jump: s.vel.y < 0 ? 1 : 0 }; };
    await until(() => s.onGround, 8, 'Sprite landing after the throw'); ctl.s = null;
  }



  // ---------------- the chapter ----------------
  B.eraseProgress(); const P = B.PROG; P.seen.prologue = 1; P.seen.root1 = 1; P.seen.root2 = 1; P.seen.ch3_intro = 1; P.ch1.done = 1; P.ch2.done = 1; P.roots = 2;
  B.startLocal(); B.advance(.2); if (B.skipScene) B.skipScene();
  const H3 = B.ch3, hts = H3.hts, COGS = H3.COGS, VANES = H3.VANES, W = H3.WHEEL;
  B.travel('ch3', H3.HCP.g, H3.HCP.s, Math.PI); B.advance(.2); if (B.skipScene) B.skipScene();
  G.paused = true; // the page's own game loop must not step the world with an empty keyboard between our frames
  const G0 = { falls: G.falls };
  // ride a rising wind: jump in, hold jump and stay centred until high enough, then steer to (tx, tz) still holding jump
  async function rideUp(w, minY, tx, tz, landY, sec = 12) {
    await walkTo('s', w.x, w.z, .35, 20);
    let jumped = false, high = false;
    ctl.s = () => { high = high || s.pos.y > minY; const o = { jump: 1 };
      if (!jumped) { jumped = true; return o; }
      if (high) { const ax = tx - s.pos.x, az = tz - s.pos.z, l = Math.hypot(ax, az) || 1; o.mx = ax / l; o.mz = az / l; }
      else { o.mx = (w.x - s.pos.x) * 2; o.mz = (w.z - s.pos.z) * 2; }
      return o; };
    await until(() => s.onGround && s.pos.y > landY - .2 && jumped && Math.hypot(s.pos.x - tx, s.pos.z - tz) < 2.5, sec, 'Sprite riding the wind to ' + tx + ', ' + tz); ctl.s = null;
  }
  const wind = id => H3.WINDS.find(w => w.id === id);
  const lever = id => H3.HLEVERS.find(l => l.id === id);

  await step('Sprite rides the first rising wind up to the ledge and pulls the lever; the bridge lowers', async () => {
    await rideUp(wind('tut'), 6, 10.4, -7.4, 5.5);
    await walkTo('s', lever('b1').pos.x, lever('b1').pos.z, .9, 10); await press('s');
    if (!hts.b1.open) throw new Error('the bridge lever did not work');
    await until(() => hts.b1.t > .99, 4, 'the bridge lowering');
    ctl.s = () => ({ mx: -1 }); await until(() => s.onGround && s.pos.y < .1, 6, 'Sprite back down'); ctl.s = null;
  });
  await step('Falling off the island puts each of them back on solid ground, once', async () => {
    for (const [w, b] of [['g', g], ['s', s]]) {
      await walkTo(w, 10.6, 5.4, .4, 20); // the gap in the railing above the cloud nest (beside it, so the fall misses the nest)
      const f0 = G.falls; ctl[w] = () => ({ mx: 1 });
      await until(() => G.falls > f0, 8, (w === 'g' ? 'Giant' : 'Sprite') + ' walking off the edge'); ctl[w] = null;
      await wait(3);
      if (G.falls !== f0 + 1) throw new Error('kept falling after the respawn (' + (G.falls - f0) + ' falls)');
      if (!b.onGround || b.pos.y < -.1) throw new Error('not back on solid ground (at ' + fmt(b.pos) + ')');
      await walkTo(w, 6, w === 'g' ? 1 : -1, .5, 10);
    }
    G0.falls = G.falls;
  });
  await step('Cloud nest: the Sprite glides down to the little rock below the edge and rides the wind back up (secret, memory petal)', async () => {
    await walkTo('s', 11.4, 3, .4, 20);
    ctl.s = () => { const d = 19.3 - s.pos.x; return { mx: Math.max(-1, Math.min(1, d)), mz: (3.4 - s.pos.z) * 2, jump: s.vel.y < 0 && d > 1.2 ? 1 : 0 }; };
    await until(() => !s.onGround, 3, 'Sprite stepping off the edge'); await until(() => s.onGround, 8, 'Sprite gliding down'); ctl.s = null;
    if (s.pos.y > -5) throw new Error('did not reach the nest (at ' + fmt(s.pos) + ')');
    await until(() => P.secrets.c3_nest, 1, 'the nest secret');
    await walkTo('s', 18.2, 3.8, .4, 8); await until(() => P.petals.m9, 2, 'memory petal m9');
    await rideUp(wind('nest'), 4, 9, 3, 0);
    G0.falls = G.falls;
  });
  await step('Both cross the bridge; the Giant lifts the Sprite onto its head and wades the pond, taking the first cog on the way', async () => { const sp0 = G.splashN | 0;
    await walkBoth(-.4, -24, .9, -24.6, 60);
    await pickUpSprite();
    await walkTo('g', 0, -34.75, .3, 40);
    await press('g'); if (COGS[0].state !== 'carried') throw new Error('could not take the cog from the pond (Giant at ' + fmt(g.pos) + ')');
    if (!s.held) throw new Error('the Sprite came off the Giant’s head');
    await walkTo('g', 0, -40, .5, 20); await walkTo('g', 0, -46.5, .5, 30);
    ctl.s = () => ({ jump: 1, mz: -1 }); frame(); frame(); ctl.s = null; await until(() => s.onGround, 4, 'Sprite hopping down');
    if ((G.splashN | 0) > sp0) throw new Error('someone fell in the water');
  });
  await step('Sail Terrace: the Giant turns the sails so only the far one faces the wind; the Sprite rides up to the pillar and nudges the cog down; the Giant takes it', async () => {
    await walkTo('g', VANES[0].capPos.x, VANES[0].capPos.z + 1.3, .4, 60); await press('g');
    await walkTo('g', VANES[1].capPos.x, VANES[1].capPos.z + 1.3, .4, 30); await press('g');
    if (VANES[0].catch || !VANES[1].catch) throw new Error('sails not set (first ' + VANES[0].catch + ', second ' + VANES[1].catch + ')');
    if (!wind('v1').on()) throw new Error('the far sail is not sending the wind up');
    await rideUp(wind('v1'), 9.7, 15.4, -65.6, 9);
    await press('s'); if (COGS[1].state !== 'free') throw new Error('the cog was not nudged off');
    await until(() => COGS[1].onGround, 5, 'the cog landing');
    ctl.s = () => ({ mz: 1 }); await until(() => s.onGround && s.pos.y < .1, 6, 'Sprite down from the pillar'); ctl.s = null;
    await walkTo('s', 19, -59, .5, 10);
    await walkTo('g', COGS[1].pos.x, COGS[1].pos.z, 1.3, 30); await press('g');
    if (COGS[1].state !== 'carried') throw new Error('could not pick up the second cog (at ' + fmt(COGS[1].pos) + ')');
  });
  // board a wheel platform when one is level with the deck, ride it, step off when it is at the far end of its turn
  async function rideWheel(up) {
    const pick = () => W.gond.find(q => up ? (q.y < .35 && q.x > 36.2 && q.x < 37.8) : (q.y > 12.6 && q.x > 38.2 && q.x < 39.8));
    let q = null; await until(() => (q = pick()), 40, 'a platform coming level');
    const zOn = W.cz, zOff = up ? -66 : -59.6;
    const onIt = b => b.onGround && b.ground === q.col;
    ctl.g = () => onIt(g) ? {} : { mx: (q.x - g.pos.x) * 2.5, mz: (zOn - g.pos.z) * 2.5 };
    ctl.s = () => onIt(s) ? {} : { mx: (q.x + .6 - s.pos.x) * 2.5, mz: (zOn + .4 - s.pos.z) * 2.5 };
    await until(() => onIt(g) && onIt(s), 3, 'both stepping onto the platform'); ctl.g = ctl.s = null;
    await until(() => up ? (q.y > 12.85 && Math.abs(q.x - W.cx) < .5) : (q.y < .15 && Math.abs(q.x - W.cx) < .5), 30, 'riding the platform');
    ctl.g = () => ({ mz: zOff < W.cz ? -1 : 1, mx: (W.cx - g.pos.x) }); ctl.s = () => ({ mz: zOff < W.cz ? -1 : 1, mx: (W.cx + .6 - s.pos.x) });
    await until(() => (zOff < W.cz ? g.pos.z < zOff && s.pos.z < zOff : g.pos.z > zOff && s.pos.z > zOff) && g.onGround && s.onGround, 3, 'stepping off'); ctl.g = ctl.s = null;
  }
  await step('Both sails edge-on: the wind turns the windmill wheel and both ride a platform up to the High Orchard', async () => {
    await walkTo('g', VANES[1].capPos.x, VANES[1].capPos.z + 1.3, .4, 30); await press('g');
    if (!H3.wheelWind()) throw new Error('the wind does not reach the wheel');
    await walkBoth(37.4, -59.8, 38.6, -59.8, 60);
    await until(() => W.w > .2, 6, 'the wheel getting up to speed');
    await rideWheel(true);
    if (g.pos.y < 12.9 || s.pos.y < 12.9) throw new Error('not up on the orchard (Giant ' + fmt(g.pos) + ', Sprite ' + fmt(s.pos) + ')');
  });
  await step('High Orchard: the Giant throws the Sprite into the wind current; it rides across to the islet and lowers the bridge; the Giant takes the last cog', async () => {
    await walkTo('g', 21.4, -81.2, .3, 40);
    await pickUpSprite(); g.yaw = -Math.PI / 2;
    ctl.g = () => ({ act: 1 }); for (let i = 0; i < 20; i++) frame(); ctl.g = null;
    ctl.s = () => ({ jump: 1 });
    await until(() => s.onGround, 8, 'Sprite landing after riding the current'); ctl.s = null;
    if (s.pos.x > 10 || s.pos.y < 12.9) throw new Error('the current did not carry the Sprite to the islet (at ' + fmt(s.pos) + ')');
    await walkTo('s', lever('b2').pos.x, lever('b2').pos.z, .9, 10); await press('s');
    if (!hts.b2.open) throw new Error('the islet lever did not work');
    await until(() => hts.b2.t > .99, 4, 'the bridge lowering');
    await walkTo('g', COGS[2].pos.x, COGS[2].pos.z, 1.3, 30); await press('g');
    if (COGS[2].state !== 'carried') throw new Error('could not take the last cog');
  });
  await step('Giant sets the three cogs in the gearbox; the Sprite rides the tower wind to the balcony and releases the brake; the chapter ends', async () => {
    await walkTo('g', 52, -79.1, .3, 60); await press('g');
    if (hts.placed < 3) throw new Error('cogs placed: ' + hts.placed);
    await walkTo('g', 48, -77, .5, 10);
    await walkTo('s', 9, -81.2, .4, 10); await walkTo('s', 21.5, -81.2, .5, 10);
    await rideUp(wind('tower'), 25.8, 52, -80.2, 25, 20);
    await walkTo('s', lever('brake').pos.x, lever('brake').pos.z, .9, 6); await press('s');
    await until(() => P.ch3.done, 2, 'chapter complete');
  });
  await step('Chapter-end screen appears; choose "Keep exploring the heights"', async () => {
    await until(() => G.phase === 'end', 12, 'end screen'); B.advance(DT);
    if (document.getElementById('scrEnd').hidden) throw new Error('end screen did not show');
    const title = document.getElementById('endTitle').textContent; if (!/Windmill/.test(title)) throw new Error('end screen title: ' + title);
    document.getElementById('bEndMenu').click(); B.advance(DT);
    if (G.phase !== 'play') throw new Error('did not return to play');
  });
  const mainFalls = G.falls - G0.falls;
  await step('Windmill rooftop: the Sprite rides the tower wind all the way up and lands on the roof (secret, memory petal)', async () => {
    ctl.s = () => ({ mz: 1 }); await until(() => s.onGround && s.pos.y < 14, 12, 'Sprite stepping off the balcony and down'); ctl.s = null;
    await rideUp(wind('tower'), 29.4, 52.6, -84.6, 28, 20);
    await until(() => P.secrets.c3_roof, 1, 'the rooftop secret');
    await walkTo('s', 52, -84, .4, 6); await until(() => P.petals.m11, 2, 'memory petal m11');
    ctl.s = () => ({ mz: s.pos.z < -78 ? 1 : 0 }); await until(() => s.onGround && s.pos.y < 13.5, 12, 'Sprite dropping down'); ctl.s = null;
  });
  await step('Both ride a wheel platform back down to the terrace', async () => {
    await walkBoth(38.4, -65.4, 39.4, -65.4, 60);
    await rideWheel(false);
    if (g.pos.y > .5 || s.pos.y > .5) throw new Error('not back on the deck');
  });
  await step('Behind the waterfall (secret, memory petal): the Giant wades into the grotto with the Sprite on its head', async () => { const sp0 = G.splashN | 0;
    await walkBoth(-.6, -47.4, .8, -47.6, 120);
    await pickUpSprite();
    await walkTo('g', 0, -40, .5, 30); await walkTo('g', -8.6, -36, .5, 30); await walkTo('g', -12.6, -36, .4, 20);
    await until(() => P.secrets.c3_grotto && P.petals.m10, 3, 'the grotto secret and memory petal');
    await walkTo('g', -6, -33, .5, 20); await walkTo('g', 0, -26.4, .5, 30);
    ctl.s = () => ({ jump: 1, mz: 1 }); frame(); frame(); ctl.s = null; await until(() => s.onGround, 4, 'Sprite hopping down');
    if ((G.splashN | 0) > sp0) throw new Error('someone fell in the water');
  });
  await step('Both walk back over the bridge to the Landing Isle and out through the gate to the Vale', async () => {
    await walkBoth(-1.2, 8, 1.2, 8, 120);
    ctl.g = () => ({ mz: 1 }); ctl.s = () => ({ mz: 1 });
    await until(() => G.region === 'vale', 6, 'travel to the Vale'); ctl.g = ctl.s = null;
    if (B.PROG.roots < 3) throw new Error('the third root did not wake');
  });
  await step('Vale: both walk back in through the Windmill Heights gate', async () => {
    await until(() => !G.scene, 30, 'the root scene'); const gt = B.GATES[2];
    const l = Math.hypot(gt.pos.x, gt.pos.z), ix = -gt.pos.x / l, iz = -gt.pos.z / l;
    await walkBoth(gt.pos.x + ix * 3.5 - iz * .8, gt.pos.z + iz * 3.5 + ix * .8, gt.pos.x + ix * 3.5 + iz * .8, gt.pos.z + iz * 3.5 - ix * .8, 160);
    ctl.g = () => ({ mx: gt.pos.x - g.pos.x, mz: gt.pos.z - g.pos.z }); ctl.s = () => ({ mx: gt.pos.x - s.pos.x, mz: gt.pos.z - s.pos.z });
    await until(() => G.region === 'ch3', 8, 'travel into the heights'); ctl.g = ctl.s = null;
  });
  G.paused = false;
  const time = +simT.toFixed(1), ok = steps.every(x => x.ok);
  log(ok ? 'PASSED' : 'FAILED', 'in', time, 's of game time; unplanned falls', mainFalls);
  const sum = { seeds: B.SEEDS.filter(x => x.reg === 'ch3' && B.PROG.seeds[x.id]).length + '/' + B.SEEDS.filter(x => x.reg === 'ch3').length,
    petals: B.PETALS.filter(x => x.reg === 'ch3' && B.PROG.petals[x.id]).length + '/' + B.PETALS.filter(x => x.reg === 'ch3').length,
    secrets: B.REG.ch3.secrets.filter(x => B.PROG.secrets[x.id]).map(x => x.name).join(', ') + ' (' + B.REG.ch3.secrets.filter(x => B.PROG.secrets[x.id]).length + '/' + B.REG.ch3.secrets.length + ')' };
  log('collected along the way:', JSON.stringify(sum), 'cards/scenes:', seen.join(', '));
  return { ok, steps, time, falls: mainFalls, collected: sum, shown: seen };
}
