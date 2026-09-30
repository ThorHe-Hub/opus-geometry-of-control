// Numerical self-test of src/js/00–02: run with `node tools/test_math.mjs`.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = ['00_util.js', '01_linalg.js', '02_control.js', '61_watt_sim.js', '72_act3_math.js', '81_act4_math.js']
  .map((f) => readFileSync(path.join(ROOT, 'src', 'js', f), 'utf8')).join('\n');
const ctx = { location: { search: '' }, URLSearchParams, console, Math };
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__T = { M, CP, SF, polyRoots, VILLAIN, WT, A3, A4, rng };', ctx);
const { M, CP, SF, polyRoots, WT, A3, A4, rng } = ctx.__T;

let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) fails++; };
const close = (a, b, tol) => Math.abs(a - b) <= tol;

// expm of a rotation generator equals the rotation matrix.
const Er = M.expm([[0, -1.3], [1.3, 0]]);
check('expm rotation', close(Er[0][0], Math.cos(1.3), 1e-12) && close(Er[1][0], Math.sin(1.3), 1e-12));
// expm of a large-norm matrix: compare exp(A)exp(-A) = I.
const Abig = [[0.5, 9, -2], [-7, -1, 3], [1, 2, -4]];
const Id = M.mul(M.expm(Abig), M.expm(M.scale(Abig, -1)));
check('expm inverse identity', M.fro(M.add(Id, M.eye(3), -1)) < 1e-9, M.fro(M.add(Id, M.eye(3), -1)).toExponential(2));

// Roots of (s+1)^3 + 8 = 0 are -3 and 0 ± j√3.
const r = polyRoots([1, 3, 3, 9]);
check('polyRoots Nyquist case', r.some((z) => close(z[0], 0, 1e-9) && close(Math.abs(z[1]), Math.sqrt(3), 1e-9)), JSON.stringify(r.map((z) => z.map((v) => +v.toFixed(6)))));

// Cart–pole: open-loop poles {±2, 0, 0}; CARE residual tiny; closed loop stable.
check('cart-pole open-loop poles', CP.olPoles.some((z) => close(z[0], 2, 1e-6)) && CP.olPoles.some((z) => close(z[0], -2, 1e-6)), JSON.stringify(CP.olPoles.map((z) => z.map((v) => +v.toFixed(4)))));
check('cart-pole CARE residual', CP.residual < 1e-8, CP.residual.toExponential(2));
check('cart-pole closed loop stable', CP.clPoles.every((z) => z[0] < 0), JSON.stringify(CP.clPoles.map((z) => z.map((v) => +v.toFixed(3)))));
console.log('      K =', CP.K[0].map((v) => +v.toFixed(3)), ' l =', CP.l.toFixed(3));

// Lyapunov check: (A-BK)ᵀP + P(A-BK) = -(Q + KᵀRK).
const lhs = M.add(M.mul(M.T(CP.Acl), CP.P), M.mul(CP.P, CP.Acl));
const rhs = M.scale(M.add(CP.Q, M.mul(M.mul(M.T(CP.K), CP.R), CP.K)), -1);
check('Lyapunov identity for LQR P', M.fro(M.add(lhs, rhs, -1)) < 1e-7, M.fro(M.add(lhs, rhs, -1)).toExponential(2));

// Saddle-focus: eigenvalues {+2, -0.4±2j}; LQR closed loop stable; P positive definite.
check('saddle-focus eigenvalues', SF.olEig.some((z) => close(z[0], 2, 1e-6)) && SF.olEig.some((z) => close(z[0], -0.4, 1e-6) && close(Math.abs(z[1]), 2, 1e-6)), JSON.stringify(SF.olEig.map((z) => z.map((v) => +v.toFixed(4)))));
check('saddle-focus CARE residual', SF.residual < 1e-8, SF.residual.toExponential(2));
check('saddle-focus closed loop stable', SF.clEig.every((z) => z[0] < 0), JSON.stringify(SF.clEig.map((z) => z.map((v) => +v.toFixed(3)))));
check('P positive definite', SF.Pe.values.every((v) => v > 0), JSON.stringify(SF.Pe.values.map((v) => +v.toFixed(4))));
const Vrec = M.mul(M.mul(SF.Pe.vectors, M.diag(SF.Pe.values)), M.T(SF.Pe.vectors));
check('eigSym reconstruction', M.fro(M.add(Vrec, SF.P, -1)) < 1e-10);

