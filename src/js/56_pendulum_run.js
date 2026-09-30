// Act III · pendulum per-frame: fall → freeze → rewind → CATCH → disturbances; then the funnel (57).
(() => {
  const { s, P, cart, pen, wheels, R, glows, WARM } = PD;
  const TRAIL_W = WARM.map((v) => v * 0.85);
  const cam = new CamPath([
    { t: 0, p: [0.8, 2.3, 10.2], l: [0, 1.9, 0], fov: 40 },
    { t: 3.1, p: [1.6, 1.8, 7.9], l: [0.3, 1.6, 0], fov: 40, e: 'in' },
    { t: 4.3, p: [-1.6, 1.4, 7.6], l: [0.3, 1.6, 0], fov: 38 },
    { t: 5.0, p: [-1.2, 1.6, 8.2], l: [0, 1.7, 0], fov: 38, e: 'lin' },
    { t: 5.6, p: [0.4, 2.6, 11.6], l: [0, 1.7, 0], fov: 40, e: 'out' },
    { t: 8.6, p: [2.2, 2.2, 10.4], l: [0, 1.6, 0], fov: 40 },
    { t: 12.5, p: [-2.4, 2.8, 11.2], l: [0, 1.8, 0], fov: 40, e: 'lin' },
  ]);
  const tipOf = (x) => { const th = x[2]; return [x[0] + CP.l * Math.sin(th), 0.42 + CP.l * Math.cos(th), 0]; };
  let cur = null;

  PD.updatePend = (lt) => {
    const st = PD.state(lt), x = st.x;
    cur = st;
    const fx0 = PD.camX(lt);
    cam.apply(lt, st.ph === 'closed' ? 0.02 + 0.12 * Math.exp(-(lt - PEND.catch) / 0.35) : 0.015, 46, [fx0, 0, 0]);
    cart.position.x = x[0];
    pen.rotation.z = -x[2];
    pen.tint(mixc(WARM, COL.cyan, st.ph === 'closed' ? E.out(clamp((lt - PEND.catch) / 0.35)) : 0));
    wheels.forEach((w) => { w.rotation.y = x[0] / 0.08; });
    // tip trail from the (baked) past
    R.trail.begin();
    const aT = st.ph === 'rest' ? 0 : 1;
    for (let k = 0; k <= 40; k++) {
      const tau = (k / 40) * 0.9, sp = PD.state(Math.max(0, lt - tau)), p = tipOf(sp.x);
      R.trail.push(...p, 1 - k / 44, aT * Math.pow(1 - k / 40, 1.6), sp.ph === 'closed' ? COL.cyan : TRAIL_W);
    }
    R.trail.cut().end();
    // control force arrow on the cart
    R.force.begin();
    if (st.ph === 'closed' && Math.abs(st.F) > 0.5) {
      const L = clamp(st.F / 45, -2.2, 2.2), y = 0.25, x0 = x[0] + Math.sign(L) * 0.5;
      ribArrow(R.force, [x0, y, 0.35], [x0 + L, y, 0.35], 0.16, 1, clamp(Math.abs(L)));
    }
    R.force.end();
    // disturbance shock rings at the tip
    R.kick.begin(); glows.begin();
    const tp = tipOf(x);
    PEND.kicks.forEach((k, i) => {
      const d = lt - k;
      if (d < 0 || d > 0.9) return;
      const rr = 0.15 + 1.6 * E.out(d / 0.9), a = 1 - d / 0.9;
      R.kick.curve((u) => [tp[0] + rr * Math.cos(u * TAU), tp[1] + rr * Math.sin(u * TAU), 0], 48, 1, a);
      const dir = i % 2 ? -1 : 1;
      ribArrow(R.kick, [tp[0] - dir * 1.4, tp[1] + 0.3, 0], [tp[0] - dir * 0.25, tp[1] + 0.05, 0], 0.16, 1.2, a);
    });
    glows.push(x[0], 0.42, 0, 1.2, 1, WARM);
    glows.push(...tp, st.ph === 'fall' || st.ph === 'freeze' ? 1.6 : 1.1, 0.9, st.ph === 'closed' ? COL.cyan : COL.red);
    R.kick.end(); glows.end();

    FX.bloom = 0.9;
    if (st.ph === 'fall') FX.ca = 0.005 + 0.01 * invLerp(1.5, PEND.freeze, lt);
    if (st.ph === 'freeze') { FX.sat = 0.25; FX.grain = 0.09; FX.scan = 0.4; FX.flash = 0.25 * Math.exp(-(lt - PEND.freeze) / 0.1); }
    if (st.ph === 'rewind') { FX.sat = 0.35; FX.ca = 0.022; FX.scan = 0.7; FX.grain = 0.1; }
    if (st.ph === 'hold') { FX.sat = 0.5; FX.exposure = 0.85; FX.vig = 0.8; }
    if (st.ph === 'closed') {
      const d = lt - PEND.catch;
      FX.flash = 0.7 * Math.exp(-d / 0.12);
      FX.bloom = 0.9 + 0.8 * Math.exp(-d / 0.6);
      FX.sat = lerp(0.5, 1, clamp(d / 0.3));
    }
    FX.flash = Math.max(FX.flash, 0.9 * sstep(12.2, PEND.funnel, lt));
  };

  // s-plane inset: open-loop poles and their path to the LQR closed-loop poles.
  function locusInset(g, lt, st) {
    const x0 = 96, y0 = LB + 64, w = 320, h = 190, a = sstep(0.3, 1.0, lt);
    const sx = (v) => x0 + ((clamp(v, -4.2, 3) + 4.2) / 7.2) * w, sy = (v) => y0 + h / 2 - (v / 2.4) * (h / 2);
    g.globalAlpha = a;
    g.strokeStyle = thc('hud', 0.35); g.lineWidth = 1;
    g.strokeRect(x0, y0, w, h);
    g.beginPath(); g.moveTo(x0, sy(0)); g.lineTo(x0 + w, sy(0)); g.moveTo(sx(0), y0); g.lineTo(sx(0), y0 + h); g.stroke();
    g.fillStyle = 'rgba(255,60,60,0.07)'; g.fillRect(sx(0), y0, x0 + w - sx(0), h);
    g.globalAlpha = 1;
    text(g, 's-PLANE · eig(A − kBK)', x0 + 8, y0 - 10, { font: FONT.mono, size: 12, spacing: 1.5, color: thc('hud', 0.8 * a) });
    const k = st.ph === 'closed' ? E.inOut(clamp((lt - PEND.catch) / 0.7)) : 0, ki = Math.round(k * 160);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (let i = 0; i <= ki; i += 2) PD.LOCUS[i].forEach(([re, im]) => { g.fillStyle = thc('hud', 0.45 * a); g.fillRect(sx(re) - 1, sy(im) - 1, 2, 2); });
    PD.LOCUS[ki].forEach(([re, im]) => {
      const unstable = re > 1e-6, c = unstable ? COL.red : COL.cyan, X = sx(re), Y = sy(im), d = 6;
      g.strokeStyle = css(c, a); g.lineWidth = 2;
      g.beginPath(); g.moveTo(X - d, Y - d); g.lineTo(X + d, Y + d); g.moveTo(X - d, Y + d); g.lineTo(X + d, Y - d); g.stroke();
      if (re < -4.2) text(g, `< ${re.toFixed(1)}`, x0 + 8, Y - 10, { font: FONT.mono, size: 11, color: css(c, a) });
    });
    g.restore();
    text(g, `k = ${k.toFixed(2)}`, x0 + w - 8, y0 + h - 10, { font: FONT.mono, size: 12, align: 'right', color: thc('hud', 0.8 * a) });
  }

  PD.drawPend = (lt) => {
    const st = cur || PD.state(lt), x = st.x, fy = LB + 96, K = CP.K[0];
    locusInset(ui, lt, st);
    const aOL = sstep(0.4, 1.0, lt) * (1 - sstep(PEND.rew1 - 0.2, PEND.rew1, lt));
    eqBar('\\lambda = +\\sqrt{\\frac{(M+m)g}{Ml}} = \\c{r}{+2.00}', { reveal: invLerp(0.4, 1.8, lt), alpha: aOL });
    eqBar('u = 0 : \\rm{open loop}', { line2: true, alpha: aOL * sstep(1.2, 1.8, lt) });
    // The control law itself, large, in the empty left half of the picture at the moment of the catch.
    const aU = sstep(PEND.rew1, PEND.rew1 + 0.2, lt) * (1 - sstep(8.0, 8.6, lt)), hit = Math.exp(-Math.max(0, lt - PEND.catch) / 0.4);
    const uSize = Math.round(88 + 18 * (lt >= PEND.catch ? hit : 0)), uCol = lt < PEND.catch ? thc('hi') : css(mixc(COL.cyan, COL.white, hit));
    drawTex(fx, 'u = -Kx', 190, H / 2 + 30, { size: uSize, color: uCol, alpha: 0.55 * aU }); // bloom halo
    drawTex(ui, 'u = -Kx', 190, H / 2 + 30, { size: uSize, color: uCol, alpha: aU });       // crisp glyphs
    const aK = sstep(PEND.catch - 0.05, PEND.catch + 0.3, lt);
    eqBar(`K = \\mat{${K.map((v) => v.toFixed(1)).join(' & ')}}`, { size: 26, alpha: aK });
    eqBar('A^{\\top}P + PA - PBR^{-1}B^{\\top}P + Q = 0', { line2: true, alpha: aK * sstep(PEND.catch + 0.4, PEND.catch + 1, lt) });
    const rows = [
      `x    ${fmt(x[0], 3)} m`, `v    ${fmt(x[1], 3)} m/s`, `θ    ${fmt(x[2], 3)} rad`, `ω    ${fmt(x[3], 3)} rad/s`,
      `u    ${fmt(st.F, 1)} N`, st.ph === 'closed' ? 'LOOP CLOSED · LQR' : 'LOOP OPEN · u = 0',
    ];
    panel(ui, W - 330, H - LB - 190, rows, { alpha: sstep(0.5, 1.2, lt), size: 13, lh: 24 });
    const poles = st.ph === 'closed' ? CP.clPoles : CP.olPoles;
    panel(ui, W - 330, LB + 92, [st.ph === 'closed' ? 'CLOSED-LOOP POLES' : 'OPEN-LOOP POLES', ...poleRows(poles)], { alpha: sstep(0.5, 1.2, lt), size: 13, lh: 22 });
  };

  s.update = (lt) => {
    const f = lt >= PEND.funnel;
    PD.P.visible = !f; PD.F.visible = f;
    if (f) PD.updateFunnel(lt); else PD.updatePend(lt);
  };
  s.draw = (lt) => (lt >= PEND.funnel ? PD.drawFunnel(lt) : PD.drawPend(lt));
})();
