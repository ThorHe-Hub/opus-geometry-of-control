// Percussion and sound design voices.
Object.assign(VOICES, {
  kick(t, d, p) {
    const T = at(t), o = osc('sine', 150), g = gain(0), sat = saturator(1.6);
    o.frequency.setValueAtTime(p.hi ?? 150, T);
    o.frequency.exponentialRampToValueAtTime(p.lo ?? 42, T + 0.12);
    o.connect(sat); sat.connect(g);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.linearRampToValueAtTime(p.g ?? 0.5, T + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, T + (p.dec ?? 0.45));
    o.start(T); o.stop(T + (p.dec ?? 0.45) + 0.05);
    const n = noiseSrc(T, 0.03, 1), nf = filt('highpass', 2500), ng = gain(0);
    n.connect(nf); nf.connect(ng); env(ng.gain, T, 0.001, 0, 0.025, (p.g ?? 0.5) * 0.12);
    route(g, { rev: 0.04 }); route(ng, {});
  },
  taiko(t, d, p) {
    const T = at(t), o = osc('sine', 110), g = gain(0);
    o.frequency.setValueAtTime(p.hi ?? 120, T);
    o.frequency.exponentialRampToValueAtTime(p.lo ?? 52, T + 0.25);
    o.connect(g);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.linearRampToValueAtTime(p.g ?? 0.5, T + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, T + 1.1);
    o.start(T); o.stop(T + 1.2);
    const n = noiseSrc(T, 0.3, 2), nf = filt('bandpass', 700, 0.8), ng = gain(0);
    n.connect(nf); nf.connect(ng); env(ng.gain, T, 0.002, 0, 0.22, (p.g ?? 0.5) * 0.35);
    route(g, { rev: 0.45, pan: p.pan }); route(ng, { rev: 0.5, pan: p.pan });
  },
  snare(t, d, p) {
    const T = at(t), n = noiseSrc(T, 0.3, 3), f = filt('bandpass', 2400, 0.7), g = gain(0);
    n.connect(f); f.connect(g); env(g.gain, T, 0.002, 0, p.dec ?? 0.18, p.g ?? 0.18);
    const o = osc('triangle', 190), og = gain(0);
    o.frequency.exponentialRampToValueAtTime(140, T + 0.1);
    o.connect(og); env(og.gain, T, 0.002, 0, 0.1, (p.g ?? 0.18) * 0.8); o.start(T); o.stop(T + 0.2);
    route(g, { rev: p.rev ?? 0.35, pan: p.pan }); route(og, { rev: 0.2 });
  },
  hat(t, d, p) {
    const T = at(t), n = noiseSrc(T, 0.12, 4), f = filt('highpass', p.f ?? 7500, 0.8), g = gain(0);
    n.connect(f); f.connect(g); env(g.gain, T, 0.001, 0, p.dec ?? 0.05, p.g ?? 0.05);
    route(g, { rev: 0.1, pan: p.pan ?? 0.2 });
  },
  tick(t, d, p) {
    const T = at(t), o = osc('sine', p.f ?? 3200), g = gain(0);
    o.connect(g); env(g.gain, T, 0.001, 0, p.dec ?? 0.04, p.g ?? 0.04); o.start(T); o.stop(T + 0.1);
    route(g, { rev: 0.3, pan: p.pan });
  },
  // A pole rings as its own impulse response: e^{σt} cos(ωt), audible.
  pole(t, d, p) {
    const T = at(t), o = osc('sine', p.f), g = gain(0), o2 = osc('sine', p.f * 2.01), g2 = gain(0.12);
    o2.connect(g2); g2.connect(g); o.connect(g);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.linearRampToValueAtTime(p.g ?? 0.08, T + 0.005);
    if (p.sigma < -0.01) g.gain.exponentialRampToValueAtTime(0.0001, T + Math.min(d, 6.9 / -p.sigma));
    else if (p.sigma > 0.01) { g.gain.exponentialRampToValueAtTime(Math.min(0.5, (p.g ?? 0.08) * Math.exp(p.sigma * d)), T + d); g.gain.linearRampToValueAtTime(0.0001, T + d + 0.05); }
    else { g.gain.setValueAtTime(p.g ?? 0.08, T + d - 0.3); g.gain.linearRampToValueAtTime(0.0001, T + d); }
    [o, o2].forEach((x) => { x.start(T); x.stop(T + d + 0.1); });
    route(g, { rev: 0.6, pan: p.pan });
  },
  // Rising, detuned growl for the unstable pole.
  growl(t, d, p) {
    const T = at(t), g = gain(0), f = filt('lowpass', 200, 4), sat = saturator(3);
    for (let k = 0; k < 3; k++) { const o = osc('sawtooth', (p.f ?? 55) * (1 + k * 0.006)); o.connect(f); o.start(T); o.stop(T + d + 0.1); }
    f.frequency.setValueAtTime(150, T); f.frequency.exponentialRampToValueAtTime(p.hi ?? 2400, T + d);
    g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(p.g ?? 0.12, T + d);
    g.gain.linearRampToValueAtTime(0.0001, T + d + 0.06);
    f.connect(sat); sat.connect(g); route(g, { rev: 0.3, pan: p.pan });
  },
  // Shepard–Risset glissando: endlessly rising tension.
  shepard(t, d, p) {
    const T = at(t), per = p.per ?? 5, nv = 6, fmin = p.fmin ?? 55, g = gain(0);
    for (let v = 0; v < nv; v++) {
      let s = -(v / nv) * per;
      while (s < d) {
        const a = Math.max(0, s), b = Math.min(d, s + per), o = osc('sine', 1), vg = gain(0);
        const fAt = (tt) => fmin * Math.pow(2, nv * ((tt - s) / per));
        o.frequency.setValueAtTime(fAt(a), T + a); o.frequency.exponentialRampToValueAtTime(fAt(b), T + b);
        const amp = (tt) => 0.5 - 0.5 * Math.cos(TAU * ((tt - s) / per));
        vg.gain.setValueAtTime(Math.max(0.0001, amp(a)), T + a);
        for (let k = 1; k <= 4; k++) { const tt = a + ((b - a) * k) / 4; vg.gain.linearRampToValueAtTime(Math.max(0.0001, amp(tt)), T + tt); }
        o.connect(vg); vg.connect(g); o.start(T + a); o.stop(T + b + 0.02);
        s += per;
      }
    }
    g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(p.g ?? 0.05, T + d * 0.92);
    g.gain.linearRampToValueAtTime(0.0001, T + d);
    route(g, { rev: 0.5, duck: false });
  },
  whoosh(t, d, p) {
    const T = at(t), n = noiseSrc(T, d, 5), f = filt('bandpass', 400, 1.6), g = gain(0);
    f.frequency.setValueAtTime(p.f0 ?? 300, T); f.frequency.exponentialRampToValueAtTime(p.f1 ?? 3000, T + d * (p.peak ?? 0.7));
    f.frequency.exponentialRampToValueAtTime(p.f2 ?? 500, T + d);
    const pk = p.peak ?? 0.7;
    g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(p.g ?? 0.15, T + d * pk);
    g.gain.exponentialRampToValueAtTime(0.0001, T + d);
    n.connect(f); f.connect(g); route(g, { rev: 0.5, pan: p.pan });
  },
  boom(t, d, p) {
    const T = at(t), o = osc('sine', 90), g = gain(0);
    o.frequency.setValueAtTime(p.hi ?? 90, T); o.frequency.exponentialRampToValueAtTime(p.lo ?? 28, T + 1.2);
    o.connect(g); env(g.gain, T, 0.005, 0.05, p.dec ?? 2.2, p.g ?? 0.5); o.start(T); o.stop(T + (p.dec ?? 2.2) + 0.2);
    const n = noiseSrc(T, 1.5, 6), nf = filt('lowpass', 1800, 0.5), ng = gain(0);
    nf.frequency.setValueAtTime(3000, T); nf.frequency.exponentialRampToValueAtTime(200, T + 1.2);
    n.connect(nf); nf.connect(ng); env(ng.gain, T, 0.003, 0, 1.2, (p.g ?? 0.5) * 0.4);
    route(g, { rev: 0.5 }); route(ng, { rev: 0.8 });
  },
  heart(t, d, p) {
    const T = at(t);
    [[0, 1], [0.2, 0.7]].forEach(([dt, lv]) => {
      const o = osc('sine', 60), g = gain(0);
      o.frequency.setValueAtTime(p.f ?? 62, T + dt); o.frequency.exponentialRampToValueAtTime(38, T + dt + 0.15);
      o.connect(g); env(g.gain, T + dt, 0.006, 0.02, 0.2, (p.g ?? 0.35) * lv); o.start(T + dt); o.stop(T + dt + 0.35);
      route(g, { rev: 0.15 });
    });
  },
  quindar(t, d, p) {
    const T = at(t), o = osc('sine', p.f ?? 2525), g = gain(0);
    o.connect(g); env(g.gain, T, 0.005, 0.24, 0.01, p.g ?? 0.03); o.start(T); o.stop(T + 0.3);
    route(g, { rev: 0.1, pan: p.pan });
  },
  chirp(t, d, p) {
    const T = at(t), o = osc('sine', p.f0 ?? 80), g = gain(0);
    o.frequency.setValueAtTime(p.f0 ?? 80, T); o.frequency.exponentialRampToValueAtTime(p.f1 ?? 2400, T + d);
    g.gain.setValueAtTime(0.0001, T);
    (p.curve || [[0, 1], [1, 1]]).forEach(([u, v]) => g.gain.linearRampToValueAtTime(Math.max(0.0001, (p.g ?? 0.05) * v), T + u * d));
    g.gain.linearRampToValueAtTime(0.0001, T + d + 0.05);
    o.connect(g); o.start(T); o.stop(T + d + 0.1); route(g, { rev: 0.4 });
  },
  glitch(t, d, p) {
    const T = at(t), r = rng(Math.floor(t * 1000));
    for (let k = 0; k < (p.n ?? 6); k++) {
      const tt = T + r() * d, o = osc(r() < 0.5 ? 'square' : 'sawtooth', 200 + r() * 3000), g = gain(0);
      o.connect(g); env(g.gain, tt, 0.001, 0.01 + r() * 0.03, 0.01, (p.g ?? 0.03) * (0.5 + r())); o.start(tt); o.stop(tt + 0.08);
      route(g, { pan: r() * 2 - 1, rev: 0.1 });
    }
  },
});
