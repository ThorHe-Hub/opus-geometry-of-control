// Tonal voices. Signature: (t, dur, params). Times are absolute seconds.
const VOICES = {};

Object.assign(VOICES, {
  // Detuned-saw string pad with a breathing low-pass.
  pad(t, d, p) {
    const T = at(t), a = p.a ?? 1.2, r = p.r ?? 2.0, lv = p.g ?? 0.05;
    const f = filt('lowpass', p.lo ?? 500, 0.4), g = gain(0);
    f.frequency.setValueAtTime(p.lo ?? 500, T);
    f.frequency.linearRampToValueAtTime(p.hi ?? 2400, T + Math.max(0.1, d * 0.5));
    f.frequency.linearRampToValueAtTime(p.lo ?? 500, T + d + r);
    for (const n of p.n) for (let k = 0; k < 3; k++) {
      const o = osc('sawtooth', mtof(n));
      o.detune.value = (k - 1) * (p.det ?? 9) + hash1(n * 3 + k) * 3;
      o.connect(f); o.start(T); o.stop(T + d + r + 0.1);
    }
    env(g.gain, T, a, Math.max(0, d - a), r, lv / Math.sqrt(p.n.length));
    f.connect(g);
    route(g, { duck: p.duck !== false, rev: p.rev ?? 0.6, pan: p.pan });
  },
  // Short bowed-string ostinato note.
  str(t, d, p) {
    const T = at(t), f = filt('lowpass', p.cut ?? 1800, 1.2), g = gain(0);
    const o1 = osc('sawtooth', mtof(p.n)), o2 = osc('square', mtof(p.n - 12));
    const g2 = gain(0.3);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g);
    [o1, o2].forEach((o) => { o.start(T); o.stop(T + d + 0.4); });
    f.frequency.setValueAtTime(p.cut ?? 1800, T);
    f.frequency.exponentialRampToValueAtTime((p.cut ?? 1800) * 0.35, T + d + 0.3);
    env(g.gain, T, 0.012, Math.max(0, d - 0.05), 0.18, p.g ?? 0.07);
    route(g, { duck: true, rev: p.rev ?? 0.25, pan: p.pan });
  },
  // Plucked / piano-like tone.
  pluck(t, d, p) {
    const T = at(t), dec = p.dec ?? 1.6, f = filt('lowpass', 5000, 0.8), g = gain(0);
    const o1 = osc('triangle', mtof(p.n)), o2 = osc('sawtooth', mtof(p.n) * 1.001), g2 = gain(0.25);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g);
    [o1, o2].forEach((o) => { o.start(T); o.stop(T + dec + 0.2); });
    f.frequency.setValueAtTime(p.bright ?? 6000, T);
    f.frequency.exponentialRampToValueAtTime(400, T + dec);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.linearRampToValueAtTime(p.g ?? 0.08, T + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, T + dec);
    route(g, { rev: p.rev ?? 0.35, pan: p.pan });
  },
  // FM bell / celesta.
  bell(t, d, p) {
    const T = at(t), dec = p.dec ?? 3, fc = mtof(p.n), g = gain(0);
    const car = osc('sine', fc), mod = osc('sine', fc * (p.ratio ?? 3.5)), mg = gain(0);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    mg.gain.setValueAtTime(fc * (p.idx ?? 3), T);
    mg.gain.exponentialRampToValueAtTime(fc * 0.05, T + dec * 0.6);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.linearRampToValueAtTime(p.g ?? 0.06, T + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, T + dec);
    [car, mod].forEach((o) => { o.start(T); o.stop(T + dec + 0.1); });
    route(g, { rev: p.rev ?? 0.7, pan: p.pan });
  },
  // Sine + filtered saw bass through a soft saturator.
  bass(t, d, p) {
    const T = at(t), g = gain(0), f = filt('lowpass', p.cut ?? 380, 1.4), sat = saturator(2.2);
    const o1 = osc('sine', mtof(p.n)), o2 = osc('sawtooth', mtof(p.n)), g2 = gain(0.35);
    o1.connect(sat); o2.connect(g2); g2.connect(f); f.connect(sat); sat.connect(g);
    [o1, o2].forEach((o) => { o.start(T); o.stop(T + d + 0.5); });
    env(g.gain, T, 0.01, Math.max(0, d - 0.02), p.r ?? 0.25, p.g ?? 0.16);
    route(g, { rev: 0.05 });
  },
  // Pure sine lead with slow vibrato (the "frequency" voice of Act I).
  sine(t, d, p) {
    const T = at(t), g = gain(0), o = osc('sine', mtof(p.n)), o8 = osc('triangle', mtof(p.n) * 2), g8 = gain(0.08);
    const lfo = osc('sine', 5.2), lg = gain(mtof(p.n) * 0.004);
    lfo.connect(lg); lg.connect(o.frequency); o8.connect(g8); g8.connect(g); o.connect(g);
    [o, o8, lfo].forEach((x) => { x.start(T); x.stop(T + d + (p.r ?? 1) + 0.1); });
    env(g.gain, T, p.a ?? 0.08, Math.max(0, d - (p.a ?? 0.08)), p.r ?? 1, p.g ?? 0.06);
    route(g, { rev: p.rev ?? 0.6, pan: p.pan });
  },
  // Swelling brass section.
  brass(t, d, p) {
    const T = at(t), g = gain(0), f = filt('lowpass', 300, 2);
    for (const n of p.n) for (let k = 0; k < 2; k++) {
      const o = osc('sawtooth', mtof(n)); o.detune.value = (k ? 6 : -6);
      o.connect(f); o.start(T); o.stop(T + d + 0.8);
    }
    f.frequency.setValueAtTime(300, T);
    f.frequency.linearRampToValueAtTime(p.hi ?? 2600, T + (p.a ?? 0.25));
    f.frequency.linearRampToValueAtTime((p.hi ?? 2600) * 0.5, T + d);
    env(g.gain, T, p.a ?? 0.25, Math.max(0, d - (p.a ?? 0.25)), 0.6, (p.g ?? 0.06) / Math.sqrt(p.n.length));
    f.connect(g);
    route(g, { rev: 0.55, pan: p.pan });
  },
  // Formant choir ("ah").
  choir(t, d, p) {
    const T = at(t), g = gain(0), mix = gain(1);
    const F = [[800, 1.0, 8], [1150, 0.5, 9], [2900, 0.25, 12]];
    const fs = F.map(([fr, lv, q]) => { const b = filt('bandpass', fr, q), bg = gain(lv * 2.2); b.connect(bg); bg.connect(mix); return b; });
    const lfo = osc('sine', 4.6), lg = gain(9);
    lfo.connect(lg); lfo.start(T); lfo.stop(T + d + 2.2);
    for (const n of p.n) for (let k = 0; k < 3; k++) {
      const o = osc('sawtooth', mtof(n)); o.detune.value = (k - 1) * 11;
      lg.connect(o.detune);
      fs.forEach((b) => o.connect(b));
      o.start(T); o.stop(T + d + 2.2);
    }
    env(g.gain, T, p.a ?? 0.8, Math.max(0, d - (p.a ?? 0.8)), p.r ?? 2, (p.g ?? 0.08) / Math.sqrt(p.n.length));
    mix.connect(g);
    route(g, { rev: 0.9, duck: false, pan: p.pan });
  },
});
