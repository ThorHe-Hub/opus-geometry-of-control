// tex-lite layout → positioned items; drawTex renders with optional glyph-by-glyph reveal.
const _mc = document.createElement('canvas').getContext('2d');
const TEXCOL = { r: css(COL.red), c: css(COL.cyan), g: css(COL.gold), a: css(COL.amber), t: css(COL.teal), w: '#fff', d: css(COL.dim, 1, 1.6), v: css(COL.violet), m: css(COL.magenta) };

function texLayout(nodes, size, st = {}) {
  const items = [];
  let x = 0, asc = size * 0.72, des = size * 0.22, lastIt = false;
  const place = (b, dy = 0) => {
    b.items.forEach((it) => items.push({ ...it, x: it.x + x, y: it.y + dy, col: it.col || st.col }));
    asc = Math.max(asc, b.asc - dy); des = Math.max(des, b.des + dy); x += b.w;
  };
  for (let k = 0; k < nodes.length; k++) {
    const n = nodes[k];
    if (!n) continue;
    if (n.t === 'ch') {
      const it = !!n.it && !n.fn, bf = n.bf || st.bf;
      const font = `${it ? 'italic ' : ''}${bf ? 600 : 400} ${size}px ${FONT.math}`;
      _mc.font = font;
      let pv = null;
      for (let j = k - 1; j >= 0 && !pv; j--) if (nodes[j] && nodes[j].t !== 'sp') pv = nodes[j];
      const unary = !pv || (pv.t === 'ch' && (OPS_REL.has(pv.s) || OPS_BIN.has(pv.s) || pv.s === '(' || pv.s === ',' || pv.s === '['));
      const rel = OPS_REL.has(n.s), bin = OPS_BIN.has(n.s) && !unary;
      const pad = rel ? size * 0.28 : bin ? size * 0.22 : 0;
      const w = _mc.measureText(n.s).width + (it ? size * 0.04 : 0) + (n.fn ? size * 0.12 : 0);
      x += pad;
      items.push({ k: 'g', s: n.s, font, x, y: 0, col: st.col });
      x += w + pad; lastIt = it;
    } else if (n.t === 'sp') x += n.w * size;
    else if (n.t === 'grp') place(texLayout(n.b, size, st));
    else if (n.t === 'col') place(texLayout(n.b, size, { ...st, col: TEXCOL[n.c] || n.c }));
    else if (n.t === 'ss') {
      if (n.base) place(texLayout([n.base], size, st));
      const x0 = x; let w = 0;
      const baseIt = n.base && n.base.t === 'ch' && n.base.it;
      if (n.sup) { const b = texLayout(n.sup, size * 0.68, st); x = x0 + (baseIt ? size * 0.05 : size * 0.02); place(b, -size * 0.42); w = Math.max(w, x - x0); }
      if (n.sub) { const b = texLayout(n.sub, size * 0.68, st); x = x0 - (baseIt ? size * 0.03 : 0); place(b, size * 0.2); w = Math.max(w, x - x0); }
      x = x0 + w + size * 0.03;
    } else if (n.t === 'frac') {
      const N = texLayout(n.n, size * 0.8, st), D = texLayout(n.d, size * 0.8, st);
      const w = Math.max(N.w, D.w) + size * 0.2, ax = size * 0.27, gap = size * 0.14;
      const x0 = x;
      x = x0 + (w - N.w) / 2; place(N, -(ax + gap + N.des));
      x = x0 + (w - D.w) / 2; place(D, -ax + gap + D.asc);
      items.push({ k: 'r', x: x0 + size * 0.05, y: -ax, w: w - size * 0.1, h: Math.max(1.2, size * 0.045), col: st.col });
      x = x0 + w + size * 0.08;
    } else if (n.t === 'sqrt') {
      const B = texLayout(n.b, size, st), x0 = x, top = -(B.asc + size * 0.12), bot = B.des;
      const pts = [[0, -size * 0.25], [size * 0.12, -size * 0.32], [size * 0.28, bot], [size * 0.5, top], [size * 0.62 + B.w, top]];
      items.push({ k: 'p', x: x0, y: 0, pts, lw: Math.max(1.2, size * 0.05), col: st.col });
      x = x0 + size * 0.58; place(B); x += size * 0.08; asc = Math.max(asc, -top + size * 0.05);
    } else if (n.t === 'acc') {
      const B = texLayout(n.b, size, st), x0 = x;
      place(B);
      const cx = x0 + B.w * 0.55, yTop = -Math.max(size * 0.5, Math.min(B.asc, size * 0.72)) - size * 0.14;
      if (n.k === 'dot' || n.k === 'ddot') {
        const d = n.k === 'dot' ? [0] : [-size * 0.1, size * 0.1];
        d.forEach((o) => items.push({ k: 'd', x: cx + o, y: yTop, r: size * 0.055, col: st.col }));
      } else if (n.k === 'hat') items.push({ k: 'p', x: cx, y: yTop, pts: [[-size * 0.14, size * 0.06], [0, -size * 0.07], [size * 0.14, size * 0.06]], lw: size * 0.05, col: st.col });
      else items.push({ k: 'r', x: cx - size * 0.18, y: yTop, w: size * 0.36, h: size * 0.045, col: st.col });
      asc = Math.max(asc, -yTop + size * 0.1);
    } else if (n.t === 'mat') {
      const rows = [[[]]];
      n.b.forEach((q) => {
        if (q.t === 'row') rows.push([[]]);
        else if (q.t === 'amp') rows[rows.length - 1].push([]);
        else rows[rows.length - 1][rows[rows.length - 1].length - 1].push(q);
      });
      const cs = size * 0.9, cells = rows.map((r) => r.map((c) => texLayout(c, cs, st)));
      const nc = Math.max(...cells.map((r) => r.length)), rowH = cs * 1.25;
      const colW = Array.from({ length: nc }, (_, j) => Math.max(...cells.map((r) => (r[j] ? r[j].w : 0))));
      const hTot = rowH * rows.length, top = -size * 0.27 - hTot / 2, x0 = x, br = size * 0.18;
      x = x0 + br + size * 0.1;
      cells.forEach((r, i) => {
        let cx = x0 + br + size * 0.15;
        r.forEach((c, j) => { const sx = x; x = cx + colW[j] - c.w; place(c, top + rowH * (i + 0.72)); x = sx; cx += colW[j] + size * 0.55; });
      });
      const wIn = colW.reduce((a, b) => a + b, 0) + size * 0.55 * (nc - 1) + size * 0.3, lw = Math.max(1.2, size * 0.045);
      const bot = top + hTot;
      items.push({ k: 'p', x: x0, y: 0, pts: [[br, top], [0, top], [0, bot], [br, bot]], lw, col: st.col });
      items.push({ k: 'p', x: x0 + br + wIn, y: 0, pts: [[0, top], [br, top], [br, bot], [0, bot]], lw, col: st.col });
      x = x0 + br * 2 + wIn + size * 0.1;
      asc = Math.max(asc, -top); des = Math.max(des, bot);
    }
  }
  return { w: x, asc, des, items };
}

