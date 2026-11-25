// Scripted playthrough of Chapter 4: The Frostmere Lake (every main puzzle and all three side areas), then the walk
// back out to the Vale and in again through the Frostmere Lake gate.
// Both characters walk real routes and solve every puzzle with the same inputs a player has: thawing is holding
// interact, sliding and rolling is walking into the block or the snowball. Nothing is teleported; the only help is
// that a lob is aimed by setting the Giant's facing first.
//
// Run it in the browser console on the game page, from the title screen:
//   const t = await import('/dev/tests/ch4-playthrough.js'); await t.run();
// It erases the save on this laptop first (and marks Chapters 1 to 3 done).

const FPS = 60, DT = 1 / FPS;

export async function run(opts = {}) {
  const B = window.__bs, L = B.ch1, g = B.golem, s = B.sprite, G = B.G;
  const log = opts.log || ((...a) => console.log('[ch4]', ...a));
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
  B.eraseProgress(); const P = B.PROG; Object.assign(P.seen, { prologue: 1, root1: 1, root2: 1, root3: 1, ch4_intro: 1 }); P.ch1.done = P.ch2.done = P.ch3.done = 1; P.roots = 3;
  B.startLocal(); B.advance(.2); if (B.skipScene) B.skipScene();
  const F4 = B.ch4, frs = F4.frs, EM = F4.EMBERS, melt = id => F4.MELTS.find(m => m.id === id);
  B.travel('ch4', F4.FCP.g, F4.FCP.s, Math.PI); B.advance(.2); if (B.skipScene) B.skipScene();
  G.paused = true;
  const G0 = { falls: G.falls };
  async function thaw(id, sx, sz) { const M0 = melt(id); await walkTo('s', sx, sz, .3, 40); ctl.s = () => ({ act: 1 }); await until(() => M0.done, 4, 'thawing ' + id); ctl.s = null; frame(); }
  // on ice the walker slides past its mark: walk, coast to a stop, walk again until close enough
  async function walkIce(w, x, z, r, sec = 40) { const b = w === 'g' ? g : s;
    for (let i = 0; i < 6; i++) { await walkTo(w, x, z, r, sec); ctl[w] = null; await until(() => Math.hypot(b.vel.x, b.vel.z) < .08, 4, 'coasting to a stop'); if (Math.hypot(b.pos.x - x, b.pos.z - z) < r + .25) return; }
    throw new Error('could not settle at ' + x.toFixed(1) + ', ' + z.toFixed(1) + ' on the ice (at ' + fmt(b.pos) + ')'); }
  async function push(w, dir, cond, sec, what) { ctl.g = () => { const d = typeof dir === 'function' ? dir() : dir; return { mx: d[0], mz: d[1] }; }; await until(cond, sec, what); ctl.g = null; await until(() => Math.hypot(g.vel.x, g.vel.z) < .2, 4, 'Giant stopping'); }

  await step('Sprite thaws the frozen latch with its glow; the gate onto the ice opens', async () => {
    await thaw('latch', 2.5, -10.5);
    await until(() => frs.gate.t > .99, 3, 'the gate opening');
  });
  await step('Ice Field: the Giant slides the ice block west against the frozen rock, then north into the channel, where it sinks into a step', async () => {
    const b = F4.ICEB;
    await walkTo('g', 11, -19, .6, 60); await walkIce('g', b.pos.x + 1.75, b.pos.z, .35, 60);
    await push('g', [-1, 0], () => Math.abs(b.vel.x) > 1, 3, 'the block starting to slide');
    await until(() => Math.abs(b.vel.x) < .05, 6, 'the block stopping at the rock');
    if (Math.abs(b.pos.x - F4.FR.rampX) > 1.2) throw new Error('block stopped out of line (x ' + b.pos.x.toFixed(2) + ')');
    await walkIce('g', b.pos.x, b.pos.z + 1.75, .35, 40);
    await push('g', [0, -1], () => Math.abs(b.vel.z) > 1, 3, 'the block starting north');
    await until(() => b.sunk, 8, 'the block sinking into the channel');
    if (Math.abs(b.pos.x - F4.FR.rampX) > 1.2) throw new Error('block sank out of line');
  });
  await step('Both cross the channel on the sunken block and climb to the north shore', async () => {
    await walkTo('g', -9.7, -38.2, .5, 60); await walkTo('g', -9.7, -46.2, .5, 30); await walkTo('g', -10.8, -47.4, .5, 10);
    await walkTo('s', -9.7, -38.2, .5, 60); await walkTo('s', -9.7, -46, .5, 30);
    if (g.pos.z > -43 || s.pos.z > -43) throw new Error('did not cross');
  });
  await step('Thin ice cracks under the Giant: it drops in and comes back on solid ground, once', async () => {
    const f0 = G.splashN; await walkTo('g', 2.4, -46.4, .4, 20);
    ctl.g = () => ({ mx: 1 }); await until(() => G.splashN > f0, 6, 'the Giant breaking through'); ctl.g = null;
    await wait(2.5);
    if (G.splashN !== f0 + 1 || !g.onGround || g.pos.y < -.1) throw new Error('the Giant did not recover from the thin ice (at ' + fmt(g.pos) + ')');
    await walkTo('g', -4, -50, .5, 15);
  });
  await step('The Narrows: the Sprite crosses the thin ice and thaws the islet’s lever; the causeway rises; the Giant crosses and takes the first ember', async () => {
    await walkTo('s', 2, -46.4, .5, 20); await walkTo('s', 9, -46.6, .5, 10); await walkTo('s', 19.6, -47.2, .5, 10); await walkTo('s', 23, -50, .5, 10);
    await thaw('lever', 24, -51.1);
    await until(() => frs.causeT > .99, 4, 'the causeway rising');
    await walkTo('g', 3, -52, .4, 20); await walkTo('g', 20, -52, .4, 20); await walkTo('g', EM[0].pos.x - 1.3, EM[0].pos.z + .3, .4, 10); await press('g');
    if (EM[0].state !== 'carried') throw new Error('could not take the first ember');
    await walkTo('g', 20, -52, .4, 10); await walkTo('g', 2, -52, .4, 20);
  });
  await step('Thin-ice islet: only the Sprite’s light feet get there (secret, memory petal)', async () => {
    await walkTo('s', 23, -50, .5, 10); await walkTo('s', 20.4, -56.4, .5, 10); await walkTo('s', 14, -58, .4, 20);
    await until(() => P.secrets.c4_ring && P.petals.m13, 3, 'the islet secret and petal');
    await walkTo('s', 18, -56.6, .5, 10); await walkTo('s', 9, -57.4, .5, 10); await walkTo('s', 9, -46.6, .5, 10); await walkTo('s', 0, -47, .5, 20);
  });
  await step('Snowfield: the Giant rolls the snowball until it is big, then into the crevasse: a snow bridge; both cross and take the second ember', async () => {
    const b = F4.SNOWB;
    await walkTo('g', b.pos.x + b.r + .9, b.pos.z, .4, 40);
    await push('g', () => [-1, (b.pos.z - g.pos.z) * 2], () => b.pos.x < -31, 12, 'rolling the snowball west');
    await walkTo('g', b.pos.x - b.r - 1, b.pos.z, .4, 20);
    await push('g', () => [1, (b.pos.z - g.pos.z) * 2], () => b.r >= 1.4, 12, 'rolling the snowball east');
    await walkTo('g', b.pos.x, b.pos.z + b.r + 1, .4, 20);
    await push('g', () => [(b.pos.x - g.pos.x) * 2, -1], () => b.bridged, 8, 'rolling the snowball into the crevasse');
    if (G.snowLostN) throw new Error('the snowball was lost');
    await walkBoth(b.pos.x, -56, b.pos.x + .8, -56.4, 40);
    await walkTo('g', EM[1].pos.x + 1.3, EM[1].pos.z, .4, 20); await press('g');
    if (EM[1].state !== 'carried') throw new Error('could not take the second ember');
    await walkTo('s', -15, -58, .5, 20); await walkTo('s', -9, -58, .5, 20); await walkTo('s', -8, -48.6, .5, 20);
    await walkTo('g', b.pos.x, -55.4, .5, 30); await walkTo('g', b.pos.x, -48.2, .5, 20); await walkTo('g', -10, -48, .5, 30);
  });
  await step('Hearth Island: the Sprite thaws the ice wall; the Giant takes the last ember from the cave', async () => {
    await thaw('cave', -4.8, -76);
    await walkTo('s', -2, -70, .5, 10);
    await walkTo('g', EM[2].pos.x + 1.3, EM[2].pos.z, .4, 60); await press('g');
    if (EM[2].state !== 'carried') throw new Error('could not take the last ember');
  });
  await step('The Giant sets the embers; it lobs the Sprite onto the hearth roof; the Sprite thaws the chimney; the chapter ends', async () => {
    await walkTo('g', 0, -68.9, .3, 30); await press('g');
    if (frs.placed < 3) throw new Error('embers set: ' + frs.placed);
    await walkTo('g', 0, -69.2, .2, 10);
    await pickUpSprite(); g.yaw = Math.PI; frame();
    ctl.g = () => ({ act: 1 }); for (let i = 0; i < 4; i++) frame(); ctl.g = null;
    ctl.s = () => ({ mz: s.pos.z > -71 ? -1 : 0, mx: (0 - s.pos.x), jump: s.vel.y < 0 ? 1 : 0 });
    await until(() => s.onGround, 6, 'Sprite landing'); ctl.s = null;
    if (s.pos.y < 3.2) throw new Error('the lob fell short (Sprite at ' + fmt(s.pos) + ')');
    await walkTo('s', 0, -70.9, .2, 6);
    ctl.s = () => ({ act: 1 }); await until(() => P.ch4.done, 4, 'thawing the chimney'); ctl.s = null;
  });
  await step('Chapter-end screen appears; choose "Keep exploring the lake"', async () => {
    await until(() => G.phase === 'end', 12, 'end screen'); B.advance(DT);
    if (document.getElementById('scrEnd').hidden) throw new Error('end screen did not show');
    const title = document.getElementById('endTitle').textContent; if (!/thaws/.test(title)) throw new Error('end screen title: ' + title);
    document.getElementById('bEndMenu').click(); B.advance(DT);
    if (G.phase !== 'play') throw new Error('did not return to play');
  });
  const mainFalls = G.falls - G0.falls;
  await step('The great boulder: the Giant lobs the Sprite onto it (secret, memory petal)', async () => {
    ctl.s = () => ({ mz: 1 }); await until(() => s.onGround && s.pos.y < .1, 6, 'Sprite down from the roof'); ctl.s = null;
    await walkTo('g', 8, -75.5, .3, 30); await pickUpSprite(); g.yaw = Math.PI; frame();
    ctl.g = () => ({ act: 1 }); for (let i = 0; i < 4; i++) frame(); ctl.g = null;
    ctl.s = () => ({ mz: s.pos.z > -77.6 ? -1 : 0, jump: s.vel.y < 0 ? 1 : 0 }); await until(() => s.onGround, 6, 'Sprite landing'); ctl.s = null;
    if (!P.petals.m14) await walkTo('s', 8.6, -78, .6, 6);
    await until(() => P.secrets.c4_rock && P.petals.m14, 3, 'the boulder secret and petal');
    ctl.s = () => ({ mz: 1 }); await until(() => s.onGround && s.pos.y < .1, 6, 'Sprite down'); ctl.s = null;
  });
  await step('The fishing hut: back across the ice, the Sprite thaws its door (secret, memory petal)', async () => {
    await walkBoth(-10.6, -46, -9.4, -46.4, 90);
    await walkBoth(-10.4, -36, -9.6, -36.6, 60);
    await thaw('hut', 13.1, -36);
    await walkTo('s', 16.6, -36, .4, 10);
    await until(() => P.secrets.c4_hut && P.petals.m12, 3, 'the hut secret and petal');
  });
  await step('Both walk back to Shore Camp and out through the gate to the Vale', async () => {
    await walkBoth(-1.2, 8, 1.2, 8, 160);
    ctl.g = () => ({ mz: 1 }); ctl.s = () => ({ mz: 1 });
    await until(() => G.region === 'vale', 6, 'travel to the Vale'); ctl.g = ctl.s = null;
    if (B.PROG.roots < 4) throw new Error('the fourth root did not wake');
  });
  await step('Vale: both walk back in through the Frostmere Lake gate', async () => {
    await until(() => !G.scene, 30, 'the root scene'); const gt = B.GATES[3];
    const l = Math.hypot(gt.pos.x, gt.pos.z), ix = -gt.pos.x / l, iz = -gt.pos.z / l;
    await walkBoth(gt.pos.x + ix * 3.5 - iz * .8, gt.pos.z + iz * 3.5 + ix * .8, gt.pos.x + ix * 3.5 + iz * .8, gt.pos.z + iz * 3.5 - ix * .8, 160);
    ctl.g = () => ({ mx: gt.pos.x - g.pos.x, mz: gt.pos.z - g.pos.z }); ctl.s = () => ({ mx: gt.pos.x - s.pos.x, mz: gt.pos.z - s.pos.z });
    await until(() => G.region === 'ch4', 8, 'travel into the lake'); ctl.g = ctl.s = null;
  });
  G.paused = false;
  const time = +simT.toFixed(1), ok = steps.every(x => x.ok);
  log(ok ? 'PASSED' : 'FAILED', 'in', time, 's of game time; unplanned falls', mainFalls);
  const sum = { seeds: B.SEEDS.filter(x => x.reg === 'ch4' && B.PROG.seeds[x.id]).length + '/' + B.SEEDS.filter(x => x.reg === 'ch4').length,
    petals: B.PETALS.filter(x => x.reg === 'ch4' && B.PROG.petals[x.id]).length + '/' + B.PETALS.filter(x => x.reg === 'ch4').length,
    secrets: B.REG.ch4.secrets.filter(x => B.PROG.secrets[x.id]).map(x => x.name).join(', ') + ' (' + B.REG.ch4.secrets.filter(x => B.PROG.secrets[x.id]).length + '/' + B.REG.ch4.secrets.length + ')' };
  log('collected along the way:', JSON.stringify(sum), 'cards/scenes:', seen.join(', '));
  return { ok, steps, time, falls: mainFalls, collected: sum, shown: seen };
}
