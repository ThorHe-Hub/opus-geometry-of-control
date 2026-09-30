// Act III · Nyquist 1932 → Evans 1948 (scene-local 0–12.5 s). The Nyquist plane: L(jω) = K/(1+jω)³ swells with
// the loop gain; at K = 8 (3.75 s) it passes through −1 and then encircles it twice: Z = N + P = 2, the amplifier
// sings. Then the s-plane: the root locus of k(s+1)/(s(s−2)) drags the villain pole +2 and its partner through jω
// at k = 2 (7.5 s, on the bells) into the left half-plane.
const NQ = (() => {
  const s = scene({ id: 'nyq', b0: SB.nyq, b1: SB.pend, fadeIn: 0, fadeOut: 0, theme: 'amber' });
  const G = s.group, NS = 1.35, NC = -0.3, RS = 0.9, RC = -1.2;
  const nq = (re, im, z = 0) => [(re - NC) * NS, im * NS, z]; // Nyquist plane → world
  const sp = (re, im, z = 0) => [(re - RC) * RS, im * RS, z]; // s-plane → world
  const grid = (cell, w, h, at) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gridMat({ cell, major: 5, fade: 7, intensity: 0.4, color: COL.amber, axis: true })); m.position.set(...at); return m; };
  const gN = grid(NS, 8.4, 6.6, nq(0, 0, -0.02)), gS = grid(RS, 7.8, 5.0, sp(0, 0, -0.02));
  const rhp = new THREE.Mesh(new THREE.PlaneGeometry(2.9 * RS, 5 * RS), new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 } }, vertexShader: QUAD_VS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    fragmentShader: `uniform float uO; varying vec2 vUv; void main(){
      float a = uO * 0.12 * (0.6 + 0.4 * exp(-vUv.x * 3.0)) * smoothstep(0.0, 0.15, min(vUv.y, 1.0 - vUv.y)) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
      gl_FragColor = vec4(vec3(1.0, 0.22, 0.18) * a, a); }`,
  }));
  rhp.position.set(...sp(1.45, 0, -0.015));
  const R = {
    axN: new Ribbon(24, { width: 1.5, color: COL.amber, intensity: 1.2 }),
    axS: new Ribbon(24, { width: 1.5, color: COL.amber, intensity: 1.2 }),
    unit: new Ribbon(130, { width: 1.1, color: COL.amber, intensity: 0.8, dash: 0.1, dashRatio: 0.5 }),
    curve: new Ribbon(1210, { width: 2.4, color: [1, 0.85, 0.6], intensity: 1.8 }),
    chev: new Ribbon(40, { width: 2, color: [1, 0.85, 0.6], intensity: 1.8 }),
    wind: new Ribbon(4, { width: 1.6, color: WHITE3, intensity: 1.4 }),
    locF: new Ribbon(400, { width: 1.1, color: COL.amber, intensity: 0.7, dash: 0.08, dashRatio: 0.5 }),
    loc: new Ribbon(400, { width: 2.4, color: WHITE3, intensity: 1.8 }),
    mark: new Ribbon(60, { width: 2.2, color: WHITE3, intensity: 1.8 }),
  };
  ribArrow(R.axN, nq(-3.6, 0), nq(2.3, 0), 0.14, 1, 1); ribArrow(R.axN, nq(0, -2.3), nq(0, 2.3), 0.14, 1, 1); R.axN.end();
  ribArrow(R.axS, sp(-5.3, 0), sp(2.9, 0), 0.12, 1, 1); ribArrow(R.axS, sp(0, -2.5), sp(0, 2.5), 0.12, 1, 1); R.axS.end();
  R.unit.curve((u) => nq(Math.cos(u * TAU), Math.sin(u * TAU), 0.005), 120, 1, 0.7).end();
  // root-locus geometry, exact: real segments, then the circle |s + 1| = √3 between the break points 4 ∓ 2√3
  const KB = 4 - 2 * Math.sqrt(3), KI = 4 + 2 * Math.sqrt(3), R3 = Math.sqrt(3);
  function branch(rb, b, k, al, z) { // b = 0: from +2 over the upper arc; b = 1: from 0 over the lower arc
    const col = (re) => (re > 1e-9 ? COL.red : COL.cyan), sg = b ? -1 : 1, push = (re, im, a = al) => rb.push(...sp(re, im, z), 1, a, col(re));
    push(b ? 0 : 2, 0); push(A3.rlPoles(Math.min(k, KB))[b][0], 0);
    if (k > KB) {
      const p = A3.rlPoles(Math.min(k, KI))[b], th1 = Math.atan2(Math.abs(p[1]), p[0] + 1);
      for (let i = 0; i <= 60; i++) { const th = (i / 60) * th1; push(-1 + R3 * Math.cos(th), sg * R3 * Math.sin(th)); }
    }
    if (k > KI) push(A3.rlPoles(k)[b][0], 0);
    rb.cut();
  }
  branch(R.locF, 0, 8.5, 0.8, 0.004); branch(R.locF, 1, 8.5, 0.8, 0.004); R.locF.end();
  const cross = (re, c) => { const d = 0.1; R.mark.push(...sp(re - d, -d, 0.01), 1, 1, c).push(...sp(re + d, d, 0.01), 1, 1, c).cut().push(...sp(re - d, d, 0.01), 1, 1, c).push(...sp(re + d, -d, 0.01), 1, 1, c).cut(); };
  cross(0, COL.amber); cross(2, COL.red);
  R.mark.curve((u) => sp(-1 + 0.1 * Math.cos(u * TAU), 0.1 * Math.sin(u * TAU), 0.01), 24, 1, 1, COL.amber);
  R.mark.end();
  const glows = new Glow(8, { size: 14, intensity: 1.8 });
  const stars = makeStars(1600, 75);
  stars.u.uColor.value.set(1.0, 0.84, 0.66);
  G.add(gN, gS, rhp, glows.pts, stars.pts, ...Object.values(R).map((r) => r.mesh));
  s.hud = (lt) => lt < 5.8
    ? { chapter: ACT[3], scene: '奈奎斯特判据 · 绕 −1 的圈数', anchor: 'HARRY NYQUIST · 1932' }
    : { chapter: ACT[3], scene: '根轨迹 · 增益拖动极点', anchor: 'WALTER R. EVANS · 1948' };
  return { s, nq, sp, gN, gS, rhp, R, branch, glows };
})();
