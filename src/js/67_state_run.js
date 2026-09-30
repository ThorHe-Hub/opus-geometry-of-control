// Act II · state space per-frame: still lattice · slow drift 2–5 s · the skeleton lights up at 5.0 (red
// eigenvector, cyan stable plane with its spirals) · 7.5 the growl: e^{2τ} tears the lattice along the plane.
(() => {
  const { s, phi, uOf, tauAt, T_TEAR, LINES, SEG, NODES, TRAIL, e1, e2, disc, R, glows } = ST;
  const cam = new CamPath([
    { t: 0, p: [11, 6.5, 14], l: [0, 0, 0], fov: 40 },
    { t: 5.2, p: [8.5, 5.5, 12.5], l: [0, 0, 0], fov: 40 },
    { t: 7.5, p: [9.5, 4.5, 11.5], l: [0, 0, 0], fov: 40 },
    { t: 10.2, p: [13, 7, 17], l: [0, 0.3, 0], fov: 42 },
    { t: 12.5, p: [17, 9, 22], l: [0, 0.5, 0], fov: 44, e: 'lin' },
  ]);
  // guide spirals in the stable plane (baked): Φ(σ)x₀ from 8 points on a circle, σ ∈ [0, 2.5]
  const GS = 60, GUIDE = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, x0 = e1.map((v, j) => 3.6 * (Math.cos(a) * v + Math.sin(a) * e2[j])), path = [];
    for (let k = 0; k <= GS; k++) path.push(M.mv(phi((k / GS) * 2.5), x0));
    GUIDE.push(path);
  }
  const ICE = [0.62, 0.85, 1.0], l3 = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  const colAt = (x, g) => mixc(ICE, COL.red, clamp((Math.abs(uOf(x)) * (g - 1)) / 5)); // g = e^{2τ}
  let st = { tau: 0 };

  s.update = (lt) => {
    const tear = sstep(T_TEAR, T_TEAR + 1, lt);
    cam.apply(lt, 0.01 + 0.05 * tear * (1 - sstep(9, 12, lt)), 66);
    const tau = tauAt(lt), P = phi(tau), g = Math.exp(2 * tau), beat = lt < T_TEAR ? Math.exp(-(lt % 2.5) / 0.3) : 0;
    const aIn = sstep(0.2, 1.2, lt), fade = (y) => 1 - sstep(14, 26, Math.hypot(...y));
    const gap = (x) => 1 - 0.85 * tear * (1 - sstep(0.2, 0.9, Math.abs(uOf(x)) * g)); // the torn band around u = 0
    R.lat.begin(); glows.begin();
    for (const [p0, p1] of LINES) {
      const u0 = uOf(p0), u1 = uOf(p1), fs = [];
      for (let k = 0; k <= SEG; k++) fs.push(k / SEG);
      const fu = (u) => (u0 - u) / (u0 - u1), fc = u0 * u1 < 0 ? fu(0) : -1;
      if (fc > 0) [fu(0.9 / g), fu(-0.9 / g)].forEach((f) => { if (f > 0 && f < 1) fs.push(f); });
      fs.sort((a, b) => a - b);
      let cut = fc < 0;
      for (const f of fs) {
        if (!cut && f > fc) {
          const yc = M.mv(P, l3(p0, p1, fc));
          R.lat.push(...yc, 1, aIn * 0.1, WHITE3).cut().push(...yc, 1, aIn * 0.1, WHITE3);
          glows.push(...yc, 0.9 + 1.4 * tear, 0.9 * tear, [1, 0.62, 0.55]);
          cut = true;
        }
        const x = l3(p0, p1, f), y = M.mv(P, x);
        R.lat.push(...y, 1, aIn * (0.55 + 0.3 * beat) * fade(y) * gap(x), colAt(x, g));
      }
      R.lat.cut();
    }
    R.lat.end();
    for (const x of NODES) { const y = M.mv(P, x); glows.push(...y, 0.7, 0.5 * aIn * fade(y) * gap(x), colAt(x, g)); }
    // streaks: where each node was a moment ago
    const PL = [];
    for (let k = 0; k < 12; k++) PL.push(phi(tauAt(Math.max(0, lt - k * 0.05))));
    R.trail.begin();
    for (const x of TRAIL) {
      for (let k = 0; k < 12; k++) { const y = M.mv(PL[k], x); R.trail.push(...y, 1 - k / 14, 0.5 * aIn * (1 - k / 12) * fade(y), colAt(x, g)); }
      R.trail.cut();
    }
    R.trail.end();
    const aS = sstep(5.0, 5.6, lt), kk = Math.round(GS * clamp((lt - 5.0) / 2.4));
    R.guide.begin();
    if (aS > 0) GUIDE.forEach((path) => {
      for (let k = 0; k <= kk; k++) R.guide.push(...path[k], 1, aS * (0.25 + 0.75 * (k / Math.max(1, kk))) * (1 - 0.5 * tear));
      R.guide.cut();
      glows.push(...path[kk], 1.2, aS * (1 - 0.5 * tear), COL.cyan);
    });
    R.guide.end();
    glows.push(0, 0, 0, 1.6, 0.6 * aIn, WHITE3);
    glows.end();
    disc.material.uniforms.uO.value = 0.8 * aS;
    R.eig.u.uOpacity.value = aS; R.eig.u.uWidth.value = 2.4 + 1.6 * tear * (0.5 + 0.5 * Math.sin(lt * 9));
    FX.bloom = 0.95 + 0.25 * tear; FX.ca = 0.005 + 0.012 * tear * (1 - sstep(10, 12.5, lt));
    FX.flash = lt >= T_TEAR ? 0.3 * Math.exp(-(lt - T_TEAR) / 0.15) : 0;
    st = { tau, g };
  };

  s.draw = (lt) => {
    const { tau, g } = st, torn = lt >= T_TEAR;
    const f1 = sstep(0.8, 1.2, lt) * (1 - sstep(4.8, 5.0, lt));
    eqBar('\\dot x = Ax, \\quad x \\in \\R^3', { reveal: invLerp(0.8, 1.4, lt), alpha: f1 });
    eqBar('\\rm{flow map:} \\;\\; x_0 \\mapsto e^{A\\tau}x_0', { line2: true, alpha: f1 * sstep(1.6, 2.0, lt) });
    const f2 = sstep(5.0, 5.3, lt) * (1 - sstep(7.3, 7.5, lt));
    eqBar('\\lambda_1 = \\c{r}{+2}, \\quad \\lambda_{2,3} = \\c{c}{-0.4 \\pm 2j}', { reveal: invLerp(5.0, 5.6, lt), alpha: f2 });
    eqBar('\\rm{eigenvectors: the skeleton of the flow}', { line2: true, alpha: f2 });
    const f3 = sstep(7.5, 7.8, lt);
    eqBar('x(\\tau) = c_1\\, e^{\\c{r}{2\\tau}}\\, u_1 \\;+\\; \\c{c}{e^{-0.4\\tau}(\\dots)}', { reveal: invLerp(7.5, 8.2, lt), alpha: f3 });
    eqBar(`\\tau = ${tau.toFixed(2)}, \\quad e^{2\\tau} = ${g.toFixed(1)}`, { line2: true, alpha: f3 });
    const aS = sstep(5.0, 5.6, lt);
    const lab = (p, src, o) => { const q = toScreen(...p); if (q.vis) drawTex(ui, src, q.x, q.y, { size: 26, alpha: aS, ...o }); };
    lab(SF.u.map((x) => 5.2 * x), '\\c{r}{u_1} \\;\\; (\\lambda = \\c{r}{+2})', { size: 22 });
    lab(e1.map((v, j) => 4.4 * v + 1.2 * e2[j]), 'E^s', { color: css(COL.cyan) });
    splane(ui, 96, LB + 64, 300, 190, { alpha: aS, re: [-1.4, 2.6], im: 2.8, poles: SF.olEig, title: 's-PLANE · eig(A)' });
    panel(ui, W - 330, LB + 92, ['SYSTEM MATRIX A', ...ST.A.map((r) => r.map((v) => fmt(v, 2)).join('  '))], { alpha: sstep(1.0, 1.6, lt), size: 13, lh: 22 });
    const rows = [`τ          ${tau.toFixed(2)}`, `STRETCH    ×${g.toFixed(1)}  ALONG u1`, `SPIRAL     ×${Math.exp(-0.4 * tau).toFixed(2)}  IN STABLE PLANE`, `TURN       ${((2 * tau * 180) / PI).toFixed(0)}°`];
    panel(ui, W - 330, H - LB - 160, [...rows, torn ? '$\\c{r}{\\rm{TORN BY λ = +2}}' : 'FLOWING'], { alpha: sstep(2.0, 2.6, lt), size: 13, lh: 24 });
  };
})();