// Nonlinear catch: open-loop fall from θ=0.012 to θ=0.30 rad, then LQR from that state.
const rk4 = (x, F, h) => {
  const k1 = CP.deriv(x, F), k2 = CP.deriv(x.map((v, i) => v + 0.5 * h * k1[i]), F);
  const k3 = CP.deriv(x.map((v, i) => v + 0.5 * h * k2[i]), F), k4 = CP.deriv(x.map((v, i) => v + h * k3[i]), F);
  return x.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
};
let x = [0, 0, 0.012, 0], t = 0;
while (x[2] < 0.30) { x = rk4(x, 0, 1 / 480); t += 1 / 480; }
console.log(`      open-loop reaches 0.30 rad at t=${t.toFixed(3)}s, θ̇=${x[3].toFixed(3)}`);
let maxP = 0, maxF = 0, maxTh = 0;
for (let i = 0; i < 480 * 8; i++) {
  const F = -CP.K[0].reduce((s, k, j) => s + k * x[j], 0);
  maxF = Math.max(maxF, Math.abs(F)); maxP = Math.max(maxP, Math.abs(x[0])); maxTh = Math.max(maxTh, Math.abs(x[2]));
  x = rk4(x, F, 1 / 480);
}
check('nonlinear LQR catch converges', Math.abs(x[2]) < 1e-3 && Math.abs(x[0]) < 0.05, `final θ=${x[2].toExponential(2)} p=${x[0].toFixed(4)}`);
console.log(`      max |p|=${maxP.toFixed(2)} m, max |θ|=${maxTh.toFixed(3)} rad, max |F|=${maxF.toFixed(1)} N`);

