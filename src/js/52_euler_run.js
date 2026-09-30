// Act I · per-frame geometry and typography for the Euler → Laplace shot.
(() => {
  const { s, plane, K, R, glows, POLES } = EU;
  const TGT = [K.SIG * K.S, K.OM * K.S, 0];
  const pt = new Float32Array((K.NT + 1) * 3);
  let state = {};

  s.update = (lt) => {
    EU.cam.apply(lt, 0.015, 21);
    plane.rotation.x = -PI / 2 * E.inOut(clamp((lt - 12.9) / 1.7));
    plane.updateMatrixWorld(true);
    const aAx = sstep(1.8, 3.0, lt), pre = 1 - sstep(11.7, 12.3, lt), sp = sstep(13.4, 14.4, lt);
    const ph = lt >= K.TPH ? K.OM * (lt - K.TPH) : 0, aPh = sstep(K.TPH - 0.3, K.TPH + 0.2, lt) * pre;
    const sg = K.SIG * s5(9.5, 11.5, lt), hist = clamp(lt - 5.6, 0, K.TV), aSh = sstep(6.4, 7.6, lt) * pre;
    const aTr = sstep(K.TPH - 0.3, K.TPH + 0.2, lt) * (1 - sstep(12.75, 12.95, lt)); // trail survives its own collapse
    const rOf = (a) => K.R * Math.exp(sg * (hist - a));
    const head = [rOf(0) * Math.cos(ph), rOf(0) * Math.sin(ph), 0];
    state = { aAx, pre, sp, ph, sg, hist, aSh, head };

    // axes + ticks (value-plane ticks at ±R; s-plane ticks every unit of σ, ω)
    R.axes.begin();
    const ax = 3.6 * E.out(aAx);
    if (ax > 0.01) {
      ribArrow(R.axes, [-ax, 0, 0], [ax, 0, 0], 0.16, 1, 1);
      ribArrow(R.axes, [0, -ax, 0], [0, ax, 0], 0.16, 1, 1);
      [-1, 1].forEach((k) => {
        R.axes.push(k * K.R, -0.08, 0, 1, pre).push(k * K.R, 0.08, 0, 1, pre).cut();
        R.axes.push(-0.08, k * K.R, 0, 1, pre).push(0.08, k * K.R, 0, 1, pre).cut();
      });
      [-2, -1, 1, 2].forEach((k) => {
        R.axes.push(k * K.S, -0.07, 0, 0.8, sp).push(k * K.S, 0.07, 0, 0.8, sp).cut();
        R.axes.push(-0.07, k * K.S, 0, 0.8, sp).push(0.07, k * K.S, 0, 0.8, sp).cut();
      });
    }
    R.axes.end();
    const aC = sstep(2.2, 3.2, lt);
    R.circle.begin();
    if (aC > 0 && pre > 0) R.circle.curve((u) => [K.R * Math.cos(u * TAU * aC), K.R * Math.sin(u * TAU * aC), 0], 200, 1, 0.75 * pre);
    R.circle.end();

    // helix trail with collapse into the point s = σ + jω
    const n = Math.max(2, Math.round((K.NT * hist) / K.TV)), col = clamp((lt - 11.8) / 1.05);
    R.trail.begin(); R.cos.begin(); R.sin.begin(); R.tAxis.begin();
    let arrived = 0;
    if (hist > 0.05 && lt < 12.9) {
      for (let i = 0; i <= n; i++) {
        const q = i / n, a = q * hist, r = rOf(a), th = ph - K.OM * a;
        let x = r * Math.cos(th), y = r * Math.sin(th), z = -a * K.V, w = 1;
        pt[3 * i] = x; pt[3 * i + 1] = y; pt[3 * i + 2] = z;
        if (col > 0) {
          const pr = E.inOut(clamp((lt - 11.8 - 0.55 * q) / 0.5));
          if (pr >= 1) arrived++;
          x = lerp(x, TGT[0], pr); y = lerp(y, TGT[1], pr); z = lerp(z, TGT[2], pr) + 0.7 * Math.sin(PI * pr);
          w = lerp(1, 0.35, pr);
        }
        const fadeTail = sstep(1, 0.8, q) * 0.8 + 0.2;
        R.trail.push(x, y, z, w, fadeTail * aTr);
        R.cos.push(pt[3 * i], K.FY, pt[3 * i + 2], 1, aSh * fadeTail, COL.white);
        R.sin.push(K.WX, pt[3 * i + 1], pt[3 * i + 2], 1, aSh * fadeTail, COL.white);
      }
      R.tAxis.push(0, 0, 0.6, 1, 0.8 * aSh).push(0, 0, -hist * K.V - 0.6, 1, 0.8 * aSh).cut();
    }
    R.trail.cut().end(); R.cos.cut().end(); R.sin.cut().end(); R.tAxis.end();
    state.arrived = col > 0 ? arrived / (n + 1) : 0;

    // phasor and projections
    R.phasor.begin(); R.dash.begin(); glows.begin();
    if (aPh > 0.001) {
      R.phasor.push(0, 0, 0, 1, aPh).push(...head, 1, aPh).cut();
      R.dash.push(...head, 1, 0.8 * aPh, COL.gold).push(head[0], 0, 0, 1, 0.8 * aPh, COL.gold).cut();
      R.dash.push(...head, 1, 0.8 * aPh, COL.cyan).push(0, head[1], 0, 1, 0.8 * aPh, COL.cyan).cut();
      if (aSh > 0) {
        R.dash.push(...head, 1, 0.6 * aSh, COL.gold).push(head[0], K.FY, 0, 1, 0.6 * aSh, COL.gold).cut();
        R.dash.push(...head, 1, 0.6 * aSh, COL.cyan).push(K.WX, head[1], 0, 1, 0.6 * aSh, COL.cyan).cut();
      }
      glows.push(...head, 1.6, aPh, COL.white);
      glows.push(head[0], 0, 0, 0.8, aPh, COL.gold).push(0, head[1], 0, 0.8, aPh, COL.cyan);
    }
    if (col > 0 && lt < 13.4) glows.push(...TGT, 0.8 + 3.5 * state.arrived, sstep(11.9, 12.3, lt), COL.ice);
    R.phasor.end(); R.dash.end();

    // poles and their impulse responses
    R.marks.begin(); R.glyph.begin();
    POLES.forEach((p) => { if (lt >= p.t) { EU.poleMark(p, lt); EU.glyphAt(p, lt); } });
    R.marks.end(); R.glyph.end(); glows.end();

    EU.grid.material.uniforms.uOpacity.value = 0.85 * sstep(1.8, 3.2, lt);
    EU.floorG.material.uniforms.uOpacity.value = EU.wallG.material.uniforms.uOpacity.value = sstep(6.6, 7.8, lt) * pre;
    EU.floorG.visible = EU.wallG.visible = lt < 12.4;
    EU.tintL.material.uniforms.uO.value = 0.3 * sstep(14.0, 15.2, lt);
    EU.tintR.material.uniforms.uO.value = sstep(14.0, 15.2, lt) * (0.26 + 0.3 * sstep(17.8, 20, lt));

    FX.bloom = 0.95 + 0.25 * sstep(17.8, 20, lt);
    FX.ca = 0.005 + 0.01 * sstep(17.8, 20, lt);
    FX.flash = (lt > 12.85 ? 0.35 * Math.exp(-(lt - 12.85) / 0.15) : 0) + 0.85 * sstep(19.75, 20, lt);
  };

  s.draw = (lt) => {
    const { pre, sp, aSh, sg } = state;
    chapterCard(fx, lt, 'I', '虚数维度', 'THE IMAGINARY DIMENSION', 2.9);
    const lab = (x, y, z, str, o) => { const p = EU.W3(x, y, z); if (p.vis) text(fx, str, p.x, p.y, o); };
    const aV = sstep(2.0, 3.0, lt) * pre;
    if (aV > 0) {
      const o = { font: FONT.math, size: 26, color: 'rgb(200,225,245)', alpha: aV };
      lab(3.72, 0.16, 0, 'Re', o); lab(0.16, 3.72, 0, 'Im', o);
      lab(K.R + 0.06, -0.34, 0, '1', { ...o, size: 20 });
      lab(0.14, K.R + 0.12, 0, 'i', { ...o, size: 22, style: 'italic' });
    }
    if (sp > 0) {
      const o = { font: FONT.math, size: 30, style: 'italic', color: 'rgb(215,235,250)', alpha: sp };
      lab(3.72, 0.22, 0, 'σ', o); lab(-0.12, 3.98, 0, 'jω', { ...o, align: 'right' });
      [-2, -1, 1, 2].forEach((k) => lab(k * K.S, -0.34, 0, String(k).replace('-', '−'), { font: FONT.math, size: 18, align: 'center', color: 'rgb(170,200,225)', alpha: 0.75 * sp }));
      const rg = sstep(14.4, 15.4, lt) * (1 - sstep(18.6, 19.2, lt)), zo = { font: FONT.zh, size: 19, spacing: 5, align: 'center' }, yb = H - LB - 30;
      text(ui, '稳定 · STABLE', W / 2 - 330, yb, { ...zo, color: css(COL.cyan), alpha: 0.9 * rg });
      text(ui, '临界 · MARGINAL', W / 2, yb, { ...zo, color: 'rgb(235,240,250)', alpha: 0.75 * rg });
      text(ui, '失稳 · UNSTABLE', W / 2 + 330, yb, { ...zo, color: css(COL.red), alpha: 0.9 * rg });
    }
    if (aSh > 0.01) {
      lab(K.R + 0.4, K.FY, -5.2, 'cos ωt', { font: FONT.math, size: 24, style: 'italic', color: css(COL.gold), alpha: aSh });
      lab(K.WX, K.R + 0.5, -5.2, 'sin ωt', { font: FONT.math, size: 24, style: 'italic', color: css(COL.cyan), alpha: aSh });
      lab(0.25, 0.3, -state.hist * K.V - 0.5, 't', { font: FONT.math, size: 24, style: 'italic', color: 'rgb(200,225,245)', alpha: aSh });
    }
    [K.TPH + PI / K.OM, K.TPH + (3 * PI) / K.OM].forEach((tp) => {
      const a = win(lt, tp - 0.12, tp + 1.3, 0.12, 0.7);
      if (a > 0) { const p = EU.W3(-K.R, 0, 0); drawTex(fx, 'e^{i\\pi} = -1', p.x - 26, p.y - 34, { size: 30, align: 'right', color: css(COL.gold), alpha: a }); }
    });

    const f1 = sstep(3.6, 4.2, lt) * (1 - sstep(9.2, 9.5, lt));
    eqBar('e^{i\\omega t} = \\c{g}{\\cos\\omega t} + i\\,\\c{c}{\\sin\\omega t}', { reveal: invLerp(3.6, 5.2, lt), alpha: f1 });
    const f2 = sstep(9.6, 10.0, lt) * (1 - sstep(12.7, 13.0, lt));
    eqBar('e^{(\\sigma + i\\omega)t} = e^{\\sigma t}\\,(\\c{g}{\\cos\\omega t} + i\\,\\c{c}{\\sin\\omega t})', { reveal: invLerp(9.6, 11.0, lt), alpha: f2 });
    eqBar(`\\sigma = ${fmt(sg, 2)}, \\quad \\omega = ${K.OM.toFixed(2)}`, { line2: true, alpha: f2 });
    const f3 = sstep(13.1, 13.5, lt) * (1 - sstep(17.5, 17.8, lt));
    eqBar('e^{st} \\;\\mapsto\\; s = \\sigma + j\\omega', { reveal: invLerp(13.1, 14.2, lt), alpha: f3 });
    eqBar('h(t) = e^{\\sigma t} \\cos\\omega t', { line2: true, alpha: f3 * sstep(14.3, 14.9, lt) });
    const f4 = sstep(17.9, 18.3, lt);
    eqBar('s = \\c{r}{+2} \\quad \\Rightarrow \\quad h(t) = e^{\\c{r}{2t}} \\to \\infty', { reveal: invLerp(17.9, 18.9, lt), alpha: f4 });
    eqBar('\\rm{Re}\\,s > 0 : \\rm{unstable}', { line2: true, color: css(COL.red), alpha: f4 * sstep(18.6, 19.1, lt) });

    const shown = POLES.filter((p) => lt >= p.t + 0.25);
    if (shown.length && sp > 0) {
      const rows = shown.map((p) => (p.w ? `${fmt(p.s)} ± ${Math.abs(p.w).toFixed(2)}j` : `${fmt(p.s)}`).padEnd(16) + (p.s > 0.01 ? 'UNSTABLE' : p.s < -0.01 ? 'STABLE' : 'MARGINAL'));
      panel(ui, W - 330, LB + 92, ['$s = \\sigma \\pm j\\omega', ...rows], { alpha: 0.9 * sp, size: 13, lh: 25 });
    }
  };
})();
