// Act II · Watt per-frame: close on the balls · chapter card · wide · load step 2.5 s absorbed ·
// friction drops at 5 s and the governor hunts (balls glow red as the swing grows, puffs of steam).
(() => {
  const { s, LA, YH, R, arms, links, balls, sleeve, lever, push, disc, P, VX, VY, SX, SY, steam, dust, STEAM, DUST } = WT;
  const cam = new CamPath([
    { t: 0, p: [3.03, 2.92, 3.25], l: [1.13, 2.35, -0.56], fov: 34 }, // spindle at x ≈ 440 px: the balls' orbit stays clear of the chapter card
    { t: 2.3, p: [3.0, 2.85, 3.55], l: [1.1, 2.3, -0.45], fov: 34 }, // hold the framing until the card has gone
    { t: 3.6, p: [2.6, 2.4, 4.6], l: [0.6, 1.9, 0], fov: 36 },
    { t: 5.0, p: [4.0, 2.3, 6.6], l: [1.0, 1.55, 0], fov: 38 },
    { t: 7.6, p: [2.6, 2.25, 5.2], l: [0.5, 1.8, 0], fov: 36 },
    { t: 10, p: [1.9, 2.4, 4.2], l: [0.3, 2.0, 0], fov: 35, e: 'lin' },
  ]);
  const hot = new Glow(2, { size: 0.9, world: true, intensity: 1.6, core: 0.4 });
  R.add(hot.pts);
  const TRACE = [];
  for (let k = 0; k <= 300; k++) TRACE.push([k / 30, 100 * (WT.at(k / 30).w - 1)]);
  const yLo = Math.min(...TRACE.map((p) => p[1])) - 0.6, yHi = Math.max(...TRACE.map((p) => p[1])) + 0.6;
  const LOC = [];
  for (let i = 0; i <= 60; i++) LOC.push(WT.poles(lerp(WT.B_HI, WT.B_LO, i / 60)));
  const HP = WT.poles(WT.B_LO)[0];
  let st = null;

  s.update = (lt) => {
    const hunt = clamp((lt - WT.T_HUNT) / 4);
    cam.apply(lt, 0.008 + 0.02 * hunt, 17);
    const q = WT.at(lt), sp = Math.sin(q.phi), cp = Math.cos(q.phi), yc = YH - 1.2 * LA * cp;
    R.rotation.y = -q.th;
    const swing = lt >= WT.T_HUNT ? clamp(Math.abs(q.phi - WT.PHI0) / WT.SWING) : 0;
    hot.begin();
    [1, -1].forEach((j, k) => {
      const B = [j * LA * sp, YH - LA * cp, 0], Mp = [j * 0.6 * LA * sp, YH - 0.6 * LA * cp, 0];
      rodBetween(arms[k], [0, YH, 0], B, 0.028); balls[k].position.set(...B);
      rodBetween(links[k], Mp, [j * 0.09, yc, 0], 0.022);
      hot.push(...B, 1, 0.9 * swing, COL.red);
    });
    hot.end();
    sleeve.position.set(0, yc, 0);
    const F = [0.12, yc, 0], Ep = [2 * P[0] - F[0], 2 * P[1] - F[1], 0];
    rodBetween(lever, F, Ep, 0.03);
    rodBetween(push, Ep, [VX, VY + 0.2, 0], 0.022);
    disc.rotation.z = lerp(PI / 2, 0, q.v);
    // steam leaves the stack at the throttle opening of 0.15 s earlier: steady plume, then puffs while hunting
    steam.begin();
    for (const [tb, rx, rz, rs] of STEAM) {
      const age = lt - tb;
      if (age < 0 || age > 2.2) continue;
      const a = WT.at(tb - 0.15).v * (1 - age / 2.2) * sstep(0, 0.2, age) * 0.1;
      if (a > 0.004) steam.push(SX + rx * 0.1 + 0.25 * age + 0.15 * noise1(tb * 3 + age), SY + 0.1 + 0.75 * age, rz * 0.15 + 0.12 * noise1(tb * 5 + age + 9), 0.5 + 1.1 * age * (0.7 + rs), a);
    }
    steam.end();
    dust.begin();
    for (const [x, y, z, ph, k] of DUST) dust.push(x + 0.2 * Math.sin(lt * 0.2 * k + ph), y + 0.15 * Math.sin(lt * 0.15 + ph * 2), z, k, 0.22 * k);
    dust.end();
    FX.bloom = 0.85; FX.vig = 0.7;
    FX.exposure = 1 - 0.45 * win(lt, 0.1, 2.95, 0.4, 0.6); // the picture steps back behind the chapter card
    st = { q, yc };
  };

  s.draw = (lt) => {
    const { q, yc } = st, huntOn = lt >= WT.T_HUNT;
    chapterCard(fx, lt, 'II', '状态空间', 'STATE SPACE', 2.9);
    // period annotations while the shot is wide and calm
    const aL = win(lt, 3.0, 4.9, 0.4, 0.4);
    if (aL > 0) [[[0, yc, 0], 'the sleeve', -150, 60], [[VX, VY, 0], 'throttle valve', 70, 60], [[SX, SY + 0.1, 0], 'steam', 60, -50], [[0, YH, 0], 'fly-ball governor', -160, -40]].forEach(([p, str, dx, dy]) => {
      const sp = toScreen(...p);
      if (!sp.vis) return;
      fx.strokeStyle = thc('hud', 0.55 * aL); fx.lineWidth = 1.2; fx.beginPath(); fx.moveTo(sp.x, sp.y); fx.lineTo(sp.x + dx, sp.y + dy); fx.stroke();
      text(ui, str, sp.x + dx + (dx < 0 ? -8 : 8), sp.y + dy + 7, { font: FONT.fell, style: 'italic', size: 25, align: dx < 0 ? 'right' : 'left', color: thc('hi', 0.9 * aL) });
    });
    const f1 = sstep(3.0, 3.4, lt) * (1 - sstep(4.8, 5.0, lt));
    eqBar('\\ddot\\phi = \\Omega^2 \\sin\\phi\\cos\\phi - (g/l)\\sin\\phi - \\beta\\,\\dot\\phi', { reveal: invLerp(3.0, 3.9, lt), alpha: f1 });
    eqBar(`\\dot\\omega = \\kappa\\,(v(\\phi) - L), \\quad \\beta = ${WT.B_HI.toFixed(1)}`, { line2: true, alpha: f1 * sstep(3.5, 3.9, lt) });
    const f2 = sstep(5.0, 5.4, lt);
    eqBar(`s^3 + ${WT.B_LO.toFixed(1)}s^2 + ${WT.a1.toFixed(1)}s + ${WT.a0.toFixed(1)} = 0`, { reveal: invLerp(5.0, 5.8, lt), alpha: f2 });
    eqBar(`s = \\c{r}{${fmt(HP[0])} \\pm ${Math.abs(HP[1]).toFixed(2)}j} \\quad \\Rightarrow \\quad \\rm{Re}\\,s > 0 : \\rm{hunting}`, { line2: true, alpha: f2 * sstep(5.6, 6.0, lt) });
    // HUD: s-plane, poles, state, the speed record
    const aP = sstep(3.0, 3.6, lt);
    const b = lerp(WT.B_HI, WT.B_LO, E.inOut(clamp((lt - WT.T_HUNT) / 0.6))), poles = WT.poles(b), ki = Math.round(60 * invLerp(WT.B_HI, WT.B_LO, b));
    const trail = [];
    for (let i = 0; i <= ki; i++) trail.push(...LOC[i]);
    splane(ui, 96, LB + 64, 300, 190, { alpha: aP, re: [-3.4, 1.6], im: 6.4, poles, trail, title: 's-PLANE · LINEARISED', note: `β = ${b.toFixed(2)}` });
    panel(ui, W - 330, LB + 92, ['LINEARISED POLES', ...poleRows(poles)], { alpha: aP, size: 13, lh: 22 });
    const rows = [`φ    ${((q.phi * 180) / PI).toFixed(1)}°`, `Ω    ${(WT.spd * q.w).toFixed(2)} rad/s`, `v    ${q.v.toFixed(2)}  THROTTLE`, `L    ${WT.load(lt).toFixed(2)}  LOAD`, `β    ${WT.beta(lt).toFixed(1)}  FRICTION`];
    panel(ui, W - 330, H - LB - 190, [...rows, huntOn ? '$\\c{r}{\\rm{HUNTING}}' : 'REGULATING'], { alpha: aP, size: 13, lh: 24 });
    const n = Math.min(TRACE.length, Math.floor(lt * 30) + 1), y0 = H - LB - 168;
    const m = plotPanel(ui, 110, y0, 380, 104, {
      alpha: aP, x: [0, 10], y: [yLo, yHi], gridY: [0], title: 'ENGINE SPEED · DEVIATION %', xl: 't  s',
      series: [
        { pts: [[WT.T_LOAD, yLo], [WT.T_LOAD, yHi]], color: thc('hud', 0.4), width: 1, dash: [3, 3] },
        { pts: [[WT.T_HUNT, yLo], [WT.T_HUNT, yHi]], color: 'rgba(255,90,80,0.55)', width: 1, dash: [3, 3] },
        { pts: TRACE.slice(0, n), color: css(COL.gold), width: 1.8 },
      ],
      dots: [[...TRACE[n - 1], '#fff']],
    });
    text(ui, 'LOAD', m.sx(WT.T_LOAD) + 5, y0 + 14, { font: FONT.mono, size: 10, color: thc('hud', 0.6 * aP) });
    text(ui, 'LESS FRICTION', m.sx(WT.T_HUNT) + 5, y0 + 14, { font: FONT.mono, size: 10, color: `rgba(255,120,110,${0.75 * aP})` });
  };
  s.hud = { chapter: ACT[2], scene: '离心调速器 · 比例反馈', anchor: 'JAMES WATT · 1788' };
})();
