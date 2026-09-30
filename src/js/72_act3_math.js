// Act III · the mathematics of the feedback scenes (pure functions, no three.js; checked by tools/test_math.mjs).
//   Black 1927        G = μ/(1 + μβ) ≈ 1/β: the open-loop gain may wander ±50 %, the closed loop hardly moves.
//   Nyquist 1932      L(jω) = K/(1 + jω)³ crosses the real axis at −K/8; for K > 8 it encircles −1 twice: Z = N + P = 2.
//   Evans 1948        the root locus of k(s + 1)/(s(s − 2)) pulls the villain pole +2 left; it crosses jω at k = 2.
//   Pontryagin 1956   minimum-time ẍ = u, |u| ≤ 1: full thrust, one switch on Γ: x = −v|v|/2, full reverse.
//   Kálmán 1960       the lunar module's position filter: P grows by Q between fixes, every scalar fix shrinks it.
const A3 = (() => {
  const BETA = 0.1, MU0 = 1000;
  const mu = (t) => MU0 * (1 + 0.42 * Math.sin(1.3 * t + 0.4) + 0.06 * Math.sin(4.1 * t + 1.3));
  const gainCL = (m) => m / (1 + m * BETA);

  // ---- Nyquist: L(jω) = K[(1 − 3ω²) − j(3ω − ω³)] / (1 + ω²)³
  const Lj = (K, w) => { const d = Math.pow(1 + w * w, 3); return [(K * (1 - 3 * w * w)) / d, (-K * (3 * w - w * w * w)) / d]; };
  function winding(K) { // clockwise encirclements of −1 as ω runs −∞ → ∞
    let tot = 0, prev = null;
    for (let i = 0; i <= 6000; i++) {
      const L = Lj(K, Math.tan((i / 6000 - 0.5) * PI * 0.9995)), a = Math.atan2(L[1], L[0] + 1);
      if (prev !== null) { let d = a - prev; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; tot += d; }
      prev = a;
    }
    return Math.round(-tot / TAU);
  }
  const nyqPoles = (K) => { const r = Math.cbrt(K), h = (r * Math.sqrt(3)) / 2; return [[-1 + r / 2, h], [-1 + r / 2, -h], [-1 - r, 0]]; };
  const K0 = 2, K1 = 2 * Math.pow(4, 4 / 3), KC = 8;
  const kNyq = (lt) => K0 * Math.pow(K1 / K0, clamp((lt - 1.2) / 3.4)); // log sweep 2 → 12.7, through K = 8 at 3.75 s

  // ---- Evans: 1 + k(s + 1)/(s(s − 2)) = 0  ⇔  s² + (k − 2)s + k = 0
  const rlPoles = (k) => { const b = k - 2, D = b * b - 4 * k, q = Math.sqrt(Math.abs(D)) / 2;
    return D >= 0 ? [[-b / 2 + q, 0], [-b / 2 - q, 0]] : [[-b / 2, q], [-b / 2, -q]]; };
  // k(lt): 0 → 2 by 7.5 s (the poles cross jω on the bells), then easing out to 8.5 at 11.3 s
  const kRL = (lt) => (lt < 5.9 ? 0 : lt < 7.5 ? 2 * Math.pow((lt - 5.9) / 1.6, 1.5) : 2 + 6.5 * (1 - Math.pow(1 - clamp((lt - 7.5) / 3.8), 1.096)));
  function stepResp(k, T = 6, n = 240) { // closed-loop k(s + 1)/(s² + (k − 2)s + k) to a unit step
    const a = k - 2, h = T / n, f = (p) => [p[1], -k * p[0] - a * p[1] + 1], out = [[0, 0]];
    let p = [0, 0];
    for (let i = 1; i <= n; i++) {
      const k1 = f(p), k2 = f([p[0] + 0.5 * h * k1[0], p[1] + 0.5 * h * k1[1]]), k3 = f([p[0] + 0.5 * h * k2[0], p[1] + 0.5 * h * k2[1]]), k4 = f([p[0] + h * k3[0], p[1] + h * k3[1]]);
      p = [p[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), p[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
      out.push([i * h, k * (p[0] + p[1])]);
    }
    return out;
  }

  // ---- Pontryagin: along an arc of constant u, x − v²/(2u) is constant; the terminal arcs form Γ
  const gam = (v) => -0.5 * v * Math.abs(v);
  function plan(x0, v0) {
    const s = x0 + 0.5 * v0 * Math.abs(v0);
    if (Math.abs(s) < 1e-12) { const u = -Math.sign(v0); return { x0, v0, u1: u, t1: 0, xs: x0, vs: v0, u2: u, t2: Math.abs(v0) }; }
    const u1 = s > 0 ? -1 : 1, c = x0 - (u1 * v0 * v0) / 2, vs = u1 * Math.sqrt(Math.abs(c));
    return { x0, v0, u1, t1: (vs - v0) / u1, xs: gam(vs), vs, u2: -u1, t2: Math.abs(vs) };
  }
  function stateAt(p, t) { // [x, v, u] at time t ≥ 0
    if (t <= p.t1) return [p.x0 + p.v0 * t + 0.5 * p.u1 * t * t, p.v0 + p.u1 * t, p.u1];
    const q = t - p.t1;
    if (q >= p.t2) return [0, 0, 0];
    return [p.xs + p.vs * q + 0.5 * p.u2 * q * q, p.vs + p.u2 * q, p.u2];
  }

  // ---- Kálmán: the LM position (world units, 1 u ≈ 12 m) as a random walk; scalar fixes along unit vectors h
  const T_K0 = 0.15, T_TD = 11.0, HZK = 120, NK = Math.ceil(12.6 * HZK) + 2;
  const truePos = (lt) => { const w = 1 - clamp(lt / T_TD); return [-6.5 * Math.pow(w, 2.2), 7.5 * (0.85 * w * w + 0.15 * w), 0.5 * Math.sin(1.1 * lt + 0.5) * w]; };
  const nv = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const FIX = [
    [2.65, [[[0, 1, 0], 0.003]]],                                               // landing radar: altitude
    [5.15, [[nv([1, 1.2, 0]), 0.006], [nv([-0.4, 1.2, 1]), 0.006]]],            // radar beams, slanted
    [7.65, [[[1, 0, 0], 0.005], [[0, 0, 1], 0.005]]],                           // landmark sightings
    [10.15, [[[1, 0, 0], 0.0015], [[0, 1, 0], 0.0015], [[0, 0, 1], 0.0015]]],   // final fix
  ];
  const Qat = (t) => (t < T_TD ? 0.014 * clamp(truePos(t)[1] / 3, 0.15, 1) : 0); // slow hover near the ground
  const KP = new Float64Array(NK * 9), KE = new Float64Array(NK * 3);
  {
    const r = rng(1969), al = 1 - Math.exp(-1 / (HZK * 0.06)); // shown with a 60 ms lag so fixes read as motion
    let P = [[0.22, 0, 0], [0, 0.36, 0], [0, 0, 0.22]], e = [0, 1, 2].map((i) => Math.sqrt(P[i][i]) * gauss(r)), fi = 0;
    let Pd = M.clone(P), ed = e.slice();
    for (let i = 0; i < NK; i++) {
      const t = i / HZK;
      if (t > T_K0) {
        const q = Qat(t) / HZK;
        for (let j = 0; j < 3; j++) { P[j][j] += q; e[j] += Math.sqrt(q) * gauss(r); }
        while (fi < FIX.length && FIX[fi][0] <= t) {
          for (const [h, rr] of FIX[fi][1]) {
            const Ph = M.mv(P, h), sg = h[0] * Ph[0] + h[1] * Ph[1] + h[2] * Ph[2] + rr, K = Ph.map((v) => v / sg);
            const inn = h[0] * e[0] + h[1] * e[1] + h[2] * e[2] + Math.sqrt(rr) * gauss(r);
            e = e.map((v, j) => v - K[j] * inn);
            P = P.map((row, a) => row.map((v, b) => v - K[a] * Ph[b]));
          }
          fi++;
        }
      }
      Pd = Pd.map((row, a) => row.map((v, b) => v + (P[a][b] - v) * al));
      ed = ed.map((v, j) => v + (e[j] - v) * al);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) KP[i * 9 + a * 3 + b] = Pd[a][b];
      KE.set(ed, i * 3);
    }
  }
  const kAt = (lt) => {
    const x = clamp(lt, 0, 12.5) * HZK, i = Math.min(NK - 2, Math.floor(x)), u = x - i, o = i * 9, oe = i * 3;
    return { P: [0, 1, 2].map((a) => [0, 1, 2].map((b) => lerp(KP[o + a * 3 + b], KP[o + 9 + a * 3 + b], u))), e: [0, 1, 2].map((j) => lerp(KE[oe + j], KE[oe + 3 + j], u)) };
  };
  const sigma = (P) => Math.sqrt((P[0][0] + P[1][1] + P[2][2]) / 3);
  const FT = 13.12; // on the LM model's scale 1 world unit ≈ 4 m: the scene opens at 100 ft
  const tAlt = (ft) => { let lo = 0, hi = T_TD; for (let i = 0; i < 50; i++) { const m = 0.5 * (lo + hi); if (truePos(m)[1] * FT > ft) lo = m; else hi = m; } return 0.5 * (lo + hi); };
  return { BETA, MU0, mu, gainCL, Lj, winding, nyqPoles, K0, K1, KC, kNyq, rlPoles, kRL, stepResp, gam, plan, stateAt,
    T_K0, T_TD, FIX, truePos, kAt, sigma, FT, tAlt };
})();
