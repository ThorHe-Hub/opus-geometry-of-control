// Act I · Euler → Laplace, one continuous shot (scene-local seconds 0–20):
// 0–2.9 chapter card · 2.6 phasor e^{iωt} · 5.6 helix + cos/sin shadows · 9.5 damping σ<0
// 11.8 the whole signal e^{st} collapses into one point · 12.9 the plane becomes the s-plane
// 14.3–17 pole zoo with impulse responses · 17.8 the villain pole s = +2.
const EU = (() => {
  // HUD waits for the chapter card (0–2.9 s) so the act title is not shown twice.
  const s = scene({ id: 'euler', b0: SB.euler, b1: SB.terrain, fadeIn: 0.4, fadeOut: 0, hudIn: 2.8 }); // ends in a white flash → terrain
  const G = s.group, plane = new THREE.Group();
  const K = { R: 2.2, OM: TAU * 0.4, V: 0.85, TV: 8, SIG: -0.35, S: 1.2, TPH: 2.6, FY: -2.9, WX: -3.1, NT: 480 };
  G.add(plane, makeStars(2600, 21).pts);

  const mesh = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    plane.add(m);
    return m;
  };
  const grid = mesh(new THREE.PlaneGeometry(9.6, 9.6), gridMat({ cell: K.S, major: 5, fade: 6.5, intensity: 0.55, axis: true }));
  const floorG = mesh(new THREE.PlaneGeometry(6.6, 9), gridMat({ cell: 0.5, major: 4, fade: 6, intensity: 0.45, color: COL.gold }), [0, K.FY, -3.9], [-PI / 2, 0, 0]);
  const wallG = mesh(new THREE.PlaneGeometry(9, 6.6), gridMat({ cell: 0.5, major: 4, fade: 6, intensity: 0.45, color: COL.cyan }), [K.WX, 0, -3.9], [0, PI / 2, 0]);
  const tint = (dir, c) => new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Vector3(...c) }, uO: { value: 0 }, uD: { value: dir } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform vec3 uC; uniform float uO, uD; varying vec2 vUv;
      void main(){ float d = uD > 0.0 ? vUv.x : 1.0 - vUv.x;
        float a = exp(-d * 2.6) * (1.0 - smoothstep(0.36, 0.5, abs(vUv.y - 0.5))) * uO;
        gl_FragColor = vec4(uC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
  const tintL = mesh(new THREE.PlaneGeometry(3.6, 7.4), tint(-1, COL.cyan), [-1.8, 0, -0.01]);
  const tintR = mesh(new THREE.PlaneGeometry(3.6, 7.4), tint(1, COL.red), [1.8, 0, -0.01]);

  const R = {
    axes: new Ribbon(80, { width: 1.6, color: COL.ice, intensity: 0.9 }),
    circle: new Ribbon(260, { width: 1.4, color: COL.ice, intensity: 0.7 }),
    phasor: new Ribbon(16, { width: 3.4, color: COL.white, intensity: 2.2 }),
    dash: new Ribbon(16, { width: 1.3, color: COL.white, intensity: 1.1, dash: 0.14, dashRatio: 0.55 }),
    trail: new Ribbon(K.NT + 4, { width: 2.4, color: COL.ice, intensity: 1.5 }),
    cos: new Ribbon(K.NT + 4, { width: 2.2, color: COL.gold, intensity: 1.7 }),
    sin: new Ribbon(K.NT + 4, { width: 2.2, color: COL.cyan, intensity: 1.7 }),
    tAxis: new Ribbon(8, { width: 1.3, color: COL.ice, intensity: 0.6 }),
    marks: new Ribbon(120, { width: 2.4, color: COL.white, intensity: 1.8 }),
    glyph: new Ribbon(900, { width: 1.8, color: COL.white, intensity: 1.6 }),
  };
  Object.values(R).forEach((r) => plane.add(r.mesh));
  const glows = new Glow(400, { size: 16, intensity: 1.6 });
  plane.add(glows.pts);

  const POLES = [
    { t: 12.85, s: K.SIG, w: K.OM, g: 14.5 },
    { t: 14.3, s: -1.5, w: 1.4 }, { t: 15.0, s: -0.8, w: 0 }, { t: 15.7, s: -2.2, w: 2.4 },
    { t: 16.4, s: 0, w: 1.8 }, { t: 17.0, s: -0.4, w: 0.9 }, { t: 17.8, s: VILLAIN, w: 0, v: true },
  ];
  const poleCol = (p) => (p.s > 0.01 ? COL.red : p.s < -0.01 ? COL.cyan : COL.white);

  // Impulse response h(τ) = e^{στ} cos ωτ as a small plot standing on the pole (local +z is "up").
  function glyphAt(p, lt) {
    const u1 = clamp((lt - (p.g ?? p.t)) / (p.v ? 1.8 : 1.3));
    if (u1 <= 0) return;
    const x0 = p.s * K.S + 0.16, y0 = p.w * K.S, c = poleCol(p), n = 64, span = p.v ? 1.1 : 5, cap = p.v ? 6 : 1.9;
    R.glyph.push(x0, y0, 0.55, 0.6, 0.35, c).push(x0 + 1.3, y0, 0.55, 0.6, 0.35, c).cut();
    let last = null;
    for (let i = 0; i <= n * u1; i++) {
      const u = i / n, h = Math.exp(p.s * u * span) * Math.cos(p.w * u * span);
      last = [x0 + u * 1.3, y0, 0.55 + 0.42 * clamp(h, -cap, cap)];
      R.glyph.push(...last, 1, 1, c);
      if (h > cap) break;
    }
    R.glyph.cut();
    if (p.v && last) glows.push(...last, 2.2 + 0.6 * Math.sin(lt * 20), 1, COL.red);
  }

  // Conjugate pair (or single real pole) drawn as × marks with glow.
  function poleMark(p, lt) {
    const a = E.outBack(clamp((lt - p.t) / 0.4));
    if (a <= 0) return;
    const pulse = p.v ? 1 + 0.35 * Math.sin(lt * TAU * 1.6) + 0.5 * sstep(17.8, 20, lt) : 1;
    const fl = Math.exp(-Math.max(0, lt - p.t) / 0.25);
    const ys = p.w === 0 ? [0] : [p.w, -p.w], c = poleCol(p);
    ys.forEach((w, j) => {
      const aj = j === 1 && p.t === POLES[0].t ? E.outBack(clamp((lt - 13.1) / 0.4)) : a;
      if (aj <= 0) return;
      const x = p.s * K.S, y = w * K.S, d = 0.12 * aj * pulse;
      R.marks.push(x - d, y - d, 0.01, 1, 1, c).push(x + d, y + d, 0.01, 1, 1, c).cut();
      R.marks.push(x - d, y + d, 0.01, 1, 1, c).push(x + d, y - d, 0.01, 1, 1, c).cut();
      glows.push(x, y, 0.02, (1.3 + 2.5 * fl) * pulse * aj, 1, c);
    });
  }

  const cam = new CamPath([
    { t: 0, p: [0, 0, 11.5], l: [0, 0, 0], fov: 40 },
    { t: 3.5, p: [0, 0, 10.6], l: [0, 0, 0] },
    { t: 6.2, p: [0.6, 0.4, 9.6], l: [0, 0, -0.4] },
    { t: 8.6, p: [7.4, 3.6, 5.4], l: [-0.4, -0.4, -3.4] },
    { t: 11.6, p: [6.0, 4.8, 7.0], l: [-0.4, 0, -2.6] },
    { t: 12.8, p: [2.2, 2.6, 9.8], l: [-0.3, 1.4, -0.8] },
    { t: 14.5, p: [0.3, 7.8, 7.6], l: [0, 0, -0.5] },
    { t: 17.6, p: [0.0, 7.0, 7.0], l: [0.2, 0, -0.4], e: 'lin' },
    { t: 20, p: [2.4, 4.2, 5.2], l: [2.2, 0.5, -0.3], e: 'in' },
  ]);
  const _v = new THREE.Vector3();
  const W3 = (x, y, z) => { _v.set(x, y, z); plane.localToWorld(_v); return toScreen(_v.x, _v.y, _v.z); };
  s.hud = (lt) => lt < 12.9
    ? { chapter: ACT[1], scene: '复平面 · 欧拉公式', anchor: 'LEONHARD EULER · 1748' }
    : { chapter: ACT[1], scene: '拉普拉斯域 · s 平面', anchor: 'PIERRE-SIMON LAPLACE · 1812' };
  return { s, G, plane, K, R, glows, grid, floorG, wallG, tintL, tintR, POLES, glyphAt, poleMark, cam, W3 };
})();
