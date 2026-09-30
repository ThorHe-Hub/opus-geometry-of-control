// Act I · the |H(s)| terrain (scene-local 0–5 s). The resonant pair of the Euler shot, p = −0.35 ± 2.51j,
// lifts the s-plane into log|H(s)|; a knife along σ = 0 cuts it, the right half falls away, and the exposed
// edge is the Bode magnitude |H(jω)|. The score's chirp is the same curve, heard: its gain is |H(jω(t))|.
const TR = (() => {
  const P = [EU.K.SIG, EU.K.OM], wn = Math.hypot(P[0], P[1]), zeta = -P[0] / wn;
  const wr = wn * Math.sqrt(1 - 2 * zeta * zeta);
  const H = (sg, w) => (wn * wn) / (Math.hypot(sg - P[0], w - P[1]) * Math.hypot(sg - P[0], w + P[1]));
  // Sweep ω = ωr·16^(u − ½) during the chirp (110 → 1760 Hz), so the pitch is exactly 440 Hz · ω/ωr.
  const T_CUT = 1.5, T_END = 4.7, wAt = (lt) => wr * Math.pow(16, clamp((lt - T_CUT) / (T_END - T_CUT)) - 0.5);
  return { P, wn, zeta, wr, H, Mr: H(0, wr), T_CUT, T_END, T_RES: (T_CUT + T_END) / 2, wAt };
})();

