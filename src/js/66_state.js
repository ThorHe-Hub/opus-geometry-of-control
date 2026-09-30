// Act II · state space (scene-local 0–12.5 s). The saddle-focus of Act III, ẋ = Ax with λ = {+2, −0.4 ± 2j}.
// A lattice is carried by the exact flow map x ↦ e^{Aτ}x: the stable plane (eigenvalues −0.4 ± 2j) spirals in,
// the unstable eigenvector (λ = +2, the villain) stretches it, and the lattice tears along the stable plane.
const ST = (() => {
  const s = scene({ id: 'state', b0: SB.state, b1: SB.phase, fadeIn: 0, fadeOut: 0, theme: 'blueprint' });
  const G = s.group, A = SF.A, Vi = M.inv(SF.V), uOf = (x) => Vi[0][0] * x[0] + Vi[0][1] * x[1] + Vi[0][2] * x[2];
  const phi = (tau) => M.expm(M.scale(A, tau));
  const T_TEAR = 7.5; // bar 28, where the score's growl enters
  // flow time τ(lt): still, slow drift, a pause while the skeleton lights up, then the tear
  const tauAt = (lt) => lt < 2 ? 0 : lt < 5 ? 0.22 * E.inOut((lt - 2) / 3) : lt < T_TEAR ? 0.22 + 0.04 * (lt - 5) / (T_TEAR - 5)
    : 0.26 + 1.54 * E.inOut(clamp((lt - T_TEAR) / 4.6));
  // lattice: 5×5 lines along each axis, spacing 1.2; each line split into 6 segments
  const NL = 5, SPC = 1.2, SEG = 6, half = ((NL - 1) / 2) * SPC, LINES = [];
  for (let ax = 0; ax < 3; ax++) for (let i = 0; i < NL; i++) for (let j = 0; j < NL; j++) {
    const a = -half + i * SPC, b = -half + j * SPC, L = 1.35 * half;
    const p0 = [0, 0, 0], p1 = [0, 0, 0], o = [(ax + 1) % 3, (ax + 2) % 3];
    p0[ax] = -L; p1[ax] = L; p0[o[0]] = p1[o[0]] = a; p0[o[1]] = p1[o[1]] = b;
    LINES.push([p0, p1]);
  }
  const NODES = [];
  for (let i = 0; i < NL; i++) for (let j = 0; j < NL; j++) for (let k = 0; k < NL; k++) NODES.push([-half + i * SPC, -half + j * SPC, -half + k * SPC]);
  const TRAIL = NODES.filter((_, i) => i % 2 === 0);
  // an orthonormal frame of the stable plane (for the disc and the guide spirals)
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const e1 = nrm(SF.v1), d = e1[0] * SF.v2[0] + e1[1] * SF.v2[1] + e1[2] * SF.v2[2], e2 = nrm(SF.v2.map((v, i) => v - d * e1[i]));
  const nz = nrm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 } }, vertexShader: QUAD_VS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
    fragmentShader: `uniform float uO; varying vec2 vUv; void main(){
      float r = length(vUv - 0.5) * 2.0, k = r * 7.0, ring = 1.0 - min(abs(fract(k) - 0.5) / max(fwidth(k), 1e-5), 1.0);
      float a = (0.05 + 0.35 * ring) * (1.0 - smoothstep(0.7, 1.0, r)) * uO;
      gl_FragColor = vec4(vec3(0.3, 0.8, 1.0) * a, a); }`,
    extensions: { derivatives: true },
  }));
  disc.matrixAutoUpdate = false;
  disc.matrix.set(e1[0], e2[0], nz[0], 0, e1[1], e2[1], nz[1], 0, e1[2], e2[2], nz[2], 0, 0, 0, 0, 1);
  const u = SF.u, R = {
    lat: new Ribbon(LINES.length * (SEG + 6), { width: 1.3, color: WHITE3, intensity: 1.1 }),
    trail: new Ribbon(TRAIL.length * 14, { width: 1.1, color: WHITE3, intensity: 1.0 }),
    eig: new Ribbon(8, { width: 2.4, color: COL.red, intensity: 1.8 }),
    guide: new Ribbon(8 * 64, { width: 1.6, color: COL.cyan, intensity: 1.5 }),
  };
  R.eig.push(...u.map((x) => -40 * x), 1, 1).push(...u.map((x) => 40 * x), 1, 1).cut().end();
  const glows = new Glow(NODES.length + LINES.length + 20, { size: 9, intensity: 1.5, core: 0.6 });
  const stars = makeStars(2200, 66);
  stars.u.uColor.value.set(0.8, 0.9, 1.1);
  G.add(disc, glows.pts, stars.pts, ...Object.values(R).map((r) => r.mesh));
  s.hud = { chapter: ACT[2], scene: '状态空间 · 流映射', anchor: 'STATE EQUATIONS · ẋ = Ax' };
  return { s, A, phi, uOf, tauAt, T_TEAR, LINES, SEG, NODES, TRAIL, e1, e2, disc, R, glows };
})();
