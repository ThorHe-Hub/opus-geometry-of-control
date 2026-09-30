// HUD, subtitles, chapter cards (drawn on the 2D layers) and keyframed camera paths.
const LB = (1080 - 1920 / 2.39) / 2; // letterbox bar height at 2.39:1 (≈138 px)

function hudFrame(g, t, info, alpha) {
  if (alpha <= 0) return;
  const top = 76, c = thp('hud'), a = alpha;
  if (info.chapter) text(g, info.chapter, 96, top, { font: FONT.title, size: 13, spacing: 5, color: c + (0.75 * a) + ')' });
  if (info.scene) text(g, info.scene, 96, top + 26, { font: FONT.zh, size: 16, spacing: 4, color: c + (0.55 * a) + ')' });
  if (info.anchor) text(g, info.anchor, W - 96, top, { font: FONT.title, size: 13, spacing: 5, color: c + (0.75 * a) + ')', align: 'right' });
  const tc = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`;
  text(g, `T ${tc}  ·  BAR ${String(Math.floor(t / BAR) + 1).padStart(3, '0')}`, W - 96, top + 26, { font: FONT.mono, size: 12, spacing: 2, color: c + (0.4 * a) + ')', align: 'right' });
  // corner brackets of the picture area
  const y0 = LB + 18, y1 = H - LB - 18, x0 = 64, x1 = W - 64, L = 22;
  g.strokeStyle = c + (0.3 * a) + ')'; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, y0 + L); g.lineTo(x0, y0); g.lineTo(x0 + L, y0);
  g.moveTo(x1 - L, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + L);
  g.moveTo(x0, y1 - L); g.lineTo(x0, y1); g.lineTo(x0 + L, y1);
  g.moveTo(x1 - L, y1); g.lineTo(x1, y1); g.lineTo(x1, y1 - L);
  g.stroke();
}

// Small data panel: array of strings (tex allowed when line starts with '$').
function panel(g, x, y, lines, o = {}) {
  const a = o.alpha ?? 1, lh = o.lh || 24, col = o.color || thp('lo');
  if (a <= 0) return;
  const wMax = Math.max(...lines.map((s) => (s.startsWith('$') ? 12 : s.length))) * (o.size || 13) * 0.62;
  g.fillStyle = thc('bg', 0.55 * a);
  g.fillRect(x - 22, y - 26, wMax + 44, lh * lines.length + 22);
  g.fillStyle = col + (0.35 * a) + ')';
  g.fillRect(x - 14, y - 16, 1, lh * lines.length + 6);
  lines.forEach((s, i) => {
    const yy = y + i * lh, r = o.reveal !== undefined ? clamp(o.reveal * lines.length - i) : 1;
    if (r <= 0) return;
    if (s.startsWith('$')) drawTex(g, s.slice(1), x, yy, { size: o.tsize || 20, color: col + (0.9 * a) + ')', alpha: r });
    else text(g, o.decode ? decode(s, r, o.t || 0) : s, x, yy, { font: FONT.mono, size: o.size || 13, spacing: 1.5, color: col + (0.8 * a * Math.min(1, r * 2)) + ')' });
  });
}

// Equation bar: the governing formula of the shot, centred in the top letterbox bar.
// Words live in the bottom bar, mathematics in the top bar; neither covers the picture.
function eqBar(src, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  drawTex(ui, src, W / 2, o.line2 ? 122 : 84, {
    size: o.line2 ? 21 : o.size || 34, align: 'center', color: o.color || thc(o.line2 ? 'lo' : 'hi'),
    alpha: a, reveal: o.reveal, glow: 12, glowColor: thc('glow', 0.55),
  });
}

// Pole list for panels: one row per conjugate pair, "σ ± ωj".
function poleRows(roots) {
  return roots.filter(([, im]) => im >= 0).map(([re, im]) => (im > 1e-9 ? `${fmt(re)} ± ${im.toFixed(2)}j` : fmt(re)));
}

function subtitles(g, t, cues) {
  for (const [a, b, zh, en] of cues) {
    if (t < a - 0.01 || t > b + 0.01) continue;
    const al = win(t, a, b, 0.35, 0.45), rise = (1 - E.out(invLerp(a, a + 0.6, t))) * 6;
    const y = H - LB + 58 + rise;
    text(g, zh, W / 2, y, { font: FONT.zh, size: 32, weight: 600, spacing: 4, align: 'center', color: thc('hi', 0.95 * al) });
    if (en) text(g, en, W / 2, y + 40, { font: FONT.en, size: 25, style: 'italic', weight: 500, spacing: 1.5, align: 'center', color: thc('lo', 0.85 * al) });
  }
}

// Chapter card on the bloom layer: roman numeral, rule, zh + en title.
// Chapter card: crisp glyphs on the UI layer, only a faint halo on the bloom layer.
function chapterCard(_g, lt, roman, zh, en, dur = 3.2) {
  if (lt < 0 || lt > dur) return;
  const a = win(lt, 0, dur, 0.5, 0.7), cx = W / 2, cy = H / 2, w = 420 * E.out(invLerp(0.1, 1.2, lt));
  const zs = decode(zh, invLerp(0.2, 1.0, lt), lt), zo = { font: FONT.zh, size: 46, weight: 600, spacing: 22, align: 'center' };
  text(ui, roman, cx, cy - 58, { font: FONT.title, size: 24, spacing: 18, align: 'center', color: thc('lo', 0.8 * a) });
  fx.fillStyle = thc('hud', 0.35 * a); fx.fillRect(cx - w / 2, cy - 30, w, 1.5);
  text(fx, zs, cx, cy + 22, { ...zo, color: thc('glow', 0.18 * a) });
  text(ui, zs, cx, cy + 22, { ...zo, color: thc('hi', 0.9 * a), glow: 8, glowColor: thc('glow', 0.35) });
  text(ui, en, cx, cy + 66, { font: FONT.title, size: 14, spacing: 10, align: 'center', color: thc('lo', 0.75 * a * invLerp(0.5, 1.2, lt)) });
}

// Keyframed camera. keys: {t, p:[x,y,z], l:[x,y,z], fov, roll, e:'io'|'lin'|'in'|'out'}
class CamPath {
  constructor(keys) { this.k = keys; }
  static cr(a, b, c, d, u) {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  }
  sample(t) {
    const k = this.k, n = k.length;
    if (t <= k[0].t) return k[0];
    if (t >= k[n - 1].t) return k[n - 1];
    let i = 0;
    while (i < n - 2 && t > k[i + 1].t) i++;
    const a = k[Math.max(0, i - 1)], b = k[i], c = k[i + 1], d = k[Math.min(n - 1, i + 2)];
    let u = (t - b.t) / (c.t - b.t);
    const e = c.e || 'io';
    u = e === 'lin' ? u : e === 'in' ? E.in(u) : e === 'out' ? E.out(u) : E.inOutSine(u);
    const f = (key) => [0, 1, 2].map((j) => CamPath.cr(a[key][j], b[key][j], c[key][j], d[key][j], u));
    return { p: f('p'), l: f('l'), fov: lerp(b.fov ?? 40, c.fov ?? 40, u), roll: lerp(b.roll || 0, c.roll || 0, u) };
  }
  apply(t, shake = 0, seed = 0, off = null) {
    const s = this.sample(t), o = off || [0, 0, 0];
    const sx = shake * noise1(t * 0.9 + seed), sy = shake * noise1(t * 0.8 + seed + 17), sz = shake * noise1(t * 0.7 + seed + 41);
    camera.position.set(s.p[0] + sx + o[0], s.p[1] + sy + o[1], s.p[2] + sz + o[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(s.l[0] + sx * 0.3 + o[0], s.l[1] + sy * 0.3 + o[1], s.l[2] + o[2]);
    if (s.roll) camera.rotateZ(s.roll);
    if (camera.fov !== (s.fov ?? 40)) { camera.fov = s.fov ?? 40; }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
}
