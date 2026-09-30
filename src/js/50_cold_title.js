// Cold open: a pen balanced on its point obeys θ̈ = λ² sin θ with λ = +2, the villain pole.
// θ₀ is solved so the pen meets the floor exactly at t = 9.6 s; the cut to black is the impact.
(() => {
  const HIT = 9.6, L = 3.0, lam2 = VILLAIN * VILLAIN;
  let lo = Math.log(1e-14), hi = Math.log(1e-3);
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi), r = penFall(Math.exp(mid), HIT + 1);
    if (r.hit < 0 || r.hit > HIT) lo = mid; else hi = mid;
  }
  const th0 = Math.exp(0.5 * (lo + hi)), HZ = 960, N = Math.ceil(HIT * HZ) + 2, TH = new Float64Array(N);
  let th = th0, w = 0;
  for (let i = 0; i < N; i++) {
    TH[i] = Math.min(th, PI / 2);
    const h = 1 / HZ, f = (x) => lam2 * Math.sin(x);
    const k1 = w, l1 = f(th), k2 = w + 0.5 * h * l1, l2 = f(th + 0.5 * h * k1), k3 = w + 0.5 * h * l2, l3 = f(th + 0.5 * h * k2), k4 = w + h * l3, l4 = f(th + h * k3);
    th += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); w += (h / 6) * (l1 + 2 * l2 + 2 * l3 + l4);
  }
  const theta = (t) => { const x = clamp(t, 0, HIT) * HZ, i = Math.min(N - 2, Math.floor(x)); return lerp(TH[i], TH[i + 1], x - i); };

  const s = scene({ id: 'cold', b0: SB.cold, b1: SB.title, fadeIn: 1.2, fadeOut: 0.01, hudAlpha: 0 });
  const G = s.group;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), gridMat({ cell: 0.5, major: 4, fade: 11, intensity: 0.55 }));
  floor.rotation.x = -PI / 2;
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), spotMat(COL.cyan, 0.22));
  spot.rotation.x = -PI / 2; spot.position.y = 0.002;
  const pen = makePen(L);
  const tip = new Glow(1, { size: 26, color: [0.8, 0.95, 1], intensity: 1.4 });
  tip.begin().push(0, 0.01, 0, 1, 1).end();
  const dust = new Glow(600, { size: 3.2, color: COL.ice, intensity: 0.7, core: 0.3 }), r = rng(77);
  const D = Array.from({ length: 600 }, () => [r() * 14 - 7, r() * 5, r() * 12 - 8, r() * TAU, 0.3 + r() * 0.7]);
  G.add(floor, spot, pen, tip.pts, dust.pts, makeStars(1200, 5).pts);

  const cam = new CamPath([
    { t: 0, p: [0.55, 0.2, 1.45], l: [0, 0.16, 0], fov: 34 },
    { t: 3.2, p: [0.95, 0.85, 3.4], l: [0, 0.8, 0], fov: 36 },
    { t: 6.2, p: [-0.6, 1.7, 7.4], l: [0, 1.5, 0], fov: 38 },
    { t: 8.8, p: [-2.4, 1.5, 6.6], l: [0.5, 1.2, 0], fov: 38 },
    { t: 9.6, p: [-2.7, 1.2, 6.0], l: [0.9, 0.9, 0], fov: 38, e: 'lin' },
  ]);
  s.theta = theta; s.th0 = th0;
  s.update = (lt) => {
    cam.apply(lt, 0.012, 3);
    pen.rotation.z = -theta(lt);
    dust.begin();
    for (const [x, y, z, ph, k] of D) dust.push(x + 0.25 * Math.sin(lt * 0.21 * k + ph), y + 0.15 * Math.sin(lt * 0.17 + ph * 2), z, k, 0.35 * k);
    dust.end();
    FX.bloom = 0.85; FX.vig = 0.75; FX.grain = 0.06;
    if (lt >= HIT - 0.02) FX.fade = 1;
  };
  s.draw = (lt) => {
    const thv = theta(lt), a = sstep(1.2, 2.2, lt) * (lt < HIT - 0.02 ? 1 : 0);
    const p = toScreen(0.18, 0.28, 0);
    const e = Math.floor(Math.log10(thv)), m = thv / Math.pow(10, e);
    const val = thv < 0.01 ? `\\theta = ${m.toFixed(2)} \\times 10^{${e}} \\; \\rm{rad}` : `\\theta = ${thv.toFixed(3)} \\; \\rm{rad}`;
    drawTex(fx, val, p.x + 40, p.y - 10, { size: 26, color: thv < 0.01 ? css(COL.ice) : css(COL.red), alpha: 0.85 * a });
    drawTex(ui, '\\ddot\\theta = \\lambda^2 \\sin\\theta, \\quad \\lambda = \\c{r}{+2}', 110, H - LB - 40, { size: 22, color: 'rgba(170,205,230,1)', alpha: 0.6 * a });
  };
})();

