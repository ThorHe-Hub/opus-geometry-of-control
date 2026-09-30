// Act III · Black per-frame: chapter card over the dateline · the pen draws the loop in the margin (2.6–4.9) ·
// 5.0 the loop lifts off the page and pulses circle it; μ wanders, G = μ/(1+μβ) stays put.
(() => {
  const { s, wp, PU, drawInk, R, PATH_F, PATH_B, circ, box, SX, SY, MX0, MX1, FY, glows } = BK;
  const cam = new CamPath([
    { t: 0, p: [0, 1.84, 0.25], l: [0, 0, -1.3], fov: 38 }, // card over the paper's top margin, dateline below it
    { t: 2.3, p: [-0.1, 1.8, 0.33], l: [-0.12, 0, -1.2], fov: 38 },
    { t: 3.3, p: [-1.05, 1.73, 2.01], l: [-1.05, 0, 0.66], fov: 36 },
    { t: 4.9, p: [-1.0, 1.56, 1.79], l: [-1.0, 0, 0.7], fov: 36 },
    { t: 5.7, p: [-0.4, 1.8, 2.66], l: [-1.0, 0.2, 0.7], fov: 38 }, // pulled back before the loop has risen far
    { t: 7.5, p: [-0.2, 2.1, 3.2], l: [-1.0, 0.2, 0.6], fov: 40, e: 'lin' },
  ]);
  const toW = (pts, h) => pts.map(([x, y]) => wp(x, y, h));
  const denseW = (pts, h, n = 12) => { const P = toW(pts, h), out = []; for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < n; k++) out.push(P[i].map((v, j) => lerp(v, P[i + 1][j], k / n))); out.push(P[P.length - 1]); return out; };
  const along = (P, f) => { const i = Math.min(P.length - 2, Math.floor(f * (P.length - 1))), u = f * (P.length - 1) - i; return P[i].map((v, j) => lerp(v, P[i + 1][j], u)); };
  let last = -1, nib = null, st = { mu: 1000 };

  s.update = (lt) => {
    cam.apply(lt, 0.006, 73);
    const tp = Math.min(lt, 5.0);
    if (tp !== last) { nib = drawInk(tp); last = tp; }
    const k = sstep(2.3, 3.3, lt);
    PU.uLamp.value.set(lerp(0.5, 0.3, k), lerp(0.8, 0.3, k));
    const h = 0.35 * E.out(clamp((lt - 5.15) / 0.9)), aL = sstep(4.95, 5.3, lt); // the ink lights up, then lifts
    R.fwd.begin(); R.fb.begin(); glows.begin();
    if (nib && lt < 5) glows.push(...wp(nib[0], nib[1], 0.01), 1.1, 0.9, [1, 0.85, 0.6]);
    if (aL > 0) {
      const pl = (rb, pts) => { toW(pts, h).forEach((p) => rb.push(...p, 1, aL)); rb.cut(); };
      pl(R.fwd, PATH_F); pl(R.fwd, circ(SX, SY, 30)); pl(R.fwd, box(MX0, SY - 55, MX1, SY + 55));
      pl(R.fb, PATH_B); pl(R.fb, box(390, FY - 42, 510, FY + 42));
      // signal pulses: strong along the forward path, small after Σ (the error is small), cyan around the loop
      const PF = denseW(PATH_F, h + 0.01), PB = denseW(PATH_B, h + 0.01), ap = sstep(5.5, 5.9, lt);
      for (let i = 0; i < 6; i++) {
        const f = fract(i / 6 + lt * 0.35), p = along(PF, f), err = f > 0.3 && f < 0.45;
        glows.push(...p, err ? 0.6 : 1.1, ap, err ? [1, 0.85, 0.6] : [1, 0.75, 0.4]);
      }
      for (let i = 0; i < 4; i++) glows.push(...along(PB, fract(i / 4 + lt * 0.35)), 0.9, ap, COL.cyan);
    }
    R.fwd.end(); R.fb.end(); glows.end();
    FX.exposure = 1 - 0.45 * win(lt, 0.1, 2.95, 0.4, 0.6);
    FX.bloom = 0.7 + 0.25 * aL; FX.vig = 0.7;
    FX.flash = Math.max(FX.flash, lt >= 4.9 ? 0.12 * Math.exp(-(lt - 4.9) / 0.25) : 0);
    st = { mu: A3.mu(lt * 1.8) };
  };

  s.draw = (lt) => {
    const mu = st.mu, Gc = A3.gainCL(mu);
    chapterCard(fx, lt, 'III', '反馈', 'FEEDBACK', 2.9);
    const f1 = sstep(3.0, 3.4, lt);
    eqBar('G = \\mu / (1 + \\mu\\beta) \\;\\approx\\; 1/\\beta', { reveal: invLerp(3.0, 3.8, lt), alpha: f1 });
    eqBar(`\\mu = ${mu.toFixed(0)}, \\quad \\beta = ${A3.BETA}, \\quad G = ${Gc.toFixed(3)}`, { line2: true, alpha: f1 * sstep(5.0, 5.4, lt) });
    const aP = sstep(5.2, 5.8, lt);
    panel(ui, W - 330, H - LB - 160, [`OPEN LOOP   μ   ${mu.toFixed(0)}`, `CLOSED      G   ${Gc.toFixed(3)}`, `1/β             ${(1 / A3.BETA).toFixed(3)}`, `LOOP GAIN   μβ  ${(mu * A3.BETA).toFixed(0)}`, 'GAIN TRADED FOR STABILITY'], { alpha: aP, size: 13, lh: 24 });
    const tr1 = [], tr2 = [];
    for (let i = 0; i <= 80; i++) { const tt = lt - 4 + (i / 80) * 4; tr1.push([tt, A3.mu(tt * 1.8) / A3.MU0]); tr2.push([tt, A3.gainCL(A3.mu(tt * 1.8)) * A3.BETA]); }
    plotPanel(ui, 110, H - LB - 168, 380, 104, {
      alpha: aP, x: [lt - 4, lt], y: [0.35, 1.65], gridY: [1], title: 'μ/1000 · OPEN (AMBER)    Gβ · CLOSED (CYAN)', xl: 't  s',
      series: [{ pts: tr1, color: css(COL.amber), width: 1.6 }, { pts: tr2, color: css(COL.cyan), width: 2 }],
    });
  };
})();
