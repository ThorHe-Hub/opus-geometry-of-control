// Act III · Apollo per-frame: the LM descends; the 3σ shell sits on the filter's estimate and collapses at each fix ·
// dust from 40 ft · contact light at 11.0 s · the radio log is the Apollo 11 air-to-ground of the last seconds.
(() => {
  const { s, LM, shell, R, glows, dust, DUST, earth } = AP;
  const OFF = [[0, [4.2, 2.6, 5.6]], [5, [3.4, 1.2, 4.8]], [11, [2.6, 0.35, 4.2]], [12.5, [2.4, 0.3, 4.0]]];
  const offAt = (lt) => { let i = 0; while (i < OFF.length - 2 && lt > OFF[i + 1][0]) i++; const [t0, a] = OFF[i], [t1, b] = OFF[i + 1], u = E.inOutSine(clamp((lt - t0) / (t1 - t0))); return a.map((v, j) => lerp(v, b[j], u)); };
  const REF = 0.9, FT = A3.FT, SIG = [];
  for (let k = 0; k <= 250; k++) SIG.push([k / 20, 3 * A3.sigma(A3.kAt(k / 20).P) * 4]);
  const LOG = [[0.3, 'EAGLE', '100 FEET, 3 1/2 DOWN, 9 FORWARD'], [A3.tAlt(75), 'EAGLE', '75 FEET, THINGS LOOKING GOOD'], [3.3, 'CAPCOM', '60 SECONDS'],
    [A3.tAlt(40), 'EAGLE', '40 FEET, DOWN 2 1/2, PICKING UP SOME DUST'], [8.2, 'CAPCOM', '30 SECONDS'], [11.0, 'EAGLE', 'CONTACT LIGHT'], [11.6, 'EAGLE', 'HOUSTON, TRANQUILITY BASE HERE']];
  const _v = new THREE.Vector3(), mat = new THREE.Matrix4();
  let st = null;

  s.update = (lt) => {
    const tp = A3.truePos(lt), td = lt >= A3.T_TD, o = offAt(lt), bump = td ? 0.04 * Math.exp(-(lt - A3.T_TD) / 0.12) : 0;
    camera.fov = 40; camera.far = 600;
    camera.position.set(tp[0] + o[0], tp[1] + o[1] - bump, tp[2] + o[2]);
    camera.up.set(0, 1, 0); camera.lookAt(tp[0], tp[1] + 0.9, tp[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    LM.position.set(...tp); LM.rotation.z = -0.05 * (1 - clamp(lt / A3.T_TD));
    // the filter's belief: 3σ ellipsoid on the estimate x̂ = x + e
    const { P, e } = A3.kAt(lt), ref = [tp[0], tp[1] + REF, tp[2]], est = ref.map((v, j) => v + e[j]);
    const { values: lam, vectors: Q } = M.eigSym(P), ax = lam.map((l) => 3 * Math.sqrt(Math.max(l, 1e-6)));
    mat.set(Q[0][0] * ax[0], Q[0][1] * ax[1], Q[0][2] * ax[2], est[0], Q[1][0] * ax[0], Q[1][1] * ax[1], Q[1][2] * ax[2], est[1], Q[2][0] * ax[0], Q[2][1] * ax[1], Q[2][2] * ax[2], est[2], 0, 0, 0, 1);
    shell.matrix.copy(mat); shell.matrixWorldNeedsUpdate = true;
    const aE = sstep(0.4, 1.0, lt);
    shell.material.uniforms.uOpacity.value = 0.8 * aE; R.rings.u.uOpacity.value = aE;
    R.rings.begin();
    const ring = (f) => { for (let k = 0; k <= 32; k++) { _v.set(...f((k / 32) * TAU)).applyMatrix4(mat); R.rings.push(_v.x, _v.y, _v.z, 1, 0.7); } R.rings.cut(); };
    [-0.5, 0, 0.5].forEach((v) => { const q = Math.sqrt(1 - v * v); ring((a) => [q * Math.cos(a), v, q * Math.sin(a)]); });
    [0, PI / 3, (2 * PI) / 3].forEach((b) => ring((a) => [Math.cos(b) * Math.sin(a), Math.cos(a), Math.sin(b) * Math.sin(a)]));
    R.rings.end();
    glows.begin();
    glows.push(...est, 1.0, aE, COL.cyan);
    const fl = A3.FIX.reduce((m, [t]) => Math.max(m, lt >= t ? Math.exp(-(lt - t) / 0.2) : 0), 0);
    glows.push(...ref, 0.8 + 2.2 * fl, aE * (0.5 + 0.5 * fl), WHITE3);
    // the fixes: radar and sighting beams, bright for half a second
    R.beams.begin();
    A3.FIX.forEach(([t, list]) => {
      const a = lt >= t ? Math.exp(-(lt - t) / 0.35) : 0;
      if (a < 0.02) return;
      list.forEach(([h]) => {
        const d = [-h[0], -Math.abs(h[1]), -h[2]], L = d[1] < -0.05 ? Math.min(9, (tp[1] + 0.3) / -d[1]) : 9, end = [ref[0] + d[0] * L, ref[1] + d[1] * L, ref[2] + d[2] * L];
        R.beams.push(ref[0], ref[1] - 0.3, ref[2], 1, a).push(...end, 1, a * 0.4).cut();
        glows.push(...end, 1, a, [1, 0.9, 0.7]);
      });
    });
    R.beams.end();
    R.link.begin();
    if (aE > 0) R.link.push(...est, 1, 0.6 * aE).push(...ref, 1, 0.6 * aE).cut();
    R.link.end();
    // the descent engine, off at contact; the dust it raises below 40 ft
    if (!td) glows.push(tp[0], tp[1] + 0.05, tp[2], 2.2 + 0.2 * noise1(lt * 30), 0.55 + 0.1 * noise1(lt * 17), [1, 0.62, 0.3]);
    glows.end();
    const t40 = A3.tAlt(40), aD = sstep(t40, A3.T_TD, lt) * (1 - sstep(A3.T_TD + 0.2, A3.T_TD + 1.5, lt));
    dust.begin();
    if (aD > 0) for (const [ang, sp, ph, sz] of DUST) {
      const age = fract(ph + lt * 0.9), rr = 0.4 + sp * age * 2.2;
      dust.push(tp[0] + rr * Math.cos(ang), 0.03 + 0.12 * age, tp[2] + rr * Math.sin(ang), sz * (1 + 2 * age), aD * 0.25 * (1 - age));
    }
    dust.end();
    // Earth hangs high to the right of the view direction
    _v.set(tp[0] - camera.position.x, 0, tp[2] - camera.position.z).normalize();
    const c = Math.cos(0.35), sn = Math.sin(0.35), hx = _v.x * c - _v.z * sn, hz = _v.x * sn + _v.z * c, el = 0.09;
    earth.position.set(camera.position.x + 200 * Math.cos(el) * hx, camera.position.y + 200 * Math.sin(el), camera.position.z + 200 * Math.cos(el) * hz);
    FX.bloom = 0.95; FX.vig = 0.7;
    FX.flash = Math.max(0.06 * fl, td ? 0.1 * Math.exp(-(lt - A3.T_TD) / 0.2) : 0);
    st = { tp, P, est, ax, td };
  };

  s.draw = (lt) => {
    const { tp, P, est, ax, td } = st, sg = 3 * A3.sigma(P) * 4, fixed = A3.FIX.filter(([t]) => lt >= t).length;
    eqBar('\\hat x^- = \\hat x, \\quad P^- = P + Q', { reveal: invLerp(0.6, 1.3, lt), alpha: sstep(0.6, 1.0, lt) * (1 - sstep(2.4, 2.65, lt)) });
    eqBar('K = P^- h^{\\top} / (h P^- h^{\\top} + r), \\quad P = (I - K h)\\, P^-', { reveal: invLerp(2.65, 3.4, lt), alpha: sstep(2.65, 3.0, lt) });
    eqBar(`3\\sigma = ${sg.toFixed(1)} \\; \\rm{m}, \\quad \\rm{fixes:} \\; ${fixed} / 4`, { line2: true, alpha: sstep(1.0, 1.4, lt), color: css(COL.cyan) });
    const q = toScreen(est[0], est[1] + Math.max(...ax) + 0.1, est[2]);
    if (q.vis) drawTex(ui, '3\\sigma', q.x + 10, q.y - 8, { size: 22, color: css(COL.cyan), alpha: sstep(0.8, 1.3, lt) * (1 - sstep(10.2, 10.8, lt)) });
    const aP = sstep(0.8, 1.4, lt);
    panel(ui, W - 330, H - LB - 160, ['PROG 66 · DESCENT', `ALT      ${Math.max(0, tp[1] * A3.FT).toFixed(0)} FT`, `3σ POS   ${sg.toFixed(1)} M`, `FIXES    ${fixed} / 4`, td ? '$\\c{c}{\\rm{CONTACT LIGHT}}' : 'ENGINE ARM · DES'], { alpha: aP, size: 13, lh: 24 });
    const m = plotPanel(ui, 110, H - LB - 168, 380, 104, { alpha: aP, x: [0, 12.5], y: [0, Math.max(...SIG.map((p) => p[1])) * 1.05], title: 'FILTER 3σ · METRES', xl: 't  s',
      series: [...A3.FIX.map(([t]) => ({ pts: [[t, 0], [t, 99]], color: thc('hud', 0.3), width: 1, dash: [3, 3] })), { pts: SIG.slice(0, Math.floor(lt * 20) + 1), color: css(COL.cyan), width: 1.8 }] });
    const shown = LOG.filter(([t]) => lt >= t).slice(-5);
    shown.forEach(([t, who, msg], i) => {
      const y = LB + 110 + i * 24, a = aP * sstep(t, t + 0.25, lt) * (i === shown.length - 1 ? 1 : 0.6);
      text(ui, who.padEnd(7), 96, y, { font: FONT.mono, size: 12, spacing: 1, color: who === 'CAPCOM' ? `rgba(120,210,255,${a})` : thc('hud', a) });
      text(ui, decode(msg, clamp((lt - t) / 0.5), lt), 170, y, { font: FONT.mono, size: 12, spacing: 1, color: thc('hi', a) });
    });
    if (fixed && lt < A3.FIX[fixed - 1][0] + 0.6) text(ui, 'FIX', m.sx(A3.FIX[fixed - 1][0]) + 4, m.sy(0) - 6, { font: FONT.mono, size: 10, color: thc('hud', 0.8 * aP) });
  };
})();
