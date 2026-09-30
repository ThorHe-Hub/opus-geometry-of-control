// Act II · phase portraits (scene-local 0–10 s). Left: the trace–determinant plane, the fate map of every 2×2
// linear system. A point walks it on the chord changes; right: the live portrait of A(tr, det), streamlines
// and four hero trajectories: spiral, centre, spiral out, node out, saddle, node in, spiral in.
const PH = (() => {
  const s = scene({ id: 'phase', b0: SB.phase, b1: SB.lorenz, fadeIn: 0, fadeOut: 0, theme: 'blueprint' });
  const G = s.group;
  // (t, tr, det, hold): Hermite through the keys, zero tangent at holds (the centre sits exactly on tr = 0)
  const KEY = [[0, -1, 2, 1], [1.8, -1, 2, 0], [2.3, 0, 2.1, 1], [3.6, 0, 2.1, 1], [4.4, 1.2, 1.9, 0], [5.0, 2.6, 1.3, 0],
    [5.6, 3.0, 1.76, 1], [6.8, 0.9, -0.9, 1], [7.2, 0.9, -0.9, 1], [8.0, -2.6, 1.3, 1], [8.9, -1.4, 2.1, 0], [10, -1, 2, 1]];
  function tdAt(t) {
    t = clamp(t, 0, 10);
    let i = 0;
    while (i < KEY.length - 2 && t > KEY[i + 1][0]) i++;
    const a = KEY[i], b = KEY[i + 1], h = b[0] - a[0], u = (t - a[0]) / h;
    const tan = (k, j) => { const q = KEY[k]; if (q[3]) return 0; const p = KEY[Math.max(0, k - 1)], n = KEY[Math.min(KEY.length - 1, k + 1)]; return (n[j] - p[j]) / (n[0] - p[0]); };
    const hm = (j) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * a[j] + (u3 - 2 * u2 + u) * h * tan(i, j) + (-2 * u3 + 3 * u2) * b[j] + (u3 - u2) * h * tan(i + 1, j); };
    return [hm(1), hm(2)];
  }
  const TYPES = {
    ss: ['稳定焦点', 'STABLE SPIRAL', COL.cyan], us: ['不稳定焦点', 'UNSTABLE SPIRAL', COL.red], ce: ['中心', 'CENTRE', WHITE3],
    sn: ['稳定节点', 'STABLE NODE', COL.cyan], un: ['不稳定节点', 'UNSTABLE NODE', COL.red], sa: ['鞍点', 'SADDLE', COL.red],
  };
  const typeOf = (tr, det) => det < 0 ? 'sa' : tr * tr / 4 - det < 0 ? (Math.abs(tr) < 0.03 ? 'ce' : tr < 0 ? 'ss' : 'us') : tr < 0 ? 'sn' : 'un';
  // A = [[tr/2, 1], [Δ, tr/2]] with Δ = tr²/4 − det has eigenvalues tr/2 ± √Δ; exact e^{As}x, series near Δ = 0
  function flow(tr, det, s, x) {
    const a = tr / 2, D = a * a - det, e = Math.exp(a * s);
    let c, k;
    if (Math.abs(D) < 1e-4) { c = 1 + D * s * s / 2; k = s + D * s * s * s / 6; }
    else if (D > 0) { const r = Math.sqrt(D); c = Math.cosh(r * s); k = Math.sinh(r * s) / r; }
    else { const r = Math.sqrt(-D); c = Math.cos(r * s); k = Math.sin(r * s) / r; }
    return [e * (c * x[0] + k * x[1]), e * (c * x[1] + k * D * x[0])];
  }
  const L = new THREE.Group(), R = new THREE.Group();
  L.position.set(-3.6, 0, 0); L.rotation.y = 0.14; R.position.set(3.6, 0, 0); R.rotation.y = -0.14;
  L.updateMatrixWorld(true); R.updateMatrixWorld(true);
  const TS = 0.8, TD = -0.5, BOX = 2.2, PS = 1.0; // tr–det: local = (tr·TS, (det + TD)·TS); portrait: local = x·PS
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.4), new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 } }, vertexShader: QUAD_VS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    fragmentShader: `uniform float uO; varying vec2 vUv; void main(){
      float tr = (vUv.x - 0.5) * 5.6 / 0.8, det = (vUv.y - 0.5) * 4.4 / 0.8 - (-0.5);
      float edge = smoothstep(0.0, 0.08, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
      vec3 c = det < 0.0 ? vec3(1.0, 0.3, 0.25) * 0.05 : (tr < 0.0 ? vec3(0.25, 0.75, 1.0) : vec3(1.0, 0.3, 0.25)) * (tr * tr / 4.0 - det < 0.0 ? 0.07 : 0.04);
      gl_FragColor = vec4(c * edge * uO, edge * uO); }`,
  }));
  fill.position.z = -0.02;
  const RB = {
    ax: new Ribbon(40, { width: 1.5, color: COL.ice, intensity: 0.9 }),
    par: new Ribbon(130, { width: 1.6, color: WHITE3, intensity: 1.2, dash: 0.12, dashRatio: 0.6 }),
    trail: new Ribbon(30, { width: 2.2, color: WHITE3, intensity: 1.6 }),
    frame: new Ribbon(40, { width: 1.3, color: COL.ice, intensity: 0.7 }),
    str: new Ribbon(600 * 7, { width: 1.3, color: WHITE3, intensity: 1.2 }),
    hero: new Ribbon(4 * 165, { width: 2.2, color: WHITE3, intensity: 1.6 }),
    eig: new Ribbon(8, { width: 1.4, color: WHITE3, intensity: 1.0, dash: 0.1, dashRatio: 0.55 }),
  };
  const gL = new Glow(4, { size: 18, intensity: 1.8 }), gR = new Glow(8, { size: 12, intensity: 1.6 });
  L.add(fill, RB.ax.mesh, RB.par.mesh, RB.trail.mesh, gL.pts);
  R.add(RB.frame.mesh, RB.str.mesh, RB.hero.mesh, RB.eig.mesh, gR.pts);
  const stars = makeStars(1800, 68);
  stars.u.uColor.value.set(0.8, 0.9, 1.1);
  G.add(L, R, stars.pts);
  const r = rng(1881), SEED = Array.from({ length: 600 }, () => [(r() * 2 - 1) * BOX, (r() * 2 - 1) * BOX, r()]);
  const tdL = (tr, det, z = 0) => [tr * TS, (det + TD) * TS, z];
  const wOf = (grp, p) => { const v = new THREE.Vector3(...p).applyMatrix4(grp.matrixWorld); return toScreen(v.x, v.y, v.z); };
  s.hud = { chapter: ACT[2], scene: '相图 · 迹–行列式平面', anchor: 'HENRI POINCARÉ · 1881' };
  return { s, L, R, tdAt, TYPES, typeOf, flow, fill, RB, gL, gR, SEED, BOX, PS, tdL, wOf };
})();
