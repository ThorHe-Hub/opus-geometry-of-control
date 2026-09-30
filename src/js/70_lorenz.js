// Act II · Lorenz 1963 (scene-local 0–10 s): two trajectories of ẋ = σ(y − x), ẏ = x(ρ − z) − y, ż = xy − βz
// that start δ₀ = 0.000127 apart (Lorenz's own rounding, 0.506127 → 0.506). The film clock runs fast while they
// are indistinguishable and slows so that they land on opposite wings exactly on the score's glitch at 5.0 s.
const LZ = (() => {
  const s = scene({ id: 'lorenz', b0: SB.lorenz, b1: SB.black, fadeIn: 0, fadeOut: 1.3, theme: 'blueprint' }); // dips into Act III
  const G = s.group, SG = 10, RHO = 28, BE = 8 / 3, SC = 0.2, T_GL = 5.0;
  const f = (p) => [SG * (p[1] - p[0]), p[0] * (RHO - p[2]) - p[1], p[0] * p[1] - BE * p[2]];
  const rk = (p, h) => {
    const k1 = f(p), k2 = f(p.map((v, i) => v + 0.5 * h * k1[i])), k3 = f(p.map((v, i) => v + 0.5 * h * k2[i])), k4 = f(p.map((v, i) => v + h * k3[i]));
    return p.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  };
  const W = (p) => [p[0] * SC, (p[2] - 25) * SC, p[1] * SC]; // attractor → world (z up in Lorenz becomes y up)
  let p = [1, 1, 1];
  for (let i = 0; i < 15000; i++) p = rk(p, 0.002); // settle onto the attractor
  const P0 = p.slice();
  // the attractor itself, drawn as a faint ghost
  const ghost = new Ribbon(4100, { width: 1.1, color: COL.ice, intensity: 0.45, depthTest: false });
  let q = P0.slice();
  for (let i = 0; i < 4000; i++) { for (let k = 0; k < 5; k++) q = rk(q, 0.002); ghost.push(...W(q), 1, 0.55); }
  ghost.cut().end();
  const NG = ghost.geo.drawRange.count;
  // the two racers on a uniform grid of Lorenz time; τ_ev = first time they sit on opposite wings (|Δx| > 8)
  const D0 = 0.000127, HT = 0.002, NT = 15000, TA = new Float64Array(NT * 3), TB = new Float64Array(NT * 3);
  let a = P0.slice(), b = [P0[0] + D0, P0[1], P0[2]], tauEv = -1;
  for (let i = 0; i < NT; i++) {
    TA.set(a, i * 3); TB.set(b, i * 3);
    if (tauEv < 0 && Math.abs(a[0] - b[0]) > 8) tauEv = i * HT;
    a = rk(a, HT); b = rk(b, HT);
  }
  if (tauEv < 9) tauEv = 12.4; // fallback only; the solved value is ≈ 12
  // film clock: 2.2 → 0.9 Lorenz time per second between 1.8 s and the glitch (they part exactly on it), 0.9 after
  const I = (lt) => (lt < 1.8 ? 4.96 + 2.2 * (1.8 - lt) : 2.2 * (T_GL - lt) - 0.203125 * (10.24 - (lt - 1.8) ** 2));
  const tauOf = (lt) => Math.max(0, lt <= T_GL ? tauEv - I(lt) : tauEv + 0.9 * (lt - T_GL));
  const at = (T, tau) => { const x = clamp(tau / HT, 0, NT - 1.001), i = Math.floor(x), u = x - i, o = i * 3;
    return [lerp(T[o], T[o + 3], u), lerp(T[o + 1], T[o + 4], u), lerp(T[o + 2], T[o + 5], u)]; };
  const sep = (tau) => { const P = at(TA, tau), Q = at(TB, tau); return Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]); };
  const TMAX = tauOf(10), SEP = [];
  for (let k = 0; k <= 400; k++) { const tau = (k / 400) * TMAX; SEP.push([tau, Math.log10(Math.max(1e-9, sep(tau)))]); }
  const R = { a: new Ribbon(70, { width: 2.6, color: WHITE3, intensity: 1.7 }), b: new Ribbon(70, { width: 2.6, color: WHITE3, intensity: 1.7 }) };
  const glows = new Glow(4, { size: 20, intensity: 1.9 });
  const stars = makeStars(1800, 63);
  stars.u.uColor.value.set(0.8, 0.9, 1.1);
  G.add(ghost.mesh, R.a.mesh, R.b.mesh, glows.pts, stars.pts);
  s.hud = { chapter: ACT[2], scene: '混沌 · 对初值的敏感依赖', anchor: 'EDWARD LORENZ · 1963' };
  return { s, W, T_GL, D0, TA, TB, at, sep, tauOf, TMAX, SEP, ghost, NG, R, glows, tauEv };
})();
