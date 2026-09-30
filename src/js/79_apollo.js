// Act III · Kálmán 1960 → Apollo 11 (scene-local 0–12.5 s). The lunar module descends from 100 ft; the cyan shell is
// the navigation filter's 3σ belief (72_act3_math.js): it grows with process noise between fixes and collapses at
// each fix (the bells: radar altitude, slant beams, landmarks, final), the true position always inside it.
const AP = (() => {
  const s = scene({ id: 'apollo', b0: SB.apollo, b1: SB.rocket, fadeIn: 0, fadeOut: 0.6, theme: 'amber' }); // dips into Act IV
  const G = s.group, r = rng(1969);
  // the Sea of Tranquility: craters kept clear of the landing site
  const CR = [];
  while (CR.length < 70) { const x = r() * 60 - 30, z = r() * 60 - 36, rad = 0.4 + 2.6 * Math.pow(r(), 2.2); if (Math.hypot(x, z) > rad + 2.5) CR.push([x, z, rad, 0.2 + 0.2 * r()]); }
  const hAt = (x, z) => { let h = 0; for (const [cx, cz, rad, dp] of CR) { const q = Math.hypot(x - cx, z - cz) / rad; if (q < 1.6) h += q < 1 ? -dp * rad * (1 - q * q) + 0.1 * rad * Math.pow(q, 6) : 0.1 * rad * Math.exp(-((q - 1) * (q - 1)) * 30); } return h; };
  const mg = new THREE.PlaneGeometry(80, 80, 200, 200);
  mg.rotateX(-PI / 2);
  { const p = mg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i), p.getZ(i))); mg.computeVertexNormals(); }
  const moon = new THREE.Mesh(mg, new THREE.ShaderMaterial({
    extensions: { derivatives: true }, vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; varying vec3 vN; void main(){
      float sun = max(0.0, dot(normalize(vN), normalize(vec3(-0.85, 0.19, -0.49))));
      vec2 g = abs(fract(vP.xz / 1.2 - 0.5) - 0.5) / max(fwidth(vP.xz / 1.2), vec2(1e-5));
      float line = 1.0 - min(min(g.x, g.y), 1.0), fade = 1.0 - smoothstep(14.0, 36.0, length(vP.xz));
      vec3 c = vec3(0.07, 0.055, 0.04) * (0.25 + 1.8 * sun) + vec3(1.0, 0.62, 0.22) * 0.1 * line;
      gl_FragColor = vec4(c * fade, 1.0); }`,
  }));
  // the LM, hologram: gold descent stage, silver ascent stage; its origin is the footpad plane
  const gold = rimMat({ base: [0.12, 0.08, 0.02], rim: COL.gold, intensity: 2.4 }), silver = rimMat({ base: [0.06, 0.06, 0.07], rim: [0.85, 0.9, 1.0], intensity: 2.0 });
  const eM = (c) => new THREE.LineBasicMaterial({ color: new THREE.Color(...c.map((v) => v * 1.5)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const LM = new THREE.Group(), part = (geo, mat, ec, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), eM(ec))); LM.add(m); return m; };
  part(flat(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 8)), gold, COL.gold, 0.62).rotation.y = PI / 8;
  part(flat(new THREE.CylinderGeometry(0.44, 0.5, 0.46, 7)), silver, [0.85, 0.9, 1], 1.1);
  part(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 12), silver, [0.85, 0.9, 1], 1.4);
  part(new THREE.ConeGeometry(0.2, 0.26, 14, 1, true), gold, COL.amber, 0.28);
  const legs = new Ribbon(24, { width: 1.8, color: COL.gold, intensity: 1.6 });
  for (let k = 0; k < 4; k++) {
    const a = PI / 4 + (k * PI) / 2, c = Math.cos(a), sn = Math.sin(a);
    legs.push(0.55 * c, 0.78, 0.55 * sn, 1, 1).push(1.05 * c, 0.02, 1.05 * sn, 1, 1).cut().push(0.58 * c, 0.44, 0.58 * sn, 1, 0.8).push(0.85 * c, 0.2, 0.85 * sn, 1, 0.8).cut();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), gold); pad.position.set(1.05 * c, 0.015, 1.05 * sn); LM.add(pad);
  }
  legs.end(); LM.add(legs.mesh);
  // the belief: a cyan 3σ shell with its rings, the fix beams, the estimate-to-truth link
  // drawn over the LM (no depth test): once small, the belief sits inside the vehicle and must stay visible
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), shellMat(COL.cyan, 0.6));
  shell.matrixAutoUpdate = false; shell.material.depthTest = false;
  const R = {
    rings: new Ribbon(200, { width: 1.2, color: COL.cyan, intensity: 1.3, depthTest: false }),
    beams: new Ribbon(24, { width: 1.6, color: [1, 0.92, 0.75], intensity: 1.8 }),
    link: new Ribbon(4, { width: 1.1, color: WHITE3, intensity: 1.0, dash: 0.05, dashRatio: 0.5 }),
  };
  const glows = new Glow(16, { size: 12, intensity: 1.8, depthTest: false }), dust = new Glow(420, { size: 0.12, world: true, color: [1, 0.85, 0.6], intensity: 0.6, core: 0.2 });
  const DUST = Array.from({ length: 420 }, (_, i) => [fract(i * 0.618034) * TAU, 0.8 + 1.8 * r(), fract(i * 0.7548776), 0.5 + r()]);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 24), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
    fragmentShader: `varying vec3 vN; varying vec3 vW; void main(){
      vec3 V = normalize(cameraPosition - vW); float d = max(0.0, dot(vN, normalize(vec3(-0.85, 0.19, -0.49)))), rim = pow(max(0.0, 1.0 - dot(vN, V)), 3.0);
      gl_FragColor = vec4((vec3(0.35, 0.75, 1.0) * (1.6 * d + 0.25 * rim) + vec3(1.0) * 0.4 * pow(d, 8.0)) * 0.6, 1.0); }`,
  }));
  const stars = makeStars(2600, 79, 80, 200, true);
  stars.u.uColor.value.set(1.0, 0.86, 0.7);
  G.add(moon, LM, shell, earth, glows.pts, dust.pts, stars.pts, ...Object.values(R).map((q) => q.mesh));
  s.hud = { chapter: ACT[3], scene: '卡尔曼滤波 · 阿波罗 11 号', anchor: 'KÁLMÁN 1960 · APOLLO 11 1969' };
  return { s, LM, shell, R, glows, dust, DUST, earth };
})();