// Watt governor: heavy friction absorbs the load step; light friction hunts into a bounded limit cycle.
const deg = (r) => (r * 180) / Math.PI;
const fmtP = (P) => JSON.stringify(P.map((z) => z.map((v) => +v.toFixed(3))));
check(`Watt poles β=${WT.B_HI} stable`, WT.poles(WT.B_HI).every((z) => z[0] < 0), fmtP(WT.poles(WT.B_HI)));
check('Watt poles β=0.5 hunting pair +0.75 ± 5.03j', WT.poles(WT.B_LO).some((z) => close(z[0], 0.75, 1e-6) && close(Math.abs(z[1]), 5.03, 1e-6)), fmtP(WT.poles(WT.B_LO)));
check('Watt at rest before the load step', Math.abs(WT.at(2.4).phi - WT.PHI0) < 1e-9);
const sw = (t0, t1, k = 'phi') => { let a = Infinity, b = -Infinity; for (let t = t0; t <= t1; t += 0.005) { const p = WT.at(t)[k]; a = Math.min(a, p); b = Math.max(b, p); } return [a, b]; };
const [m1, M1] = sw(8.7, 10.1).map(deg);
check('Watt hunting grows but stays bounded (half-swing 7°–22°)', (M1 - m1) / 2 > 7 && (M1 - m1) / 2 < 22, `φ ∈ [${m1.toFixed(1)}°, ${M1.toFixed(1)}°]`);
const [w1, W1] = sw(8.7, 10.1, 'w'), [ls, LS] = sw(2.5, 4.9).map(deg);
console.log('      half-swing by time (s→°):', [3, 4, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((t) => { const [a, b] = sw(t - 0.5, t); return `${t}:${deg((b - a) / 2).toFixed(1)}`; }).join(' '));
console.log(`      load step: φ ∈ [${ls.toFixed(1)}°, ${LS.toFixed(1)}°]; hunting speed ω ∈ [${w1.toFixed(4)}, ${W1.toFixed(4)}]; k_v=${WT.KV.toFixed(3)} κ=${WT.KAP.toFixed(4)} spindle ${WT.spd.toFixed(2)} rad/s`);
console.log(`      ${WT.peaks.length} ticks:`, WT.peaks.map(([t, a]) => `${t.toFixed(2)}(${a.toFixed(2)})`).join(' '));

// Act III: Black, Nyquist, Evans, Pontryagin, Kálmán
const mus = [], gcl = [];
for (let q = 0; q < 20; q += 0.01) { mus.push(A3.mu(q)); gcl.push(A3.gainCL(A3.mu(q))); }
check('Black: μ swings ×2.5, closed-loop G moves < 1.5 %', Math.max(...mus) / Math.min(...mus) > 2.5 && (Math.max(...gcl) - Math.min(...gcl)) / 9.9 < 0.015,
  `μ ∈ [${Math.min(...mus).toFixed(0)}, ${Math.max(...mus).toFixed(0)}], G ∈ [${Math.min(...gcl).toFixed(3)}, ${Math.max(...gcl).toFixed(3)}]`);
check('Nyquist: N(K=4) = 0, N(K=12) = 2', A3.winding(4) === 0 && A3.winding(12) === 2, `N = ${A3.winding(4)}, ${A3.winding(12)}`);
const pk8 = A3.nyqPoles(8), cr12 = polyRoots([1, 3, 3, 13]);
check('Nyquist: K = 8 puts closed-loop poles on jω (±j√3)', close(pk8[0][0], 0, 1e-12) && close(pk8[0][1], Math.sqrt(3), 1e-12));
check('Nyquist: closed form = roots of (s+1)³ + 12', A3.nyqPoles(12).every((p) => cr12.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-8)));
check('Nyquist sweep reaches K = 8 at 3.75 s', close(A3.kNyq(3.75), 8, 1e-9), `K(4.6) = ${A3.kNyq(4.6).toFixed(2)}`);
const rl2 = A3.rlPoles(2);
check('Evans: k = 2 puts the poles at ±j√2', close(rl2[0][0], 0, 1e-12) && close(Math.abs(rl2[0][1]), Math.SQRT2, 1e-12));
check('Evans: k = 1 unstable, k = 3 stable', A3.rlPoles(1).some((p) => p[0] > 0) && A3.rlPoles(3).every((p) => p[0] < 0));
check('Evans: k(7.5 s) = 2', close(A3.kRL(7.5), 2, 1e-9), `k(11.3) = ${A3.kRL(11.3).toFixed(2)}`);
const sr3 = A3.stepResp(3, 30, 1500);
check('Evans: step response at k = 3 settles to 1', Math.abs(sr3[sr3.length - 1][1] - 1) < 1e-3, sr3[sr3.length - 1][1].toFixed(5));
const hero = A3.plan(4, 0);
check('Pontryagin hero (4, 0): switch at (2, −2), T* = 4', close(hero.xs, 2, 1e-12) && close(hero.vs, -2, 1e-12) && close(hero.t1 + hero.t2, 4, 1e-12));
let okP = true;
const rp = rng(7);
for (let i = 0; i < 500; i++) {
  const p = A3.plan(rp() * 8 - 4, rp() * 5 - 2.5), s1 = A3.stateAt(p, p.t1), s2 = A3.stateAt(p, p.t1 + p.t2 - 1e-9);
  if (Math.abs(s1[0] - A3.gam(s1[1])) > 1e-9 || Math.hypot(s2[0], s2[1]) > 1e-6 || p.t1 < -1e-12) okP = false;
}
check('Pontryagin: 500 random starts switch on Γ and stop at the origin', okP);
const sgK = (q) => A3.sigma(A3.kAt(q).P);
check('Kálmán: every fix shrinks σ by > 20 %', A3.FIX.every(([q]) => sgK(q + 0.4) < 0.8 * sgK(q - 0.02)), A3.FIX.map(([q]) => `${sgK(q - 0.02).toFixed(3)}→${sgK(q + 0.4).toFixed(3)}`).join(' '));
check('Kálmán: 3σ at touchdown < 0.2 u (≈ 0.8 m)', 3 * sgK(A3.T_TD) < 0.2, (3 * sgK(A3.T_TD)).toFixed(3));
let worst = 0;
for (let q = 0.3; q < 12.4; q += 0.05) { const { P, e } = A3.kAt(q); for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(e[j]) / Math.sqrt(P[j][j])); }
console.log(`      Kálmán: worst |error| / σ per axis = ${worst.toFixed(2)}; 100/75/40/30 ft at ${[100, 75, 40, 30].map((f) => A3.tAlt(f).toFixed(2)).join(' / ')} s`);

