// Act IV · swarm per-frame: the cloud hovers · 1.0 s the neighbour rule switches on: the fast modes vanish at once
// (a loop), the slow one at κλ₂ (the circle) · 8.8 s the ring is the phasor of Act I: drone 0 gold, the axes return.
(() => {
  const { s, R, glows, N } = SW;
  const C = A4.CEN, pos = [], DIS = [];
  for (let k = 0; k <= 250; k++) DIS.push([k / 20, Math.log10(Math.max(1e-6, A4.disagree(k / 20)))]);
  let st = { d: 1 };

  s.update = (lt) => {
    const u = E.inOut(clamp(lt / 10)), az = lerp(0.75, 0, u), el = lerp(0.38, 0.03, u), di = lerp(14, 12.5, u);
    camera.fov = 40; camera.position.set(C[0] + di * Math.cos(el) * Math.sin(az), C[1] + di * Math.sin(el), C[2] + di * Math.cos(el) * Math.cos(az));
    camera.up.set(0, 1, 0); camera.lookAt(C[0], C[1], C[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    A4.droneAt(lt, pos);
    const tip = sstep(8.8, 9.6, lt);
    R.arms.begin(); R.links.begin(); glows.begin();
    for (let i = 0; i < N; i++) {
      const p = pos[i], lead = i === 0 && tip > 0, c = lead ? mixc(WHITE3, COL.gold, tip) : WHITE3;
      glows.push(...p, lead ? 1.1 + 0.8 * tip : 0.9, 1, c);
      const a = 0.9 * lt + i; // the frame of a quadcopter: an X of arms with a rotor at each tip
      for (let k = 0; k < 2; k++) {
        const b = a + (k * PI) / 2, dx = 0.13 * Math.cos(b), dz = 0.13 * Math.sin(b);
        R.arms.push(p[0] - dx, p[1], p[2] - dz, 1, 0.8).push(p[0] + dx, p[1], p[2] + dz, 1, 0.8).cut();
        glows.push(p[0] + dx, p[1], p[2] + dz, 0.35, 0.55, COL.cyan).push(p[0] - dx, p[1], p[2] - dz, 0.35, 0.55, COL.cyan);
      }
      for (const o of [1, 2]) { // the only information any drone has: its ring neighbours
        const q = pos[(i + o) % N], l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), al = (o === 1 ? 0.55 : 0.28) * Math.exp(-l / 2.5);
        R.links.push(...p, 1, al).push(...q, 1, al).cut();
      }
    }
    R.axes.u.uOpacity.value = 0.7 * tip; R.circ.u.uOpacity.value = 0.6 * tip;
    R.rad.begin();
    if (tip > 0) R.rad.push(...C, 1, tip).push(...pos[0], 1, tip).cut();
    R.rad.end();
    if (tip > 0) glows.push(...C, 0.8, tip, WHITE3);
    R.arms.end(); R.links.end(); glows.end();
    FX.bloom = 0.95; FX.vig = 0.65;
    st = { d: A4.disagree(lt) };
  };

  s.draw = (lt) => {
    const { d } = st, ex = (v) => { const e = Math.floor(Math.log10(v)); return `${(v / 10 ** e).toFixed(1)} \\times 10^{${e}}`; };
    if (lt < 8.8) {
      const a = sstep(0.6, 1.0, lt) * (1 - sstep(8.6, 8.8, lt));
      eqBar('\\dot\\xi_i = -\\kappa \\sum_{j \\in N_i} (\\xi_i - \\xi_j), \\quad x_i = \\xi_i + d_i', { reveal: invLerp(0.6, 1.4, lt), alpha: a });
      eqBar(`\\kappa\\lambda_2 = ${(A4.KAP * A4.LAM[1]).toFixed(2)} \\; \\rm{s}^{-1}, \\quad \\rm{disagreement} \\; ${ex(Math.max(d, 1e-6))}`, { line2: true, alpha: a * sstep(1.2, 1.6, lt) });
    } else {
      const a = sstep(8.8, 9.2, lt);
      eqBar('x_i \\to c + R\\, e^{\\,j(\\omega t + 2\\pi i / N)}', { reveal: invLerp(8.8, 9.6, lt), alpha: a, color: 'rgb(255,235,200)' });
      eqBar(`\\omega = 2\\pi \\cdot 0.4, \\quad N = ${N}, \\quad \\rm{no leader}`, { line2: true, alpha: a });
    }
    // who listens to whom: the Laplacian's sparsity (a circulant band, wrapping at the corners)
    const aH = sstep(1.0, 1.6, lt), x0 = 96, y0 = LB + 64, cs = 3.2;
    if (aH > 0) {
      ui.save(); ui.globalAlpha = aH;
      ui.fillStyle = thc('bg', 0.55); ui.fillRect(x0 - 6, y0 - 6, N * cs + 12, N * cs + 12);
      for (let i = 0; i < N; i++) {
        ui.fillStyle = thc('hi', 0.9); ui.fillRect(x0 + i * cs, y0 + i * cs, cs - 0.6, cs - 0.6);
        ui.fillStyle = css(COL.cyan, 0.8);
        for (const o of [-2, -1, 1, 2]) { const j = (i + o + N) % N; ui.fillRect(x0 + j * cs, y0 + i * cs, cs - 0.6, cs - 0.6); }
      }
      ui.restore();
      text(ui, 'L · WHO LISTENS TO WHOM', x0, y0 - 12, { font: FONT.mono, size: 12, spacing: 1.5, color: thc('hud', 0.8 * aH) });
    }
    const n = clamp(Math.floor(lt * 20) + 1, 1, DIS.length), l0 = DIS[Math.round(A4.T_ON * 20)][1]; // lt < 0 while it dissolves in
    plotPanel(ui, 110, H - LB - 168, 380, 104, { alpha: aH, x: [0, 12.5], y: [-5, 1], gridY: [-4, -2, 0], title: 'DISAGREEMENT · log10', xl: 't  s',
      series: [{ pts: [[A4.T_ON, l0], [12.5, l0 - (A4.KAP * A4.LAM[1] * (12.5 - A4.T_ON)) / Math.LN10]], color: thc('hud', 0.45), width: 1, dash: [4, 4] }, { pts: DIS.slice(0, n), color: css(COL.cyan), width: 1.8 }],
      dots: [[...DIS[n - 1], '#fff']] });
    panel(ui, W - 330, H - LB - 160, [`DRONES      ${N}`, `LINKS       ${2 * N} · RING ±1 ±2`, 'LEADER      NONE', `DISAGREE    ${d < 1e-3 ? d.toExponential(1) : d.toFixed(3)}`, d < 0.01 ? '$\\c{c}{\\rm{FORMATION}}' : lt < A4.T_ON ? 'HOVERING' : 'CONVERGING'], { alpha: aH, size: 13, lh: 24 });
  };
})();
