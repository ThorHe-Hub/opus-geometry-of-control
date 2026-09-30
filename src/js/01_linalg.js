// Small dense linear algebra for the control computations (n ≤ 6).
// Matrices are arrays of rows. Every number shown on screen is computed here.
const M = {
  zeros: (n, m = n) => Array.from({ length: n }, () => new Array(m).fill(0)),
  eye: (n) => { const A = M.zeros(n); for (let i = 0; i < n; i++) A[i][i] = 1; return A; },
  diag: (d) => { const A = M.zeros(d.length); d.forEach((v, i) => (A[i][i] = v)); return A; },
  clone: (A) => A.map((r) => r.slice()),
  T: (A) => A[0].map((_, j) => A.map((r) => r[j])),
  add: (A, B, b = 1) => A.map((r, i) => r.map((v, j) => v + b * B[i][j])),
  scale: (A, s) => A.map((r) => r.map((v) => v * s)),
  mv: (A, x) => A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0)),
  trace: (A) => A.reduce((s, r, i) => s + r[i], 0),
  fro: (A) => Math.sqrt(A.reduce((s, r) => s + r.reduce((q, v) => q + v * v, 0), 0)),
  norm1: (A) => {
    let m = 0;
    for (let j = 0; j < A[0].length; j++) { let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i][j]); m = Math.max(m, s); }
    return m;
  },
  mul: (A, B) => {
    const n = A.length, m = B[0].length, k = B.length, C = M.zeros(n, m);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { let s = 0; for (let q = 0; q < k; q++) s += A[i][q] * B[q][j]; C[i][j] = s; }
    return C;
  },
};

// Gaussian elimination with partial pivoting. B may be a vector or a matrix.
M.solve = (A, B) => {
  const n = A.length, vec = !Array.isArray(B[0]);
  const X = vec ? B.map((v) => [v]) : M.clone(B), m = X[0].length, a = M.clone(A);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-300) throw new Error('M.solve: singular matrix');
    [a[c], a[p]] = [a[p], a[c]]; [X[c], X[p]] = [X[p], X[c]];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c]; if (f === 0) continue;
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
      for (let k = 0; k < m; k++) X[r][k] -= f * X[c][k];
    }
  }
  for (let c = n - 1; c >= 0; c--) for (let k = 0; k < m; k++) {
    let s = X[c][k];
    for (let j = c + 1; j < n; j++) s -= a[c][j] * X[j][k];
    X[c][k] = s / a[c][c];
  }
  return vec ? X.map((r) => r[0]) : X;
};
M.inv = (A) => M.solve(A, M.eye(A.length));

// Matrix exponential: scaling and squaring with a degree-14 Taylor core.
M.expm = (A) => {
  const n = A.length, nrm = M.norm1(A);
  const s = nrm > 0 ? Math.max(0, Math.ceil(Math.log2(nrm / 0.5)) + 1) : 0;
  const As = M.scale(A, Math.pow(2, -s));
  let term = M.eye(n), sum = M.eye(n);
  for (let k = 1; k <= 14; k++) { term = M.scale(M.mul(term, As), 1 / k); sum = M.add(sum, term); }
  for (let i = 0; i < s; i++) sum = M.mul(sum, sum);
  return sum;
};

// Characteristic polynomial (Faddeev–LeVerrier): returns [1, c1, …, cn].
M.charpoly = (A) => {
  const n = A.length, c = [1];
  let Mk = M.zeros(n);
  for (let k = 1; k <= n; k++) {
    Mk = M.add(M.mul(A, Mk), M.scale(M.eye(n), c[k - 1]));
    c.push(-M.trace(M.mul(A, Mk)) / k);
  }
  return c;
};

// Complex helpers: numbers are [re, im].
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1] || 1e-300;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cabs = (a) => Math.hypot(a[0], a[1]);

// Roots of a monic polynomial [1, c1..cn] by Durand–Kerner iteration.
function polyRoots(c) {
  const n = c.length - 1;
  if (n < 1) return [];
  const R = 1 + Math.max(...c.slice(1).map(Math.abs));
  let z = [];
  for (let i = 0; i < n; i++) { const a = (TAU * i) / n + 0.4; z.push([R * Math.cos(a), R * Math.sin(a)]); }
  const peval = (x) => { let v = [1, 0]; for (let k = 1; k <= n; k++) { v = cmul(v, x); v[0] += c[k]; } return v; };
  for (let it = 0; it < 800; it++) {
    let step = 0;
    const zn = z.map((zi, i) => {
      let den = [1, 0];
      for (let j = 0; j < n; j++) if (j !== i) den = cmul(den, [zi[0] - z[j][0], zi[1] - z[j][1]]);
      const d = cdiv(peval(zi), den);
      step = Math.max(step, cabs(d));
      return [zi[0] - d[0], zi[1] - d[1]];
    });
    z = zn;
    if (step < 1e-14 * R) break;
  }
  return z.map(([re, im]) => [Math.abs(re) < 1e-10 ? 0 : re, Math.abs(im) < 1e-7 ? 0 : im])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
}
M.eig = (A) => polyRoots(M.charpoly(A));
