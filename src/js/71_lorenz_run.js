// Act II · Lorenz per-frame: the ghost attractor draws in · two racers, one white while together · 5.0 the glitch:
// they part onto opposite wings (cyan / gold) · log|δ| climbs the Lyapunov slope, then saturates at the attractor.
(() => {
  const { s, W, T_GL, D0, TA, TB, at, sep, tauOf, TMAX, SEP, ghost, NG, R, glows } = LZ;
  const CA = [0.35, 0.85, 1.0], CB = [1.0, 0.72, 0.3], LY = 0.906; // the Lorenz system's largest Lyapunov exponent
  let st = { d: D0, tau: 0 };

  s.update = (lt) => {
    const a = 0.7 + lt * 0.12, rad = lerp(14.5, 16.5, sstep(6, 10, lt)); // far enough to keep both lobes in the 2.39 frame
    camera.fov = 40; camera.position.set(rad * Math.sin(a), 1.6 + 1.0 * Math.sin(lt * 0.3), rad * Math.cos(a));
    camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    ghost.geo.setDrawRange(0, Math.round(NG * sstep(0.2, 2.6, lt) / 6) * 6);
    ghost.u.uOpacity.value = 0.8 + 0.2 * sstep(4.6, 5.2, lt);
    const tau = tauOf(lt), d = sep(tau), apart = sstep(0.6, 3, d), aR = sstep(1.8, 2.4, lt);
    // trails span a fixed stretch of Lorenz time, so they keep one length whether the clock runs fast or slow
    [[R.a, TA, CA], [R.b, TB, CB]].forEach(([rb, T, c]) => {
      rb.begin();
      for (let k = 0; k <= 60; k++) rb.push(...W(at(T, Math.max(0, tau - k * 0.01))), 1 - k / 70, aR * (1 - k / 60), mixc(WHITE3, c, 0.25 + 0.75 * apart));
      rb.cut().end();
    });
    glows.begin();
    glows.push(...W(at(TA, tau)), 1.2 + 0.6 * (1 - apart), aR, mixc(WHITE3, CA, 0.3 + 0.7 * apart));
    glows.push(...W(at(TB, tau)), 1.2 + 0.6 * (1 - apart), aR, mixc(WHITE3, CB, 0.3 + 0.7 * apart));
    glows.end();
    FX.bloom = 1.0;
    const gl = lt >= T_GL ? Math.exp(-(lt - T_GL) / 0.12) : 0;
    FX.flash = 0.18 * gl; FX.ca = 0.005 + 0.03 * gl;
    st = { d, tau };
  };

  s.draw = (lt) => {
    const { d, tau } = st, aH = sstep(0.8, 1.2, lt);
    eqBar('\\dot x = \\sigma(y - x), \\quad \\dot y = x(\\rho - z) - y, \\quad \\dot z = xy - \\beta z', { reveal: invLerp(0.8, 1.8, lt), alpha: aH });
    eqBar(lt < T_GL ? '\\sigma = 10, \\quad \\rho = 28, \\quad \\beta = 8/3' : `|\\delta(t)| \\approx |\\delta_0|\\, e^{\\lambda t}, \\quad \\lambda \\approx ${LY}`, { line2: true, alpha: aH * sstep(1.6, 2.0, lt), color: lt >= T_GL ? css(COL.gold) : undefined });
    const aP = sstep(2.0, 2.6, lt), n = Math.max(1, Math.min(SEP.length, Math.round((tau / TMAX) * 400) + 1)), l0 = Math.log10(D0), x0 = 110, y0 = H - LB - 168;
    const m = plotPanel(ui, x0, y0, 380, 104, {
      alpha: aP, x: [0, TMAX], y: [-4.5, 2], gridY: [-4, -2, 0], title: 'SEPARATION |A − B| · log10', xl: 'LORENZ TIME',
      series: [
        { pts: [[0, l0], [TMAX, l0 + (LY * TMAX) / Math.LN10]], color: thc('hud', 0.45), width: 1, dash: [4, 4] },
        { pts: SEP.slice(0, n), color: css(COL.gold), width: 1.8 },
      ],
      dots: [[...SEP[n - 1], '#fff']],
    });
    text(ui, 'e^(λt)', m.sx(2), m.sy(l0 + (LY * 2) / Math.LN10) - 8, { font: FONT.mono, size: 10, color: thc('hud', 0.6 * aP) });
    const rows = ['delta0     0.000127', '(0.506127 → 0.506)', `|delta|    ${d < 0.01 ? d.toExponential(2) : d.toFixed(2)}`, `LYAPUNOV   ${LY}`, lt < T_GL ? 'TOGETHER' : '$\\c{r}{\\rm{APART}}'];
    panel(ui, W - 330, H - LB - 180, rows, { alpha: aP, size: 13, lh: 24 });
    if (lt > T_GL - 0.2) [[TA, 'A', CA], [TB, 'B', CB]].forEach(([T, nm, c]) => {
      const q = toScreen(...W(at(T, tau)));
      if (q.vis) text(ui, nm, q.x + 14, q.y - 12, { font: FONT.mono, size: 14, color: css(c, sstep(T_GL - 0.2, T_GL + 0.3, lt) * (1 - sstep(8.6, 9.6, lt))) });
    });
  };
})();
