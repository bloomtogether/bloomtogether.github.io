// Scripted playthrough of Chapter 2: The Lantern Mines (every main puzzle and all three side areas), then the walk
// back out to the Vale and in again through the Lantern Mines gate.
// Both characters walk real routes (grid pathfinding around the level's colliders) and solve every puzzle with the
// same inputs a player has. Nothing is teleported; the only help is that a throw is aimed by setting the Giant's
// facing before the throw.
//
// Run it in the browser console on the game page (local server or the live site), from the title screen:
//   const t = await import('/dev/tests/ch2-playthrough.js'); await t.run();
// It prints each step and returns {ok, steps, time}. It erases the save on this laptop first (and marks Chapter 1 done).

const FPS = 60, DT = 1 / FPS;

export async function run(opts = {}) {
  const B = window.__bs, L = B.ch1, g = B.golem, s = B.sprite, G = B.G;
  const log = opts.log || ((...a) => console.log('[ch2]', ...a));
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
  B.eraseProgress(); const P = B.PROG; P.seen.prologue = 1; P.seen.root1 = 1; P.seen.ch2_intro = 1; P.ch1.done = 1; P.roots = 1;
  B.startLocal(); B.advance(.2); if (B.skipScene) B.skipScene();
  const M2 = B.ch2, mine = M2.mine, CR = M2.CRYST, ST = M2.LSTONES;
  B.travel('ch2', M2.MCP.g, M2.MCP.s, Math.PI); B.advance(.2); if (B.skipScene) B.skipScene();
  G.paused = true; // the page's own game loop must not step the world with an empty keyboard between our frames (held keys would let go)
  const G0 = { falls: G.falls };
  async function pulse() {
    await until(() => mine.pulseCD <= 0, 1, 'pulse cooldown');
    const n = G.pulseN || 0; await press('s'); if ((G.pulseN || 0) === n) throw new Error('no light pulse at ' + fmt(s.pos));
  }

  await step('Sprite lights the first lantern with a light pulse', async () => {
    await walkTo('s', -4, -6.6, .5, 30); await pulse();
    if (!(mine.lan & 1)) throw new Error('lantern not lit');
  });
  await step('Crystal bridge: the Sprite pulses by its posts and both cross the first chasm', async () => {
    await walkBoth(-.5, -12.6, 1.1, -12.9, 40);
    await pulse(); if (!CR[0].col.on) throw new Error('the bridge did not light');
    await walkBoth(-.6, -21.6, .9, -21.2, 30);
    if (g.pos.z > -19 || s.pos.z > -19) throw new Error('did not cross');
  });
  await step('Lamp room: the Sprite crawls through the glowing gap and lights its lantern (secret, memory petal)', async () => {
    await walkTo('s', -13.5, -27, .5, 40);
    await until(() => P.secrets.c2_lamproom, 2, 'the lamp room secret');
    await walkTo('s', -15, -28.4, .5, 10); await pulse(); if (!(mine.lan & 4)) throw new Error('lamp room lantern not lit');
    await walkTo('s', -16, -24.6, .5, 10); await until(() => P.petals.m6, 2, 'memory petal m6');
    await walkTo('s', -5, -27, .5, 30);
  });
  await step('Giant lifts the Sprite by the scaffold; the Sprite leaps up and flips the track switch', async () => {
    await walkTo('g', 5.3, -32.5, .25, 40);
    await pickUpSprite(); g.yaw = Math.PI / 2; frame();
    ctl.s = () => ({ jump: 1, mx: 1, mz: (-32.5 - s.pos.z) * 2 });
    await until(() => s.onGround && s.pos.y > 2.9, 4, 'Sprite onto the scaffold'); ctl.s = null;
    const lv = M2.MLEVERS.find(l => l.id === 'switch');
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 10); await press('s');
    if (!mine.sw.b) throw new Error('the switch did not flip');
    ctl.s = () => ({ mz: 1 }); await until(() => s.onGround && s.pos.y < .1, 6, 'Sprite back down'); ctl.s = null;
  });
  await step('Giant pushes the mine cart past the junction; it rolls on and smashes the barricade', async () => {
    const C = mine.cart;
    await walkTo('g', 4, -21.4, .25, 40);
    ctl.g = () => ({ mz: -1, mx: (C.p.x - g.pos.x) * 2 });
    await until(() => C.br === 1 && C.s > C.sJ + .6, 20, 'pushing the cart onto the branch'); ctl.g = null;
    await until(() => mine.bar.broken && C.s >= C.sEnd - .01, 12, 'the cart smashing the barricade');
  });
  await step('Both go through the tunnel to the gallery; the Sprite lights the bridge to the first island', async () => {
    await walkBoth(38.4, -41.4, 38.8, -42.4, 90);
    await pulse(); if (!CR[1].col.on) throw new Error('bridge 2 did not light');
    await walkBoth(48.6, -40.4, 47.6, -42, 30);
  });
  await step('Giant throws the Sprite to the second island; its pulse lights the bridge back; the Giant takes the first lantern stone', async () => {
    await walkTo('g', 49.6, -41, .25, 20);
    await pickUpSprite();
    await throwSprite(Math.PI / 2, .6, [60.5, -41]);
    if (s.pos.x < 57.5 || s.pos.y < -.1) throw new Error('the throw fell short (Sprite at ' + fmt(s.pos) + ')');
    await walkTo('s', 59, -40.6, .5, 10); await pulse();
    if (!CR[2].col.on) throw new Error('bridge 3 did not light');
    await walkTo('g', ST[0].pos.x - 1.2, ST[0].pos.z, .4, 20); await press('g');
    if (ST[0].state !== 'carried') throw new Error('stone 1 not taken');
  });
  await step('Far crystal island: the Giant throws the Sprite south; its pulse lights the bridge home (secret, memory petal)', async () => {
    await walkTo('g', 61, -38.3, .3, 20);
    await pickUpSprite(); await throwSprite(0, .4, [61.5, -28.6]);
    if (s.pos.z < -31.6 || s.pos.y < -.1) throw new Error('the throw missed the island (Sprite at ' + fmt(s.pos) + ')');
    await until(() => P.secrets.c2_island, 2, 'the island secret');
    await walkTo('s', 61.5, -27.8, .5, 10); await until(() => P.petals.m8, 2, 'memory petal m8');
    await walkTo('g', 59, -42.6, .4, 10);
    await walkTo('s', 61.5, -30.6, .5, 10); await pulse(); if (!CR[4].col.on) throw new Error('the island bridge did not light');
    await walkTo('s', 60.4, -42, .5, 20);
  });
  await step('The Sprite lights the bridge north; both cross to the pulley shaft', async () => {
    await walkTo('s', 60.6, -43.7, .4, 10); await pulse(); if (!CR[3].col.on) throw new Error('bridge 4 did not light');
    await walkBoth(59.8, -57.6, 62, -57.2, 40);
  });
  const Lf = mine.lift, lcx = (Lf.x0 + Lf.x1) / 2, lcz = (Lf.z0 + Lf.z1) / 2;
  await step('Pulley lift: the Sprite rides up while the Giant winds; up top it frees the counterweight', async () => {
    await walkTo('s', lcx, lcz, .4, 20);
    await walkTo('g', M2.WINCH_B.x - 1.3, M2.WINCH_B.z, .3, 20);
    ctl.g = () => ({ act: 1 });
    await until(() => Lf.t >= 1, 8, 'the lift reaching the top');
    await walkTo('s', 51.4, -62.6, .4, 10);
    ctl.g = null;
    if (s.pos.y < 5.9) throw new Error('Sprite not up on the drift (at ' + fmt(s.pos) + ')');
    const lv = M2.MLEVERS.find(l => l.id === 'cw'); await walkTo('s', lv.pos.x, lv.pos.z, .9, 10); await press('s');
    if (!Lf.cw) throw new Error('the counterweight lever did not work');
  });
  await step('Pulley lift: the Giant steps in and the Sprite winds the little winch until the Giant is up', async () => {
    await until(() => Lf.t <= 0, 12, 'the empty lift coming back down');
    await walkTo('g', lcx, lcz, .35, 20);
    await walkTo('s', M2.WINCH_T.x, M2.WINCH_T.z + .9, .3, 10);
    ctl.s = () => ({ act: 1 });
    await until(() => Lf.t >= 1, 8, 'the lift raising the Giant');
    await walkTo('g', 50.6, -62.3, .4, 10);
    ctl.s = null;
    if (g.pos.y < 5.9) throw new Error('Giant not up on the drift (at ' + fmt(g.pos) + ')');
  });
  await step('Giant takes the second stone; a boulder rolls; both hide in the hollow and it smashes the wall', async () => {
    await walkTo('g', 47.5, -64.3, .3, 10); await press('g');
    if (ST[1].state !== 'carried') throw new Error('stone 2 not taken');
    await walkBoth(13.75, -67.2, 12.9, -67.7, 40);
    await until(() => mine.wall.broken, 25, 'the boulder breaking the wall');
    await until(() => mine.boulder.st === 'done', 20, 'the boulder coming to rest');
    if ((G.bowlN || 0) > 0) throw new Error('bowled over ' + G.bowlN + ' times');
  });
  await step('Both walk through the broken wall and jump down into the Great Lantern hall', async () => {
    await walkBoth(-3.2, -61.8, -3.2, -63.4, 40);
    ctl.g = () => ({ mx: -1 }); ctl.s = () => ({ mx: -1 });
    await until(() => g.onGround && g.pos.y < .1 && s.onGround && s.pos.y < .1, 6, 'landing in the hall'); ctl.g = ctl.s = null;
  });
  await step('Hidden crystal path: the Sprite lights the way across the pit; the Giant follows and takes the third stone', async () => {
    const T = CR.filter(c => c.kind === 'tile').map(c => c.anchors[0]);
    await walkTo('s', -21.3, -58.35, .4, 40); await walkTo('g', -20.4, -56.8, .4, 40);
    await pulse();
    for (let i = 0; i < T.length; i++) { await walkTo('s', T[i].x, T[i].z, .35, 10); await pulse(); if (i > 0) await walkTo('g', T[i - 1].x, T[i - 1].z, .3, 10); }
    await walkTo('s', -32.2, -50.8, .4, 10);
    await walkTo('g', T[T.length - 1].x, T[T.length - 1].z, .3, 10);
    await walkTo('g', -31.4, -52.4, .3, 10); await press('g'); if (ST[2].state !== 'carried') throw new Error('stone 3 not taken');
    for (let i = T.length - 1; i >= 0; i--) { await walkTo('s', T[i].x, T[i].z, .35, 10); await pulse(); if (i < T.length - 1) await walkTo('g', T[i + 1].x, T[i + 1].z, .3, 10); else await walkTo('g', -30.9, -53, .3, 10); }
    await walkTo('s', -20.9, -56.8, .4, 10); await pulse();
    await walkTo('g', T[0].x, T[0].z, .3, 10); await walkTo('g', -20.4, -58.3, .4, 10);
    if (G.falls > G0.falls) throw new Error('someone fell into the pit');
  });
  await step('Giant sets the three lantern stones in the Great Lantern', async () => {
    await walkTo('g', M2.GL.x, -66.6, .4, 40); await press('g');
    if (mine.placed < 3) throw new Error('stones placed: ' + mine.placed);
  });
  await step('Giant lobs the Sprite onto the Great Lantern; its pulse from the top lights it and the chapter ends', async () => {
    ctl.g = () => ({ mx: (M2.GL.x - g.pos.x) * 2, mz: g.pos.z > -68.05 ? -1 : 0 });
    await until(() => g.onGround && g.pos.y > .35 && g.pos.z < -67.95, 6, 'Giant onto the plinth'); ctl.g = null;
    await until(() => Math.hypot(g.vel.x, g.vel.z) < .2, 2, 'standing');
    await pickUpSprite(); g.yaw = Math.PI; frame();
    ctl.g = () => ({ act: 1 }); for (let i = 0; i < 4; i++) frame(); ctl.g = null;
    ctl.s = () => ({ mz: -1, mx: (M2.GL.x - s.pos.x) * 1.5, jump: s.vel.y < 0 ? 1 : 0 });
    await until(() => s.onGround, 6, 'Sprite landing'); ctl.s = null;
    if (s.pos.y < M2.GL.top - .2) throw new Error('the lob fell short (Sprite at ' + fmt(s.pos) + ')');
    await pulse();
    await until(() => P.ch2.done, 2, 'chapter complete');
  });
  await step('Chapter-end screen appears; choose "Keep exploring the mines"', async () => {
    await until(() => G.phase === 'end', 12, 'end screen'); B.advance(DT);
    if (document.getElementById('scrEnd').hidden) throw new Error('end screen did not show');
    const title = document.getElementById('endTitle').textContent; if (!/Great Lantern/.test(title)) throw new Error('end screen title: ' + title);
    document.getElementById('bEndMenu').click(); B.advance(DT);
    if (G.phase !== 'play') throw new Error('did not return to play');
  });
  await step('Crystal cellar: the Giant ground-pounds the cracked floor, drops in and climbs back out (secret, memory petal)', async () => {
    const cx = -7.5, cz = -79.5; let tog = 0;
    await walkTo('g', cx, cz, .4, 60);
    let ph = 0; ctl.g = () => { if (ph === 0 && g.onGround) { ph = 1; return { jump: 1 }; } if (ph === 1 && g.vel.y < 1) { ph = 2; return { act: 1 }; } return {}; };
    await until(() => mine.crack.broken, 4, 'the floor breaking'); ctl.g = null;
    await until(() => g.onGround && g.pos.y < -.5, 4, 'Giant landing below');
    ctl.g = () => ({ mx: 1, mz: (cz - g.pos.z) * 2 }); await until(() => g.onGround && g.pos.y < -2.5, 4, 'Giant down on the cellar floor'); ctl.g = null;
    await until(() => P.secrets.c2_cellar, 1, 'the cellar secret');
    await walkTo('g', -5.4, -77, .4, 10); await until(() => P.petals.m7, 2, 'memory petal m7');
    await walkTo('g', -5.4, cz, .4, 10);
    ctl.g = () => ({ mx: -1, mz: (cz - g.pos.z) * 2, jump: g.onGround && g.pos.y < -.05 && (tog ^= 1) ? 1 : 0 });
    await until(() => g.onGround && g.pos.y > -.05 && g.pos.x < -10.2, 20, 'Giant climbing out of the cellar'); ctl.g = null;
  });
  await step('Sprite opens the iron door; both walk back through the yard and out of the Mine Mouth to the Vale', async () => {
    const lv = M2.MLEVERS.find(l => l.id === 'door');
    if (s.pos.y > 1) { ctl.s = () => ({ mz: 1, jump: s.vel.y < 0 ? 1 : 0 }); await until(() => s.onGround && s.pos.y < .1, 6, 'Sprite down from the Great Lantern'); ctl.s = null; }
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 60); await press('s');
    if (!mine.door.open) throw new Error('the door lever did not work');
    await until(() => mine.door.t > .99, 4, 'the door opening');
    await walkBoth(-1.2, 3.6, 1.2, 3.6, 240);
    ctl.g = () => ({ mz: 1 }); ctl.s = () => ({ mz: 1 });
    await until(() => G.region === 'vale', 6, 'travel to the Vale'); ctl.g = ctl.s = null;
    if (B.PROG.roots < 2) throw new Error('the second root did not wake');
  });
  await step('Vale: both walk back in through the Lantern Mines gate', async () => {
    await until(() => !G.scene, 30, 'the root scene'); const gt = B.GATES[1];
    const l = Math.hypot(gt.pos.x, gt.pos.z), ix = -gt.pos.x / l, iz = -gt.pos.z / l;
    await walkBoth(gt.pos.x + ix * 3.5 - iz * .8, gt.pos.z + iz * 3.5 + ix * .8, gt.pos.x + ix * 3.5 + iz * .8, gt.pos.z + iz * 3.5 - ix * .8, 120);
    ctl.g = () => ({ mx: gt.pos.x - g.pos.x, mz: gt.pos.z - g.pos.z }); ctl.s = () => ({ mx: gt.pos.x - s.pos.x, mz: gt.pos.z - s.pos.z });
    await until(() => G.region === 'ch2', 8, 'travel into the mines'); ctl.g = ctl.s = null;
  });
  G.paused = false;
  const time = +simT.toFixed(1), ok = steps.every(x => x.ok);
  log(ok ? 'PASSED' : 'FAILED', 'in', time, 's of game time; falls', G.falls - G0.falls);
  const sum = { seeds: B.SEEDS.filter(x => x.reg === 'ch2' && B.PROG.seeds[x.id]).length + '/' + B.SEEDS.filter(x => x.reg === 'ch2').length,
    petals: B.PETALS.filter(x => x.reg === 'ch2' && B.PROG.petals[x.id]).length + '/' + B.PETALS.filter(x => x.reg === 'ch2').length,
    secrets: B.REG.ch2.secrets.filter(x => B.PROG.secrets[x.id]).map(x => x.name).join(', ') + ' (' + B.REG.ch2.secrets.filter(x => B.PROG.secrets[x.id]).length + '/' + B.REG.ch2.secrets.length + ')',
    lanterns: B.ch2.LANTERNS.filter(l => (B.PROG.ch2.lan >> l.i) & 1).length + '/' + B.ch2.LANTERNS.length };
  log('collected along the way:', JSON.stringify(sum), 'cards/scenes:', seen.join(', '));
  return { ok, steps, time, falls: G.falls - G0.falls, collected: sum, shown: seen };
}
