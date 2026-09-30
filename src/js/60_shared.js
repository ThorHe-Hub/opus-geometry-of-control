// Shared helpers for the Act I–III scenes: rods between points, paper/newsprint canvases,
// a complex-plane grid rig, and a tiny 2-D plot panel for the UI layer.
const _up = new THREE.Vector3(0, 1, 0), _ra = new THREE.Vector3(), _rb = new THREE.Vector3();
function rodBetween(mesh, a, b, r) {
  _ra.set(...a); _rb.set(...b);
  const d = _rb.clone().sub(_ra), L = d.length() || 1e-6;
  mesh.position.copy(_ra).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(_up, d.divideScalar(L));
  mesh.scale.set(r, L, r);
}
const ROD_GEO = new THREE.CylinderGeometry(1, 1, 1, 14);

// Aged paper: warm base, fibre noise, foxing, darkened edges. Returns a canvas.
function paperCanvas(w, h, seed, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = o.base || '#d9ccae'; g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = 4 * (y * w + x), n = (r() - 0.5) * (o.grain ?? 18) + Math.sin(x * 0.9 + y * 0.013) * 2;
    const ex = Math.min(x, w - x, y, h - y) / Math.min(w, h), edge = 1 - 0.28 * Math.pow(1 - clamp(ex * 6), 2);
    d[i] = (d[i] + n) * edge; d[i + 1] = (d[i + 1] + n) * edge; d[i + 2] = (d[i + 2] + n * 0.9) * edge;
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < (o.foxing ?? 40); k++) {
    const x = r() * w, y = r() * h, rr = 3 + r() * 22, gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(120,80,30,0.16)'); gr.addColorStop(1, 'rgba(120,80,30,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
  }
  return c;
}

// A flat complex-plane rig in the XY plane of `group` with axes, grid and a Ribbon for curves.
function planeRig(group, o = {}) {
  const S = o.scale || 1, ext = o.ext || 4;
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(ext * 2.4, ext * 2.4), gridMat({ cell: S, major: 5, fade: ext * 1.2, intensity: 0.5, axis: true }));
  const axes = new Ribbon(40, { width: 1.5, color: COL.ice, intensity: 0.9 });
  ribArrow(axes, [-ext, 0, 0], [ext, 0, 0], 0.14, 1, 1);
  ribArrow(axes, [0, -ext * 0.8, 0], [0, ext * 0.8, 0], 0.14, 1, 1);
  axes.end();
  group.add(grid, axes.mesh);
  return { grid, axes, S };
}

// s-plane inset on the UI layer: axes, shaded right half-plane, an optional pole trail, current poles as ×
// (cyan stable, red unstable). o: { re: [min, max], im: max |Im|, poles, trail, title, note, alpha }.
function splane(g, x0, y0, w, h, o) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  const [r0, r1] = o.re, im = o.im;
  const sx = (v) => x0 + ((clamp(v, r0, r1) - r0) / (r1 - r0)) * w, sy = (v) => y0 + h / 2 - (clamp(v, -im, im) / im) * (h / 2);
  g.save(); g.globalAlpha = a;
  g.fillStyle = thc('bg', 0.55); g.fillRect(x0, y0, w, h);
  g.strokeStyle = thc('hud', 0.35); g.lineWidth = 1; g.strokeRect(x0, y0, w, h);
  g.beginPath(); g.moveTo(x0, sy(0)); g.lineTo(x0 + w, sy(0)); g.moveTo(sx(0), y0); g.lineTo(sx(0), y0 + h); g.stroke();
  g.fillStyle = 'rgba(255,60,60,0.07)'; g.fillRect(sx(0), y0, x0 + w - sx(0), h);
  g.fillStyle = thc('hud', 0.5);
  (o.trail || []).forEach(([re, v]) => g.fillRect(sx(re) - 1, sy(v) - 1, 2, 2));
  (o.poles || []).forEach(([re, v]) => {
    const X = sx(re), Y = sy(v), d = 6;
    g.strokeStyle = css(re > 1e-6 ? COL.red : COL.cyan); g.lineWidth = 2;
    g.beginPath(); g.moveTo(X - d, Y - d); g.lineTo(X + d, Y + d); g.moveTo(X - d, Y + d); g.lineTo(X + d, Y - d); g.stroke();
  });
  g.restore();
  if (o.title) text(g, o.title, x0 + 8, y0 - 10, { font: FONT.mono, size: 12, spacing: 1.5, color: thc('hud', 0.8 * a) });
  if (o.note) text(g, o.note, x0 + w - 8, y0 + h - 10, { font: FONT.mono, size: 12, align: 'right', color: thc('hud', 0.8 * a) });
}

// Small framed x–y plot on the UI layer. pts: [[x,y],…] in data units; series may set dash.
// Returns the data → pixel maps so callers can annotate.
function plotPanel(g, x0, y0, w, h, o) {
  const a = o.alpha ?? 1;
  const sx = (v) => x0 + ((v - o.x[0]) / (o.x[1] - o.x[0])) * w, sy = (v) => y0 + h - ((clamp(v, o.y[0], o.y[1]) - o.y[0]) / (o.y[1] - o.y[0])) * h;
  if (a <= 0) return { sx, sy };
  g.save();
  g.globalAlpha = a;
  g.fillStyle = thc('bg', 0.55); g.fillRect(x0 - 10, y0 - 30, w + 20, h + 44);
  g.strokeStyle = thc('hud', 0.35); g.lineWidth = 1; g.strokeRect(x0, y0, w, h);
  g.strokeStyle = thc('hud', 0.12);
  (o.gridX || []).forEach((v) => { g.beginPath(); g.moveTo(sx(v), y0); g.lineTo(sx(v), y0 + h); g.stroke(); });
  (o.gridY || []).forEach((v) => { g.beginPath(); g.moveTo(x0, sy(v)); g.lineTo(x0 + w, sy(v)); g.stroke(); });
  g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  (o.series || []).forEach((s) => {
    if (s.pts.length < 2) return;
    g.beginPath();
    s.pts.forEach(([px, py], i) => (i ? g.lineTo(sx(px), sy(py)) : g.moveTo(sx(px), sy(py))));
    g.setLineDash(s.dash || []); g.strokeStyle = s.color; g.lineWidth = s.width || 1.6; g.stroke();
  });
  g.setLineDash([]);
  (o.dots || []).forEach(([px, py, c]) => { g.fillStyle = c; g.beginPath(); g.arc(sx(px), sy(py), 4, 0, TAU); g.fill(); });
  g.restore();
  if (o.title) text(g, o.title, x0, y0 - 12, { font: FONT.mono, size: 12, spacing: 1.5, color: thc('hud', 0.85 * a) });
  if (o.xl) text(g, o.xl, x0 + w, y0 + h + 14, { font: FONT.mono, size: 11, align: 'right', color: thc('hud', 0.6 * a) });
  return { sx, sy };
}