const _texCache = new Map();
function texBox(src, size) {
  const key = size + '|' + src;
  let b = _texCache.get(key);
  if (!b) {
    if (_texCache.size > 3000) _texCache.clear(); // live readouts create a new string every frame
    b = texLayout(texParse(src), size); b.count = b.items.length; _texCache.set(key, b);
  }
  return b;
}

// Draw a formula. o: size, color, alpha, align ('left'|'center'|'right'), reveal (0..1), glow.
function drawTex(g, src, x, y, o = {}) {
  const size = o.size || 40, b = texBox(src, size), al = o.alpha ?? 1;
  if (al <= 0) return b;
  const x0 = o.align === 'center' ? x - b.w / 2 : o.align === 'right' ? x - b.w : x;
  const rev = (o.reveal ?? 1) * b.count, base = o.color || '#fff';
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px';
  if (o.glow) { g.shadowBlur = o.glow * g.getTransform().a; g.shadowColor = o.glowColor || base; }
  b.items.forEach((it, i) => {
    const a = clamp(rev - i);
    if (a <= 0) return;
    const fresh = rev < b.count ? clamp(1 - (rev - i) / 3) : 0;
    g.globalAlpha = al * a;
    g.fillStyle = g.strokeStyle = fresh > 0.5 ? o.freshColor || '#fff' : it.col || base;
    if (it.k === 'g') { g.font = it.font; g.fillText(it.s, x0 + it.x, y + it.y); }
    else if (it.k === 'r') g.fillRect(x0 + it.x, y + it.y - it.h / 2, it.w, it.h);
    else if (it.k === 'd') { g.beginPath(); g.arc(x0 + it.x, y + it.y, it.r, 0, TAU); g.fill(); }
    else if (it.k === 'p') {
      g.lineWidth = it.lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
      it.pts.forEach(([px, py], j) => (j ? g.lineTo : g.moveTo).call(g, x0 + it.x + px, y + it.y + py));
      g.stroke();
    }
  });
  g.globalAlpha = 1; g.shadowBlur = 0;
  return b;
}
