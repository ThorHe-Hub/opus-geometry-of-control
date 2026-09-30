// Act III · Nyquist / Evans per-frame: K sweeps 2 → 12.7 (the critical K = 8 at 3.75 s) while the winding vector
// from −1 follows the curve · 5.6 glitch into the s-plane · 7.5 the poles cross jω on the bells (k = 2).
(() => {
  const { s, nq, sp, gN, gS, rhp, R, branch, glows } = NQ;
  const cam = new CamPath([
    { t: 0, p: [-0.4, -0.5, 10.8], l: [-0.4, 0, 0], fov: 40 },
    { t: 5.4, p: [-0.35, -0.3, 10.0], l: [-0.35, 0, 0], fov: 40 },
    { t: 6.2, p: [0.0, -0.4, 10.6], l: [0, 0, 0], fov: 40 },
    { t: 12.5, p: [0.25, -0.2, 9.8], l: [0.15, 0, 0], fov: 40, e: 'lin' },
  ]);
  const IN = (p) => p[0] > -3.6 && p[0] < 2.3 && Math.abs(p[1]) < 2.3, GOLDW = [1, 0.85, 0.6];
  let st = null;

  s.update = (lt) => {
    const xf = sstep(5.4, 6.2, lt), aN = 1 - xf, aS = xf;
    cam.apply(lt, 0.008, 75);
    gN.material.uniforms.uOpacity.value = aN * sstep(0.1, 0.8, lt); gS.material.uniforms.uOpacity.value = aS;
    R.axN.u.uOpacity.value = aN * sstep(0.2, 0.9, lt); R.unit.u.uOpacity.value = 0.6 * aN * sstep(0.5, 1.2, lt);
    R.axS.u.uOpacity.value = R.locF.u.uOpacity.value = R.mark.u.uOpacity.value = aS;
    // the Nyquist curve of the current loop gain, ω = tan(θ) over θ ∈ (−π/2, π/2)
    const K = A3.kNyq(lt), bad = K > A3.KC, aC = aN * sstep(1.0, 1.5, lt), cc = mixc(WHITE3, [1, 0.35, 0.3], bad ? sstep(3.75, 4.2, lt) : 0);
    R.curve.begin();
    if (aC > 0) for (let i = 0; i <= 1200; i++) {
      const w = Math.tan((i / 1200 - 0.5) * PI * 0.998), L = A3.Lj(K, w);
      if (IN(L)) R.curve.push(...nq(L[0], L[1], 0.01), 1, aC * (w >= 0 ? 1 : 0.45), cc); else R.curve.cut();
    }
    R.curve.cut().end();
    R.chev.begin();
    if (aC > 0) [0.35, 1.0, 2.2, -0.35, -1.0, -2.2].forEach((w) => {
      const a = A3.Lj(K, w), b = A3.Lj(K, w + 0.02), d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, h = 0.09, al = aC * (w > 0 ? 1 : 0.45);
      if (!IN(a)) return;
      R.chev.push(...nq(a[0] - h * (ux + 0.6 * uy), a[1] - h * (uy - 0.6 * ux), 0.012), 1, al, cc).push(...nq(a[0], a[1], 0.012), 1, al, cc)
        .push(...nq(a[0] - h * (ux - 0.6 * uy), a[1] - h * (uy + 0.6 * ux), 0.012), 1, al, cc).cut();
    });
    R.chev.end();
    // the winding vector: from −1 to a cursor running along the curve (its turns are N)
    const wc = Math.tan((fract(lt / 1.7) - 0.5) * PI * 0.96), Lc = A3.Lj(K, wc), aW = aN * sstep(1.6, 2.1, lt), wcol = bad ? COL.red : WHITE3;
    const dx = Lc[0] + 1, dy = Lc[1], sc = Math.min(1, 4 / (Math.hypot(dx, dy) || 1));
    R.wind.begin();
    if (aW > 0) R.wind.push(...nq(-1, 0, 0.014), 1, 0.8 * aW, wcol).push(...nq(-1 + dx * sc, dy * sc, 0.014), 1, 0.8 * aW, wcol).cut();
    R.wind.end();
    glows.begin();
    if (aW > 0 && IN(Lc)) glows.push(...nq(Lc[0], Lc[1], 0.02), 1.1, aW, WHITE3);
    const fl = lt >= 3.75 ? Math.exp(-(lt - 3.75) / 0.3) : 0;
    glows.push(...nq(-1, 0, 0.02), 1.2 + 2.5 * fl + (bad ? 0.3 * Math.sin(lt * 18) : 0), aN * sstep(0.4, 0.9, lt), bad ? COL.red : [1, 0.8, 0.5]);
    // the s-plane: the root locus traced up to the current k, the closed-loop poles on it
    const k = A3.kRL(lt), P = A3.rlPoles(k);
    R.loc.begin();
    if (aS > 0 && k > 0) { branch(R.loc, 0, k, aS, 0.006); branch(R.loc, 1, k, aS, 0.006); }
    R.loc.end();
    const flS = lt >= 7.5 ? Math.exp(-(lt - 7.5) / 0.35) : 0;
    if (aS > 0) P.forEach(([re, im]) => glows.push(...sp(re, im, 0.02), 1.3 + 2 * flS, aS, re > 1e-9 ? COL.red : mixc(COL.cyan, WHITE3, flS)));
    glows.end();
    rhp.material.uniforms.uO.value = aS * (lt < 7.5 ? 0.8 + 0.2 * Math.sin(lt * 6) : 0.25 + 0.55 * Math.exp(-(lt - 7.5) / 0.6));
    // alarms by bloom and colour fringing, not by greying the frame
    const gl = Math.exp(-Math.abs(lt - 5.6) / 0.08);
    FX.bloom = 0.95 + 0.5 * fl * aN + 0.5 * flS * aS; FX.ca = 0.006 + 0.03 * gl + 0.015 * fl * aN;
    FX.flash = Math.max(0.1 * gl, 0.03 * fl * aN);
    st = { K, bad, k, P };
  };

  s.draw = (lt) => {
    const { K, bad, k, P } = st, aN = 1 - sstep(5.3, 5.7, lt), aS = sstep(6.0, 6.4, lt), aH = aN * sstep(1.4, 2.0, lt);
    eqBar('L(j\\omega) = K / (1 + j\\omega)^3, \\qquad Z = N + P', { reveal: invLerp(0.6, 1.4, lt), alpha: aN * sstep(0.6, 1.0, lt) });
    eqBar(bad ? `K = ${K.toFixed(1)} > 8 : \\;\\; N = 2 \\;\\Rightarrow\\; \\c{r}{Z = 2}` : `K = ${K.toFixed(1)}, \\quad -K/8 = ${(-K / 8).toFixed(2)}, \\quad N = 0`, { line2: true, alpha: aN * sstep(1.2, 1.6, lt) });
    splane(ui, 96, LB + 64, 300, 190, { alpha: aH, re: [-3.6, 1.2], im: 3.2, poles: A3.nyqPoles(K), title: 'CLOSED LOOP · (s+1)³ + K = 0', note: `K = ${K.toFixed(2)}` });
    panel(ui, W - 330, H - LB - 160, [`LOOP GAIN     K   ${K.toFixed(2)}`, `CROSSING   −K/8  ${(-K / 8).toFixed(2)}`, `ENCIRCLE −1   N   ${bad ? 2 : 0}`, 'OPEN-LOOP RHP P   0', bad ? '$\\c{r}{\\rm{Z = 2 : IT SINGS}}' : 'Z = 0 : STABLE'], { alpha: aH, size: 13, lh: 24 });
    const aX = aN * sstep(0.2, 0.9, lt); // with the axes, not before them (they would show through the dissolve)
    const lab = (p, str, o) => { const q = toScreen(...p); if (q.vis) text(ui, str, q.x, q.y, { font: FONT.math, size: 24, color: thc('hi', 0.9 * aX), ...o }); };
    if (aX > 0) {
      lab(nq(-1.05, -0.32), '−1', { color: css(bad ? COL.red : GOLDW, aX), align: 'right' });
      lab(nq(2.35, 0.1), 'Re', { style: 'italic', size: 22 }); lab(nq(0.1, 2.35), 'Im', { style: 'italic', size: 22 });
    }
    if (aS <= 0) return;
    const unstable = P.some(([re]) => re > 1e-9), lb = (p, src, o) => { const q = toScreen(...p); if (q.vis) drawTex(ui, src, q.x, q.y, { size: 22, alpha: aS, ...o }); };
    eqBar('1 + k\\,(s + 1) / (s(s - 2)) = 0 \\;\\Leftrightarrow\\; s^2 + (k - 2)s + k = 0', { reveal: invLerp(6.0, 6.8, lt), alpha: aS });
    eqBar(`k = ${k.toFixed(2)}, \\quad s = ${P[0][1] ? `${fmt(P[0][0])} \\pm ${Math.abs(P[0][1]).toFixed(2)}j` : `${fmt(P[0][0])}, \\; ${fmt(P[1][0])}`}`, { line2: true, alpha: aS, color: css(unstable ? COL.red : COL.cyan) });
    lb(sp(2.12, 0.28), '\\c{r}{+2}'); lb(sp(-1.12, 0.36), '-1', { color: css(COL.amber) }); lb(sp(2.95, 0.12), '\\sigma', { size: 26 }); lb(sp(0.12, 2.45), 'j\\omega', { size: 26 });
    if (lt > 7.45) lb(sp(0.15, Math.SQRT2 + 0.32), '\\pm j\\sqrt 2 \\;\\; (k = 2)', { color: css(COL.cyan), alpha: aS * win(lt, 7.45, 10.5, 0.1, 0.8) });
    const sr = A3.stepResp(Math.max(k, 0.01), 6, 160).map(([t, y]) => [t, clamp(y, -1.5, 3)]);
    plotPanel(ui, 110, H - LB - 168, 380, 104, { alpha: aS, x: [0, 6], y: [-1.5, 3], gridY: [0, 1], title: `STEP RESPONSE · k = ${k.toFixed(2)}`, xl: 't  s', series: [{ pts: sr, color: css(unstable ? COL.red : COL.cyan), width: 1.8 }] });
    panel(ui, W - 330, H - LB - 160, [`GAIN        k   ${k.toFixed(2)}`, ...poleRows(P).map((r) => `POLE   ${r}`), unstable ? '$\\c{r}{\\rm{UNSTABLE}}' : '$\\c{c}{\\rm{STABLE : k > 2}}'], { alpha: aS, size: 13, lh: 24 });
  };
})();
