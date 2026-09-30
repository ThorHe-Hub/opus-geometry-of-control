// Act III · the inverted pendulum. Real nonlinear cart–pole, real LQR gain from the CARE.
// Scene-local timeline in PEND (score file). Sim tables are baked at load: seekable, deterministic.
const PD = (() => {
  const HZ = 240, dtI = 1 / 960;
  const rk4 = (x, F, h) => {
    const k1 = CP.deriv(x, F), k2 = CP.deriv(x.map((v, i) => v + 0.5 * h * k1[i]), F);
    const k3 = CP.deriv(x.map((v, i) => v + 0.5 * h * k2[i]), F), k4 = CP.deriv(x.map((v, i) => v + h * k3[i]), F);
    return x.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  };
  const lqrF = (x) => -CP.K[0].reduce((s, k, j) => s + k * x[j], 0);
  // Open-loop fall: θ₀ solved so θ reaches 1.2 rad exactly at the freeze.
  const T_FALL = PEND.freeze - PEND.fall0, TH_END = 1.2;
  const fallRun = (th0, rec) => {
    let x = [0, 0, th0, 0];
    const out = rec ? [x] : null, steps = Math.round(T_FALL / dtI), every = 960 / HZ;
    for (let i = 1; i <= steps; i++) { x = rk4(x, 0, dtI); if (rec && i % every === 0) out.push(x); }
    return rec ? out : x;
  };
  let lo = Math.log(1e-6), hi = Math.log(0.2);
  for (let i = 0; i < 50; i++) { const mid = 0.5 * (lo + hi); if (fallRun(Math.exp(mid))[2] < TH_END) lo = mid; else hi = mid; }
  const FALL = fallRun(Math.exp(0.5 * (lo + hi)), true);
  let iC = FALL.findIndex((x) => x[2] >= 0.3);
  const TH_C = 0.3, tCatchSim = iC / HZ;
  // Closed loop from the rewound state, with impulsive disturbances on θ̇.
  const CL = [], FF = [];
  let x = FALL[iC].slice(), kick = 0;
  const T_CL = bars(SB.pont - SB.pend) - PEND.catch, every = 960 / HZ;
  for (let i = 0; i <= Math.round(T_CL / dtI); i++) {
    const tl = PEND.catch + i * dtI;
    if (kick < PEND.kicks.length && tl >= PEND.kicks[kick]) { x[3] += kick % 2 ? -0.7 : 0.7; kick++; }
    const F = lqrF(x);
    if (i % every === 0) { CL.push(x.slice()); FF.push(F); }
    x = rk4(x, F, dtI);
  }
  const samp = (tab, t) => {
    const f = clamp(t, 0, (tab.length - 1) / HZ) * HZ, i = Math.min(tab.length - 2, Math.floor(f)), u = f - i;
    return tab[i].map((v, j) => lerp(v, tab[i + 1][j], u));
  };
  // State at scene-local time lt, and the phase we are in.
  function state(lt) {
    if (lt < PEND.fall0) return { x: FALL[0], F: 0, ph: 'rest' };
    if (lt < PEND.freeze) return { x: samp(FALL, lt - PEND.fall0), F: 0, ph: 'fall' };
    if (lt < PEND.rew0) return { x: FALL[FALL.length - 1], F: 0, ph: 'freeze' };
    if (lt < PEND.rew1) {
      const u = E.inOut(invLerp(PEND.rew0, PEND.rew1, lt));
      return { x: samp(FALL, lerp(T_FALL, tCatchSim, u)), F: 0, ph: 'rewind' };
    }
    if (lt < PEND.catch) return { x: FALL[iC], F: 0, ph: 'hold' };
    const f = (lt - PEND.catch) * HZ, i = Math.min(FF.length - 2, Math.floor(f));
    return { x: samp(CL, lt - PEND.catch), F: lerp(FF[i], FF[i + 1], f - i), ph: 'closed' };
  }
  // Smoothed cart position for the camera follow (two-pass exponential filter, baked).
  const NS = Math.ceil(PEND.funnel * HZ) + 2, cam = new Float32Array(NS);
  let y = 0;
  for (let i = 0; i < NS; i++) { y += (state(i / HZ).x[0] - y) * 0.02; cam[i] = y; }
  for (let i = NS - 2; i >= 0; i--) cam[i] += (cam[i + 1] - cam[i]) * 0.02;
  const camX = (lt) => cam[Math.min(NS - 1, Math.max(0, Math.round(lt * HZ)))];
  // Root locus of A − kBK for k ∈ [0,1] (the villain +2 slides into the left half-plane).
  const LOCUS = [];
  for (let i = 0; i <= 160; i++) { const k = i / 160; LOCUS.push(M.eig(M.add(CP.A, M.scale(M.mul(CP.B, CP.K), k), -1))); }
  return { state, camX, LOCUS, TH_C, th0: FALL[0][2], HZ };
})();

