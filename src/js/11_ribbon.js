// Screen-space-width polyline ribbons. WebGL ignores lineWidth on Windows (ANGLE),
// so every glowing line in the film is a camera-facing strip extruded in the vertex shader.
const WHITE3 = [1, 1, 1];
const RIBBON_VS = `
attribute vec3 prevP; attribute vec3 nextP; attribute float side;
attribute float aW; attribute float aA; attribute vec3 aC; attribute float aU;
uniform vec2 uRes; uniform float uWidth;
varying float vA; varying vec3 vC; varying float vSide; varying float vU;
void main(){
  mat4 pvm = projectionMatrix * modelViewMatrix;
  vec4 c = pvm * vec4(position, 1.0), p = pvm * vec4(prevP, 1.0), n = pvm * vec4(nextP, 1.0);
  float asp = uRes.x / uRes.y;
  vec2 cs = c.xy / c.w, ps = p.xy / p.w, ns = n.xy / n.w;
  cs.x *= asp; ps.x *= asp; ns.x *= asp;
  vec2 d1 = cs - ps, d2 = ns - cs; float l1 = length(d1), l2 = length(d2);
  vec2 dir = l1 < 1e-7 ? d2 / max(l2, 1e-7) : (l2 < 1e-7 ? d1 / l1 : normalize(d1 / l1 + d2 / l2));
  vec2 off = vec2(-dir.y, dir.x) * side * max(uWidth * aW, 1.3) / 1080.0;
  off.x /= asp;
  c.xy += off * c.w;
  gl_Position = c;
  vA = aA * min(1.0, uWidth * aW / 1.3); vC = aC; vSide = side; vU = aU;
}`;
const RIBBON_FS = `
uniform vec3 uColor; uniform float uOpacity, uDash, uDashRatio, uDashShift;
varying float vA; varying vec3 vC; varying float vSide; varying float vU;
void main(){
  float e = 1.0 - abs(vSide);
  float a = vA * uOpacity * smoothstep(0.0, 0.7, e);
  if (uDash > 0.0) a *= step(fract(vU / uDash - uDashShift), uDashRatio);
  if (a <= 0.001) discard;
  gl_FragColor = vec4(uColor * vC * (0.7 + 0.9 * e * e) * a, a);
}`;

class Ribbon {
  constructor(max, o = {}) {
    this.max = max; this.n = 0;
    this.brk = new Uint8Array(max);
    this.P = new Float32Array(max * 3); this.Wd = new Float32Array(max);
    this.Al = new Float32Array(max); this.Co = new Float32Array(max * 3);
    const V = max * 2, g = new THREE.BufferGeometry();
    const mk = (k) => new THREE.BufferAttribute(new Float32Array(V * k), k).setUsage(THREE.DynamicDrawUsage);
    ['position', 'prevP', 'nextP', 'aC'].forEach((a) => g.setAttribute(a, mk(3)));
    ['aW', 'aA', 'aU'].forEach((a) => g.setAttribute(a, mk(1)));
    const side = new Float32Array(V);
    for (let i = 0; i < V; i++) side[i] = i % 2 ? 1 : -1;
    g.setAttribute('side', new THREE.BufferAttribute(side, 1));
    this.index = new THREE.BufferAttribute(new Uint32Array(Math.max(6, (max - 1) * 6)), 1).setUsage(THREE.DynamicDrawUsage);
    g.setIndex(this.index);
    g.setDrawRange(0, 0);
    this.geo = g;
    const c = o.color || WHITE3, k = o.intensity ?? 1;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(W, H) }, uWidth: { value: o.width ?? 2 },
        uColor: { value: new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k) }, uOpacity: { value: o.opacity ?? 1 },
        uDash: { value: o.dash ?? 0 }, uDashRatio: { value: o.dashRatio ?? 0.5 }, uDashShift: { value: 0 },
      },
      vertexShader: RIBBON_VS, fragmentShader: RIBBON_FS,
      transparent: true, depthWrite: false, depthTest: o.depthTest ?? true, side: THREE.DoubleSide,
      blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending, premultipliedAlpha: true,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.order ?? 10;
  }
  get u() { return this.mat.uniforms; }
  color(c, k = 1) { this.u.uColor.value.set(c[0] * k, c[1] * k, c[2] * k); return this; }
  begin() { this.n = 0; return this; }
  push(x, y, z, w = 1, a = 1, c = WHITE3) {
    if (this.n >= this.max) return this;
    const i = this.n++, j = 3 * i;
    this.P[j] = x; this.P[j + 1] = y; this.P[j + 2] = z;
    this.Wd[i] = w; this.Al[i] = a;
    this.Co[j] = c[0]; this.Co[j + 1] = c[1]; this.Co[j + 2] = c[2];
    this.brk[i] = 0;
    return this;
  }
  cut() { if (this.n > 0) this.brk[this.n - 1] = 1; return this; }
  end() {
    const n = this.n, A = this.geo.attributes, P = this.P;
    const pos = A.position.array, pr = A.prevP.array, nx = A.nextP.array;
    const aw = A.aW.array, aa = A.aA.array, ac = A.aC.array, au = A.aU.array, idx = this.index.array;
    let k = 0, u = 0;
    for (let i = 0; i < n; i++) {
      const start = i === 0 || this.brk[i - 1] === 1, stop = i === n - 1 || this.brk[i] === 1;
      const ip = start ? i : i - 1, inx = stop ? i : i + 1, j = 3 * i;
      u = start ? 0 : u + Math.hypot(P[j] - P[3 * ip], P[j + 1] - P[3 * ip + 1], P[j + 2] - P[3 * ip + 2]);
      for (let s = 0; s < 2; s++) {
        const v = 2 * i + s, q = 3 * v;
        pos[q] = P[j]; pos[q + 1] = P[j + 1]; pos[q + 2] = P[j + 2];
        pr[q] = P[3 * ip]; pr[q + 1] = P[3 * ip + 1]; pr[q + 2] = P[3 * ip + 2];
        nx[q] = P[3 * inx]; nx[q + 1] = P[3 * inx + 1]; nx[q + 2] = P[3 * inx + 2];
        ac[q] = this.Co[j]; ac[q + 1] = this.Co[j + 1]; ac[q + 2] = this.Co[j + 2];
        aw[v] = this.Wd[i]; aa[v] = this.Al[i]; au[v] = u;
      }
      if (!stop) {
        const a = 2 * i;
        idx[k++] = a; idx[k++] = a + 1; idx[k++] = a + 2; idx[k++] = a + 1; idx[k++] = a + 3; idx[k++] = a + 2;
      }
    }
    for (const key in A) if (key !== 'side') A[key].needsUpdate = true;
    this.index.needsUpdate = true;
    this.geo.setDrawRange(0, k);
    return this;
  }
  // Convenience: a whole polyline from a sampler f(u) -> [x,y,z], u in [0,1].
  curve(f, samples, w = 1, a = 1, c = WHITE3) {
    for (let i = 0; i <= samples; i++) { const p = f(i / samples); this.push(p[0], p[1], p[2], w, a, c); }
    return this.cut();
  }
}
