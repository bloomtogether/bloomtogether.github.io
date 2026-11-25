// Scripted playthrough of Chapter 5: The Mushroom Marsh (every main puzzle and all three side areas), then the walk
// back out to the Vale and in again through the Mushroom Marsh gate.
// Both characters walk real routes and solve every puzzle with the same inputs a player has: bouncing is jumping onto a
// mushroom and holding jump, a slam is jump then interact in mid-air, dew and seed-pods are interact. Nothing is
// teleported. In the air the script steers like a player would: toward where it wants to land.
//
// Run it in the browser console on the game page, from the title screen:
//   const t = await import('/dev/tests/ch5-playthrough.js'); await t.run();
// It erases the save on this laptop first (and marks Chapters 1 to 4 done).

const FPS = 60, DT = 1 / FPS;

export async function run(opts = {}) {
  const B = window.__bs, L = B.ch1, g = B.golem, s = B.sprite, G = B.G;
  const log = opts.log || ((...a) => console.log('[ch5]', ...a));
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
    else if (G.region === 'ch4') { X0 = -40; Z0 = -88; CELL = .25; NX = 304; NZ = 408; }
    else if (G.region === 'ch5') { X0 = -50; Z0 = -102; CELL = .25; NX = 384; NZ = 460; }
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
    for (const c of cols) if (c.max.y <= y0 + b.stepH + .01 && c.max.y >= y0 - 1.25 && !(G.region === 'ch5' && c.max.y < y0 - .5)) mark(floor, c.min.x - .05, c.max.x + .05, c.min.z - .05, c.max.z + .05, 1);
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
  B.eraseProgress(); const P = B.PROG; Object.assign(P.seen, { prologue: 1, root1: 1, root2: 1, root3: 1, root4: 1, ch5_intro: 1 }); P.ch1.done = P.ch2.done = P.ch3.done = P.ch4.done = 1; P.roots = 4;
  B.startLocal(); B.advance(.2); if (B.skipScene) B.skipScene();
  const K = B.ch5, mks = K.mks, SP = K.SPORES, cap = id => K.SHROOMS.find(x => x.id === id), pod = id => K.PODS.find(x => x.id === id);
  B.travel('ch5', K.KCP.g, K.KCP.s, Math.PI); B.advance(.2); if (B.skipScene) B.skipScene();
  G.paused = true;
  const G0 = { falls: G.falls, splash: G.splashN };
  const body = w => w === 'g' ? g : s, who = w => w === 'g' ? 'Giant' : 'Sprite';
  // in the air: steer toward a point so as to arrive there as the body comes down to height y
  function ballistic(b, x, z, y, max = 1) {
    const ax = x - b.pos.x, az = z - b.pos.z, d = Math.hypot(ax, az); if (d < .08) return { mx: 0, mz: 0 };
    const vy = b.vel.y, h = b.pos.y - y, gl = b === s && b.gliding; let t;
    if (gl) t = Math.max(.15, h / 1.6); else { const disc = vy * vy + 2 * 22 * h; t = disc > 0 ? Math.max(.12, (vy + Math.sqrt(disc)) / 22) : .12; }
    const top = b === g ? 3.4 : 4.6, k = Math.min(max, d / t / top);
    return { mx: ax / d * k, mz: az / d * k };
  }
  // a player runs at a mushroom and jumps a couple of metres before it
  function runUp(b, x, z) { const ax = x - b.pos.x, az = z - b.pos.z, d = Math.hypot(ax, az); if (b.onGround && d > (b === g ? 2.4 : 2.6)) return { mx: ax / d, mz: az / d }; return null; }
  // bounce from point to point: each stop is a mushroom (bounce on it) or ground [x, z, y]; starts with a jump
  async function bounceChain(w, stops, sec = 20) {
    const b = body(w); let i = 0, jumped = false, f0 = frameN, on = -1;
    const tgt = () => { const t = stops[i]; return t.id ? [t.pos.x, t.pos.z, t.top] : t; };
    ctl[w] = () => {
      const [x, z, y] = tgt(), last = i === stops.length - 1;
      // leaving a cap upward: aim for the next stop
      if (stops[i].id && b.ground === stops[i].col) on = i;
      if (!last && on === i && b.vel.y > 4) { i++; return ctl[w](); }
      if (!jumped) { const r = runUp(b, x, z); if (r) return r; jumped = true; return { ...ballistic(b, x, z, y), jump: 1 }; }
      if (b.onGround && frameN - f0 > 3 && !(stops[i].id && b.ground === stops[i].col)) { // landed on the ground somewhere
        const ax = x - b.pos.x, az = z - b.pos.z, d = Math.hypot(ax, az), k = Math.min(1, d / 1.2); // walk on (e.g. off the wall top)
        return last ? (d < .4 ? {} : { mx: ax / d * k, mz: az / d * k }) : { ...ballistic(b, x, z, y), jump: 0 }; }
      return { ...ballistic(b, x, z, y), jump: last ? 0 : 1 };
    };
    const end = stops[stops.length - 1];
    await until(() => i === stops.length - 1 && !end.id && b.onGround && frameN - f0 > 10 && Math.abs(b.pos.y - end[2]) < .3 && dxz(b.pos, end[0], end[1]) < 1.6, sec, who(w) + ' bouncing to ' + end[0] + ', ' + end[1] + ' (stop ' + i + ')');
    ctl[w] = null; await until(() => Math.hypot(b.vel.x, b.vel.z) < .3, 3, 'settling');
  }
  // hop onto a cap and stand still on it (no bounce): release jump before landing
  async function hopOn(w, sh, ox, oz) {
    const b = body(w), tx = sh.pos.x + (ox || 0), tz = sh.pos.z + (oz || 0); let jumped = false;
    ctl[w] = () => { if (!jumped) { const r = runUp(b, tx, tz); if (r) return r; jumped = true; return { ...ballistic(b, tx, tz, sh.top), jump: 1 }; } if (b.onGround) return {}; return ballistic(b, tx, tz, sh.top); };
    await until(() => b.onGround && b.ground === sh.col && Math.abs(b.vel.y) < .01, 4, who(w) + ' hopping onto ' + sh.id); ctl[w] = null;
    await until(() => Math.hypot(b.vel.x, b.vel.z) < .2, 2, 'standing on the cap');
  }
  async function slam(sh) { // the Giant, standing on a cap: jump, then interact in mid-air
    let ph = 0; ctl.g = () => { if (ph === 0) { ph = 1; return { jump: 1 }; } if (g.airT > .2 && ph === 1) { ph = 2; return { act: 1 }; } return {}; };
    const n0 = G.bigBounceN || 0; await until(() => (G.bigBounceN || 0) > n0, 3, 'the slam on ' + sh.id); ctl.g = null;
  }
  async function use(w, x, z, what, cond) { await walkTo(w, x, z, .3, 40); await press(w); await until(cond, 1, what); }
  async function dropTo(w, dir, y = 0) { const b = body(w); ctl[w] = () => ({ mx: dir[0], mz: dir[1] }); await until(() => b.onGround && Math.abs(b.pos.y - y) < .2, 6, who(w) + ' dropping down'); ctl[w] = null; await until(() => Math.hypot(b.vel.x, b.vel.z) < .3, 2, 'stop'); }

  await step('Reed Landing: both jump onto the springy mushroom and bounce over the reed wall', async () => {
    const c = cap('wallS');
    for (const w of ['g', 's']) { await walkTo(w, 4 + (w === 's' ? .6 : 0), w === 's' ? -4.8 : -5.6, .3, 30); await bounceChain(w, [c, [4 + (w === 's' ? .6 : 0), -15.6, 0]], 10); }
    if (g.pos.z > -13 || s.pos.z > -13) throw new Error('did not get over the wall');
    if (!G.bounceN) throw new Error('no bounce counted');
  });
  await step('The stream: the Sprite collects a dewdrop and waters the seed-pod; a vine bridge grows; both cross', async () => {
    const L = K.LILIES[0]; await use('s', L.pos.x + 1, L.pos.z, 'collecting dew', () => s.dew);
    const p = pod('stream'); await use('s', p.pos.x + .9, p.pos.z + .2, 'watering the pod', () => p.grown);
    await until(() => p.t >= 1, 4, 'the vine growing');
    await walkBoth(1.2, -23, 1.9, -23.4, 30);
  });
  await step('The Bounding Bog: the Giant bounces along the mushroom chain to Glowcap Clearing', async () => {
    await walkTo('g', 0, -22.4, .25, 20);
    await bounceChain('g', ['bog-25.6', 'bog-29.4', 'bog-33.2', 'bog-37', 'bog-40.8'].map(cap).concat([[0, -45.4, 0]]), 20);
  });
  await step('The bog hummock: the Sprite bounces off the chain onto the hummock (secret, memory petal), then on across', async () => {
    await walkTo('s', .3, -21.8, .25, 20);
    await bounceChain('s', ['bog-25.6', 'bog-29.4', 'bog-33.2', 'side1', 'side2'].map(cap).concat([[12, -33.2, 1.6]]), 20);
    await until(() => P.secrets.c5_hummock && P.petals.m15, 3, 'the hummock secret and petal');
    await walkTo('s', 10.4, -33.2, .2, 5);
    await bounceChain('s', ['side2', 'side1', 'bog-33.2', 'bog-37', 'bog-40.8'].map(cap).concat([[1, -45.6, 0]]), 20);
  });
  await step('Vine Ravine: the Sprite takes dew and stands on the big cap; the Giant slams it; both fly onto the ledge', async () => {
    const L = K.LILIES[1]; await use('s', L.pos.x + 1, L.pos.z, 'collecting dew', () => s.dew);
    const c = cap('ravine');
    await walkTo('s', c.pos.x + 3.9, c.pos.z - .6, .2, 30); await hopOn('s', c, .7, -.6);
    await walkTo('g', c.pos.x - 3.3, c.pos.z + .4, .2, 30); await hopOn('g', c, -.6, .4);
    await slam(c);
    if (G.launchN < 1) throw new Error('the Sprite was not thrown');
    ctl.s = () => ({ ...ballistic(s, 16.6, -64.6, 6.5), jump: s.vel.y < 0 ? 1 : 0 }); ctl.g = () => ballistic(g, 15.4, -64.4, 6.5);
    await until(() => g.onGround && s.onGround && g.airT === 0 && s.pos.y > 6 && g.pos.y > 6, 6, 'both landing on the ledge'); ctl.g = ctl.s = null;
    if (!s.dew) throw new Error('lost the dewdrop');
  });
  await step('On the ledge the Sprite waters the seed-pod: a vine bridge grows across the ravine; the Giant takes the first spore', async () => {
    const p = pod('bridge'); await use('s', p.pos.x - .8, p.pos.z, 'watering the pod', () => p.grown);
    await until(() => p.t >= 1, 4, 'the bridge growing');
    await walkBoth(32, -65.2, 32.6, -64.6, 40);
    await walkTo('g', SP[0].pos.x - 1.3, SP[0].pos.z, .4, 30); await press('g');
    if (SP[0].state !== 'carried') throw new Error('could not take the first spore');
  });
  await step('The hollow stump: the Sprite waters its seed-pod and climbs the shelf fungi (secret, memory petal)', async () => {
    const L = K.LILIES[2]; await use('s', L.pos.x + 1, L.pos.z, 'collecting dew', () => s.dew);
    const p = pod('ladder'); await use('s', p.pos.x - .7, p.pos.z - .4, 'watering the pod', () => p.grown);
    await until(() => p.t >= 1, 4, 'the fungi growing');
    await walkTo('s', 35.2, -64.8, .2, 10);
    await hopAcross('s', [[35.2, -63.5], [35.2, -62], [35.2, -60.5], [35.2, -59], [37, -59]]);
    await walkTo('s', 38, -61, .4, 5);
    await until(() => P.secrets.c5_stump && P.petals.m17, 3, 'the stump secret and petal');
    await dropTo('s', [1, 0], 6.5);
  });
  await step('Back over the vine bridge and down from the ledge into the clearing', async () => {
    await walkBoth(21, -65.2, 21.6, -64.6, 60);
    await walkBoth(14.5, -63, 15, -63.4, 20);
    await dropTo('g', [0, 1]); await dropTo('s', [0, 1]);
    await walkBoth(4, -54, 5, -54, 30);
  });
  await step('Fog Hollow: the boardwalk rises only near the Sprite; the Giant follows close behind and takes the second spore', async () => {
    const wps = [[-11, -50], [-14, -50], [-17.5, -50], [-21, -50], [-24.5, -50], [-28, -50], [-31.5, -50], [-35, -50], [-35, -53.5], [-35, -57], [-35, -61], [-38.6, -61], [-40, -61]];
    for (let k = 0; k < wps.length; k++) { await walkTo('s', wps[k][0], wps[k][1], .3, 15); if (k > 0) await walkTo('g', wps[k - 1][0], wps[k - 1][1] + .1, .4, 15); }
    await walkTo('g', SP[1].pos.x + 1.3, SP[1].pos.z, .4, 15); await press('g');
    if (SP[1].state !== 'carried') throw new Error('could not take the second spore');
  });
  await step('The lost island: the Sprite lights the side branch of the boardwalk (secret, memory petal); both head back', async () => {
    await walkTo('g', -41.5, -59.2, .4, 10); // step aside on the island so the Sprite can lead the way back
    const back = [[-38.6, -61], [-35, -61], [-35, -57], [-35, -53.5], [-35, -50]];
    for (let k = 0; k < back.length; k++) { await walkTo('s', back[k][0], back[k][1], .3, 15); await walkTo('g', (k ? back[k - 1] : [-40, -61])[0], (k ? back[k - 1] : [-40, -61])[1], .4, 15); }
    for (const [x, z] of [[-35, -46], [-38.6, -46], [-42, -46]]) await walkTo('s', x, z, .3, 10);
    await until(() => P.secrets.c5_island && P.petals.m16, 3, 'the island secret and petal');
    for (const [x, z] of [[-38.6, -46], [-35, -46], [-35, -50]]) await walkTo('s', x, z, .3, 10);
    const out = [[-31.5, -50], [-28, -50], [-24.5, -50], [-21, -50], [-17.5, -50], [-14, -50], [-10, -50]];
    for (let k = 0; k < out.length; k++) { await walkTo('s', out[k][0], out[k][1], .3, 15); await walkTo('g', (k ? out[k - 1] : [-35, -50])[0], (k ? out[k - 1] : [-35, -50])[1] + .1, .4, 15); }
    await walkTo('g', -8, -50, .4, 10);
  });
  await step('The Shelf: the Sprite waters the wilted mushroom; the Giant slams it and bounces up onto the shelf for the last spore', async () => {
    const L = K.LILIES[1]; await use('s', L.pos.x + 1, L.pos.z, 'collecting dew', () => s.dew);
    const p = pod('wilt'), c = cap('wilt'); await use('s', -9, -54.5, 'watering the wilted mushroom', () => p.grown);
    await until(() => c.awake && c.col.on, 4, 'the mushroom waking');
    await walkTo('s', -4, -53, .5, 10);
    await walkTo('g', -9, -52.4, .2, 20); await hopOn('g', c);
    await slam(c);
    ctl.g = () => ballistic(g, -9, -60.8, 6.5); await until(() => g.onGround && g.pos.y > 6, 5, 'the Giant landing on the shelf'); ctl.g = null;
    await walkTo('g', SP[2].pos.x, SP[2].pos.z + 1.3, .4, 10); await press('g');
    if (SP[2].state !== 'carried') throw new Error('could not take the last spore');
    await dropTo('g', [1, 0]);
  });
  await step('The Elder Glade: the Giant sets the three spores; the root cap wakes', async () => {
    await walkTo('g', 0, -84.8, .3, 60); await press('g');
    if (mks.placed < 3) throw new Error('spores set: ' + mks.placed);
    await until(() => mks.root.awake, 2, 'the root cap waking');
  });
  await step('The Sprite takes dew and stands on the root cap; the Giant slams it; the Sprite flies onto the Elder and waters her bud; the chapter ends', async () => {
    const L = K.LILIES[3]; await use('s', L.pos.x - 1, L.pos.z, 'collecting dew', () => s.dew);
    const c = mks.root;
    await walkTo('s', c.pos.x + .2, c.pos.z + 3.9, .2, 20); await hopOn('s', c, .2, .9);
    await walkTo('g', c.pos.x - 3.4, c.pos.z - .6, .2, 20); await hopOn('g', c, -.7, -.6);
    await slam(c);
    ctl.s = () => ({ ...ballistic(s, 0, -88.6, 10.2), jump: s.vel.y < 0 ? 1 : 0 }); ctl.g = () => ({ mx: 1 });
    await until(() => s.onGround && s.pos.y > 9.5, 6, 'the Sprite landing on the Elder'); ctl.s = ctl.g = null;
    await walkTo('s', 0, -89, .3, 6);
    await press('s'); await until(() => P.ch5.done, 2, 'watering the bud');
  });
  await step('Chapter-end screen appears; choose "Keep exploring the marsh"', async () => {
    await until(() => G.phase === 'end', 12, 'end screen'); B.advance(DT);
    if (document.getElementById('scrEnd').hidden) throw new Error('end screen did not show');
    const title = document.getElementById('endTitle').textContent; if (!/Elder/.test(title)) throw new Error('end screen title: ' + title);
    document.getElementById('bEndMenu').click(); B.advance(DT);
    if (G.phase !== 'play') throw new Error('did not return to play');
  });
  const mainFalls = G.falls - G0.falls;
  await step('Both walk back through the clearing and bounce south across the bog', async () => {
    ctl.s = () => ({ mx: 1 }); await until(() => s.onGround && s.pos.y < .1, 8, 'Sprite down from the Elder'); ctl.s = null;
    await walkBoth(-.6, -43.5, .6, -43.3, 90);
    await bounceChain('g', ['bog-40.8', 'bog-37', 'bog-33.2', 'bog-29.4', 'bog-25.6'].map(cap).concat([[0, -22.6, 0]]), 20);
    await bounceChain('s', ['bog-40.8', 'bog-37', 'bog-33.2', 'bog-29.4', 'bog-25.6'].map(cap).concat([[.8, -22.4, 0]]), 20);
  });
  await step('Over the stream on the vine and back over the reed wall, out through the gate to the Vale', async () => {
    await walkBoth(1.2, -16.4, 1.9, -16.6, 30);
    for (const w of ['g', 's']) { await walkTo(w, w === 's' ? -10 : -9.4, -15 + (w === 's' ? .5 : 0), .2, 20); await bounceChain(w, [cap('wallN'), [w === 's' ? -4.2 : -7.6, -6.4, 0]], 10); }
    await walkBoth(-1.2, 8, 1.2, 8, 60);
    ctl.g = () => ({ mz: 1 }); ctl.s = () => ({ mz: 1 });
    await until(() => G.region === 'vale', 6, 'travel to the Vale'); ctl.g = ctl.s = null;
    if (B.PROG.roots < 5) throw new Error('the fifth root did not wake');
  });
  await step('Vale: both walk back in through the Mushroom Marsh gate', async () => {
    await until(() => !G.scene, 30, 'the root scene'); const gt = B.GATES[4];
    const l = Math.hypot(gt.pos.x, gt.pos.z), ix = -gt.pos.x / l, iz = -gt.pos.z / l;
    await walkBoth(gt.pos.x + ix * 3.5 - iz * .8, gt.pos.z + iz * 3.5 + ix * .8, gt.pos.x + ix * 3.5 + iz * .8, gt.pos.z + iz * 3.5 - ix * .8, 160);
    ctl.g = () => ({ mx: gt.pos.x - g.pos.x, mz: gt.pos.z - g.pos.z }); ctl.s = () => ({ mx: gt.pos.x - s.pos.x, mz: gt.pos.z - s.pos.z });
    await until(() => G.region === 'ch5', 8, 'travel into the marsh'); ctl.g = ctl.s = null;
  });
  G.paused = false;
  const time = +simT.toFixed(1), ok = steps.every(x => x.ok);
  log(ok ? 'PASSED' : 'FAILED', 'in', time, 's of game time; unplanned falls', mainFalls, '; slips into the water', G.splashN - G0.splash);
  const sum = { seeds: B.SEEDS.filter(x => x.reg === 'ch5' && B.PROG.seeds[x.id]).length + '/' + B.SEEDS.filter(x => x.reg === 'ch5').length,
    petals: B.PETALS.filter(x => x.reg === 'ch5' && B.PROG.petals[x.id]).length + '/' + B.PETALS.filter(x => x.reg === 'ch5').length,
    secrets: B.REG.ch5.secrets.filter(x => B.PROG.secrets[x.id]).map(x => x.name).join(', ') + ' (' + B.REG.ch5.secrets.filter(x => B.PROG.secrets[x.id]).length + '/' + B.REG.ch5.secrets.length + ')' };
  log('collected along the way:', JSON.stringify(sum), 'cards/scenes:', seen.join(', '));
  return { ok, steps, time, falls: mainFalls, splashes: G.splashN - G0.splash, collected: sum, shown: seen };
}
