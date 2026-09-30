// Act III · Lyapunov funnel in the 3-D state space of Act II (eigenvalues +2, −0.4 ± 2j).
// Open loop tears the cloud along the unstable eigenvector; at t_on the LQR loop closes and
// every particle crosses the level sets V(x) = xᵀPx = c inward only (V̇ = −xᵀ(Q + KᵀRK)x < 0).
(() => {
  const F = new THREE.Group();
  PD.s.group.add(F);
  PD.F = F; F.visible = false;
  const T0 = PEND.funnel, TON = T0 + 0.75, TB = bars(SB.pend + 7) - bars(SB.pend), TEND = bars(SB.pont - SB.pend);
  const HZ = 60, NOL = Math.ceil(0.75 * HZ) + 1, NCL = Math.ceil((TEND - T0) * HZ) + 2;
  const eOL = M.expm(M.scale(SF.A, 1 / HZ)), eCL = M.expm(M.scale(SF.Acl, 1 / HZ));
  const tab = (Ed, n) => { const out = [M.eye(3)]; for (let i = 1; i < n; i++) out.push(M.mul(Ed, out[i - 1])); return out; };
  const PHI_OL = tab(eOL, NOL), PHI_CL = tab(eCL, NCL);
  const phi = (T, t) => {
    const f = clamp(t, 0, (T.length - 1) / HZ) * HZ, i = Math.min(T.length - 2, Math.floor(f)), u = f - i;
    return T[i].map((r, a) => r.map((v, b) => lerp(v, T[i + 1][a][b], u)));
  };
  const mv = (A, x) => [A[0][0] * x[0] + A[0][1] * x[1] + A[0][2] * x[2], A[1][0] * x[0] + A[1][1] * x[1] + A[1][2] * x[2], A[2][0] * x[0] + A[2][1] * x[1] + A[2][2] * x[2]];
  const r = rng(314), N = 4200;
  const PA = [], PB = [];
  const shell = (rmin, rmax) => { const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u), rr = lerp(rmin, rmax, Math.cbrt(r())); return [q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr]; };
  for (let i = 0; i < N; i++) (i % 2 ? PB : PA).push(shell(i % 2 ? 3.8 : 2.2, i % 2 ? 6.5 : 4.2));
  const xOn = PA.map((x0) => mv(PHI_OL[NOL - 1], x0));
  // Precompute Φ for the current frame once, then apply to every particle.
  // Particles are interleaved: even indices = wave A (torn open-loop, then captured), odd = wave B.
  function statesAt(t, out, stride = 1) {
    const A1 = t < TON ? phi(PHI_OL, t - T0) : phi(PHI_CL, t - TON), B1 = phi(PHI_CL, t - TB);
    for (let i = 0; i < N; i += stride) {
      const j = i >> 1;
      if (i % 2 === 0) out[i] = t < T0 ? PA[j] : t < TON ? mv(A1, PA[j]) : mv(A1, xOn[j]);
      else out[i] = t < TB ? null : mv(B1, PB[j]);
    }
    return out;
  }
  const P = SF.P, V = (x) => x[0] * (P[0][0] * x[0] + 2 * P[0][1] * x[1] + 2 * P[0][2] * x[2]) + x[1] * (P[1][1] * x[1] + 2 * P[1][2] * x[2]) + P[2][2] * x[2] * x[2];
  const vcol = (v) => { const u = clamp((Math.log10(Math.max(v, 1e-3)) + 0.5) / 3.3); return u < 0.4 ? mixc(COL.cyan, COL.ice, u / 0.4) : u < 0.7 ? mixc(COL.ice, COL.gold, (u - 0.4) / 0.3) : mixc(COL.gold, COL.red, (u - 0.7) / 0.3); };
  // max V over a particle subset, baked for the HUD energy trace
  const VMAX = [], tmp = [];
  for (let k = 0; k <= (TEND - T0) * 30; k++) {
    statesAt(T0 + k / 30, tmp);
    let m = 0; for (let i = 0; i < N; i += 7) if (tmp[i]) m = Math.max(m, V(tmp[i]));
    VMAX.push(m);
  }
  // Level-set ellipsoids: semi-axes √(c/λᵢ) along the eigenvectors of P.
  const { values: lam, vectors: Q } = SF.Pe, LEV = [400, 100, 25, 6, 1.5];
  // Act III palette: the level sets are amber CRT wireframe; particles keep the semantic red → cyan energy ramp.
  const rings = new Ribbon(LEV.length * 9 * 66, { width: 1.1, color: COL.amber, intensity: 0.85 });
  const shells = LEV.map((c) => {
    const ax = lam.map((l) => Math.sqrt(c / l));
    const m4 = new THREE.Matrix4().set(Q[0][0] * ax[0], Q[0][1] * ax[1], Q[0][2] * ax[2], 0, Q[1][0] * ax[0], Q[1][1] * ax[1], Q[1][2] * ax[2], 0, Q[2][0] * ax[0], Q[2][1] * ax[1], Q[2][2] * ax[2], 0, 0, 0, 0, 1);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), shellMat(COL.amber, 0.45));
    m.matrixAutoUpdate = false; m.matrix.copy(m4);
    F.add(m);
    const tr = (p) => new THREE.Vector3(...p).applyMatrix4(m4).toArray();
    for (let j = 1; j < 6; j++) { const v = -1 + (2 * j) / 6, q = Math.sqrt(1 - v * v); rings.curve((u) => tr([q * Math.cos(u * TAU), v, q * Math.sin(u * TAU)]), 64, 1, 0.5); }
    for (let j = 0; j < 4; j++) { const a = (j * PI) / 4; rings.curve((u) => tr([Math.cos(a) * Math.sin(u * TAU), Math.cos(u * TAU), Math.sin(a) * Math.sin(u * TAU)]), 64, 1, 0.35); }
    return m;
  });
  rings.end();
  const eig = new Ribbon(40, { width: 2, intensity: 1.6 });
  const u = SF.u;
  eig.push(-u[0] * 30, -u[1] * 30, -u[2] * 30, 1, 0.9, COL.red).push(u[0] * 30, u[1] * 30, u[2] * 30, 1, 0.9, COL.red).cut().end();
  const pts = new Glow(N, { size: 2.6, intensity: 1.5, core: 0.6 });
  const trails = new Ribbon(Math.ceil(N / 3) * 9 + 20, { width: 1.3, intensity: 1.3 });
  const core = new Glow(2, { size: 30, intensity: 2 });
  const stars = makeStars(2600, 57);
  stars.u.uColor.value.set(1.0, 0.84, 0.66);
  F.add(rings.mesh, eig.mesh, trails.mesh, pts.pts, core.pts, stars.pts);
  const cam = new CamPath([
    { t: T0, p: [21, 9, 17], l: [0, 1, 0], fov: 42 },
    { t: TON + 0.6, p: [17, 7, 15], l: [0, 0.5, 0], fov: 42 },
    { t: TB, p: [8, 6.5, 12], l: [0, 0, 0], fov: 42 },
    { t: TEND - 1.2, p: [-3.2, 3.2, 6.4], l: [0, 0, 0], fov: 40 },
    { t: TEND, p: [-2.4, 1.6, 3.6], l: [0, 0, 0], fov: 40, e: 'in' },
  ]);
  const cur = [], lagS = [];
  PD.updateFunnel = (lt) => {
    cam.apply(lt, 0.02, 57);
    statesAt(lt, cur);
    const lags = [0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9];
    lags.forEach((d, k) => { lagS[k] = lagS[k] || []; statesAt(Math.max(T0, lt - d), lagS[k], 3); });
    pts.begin(); trails.begin();
    const on = lt >= TON;
    for (let i = 0; i < N; i++) {
      const x = cur[i];
      if (!x) continue;
      // captured particles dim as V → 0 so the origin does not saturate; the core glow carries it
      const v = V(x), c = vcol(v), born = i % 2 === 0 ? T0 : TB, fa = sstep(born, born + 0.4, lt) * (0.12 + 0.88 * sstep(0.004, 0.6, v));
      pts.push(x[0], x[1], x[2], 0.8 + 0.4 * hash1(i), 0.6 * fa, c);
      if (i % 3 === 0 && trails.n < trails.max - 12) {
        trails.push(x[0], x[1], x[2], 1, 0.5 * fa, c);
        for (let k = 0; k < lags.length; k++) { const y = lagS[k][i]; if (y && lt - lags[k] >= born) trails.push(y[0], y[1], y[2], 1 - k / 9, 0.5 * fa * (1 - k / 8), c); }
        trails.cut();
      }
    }
    pts.end(); trails.end();
    const aS = sstep(TON, TON + 0.8, lt);
    shells.forEach((m, k) => { m.material.uniforms.uOpacity.value = aS * (0.5 + 0.5 * Math.sin(lt * 3 - k * 0.9)) * 0.8; });
    rings.u.uOpacity.value = aS * 0.8;
    eig.color(on ? COL.cyan : COL.red, 1.4); eig.u.uOpacity.value = on ? 0.35 : 1;
    core.begin().push(0, 0, 0, 1 + 2.5 * sstep(TEND - 3, TEND, lt), sstep(TON, TON + 1, lt), COL.white).end();
    FX.bloom = 1.0 + 0.6 * sstep(TEND - 2, TEND, lt);
    FX.flash = Math.max(0.8 * Math.exp(-(lt - T0) / 0.18), on ? 0.5 * Math.exp(-(lt - TON) / 0.15) : 0, 0.9 * sstep(TEND - 0.5, TEND, lt));
    FX.ca = on ? 0.006 : 0.016;
  };
  PD.drawFunnel = (lt) => {
    const on = lt >= TON;
    eqBar(on ? 'V(x) = x^{\\top}Px \\qquad \\dot V = -x^{\\top}(Q + K^{\\top}RK)\\,x < 0' : '\\dot x = Ax, \\quad \\lambda(A) \\ni \\c{r}{+2}', { alpha: sstep(T0 + 0.1, T0 + 0.5, lt), reveal: on ? invLerp(TON, TON + 1.4, lt) : 1 });
    if (on) eqBar('\\dot x = (A - BK)\\,x, \\quad \\rm{Re}\\,\\lambda < 0', { line2: true, alpha: sstep(TON + 1.2, TON + 2, lt) });
    const x0 = W - 380, y0 = H - LB - 150, w = 280, h = 90, a = sstep(T0 + 0.6, T0 + 1.2, lt);
    ui.globalAlpha = a; ui.strokeStyle = thc('hud', 0.35); ui.lineWidth = 1; ui.strokeRect(x0, y0, w, h);
    ui.beginPath();
    const n = Math.min(VMAX.length - 1, Math.floor((lt - T0) * 30));
    for (let k = 0; k <= n; k++) { const X = x0 + (k / (VMAX.length - 1)) * w, Y = y0 + h - (clamp((Math.log10(VMAX[k]) + 1) / 4.5)) * h; k ? ui.lineTo(X, Y) : ui.moveTo(X, Y); }
    ui.strokeStyle = css(COL.gold, 1); ui.lineWidth = 1.6; ui.stroke(); ui.globalAlpha = 1;
    text(ui, 'max V(x)  · log scale', x0, y0 - 10, { font: FONT.mono, size: 12, spacing: 1.5, color: thc('hud', 0.8 * a) });
    text(ui, `Riccati residual ${SF.residual.toExponential(1)}`, x0, y0 + h + 22, { font: FONT.mono, size: 12, color: thc('hud', 0.6 * a) });
    panel(ui, W - 330, LB + 92, ['CLOSED-LOOP POLES', ...poleRows(SF.clEig)], { alpha: sstep(TON, TON + 0.6, lt), size: 13, lh: 22 });
  };
})();
