// Shared props: the pen (cold open and inverted pendulum are the same object),
// additive fresnel shells, floor spots, ribbon arrows.
function flat(geo) { const g = geo.toNonIndexed(); g.computeVertexNormals(); return g; }

// A hologram pencil standing on its graphite point at the local origin, pointing +Y.
function makePen(L) {
  const g = new THREE.Group();
  const add = (geo, mat, y, edges, ec) => {
    const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m);
    if (edges) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({
        color: new THREE.Color(ec[0] * 1.6, ec[1] * 1.6, ec[2] * 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      e.position.y = y; g.add(e); m.userData.edges = e;
    }
    return m;
  };
  const tipH = 0.08, woodH = 0.34, capH = 0.3, bodyH = L - tipH - woodH - capH;
  const point = new THREE.ConeGeometry(0.026, tipH, 6); point.rotateX(PI);
  add(point, rimMat({ base: [0.25, 0.25, 0.28], rim: [1, 1, 1], intensity: 3 }), tipH / 2);
  add(flat(new THREE.CylinderGeometry(0.075, 0.026, woodH, 6)), rimMat({ base: [0.12, 0.07, 0.03], rim: COL.amber, intensity: 2.2 }), tipH + woodH / 2, true, COL.amber);
  const body = add(flat(new THREE.CylinderGeometry(0.075, 0.075, bodyH, 6)), rimMat({ base: [0.02, 0.05, 0.08], rim: COL.cyan, intensity: 2.4 }), tipH + woodH + bodyH / 2, true, COL.cyan);
  add(new THREE.CylinderGeometry(0.081, 0.081, 0.14, 20), rimMat({ base: [0.12, 0.1, 0.05], rim: COL.gold, intensity: 2.6 }), L - capH + 0.07);
  add(new THREE.CylinderGeometry(0.076, 0.076, 0.16, 20), rimMat({ base: [0.1, 0.02, 0.04], rim: COL.magenta, intensity: 2 }), L - 0.08);
  // Recolour the barrel (rim + edges): warm in Act III until the catch, cyan once the loop closes.
  g.tint = (c) => {
    body.material.uniforms.uRim.value.set(c[0] * 2.4, c[1] * 2.4, c[2] * 2.4);
    body.userData.edges.material.color.setRGB(c[0] * 1.6, c[1] * 1.6, c[2] * 1.6);
  };
  return g;
}

function shellMat(c, k = 1, pow = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k) }, uPow: { value: pow }, uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uPow, uOpacity; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(max(0.0, 1.0 - abs(dot(normalize(vN), normalize(vV)))), uPow); float a = (0.04 + f) * uOpacity;
        gl_FragColor = vec4(uC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
}

function spotMat(c, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k) }, uOpacity: { value: 1 } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform vec3 uC; uniform float uOpacity; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = exp(-d * d * 5.0) * (1.0 - smoothstep(0.8, 1.0, d)) * uOpacity;
        gl_FragColor = vec4(uC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });
}

// Arrow from a to b (world), head size h, drawn into a ribbon batch (no begin/end).
function ribArrow(rb, a, b, h, w = 1, al = 1, c = WHITE3, up = [0, 0, 1]) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1e-6;
  const u = d.map((x) => x / L);
  let s = [u[1] * up[2] - u[2] * up[1], u[2] * up[0] - u[0] * up[2], u[0] * up[1] - u[1] * up[0]];
  const sl = Math.hypot(...s) || 1; s = s.map((x) => x / sl);
  rb.push(...a, w, al, c).push(...b, w, al, c).cut();
  const hb = [b[0] - u[0] * h, b[1] - u[1] * h, b[2] - u[2] * h];
  rb.push(hb[0] + s[0] * h * 0.55, hb[1] + s[1] * h * 0.55, hb[2] + s[2] * h * 0.55, w, al, c)
    .push(...b, w, al, c)
    .push(hb[0] - s[0] * h * 0.55, hb[1] - s[1] * h * 0.55, hb[2] - s[2] * h * 0.55, w, al, c).cut();
}

// Inverted-pendulum-on-a-point dynamics θ̈ = λ² sin θ (linearisation has poles ±λ).
function penFall(theta0, T, lam = VILLAIN, dt = 1 / 480) {
  let th = theta0, w = 0;
  const f = (x) => lam * lam * Math.sin(x);
  for (let t = 0; t < T; t += dt) {
    const h = Math.min(dt, T - t);
    const k1 = w, l1 = f(th), k2 = w + 0.5 * h * l1, l2 = f(th + 0.5 * h * k1);
    const k3 = w + 0.5 * h * l2, l3 = f(th + 0.5 * h * k2), k4 = w + h * l3, l4 = f(th + h * k3);
    th += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); w += (h / 6) * (l1 + 2 * l2 + 2 * l3 + l4);
    if (th > PI / 2) return { th: PI / 2, w, hit: t };
  }
  return { th, w, hit: -1 };
}
