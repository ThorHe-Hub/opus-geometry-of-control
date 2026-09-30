// Act IV · the mathematics of autonomy (pure functions, no three.js; checked by tools/test_math.mjs).
//   Rocket 2015  receding-horizon landing: every sixteenth note the booster re-solves min ∫|ȧ|² dτ from its measured
//                state (position r, velocity v, thrust acceleration a) to r(T) = 0, v(T) = 0 with the thrust vertical at
//                touchdown, and flies only the first slice. Without a disturbance each new plan is the tail of the last
//                (Bellman); the two wind gusts are the only reason a plan changes.
//   Swarm        ẋᵢ = ḋᵢ − κ Σⱼ (ξᵢ − ξⱼ) with ξᵢ = xᵢ − dᵢ on a ring graph (neighbours ±1, ±2), no leader. ξ reaches
//                consensus at rate κλ₂; the drones settle on dᵢ = R e^{j(φ(t) + 2πi/N)}: the circle of Act I. Closed form by DFT.
//   Finale       every title particle is a double integrator under PD control: ë = −2ζωₙė − ωₙ²e.
const A4 = (() => {
  // ---- rocket: 1 u ≈ 25.6 m, so g = 9.81 m/s² is 0.383 u/s²
  const G = 0.383, T_LAND = 12.5, DT = BEAT / 4, AMAX = 1.2, UM = 25.6;
  const R0 = [7, 20], V0 = [-1.2, -3.8], U0 = [0.12, 1.1];
  const GUSTS = [[4.375, [0.5, 0]], [6.875, [-0.22, 0.06]]]; // on snare hits, and on plan boundaries; none late: max tilt ≈ 20°
  // jerk ȧ = (α + βs + γs²)/T with s = τ/T. x: a(T) = 0 (upright); y: ȧ(T) = 0 (thrust magnitude free at touchdown)
  const MX = M.inv([[1, 1 / 2, 1 / 3], [1 / 2, 1 / 6, 1 / 12], [1 / 6, 1 / 24, 1 / 60]]);
  const MY = M.inv([[1, 1, 1], [1 / 2, 1 / 6, 1 / 12], [1 / 6, 1 / 24, 1 / 60]]);
  const gA = (a) => (a ? G : 0);
  const solve = (r, v, u, T) => [0, 1].map((a) => {
    const q = u[a] - gA(a);
    return M.mv(a ? MY : MX, [a ? 0 : -u[a], (-v[a] - q * T) / T, (-r[a] - v[a] * T - (q * T * T) / 2) / (T * T)]);
  });
  function evalPlan(P, tau) { // { r, v, u } at τ into plan P
    const T = P.T, s = tau / T, o = { r: [0, 0], v: [0, 0], u: [0, 0] };
    for (let a = 0; a < 2; a++) {
      const [al, be, ga] = P.C[a], q = P.u[a] - gA(a);
      o.u[a] = P.u[a] + al * s + (be * s * s) / 2 + (ga * s ** 3) / 3;
      o.v[a] = P.v[a] + q * tau + T * ((al * s * s) / 2 + (be * s ** 3) / 6 + (ga * s ** 4) / 12);
      o.r[a] = P.r[a] + P.v[a] * tau + (q * tau * tau) / 2 + T * T * ((al * s ** 3) / 6 + (be * s ** 4) / 24 + (ga * s ** 5) / 60);
    }
    return o;
  }
  const PLANS = [];
  {
    let r = R0.slice(), v = V0.slice(), u = U0.slice();
    for (let k = 0; k * DT < T_LAND - 1e-9; k++) {
      const t0 = k * DT, P = { t0, T: T_LAND - t0, r: r.slice(), v: v.slice(), u: u.slice() };
      P.C = solve(r, v, u, P.T);
      PLANS.push(P);
      const h = Math.min(DT, P.T), e = evalPlan(P, h);
      r = e.r; v = e.v; u = e.u;
      for (const [tg, dv] of GUSTS) if (tg > t0 && tg <= t0 + h) for (let a = 0; a < 2; a++) { v[a] += dv[a]; r[a] += dv[a] * (t0 + h - tg); }
    }
  }
  function flight(t) { // the flown state: the current plan's open-loop slice (gusts land exactly on plan boundaries)
    if (t >= T_LAND) return { r: [0, 0], v: [0, 0], u: [0, G], k: PLANS.length - 1, landed: true };
    const k = clamp(Math.floor(t / DT), 0, PLANS.length - 1), P = PLANS[k];
    return { ...evalPlan(P, Math.max(0, t - P.t0)), k, landed: false };
  }
  const tilt = (u) => Math.atan2(u[0], u[1]), throttle = (u) => Math.hypot(u[0], u[1]) / AMAX;

  // ---- swarm
  const NS = 60, KAP = 11, RAD = 2.2, T_ON = 1.0, T_RAMP = 6, OMF = TAU * 0.4, CEN = [0, 2.4, 0], PH0 = -PI + PI / NS;
  const LAM = Array.from({ length: NS }, (_, m) => 2 * (1 - Math.cos((TAU * m) / NS)) + 2 * (1 - Math.cos((2 * TAU * m) / NS)));
  const phiAt = (t) => { const u = (t - T_ON) / T_RAMP; return u <= 0 ? 0 : u < 1 ? OMF * T_RAMP * (u ** 3 - u ** 4 / 2) : OMF * (T_RAMP / 2 + (t - T_ON - T_RAMP)); };
  const dOf = (i, t) => { const a = phiAt(t) + PH0 + (TAU * i) / NS; return [RAD * Math.cos(a), RAD * Math.sin(a), 0]; };
  const rs = rng(2016), X0 = [];
  for (let i = 0; i < NS; i++) X0.push([rs() * 9 - 4.5, 0.6 + rs() * 4.4, rs() * 7 - 3.5]);
  { // index by angle around the cloud so ring neighbours start as spatial neighbours; then centre the cloud on CEN
    const mc = [0, 1, 2].map((j) => X0.reduce((s, p) => s + p[j], 0) / NS), ang = (p) => Math.atan2(p[1] - mc[1], p[0] - mc[0]);
    X0.sort((p, q) => ang(p) - ang(q));
    X0.forEach((p) => { for (let j = 0; j < 3; j++) p[j] += CEN[j] - mc[j]; });
  }
  const CS = new Float64Array(NS * NS), SN = new Float64Array(NS * NS);
  for (let m = 0; m < NS; m++) for (let i = 0; i < NS; i++) { CS[m * NS + i] = Math.cos((TAU * m * i) / NS); SN[m * NS + i] = Math.sin((TAU * m * i) / NS); }
  const E0 = X0.map((p, i) => { const d = dOf(i, T_ON); return [0, 1, 2].map((j) => p[j] - d[j] - CEN[j]); }); // ξ − consensus, mean 0
  const FA = [], FB = [], PW = [];
  for (let m = 0; m < NS; m++) {
    const a = [0, 0, 0], b = [0, 0, 0];
    for (let i = 0; i < NS; i++) for (let j = 0; j < 3; j++) { a[j] += E0[i][j] * CS[m * NS + i]; b[j] += E0[i][j] * SN[m * NS + i]; }
    FA.push(a); FB.push(b); PW.push(a[0] ** 2 + a[1] ** 2 + a[2] ** 2 + b[0] ** 2 + b[1] ** 2 + b[2] ** 2);
  }
  function droneAt(t, out) {
    if (t <= T_ON) { const bob = 1 - clamp(t / T_ON); for (let i = 0; i < NS; i++) out[i] = [X0[i][0], X0[i][1] + 0.06 * bob * Math.sin(3 * t + i), X0[i][2]]; return out; }
    const dec = LAM.map((l) => Math.exp(-KAP * l * (t - T_ON)) / NS);
    for (let i = 0; i < NS; i++) {
      const d = dOf(i, t), p = [CEN[0] + d[0], CEN[1] + d[1], CEN[2] + d[2]];
      for (let m = 1; m < NS; m++) { const c = CS[m * NS + i] * dec[m], s = SN[m * NS + i] * dec[m]; for (let j = 0; j < 3; j++) p[j] += FA[m][j] * c + FB[m][j] * s; }
      out[i] = p;
    }
    return out;
  }
  const disagree = (t) => { const q = Math.max(0, t - T_ON); let s = 0; for (let m = 1; m < NS; m++) s += PW[m] * Math.exp(-2 * KAP * LAM[m] * q); return Math.sqrt(s) / NS; };

  // ---- finale: the PD closed loop, per component, from (e₀, ė₀)
  const ZETA = 0.45, WN = 2.6, SG = ZETA * WN, WD = WN * Math.sqrt(1 - ZETA * ZETA);
  const MP = Math.exp((-PI * ZETA) / Math.sqrt(1 - ZETA * ZETA)), TS = 4 / SG;
  const pdBasis = (t) => ({ ex: Math.exp(-SG * t), c: Math.cos(WD * t), s: Math.sin(WD * t) });
  const pd = (e0, de0, t) => { const { ex, c, s } = pdBasis(t), B = (de0 + SG * e0) / WD, y = e0 * c + B * s; return [ex * y, ex * (-SG * y - e0 * WD * s + B * WD * c)]; };
  const stepY = (t) => 1 - Math.exp(-SG * t) * (Math.cos(WD * t) + (ZETA / Math.sqrt(1 - ZETA * ZETA)) * Math.sin(WD * t));
  return { G, T_LAND, DT, AMAX, UM, GUSTS, PLANS, evalPlan, flight, tilt, throttle,
    NS, KAP, RAD, T_ON, CEN, LAM, dOf, droneAt, disagree, ZETA, WN, SG, WD, MP, TS, pdBasis, pd, stepY };
})();
