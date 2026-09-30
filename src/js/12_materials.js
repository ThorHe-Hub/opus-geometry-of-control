// Glow sprites, rim-lit solids, procedural grid planes and the star field.
const GLOW_VS = `
attribute float aS; attribute float aA; attribute vec3 aC;
uniform float uSize, uPx, uWorld; varying float vA; varying vec3 vC;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = uWorld > 0.5 ? uSize * aS * projectionMatrix[1][1] * 540.0 / max(0.05, -mv.z) : uSize * aS;
  px *= uPx;
  vA = aA * clamp(px / 2.0, 0.0, 1.0);
  gl_PointSize = clamp(px, 2.0, 512.0);
  vC = aC;
}`;
const GLOW_FS = `
uniform vec3 uColor; uniform float uOpacity, uCore; varying float vA; varying vec3 vC;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = (exp(-r2 * 4.5) + uCore * exp(-r2 * 38.0)) * vA * uOpacity * (1.0 - r2);
  gl_FragColor = vec4(uColor * vC * a, a);
}`;

class Glow {
  constructor(max, o = {}) {
    this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    const mk = (k) => new THREE.BufferAttribute(new Float32Array(max * k), k).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', mk(3)); g.setAttribute('aC', mk(3));
    g.setAttribute('aS', mk(1)); g.setAttribute('aA', mk(1));
    g.setDrawRange(0, 0);
    this.geo = g;
    const c = o.color || WHITE3, k = o.intensity ?? 1;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: o.size ?? 8 }, uPx: PX_U, uWorld: { value: o.world ? 1 : 0 },
        uColor: { value: new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k) }, uOpacity: { value: o.opacity ?? 1 }, uCore: { value: o.core ?? 1 },
      },
      vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false,
      depthTest: o.depthTest ?? true, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    });
    this.pts = new THREE.Points(g, this.mat);
    this.pts.frustumCulled = false;
    this.pts.renderOrder = o.order ?? 20;
  }
  get u() { return this.mat.uniforms; }
  begin() { this.n = 0; return this; }
  push(x, y, z, s = 1, a = 1, c = WHITE3) {
    if (this.n >= this.max) return this;
    const i = this.n++, A = this.geo.attributes;
    A.position.array[3 * i] = x; A.position.array[3 * i + 1] = y; A.position.array[3 * i + 2] = z;
    A.aC.array[3 * i] = c[0]; A.aC.array[3 * i + 1] = c[1]; A.aC.array[3 * i + 2] = c[2];
    A.aS.array[i] = s; A.aA.array[i] = a;
    return this;
  }
  end() {
    const A = this.geo.attributes;
    for (const k in A) { A[k].needsUpdate = true; A[k].updateRange = { offset: 0, count: this.n * A[k].itemSize }; }
    this.geo.setDrawRange(0, this.n);
    return this;
  }
}

// Rim-lit "hologram" solid: dark core, bright fresnel edge. Writes depth to occlude lines.
function rimMat(o = {}) {
  const base = o.base || [0.02, 0.03, 0.05], rim = o.rim || COL.cyan, k = o.intensity ?? 2;
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Vector3(...base) }, uRim: { value: new THREE.Vector3(rim[0] * k, rim[1] * k, rim[2] * k) },
      uPow: { value: o.power ?? 2.2 }, uOpacity: { value: 1 },
    },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uBase, uRim; uniform float uPow, uOpacity; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(max(0.0, 1.0 - abs(dot(normalize(vN), normalize(vV)))), uPow);
        float key = 0.35 + 0.65 * max(0.0, dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.5))));
        gl_FragColor = vec4((uBase * key + uRim * f) * uOpacity, 1.0); }`,
  });
}

// Anti-aliased procedural grid on a plane (local xy), with radial fade.
function gridMat(o = {}) {
  const c = o.color || COL.dim, k = o.intensity ?? 1;
  return new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: {
      uColor: { value: new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k) }, uCell: { value: o.cell ?? 1 },
      uMajor: { value: o.major ?? 5 }, uFade: { value: o.fade ?? 12 }, uOpacity: { value: o.opacity ?? 1 }, uAxis: { value: o.axis ? 1 : 0 },
    },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uCell, uMajor, uFade, uOpacity, uAxis; varying vec2 vP;
      // (fwidth floored: a 0/0 here is a NaN, and one NaN pixel turns into black blocks through the bloom mips)
      float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / max(fwidth(p / s), vec2(1e-5)); vec2 l = 1.0 - smoothstep(0.0, 1.5, g); return max(l.x, l.y); }
      void main(){ float a = grid(vP, uCell) * 0.35 + grid(vP, uCell * uMajor) * 0.65;
        // lines under a ribbon axis alias against it and bloom into dashes: drop them
        if (uAxis > 0.5) a *= smoothstep(1.0, 3.0, min(abs(vP.x) / max(fwidth(vP.x), 1e-5), abs(vP.y) / max(fwidth(vP.y), 1e-5)));
        a *= 1.0 - smoothstep(uFade * 0.35, uFade, length(vP));
        if (a < 0.003) discard; gl_FragColor = vec4(uColor * a * uOpacity, a * uOpacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
}

// upper: only the sky above the horizon (scenes with a ground plane; the stars draw without depth test).
function makeStars(n, seed, rMin = 80, rMax = 200, upper = false) {
  const r = rng(seed), s = new Glow(n, { size: 1, intensity: 1, core: 0.6, depthTest: false, order: 0 });
  s.begin();
  for (let i = 0; i < n; i++) {
    const u0 = r() * 2 - 1, u = upper ? 0.02 + 0.98 * Math.abs(u0) : u0, a = r() * TAU, rr = lerp(rMin, rMax, r()), q = Math.sqrt(1 - u * u);
    const warm = r();
    const c = warm < 0.15 ? [1, 0.85, 0.7] : warm < 0.3 ? [0.7, 0.8, 1] : [0.85, 0.9, 1];
    s.push(q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr, 1.4 + 3.2 * Math.pow(r(), 6), 0.25 + 0.75 * Math.pow(r(), 2), c);
  }
  s.end();
  return s;
}
