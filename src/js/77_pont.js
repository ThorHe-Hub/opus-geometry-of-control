// Act III · Pontryagin 1956 (scene-local 0–10 s). Minimum time for ẍ = u, |u| ≤ 1: the phase plane (x, v) is
// covered by the two parabola families of full thrust (gold u = −1, cyan u = +1) that meet on the switching curve
// Γ: x = −v|v|/2. A cloud of states each switches once on Γ; then the hero, from rest at x = 4: full thrust,
// one switch at (2, −2) on the brass stab (6.875 s), full reverse, at rest on the origin at 8.75 s. T* = 4.
const PT = (() => {
  const s = scene({ id: 'pont', b0: SB.pont, b1: SB.apollo, fadeIn: 0, fadeOut: 0, theme: 'amber' });
  const G = s.group, PS = 0.85, VX = 4.6, VL = -2.3, VH = 2.5, VT = -2.62;
  const pp = (x, v, z = 0) => [x * PS, v * PS, z];
  const inV = (x, v) => Math.abs(x) <= VX && v >= VL && v <= VH;
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(2 * VX * PS + 0.6, 5.6 * PS), gridMat({ cell: PS, major: 4, fade: 6.5, intensity: 0.35, color: COL.amber, axis: true }));
  grid.position.set(0, 0, -0.02); // centred on the origin so its lines sit on integer x, v
  const R = {
    fam: new Ribbon(3000, { width: 1.3, color: WHITE3, intensity: 1.25 }),
    gam: new Ribbon(130, { width: 3.2, color: [1, 0.95, 0.85], intensity: 1.9 }),
    ax: new Ribbon(24, { width: 1.4, color: COL.amber, intensity: 1.0 }),
    fan: new Ribbon(1600, { width: 1.3, color: WHITE3, intensity: 1.3 }),
    hero: new Ribbon(80, { width: 3, color: WHITE3, intensity: 2.0 }),
    track: new Ribbon(60, { width: 1.6, color: COL.amber, intensity: 1.3 }),
    drop: new Ribbon(4, { width: 1.1, color: WHITE3, intensity: 1.0, dash: 0.08, dashRatio: 0.5 }),
  };
  // full-thrust arcs, each drawn only where it is optimal: x = c − v²/2 (u = −1, above Γ), x = c + v²/2 (u = +1, below)
  const GOLD = [1, 0.72, 0.3];
  for (let i = 0; i < 17; i++) [-1, 1].forEach((u) => {
    const c = -u * (0.3 + i * 0.3), col = u < 0 ? GOLD : COL.cyan;
    for (let k = 0; k <= 80; k++) {
      const v = lerp(-2.8, 2.8, k / 80), x = c + (u * v * v) / 2, sw = x + 0.5 * v * Math.abs(v);
      if (inV(x, v) && (u < 0 ? sw > 0 : sw < 0)) R.fam.push(...pp(x, v, 0.002), 1, 0.6, col); else R.fam.cut();
    }
    R.fam.cut();
  });
  R.fam.end();
  for (let k = 0; k <= 120; k++) { const v = lerp(VL, VH, k / 120), x = A3.gam(v); if (inV(x, v)) R.gam.push(...pp(x, v, 0.004), 1, 1); }
  R.gam.cut().end();
  ribArrow(R.ax, pp(-VX, 0), pp(VX + 0.3, 0), 0.12, 1, 0.8); ribArrow(R.ax, pp(0, VL), pp(0, VH + 0.25), 0.12, 1, 0.8); R.ax.end();
  R.track.push(...pp(-VX, VT - 0.12), 1, 0.9).push(...pp(VX, VT - 0.12), 1, 0.9).cut();
  R.track.push(...pp(0, VT - 0.12), 1.4, 1, COL.cyan).push(...pp(0, VT + 0.3), 1.4, 1, COL.cyan).push(...pp(0.3, VT + 0.22), 1.4, 1, COL.cyan).push(...pp(0, VT + 0.14), 1.4, 1, COL.cyan).cut();
  R.track.end();
  const r = rng(1956), FAN = [];
  while (FAN.length < 150) { const x = r() * 8.4 - 4.2, v = r() * 4.2 - 2.1; if (Math.hypot(x, v) > 0.8) FAN.push(A3.plan(x, v)); }
  const cart = new Ribbon(40, { width: 1.8, color: WHITE3, intensity: 1.6 });
  const glows = new Glow(200, { size: 8, intensity: 1.7, core: 0.6 });
  const stars = makeStars(1600, 77);
  stars.u.uColor.value.set(1.0, 0.84, 0.66);
  G.add(grid, glows.pts, stars.pts, cart.mesh, ...Object.values(R).map((q) => q.mesh));
  s.hud = { chapter: ACT[3], scene: '极大值原理 · 砰砰控制', anchor: 'L. S. PONTRYAGIN · 1956' };
  return { s, pp, VT, R, FAN, cart, glows, grid, GOLD, HERO: A3.plan(4, 0) };
})();
