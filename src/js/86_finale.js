// Finale (scene-local 0–22.5 s). The villain pole's last stand: a red star swelling as e^{2t} bursts at 2.5 s.
// At 5.0 s the loop closes: every particle is a double integrator under PD control (81_act4_math.js) and is
// steered onto a point of the title, with the real overshoot and settling of a step response. Then the pen of
// the cold open stands on its LQR cart: control is what makes the unstable stand.
const FN = (() => {
  const s = scene({ id: 'finale', b0: SB.finale, b1: SB.end, fadeIn: 0, fadeOut: 0.1, theme: 'cold', hudAlpha: (lt) => 1 - sstep(10.2, 11.0, lt) });
  const G = s.group, NP = 15000, T_B = 2.5, T_C = 5.0, TY = 0.9, SC = 0.0068;
  const TGT = new Float32Array(NP * 3), E0 = new Float32Array(NP * 3), BB = new Float32Array(NP * 3), P0 = new Float32Array(NP * 3), V0 = new Float32Array(NP * 3), HUE = new Float32Array(NP);
  let built = false;
  function build() { // lazily, after boot has loaded the fonts
    const c = document.createElement('canvas'); c.width = 1800; c.height = 440;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `900 200px ${FONT.zh}`; g.letterSpacing = '42px'; g.fillText('控制的几何', 900 + 21, 250);
    g.font = `48px ${FONT.title}`; g.letterSpacing = '12px'; g.fillText('THE GEOMETRY OF CONTROL', 900 + 6, 380);
    const d = g.getImageData(0, 0, c.width, c.height).data, cand = [];
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 140) cand.push([x, y]);
    const r = rng(2026);
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    for (let i = 0; i < NP; i++) {
      const [px, py] = cand[i % cand.length];
      TGT.set([(px - 900 + (r() - 0.5) * 2) * SC, (210 - py + (r() - 0.5) * 2) * SC + TY, 0], i * 3);
      // burst from inside the star, outward, never toward the camera (sprites near the lens would flood the frame)
      const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u), sp = 3.5 + 8.5 * Math.pow(r(), 1.7), rr = 0.3 * Math.cbrt(r());
      const dir = [q * Math.cos(a), u, q * Math.sin(a)];
      dir[2] = clamp(dir[2], -0.9, 0.35);
      P0.set([dir[0] * rr, TY + 0.4 + dir[1] * rr, dir[2] * rr], i * 3); V0.set(dir.map((v) => v * sp), i * 3);
      const k = 0.9, e1 = Math.exp(-k * (T_C - T_B));
      for (let j = 0; j < 3; j++) {
        const x5 = P0[i * 3 + j] + (V0[i * 3 + j] / k) * (1 - e1), v5 = V0[i * 3 + j] * e1, e0 = x5 - TGT[i * 3 + j];
        E0[i * 3 + j] = e0; BB[i * 3 + j] = (v5 + A4.SG * e0) / A4.WD; // e(t) = e^{−σt}(e₀ cos ω_d t + B sin ω_d t)
      }
      HUE[i] = r();
    }
    built = true;
  }
  const pts = new Glow(NP, { size: 3.2, intensity: 1.6, core: 0.5 });
  const star = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), shellMat(COL.red, 1.4));
  star.position.set(0, TY + 0.4, 0);
  const ring = new Ribbon(260, { width: 2.2, color: [1, 0.7, 0.55], intensity: 1.8 });
  const core = new Glow(4, { size: 30, intensity: 2.2 });
  // the pen of the cold open, on the LQR cart of Act III, small, under the title; x(t) = e^{A_cl t}x₀ with two kicks
  const pen = new THREE.Group(), cart = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.6), rimMat({ base: [0.02, 0.05, 0.08], rim: COL.cyan, intensity: 0.8 }));
  cart.position.y = 0.25; pen.add(cart);
  const stick = makePen(CP.l); stick.position.y = 0.42; stick.tint(COL.cyan); pen.add(stick);
  pen.scale.setScalar(0.28); pen.position.set(0, -1.05, 0.8);
  const rail = new Ribbon(8, { width: 1.3, color: COL.ice, intensity: 1.0 });
  rail.push(-1.6, -1.06, 0.8, 1, 0.7).push(1.6, -1.06, 0.8, 1, 0.7).cut().end();
  const PHZ = 60, NPH = Math.ceil(9 * PHZ) + 2, TAB = new Float64Array(NPH * 4), Ed = M.expm(M.scale(CP.Acl, 1 / PHZ));
  { let x = [0, 0, 0.07, 0]; for (let i = 0; i < NPH; i++) { const t = 13.5 + i / PHZ; if (Math.abs(t - 16.25) < 0.5 / PHZ || Math.abs(t - 18.75) < 0.5 / PHZ) x[3] += 0.18; TAB.set(x, i * 4); x = M.mv(Ed, x); } }
  const penAt = (lt) => { const q = clamp((lt - 13.5) * PHZ, 0, NPH - 1.001), i = Math.floor(q), u = q - i; return [0, 1, 2, 3].map((j) => lerp(TAB[i * 4 + j], TAB[i * 4 + 4 + j], u)); };
  const stars = makeStars(2600, 86);
  G.add(pts.pts, star, ring.mesh, core.pts, pen, rail.mesh, stars.pts);
  s.hud = { chapter: 'FINALE', scene: '终章 · 从复杂到控制', anchor: 'CLOSED LOOP' }; // Michroma has no CJK or U+2212
  return { s, NP, T_B, T_C, TY, TGT, E0, BB, P0, V0, HUE, pts, star, ring, core, pen, stick, rail, penAt, isBuilt: () => built, build };
})();
