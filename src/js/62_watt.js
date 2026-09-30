// Act II · Watt governor geometry: brass hologram in a dark workshop. Physics in 61_watt_sim.js.
// Rotating frame: spindle, gear, arms, balls, links, sleeve. Fixed frame: lever, push rod, butterfly valve, stack.
(() => {
  const s = scene({ id: 'watt', b0: SB.watt, b1: SB.maxwell, fadeIn: 0.5, fadeOut: 0, theme: 'brass', hudIn: 2.9 }); // dissolves into maxwell
  const G = s.group, LA = 1.1, YH = 2.9;
  const brass = (k = 2.2, base = [0.1, 0.07, 0.03]) => rimMat({ base, rim: COL.gold, intensity: k, power: 2.4 });
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.5, 1.15, 0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const solid = (geo, mat, parent, pos, edges) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    parent.add(m);
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat));
    return m;
  };
  const rod = (parent, k = 1.8) => { const m = new THREE.Mesh(ROD_GEO, brass(k)); parent.add(m); return m; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), gridMat({ cell: 0.5, major: 4, fade: 9, intensity: 0.28, color: COL.gold }));
  floor.rotation.x = -PI / 2;
  G.add(floor);
  solid(flat(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 8)), brass(1.6), G, [0, 0.15, 0], true);
  solid(new THREE.SphereGeometry(0.07, 16, 12), brass(2.6), G, [0, YH, 0]);
  solid(new THREE.ConeGeometry(0.06, 0.22, 10), brass(2.4), G, [0, YH + 0.2, 0]);
  const R = new THREE.Group();
  G.add(R);
  rodBetween(rod(R, 1.4), [0, 0.3, 0], [0, YH, 0], 0.035);
  solid(new THREE.TorusGeometry(0.28, 0.045, 6, 24), brass(2), R, [0, 0.42, 0], true).rotation.x = PI / 2;
  const arms = [0, 1].map(() => rod(R, 2)), links = [0, 1].map(() => rod(R, 1.8));
  const balls = [0, 1].map(() => {
    const b = solid(new THREE.SphereGeometry(0.2, 24, 16), brass(2.8, [0.14, 0.1, 0.04]), R);
    b.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.212, 1)), edgeMat));
    return b;
  });
  const sleeve = solid(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16), brass(2.2), R);
  sleeve.add(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 20), brass(2.4)).rotateX(PI / 2));
  // Throttle linkage: the lever pivots at P; its fork rides the sleeve groove, its far end E drives the push rod.
  const P = [0.55, 1.82, 0], VX = 1.0, VY = 0.7, SX = 2.1, SY = 1.9;
  const lever = rod(G, 2), push = rod(G, 1.8);
  rodBetween(rod(G, 1.4), [P[0], 0, 0], P, 0.03);
  solid(new THREE.SphereGeometry(0.05, 12, 8), brass(2.6), G, P);
  rodBetween(rod(G, 1.2), [0.45, VY, 0], [SX, VY, 0], 0.06);
  rodBetween(rod(G, 1.2), [0.45, 0.3, 0], [0.45, VY, 0], 0.06);
  rodBetween(rod(G, 1.2), [SX, VY, 0], [SX, SY, 0], 0.08);
  const housing = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), shellMat(COL.gold, 0.9));
  housing.position.set(VX, VY, 0);
  G.add(housing);
  const disc = solid(new THREE.CylinderGeometry(0.15, 0.15, 0.016, 20), brass(3), G, [VX, VY, 0]);
  // Ω annotation around the base gear (fixed frame), steam, dust, distant workshop bokeh
  const note = new Ribbon(80, { width: 1.4, color: COL.gold, intensity: 1.3 });
  note.curve((u) => [0.4 * Math.cos(u * 5.2), 0.58, 0.4 * Math.sin(u * 5.2)], 60, 1, 0.8);
  ribArrow(note, [0.4 * Math.cos(5.0), 0.58, 0.4 * Math.sin(5.0)], [0.4 * Math.cos(5.2), 0.58, 0.4 * Math.sin(5.2)], 0.08, 1, 0.8, WHITE3, [0, 1, 0]);
  note.end();
  const steam = new Glow(900, { size: 0.35, world: true, color: [1, 0.93, 0.8], intensity: 0.4, core: 0.1 });
  const dust = new Glow(400, { size: 2.6, color: [1, 0.85, 0.6], intensity: 0.6, core: 0.3 });
  const bokeh = new Glow(40, { size: 1, world: true, color: [1, 0.78, 0.45], intensity: 0.5, core: 0.2, depthTest: false, order: 0 });
  const r = rng(1788);
  const STEAM = Array.from({ length: 900 }, (_, i) => [(i + r()) / 900 * 10.2, r() - 0.5, r() - 0.5, r()]);
  const DUST = Array.from({ length: 400 }, () => [r() * 9 - 3.5, r() * 4, r() * 7 - 4, r() * TAU, 0.3 + r() * 0.7]);
  bokeh.begin();
  for (let i = 0; i < 40; i++) bokeh.push(r() * 26 - 11, r() * 7, -14 - r() * 8, 0.6 + 0.9 * r(), 0.1 + 0.18 * r());
  bokeh.end();
  G.add(note.mesh, steam.pts, dust.pts, bokeh.pts);
  Object.assign(WT, { s, LA, YH, R, arms, links, balls, sleeve, lever, push, disc, P, VX, VY, SX, SY, steam, dust, STEAM, DUST });
})();
