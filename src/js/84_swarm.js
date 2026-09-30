// Act IV · swarm (scene-local 0–12.5 s). Sixty drones, no leader, each listening only to its four ring neighbours
// (81_act4_math.js). The cloud smooths into a loop, then a circle: xᵢ → c + R e^{j(φ(t) + 2πi/N)}, the circle of Act I.
const SW = (() => {
  const s = scene({ id: 'swarm', b0: SB.swarm, b1: SB.finale, fadeIn: 0, fadeOut: 0, theme: 'white' });
  const G = s.group, N = A4.NS;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), gridMat({ cell: 1, major: 5, fade: 22, intensity: 0.22, color: COL.ice }));
  floor.rotation.x = -PI / 2;
  const R = {
    arms: new Ribbon(N * 6, { width: 1.2, color: WHITE3, intensity: 1.2 }),
    links: new Ribbon(2 * N * 3, { width: 1.0, color: COL.cyan, intensity: 1.0 }),
    axes: new Ribbon(24, { width: 1.3, color: COL.ice, intensity: 0.8 }),
    circ: new Ribbon(130, { width: 1.2, color: COL.ice, intensity: 0.8, dash: 0.1, dashRatio: 0.5 }),
    rad: new Ribbon(4, { width: 2.4, color: COL.gold, intensity: 1.8 }),
  };
  const C = A4.CEN, X = A4.RAD + 0.9;
  ribArrow(R.axes, [C[0] - X, C[1], C[2]], [C[0] + X, C[1], C[2]], 0.14, 1, 1); ribArrow(R.axes, [C[0], C[1] - X, C[2]], [C[0], C[1] + X, C[2]], 0.14, 1, 1); R.axes.end();
  R.circ.curve((u) => [C[0] + A4.RAD * Math.cos(u * TAU), C[1] + A4.RAD * Math.sin(u * TAU), C[2]], 120, 1, 0.7).end();
  const glows = new Glow(N * 5 + 8, { size: 7, intensity: 1.7, core: 0.8 });
  const stars = makeStars(2400, 84, 80, 200, true);
  stars.u.uColor.value.set(0.85, 0.93, 1.05);
  G.add(floor, glows.pts, stars.pts, ...Object.values(R).map((q) => q.mesh));
  s.hud = { chapter: ACT[4], scene: '集群 · 一致性', anchor: 'GRAPH LAPLACIAN · NO LEADER' };
  return { s, R, glows, N };
})();
