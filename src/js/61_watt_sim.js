// Act II · Watt 1788, the flyball governor (scene-local 0–10 s). A real nonlinear governor + engine model:
//   φ̈ = Ω₀²ω² sinφ cosφ − (g/l) sinφ − β φ̇             balls: arm angle φ, spindle speed Ω₀ω
//   ω̇ = κ (v(φ) − load),   v = clamp(½ − k_v (φ − φ₀))   engine speed ω (normalised), throttle v
// Heavy friction β = 4 until 5 s, so the load step at 2.5 s is absorbed. Then β = 0.5 as the load drops:
// the linearisation has poles +0.75 ± 5.03j, the governor hunts, and valve saturation bounds the swing.
const WT = (() => {
  const PHI0 = (35 * PI) / 180, SIG = 0.75, WH = 5.03, B_LO = 0.5, B_HI = 4, T_LOAD = 2.5, T_HUNT = 5.0, SWING = (20 * PI) / 180;
  const rr = B_LO + 2 * SIG, p2 = SIG * SIG + WH * WH, a1 = p2 - 2 * SIG * rr, a0 = rr * p2;
  const O2 = a1 / Math.sin(PHI0) ** 2, gl = O2 * Math.cos(PHI0), kk = a0 / (O2 * Math.sin(2 * PHI0));
  // k_v from the saturation describing function, so the limit cycle sits near SWING; then κ = (κ k_v) / k_v
  const df = (q) => (2 / PI) * (Math.asin(q) + q * Math.sqrt(1 - q * q));
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) { const m = 0.5 * (lo + hi); if (df(m) < (B_LO * a1) / a0) lo = m; else hi = m; }
  const KV = 0.5 / (0.5 * (lo + hi) * SWING), KAP = kk / KV;
  const beta = (t) => (t < T_HUNT ? B_HI : B_LO), load = (t) => (t < T_LOAD ? 0.5 : t < T_HUNT ? 0.9 : 0.3);
  const valve = (ph) => clamp(0.5 - KV * (ph - PHI0));
  const f = (x, t) => [x[1], O2 * x[2] * x[2] * Math.sin(x[0]) * Math.cos(x[0]) - gl * Math.sin(x[0]) - beta(t) * x[1], KAP * (valve(x[0]) - load(t))];
  // x = [φ, φ̇, ω] by RK4 at 960 Hz, spin angle θ alongside; baked at 240 Hz so any frame is a lookup
  const HZ = 240, SUB = 4, h = 1 / (HZ * SUB), N = Math.ceil(10.2 * HZ) + 2, TAB = new Float64Array(N * 5);
  let x = [PHI0, 0, 1], th = 0, t = 0;
  for (let i = 0; i < N; i++) {
    TAB.set([x[0], x[1], x[2], th, valve(x[0])], i * 5);
    for (let k = 0; k < SUB; k++) {
      const k1 = f(x, t), k2 = f(x.map((v, j) => v + 0.5 * h * k1[j]), t + h / 2);
      const k3 = f(x.map((v, j) => v + 0.5 * h * k2[j]), t + h / 2), k4 = f(x.map((v, j) => v + h * k3[j]), t + h);
      th += h * Math.sqrt(O2) * x[2];
      x = x.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      t += h;
    }
  }
  const at = (lt) => {
    const q = clamp(lt, 0, 10.2) * HZ, i = Math.min(N - 2, Math.floor(q)), u = q - i, o = i * 5, g = (k) => lerp(TAB[o + k], TAB[o + 5 + k], u);
    return { phi: g(0), dphi: g(1), w: g(2), th: g(3), v: g(4) };
  };
  // linearised poles for a given friction β: s³ + βs² + a₁s + a₀
  const poles = (b) => M.eig([[0, 1, 0], [-a1, -b, O2 * Math.sin(2 * PHI0)], [-kk, 0, 0]]);
  // ball-angle maxima while hunting: the score's mechanical ticks land on them, louder as the swing grows
  const peaks = [];
  for (let i = Math.ceil(T_HUNT * HZ) + 1; i < N - 1; i++)
    if (TAB[i * 5] > TAB[(i - 1) * 5] && TAB[i * 5] >= TAB[(i + 1) * 5]) peaks.push([i / HZ, clamp((TAB[i * 5] - PHI0) / SWING)]);
  return { PHI0, a1, a0, B_LO, B_HI, T_LOAD, T_HUNT, SWING, KV, KAP, spd: Math.sqrt(O2), beta, load, at, poles, peaks };
})();
