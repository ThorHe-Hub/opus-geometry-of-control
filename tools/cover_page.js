// Page side of tools/cover.mjs, evaluated in index.html?export&noaudio&clean&w=… (Canvas 2D only).
// shoot → 16:10 crop around the equilibrium → grade (clarity, tone curve, cool shadows, vibrance, vignette) → title.
window.__cover = (() => {
  const X = window.__export, L = X.lib, TITLE = '控制的几何', SUB = 'THE GEOMETRY OF CONTROL', TAG = 'FROM COMPLEX NUMBERS TO AUTONOMY';
  const cv = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const sm = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  let seed = 12345;
  const dith = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5;
  const DEF = {
    // the chosen cover: wave B spiralling in at 133.25 s, 0.2 s tripod exposure, pulled back so the title has dark sky
    t: 133.25, exp: 0.2, sub: 16, shutter: 0.5, dolly: 1.3, zoom: 1.3, fy: 0.58, focus: [0, 0, 0], sharp: 0.35,
    ar: 1.6, name: '', sizes: [1920], clean: true, // output aspect, file prefix, downscaled widths, untitled copies
    // nd / ndH: graduated ND from the top edge (strength, reach as a fraction of the height) so the title sits on dark
    G: { clar: 0.3, clarR: 40, black: 0.02, gamma: 0.95, contrast: 0.22, cool: 0.35, vib: 0.18, vig: 0.62, vig0: 0.22, nd: 0.45, ndH: 0.42 },
    // lang 'en': the film's title card (Michroma) fitted to fitW as the main line, its tagline below
    T: { y: 250, size: 150, sp: 30, ruleW: 640, subSize: 28, subSp: 13, scrim: 0.45, formula: '', lang: 'zh', fitW: 1560 },
  };
  const opts = (o) => ({ ...DEF, ...o, G: { ...DEF.G, ...o.G }, T: { ...DEF.T, ...o.T } });

  // Film time t as a still. exp > 0: long exposure of exp seconds (sub sub-frames) with the camera held at its pose
  // at t; otherwise the film's own motion blur. dolly > 1 pulls the camera back from the origin (it looks at ≈ 0).
  function shoot(o) {
    const pose = X.pose(o.t);
    X.hold(o.exp > 0 || o.dolly !== 1 ? { ...pose, p: pose.p.map((v) => v * o.dolly) } : null);
    const src = o.exp > 0 ? X.render(o.t, o.sub, o.exp, 1) : X.render(o.t, o.sub, o.shutter, 60);
    const f = X.project(...o.focus), k = src.width / 1920;
    X.hold(null);
    return { src, fx: f.x * k, fy: f.y * k };
  }
  // ar (16:10 for B站) window of the 16:9 render: zoom 1 = full height; with zoom > 1 the focus sits at fy of the window height.
  function crop(s, o, w, h) {
    const ch = Math.round(s.src.height / o.zoom), cw = Math.round(ch * o.ar);
    const sx = cl(s.fx - cw / 2, 0, s.src.width - cw), sy = cl(s.fy - o.fy * ch, 0, s.src.height - ch);
    const c = cv(w, h), g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(s.src, sx, sy, cw, ch, 0, 0, w, h);
    return { c, fx: ((s.fx - sx) / cw) * w, fy: ((s.fy - sy) / ch) * h };
  }
  // Gaussian blur (σ = r px of c) computed at 1/4 size with clamp-to-edge padding; RGBA bytes at c's size.
  function blurData(c, r) {
    const q = 4, w = Math.ceil(c.width / q), h = Math.ceil(c.height / q), p = Math.ceil((3 * r) / q) + 2;
    const s = cv(w + 2 * p, h + 2 * p), g = s.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(c, p, p, w, h);
    g.drawImage(s, p, p, 1, h, 0, p, p, h); g.drawImage(s, p + w - 1, p, 1, h, p + w, p, p, h);
    g.drawImage(s, 0, p, s.width, 1, 0, 0, s.width, p); g.drawImage(s, 0, p + h - 1, s.width, 1, 0, p + h, s.width, p);
    const b = cv(s.width, s.height), bg = b.getContext('2d');
    bg.filter = `blur(${r / q}px)`; bg.drawImage(s, 0, 0);
    const o = cv(c.width, c.height), og = o.getContext('2d');
    og.imageSmoothingQuality = 'high'; og.drawImage(b, p, p, w, h, 0, 0, c.width, c.height);
    return og.getImageData(0, 0, c.width, c.height).data;
  }
  function grade(c, G, fx, fy) {
    const w = c.width, h = c.height, g = c.getContext('2d'), id = g.getImageData(0, 0, w, h), d = id.data;
    const bl = blurData(c, (G.clarR * h) / 1200), lut = new Float32Array(1025);
    for (let i = 0; i <= 1024; i++) {
      const x = Math.pow(Math.max(0, i / 1024 - G.black) / (1 - G.black), G.gamma);
      lut[i] = x + G.contrast * (x * x * (3 - 2 * x) - x);
    }
    const CT = [0.74, 0.95, 1.62]; // luma-neutral blue-grey the shadows lean toward (the amber haze reads as mud otherwise)
    for (let y = 0, i = 0; y < h; y++) {
      const ey = (y - fy) / h, nd = 1 - G.nd * (1 - sm(0, G.ndH, y / h));
      for (let x = 0; x < w; x++, i += 4) {
        let r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
        const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b, lb = (0.2126 * bl[i] + 0.7152 * bl[i + 1] + 0.0722 * bl[i + 2]) / 255;
        const dl = l - lb, l2 = Math.max(0, l + (dl > 0 ? G.clar : 0.3 * G.clar) * dl); // clarity without dark halos
        const lt = lut[Math.min(1024, Math.round(l2 * 1024))], k = l > 1e-5 ? lt / l : 0;
        r *= k; gg *= k; b *= k;
        const sh = G.cool * sm(0, 0.06, lt) * (1 - sm(0.06, 0.3, lt));
        r += (lt * CT[0] - r) * sh; gg += (lt * CT[1] - gg) * sh; b += (lt * CT[2] - b) * sh;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), v = G.vib * (1 - (mx > 0 ? (mx - mn) / mx : 0));
        const Y = 0.2126 * r + 0.7152 * gg + 0.0722 * b, ex = (x - fx) / w;
        const vg = (1 - G.vig * sm(G.vig0, 1.1, Math.sqrt(ex * ex + ey * ey) * 1.414)) * nd * 255;
        d[i] = (Y + (r - Y) * (1 + v)) * vg + dith(); d[i + 1] = (Y + (gg - Y) * (1 + v)) * vg + dith(); d[i + 2] = (Y + (b - Y) * (1 + v)) * vg + dith();
      }
    }
    g.putImageData(id, 0, 0);
  }
  // Downscale, then an unsharp mask (σ 0.8 px) with dither.
  function down(c, w, h, amt) {
    const o = cv(w, h), g = o.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, w, h);
    if (amt <= 0) return o;
    const id = g.getImageData(0, 0, w, h), d = id.data, bg = cv(w, h).getContext('2d');
    bg.filter = 'blur(0.8px)'; bg.drawImage(o, 0, 0);
    const bd = bg.getImageData(0, 0, w, h).data;
    for (let i = 0; i < d.length; i += 4) for (let j = i; j < i + 3; j++) d[j] = d[j] + amt * (d[j] - bd[j]) + dith();
    g.putImageData(id, 0, 0);
    return o;
  }
  // Title block, laid out on a 1920×1200 grid (T.y = baseline of the Chinese title).
  function title(c, T) {
    const g = c.getContext('2d'), k = c.width / 1920, cx = 960, y = T.y, ry = y + T.size * 0.3;
    g.save(); g.setTransform(k, 0, 0, k, 0, 0);
    g.save(); g.translate(cx, y - T.size * 0.3); g.scale(1, 0.4);
    const sc = g.createRadialGradient(0, 0, 0, 0, 0, 780);
    sc.addColorStop(0, `rgba(0,0,0,${T.scrim})`); sc.addColorStop(0.5, `rgba(0,0,0,${T.scrim * 0.55})`); sc.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sc; g.fillRect(-780, -780, 1560, 1560); g.restore();
    const en = T.lang === 'en', main = en ? SUB : TITLE;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let sp = T.sp, cap = T.size * 0.85, bold = 0;
    if (en) { // Michroma has one weight: fit the line to fitW and thicken it with a stroke of its own fill
      g.font = '100px Michroma'; g.letterSpacing = '0px';
      const w0 = g.measureText(main).width, fs = (T.fitW / (w0 + 0.12 * 100 * (main.length - 1))) * 100;
      sp = 0.12 * fs; cap = 0.72 * fs; bold = 0.035 * fs;
      g.font = `${fs}px Michroma`;
    } else g.font = `900 ${T.size}px "Noto Serif SC"`;
    g.letterSpacing = sp + 'px'; g.lineJoin = 'round';
    const tx = cx + sp / 2, draw = () => { g.fillText(main, tx, y); if (bold) { g.lineWidth = bold; g.strokeText(main, tx, y); } };
    g.shadowColor = 'rgba(255,140,40,0.6)'; g.shadowBlur = 80 * k; g.fillStyle = g.strokeStyle = 'rgba(255,170,90,0.3)'; draw();
    g.shadowColor = 'rgba(0,0,0,0.95)'; g.shadowBlur = 26 * k; g.shadowOffsetY = 6 * k; g.fillStyle = g.strokeStyle = 'rgba(0,0,0,0.6)'; draw();
    g.shadowOffsetY = 0; g.shadowColor = 'rgba(120,210,255,0.85)'; g.shadowBlur = 24 * k;
    const gr = g.createLinearGradient(0, y - cap, 0, y + cap * 0.12);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#eef8ff'); gr.addColorStop(1, '#bfe0f4');
    g.fillStyle = g.strokeStyle = gr; draw();
    g.shadowBlur = 0; g.letterSpacing = '0px';
    const rl = g.createLinearGradient(cx - T.ruleW / 2, 0, cx + T.ruleW / 2, 0);
    rl.addColorStop(0, 'rgba(255,170,80,0)'); rl.addColorStop(0.5, 'rgba(255,200,130,0.95)'); rl.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = rl; g.fillRect(cx - T.ruleW / 2, ry - 1, T.ruleW, 2);
    g.shadowColor = 'rgba(120,220,255,1)'; g.shadowBlur = 16 * k; g.fillStyle = '#eafcff'; // the equilibrium on the rule
    g.beginPath(); g.arc(cx, ry, 4.5, 0, 2 * Math.PI); g.fill();
    g.font = `${T.subSize}px Michroma`; g.letterSpacing = T.subSp + 'px'; g.fillStyle = 'rgba(205,232,250,0.94)';
    g.shadowColor = 'rgba(0,0,0,0.95)'; g.shadowBlur = 12 * k;
    g.fillText(en ? TAG : SUB, cx + T.subSp / 2, ry + T.subSize * 2.1);
    g.letterSpacing = '0px'; g.shadowBlur = 0;
    if (T.formula) L.drawTex(g, T.formula, cx, ry + T.subSize * 4.2, { size: T.subSize * 1.15, align: 'center', color: 'rgba(255,205,140,0.92)', glow: 10, glowColor: 'rgba(0,0,0,0.9)' });
    g.restore();
  }
  // Review sheet: the 16:9 and 4:3 centre crops B站 derives from the 16:10 upload, and feed cards at real size.
  function checks(c) {
    const o = cv(1560, 1010), g = o.getContext('2d');
    g.fillStyle = '#2a2c30'; g.fillRect(0, 0, o.width, o.height);
    g.font = '15px "Microsoft YaHei", sans-serif'; g.fillStyle = '#ccc';
    g.drawImage(c, 0, 60, 1920, 1080, 20, 36, 800, 450); g.fillText('16:9 中心裁剪（PC 首页 / 播放器）', 20, 26);
    g.drawImage(c, 160, 0, 1600, 1200, 850, 36, 600, 450); g.fillText('4:3 中心裁剪（App / 个人空间）', 850, 26);
    const card = (x, y, w, h, sx, sy, sw, sh, dark, dur) => {
      g.save(); g.beginPath(); g.roundRect(x, y, w, h, 6); g.clip();
      g.drawImage(c, sx, sy, sw, sh, x, y, w, h);
      const bg = g.createLinearGradient(0, y + h * 0.7, 0, y + h); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = bg; g.fillRect(x, y + h * 0.7, w, h * 0.3);
      g.font = '12px "Microsoft YaHei", sans-serif'; g.fillStyle = '#fff';
      if (w >= 150) g.fillText('▶ 12.3万   ▤ 1024', x + 8, y + h - 8);
      g.textAlign = 'right'; g.fillText(dur, x + w - 8, y + h - 8); g.textAlign = 'left'; g.restore();
      g.save(); g.beginPath(); g.rect(x, y + h, w, 30); g.clip();
      g.font = '14px "Microsoft YaHei", sans-serif'; g.fillStyle = dark ? '#e6e6e6' : '#18191c';
      g.fillText('【控制理论】控制的几何：从欧拉到…', x, y + h + 20); g.restore();
    };
    [[0, '#f6f7f8', false], [1, '#17181a', true]].forEach(([r, bgc, dark]) => {
      const y0 = 510 + r * 250; g.fillStyle = bgc; g.fillRect(20, y0, 1520, 235);
      card(40, y0 + 18, 320, 180, 0, 60, 1920, 1080, dark, '03:27');
      card(390, y0 + 18, 192, 120, 0, 0, 1920, 1200, dark, '03:27');
      card(612, y0 + 18, 160, 120, 160, 0, 1600, 1200, dark, '03:27');
      card(800, y0 + 18, 128, 72, 0, 60, 1920, 1080, dark, '03:27');
    });
    return o;
  }
  // YouTube review sheet: home grid / search / sidebar sizes with the duration badge, light and dark themes.
  function checksYT(c) {
    const o = cv(1000, 620), g = o.getContext('2d');
    g.fillStyle = '#2a2c30'; g.fillRect(0, 0, o.width, o.height);
    [[0, '#ffffff', false], [1, '#0f0f0f', true]].forEach(([r, bgc, dark]) => {
      const y0 = 10 + r * 305; g.fillStyle = bgc; g.fillRect(10, y0, 980, 295);
      [[30, 360], [420, 246], [696, 168]].forEach(([x, w]) => {
        const h = Math.round((w * 9) / 16), y = y0 + 20;
        g.save(); g.beginPath(); g.roundRect(x, y, w, h, 10); g.clip(); g.drawImage(c, x, y, w, h); g.restore();
        g.font = '500 12px Roboto, Arial, sans-serif'; const bw = g.measureText('3:27').width + 8;
        g.fillStyle = 'rgba(0,0,0,0.8)'; g.beginPath(); g.roundRect(x + w - bw - 6, y + h - 22, bw, 17, 4); g.fill();
        g.fillStyle = '#fff'; g.fillText('3:27', x + w - bw - 2, y + h - 9);
        g.save(); g.beginPath(); g.rect(x, y + h, w, 40); g.clip();
        g.font = '500 15px Roboto, Arial, sans-serif'; g.fillStyle = dark ? '#f1f1f1' : '#0f0f0f';
        g.fillText('The Geometry of Control · control theory, visualised', x, y + h + 24); g.restore();
      });
    });
    return o;
  }
  function sheet(list, o, cols) {
    const tw = 960, th = 600, c = cv(cols * tw, Math.ceil(list.length / cols) * th), g = c.getContext('2d');
    list.forEach((it, i) => {
      const oo = opts({ ...o, ...it }), m = crop(shoot(oo), oo, tw, th), x = (i % cols) * tw, y = Math.floor(i / cols) * th;
      grade(m.c, oo.G, m.fx, m.fy); g.drawImage(m.c, x, y);
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x, y, 460, 24); g.fillStyle = '#ff0'; g.font = '15px monospace';
      g.fillText(`t=${oo.t} exp=${oo.exp} dolly=${oo.dolly} zoom=${oo.zoom} fy=${oo.fy}`, x + 6, y + 17);
    });
    return c;
  }
  const store = (m) => { window.__co = {}; for (const [k, c] of Object.entries(m)) window.__co[k] = c.toDataURL('image/png'); return Object.keys(m); };
  return {
    sheet: (list, o, cols) => store({ sheet: sheet(list, o, cols) }),
    make: (o0) => {
      const o = opts(o0), H = Math.round(3840 / o.ar), m = crop(shoot(o), o, 3840, H), p = o.name ? o.name + '_' : '', out = {};
      grade(m.c, o.G, m.fx, m.fy);
      const t4 = cv(3840, H); t4.getContext('2d').drawImage(m.c, 0, 0); title(t4, o.T);
      if (o.clean) out[`${p}clean_3840x${H}`] = m.c;
      out[`${p}title_3840x${H}`] = t4;
      o.sizes.forEach((w, i) => {
        const h = Math.round(w / o.ar), t = down(t4, w, h, o.sharp);
        if (o.clean && i === 0) out[`${p}clean_${w}x${h}`] = down(m.c, w, h, o.sharp);
        out[`${p}title_${w}x${h}`] = t;
        if (i === 0) out[`${p}check`] = o.ar > 1.7 ? checksYT(t) : checks(t);
      });
      return store(out);
    },
  };
})();
