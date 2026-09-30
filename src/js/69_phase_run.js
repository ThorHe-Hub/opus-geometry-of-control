// Act II · phase portraits per-frame: the tr–det map draws in, the point walks it, the portrait follows.
(() => {
  const { s, L, R, tdAt, TYPES, typeOf, flow, fill, RB, gL, gR, SEED, BOX, PS, tdL, wOf } = PH;
  const cam = new CamPath([{ t: 0, p: [0.6, 0.9, 13.8], l: [0, 0, 0], fov: 40 }, { t: 10, p: [-0.5, 0.5, 12.6], l: [0, 0.1, 0], fov: 40, e: 'lin' }]);
  const tcol = (k) => TYPES[k][2];
  let st = null;

  s.update = (lt) => {
    cam.apply(lt, 0.006, 68);
    const aA = sstep(0.3, 1.1, lt), ex = E.out(aA);
    // left: the trace–determinant plane
    RB.ax.begin();
    if (aA > 0) {
      ribArrow(RB.ax, tdL(-3.4 * ex, 0), tdL(3.4 * ex, 0), 0.14, 1, aA);
      ribArrow(RB.ax, tdL(0, -2.4 * ex), tdL(0, 3.1 * ex), 0.14, 1, aA);
    }
    RB.ax.end();
    const aP = sstep(0.8, 1.6, lt);
    RB.par.begin();
    for (let i = 0; i <= 120 && aP > 0; i++) { const tr = lerp(-3.4, 3.4, i / 120), d = tr * tr / 4; if (d < 3.0) RB.par.push(...tdL(tr, d, 0.01), 1, aP); else RB.par.cut(); }
    RB.par.cut();
    RB.par.push(...tdL(0, 0, 0.012), 1.4, aP * 0.9, COL.ice).push(...tdL(0, 3.0, 0.012), 1.4, aP * 0.9, COL.ice).cut(); // the centre line
    RB.par.end();
    fill.material.uniforms.uO.value = aP;
    const [tr, det] = tdAt(lt), ty = typeOf(tr, det), c = tcol(ty), aT = sstep(1.0, 1.5, lt);
    RB.trail.begin(); gL.begin();
    for (let k = 24; k >= 0; k--) { const [a, b] = tdAt(Math.max(0, lt - k * 0.05)); RB.trail.push(...tdL(a, b, 0.02), 1 - k / 26, aT * (1 - k / 24), tcol(typeOf(a, b))); }
    RB.trail.cut().end();
    gL.push(...tdL(tr, det, 0.03), 1.4, aT, c).end();
    // right: the portrait of A(tr, det)
    RB.frame.begin();
    if (aA > 0) {
      const b = BOX * PS;
      RB.frame.push(-b, -b, 0, 1, 0.5 * aA).push(b, -b, 0, 1, 0.5 * aA).push(b, b, 0, 1, 0.5 * aA).push(-b, b, 0, 1, 0.5 * aA).push(-b, -b, 0, 1, 0.5 * aA).cut();
      RB.frame.push(-b, 0, 0, 1, 0.3 * aA).push(b, 0, 0, 1, 0.3 * aA).cut().push(0, -b, 0, 1, 0.3 * aA).push(0, b, 0, 1, 0.3 * aA).cut();
    }
    RB.frame.end();
    const aS = sstep(1.2, 1.8, lt), inBox = (y) => Math.max(Math.abs(y[0]), Math.abs(y[1])) < BOX * 1.02;
    RB.str.begin();
    for (const [x0, y0, ph] of SEED) {
      const age = ((lt * 0.8 + ph * 1.6) % 1.6), li = Math.sin((PI * age) / 1.6);
      for (let k = 0; k <= 5; k++) {
        const y = flow(tr, det, Math.max(0, age - k * 0.07), [x0, y0]);
        if (!inBox(y)) break;
        RB.str.push(y[0] * PS, y[1] * PS, 0, 1 - k / 7, aS * li * 0.55 * (1 - k / 6), c);
      }
      RB.str.cut();
    }
    RB.str.end();
    RB.hero.begin(); gR.begin();
    for (let i = 0; i < 4; i++) {
      const a0 = PI / 4 + (i * PI) / 2, r0 = 0.7 + 0.3 * i, x0 = [r0 * Math.cos(a0), r0 * Math.sin(a0)]; // distinct orbits (a centre's are nested)
      for (let k = 0; k <= 160; k++) {
        const y = flow(tr, det, lerp(-2.4, 2.4, k / 160), x0);
        if (inBox(y)) RB.hero.push(y[0] * PS, y[1] * PS, 0.01, 1, 0.85 * aS); else RB.hero.cut();
      }
      RB.hero.cut();
      const yh = flow(tr, det, ((lt * 0.9 + i * 0.6) % 4.8) - 2.4, x0);
      if (inBox(yh)) gR.push(yh[0] * PS, yh[1] * PS, 0.02, 1, aS, WHITE3);
    }
    RB.hero.end(); gR.end();
    const D = tr * tr / 4 - det;
    RB.eig.begin();
    if (D > 0.02) [1, -1].forEach((sg) => {
      const l = Math.hypot(1, Math.sqrt(D)), d = [1 / l, (sg * Math.sqrt(D)) / l], lam = tr / 2 + sg * Math.sqrt(D), b = BOX * PS * 1.3;
      RB.eig.push(-d[0] * b, -d[1] * b, 0.005, 1, 0.8 * aS, lam > 0 ? COL.red : COL.cyan).push(d[0] * b, d[1] * b, 0.005, 1, 0.8 * aS, lam > 0 ? COL.red : COL.cyan).cut();
    });
    RB.eig.end();
    FX.bloom = 0.95;
    st = { tr, det, ty, D };
  };

  s.draw = (lt) => {
    const { tr, det, ty, D } = st, [zh, en, c] = TYPES[ty], a = sstep(1.0, 1.5, lt);
    eqBar('\\lambda^2 - \\rm{tr}(A)\\,\\lambda + \\det(A) = 0', { reveal: invLerp(0.6, 1.3, lt), alpha: sstep(0.6, 1.0, lt) });
    const lam = D < 0 ? `${fmt(tr / 2)} \\pm ${Math.sqrt(-D).toFixed(2)}j` : `${fmt(tr / 2 + Math.sqrt(D))}, \\; ${fmt(tr / 2 - Math.sqrt(D))}`;
    eqBar(`\\rm{tr} = ${fmt(tr)}, \\quad \\det = ${fmt(det)}, \\quad \\lambda = ${lam}`, { line2: true, alpha: a });
    // region names on the map; the current one lights up
    [['ss', -2.2, 2.5], ['us', 2.2, 2.5], ['sn', -2.8, 0.9], ['un', 2.8, 0.9], ['sa', 1.6, -1.6], ['ce', 0.05, 2.85]].forEach(([k, x, y]) => {
      const p = wOf(L, tdL(x, y)), on = k === ty, al = sstep(1.4, 2.0, lt) * (on ? 1 : 0.4), cc = TYPES[k][2];
      text(ui, TYPES[k][0], p.x, p.y, { font: FONT.zh, size: 17, spacing: 2, align: 'center', color: css(on ? cc : COL.ice, al) });
      text(ui, TYPES[k][1], p.x, p.y + 16, { font: FONT.mono, size: 10, spacing: 1, align: 'center', color: css(on ? cc : COL.ice, 0.8 * al) });
    });
    const q = wOf(L, tdL(3.45, 0)), qd = wOf(L, tdL(0.2, 3.15));
    text(ui, 'tr', q.x + 8, q.y + 6, { font: FONT.math, size: 24, style: 'italic', color: thc('hi', sstep(0.8, 1.3, lt)) });
    text(ui, 'det', qd.x, qd.y, { font: FONT.math, size: 24, style: 'italic', color: thc('hi', sstep(0.8, 1.3, lt)) });
    // the portrait's name, re-decoded whenever the point crosses into a new region
    let since = 1;
    for (let k = 1; k <= 30; k++) { const [a2, b2] = tdAt(lt - k * 0.02); if (typeOf(a2, b2) !== ty) { since = (k * 0.02) / 0.45; break; } }
    const pc = wOf(R, [0, -BOX * PS - 0.45, 0]);
    text(ui, decode(zh, clamp(since), lt), pc.x, pc.y, { font: FONT.zh, size: 30, weight: 600, spacing: 10, align: 'center', color: css(c, 0.95 * a) });
    text(ui, en, pc.x, pc.y + 30, { font: FONT.title, size: 13, spacing: 6, align: 'center', color: css(c, 0.8 * a * clamp(since)) });
    const pm = wOf(R, [BOX * PS + 0.25, BOX * PS, 0]);
    panel(ui, pm.x + 20, pm.y + 20, ['A(tr, det)', `${fmt(tr / 2)}  +1.00`, `${fmt(D)}  ${fmt(tr / 2)}`], { alpha: a, size: 13, lh: 22 });
  };
})();
