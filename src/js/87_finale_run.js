// Finale per-frame: the star grows as e^{2t} · 2.5 s burst · 5.0 s u = −Kx: every particle snaps under PD control ·
// ≈ 8.4 s settled (t_s = 4/ζωₙ) · 13.5 s the pen stands on its cart · 14.4 the last line · fade to black.
(() => {
  const { s, NP, T_B, T_C, TY, TGT, E0, BB, P0, V0, HUE, pts, star, ring, core, pen, stick, rail, penAt } = FN;
  const cam = new CamPath([
    { t: 0, p: [0, 1.4, 9.0], l: [0, TY + 0.3, 0], fov: 40 }, { t: 4.6, p: [0, 1.3, 13.5], l: [0, TY, 0], fov: 40 },
    { t: 10, p: [0, 1.0, 13.0], l: [0, 0.75, 0], fov: 40 }, { t: 22.5, p: [0, 0.7, 12.0], l: [0, 0.55, 0], fov: 40, e: 'lin' },
  ]);
  const HOT = [[1, 1, 1], [1, 0.7, 0.35], [1, 0.3, 0.22]], ICE = [0.72, 0.9, 1.0], col = [0, 0, 0];
  let st = { err: 1 };

  s.update = (lt) => {
    if (!FN.isBuilt()) FN.build();
    const sh = lt >= T_B ? 0.08 * Math.exp(-(lt - T_B) / 0.4) : 0;
    cam.apply(lt, 0.004 + sh, 86);
    // the villain's last stand: e^{2t}
    const gr = lt < T_B ? Math.min(1, 0.006 * Math.exp(2 * lt)) : 0;
    star.visible = gr > 0; star.scale.setScalar(Math.max(1e-3, 0.9 * gr)); star.material.uniforms.uOpacity.value = gr > 0 ? 1 : 0;
    ring.begin();
    if (lt >= T_B && lt < T_B + 1.8) {
      const d = lt - T_B, rr = 0.5 + 7 * E.out(d / 1.8), a = 1 - d / 1.8, c = [0, TY + 0.4, 0];
      ring.curve((u) => [c[0] + rr * Math.cos(u * TAU), c[1] + rr * Math.sin(u * TAU), 0], 120, 1, a);
      ring.curve((u) => [c[0] + rr * Math.cos(u * TAU), c[1], rr * Math.sin(u * TAU)], 120, 1, 0.6 * a);
    }
    ring.end();
    core.begin();
    if (gr > 0) core.push(0, TY + 0.4, 0, 0.3 + 3 * gr, 1, mixc(COL.red, WHITE3, 0.3 * gr));
    if (lt >= T_B) core.push(0, TY + 0.4, 0, 6 * Math.exp(-(lt - T_B) / 0.25), 1, WHITE3);
    core.end();
    // the particles: hidden inside the star, ballistic with drag, then the PD closed loop from 5.0 s
    const on = lt >= T_C, tb = lt - T_B, eK = Math.exp(-0.9 * Math.max(0, tb)), tc = Math.max(0, lt - T_C), { ex, c, s: sn } = A4.pdBasis(tc);
    const cool = sstep(T_C, T_C + 1.0, lt), shim = sstep(9, 11, lt);
    let err = 0, ne = 0;
    pts.begin();
    if (lt >= T_B) for (let i = 0; i < NP; i++) {
      const o = i * 3, h = HOT[Math.floor(HUE[i] * 2.999)];
      let x, y, z, e = 0;
      if (!on) { x = P0[o] + (V0[o] / 0.9) * (1 - eK); y = P0[o + 1] + (V0[o + 1] / 0.9) * (1 - eK); z = P0[o + 2] + (V0[o + 2] / 0.9) * (1 - eK); }
      else {
        const ex0 = ex * (E0[o] * c + BB[o] * sn), ey = ex * (E0[o + 1] * c + BB[o + 1] * sn), ez = ex * (E0[o + 2] * c + BB[o + 2] * sn);
        x = TGT[o] + ex0; y = TGT[o + 1] + ey; z = TGT[o + 2] + ez; e = Math.hypot(ex0, ey, ez);
        if ((i & 31) === 0) { err += e; ne++; }
      }
      const k = clamp(1 - cool + e / 3);
      for (let j = 0; j < 3; j++) col[j] = lerp(ICE[j], h[j], k);
      const tw = 1 + shim * 0.25 * Math.sin(lt * 3 + HUE[i] * 40);
      // brighter as it arrives: the title lights up where the particles converge
      pts.push(x, y, z, (on ? 1.05 : 1.1) * tw, on ? lerp(0.45, 0.95, 1 - clamp(e / 1.5)) : 0.6 * Math.exp(-tb / 2.2) + 0.2, col);
    }
    pts.end();
    // the pen, balanced by the controller of Act III
    pen.visible = rail.mesh.visible = lt >= 13.4;
    const aPen = sstep(13.5, 14.5, lt) * (1 - sstep(20.5, 21.5, lt));
    if (pen.visible) {
      const x = penAt(lt);
      pen.position.x = 0.28 * x[0]; stick.rotation.z = -x[2];
      pen.traverse((m) => { if (m.material) { if (m.material.uniforms && m.material.uniforms.uOpacity) m.material.uniforms.uOpacity.value = aPen; else { m.material.transparent = true; m.material.opacity = aPen; } } });
      rail.u.uOpacity.value = aPen;
    }
    FX.bloom = 1.0 + 0.6 * (lt >= T_B ? Math.exp(-(lt - T_B) / 0.6) : sstep(1.5, 2.5, lt)) + 0.3 * (on ? Math.exp(-tc / 0.5) : 0);
    FX.ca = 0.005 + 0.03 * (lt >= T_B ? Math.exp(-(lt - T_B) / 0.3) : 0);
    FX.flash = lt >= T_B ? 0.35 * Math.exp(-(lt - T_B) / 0.12) : 0; // only the supernova flashes; the loop closing is a bloom pulse
    st = { err: ne ? err / ne : 1 };
  };

  s.draw = (lt) => {
    const a = 1 - sstep(10.0, 10.8, lt), tc = lt - T_C;
    if (lt < T_C) eqBar(lt < T_B ? 'h(t) = e^{\\c{r}{2t}} \\to \\infty' : 'u = 0 : \\;\\; \\rm{nothing holds}', { reveal: invLerp(0.4, 1.2, lt), alpha: sstep(0.4, 0.8, lt) * (1 - sstep(4.8, 5.0, lt)), color: css(COL.red) });
    else {
      eqBar('\\ddot e = -2\\zeta\\omega_n \\dot e - \\omega_n^2 e \\quad (u = -Kx)', { reveal: invLerp(T_C, T_C + 0.8, lt), alpha: a });
      eqBar(`\\zeta = ${A4.ZETA}, \\quad \\omega_n = ${A4.WN}, \\quad M_p = ${(100 * A4.MP).toFixed(1)}%, \\quad t_s = ${A4.TS.toFixed(1)} \\; \\rm{s}`, { line2: true, alpha: a });
      const q = toScreen(0, TY + 2.2, 0), aU = win(lt, T_C - 0.05, T_C + 1.4, 0.08, 0.6);
      if (q.vis && aU > 0) drawTex(ui, 'u = -Kx', q.x, q.y - 70, { size: 64, align: 'center', color: css(COL.cyan), alpha: aU, glow: 16, glowColor: 'rgba(90,200,255,0.7)' });
      const aP = sstep(T_C + 0.3, T_C + 0.9, lt) * a, Y = [];
      for (let k = 0; k <= 120; k++) Y.push([(k / 120) * 6, A4.stepY((k / 120) * 6)]);
      plotPanel(ui, 110, H - LB - 168, 380, 104, { alpha: aP, x: [0, 6], y: [0, 1.35], gridY: [1], title: 'EVERY PARTICLE · A STEP RESPONSE', xl: 't  s',
        series: [{ pts: [[0, 1 + A4.MP], [6, 1 + A4.MP]], color: thc('hud', 0.4), width: 1, dash: [3, 3] }, { pts: Y.filter(([t]) => t <= tc), color: css(COL.cyan), width: 2 }],
        dots: tc < 6 ? [[tc, A4.stepY(tc), '#fff']] : [] });
      panel(ui, W - 330, H - LB - 160, [`PARTICLES   ${NP}`, `ζ  ${A4.ZETA}    ωn  ${A4.WN}`, `OVERSHOOT   ${(100 * A4.MP).toFixed(1)} %`, `SETTLING    ${A4.TS.toFixed(2)} s`, `MEAN |e|    ${st.err.toFixed(3)}`], { alpha: aP, size: 13, lh: 24 });
    }
  };
})();
