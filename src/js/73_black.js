// Act III · Black 1927 (scene-local 0–7.5 s). On the Lackawanna ferry, 2 Aug 1927, H. S. Black sketched the
// negative-feedback amplifier on a page of that morning's paper. The block diagram inks itself in the margin, then
// lifts off the page as a lit loop; signal pulses circle it while μ wanders ±50 % and G = μ/(1+μβ) barely moves.
const BK = (() => {
  const s = scene({ id: 'black', b0: SB.black, b1: SB.nyq, fadeIn: 0.6, fadeOut: 0, theme: 'amber', hudIn: 2.9 });
  const G = s.group, PW = 5.0, PH = 3.125, DW = 1600, DH = 1000, K = 2;
  const wp = (x, y, h = 0) => [(x / DW - 0.5) * PW, h, (y / DH - 0.5) * PH];
  // newsprint: dateline, rules, greeked columns, a blank box (the margin Black drew in)
  const BOX = [120, 520, 800, 900];
  const base = paperCanvas(DW * K, DH * K, 1927, { base: '#d3cdbf', grain: 22, foxing: 60 });
  {
    const g = base.getContext('2d'), r = rng(802);
    g.setTransform(K, 0, 0, K, 0, 0);
    g.fillStyle = 'rgba(40,36,30,0.85)'; g.fillRect(60, 150, DW - 120, 3); g.fillRect(60, 158, DW - 120, 1.2); g.fillRect(60, 214, DW - 120, 1.2);
    g.font = `26px ${FONT.fell}`; g.letterSpacing = '6px'; g.textAlign = 'center';
    g.fillText('NEW YORK, TUESDAY, AUGUST 2, 1927', DW / 2, 196); g.letterSpacing = '0px';
    for (let c = 0; c < 6; c++) {
      const x0 = 60 + c * 247, w = 232;
      if (c) { g.fillStyle = 'rgba(40,36,30,0.35)'; g.fillRect(x0 - 8, 236, 1, 740); }
      for (let y = 244; y < 970; y += 13) {
        if (x0 + w > BOX[0] && x0 < BOX[2] && y > BOX[1] && y < BOX[3]) continue;
        const head = r() < 0.06;
        g.fillStyle = `rgba(35,32,28,${head ? 0.7 : 0.28 + 0.12 * r()})`;
        g.fillRect(x0, y, w * (r() < 0.12 ? 0.3 + 0.6 * r() : 0.94 + 0.06 * r()), head ? 6 : 3.2);
      }
    }
    g.strokeStyle = 'rgba(40,36,30,0.5)'; g.lineWidth = 1.2; g.strokeRect(BOX[0], BOX[1], BOX[2] - BOX[0], BOX[3] - BOX[1]);
  }
  const pc = document.createElement('canvas'); pc.width = DW * K; pc.height = DH * K;
  const pg = pc.getContext('2d'), ptex = new THREE.CanvasTexture(pc);
  ptex.anisotropy = renderer.capabilities.getMaxAnisotropy(); ptex.minFilter = THREE.LinearMipmapLinearFilter;
  const PU = { tMap: { value: ptex }, uLamp: { value: new THREE.Vector2(0.5, 0.82) } };
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.ShaderMaterial({
    uniforms: PU, vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tMap; uniform vec2 uLamp; varying vec2 vUv; void main(){
      vec2 d = (vUv - uLamp) * vec2(1.6, 1.0);
      gl_FragColor = vec4(texture2D(tMap, vUv).rgb * (0.18 + 0.55 * exp(-dot(d, d) * 3.0)) * vec3(1.0, 0.94, 0.84), 1.0); }`,
  }));
  paper.rotation.x = -PI / 2;
  // the sketch, in design px: in → Σ → μ → out, and the feedback path back through β into Σ
  const SX = 300, SY = 640, MX0 = 380, MX1 = 510, OUT = 620, FY = 790;
  const circ = (cx, cy, r, n = 40) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(-PI / 2 + (i / n) * TAU * 1.02), cy + r * Math.sin(-PI / 2 + (i / n) * TAU * 1.02)]);
  const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 - 2]];
  const STROKES = [
    { t0: 2.6, t1: 2.85, pts: [[170, SY], [SX - 32, SY]], arrow: true },
    { t0: 2.8, t1: 3.1, pts: circ(SX, SY, 30) },
    { t0: 3.05, t1: 3.2, pts: [[SX + 30, SY], [MX0, SY]] },
    { t0: 3.15, t1: 3.55, pts: box(MX0, SY - 55, MX1, SY + 55), label: ['μ', 445, SY + 18, 54] },
    { t0: 3.5, t1: 3.75, pts: [[MX1, SY], [760, SY]], arrow: true },
    { t0: 3.7, t1: 4.2, pts: [[OUT, SY], [OUT, FY], [510, FY]] },
    { t0: 4.15, t1: 4.45, pts: box(390, FY - 42, 510, FY + 42), label: ['β', 450, FY + 16, 46] },
    { t0: 4.4, t1: 4.9, pts: [[390, FY], [SX, FY], [SX, SY + 32]], arrow: true },
  ];
  const TXT = [
    { t: 3.0, s: '+', x: SX - 54, y: SY - 14, size: 34 }, { t: 4.85, s: '−', x: SX + 14, y: SY + 64, size: 38 },
    { t: 2.75, s: 'in', x: 176, y: SY - 16, size: 34 }, { t: 3.7, s: 'out', x: 700, y: SY - 16, size: 34 },
    { t: 4.9, s: 'Aug. 2, 1927 · H.S.B.', x: 560, y: 880, size: 30 },
  ];
  const INK = '#18223a';
  const wob = (pts, seed) => pts.map(([x, y], i) => [x + 1.6 * noise1(seed + i * 0.37), y + 1.6 * noise1(seed + 50 + i * 0.37)]);
  const dense = (pts) => { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 8; k++) out.push(lerp2(pts[i], pts[i + 1], k / 8)); out.push(pts[pts.length - 1]); return out; };
  const lerp2 = (a, b, f) => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  const INKP = STROKES.map((st, k) => wob(dense(st.pts), k * 11.3));
  function drawInk(lt) {
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.drawImage(base, 0, 0); pg.setTransform(K, 0, 0, K, 0, 0);
    pg.strokeStyle = pg.fillStyle = INK; pg.lineWidth = 2.6; pg.lineCap = pg.lineJoin = 'round';
    let nib = null;
    STROKES.forEach((st, k) => {
      const f = clamp((lt - st.t0) / (st.t1 - st.t0));
      if (f <= 0) return;
      const P = INKP[k], n = Math.max(1, Math.round(f * (P.length - 1)));
      pg.beginPath(); P.slice(0, n + 1).forEach(([x, y], i) => (i ? pg.lineTo(x, y) : pg.moveTo(x, y))); pg.stroke();
      if (f < 1) nib = P[n];
      if (st.arrow && f >= 1) {
        const [x1, y1] = P[P.length - 1], [x0, y0] = P[P.length - 4], a = Math.atan2(y1 - y0, x1 - x0);
        pg.beginPath(); pg.moveTo(x1 - 16 * Math.cos(a - 0.45), y1 - 16 * Math.sin(a - 0.45)); pg.lineTo(x1, y1); pg.lineTo(x1 - 16 * Math.cos(a + 0.45), y1 - 16 * Math.sin(a + 0.45)); pg.stroke();
      }
      if (st.label && f >= 1) { pg.font = `italic ${st.label[3]}px ${FONT.math}`; pg.textAlign = 'center'; pg.fillText(st.label[0], st.label[1], st.label[2]); }
    });
    TXT.forEach((it) => { if (lt >= it.t) { pg.font = `${it.size}px ${FONT.hand}`; pg.textAlign = 'left'; pg.globalAlpha = clamp((lt - it.t) / 0.15); pg.fillText(it.s, it.x, it.y); pg.globalAlpha = 1; } });
    ptex.needsUpdate = true;
    return nib;
  }
  // the lit loop that lifts off the page: forward path amber, feedback path cyan
  const R = { fwd: new Ribbon(400, { width: 2.2, color: COL.amber, intensity: 1.8 }), fb: new Ribbon(300, { width: 2.2, color: COL.cyan, intensity: 1.8 }) };
  const PATH_F = [[170, SY], [SX - 30, SY], [SX + 30, SY], [MX0, SY], [MX1, SY], [OUT, SY], [760, SY]];
  const PATH_B = [[OUT, SY], [OUT, FY], [510, FY], [390, FY], [SX, FY], [SX, SY + 30]];
  const glows = new Glow(24, { size: 12, intensity: 1.8 });
  G.add(paper, R.fwd.mesh, R.fb.mesh, glows.pts);
  s.hud = { chapter: ACT[3], scene: '负反馈放大器', anchor: 'HAROLD S. BLACK · 1927' };
  return { s, G, wp, PU, drawInk, STROKES, R, PATH_F, PATH_B, circ, box, SX, SY, MX0, MX1, FY, glows };
})();
