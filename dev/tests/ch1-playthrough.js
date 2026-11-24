// Scripted playthrough of Chapter 1: The Sunken Garden (main route, side areas, the upper terrace and Hanging Orchard),
// then the walk back to the Vale and both of the Vale's side caves.
// Both characters walk real routes (grid pathfinding around the level's colliders) and solve every puzzle
// with the same inputs a player has. Nothing is teleported; the only help is that a throw is aimed by
// setting the Giant's facing before the throw.
//
// Run it in the browser console on the game page (local server or the live site), from the title screen:
//   const t = await import('/dev/tests/ch1-playthrough.js'); await t.run();
// It prints each step and returns {ok, steps, time}. It erases the save on this laptop first.

const FPS = 60, DT = 1 / FPS;

export async function run(opts = {}) {
  const B = window.__bs, L = B.ch1, g = B.golem, s = B.sprite, G = B.G;
  const log = opts.log || ((...a) => console.log('[ch1]', ...a));
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
    if (frameN % 30 === 0 && !g.charging) { B.bot = { g: () => ({ ...IN.g, jump: 0, act: 0 }), s: () => ({ ...IN.s, jump: 0, act: 0 }) }; B.advance(DT); B.bot = null; }
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
  B.eraseProgress(); B.PROG.seen.prologue = 1; B.PROG.seen.ch1_intro = 1;
  B.startLocal(); B.advance(.2); if (B.skipScene) B.skipScene();
  B.travel('ch1'); B.advance(.2); if (B.skipScene) B.skipScene();
  const G0 = { falls: G.falls };

  await step('Sprite slips through the gap and pulls the gate lever', async () => {
    const lv = L.levers.find(l => l.id === 'gate');
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 60);
    await press('s'); await until(() => B.gate.open, 1, 'gate opening');
  });
  await step('Both go through the north gate to the ravine', async () => {
    await until(() => B.gate.t > .99, 4, 'gate fully open');
    await walkBoth(2.9, -24.6, 1.2, -24.4, 60);
  });
  await step('Giant throws the Sprite over the ravine; the Sprite turns the crank', async () => {
    await pickUpSprite();
    await throwSprite(Math.PI, .55, [L.crank.pos.x, L.crank.pos.z + .6]);
    if (s.pos.z > -33.5) throw new Error('Sprite did not make it across (landed at ' + fmt(s.pos) + ')');
    await walkTo('s', L.crank.pos.x, L.crank.pos.z, .9, 20); await press('s');
    await until(() => B.bridge.t > .99, 5, 'drawbridge lowering');
  });
  await step('Giant crosses the drawbridge', async () => { await walkTo('g', 0, -37, .6, 40); });
  await step('Sprite hops from the Giant\'s head onto the ravine column and nudges the rune off', async () => {
    const r1 = L.runes[1];
    await walkTo('g', r1.pos.x - 1.55, r1.pos.z, .3, 30); g.yaw = Math.PI / 2;
    await pickUpSprite(); g.yaw = Math.PI / 2; frame();
    ctl.s = () => ({ jump: 1, mx: (r1.pos.x - s.pos.x), mz: (r1.pos.z - s.pos.z), act: s.vel.y < 1 && s.pos.y > 2.9 ? 1 : 0 });
    await until(() => r1.state !== 'perched', 3, 'rune knocked off');
    // hop down off the Giant's head to the floor
    ctl.s = () => ({ mz: 1, jump: s.onGround && s.pos.y > .3 ? 1 : 0 });
    await until(() => s.onGround && s.pos.y < .1, 5, 'Sprite back on the floor'); ctl.s = null;
  });
  await step('Sprite pulls the vault lever and the third rune rolls out', async () => {
    const lv = L.levers.find(l => l.id === 'vault');
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 40); await press('s');
    await until(() => L.runes[2].state === 'free', 4, 'rune rolling out');
  });
  await step('Giant picks up the two runes in the waterworks', async () => {
    for (const i of [1, 2]) { const r = L.runes[i]; await until(() => r.onGround !== false, 3, 'rune settling');
      await walkTo('g', r.pos.x, r.pos.z, 1.2, 40); await press('g'); if (r.state !== 'carried') throw new Error('could not pick up rune ' + i + ' at ' + fmt(r.pos)); }
  });
  await step('Both stand on the pressure plates and the portcullis opens', async () => {
    const [hv, lt] = L.plates; await walkBoth(hv.x, hv.z, lt.x, lt.z, 60);
    await until(() => B.port.open, 4, 'portcullis latch');
  });
  await step('Giant pushes the stone block to the ledge, climbs up and takes the rune', async () => {
    const r0 = L.runes[0], blk = B.block;
    await walkTo('g', blk.pos.x + 1.5, blk.pos.z, .2, 120);
    ctl.g = () => ({ mx: -1, mz: (blk.pos.z - g.pos.z) * 2 });
    await until(() => blk.pos.x < -5.8, 20, 'pushing the block against the ledge'); ctl.g = null;
    let tog = 0;
    ctl.g = () => ({ mx: g.pos.y > 2.3 ? (r0.pos.x - g.pos.x) : -1, mz: (r0.pos.z - g.pos.z) * 2, jump: g.onGround && g.pos.y < 2.3 && (tog ^= 1) ? 1 : 0 });
    await until(() => g.onGround && g.pos.y > 2.3 && dxz(g.pos, r0.pos.x, r0.pos.z) < 1.4, 15, 'climbing onto the ledge'); ctl.g = null;
    await press('g'); if (r0.state !== 'carried') throw new Error('could not take the ledge rune');
    ctl.g = () => ({ mx: 1 }); await until(() => g.onGround && g.pos.y < .1, 6, 'stepping down'); ctl.g = null;
  });
  await step('Giant sets the three runes into the fountain rim', async () => {
    await walkTo('g', L.F.x, L.F.z + 4.2, .4, 150); await press('g');
    if (G.placed < 3) throw new Error('runes placed: ' + G.placed);
  });
  await step('Both climb onto the fountain rim; the Sprite leaps from the Giant\'s hands onto the spout', async () => {
    const sp = L.W.spout; let tog = 0;
    // the Giant hops up onto the basin rim, right in front of the spout pillar
    await walkTo('g', sp.x, sp.z + 3.6, .3, 60);
    ctl.g = () => ({ mz: g.pos.z > sp.z + 1.35 ? -1 : 0, mx: (sp.x - g.pos.x) * 2, jump: g.onGround && g.pos.y < .5 && (tog ^= 1) ? 1 : 0 });
    await until(() => g.onGround && g.pos.y > .7 && g.pos.z < sp.z + 1.4, 8, 'Giant onto the rim'); ctl.g = null; g.yaw = Math.PI;
    // the Sprite hops up beside it and is lifted
    await walkTo('s', sp.x + 1, sp.z + 3.4, .4, 90);
    ctl.s = () => ({ mx: (sp.x + 1 - s.pos.x) * 2, mz: (sp.z + 1.6 - s.pos.z) * 2, jump: s.onGround && s.pos.y < .5 && Math.abs(s.pos.z - (sp.z + 2.6)) < 1.2 && (tog ^= 1) ? 1 : 0 });
    await until(() => s.onGround && s.pos.y > .7, 10, 'Sprite onto the rim'); ctl.s = null;
    await press('g'); if (!s.held) throw new Error('Giant could not lift the Sprite on the rim');
    ctl.s = () => { const ax = sp.x - s.pos.x, az = sp.z - s.pos.z, l = Math.hypot(ax, az); return { jump: 1, mx: l > .15 ? ax / l : 0, mz: l > .15 ? az / l : 0 }; };
    await until(() => G.ending || G.fountainOn, 3, 'Sprite reaching the spout'); ctl.s = null;
    await until(() => B.PROG.ch1.done, 10, 'chapter complete');
  });
  await step('Chapter-end screen appears; choose "Keep exploring the garden"', async () => {
    await until(() => G.phase === 'end', 12, 'end screen'); B.advance(DT);
    if (document.getElementById('scrEnd').hidden) throw new Error('end screen did not show');
    document.getElementById('bEndMenu').click(); B.advance(DT);
    if (G.phase !== 'play') throw new Error('did not return to play');
  });
  await step('East garden: Giant jumps on the seesaw and launches the Sprite', async () => {
    const S = L.SEESAW, n0 = G.launchN;
    await walkBoth(S.x - 4.4, S.z, S.x + 2.7, S.z, 120, .95);
    ctl.s = () => ({ mz: (S.z - s.pos.z) * 3 });
    let tog = 0; ctl.g = () => ({ mx: g.pos.x < S.x - 2.6 ? 1 : 0, mz: (S.z - g.pos.z) * 2, jump: g.onGround && g.pos.x > S.x - 3.9 && (tog ^= 1) ? 1 : 0 });
    await until(() => G.launchN > n0, 10, 'a seesaw launch'); ctl.g = ctl.s = null;
    await until(() => s.onGround && g.onGround, 6, 'both landing');
  });
  await step('East garden: a ground pound on the seesaw gives the big launch', async () => {
    const S = L.SEESAW, n0 = G.launchN;
    ctl.g = () => ({ mx: -1 }); await until(() => g.onGround && g.pos.x < S.x - 4.6, 4, 'Giant stepping off'); ctl.g = null;
    await until(() => B.seesaw.tilt < -.95, 4, 'seesaw settling back');
    await walkBoth(S.x - 4.4, S.z, S.x + 2.7, S.z, 60, .95);
    ctl.s = () => ({ mz: (S.z - s.pos.z) * 3 });
    let ph = 0; ctl.g = () => {
      // jump toward the orange end and slam down in mid-air once above it
      if (ph === 0) { if (g.onGround) { ph = 1; return { mx: 1, jump: 1 }; } return {}; }
      if (ph === 1) { if (!g.onGround && g.vel.y < 0 && g.pos.x > S.x - 4) { ph = 2; return { act: 1 }; } return { mx: 1, jump: 1, mz: (S.z - g.pos.z) * 2 }; }
      return {};
    };
    await until(() => G.launchN > n0, 10, 'a ground-pound launch'); ctl.g = ctl.s = null;
    if (!G.launchBig) throw new Error('launch was not the big one');
    await until(() => s.onGround && g.onGround, 8, 'both landing');
  });
  await step('Giant ground-pounds the cracked slab, drops into the cellar and climbs back out', async () => {
    const H = L.CELLAR.hole, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2;
    await walkTo('g', cx, cz, .4, 90);
    let ph = 0; ctl.g = () => { if (ph === 0 && g.onGround) { ph = 1; return { jump: 1 }; } if (ph === 1 && g.vel.y < 1) { ph = 2; return { act: 1 }; } return {}; };
    await until(() => L.crack.broken, 4, 'the slab breaking'); ctl.g = null;
    await until(() => g.onGround && g.pos.y < -.5, 4, 'Giant landing in the cellar');
    ctl.g = () => ({ mx: 1, mz: (cz - g.pos.z) * 2 }); await until(() => g.onGround && g.pos.y < -2.5, 4, 'Giant down on the cellar floor'); ctl.g = null;
    await until(() => B.PROG.secrets.c1_cellar, 1, 'the cellar secret counting');
    // climb the rubble mound and step back up to the garden on the west side of the hole
    let tog = 0; ctl.g = () => ({ mx: -1, mz: (cz - g.pos.z) * 2, jump: g.onGround && g.pos.y < -.05 && (tog ^= 1) ? 1 : 0 });
    await until(() => g.onGround && g.pos.y > -.05 && g.pos.x < H.x0 - .7, 20, 'Giant climbing out of the cellar'); ctl.g = null;
  });
  await step('Upper terrace: a ground-pound launch lands the Sprite on the hidden balcony, and its lever raises the stair', async () => {
    const S = L.SEESAW, lv = L.levers.find(l => l.id === 'stair');
    await walkBoth(S.x - 4.4, S.z, S.x + 2.7, S.z, 120, .95);
    await until(() => B.seesaw.tilt < -.95, 4, 'seesaw settled');
    // in flight, the Sprite steers for the balcony and glides onto it
    ctl.s = () => { if (s.onGround && G.launchN === n0) return { mz: (S.z - s.pos.z) * 3 };
      const ax = 28 - s.pos.x, az = -20 - s.pos.z, l = Math.hypot(ax, az) || 1; return { mx: ax / l, mz: az / l, jump: s.vel.y < 0 ? 1 : 0 }; };
    const n0 = G.launchN; let ph = 0;
    ctl.g = () => { if (ph === 0) { if (g.onGround) { ph = 1; return { mx: 1, jump: 1 }; } return {}; }
      if (ph === 1) { if (!g.onGround && g.vel.y < 0 && g.pos.x > S.x - 4) { ph = 2; return { act: 1 }; } return { mx: 1, jump: 1, mz: (S.z - g.pos.z) * 2 }; } return {}; };
    await until(() => G.launchN > n0 && s.onGround, 8, 'launch and landing'); ctl.g = ctl.s = null;
    if (!(s.pos.y > 4.8 && s.pos.z < -17)) throw new Error('Sprite did not land on the balcony (at ' + fmt(s.pos) + ')');
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 10); await press('s');
    if (!L.stair.raised) throw new Error('stair lever did not work');
    await until(() => L.stair.t > .99, 4, 'stair rising');
  });
  await step('Giant climbs the new stair to the balcony; both cross the aqueduct walk to the Hanging Orchard', async () => {
    await walkTo('g', 12.4, -19.5, .5, 60);
    ctl.g = () => ({ mx: (12.4 - g.pos.x) * 2, mz: (-21.9 - g.pos.z) * 2 }); await until(() => Math.hypot(g.pos.x - 12.4, g.pos.z + 21.9) < .3, 6, 'Giant at the foot of the stair');
    ctl.g = () => ({ mx: 1, mz: (-21.9 - g.pos.z) * 2 }); await until(() => g.onGround && g.pos.y > 4.9 && g.pos.x > 25.4, 15, 'Giant climbing the stair'); ctl.g = null;
    await walkBoth(28, -44, 30, -44.5, 60);
    if (!B.PROG.ws.ch1_orchard) throw new Error('the orchard waystone did not wake');
  });
  await step('Orchard: the Giant lobs the Sprite onto the tower ledge; its lever opens the Sun Pavilion; both stand on the sun and the Giant is crowned', async () => {
    const T = L.TOWER, lv = L.levers.find(l => l.id === 'pavilion');
    await walkTo('g', T.ledge.x0 - 1.5, -70, .3, 60);
    await pickUpSprite(); g.yaw = Math.PI / 2;
    ctl.g = () => ({ act: 1 }); for (let i = 0; i < 4; i++) frame(); ctl.g = null; // a tap: the short high lob
    ctl.s = () => ({ mx: 1, jump: s.vel.y < 0 ? 1 : 0 });
    await until(() => s.onGround, 6, 'Sprite landing after the lob'); ctl.s = null;
    if (s.pos.y < L.ORCH.y + 3.5) throw new Error('lob fell short (Sprite at ' + fmt(s.pos) + ')');
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 10); await press('s');
    if (!L.pav.open) throw new Error('pavilion lever did not work');
    ctl.s = () => ({ mx: -1, jump: s.vel.y < 0 ? 1 : 0 }); await until(() => s.onGround && s.pos.y < L.ORCH.y + .1, 6, 'Sprite gliding down'); ctl.s = null;
    await until(() => L.pav.t > .99, 3, 'pavilion gate opening');
    await walkBoth(19.4, -72, 20.8, -72.3, 60);
    await until(() => L.pav.lit, 4, 'the sun lighting up with both standing on it');
    if (!B.PROG.secrets.c1_pavilion || !B.PROG.ch1.crown) throw new Error('the sun crown secret did not count');
  });
  await step('Both walk back over the aqueduct and down the stair to the garden', async () => {
    await walkBoth(26.2, -21.9, 27.5, -19, 90);
    for (const [w, b] of [['g', g], ['s', s]]) {
      ctl[w] = () => ({ mx: -1, mz: (-21.9 - b.pos.z) * 2 }); await until(() => b.onGround && b.pos.y < .05 && b.pos.x < 13, 15, (w === 'g' ? 'Giant' : 'Sprite') + ' down the stair'); ctl[w] = null;
      await walkTo(w, w === 'g' ? 23 : 17, -19.9, .5, 15); // the stair's foot opens east, along the lever room
    }
  });
  await step('West garden: both hop the stepping stones, the Giant throws the Sprite to the far island, and its lever raises the stone path', async () => {
    const lv = L.levers.find(l => l.id === 'stones'), path = [[-17.4, -55], [-19.6, -54.4], [-21.8, -55.2], [-24.2, -55]];
    await walkBoth(-14.6, -55.2, -13.6, -54.2, 200);
    await hopAcross('g', path);
    await hopAcross('s', path.slice(0, 3).concat([[-23.6, -54]]));
    await press('g'); if (!s.held) throw new Error('Giant could not lift the Sprite on the island');
    await throwSprite(-Math.PI / 2, .95, [-33, -55]);
    if (s.pos.x > -31.5 || s.pos.y < .2) throw new Error('throw fell short (Sprite at ' + fmt(s.pos) + ')');
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 20); await press('s');
    if (!L.stones.raised) throw new Error('lever did not raise the stones');
    await until(() => L.stones.t > .99, 4, 'stones rising');
    await hopAcross('g', [[-27.3, -55], [-29, -54.6], [-30.6, -55.2], [-33, -54.4]]); // the Giant crosses on the raised stones
  });
  await step('Both cross back over the stone path and walk out through the south gate to the Vale', async () => {
    const back = [[-30.6, -55.2], [-29, -54.6], [-27.3, -55], [-24.2, -55], [-21.8, -55.2], [-19.6, -54.4], [-17.4, -55], [-14.6, -55.2]];
    await hopAcross('g', back); await walkTo('g', -13, -53, .5, 10);
    await walkTo('s', -32.6, -55, .4, 10); await hopAcross('s', back);
    await walkBoth(-1.2, 3.6, 1.2, 3.6, 200);
    ctl.g = () => ({ mz: 1 }); ctl.s = () => ({ mz: 1 });
    await until(() => G.region === 'vale', 6, 'travel to the Vale'); ctl.g = ctl.s = null;
    if (B.PROG.roots < 1) throw new Error('the first root did not wake');
  });
  // ---------------- the Vale's side caves ----------------
  const CV = B.caves, C0 = CV.CAVES[0], C1 = CV.CAVES[1];
  await step('Vale: the Sprite slips under the grotto door and pulls its lever; both go deep into the Glow-worm Grotto', async () => {
    const d = C0.dir, lv = CV.VLEVERS.find(l => l.id === 'grotto');
    await walkBoth(C0.x - d * 2.5, C0.z + 1.6, C0.x - d * 2.5, C0.z - 1.6, 240);
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 30); await press('s');
    if (!CV.VCAVE.grotto.open) throw new Error('the grotto lever did not lift the door');
    await until(() => CV.VCAVE.grotto.t > .99, 3, 'door lifting');
    await walkTo('g', C0.x + d * (C0.len - 2.4), C0.z - 1.6, .6, 30);
    await until(() => B.PROG.secrets.v_grotto && B.PROG.petals.m4, 2, 'the grotto secret and petal');
  });
  await step('Vale: the Sprite leaps over the Echo Cave wall from the Giant\'s head; its lever raises steps for the Giant', async () => {
    const d = C1.dir, lv = CV.VLEVERS.find(l => l.id === 'echo'), wallIn = C1.x + d * 1.8;
    await walkBoth(C1.x - d * .5, C1.z, C1.x - d * 2.6, C1.z + 2, 300); await walkTo('g', C1.x - d * .5, C1.z, .35, 10); g.yaw = d > 0 ? Math.PI / 2 : -Math.PI / 2;
    await pickUpSprite(); g.yaw = d > 0 ? Math.PI / 2 : -Math.PI / 2; frame();
    ctl.s = () => ({ mx: d, mz: (C1.z - s.pos.z) * 2, jump: 1 });
    await until(() => s.onGround && (s.pos.x - wallIn) * d > .3, 6, 'Sprite over the wall'); ctl.s = null;
    await walkTo('s', lv.pos.x, lv.pos.z, .9, 20); await press('s');
    if (!CV.VCAVE.echo.raised) throw new Error('the echo lever did not raise the steps');
    await until(() => CV.VCAVE.echo.t > .99, 4, 'steps rising');
    ctl.g = () => ({ mx: d, mz: (C1.z - g.pos.z) * 2 }); await until(() => g.onGround && (g.pos.x - (C1.x + d * 9)) * d > 0, 15, 'Giant climbing over on the steps'); ctl.g = null;
    await walkTo('g', C1.x + d * (C1.len - 2.4), C1.z + 1.6, .6, 20);
    await until(() => B.PROG.secrets.v_echo && B.PROG.petals.m5, 2, 'the echo cave secret and petal');
  });
  const time = +simT.toFixed(1), ok = steps.every(x => x.ok);
  log(ok ? 'PASSED' : 'FAILED', 'in', time, 's of game time; falls', G.falls - G0.falls);
  const sum = { seeds: B.SEEDS.filter(x => x.reg === 'ch1' && B.PROG.seeds[x.id]).length + '/' + B.SEEDS.filter(x => x.reg === 'ch1').length,
    petals: B.PETALS.filter(x => x.reg === 'ch1' && B.PROG.petals[x.id]).length + '/' + B.PETALS.filter(x => x.reg === 'ch1').length,
    secrets: B.REG.ch1.secrets.filter(x => B.PROG.secrets[x.id]).map(x => x.name).join(', ') + ' (' + B.REG.ch1.secrets.filter(x => B.PROG.secrets[x.id]).length + '/' + B.REG.ch1.secrets.length + ')' };
  log('collected along the way:', JSON.stringify(sum), 'cards/scenes:', seen.join(', '));
  return { ok, steps, time, falls: G.falls - G0.falls, collected: sum, shown: seen };
}
