// Act IV · rocket per-frame: chapter card over the night sky · the booster flies the receding-horizon plans ·
// gusts at 4.375 and 6.875 s (the plan fan opens, then closes on the pad) · legs 9.4–10.5 · touchdown 12.5 s.
(() => {
  const { s, B, legs, plume, pool, R, ticks, smoke, SMK } = RK;
  const cam = new CamPath([
    { t: 0, p: [4.5, 2.5, 30], fov: 45 }, { t: 4, p: [4.8, 2.3, 26], fov: 44 }, { t: 8, p: [5.4, 2.0, 21], fov: 42 },
    { t: 12.5, p: [6.0, 1.6, 17], fov: 40 }, { t: 15, p: [5.6, 1.4, 16], fov: 40, e: 'lin' },
  ].map((k) => ({ ...k, l: [0, 0, 0] })));
  const HIP = [0.085, 0.4], FOOT = [0.62, 0], LEGL = Math.hypot(FOOT[0] - HIP[0], FOOT[1] - HIP[1]), THD = Math.atan2(FOOT[0] - HIP[0], HIP[1] - FOOT[1]);
  const planPts = (k, t) => { const P = A4.PLANS[k], out = [], t0 = Math.max(t, P.t0), n = 60; for (let i = 0; i <= n; i++) out.push(A4.evalPlan(P, t0 - P.t0 + (i / n) * (A4.T_LAND - t0)).r); return out; };
  let st = null;

  s.update = (lt) => {
    const f = A4.flight(lt), q = cam.sample(lt), w = lerp(0.55, 0.25, sstep(3, 11, lt)); // look between the booster and the pad
    const L = [lerp(0, f.r[0], w) + 0.4, lerp(0.8, f.r[1] + 0.8, w), 0], sh = f.landed ? 0.05 * Math.exp(-(lt - A4.T_LAND) / 0.3) : 0.004;
    camera.fov = q.fov; camera.position.set(q.p[0] + sh * noise1(lt * 30), q.p[1] + sh * noise1(lt * 27 + 5), q.p[2]);
    camera.up.set(0, 1, 0); camera.lookAt(...L); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const th = A4.tilt(f.u), thr = f.landed ? 0 : A4.throttle(f.u);
    B.position.set(f.r[0], f.r[1], 0); B.rotation.z = -th;
    // landing legs: stowed along the body, swinging down and out 9.4–10.5 s
    const dep = E.inOut(clamp((lt - 9.4) / 1.1)), an = lerp(PI, THD, dep);
    legs.begin();
    for (let k = 0; k < 4; k++) {
      const a = PI / 4 + (k * PI) / 2, c = Math.cos(a), sn = Math.sin(a), fr = HIP[0] + LEGL * Math.sin(an), fy = HIP[1] - LEGL * Math.cos(an);
      legs.push(HIP[0] * c, HIP[1], HIP[0] * sn, 1, 1).push(fr * c, fy, fr * sn, 1, 1).cut();
      legs.push(0.075 * c, 0.75, 0.075 * sn, 1, 0.7).push(lerp(HIP[0], fr, 0.55) * c, lerp(HIP[1], fy, 0.55), lerp(HIP[0], fr, 0.55) * sn, 1, 0.7).cut();
    }
    legs.end();
    // the plume, along −thrust from the engine
    plume.begin();
    if (thr > 0) {
      const ax = [-Math.sin(th), -Math.cos(th)], e0 = [f.r[0] + 0.1 * Math.sin(th), f.r[1] + 0.1 * Math.cos(th)];
      for (let k = 0; k < 10; k++) {
        const d = k * 0.1 * (0.6 + 0.6 * thr) * (1 + 0.15 * noise1(lt * 23 + k)), y = Math.max(0.02, e0[1] + ax[1] * d);
        plume.push(e0[0] + ax[0] * d, y, 0, (0.28 - 0.018 * k) * (0.7 + 0.5 * thr), 0.9 - 0.08 * k, mixc([1, 0.95, 0.85], [1, 0.5, 0.2], k / 9));
      }
    }
    plume.end();
    pool.material.uniforms.uOpacity.value = thr * Math.exp(-f.r[1] / 2.5);
    // the plan in force (dotted) and the plans before it (they only differ after a gust)
    R.plan.begin(); R.ghost.begin(); ticks.begin();
    if (!f.landed) {
      planPts(f.k, lt).forEach((p) => R.plan.push(p[0], p[1] + 0.8, 0, 1, sstep(0.3, 1.0, lt)));
      [4, 8, 12, 16].forEach((d, i) => { const kk = f.k - d; if (kk < 0) return; planPts(kk, lt).forEach((p) => R.ghost.push(p[0], p[1] + 0.8, 0, 1, 0.3 - 0.06 * i)); R.ghost.cut(); });
      for (let tt = Math.ceil(lt + 0.01); tt < A4.T_LAND; tt++) { const p = A4.evalPlan(A4.PLANS[f.k], tt - A4.PLANS[f.k].t0).r; ticks.push(p[0], p[1] + 0.8, 0, 0.8, 0.8, COL.cyan); }
    }
    ticks.push(0, 0.03, 0, 1.2, 0.8 + 0.2 * Math.sin(lt * 4), COL.cyan);
    R.plan.cut().end(); R.ghost.end(); ticks.end();
    const gfl = A4.GUSTS.reduce((m, [tg]) => Math.max(m, lt >= tg ? Math.exp(-(lt - tg) / 0.4) : 0), 0);
    R.plan.u.uOpacity.value = 1 + 0.8 * gfl;
    R.trail.begin();
    for (let i = 0; i <= 120; i++) { const tt = (i / 120) * Math.min(lt, A4.T_LAND), p = A4.flight(tt).r; R.trail.push(p[0], p[1] + 0.8, 0, 1, 0.35); }
    R.trail.cut().end();
    R.gust.begin();
    A4.GUSTS.forEach(([tg, dv]) => {
      const a = lt >= tg ? Math.exp(-(lt - tg) / 0.5) : 0;
      if (a < 0.02) return;
      const l = Math.hypot(dv[0], dv[1]), d = [dv[0] / l, dv[1] / l], p = A4.flight(tg).r;
      ribArrow(R.gust, [p[0] - d[0] * 2.4, p[1] + 1.0 - d[1] * 2.4, 0], [p[0] - d[0] * 0.5, p[1] + 1.0 - d[1] * 0.5, 0], 0.2, 1.2, a);
    });
    R.gust.end();
    smoke.begin();
    if (f.landed) for (const [ang, sp, ph, sz] of SMK) {
      const age = (lt - A4.T_LAND) * (0.5 + 0.5 * ph), rr = 0.3 + sp * age * 1.4;
      smoke.push(rr * Math.cos(ang), 0.05 + 0.25 * age * ph, rr * Math.sin(ang) * 0.6, sz * (1 + 1.5 * age), 0.35 * Math.exp(-age / 1.2));
    }
    smoke.end();
    FX.bloom = 0.95; FX.vig = 0.7; FX.exposure = 1 - 0.4 * win(lt, 0.1, 2.95, 0.4, 0.6);
    if (f.landed) FX.bloom += 0.5 * Math.exp(-(lt - A4.T_LAND) / 0.4); // touchdown by bloom, not a grey flash
    st = { f, th, thr };
  };

  s.draw = (lt) => {
    const { f, th, thr } = st, P = A4.PLANS[f.k];
    chapterCard(fx, lt, 'IV', '自主', 'AUTONOMY', 2.9);
    const aE = sstep(3.0, 3.4, lt);
    eqBar('\\min \\int_0^T |\\dot a|^2 d\\tau, \\quad r(T) = 0, \\; v(T) = 0, \\; a_x(T) = 0', { reveal: invLerp(3.0, 3.8, lt), alpha: aE });
    eqBar(f.landed ? '\\rm{touchdown : } \\; |r| = 0.00, \\; |v| = 0.00' : `T_{go} = ${Math.max(0, A4.T_LAND - lt).toFixed(2)} \\; \\rm{s}, \\quad \\rm{plan} \\; ${f.k + 1} / ${A4.PLANS.length}, \\quad \\rm{every} \\; ${(A4.DT * 1000).toFixed(0)} \\; \\rm{ms}`, { line2: true, alpha: aE });
    const aP = sstep(3.2, 3.8, lt), hist = [], pred = [];
    for (let i = 0; i <= 90; i++) { const tt = (i / 90) * Math.min(lt, A4.T_LAND - 1e-3); hist.push([tt, A4.throttle(A4.flight(tt).u)]); }
    if (!f.landed) for (let i = 0; i <= 40; i++) { const tt = lt + (i / 40) * (A4.T_LAND - lt); pred.push([tt, A4.throttle(A4.evalPlan(P, tt - P.t0).u)]); }
    plotPanel(ui, 110, H - LB - 168, 380, 104, { alpha: aP, x: [0, A4.T_LAND], y: [0.3, 1.05], gridY: [0.5, 1], title: 'THROTTLE · FLOWN (WHITE) · PLAN (CYAN)', xl: 't  s',
      series: [{ pts: hist, color: thc('hi', 0.9), width: 1.8 }, { pts: pred, color: css(COL.cyan), width: 1.6, dash: [4, 3] }] });
    const rows = [`ALT      ${(f.r[1] * A4.UM).toFixed(0)} M`, `SPEED    ${(Math.hypot(...f.v) * A4.UM).toFixed(1)} M/S`, `THROTTLE ${(100 * thr).toFixed(0)} %`,
      `TILT     ${((th * 180) / PI).toFixed(1)}°`, lt > 10.5 ? 'LEGS     DEPLOYED' : lt > 9.4 ? 'LEGS     DEPLOYING' : 'LEGS     STOWED', f.landed ? '$\\c{c}{\\rm{THE FALCON HAS LANDED}}' : `PLAN     #${f.k + 1}`];
    panel(ui, W - 330, H - LB - 178, rows, { alpha: aP, size: 13, lh: 24 });
    A4.GUSTS.forEach(([tg, dv]) => {
      const a = win(lt, tg, tg + 1.4, 0.05, 0.6);
      if (a <= 0) return;
      const p = A4.flight(tg).r, l = Math.hypot(...dv), qq = toScreen(p[0] - (dv[0] / l) * 2.6, p[1] + 1.2 - (dv[1] / l) * 2.6, 0);
      if (qq.vis) text(ui, 'GUST · RE-PLAN', qq.x, qq.y - 10, { font: FONT.mono, size: 12, spacing: 2, align: 'center', color: thc('hi', 0.9 * a) });
    });
  };
})();