(() => {
  const s = scene({ id: 'pend', b0: SB.pend, b1: SB.pont, fadeIn: 0, fadeOut: 0, theme: 'amber' }); // its closing white flash dissolves into pont
  const G = s.group, P = new THREE.Group(), stars = makeStars(2400, 46);
  stars.u.uColor.value.set(1.0, 0.84, 0.66);
  G.add(P, stars.pts);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), gridMat({ cell: 0.5, major: 4, fade: 16, intensity: 0.32, color: COL.amber }));
  floor.rotation.x = -PI / 2; floor.position.y = -0.55;
  const rail = new Ribbon(80, { width: 2, color: COL.amber, intensity: 1.35 });
  rail.push(-6.5, -0.02, 0, 1, 0.9).push(6.5, -0.02, 0, 1, 0.9).cut();
  for (let k = -6; k <= 6; k++) rail.push(k, -0.02, 0, 0.8, 0.5).push(k, -0.14, 0, 0.8, 0.5).cut();
  [-6.5, 6.5].forEach((e) => rail.push(e, -0.1, 0, 1.4, 1, [1.3, 1.2, 1.05]).push(e, 0.35, 0, 1.4, 1, [1.3, 1.2, 1.05]).cut());
  rail.end();
  const cart = new THREE.Group();
  cart.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.6), rimMat({ base: [0.07, 0.045, 0.02], rim: COL.amber, intensity: 0.6, power: 3.2 })));
  cart.children[0].position.y = 0.25;
  const cartEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.95, 0.34, 0.6)), new THREE.LineBasicMaterial({ color: new THREE.Color(1.5, 1.05, 0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  cartEdge.position.y = 0.25; cart.add(cartEdge);
  const wheels = [];
  [[-0.3, 0.31], [0.3, 0.31], [-0.3, -0.31], [0.3, -0.31]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), rimMat({ rim: COL.amber, intensity: 0.9 }));
    w.rotation.x = PI / 2; w.position.set(wx, 0.07, wz); cart.add(w); wheels.push(w);
  });
  const pen = makePen(CP.l);
  pen.position.y = 0.42;
  cart.add(pen);
  // Act III palette: amber CRT world; red = the falling (unstable) tip, cyan = the controller once the loop closes.
  const WARM = [1.0, 0.8, 0.56];
  pen.tint(WARM);
  const R = {
    trail: new Ribbon(100, { width: 3, color: WHITE3, intensity: 1.4 }),
    force: new Ribbon(12, { width: 3, color: COL.cyan, intensity: 2 }),
    kick: new Ribbon(200, { width: 2, color: COL.white, intensity: 1.8 }),
  };
  const glows = new Glow(20, { size: 20, intensity: 1.6 });
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), spotMat(COL.amber, 0.16));
  spot.rotation.x = -PI / 2; spot.position.y = -0.54;
  P.add(floor, spot, rail.mesh, cart, R.trail.mesh, R.force.mesh, R.kick.mesh, glows.pts);
  s.hud = { chapter: ACT[3], scene: '倒立摆 · 线性二次调节', anchor: 'KÁLMÁN · LQR · 1960' };
  Object.assign(PD, { s, G, P, cart, pen, wheels, R, glows, WARM });
})();
