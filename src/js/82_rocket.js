// Act IV · powered landing (scene-local 0–15 s). A white hologram booster falls toward LZ-1 at night and lands on the
// receding-horizon plans of 81_act4_math.js: the cyan dotted curve is the plan in force, the faint curves the plans
// before it (they coincide until a gust, then fan out). Touchdown at 12.5 s = bar 68, the score's hit.
const RK = (() => {
  const s = scene({ id: 'rocket', b0: SB.rocket, b1: SB.swarm, fadeIn: 0.5, fadeOut: 0, theme: 'white', hudIn: 2.9 });
  const G = s.group;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), gridMat({ cell: 1, major: 5, fade: 30, intensity: 0.3, color: COL.ice }));
  floor.rotation.x = -PI / 2;
  const pad = new Ribbon(260, { width: 1.8, color: WHITE3, intensity: 1.5 });
  pad.curve((u) => [2.1 * Math.cos(u * TAU), 0.01, 2.1 * Math.sin(u * TAU)], 90, 1, 0.9);
  pad.curve((u) => [1.4 * Math.cos(u * TAU), 0.01, 1.4 * Math.sin(u * TAU)], 70, 1, 0.5);
  [[1, 1], [1, -1]].forEach(([a, b]) => pad.push(-0.9 * a, 0.012, -0.9 * b, 1.3, 1).push(0.9 * a, 0.012, 0.9 * b, 1.3, 1).cut());
  pad.end();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), spotMat([1, 0.6, 0.3], 0.5));
  pool.rotation.x = -PI / 2; pool.position.y = 0.015;
  // the booster; its origin is the plane of the deployed feet (so r = 0 means standing on the pad)
  const B = new THREE.Group(), HL = rimMat({ base: [0.05, 0.06, 0.07], rim: [0.9, 0.97, 1], intensity: 1.6, power: 2.6 });
  const EDGE = new THREE.LineBasicMaterial({ color: new THREE.Color(1.3, 1.45, 1.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const part = (geo, y, mat = HL) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), EDGE)); B.add(m); return m; };
  part(new THREE.CylinderGeometry(0.075, 0.075, 1.5, 16), 1.02);
  part(new THREE.CylinderGeometry(0.078, 0.078, 0.14, 16), 1.84, rimMat({ base: [0.02, 0.02, 0.025], rim: [0.6, 0.7, 0.8], intensity: 1.2 }));
  part(new THREE.CylinderGeometry(0.085, 0.075, 0.08, 16), 0.24);
  part(new THREE.ConeGeometry(0.06, 0.12, 12, 1, true), 0.15);
  for (let k = 0; k < 4; k++) { const a = PI / 4 + (k * PI) / 2, f = part(new THREE.BoxGeometry(0.1, 0.012, 0.06), 1.72); f.position.x = 0.11 * Math.cos(a); f.position.z = 0.11 * Math.sin(a); f.rotation.y = -a; }
  const legs = new Ribbon(24, { width: 1.8, color: WHITE3, intensity: 1.5 });
  B.add(legs.mesh);
  const plume = new Glow(12, { size: 1, world: true, color: [1, 0.72, 0.4], intensity: 1.8, core: 0.4, depthTest: false });
  const R = {
    plan: new Ribbon(130, { width: 2.2, color: COL.cyan, intensity: 1.8, dash: 0.09, dashRatio: 0.5 }),
    ghost: new Ribbon(4 * 64, { width: 1.1, color: COL.cyan, intensity: 0.9 }),
    trail: new Ribbon(130, { width: 1.3, color: WHITE3, intensity: 0.9 }),
    gust: new Ribbon(20, { width: 2, color: WHITE3, intensity: 1.6 }),
  };
  const ticks = new Glow(20, { size: 7, intensity: 1.6 });
  const smoke = new Glow(160, { size: 0.25, world: true, color: [0.9, 0.93, 1], intensity: 0.35, core: 0.1 });
  const r = rng(2015), SMK = Array.from({ length: 160 }, () => [r() * TAU, 0.5 + r(), r(), 0.6 + r()]);
  const city = new Glow(200, { size: 1, world: true, color: [1, 0.85, 0.65], intensity: 0.5, core: 0.3, depthTest: false, order: 0 });
  city.begin();
  for (let i = 0; i < 200; i++) { const a = -0.6 * PI + r() * 1.2 * PI, d = 60 + r() * 25; city.push(d * Math.sin(a), 0.05 + r() * 0.35, -d * Math.cos(a), 0.25 + 0.5 * r(), 0.15 + 0.35 * r()); }
  city.end();
  const stars = makeStars(2200, 82, 80, 200, true);
  stars.u.uColor.value.set(0.85, 0.93, 1.05);
  G.add(floor, pad.mesh, pool, B, plume.pts, ticks.pts, smoke.pts, city.pts, stars.pts, ...Object.values(R).map((q) => q.mesh));
  s.hud = { chapter: ACT[4], scene: '火箭回收 · 滚动时域优化', anchor: 'FALCON 9 · LZ-1 · 2015' };
  return { s, B, legs, plume, pool, R, ticks, smoke, SMK };
})();
