// Act II · Maxwell per-frame: the page writes itself (0.3–5.6) · "bc > ad" glows · the camera crosses to the
// chart · Watt's point (β = 0.5, hunting) slides as friction grows and crosses XY = 1 on the pluck at 7.5 ·
// the page becomes a blueprint (8.3–9.6) and the camera pulls back for the cut to state space.
(() => {
  const { s, PU, glowL, FU, R, glows, cp, RG, wp, drawPage, drawEmissive } = MX;
  // follows the writing down the left column (x = 425 design px → world −0.82), then crosses to the chart
  const cam = new CamPath([
    { t: 0, p: [-0.82, 1.36, -0.02], l: [-0.82, 0, -0.97], fov: 34 },
    { t: 2.0, p: [-0.82, 1.5, 0.43], l: [-0.82, 0, -0.62], fov: 36 },
    { t: 3.6, p: [-0.82, 1.55, 0.77], l: [-0.82, 0, -0.32], fov: 36 },
    { t: 4.7, p: [-0.8, 1.55, 1.21], l: [-0.8, 0, 0.12], fov: 36 },
    { t: 5.6, p: [-0.8, 1.5, 1.35], l: [-0.8, 0, 0.3], fov: 35 },
    { t: 6.5, p: [0.95, 1.9, 1.17], l: [0.95, 0, -0.16], fov: 40 },
    { t: 8.3, p: [0.9, 2.0, 1.25], l: [0.9, 0, -0.14], fov: 40 },
    { t: 10, p: [0.2, 3.3, 2.2], l: [0.1, 0, -0.1], fov: 42, e: 'in' },
  ]);
  const a0 = WT.a0, a1 = WT.a1, Y = a1 / Math.cbrt(a0 * a0), Xb = (b) => b / Math.cbrt(a0), BS = a0 / a1; // XY = 1 at β = a₀/a₁
  // β from Watt's 0.5 to 4: through the boundary exactly at 7.5 s
  const bAt = (lt) => (lt < 7.5 ? lerp(WT.B_LO, BS, E.in(clamp((lt - 6.35) / 1.15))) : lerp(BS, WT.B_HI, E.out(clamp((lt - 7.5) / 1.15))));
  let last = -1, nib = null, st = { b: WT.B_LO, a: 0 };

  s.update = (lt) => {
    cam.apply(lt, 0.006, 68);
    const tp = Math.min(lt, 6.0);
    if (tp !== last) { nib = drawPage(tp); drawEmissive(clamp((tp - 5.0) / 0.6)); last = tp; }
    const bp = sstep(8.3, 9.6, lt);
    PU.uLamp.value.set(lerp(0.3, 0.72, sstep(5.2, 6.4, lt)), lerp(0.84, 0.6, sstep(0, 6.4, lt)));
    PU.uBP.value = bp;
    glowL.material.uniforms.uGain.value = (sstep(5.0, 5.4, lt) * 0.45 + (lt >= 5.6 ? 0.7 * Math.exp(-(lt - 5.6) / 0.5) : 0)) * (1 - bp);
    glows.begin();
    if (nib) glows.push(...wp(nib[0], nib[1], 0.01), 1.1, 0.9, [1, 0.8, 0.5]);
    // the modern reading over the page
    const aC = sstep(5.6, 6.1, lt), c = mixc(COL.gold, COL.ice, bp);
    R.axes.begin();
    if (aC > 0) {
      const ex = RG * E.out(aC);
      ribArrow(R.axes, cp(0, 0), cp(ex, 0), 0.05, 1, aC, c, [0, 1, 0]);
      ribArrow(R.axes, cp(0, 0), cp(0, ex), 0.05, 1, aC, c, [0, 1, 0]);
      for (let k = 1; k <= 2; k++) {
        R.axes.push(...cp(k, -0.04), 1, 0.7 * aC, c).push(...cp(k, 0.04), 1, 0.7 * aC, c).cut();
        R.axes.push(...cp(-0.04, k), 1, 0.7 * aC, c).push(...cp(0.04, k), 1, 0.7 * aC, c).cut();
      }
    }
    R.axes.end();
    const rev = sstep(5.8, 6.5, lt), x1 = 1 / RG, n = Math.round(200 * rev);
    R.curve.begin();
    for (let i = 0; i <= n && rev > 0; i++) { const x = x1 * Math.pow(RG / x1, i / 200); R.curve.push(...cp(x, 1 / x, 0.008), 1, 1, mixc([1, 0.9, 0.7], COL.ice, bp)); }
    R.curve.cut().end();
    const aPt = sstep(6.25, 6.45, lt), b = bAt(lt), ok = b >= BS, X = Xb(b), fl = lt >= 7.5 ? Math.exp(-(lt - 7.5) / 0.25) : 0;
    R.path.begin();
    if (aPt > 0 && b > WT.B_LO + 1e-3) R.path.push(...cp(Xb(WT.B_LO), Y, 0.009), 1, 0.8 * aPt, c).push(...cp(X, Y, 0.009), 1, 0.8 * aPt, c).cut();
    R.path.end();
    if (aPt > 0) glows.push(...cp(X, Y, 0.012), 1.4 + 2.2 * fl + 0.3 * Math.sin(lt * 14) * (ok ? 0 : 1), aPt, ok ? COL.cyan : COL.red);
    glows.end();
    // additive light on lamp-lit paper washes to white: keep the fills faint until the page turns dark (blueprint)
    FU.uA.value = aC; FU.uS.value = ok ? 0.25 + 0.5 * fl : 0; FU.uK.value = lerp(0.35, 1.6, bp);
    FX.bloom = lerp(0.55, 0.9, bp); FX.vig = 0.65;
    FX.flash = Math.max(FX.flash, 0.08 * fl);
    st = { b, a: aPt, ok, X };
  };

  s.draw = (lt) => {
    const { b, a, ok, X } = st;
    const f1 = sstep(4.0, 4.4, lt) * (1 - sstep(5.9, 6.1, lt));
    eqBar('s^3 + \\beta s^2 + a_1 s + a_0 = 0', { reveal: invLerp(4.0, 4.7, lt), alpha: f1 });
    eqBar('\\rm{Maxwell:} \\;\\; bc > ad \\quad \\Leftrightarrow \\quad \\beta\\, a_1 > a_0', { line2: true, alpha: f1 * sstep(5.0, 5.4, lt) });
    const f2 = sstep(6.1, 6.5, lt);
    eqBar('X = \\beta / a_0^{1/3}, \\quad Y = a_1 / a_0^{2/3} \\quad \\Rightarrow \\quad XY > 1', { reveal: invLerp(6.1, 6.9, lt), alpha: f2 });
    if (a > 0) eqBar(`\\beta = ${b.toFixed(2)}, \\quad XY = ${(X * Y).toFixed(2)} \\quad ${ok ? '\\c{c}{\\rm{stable}}' : '\\c{r}{\\rm{hunting}}'}`, { line2: true, alpha: f2 * a });
    // labels on the chart (projected, crisp on the UI layer)
    const aL = sstep(5.9, 6.4, lt);
    const lab = (p, str, o) => { const q = toScreen(...p); if (q.vis) text(ui, str, q.x, q.y, { font: FONT.math, size: 26, style: 'italic', color: thc('hi', 0.9 * aL), ...o }); };
    if (aL > 0) {
      lab(cp(RG + 0.12, -0.05), 'X'); lab(cp(-0.16, RG + 0.06), 'Y');
      lab(cp(1.7, 1 / 1.7 + 0.12), 'XY = 1', { size: 22 });
      lab(cp(1.35, 1.9), 'STABLE', { font: FONT.mono, style: 'normal', size: 14, color: `rgba(90,210,255,${0.9 * aL})` });
      lab(cp(0.22, 0.35), 'HUNTS', { font: FONT.mono, style: 'normal', size: 14, color: `rgba(255,110,100,${0.9 * aL})` });
    }
    if (a > 0) { const q = toScreen(...cp(X, Y)); drawTex(ui, `\\rm{Watt}, \\; \\beta = ${b.toFixed(2)}`, q.x + 18, q.y - 16, { size: 20, color: css(ok ? COL.cyan : COL.red), alpha: a }); }
    const rows = ['WATT GOVERNOR', `a1   ${a1.toFixed(2)}`, `a0   ${a0.toFixed(2)}`, `β    ${b.toFixed(2)}  FRICTION`, `βa1 − a0   ${fmt(b * a1 - a0, 1)}`, ok ? '$\\c{c}{\\rm{STABLE}}' : '$\\c{r}{\\rm{HUNTING}}'];
    panel(ui, W - 330, H - LB - 190, rows, { alpha: a, size: 13, lh: 24 });
  };
})();
