// Act III · Pontryagin per-frame: the families and Γ draw in · a cloud of states, each switching once on Γ ·
// 5.0 the hero from rest at x = 4: u = −1, the switch at (2, −2) on the brass stab (6.875), u = +1, rest at 8.75.
(() => {
  const { s, pp, VT, R, FAN, cart, glows, grid, GOLD, HERO } = PT;
  const cam = new CamPath([{ t: 0, p: [1.0, 0, 10.4], l: [1.0, 0, 0], fov: 40 }, { t: 10, p: [0.9, 0.1, 9.9], l: [0.9, 0, 0], fov: 40, e: 'lin' }]);
  const T_H = 5.0, SC = (8.75 - T_H) / (HERO.t1 + HERO.t2); // film seconds per physical second for the hero
  const uCol = (u) => (u < 0 ? GOLD : u > 0 ? COL.cyan : WHITE3);
  let st = null;

  s.update = (lt) => {
    cam.apply(lt, 0.005, 77);
    const aF = sstep(0.4, 1.4, lt);
    grid.material.uniforms.uOpacity.value = aF; R.ax.u.uOpacity.value = aF;
    R.fam.u.uOpacity.value = 0.9 * sstep(0.8, 1.8, lt) * (1 - 0.4 * sstep(4.8, 5.4, lt));
    R.gam.u.uOpacity.value = sstep(1.2, 1.9, lt); R.track.u.uOpacity.value = sstep(4.6, 5.2, lt);
    // the cloud: every state on its own minimum-time path (film clock ×1.6), fading before the hero
    const aC = sstep(1.6, 2.2, lt) * (1 - sstep(4.6, 5.3, lt)), ft = Math.max(0, lt - 1.8) * 1.6;
    R.fan.begin(); glows.begin();
    if (aC > 0) for (const p of FAN) {
      for (let k = 0; k <= 5; k++) { const q = A3.stateAt(p, Math.max(0, ft - k * 0.09)); R.fan.push(...pp(q[0], q[1], 0.006), 1 - k / 7, 0.5 * aC * (1 - k / 6), uCol(q[2])); }
      R.fan.cut();
      const q = A3.stateAt(p, ft), sw = ft - p.t1;
      glows.push(...pp(q[0], q[1], 0.01), sw > 0 && sw < 0.3 ? 1.6 : 0.7, aC * (q[2] === 0 ? 0.3 : 0.9), sw > 0 && sw < 0.3 ? WHITE3 : uCol(q[2]));
    }
    R.fan.end();
    // the hero
    const th = Math.max(0, (lt - T_H) / SC), q = A3.stateAt(HERO, th), aH = sstep(4.9, 5.2, lt);
    R.hero.begin();
    if (aH > 0) { for (let k = 0; k <= 70; k++) { const qq = A3.stateAt(HERO, (k / 70) * th); R.hero.push(...pp(qq[0], qq[1], 0.012), 1, aH, uCol(qq[2])); } R.hero.cut(); }
    R.hero.end();
    const tS = T_H + HERO.t1 * SC, tA = 8.75, fS = lt >= tS ? Math.exp(-(lt - tS) / 0.3) : 0, fA = lt >= tA ? Math.exp(-(lt - tA) / 0.4) : 0;
    if (aH > 0) glows.push(...pp(q[0], q[1], 0.02), 1.5 + 2.5 * fS + 2 * fA, aH, fS > 0.3 ? WHITE3 : uCol(q[2]));
    glows.push(0, 0, 0.02, 1 + 1.5 * fA, 0.5 * aF + 0.5 * fA, WHITE3);
    // the plant itself: a cart on a rail below the plane, thrusting against u
    cart.begin(); R.drop.begin();
    if (aH > 0) {
      const cx = q[0], y0 = VT, w = 0.28, hh = 0.2;
      [[-w, 0], [w, 0], [w, hh], [-w, hh], [-w, 0]].forEach(([dx, dy]) => cart.push(...pp(cx + dx, y0 - 0.08 + dy, 0.01), 1, aH));
      cart.cut();
      [-0.16, 0.16].forEach((o) => { for (let k = 0; k <= 12; k++) cart.push(...pp(cx + o + 0.05 * Math.cos((k / 12) * TAU), y0 - 0.1 + 0.05 * Math.sin((k / 12) * TAU), 0.01), 1, aH); cart.cut(); });
      if (q[2] !== 0) for (let k = 0; k < 4; k++) glows.push(...pp(cx - q[2] * (w + 0.1 + 0.14 * k + 0.05 * noise1(lt * 20 + k)), y0 + 0.02, 0.012), 1.1 - 0.2 * k, 0.8 * aH, [1, 0.7 - 0.1 * k, 0.35]);
      R.drop.push(...pp(q[0], q[1], 0.008), 1, 0.5 * aH).push(...pp(cx, y0 + 0.12, 0.008), 1, 0.5 * aH).cut();
    }
    cart.end(); R.drop.end(); glows.end();
    FX.bloom = 0.9 + 0.5 * fS + 0.5 * fA; FX.flash = 0.02 * (fS + fA);
    st = { th, q, aH, tS };
  };

  s.draw = (lt) => {
    const { th, q, aH, tS } = st, f1 = sstep(0.6, 1.0, lt) * (1 - sstep(4.8, 5.0, lt)), f2 = sstep(5.0, 5.4, lt);
    eqBar('\\ddot x = u, \\quad |u| \\le 1, \\qquad \\min T', { reveal: invLerp(0.6, 1.3, lt), alpha: f1 });
    eqBar('u^* = -\\,\\rm{sgn}\\,\\lambda_2, \\quad \\lambda_2 \\;\\rm{linear in}\\; t \\;\\Rightarrow\\; \\rm{at most one switch}', { line2: true, alpha: f1 * sstep(1.4, 1.8, lt) });
    eqBar('\\Gamma : \\; x = -\\,v|v| / 2', { reveal: invLerp(5.0, 5.6, lt), alpha: f2 });
    eqBar(`x = ${fmt(q[0])}, \\quad v = ${fmt(q[1])}, \\quad u = ${q[2] > 0 ? '+1' : q[2] < 0 ? '-1' : '0'}`, { line2: true, alpha: f2, color: css(uCol(q[2])) });
    const lab = (p, src, o) => { const z = toScreen(...p); if (z.vis) drawTex(ui, src, z.x, z.y, { size: 24, alpha: sstep(1.2, 1.9, lt), ...o }); };
    lab(pp(-2.9, 2.1), '\\Gamma', { size: 30, color: 'rgb(255,242,215)' });
    lab(pp(1.6, 1.5), 'u = -1', { color: css(GOLD) }); lab(pp(-2.5, -1.2), 'u = +1', { color: css(COL.cyan) });
    lab(pp(4.75, 0.12), 'x', { size: 26 }); lab(pp(0.12, 2.6), 'v', { size: 26 });
    const T = HERO.t1 + HERO.t2, n = Math.round(clamp(th / T) * 120), U = [], X = [], V = [];
    for (let k = 0; k <= n; k++) { const tk = (k / 120) * T, z = A3.stateAt(HERO, tk); U.push([tk, z[2]]); X.push([tk, z[0] / 4]); V.push([tk, z[1] / 2]); }
    const m = plotPanel(ui, W - 440, LB + 96, 340, 110, {
      alpha: aH, x: [0, T], y: [-1.3, 1.3], gridY: [-1, 0, 1], title: 'u(t) · BANG-BANG     x/4, v/2', xl: 't  s',
      series: [{ pts: X, color: thc('hud', 0.55), width: 1 }, { pts: V, color: thc('lo', 0.55), width: 1 }, { pts: U, color: css(COL.amber), width: 2.2 }],
    });
    if (aH > 0 && lt >= tS) text(ui, 'SWITCH', m.sx(HERO.t1) + 4, m.sy(1.15), { font: FONT.mono, size: 10, color: thc('hud', 0.8 * aH) });
    const done = lt >= 8.75;
    panel(ui, W - 330, H - LB - 160, [`x    ${fmt(q[0], 3)}`, `v    ${fmt(q[1], 3)}`, `u    ${q[2] > 0 ? '+1' : q[2] < 0 ? '−1' : ' 0'}   FULL ${q[2] ? 'THRUST' : 'STOP'}`, `t    ${th.toFixed(2)} / ${T.toFixed(2)} s`,
      done ? '$\\c{c}{T^* = 4.00 \\;\\; \\rm{AT REST}}' : lt >= tS ? 'SWITCHED ONCE ON Γ' : 'FULL THRUST'], { alpha: aH, size: 13, lh: 24 });
  };
})();
