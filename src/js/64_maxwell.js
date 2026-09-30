// Act II · Maxwell 1868, "On Governors" (scene-local 0–10 s). A manuscript page writes itself under a lamp and
// ends in the criterion for the cubic, bc > ad. Then the modern reading floats over the page: the Vyshnegradsky
// plane X = β/a₀^⅓, Y = a₁/a₀^⅔ with the boundary XY = 1, which Watt's governor crosses as friction grows.
// Finally the page turns into a blueprint: stability has become something one can draw and compute.
const MX = (() => {
  const s = scene({ id: 'maxwell', b0: SB.maxwell, b1: SB.state, fadeIn: 0, fadeOut: 0, theme: (lt) => ['brass', 'blueprint', sstep(8.3, 9.6, lt)] });
  const G = s.group, PW = 4.2, PH = 2.7, DW = 1400, DH = 900, K = 2;
  const wp = (x, y, h = 0) => [(x / DW - 0.5) * PW, h, (y / DH - 0.5) * PH]; // design px on the page → world
  // the page: an aged-paper base redrawn with the ink written by lt, plus an emissive layer for the glowing criterion
  const base = paperCanvas(DW * K, DH * K, 1868, { base: '#dccfb2', grain: 16, foxing: 160 });
  const pc = document.createElement('canvas'); pc.width = DW * K; pc.height = DH * K;
  const pg = pc.getContext('2d'), ptex = new THREE.CanvasTexture(pc);
  ptex.anisotropy = renderer.capabilities.getMaxAnisotropy(); ptex.minFilter = THREE.LinearMipmapLinearFilter;
  const ec = document.createElement('canvas'); ec.width = DW; ec.height = DH;
  const eg = ec.getContext('2d'), etex = new THREE.CanvasTexture(ec);
  const PU = { tMap: { value: ptex }, uLamp: { value: new THREE.Vector2(0.3, 0.62) }, uBP: { value: 0 } };
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.ShaderMaterial({
    uniforms: PU, vertexShader: QUAD_VS, extensions: { derivatives: true },
    fragmentShader: `uniform sampler2D tMap; uniform vec2 uLamp; uniform float uBP; varying vec2 vUv;
    float gl1(vec2 p){ vec2 g = abs(fract(p - 0.5) - 0.5) / max(fwidth(p), vec2(1e-5)); return 1.0 - min(min(g.x, g.y), 1.0); }
    void main(){
      vec3 t = texture2D(tMap, vUv).rgb; float l = dot(t, vec3(0.2126, 0.7152, 0.0722));
      vec2 d = (vUv - uLamp) * vec2(1.55, 1.0);
      vec3 lit = t * (0.2 + 0.6 * exp(-dot(d, d) * 3.2)) * vec3(1.0, 0.93, 0.8);
      float ink = clamp((0.7 - l) / 0.5, 0.0, 1.0);
      vec3 bp = mix(vec3(0.02, 0.07, 0.17), vec3(0.72, 0.88, 1.0), ink) + vec3(0.1, 0.2, 0.35) * gl1(vUv * vec2(28.0, 18.0)) * 0.35;
      gl_FragColor = vec4(mix(lit, bp, uBP), 1.0); }`,
  }));
  paper.rotation.x = -PI / 2;
  const glowL = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.ShaderMaterial({
    uniforms: { tMap: { value: etex }, uGain: { value: 0 } }, vertexShader: QUAD_VS,
    fragmentShader: 'uniform sampler2D tMap; uniform float uGain; varying vec2 vUv; void main(){ vec4 c = texture2D(tMap, vUv); gl_FragColor = vec4(c.rgb * c.a * uGain, c.a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  }));
  glowL.rotation.x = -PI / 2; glowL.position.y = 0.002;
  // the chart square on the right half of the page: (cx, cy) ∈ [0, RG]²
  const RG = 2.4, X0 = 0.3, CW = 1.35, Z0 = 0.51, cp = (cx, cy, h = 0.006) => [X0 + (cx / RG) * CW, h, Z0 - (cy / RG) * CW];
  const FU = { uA: { value: 0 }, uS: { value: 0 }, uR: { value: RG }, uK: { value: 0.35 } };
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(CW, CW), new THREE.ShaderMaterial({
    uniforms: FU, vertexShader: QUAD_VS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    fragmentShader: `uniform float uA, uS, uR, uK; varying vec2 vUv; void main(){
      float q = vUv.x * vUv.y * uR * uR, e = exp(-abs(q - 1.0) * 9.0);
      vec3 c = q > 1.0 ? vec3(0.2, 0.75, 1.0) * (0.05 + 0.25 * uS) : vec3(1.0, 0.25, 0.2) * 0.05;
      c = (c + vec3(1.0, 0.85, 0.6) * e * 0.06) * uK;
      gl_FragColor = vec4(c * uA, uA); }`,
  }));
  fill.rotation.x = -PI / 2; fill.position.set(X0 + CW / 2, 0.004, Z0 - CW / 2);
  const R = {
    axes: new Ribbon(60, { width: 1.6, color: COL.gold, intensity: 1.3 }),
    curve: new Ribbon(220, { width: 2.4, color: [1, 0.9, 0.7], intensity: 1.8 }),
    path: new Ribbon(4, { width: 1.3, color: COL.gold, intensity: 1.2, dash: 0.03, dashRatio: 0.5 }),
  };
  const glows = new Glow(8, { size: 14, intensity: 1.8 });
  G.add(paper, glowL, fill, glows.pts, ...Object.values(R).map((r) => r.mesh));

  const INK = '#2b1e10', FL = FONT.fell, Q = `italic 27px ${FL}`;
  const ITEMS = [
    { t0: 0.3, t1: 1.5, x: 425, y: 128, s: 'ON  GOVERNORS.', font: `64px ${FL}`, sp: 8, align: 'center' },
    { t0: 1.3, t1: 1.8, x: 425, y: 176, s: 'By J. Clerk Maxwell, M.A., F.R.SS.L. & E.', font: `italic 25px ${FL}`, align: 'center' },
    { t0: 1.8, t1: 2.0, rule: [300, 200, 550] },
    { t0: 2.0, t1: 2.7, x: 90, y: 268, s: '… the condition of stability is, that all the possible roots,', font: Q },
    { t0: 2.7, t1: 3.3, x: 90, y: 312, s: 'and all the possible parts of the impossible roots,', font: Q },
    { t0: 3.3, t1: 3.8, x: 90, y: 356, s: 'of a certain equation shall be negative.', font: Q },
    { t0: 3.8, t1: 4.2, x: 90, y: 420, s: 'For an equation of the third degree,', font: Q },
    { t0: 4.2, t1: 4.9, x: 425, y: 494, tex: 'a x^3 + b x^2 + c x + d = 0', size: 40, align: 'center' },
    { t0: 5.0, t1: 5.6, x: 425, y: 590, tex: 'b c > a d', size: 60, align: 'center' },
  ];
  function drawPage(lt) {
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.drawImage(base, 0, 0); pg.setTransform(K, 0, 0, K, 0, 0);
    let nib = null;
    for (const it of ITEMS) {
      const f = clamp((lt - it.t0) / (it.t1 - it.t0));
      if (f <= 0) continue;
      if (it.rule) { pg.fillStyle = INK; pg.globalAlpha = 0.8; pg.fillRect(it.rule[0], it.rule[1], (it.rule[2] - it.rule[0]) * f, 1.6); pg.globalAlpha = 1; continue; }
      if (it.tex) {
        const b = drawTex(pg, it.tex, it.x, it.y, { size: it.size, color: INK, freshColor: '#101c34', reveal: f, align: it.align });
        if (f < 1) nib = [it.x - b.w / 2 + b.w * f, it.y - it.size * 0.25];
        continue;
      }
      pg.font = it.font; pg.letterSpacing = (it.sp || 0) + 'px';
      const w = pg.measureText(it.s).width, x0 = it.align === 'center' ? it.x - w / 2 : it.x;
      pg.save(); pg.beginPath(); pg.rect(x0 - 4, it.y - 80, w * f + 4, 120); pg.clip();
      pg.fillStyle = INK; pg.textAlign = 'left'; pg.textBaseline = 'alphabetic'; pg.fillText(it.s, x0, it.y);
      pg.restore(); pg.letterSpacing = '0px';
      if (f < 1) nib = [x0 + w * f, it.y - 8];
    }
    ptex.needsUpdate = true;
    return nib;
  }
  function drawEmissive(f) {
    const it = ITEMS[ITEMS.length - 1];
    eg.clearRect(0, 0, DW, DH);
    if (f > 0) drawTex(eg, it.tex, it.x, it.y, { size: it.size, color: 'rgb(255,190,90)', reveal: f, align: 'center', glow: 9, glowColor: 'rgba(255,150,40,0.8)' });
    etex.needsUpdate = true;
  }
  s.hud = { chapter: ACT[2], scene: '论调速器 · 稳定性判据', anchor: 'J. C. MAXWELL · 1868' };
  return { s, PU, glowL, FU, R, glows, cp, RG, wp, drawPage, drawEmissive };
})();
