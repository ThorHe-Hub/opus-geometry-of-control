// Act I · terrain per-frame: rise 0.25–1.35 · knife 1.1–1.5 · the right half dissolves 1.5–2.0 · side view ·
// the cursor rides |H(jω)| with the chirp (1.5–4.7, resonance at 3.1) while the Bode trace draws on the UI layer.
(() => {
  const { s, S, EXT, hOf, U, knife, face, R, glows } = TR;
  const cam = new CamPath([
    { t: 0, p: [6.8, 6.0, 7.2], l: [-0.4, 0.5, -0.8], fov: 40 },
    { t: 1.2, p: [5.6, 4.4, 6.0], l: [-0.3, 0.9, -0.9], fov: 40 },
    { t: 1.5, p: [5.4, 3.7, 4.8], l: [-0.2, 0.9, -1.0], fov: 40 },
    { t: 2.7, p: [7.4, 1.35, -1.9], l: [0, 1.0, -2.0], fov: 38 },
    { t: 5.0, p: [6.8, 1.2, -2.6], l: [0, 0.95, -2.5], fov: 37, e: 'lin' },
  ]);
  const W0 = EXT / S, L10 = Math.log10, dB = (w) => 20 * L10(TR.H(0, w)), dBr = dB(TR.wr);
  let st = { wc: 0, ac: 0, res: 0, cur: null };

  s.update = (lt) => {
    cam.apply(lt, 0.012, 53);
    const rise = E.outBack(clamp((lt - 0.25) / 1.1)), kn = E.in(clamp((lt - 1.1) / 0.4)), yb = lerp(3.4, -0.05, kn);
    U.uRise.value = rise; U.uDis.value = 1.05 * clamp((lt - 1.5) / 0.5);
    face.visible = lt >= 1.4;
    U.uRHP.value = 0.35 * sstep(0.2, 0.8, lt) * (1 - sstep(1.4, 1.6, lt));
    U.uCam.value.copy(camera.position);
    const aK = sstep(1.05, 1.2, lt) * (1 - sstep(1.5, 1.75, lt));
    knife.visible = aK > 0; knife.position.set(0, yb + 1.2, 0); knife.material.uniforms.uO.value = 0.45 * aK;
    R.edge.begin();
    if (aK > 0) R.edge.push(0, yb, -EXT, 1, aK).push(0, yb, EXT, 1, aK).cut();
    R.edge.end();
    // the exposed edge σ = 0, revealed wherever the blade has passed; ω > 0 is the Bode half
    const on = lt >= TR.T_CUT, wc = on ? TR.wAt(lt) : 0;
    R.prof.begin();
    if (lt > 1.1) for (let i = 0; i <= 400; i++) {
      const w = lerp(-W0, W0, i / 400), y = rise * hOf(0, w), traced = on && w >= 0 && w <= wc;
      R.prof.push(0.02, y + 0.015, -w * S, traced ? 1.35 : 1, sstep(yb, yb + 0.12, y) * (w < 0 ? 0.4 : traced ? 1 : 0.7));
    }
    R.prof.cut().end();
    const ac = on ? sstep(TR.T_CUT, TR.T_CUT + 0.25, lt) * (1 - sstep(3.4, 3.95, wc)) : 0;
    const res = lt >= TR.T_RES ? Math.exp(-(lt - TR.T_RES) / 0.35) : 0.5 * sstep(TR.T_RES - 0.35, TR.T_RES, lt);
    const cur = [0.02, rise * hOf(0, wc) + 0.03, -wc * S];
    R.drop.begin(); glows.begin();
    if (ac > 0) {
      R.drop.push(...cur, 1, 0.7 * ac).push(cur[0], 0.012, cur[2], 1, 0.7 * ac).cut();
      glows.push(...cur, 1.3 + 2.4 * res, ac, mixc(COL.gold, WHITE3, 0.4 + 0.6 * res));
    }
    // the peaks are the poles; the resonance point stays marked once the cursor has passed it
    [TR.P[1], -TR.P[1]].forEach((w) => glows.push(TR.P[0] * S, rise * hOf(TR.P[0] + 0.03, w) + 0.06, -w * S, 1.1, sstep(0.9, 1.4, lt), COL.ice));
    if (lt >= TR.T_RES) glows.push(0.02, hOf(0, TR.wr) + 0.03, -TR.wr * S, 0.9, 0.9, COL.gold);
    R.drop.end(); glows.end();
    st = { wc, ac, res, cur };
    FX.bloom = 0.95 + 0.5 * res;
    FX.flash = Math.max(0.85 * Math.exp(-lt / 0.14), lt >= 1.5 ? 0.28 * Math.exp(-(lt - 1.5) / 0.1) : 0);
  };

  s.draw = (lt) => {
    const { wc, ac, cur } = st, on = lt >= TR.T_CUT;
    const lab = (x, y, z, str, o) => { const p = toScreen(x, y, z); if (p.vis) text(fx, str, p.x, p.y, o); };
    const mo = { font: FONT.math, size: 28, style: 'italic', color: 'rgb(215,235,250)' };
    lab(EXT + 0.4, 0.06, 0, 'σ', { ...mo, alpha: sstep(0.3, 0.9, lt) * (1 - sstep(1.6, 2.2, lt)) });
    lab(0.2, 0.06, -EXT - 0.45, 'jω', { ...mo, alpha: sstep(0.3, 0.9, lt) });
    const f1 = sstep(0.4, 0.8, lt) * (1 - sstep(1.35, 1.5, lt));
    eqBar('|H(s)| = \\omega_n^2 \\,/\\, (|s - p|\\,|s - \\bar p|)', { reveal: invLerp(0.4, 1.2, lt), alpha: f1 });
    eqBar(`p = ${fmtc(TR.P[0], TR.P[1])}, \\quad \\zeta = ${TR.zeta.toFixed(3)}, \\quad \\omega_n = ${TR.wn.toFixed(2)}`, { line2: true, alpha: f1 * sstep(0.8, 1.1, lt) });
    const f2 = sstep(1.5, 1.85, lt), atRes = lt >= TR.T_RES - 0.05 && lt < TR.T_RES + 0.9;
    eqBar('|H(j\\omega)| = |H(s)|_{\\,\\sigma = 0}', { reveal: invLerp(1.5, 2.1, lt), alpha: f2 });
    if (on) eqBar(atRes ? `\\omega_r = ${TR.wr.toFixed(2)}, \\quad M_r = ${fmt(dBr, 1)} \\; \\rm{dB}` : `\\omega = ${wc.toFixed(2)} \\; \\rm{rad/s}, \\quad |H| = ${fmt(dB(wc), 1)} \\; \\rm{dB}`,
      { line2: true, alpha: f2, color: atRes ? css(COL.gold) : undefined });
    const aR = win(lt, TR.T_RES - 0.05, TR.T_END, 0.1, 0.4);
    if (aR > 0) { const p = toScreen(0.02, hOf(0, TR.wr) + 0.03, -TR.wr * S); drawTex(ui, '\\omega_r', p.x + 20, p.y - 20, { size: 30, color: css(COL.gold), alpha: aR, glow: 10, glowColor: 'rgba(255,200,120,0.6)' }); }
    // Bode magnitude: the same sweep, on log axes
    const aB = sstep(1.7, 2.2, lt), x0 = W - 520, y0 = LB + 120, w = 420, h = 150;
    if (aB <= 0) return;
    const u1 = on ? clamp((lt - TR.T_CUT) / (TR.T_END - TR.T_CUT)) : 0, n = Math.max(1, Math.round(160 * u1)), tr = [];
    for (let k = 0; k <= n; k++) { const ww = TR.wr * Math.pow(16, (k / n) * u1 - 0.5); tr.push([L10(ww), dB(ww)]); }
    const past = lt >= TR.T_RES;
    const m = plotPanel(ui, x0, y0, w, h, {
      alpha: aB, x: [-0.4, 1.1], y: [-30, 15], gridX: [0.5, 1, 2, 5, 10].map(L10), gridY: [-20, -10, 0, 10],
      title: past ? `BODE MAGNITUDE · PEAK ${fmt(dBr, 1)} dB @ ${TR.wr.toFixed(2)} rad/s` : 'BODE MAGNITUDE · dB',
      series: [
        { pts: [[-0.4, 0], [L10(TR.wn), 0], [1.1, -40 * (1.1 - L10(TR.wn))]], color: thc('hud', 0.45), width: 1, dash: [4, 4] },
        { pts: tr, color: css(COL.gold), width: 2 },
      ],
      dots: [...(past ? [[L10(TR.wr), dBr, css(COL.gold)]] : []), [...tr[tr.length - 1], '#fff']],
    });
    [0.5, 1, 2, 5, 10].forEach((v) => text(ui, String(v), m.sx(L10(v)), y0 + h + 15, { font: FONT.mono, size: 11, align: 'center', color: thc('hud', 0.6 * aB) }));
    text(ui, 'rad/s', x0 + w, y0 + h + 30, { font: FONT.mono, size: 11, align: 'right', color: thc('hud', 0.5 * aB) });
    [10, 0, -10, -20].forEach((v) => text(ui, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), x0 + 5, m.sy(v) - 3, { font: FONT.mono, size: 10, color: thc('hud', 0.45 * aB) }));
  };
})();