(() => {
  const s = scene({ id: 'terrain', b0: SB.terrain, b1: SB.watt, fadeIn: 0, fadeOut: 0.35 }); // opens inside the Euler white flash
  const G = s.group, S = EU.K.S, EXT = 4.8, HK = 0.8, HMAX = 3.2;
  // World height of the terrain: a saturating log-magnitude. Mirrored exactly by hgt() in the vertex shader.
  const hOf = (sg, w) => HMAX * Math.tanh(Math.max(0, 0.9 + HK * Math.log(TR.H(sg, w))) / HMAX);
  const U = {
    uP: { value: new THREE.Vector2(TR.P[0], TR.P[1]) }, uWn2: { value: TR.wn * TR.wn }, uK: { value: HK }, uHmax: { value: HMAX }, uS: { value: S },
    uRise: { value: 0 }, uDis: { value: 0 }, uRHP: { value: 0 }, uCam: { value: new THREE.Vector3() },
  };
  const VS = `uniform vec2 uP; uniform float uWn2, uK, uHmax, uS, uRise;
  varying vec3 vW; varying vec3 vN; varying float vH;
  float hgt(vec2 q){ float d = length(q - uP) * length(q - vec2(uP.x, -uP.y));
    float x = max(0.0, 0.9 + uK * log(uWn2 / max(d, 1e-6))); float e = exp(-2.0 * x / uHmax); return uHmax * (1.0 - e) / (1.0 + e); }
  void main(){
    vec2 q = position.xy / uS; float e = 0.02;
    float h = uRise * hgt(q);
    float hx = uRise * (hgt(q + vec2(e, 0.0)) - hgt(q - vec2(e, 0.0))) / (2.0 * e * uS);
    float hy = uRise * (hgt(q + vec2(0.0, e)) - hgt(q - vec2(0.0, e))) / (2.0 * e * uS);
    vW = vec3(position.x, h, -position.y); vN = normalize(vec3(-hx, 1.0, hy)); vH = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vW, 1.0);
  }`;
  const FS = `uniform vec3 uCam; uniform float uDis, uRHP; varying vec3 vW; varying vec3 vN; varying float vH;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gl1(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / max(fwidth(p / s), vec2(1e-5)); return 1.0 - min(min(g.x, g.y), 1.0); }
  void main(){
    vec2 q = vec2(vW.x, -vW.z);
    // after the cut the right half dissolves cell by cell, far cells first, the cut edge last
    if (q.x > 0.0 && uDis > 0.0 && uDis > 0.6 * hash(floor(q * 6.0)) + 0.4 * (1.0 - clamp(q.x / 4.8, 0.0, 1.0))) discard;
    vec3 N = normalize(vN), V = normalize(uCam - vW);
    float fres = pow(max(0.0, 1.0 - abs(dot(N, V))), 2.0), t = clamp(vH / 2.7, 0.0, 1.0);
    float ln = gl1(q, 1.2) * 0.8 + gl1(q, 0.3) * 0.3;
    vec3 hot = mix(vec3(0.45, 0.8, 1.0), vec3(1.0, 0.82, 0.5), smoothstep(0.55, 0.95, t));
    vec3 c = mix(vec3(0.015, 0.035, 0.06), vec3(0.06, 0.16, 0.24), t) * (0.4 + 0.6 * max(0.0, dot(N, normalize(vec3(0.3, 0.9, 0.35)))));
    c += hot * (0.55 * fres + ln * (0.18 + 1.2 * t * t));
    if (q.x > 0.0) c *= mix(vec3(1.0), vec3(1.7, 0.5, 0.45), uRHP);
    gl_FragColor = vec4(c, 1.0);
  }`;
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(EXT * 2, EXT * 2, 240, 240),
    new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, extensions: { derivatives: true }, side: THREE.DoubleSide }));
  terrain.frustumCulled = false; // geometry is displaced in the shader
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(EXT * 2, EXT * 2), gridMat({ cell: S, major: 5, fade: 6.5, intensity: 0.45, axis: true }));
  floor.rotation.x = -PI / 2; floor.position.y = -0.02;
  // The knife: a sheet in the σ = 0 plane, bright along its descending lower edge.
  const knife = new THREE.Mesh(new THREE.PlaneGeometry(EXT * 2, 2.4), new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 } }, vertexShader: QUAD_VS,
    fragmentShader: `uniform float uO; varying vec2 vUv; void main(){
      float a = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 3.0) * uO * (1.0 - smoothstep(0.85, 1.0, abs(vUv.x - 0.5) * 2.0));
      gl_FragColor = vec4(vec3(1.0, 0.85, 0.6) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  }));
  knife.rotation.y = PI / 2;
  // The section face at σ = 0, drafting-style hatch, glowing along its top edge |H(jω)|: once the right
  // half is gone the side view reads as a clean section instead of the terrain's underside.
  const NF = 400, fp = new Float32Array((NF + 1) * 6), fv = new Float32Array((NF + 1) * 2), fi = [];
  for (let i = 0; i <= NF; i++) {
    const w = lerp(-EXT / S, EXT / S, i / NF), z = -w * S;
    fp.set([0, 0, z, 0, hOf(0, w), z], i * 6); fv.set([0, 1], i * 2);
    if (i < NF) fi.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('aV', new THREE.BufferAttribute(fv, 1)); fg.setIndex(fi);
  const face = new THREE.Mesh(fg, new THREE.ShaderMaterial({
    vertexShader: 'attribute float aV; varying vec3 vP; varying float vV; void main(){ vP = position; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; varying float vV; void main(){
      float k = (vP.z + vP.y) * 5.0, hatch = 1.0 - min(abs(fract(k) - 0.5) / max(fwidth(k), 1e-5), 1.0), v = clamp(vV, 0.0, 1.0);
      gl_FragColor = vec4(vec3(0.012, 0.018, 0.028) + vec3(1.0, 0.8, 0.45) * (0.45 * pow(v, 10.0) + 0.05 * v + 0.06 * hatch), 1.0); }`,
    extensions: { derivatives: true }, side: THREE.DoubleSide,
  }));
  face.visible = false;
  const R = {
    axes: new Ribbon(40, { width: 1.5, color: COL.ice, intensity: 0.8 }),
    edge: new Ribbon(4, { width: 2.2, color: [1, 0.9, 0.7], intensity: 2.2 }),
    prof: new Ribbon(820, { width: 2.6, color: COL.gold, intensity: 1.9 }),
    drop: new Ribbon(4, { width: 1.2, color: COL.gold, intensity: 1.2, dash: 0.08, dashRatio: 0.5 }),
  };
  ribArrow(R.axes, [-EXT, 0.012, 0], [EXT + 0.2, 0.012, 0], 0.16, 1, 0.9, WHITE3, [0, 1, 0]);
  ribArrow(R.axes, [0, 0.012, EXT], [0, 0.012, -EXT - 0.2], 0.16, 1, 0.9, WHITE3, [0, 1, 0]);
  R.axes.end();
  const glows = new Glow(16, { size: 16, intensity: 1.7 });
  G.add(floor, terrain, face, knife, glows.pts, makeStars(2400, 37).pts, ...Object.values(R).map((r) => r.mesh));
  s.hud = { chapter: ACT[1], scene: '幅值地形 · 伯德图', anchor: 'HENDRIK W. BODE · 1940' };
  Object.assign(TR, { s, G, S, EXT, hOf, U, knife, face, R, glows });
})();