// Title: four beat-cut teasers (10.0–12.5 s), then the title hit on bar 5.
(() => {
  const s = scene({ id: 'title', b0: SB.title, b1: SB.euler, fadeIn: 0.01, fadeOut: 0.6, hudAlpha: 0 });
  const G = s.group, TEASE = [['euler', 8.3], ['euler', 17.3], ['pend', 5.7], ['pend', 16.2]];
  s.redirect = (lt) => {
    if (lt >= 2.5) return null;
    const k = Math.floor(lt / 0.625), d = lt - k * 0.625;
    return { id: TEASE[k][0], lt: TEASE[k][1] + d, teaser: d };
  };
  const ring = new Ribbon(400, { width: 2.2, color: COL.ice, intensity: 1.6 });
  const burst = new Glow(2600, { size: 3, color: COL.ice, intensity: 1.2, core: 0.5 }), r = rng(9);
  const P = Array.from({ length: 2600 }, () => { const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u); return [q * Math.cos(a), u * 0.55, q * Math.sin(a) * 0.4, 2 + 9 * Math.pow(r(), 2), r()]; });
  G.add(ring.mesh, burst.pts, makeStars(2000, 11).pts);
  const cam = new CamPath([{ t: 2.5, p: [0, 0, 9.5], l: [0, 0, 0], fov: 40 }, { t: 7.5, p: [0, 0.1, 8.2], l: [0, 0, 0], fov: 40, e: 'lin' }]);
  s.update = (lt) => {
    cam.apply(lt, 0.01, 8);
    const T = lt - 2.5, g = E.outBack(clamp(T / 0.9)), R = 2.25 * g, ph = lt * TAU * 0.4;
    ring.begin();
    if (T > 0) {
      ring.curve((u) => [R * Math.cos(u * TAU), R * Math.sin(u * TAU), 0], 256, 1, 0.9);
      // the rotating radius echoes the Euler phasor, but leaves before the titles settle so it never crosses them
      const aRad = 1 - sstep(0.3, 0.8, T);
      if (aRad > 0) ring.push(0, 0, 0, 1.4, aRad).push(R * Math.cos(ph), R * Math.sin(ph), 0, 1.4, aRad).cut();
    }
    ring.end();
    burst.begin();
    if (T > 0) for (const [x, y, z, v, k] of P) {
      const d = (v * (1 - Math.exp(-3 * T))) / 3 + 0.05 * T;
      burst.push(x * d, y * d, z * d, 0.6 + k, Math.exp(-T / (1.5 + 2 * k)) * 0.8);
    }
    burst.end();
    FX.flash = T > 0 ? Math.exp(-T / 0.12) * 0.9 : 0;
    FX.bloom = 1.0; FX.fxGain = 1.3; FX.vig = 0.6;
  };
  s.draw = (lt) => {
    const T = lt - 2.5;
    if (T <= 0) return;
    const a = sstep(0.05, 0.6, T) * (1 - sstep(4.2, 4.95, T)), sweep = invLerp(0.3, 2.6, T);
    const gx = lerp(W * 0.12, W * 0.88, sweep), gr = fx.createLinearGradient(gx - 260, 0, gx + 260, 0);
    gr.addColorStop(0, 'rgb(190,215,240)'); gr.addColorStop(0.5, 'rgb(255,255,255)'); gr.addColorStop(1, 'rgb(190,215,240)');
    text(fx, decode('THE GEOMETRY OF CONTROL', invLerp(0.05, 0.9, T), lt), W / 2, H / 2 - 18, { font: FONT.title, size: 50, spacing: 12, align: 'center', color: gr, alpha: a });
    text(ui, '控制的几何', W / 2, H / 2 + 58, { font: FONT.zh, size: 38, weight: 600, spacing: lerp(60, 34, E.out(invLerp(0.4, 1.6, T))), align: 'center', color: 'rgb(232,242,252)', alpha: a * sstep(0.4, 1.2, T), glow: 14, glowColor: 'rgba(120,190,255,0.6)' });
    text(ui, 'FROM COMPLEX NUMBERS TO AUTONOMY', W / 2, H / 2 + 108, { font: FONT.title, size: 13, spacing: 9, align: 'center', color: 'rgb(150,190,220)', alpha: a * sstep(1.1, 1.9, T) });
  };
})();
