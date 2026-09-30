// Control-theory solvers: Lyapunov, Riccati (CARE), ZOH discretisation, symmetric eigen.

// Solve Aᵀ P + P A = −Q (Kronecker form, n ≤ 6).
M.lyap = (A, Q) => {
  const n = A.length, N = n * n, L = M.zeros(N), rhs = new Array(N).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const row = i * n + j;
    for (let k = 0; k < n; k++) { L[row][k * n + j] += A[k][i]; L[row][i * n + k] += A[k][j]; }
    rhs[row] = -Q[i][j];
  }
  const p = M.solve(L, rhs), P = M.zeros(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) P[i][j] = 0.5 * (p[i * n + j] + p[j * n + i]);
  return P;
};

// Zero-order-hold discretisation via the augmented exponential expm([[A B],[0 0]]·dt).
M.c2d = (A, B, dt) => {
  const n = A.length, m = B[0].length, Z = M.zeros(n + m);
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) Z[i][j] = A[i][j] * dt; for (let j = 0; j < m; j++) Z[i][n + j] = B[i][j] * dt; }
  const E = M.expm(Z);
  return { Ad: E.slice(0, n).map((r) => r.slice(0, n)), Bd: E.slice(0, n).map((r) => r.slice(n)) };
};

// Continuous algebraic Riccati equation  AᵀP + PA − PBR⁻¹BᵀP + Q = 0.
// A stabilising start comes from discrete Riccati value iteration; Newton–Kleinman
// then converges quadratically to the exact continuous solution.
M.care = (A, B, Q, R) => {
  const dt = 0.02, { Ad, Bd } = M.c2d(A, B, dt);
  const Qd = M.scale(Q, dt), Rd = M.scale(R, dt), AdT = M.T(Ad), BdT = M.T(Bd);
  let P = M.clone(Q);
  for (let it = 0; it < 6000; it++) {
    const BtP = M.mul(BdT, P);
    const K = M.solve(M.add(Rd, M.mul(BtP, Bd)), M.mul(BtP, Ad));
    const Pn = M.add(Qd, M.add(M.mul(M.mul(AdT, P), Ad), M.mul(M.mul(AdT, M.mul(P, Bd)), K), -1));
    const d = M.fro(M.add(Pn, P, -1)) / (1 + M.fro(Pn));
    P = Pn;
    if (d < 1e-12) break;
  }
  const BT = M.T(B), Rinv = M.inv(R);
  let K = M.mul(Rinv, M.mul(BT, M.scale(P, 1 / dt)));
  for (let it = 0; it < 30; it++) {
    const Acl = M.add(A, M.mul(B, K), -1);
    const Pn = M.lyap(Acl, M.add(Q, M.mul(M.mul(M.T(K), R), K)));
    const Kn = M.mul(Rinv, M.mul(BT, Pn));
    const d = M.fro(M.add(Kn, K, -1)) / (1 + M.fro(Kn));
    P = Pn; K = Kn;
    if (d < 1e-15) break;
  }
  const res = M.add(M.add(M.add(M.mul(M.T(A), P), M.mul(P, A)), M.mul(M.mul(M.mul(P, B), M.mul(Rinv, BT)), P), -1), Q);
  return { P, K, residual: M.fro(res), Acl: M.add(A, M.mul(B, K), -1) };
};

// Jacobi eigen-decomposition of a symmetric matrix. Columns of `vectors` are eigenvectors.
M.eigSym = (S) => {
  const n = S.length, A = M.clone(S), V = M.eye(n);
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-26) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  return { values: A.map((r, i) => r[i]), vectors: V };
};

// ---------------------------------------------------------------------------
// The systems of the film. One unstable pole, s = +2, is the villain throughout:
// it is the red pole of Act I, the tearing eigenvalue of Act II and the physical
// instability of the inverted pendulum in Act III.
// ---------------------------------------------------------------------------
const VILLAIN = 2.0;

// Cart–pole: x = [p, ṗ, θ, θ̇], θ from upright. l chosen so √((M+m)g/(M l)) = VILLAIN.
const CP = (() => {
  const Mc = 1.0, m = 0.3, g = 9.81, l = ((Mc + m) * g) / (Mc * VILLAIN * VILLAIN);
  const A = [[0, 1, 0, 0], [0, 0, (-m * g) / Mc, 0], [0, 0, 0, 1], [0, 0, ((Mc + m) * g) / (Mc * l), 0]];
  const B = [[0], [1 / Mc], [0], [-1 / (Mc * l)]];
  const Q = M.diag([6, 2, 90, 8]), R = [[0.02]];
  const lqr = M.care(A, B, Q, R);
  // Nonlinear dynamics (point mass at distance l), force F on the cart.
  function deriv(x, F) {
    const [, pd, th, thd] = x, s = Math.sin(th), c = Math.cos(th);
    const pdd = (F - m * g * s * c + m * l * thd * thd * s) / (Mc + m * s * s);
    return [pd, pdd, thd, (g * s - c * pdd) / l];
  }
  return { Mc, m, g, l, A, B, Q, R, ...lqr, deriv, olPoles: M.eig(A), clPoles: M.eig(lqr.Acl) };
})();

// Abstract 3-D state space for Acts II–III: eigenvalues {+2, −0.4 ± 2j}.
const SF = (() => {
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const u = nrm([0.32, 1.0, 0.22]), v1 = nrm([1.0, 0.12, -0.18]), v2 = nrm([0.1, -0.25, 1.0]);
  const V = [[u[0], v1[0], v2[0]], [u[1], v1[1], v2[1]], [u[2], v1[2], v2[2]]];
  const L = [[VILLAIN, 0, 0], [0, -0.4, 2.0], [0, -2.0, -0.4]];
  const A = M.mul(M.mul(V, L), M.inv(V));
  const B = [[0.2], [1.0], [0.3]];
  const lqr = M.care(A, B, M.eye(3), [[1]]);
  return { A, B, V, u, v1, v2, ...lqr, olEig: M.eig(A), clEig: M.eig(lqr.Acl), Pe: M.eigSym(lqr.P) };
})();