// Act IV: receding-horizon landing, ring consensus, the PD title
const fT = A4.flight(A4.T_LAND - 1e-9);
check('Rocket lands at rest (|r|, |v| < 1e-6 at T)', Math.hypot(...fT.r) < 1e-6 && Math.hypot(...fT.v) < 1e-6, `r = ${Math.hypot(...fT.r).toExponential(1)}, v = ${Math.hypot(...fT.v).toExponential(1)}`);
let upOK = true, mTilt = 0, mThr = 0, nThr = 9;
for (let q = 0; q < A4.T_LAND; q += 0.005) { const f = A4.flight(q); if (f.u[1] < 0.3) upOK = false; mTilt = Math.max(mTilt, Math.abs(A4.tilt(f.u))); mThr = Math.max(mThr, A4.throttle(f.u)); nThr = Math.min(nThr, A4.throttle(f.u)); }
check('Rocket: thrust up, tilt < 30°, throttle ≤ 100 %', upOK && mTilt < Math.PI / 6 && mThr <= 1, `tilt ≤ ${deg(mTilt).toFixed(1)}°, throttle ${(100 * nThr).toFixed(0)}–${(100 * mThr).toFixed(0)} %`);
check('Rocket: upright at touchdown', Math.abs(A4.tilt(A4.flight(A4.T_LAND - 1e-6).u)) < 1e-4);
const bA = A4.evalPlan(A4.PLANS[10], A4.DT + 1.5), bB = A4.evalPlan(A4.PLANS[11], 1.5);
check('Rocket: without a gust the new plan is the tail of the old one (Bellman)', Math.hypot(bA.r[0] - bB.r[0], bA.r[1] - bB.r[1], bA.u[0] - bB.u[0], bA.u[1] - bB.u[1]) < 1e-9);
const kG = Math.round(A4.GUSTS[0][0] / A4.DT), gA_ = A4.evalPlan(A4.PLANS[kG - 1], A4.DT + 2), gB_ = A4.evalPlan(A4.PLANS[kG], 2);
check('Rocket: a gust changes the plan', Math.hypot(gA_.r[0] - gB_.r[0], gA_.r[1] - gB_.r[1]) > 0.3, `plan shift ${Math.hypot(gA_.r[0] - gB_.r[0], gA_.r[1] - gB_.r[1]).toFixed(2)} u after 2 s`);
const LAP = M.zeros(A4.NS);
for (let i = 0; i < A4.NS; i++) for (const o of [-2, -1, 1, 2]) { LAP[i][(i + o + A4.NS) % A4.NS] -= 1; LAP[i][i] += 1; }
let okL = true;
for (let m = 1; m <= 5; m++) { const vv = Array.from({ length: A4.NS }, (_, i) => Math.cos((2 * Math.PI * m * i) / A4.NS)), Lv = M.mv(LAP, vv); if (vv.some((z, i) => Math.abs(Lv[i] - A4.LAM[m] * z) > 1e-12)) okL = false; }
check('Swarm: ring-graph Laplacian eigenvalues', okL, `λ₂ = ${A4.LAM[1].toFixed(4)}, κλ₂ = ${(A4.KAP * A4.LAM[1]).toFixed(3)}`);
const eAt = (q) => { const o = []; A4.droneAt(q, o); return o.map((p, i) => { const d = A4.dOf(i, q); return [0, 1, 2].map((j) => p[j] - A4.CEN[j] - d[j]); }); };
const e3 = eAt(3), eP = eAt(3 + 1e-4), eM = eAt(3 - 1e-4);
let odeErr = 0;
for (let i = 0; i < A4.NS; i++) for (let j = 0; j < 3; j++) { let Le = 0; for (let k = 0; k < A4.NS; k++) Le += LAP[i][k] * e3[k][j]; odeErr = Math.max(odeErr, Math.abs((eP[i][j] - eM[i][j]) / 2e-4 + A4.KAP * Le)); }
check('Swarm: the closed form solves ξ̇ = −κLξ', odeErr < 1e-5, odeErr.toExponential(2));
const fErr = Math.max(...eAt(12.4).map((p) => Math.hypot(...p)));
check('Swarm: every drone on its ring slot by 12.4 s', fErr < 0.02, fErr.toExponential(2));
const rat = A4.disagree(8) / A4.disagree(6), pred = Math.exp(-2 * A4.KAP * A4.LAM[1]);
check('Swarm: disagreement decays at κλ₂', Math.abs(rat / pred - 1) < 0.1, `${rat.toExponential(2)} vs ${pred.toExponential(2)}`);
let pkY = 0;
for (let q = 0; q < 5; q += 0.0005) pkY = Math.max(pkY, A4.stepY(q));
check('Finale: PD overshoot = e^(−πζ/√(1−ζ²))', Math.abs(pkY - 1 - A4.MP) < 1e-4, `M_p = ${(100 * A4.MP).toFixed(1)} %, t_s = ${A4.TS.toFixed(2)} s`);
const [pa, pb] = A4.pd(1.3, -0.7, 0.8), [pa1, pb1] = A4.pd(1.3, -0.7, 0.8 + 1e-5), [pa0, pb0] = A4.pd(1.3, -0.7, 0.8 - 1e-5);
check('Finale: the closed form solves ë = −2ζωₙė − ωₙ²e', Math.abs((pa1 - pa0) / 2e-5 - pb) < 1e-6 && Math.abs((pb1 - pb0) / 2e-5 + 2 * A4.SG * pb + A4.WN ** 2 * pa) < 1e-5);
process.exit(fails ? 1 : 0);
