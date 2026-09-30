// Score, part A: bar map shared with the picture, helpers, cold open → Act II.
// 96 BPM, one bar = 2.5 s. Scene cuts land on bar lines.
const SB = {
  cold: 0, title: 4, euler: 7, terrain: 15,
  watt: 17, maxwell: 21, state: 25, phase: 30, lorenz: 34,
  black: 38, nyq: 41, pend: 46, pont: 54, apollo: 58,
  rocket: 63, swarm: 69, finale: 74, end: 83,
};
const TOTAL = bars(SB.end);

const CH = {
  Dm: [50, 57, 62, 65, 69], Bb: [46, 53, 58, 62, 65], F: [48, 53, 57, 60, 65], C: [48, 55, 60, 64, 67],
  Gm: [43, 50, 55, 58, 62], A: [45, 52, 57, 61, 64], Asus: [45, 52, 57, 62, 64], D: [50, 57, 62, 66, 69],
  Dsus: [50, 57, 62, 64, 69], Am: [45, 52, 57, 60, 64], Eb: [51, 55, 58, 63, 67],
};
const ROOT = { Dm: 38, Bb: 34, F: 41, C: 36, Gm: 43, A: 33, Asus: 33, D: 38, Dsus: 38, Am: 33, Eb: 39 };

function buildScore() {
  const ev = [];
  const E_ = (t, v, d = 0, p = {}, tail) => ev.push({ t, v, d, p, tail });
  const B = (b, beat = 0) => bars(b) + beat * BEAT;
  const chords = (b0, list, o = {}) => list.forEach((c, i) => {
    const t = B(b0 + i), d = BAR * (o.len || 1);
    if (o.pad !== false) E_(t, 'pad', d, { n: CH[c], g: o.g ?? 0.05, lo: o.lo ?? 450, hi: o.hi ?? 2000, a: o.a ?? 0.6, r: o.r ?? 1.4, duck: o.duck !== false }, 3);
    if (o.bass) E_(t, 'bass', d * 0.95, { n: ROOT[c], g: o.bass }, 1);
  });
  const pulse = (b0, list, o = {}) => list.forEach((c, i) => {
    const n = CH[c], sub = o.sub || 2;
    for (let k = 0; k < 4 * sub; k++) E_(B(b0 + i, k / sub), 'str', BEAT / sub * 0.7, { n: n[(o.pat || [1, 2, 3, 2])[k % (o.pat || [1, 2, 3, 2]).length]] + (o.oct || 0), g: o.g ?? 0.045, cut: o.cut ?? 2000, pan: k % 2 ? 0.25 : -0.25 }, 1);
  });
  const arp = (b0, list, o = {}) => list.forEach((c, i) => {
    const n = CH[c], steps = o.steps || 8, pat = o.pat || [1, 2, 3, 4, 3, 2];
    for (let k = 0; k < steps; k++) E_(B(b0 + i, (k * 4) / steps), o.v || 'pluck', 0.2, { n: n[pat[k % pat.length]] + (o.oct ?? 12), g: o.g ?? 0.04, dec: o.dec ?? 1.4, pan: Math.sin(k * 1.7) * 0.5 }, o.dec ?? 1.4);
  });
  const drums = (b0, nb, o = {}) => {
    for (let b = 0; b < nb; b++) for (let q = 0; q < 4; q++) {
      const t = B(b0 + b, q);
      if ((o.kick || [1, 0, 0, 0])[q]) E_(t, 'kick', 0.4, { g: o.kg ?? 0.45, duck: o.duck ?? 0.5 }, 0.6);
      if ((o.snare || [0, 0, 0, 0])[q]) E_(t, 'snare', 0.2, { g: o.sg ?? 0.16 }, 0.8);
      if (o.hat) { E_(t + BEAT / 2, 'hat', 0.05, { g: o.hat }, 0.3); if (o.hat16) E_(t + BEAT / 4, 'hat', 0.04, { g: o.hat * 0.5 }, 0.3); }
    }
  };

  // ---- Cold open: drone, heartbeat, the pen falls, teasers, title ----
  E_(0.3, 'pad', 9.2, { n: [26, 38, 45], g: 0.07, lo: 120, hi: 380, a: 3, r: 0.25, duck: false, rev: 0.3 }, 3);
  for (let k = 0; k < 7; k++) E_(0.9 + k * 1.25, 'heart', 0.4, { g: 0.22 + k * 0.035 }, 1);
  E_(2.5, 'shepard', 7.0, { g: 0.035, per: 4, fmin: 70 }, 1);
  E_(8.6, 'whoosh', 1.0, { f0: 200, f1: 5000, f2: 3000, g: 0.14, peak: 0.95 }, 0.5);
  [10.0, 10.625, 11.25, 11.875].forEach((t, i) => {
    E_(t, 'boom', 0.3, { g: 0.22, hi: 70 + i * 10, dec: 0.5 }, 1.5);
    E_(t, 'glitch', 0.3, { n: 7, g: 0.025 }, 0.5);
    E_(t + 0.05, 'bell', 0.5, { n: [74, 77, 81, 86][i], g: 0.045, dec: 1.4 }, 1.4);
  });
  E_(11.6, 'whoosh', 0.9, { f0: 400, f1: 9000, f2: 9000, g: 0.12, peak: 0.98 }, 0.4);
  E_(B(SB.title + 1), 'boom', 3, { g: 0.55, dec: 3.2 }, 3);
  E_(B(SB.title + 1), 'taiko', 1, { g: 0.55 }, 2);
  E_(B(SB.title + 1), 'brass', 4.2, { n: [38, 45, 50, 57], g: 0.07, a: 0.08, hi: 2200 }, 2);
  E_(B(SB.title + 1), 'choir', 4.4, { n: [62, 65, 69], g: 0.09, a: 0.4, r: 2.4 }, 3);
  E_(B(SB.title + 1), 'pad', 4.6, { n: CH.Dm, g: 0.05, lo: 300, hi: 1500, a: 0.2, r: 2.5 }, 3);
  [[0, 74], [0.75, 81], [1.25, 77], [1.75, 76], [2.5, 74]].forEach(([bt, n]) => E_(B(SB.title + 2, bt), 'bell', 1, { n, g: 0.05, dec: 3 }, 3));

  // ---- Act I · Euler helix → poles → |H(s)| terrain ----
  E_(B(SB.euler), 'whoosh', 1.2, { f0: 3000, f1: 400, f2: 200, g: 0.07, peak: 0.1 }, 1);
  E_(B(SB.euler), 'pad', BAR * 7.6, { n: [26, 33], g: 0.05, lo: 90, hi: 160, a: 2.5, r: 2.5, duck: false, rev: 0.2 }, 3);
  chords(SB.euler, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'], { g: 0.04, lo: 400, hi: 1600 });
  arp(SB.euler + 1, ['Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'], { v: 'bell', steps: 4, g: 0.028, dec: 2.4, oct: 12, pat: [2, 3, 4, 3] });
  E_(B(SB.euler + 1), 'sine', BAR * 3.8, { n: 69, g: 0.035, a: 1.5, r: 1.5 }, 2);
  E_(B(SB.euler + 5) - 0.5, 'whoosh', 1.4, { f0: 2500, f1: 300, f2: 120, g: 0.1, peak: 0.25 }, 1);
  E_(B(SB.euler + 5) + 0.35, 'pole', 3.5, { f: mtof(81), sigma: -1.2, g: 0.07 }, 1);
  [[14.3, 72, -1.5, -0.4], [15.0, 64, -0.8, 0.3], [15.7, 76, -2.2, -0.2], [16.4, 69, 0, 0.1], [17.0, 57, -0.4, 0.4]]
    .forEach(([lt, n, s, pan]) => E_(bars(SB.euler) + lt, 'pole', s === 0 ? 3.6 : 3, { f: mtof(n), sigma: s, g: 0.055, pan }, 1));
  E_(bars(SB.euler) + 17.8, 'growl', 2.1, { f: 36.7, g: 0.1, hi: 2600 }, 0.5);
  E_(bars(SB.euler) + 17.8, 'shepard', 2.1, { g: 0.03, per: 2.5, fmin: 90 }, 0.5);
  chords(SB.terrain, ['Gm', 'A'], { g: 0.045, lo: 500, hi: 2400, bass: 0.1 });
  // The chirp is the Bode plot, heard: gain = |H(jω(t))| / M_r along the same sweep the picture draws (53_terrain.js).
  const bode = Array.from({ length: 49 }, (_, i) => [i / 48, Math.max(0.06, TR.H(0, TR.wr * Math.pow(16, i / 48 - 0.5)) / TR.Mr)]);
  E_(B(SB.terrain) + TR.T_CUT, 'chirp', TR.T_END - TR.T_CUT, { f0: 110, f1: 1760, g: 0.05, curve: bode }, 1);

  // ---- Act II · Watt → Maxwell → state space → phase portraits → Lorenz ----
  E_(B(SB.watt), 'boom', 1, { g: 0.25, dec: 1.4 }, 1);
  chords(SB.watt, ['Dm', 'Gm', 'Dm', 'A'], { g: 0.04, bass: 0.1 });
  pulse(SB.watt, ['Dm', 'Gm', 'Dm', 'A'], { g: 0.04, cut: 1600 });
  drums(SB.watt, 4, { kick: [1, 0, 1, 0], kg: 0.3, duck: 0.35, hat: 0.03 });
  // the load engaging, then the governor's mechanical tick on every ball-angle maximum while it hunts (61_watt_sim.js)
  E_(B(SB.watt) + WT.T_LOAD, 'snare', 0.12, { g: 0.07, dec: 0.12, rev: 0.2, pan: 0.3 }, 0.8);
  WT.peaks.forEach(([lt, a]) => E_(B(SB.watt) + lt, 'hat', 0.08, { g: 0.03 + 0.06 * a, f: 3500, dec: 0.08, pan: -0.4 }, 0.3));
  chords(SB.maxwell, ['Bb', 'F', 'Gm', 'A'], { g: 0.04, lo: 400, hi: 1500, bass: 0.07 });
  [[0, 74], [1, 77], [2, 81], [4, 79], [5, 77], [6, 76], [8, 74], [10, 70], [12, 73], [13, 76], [14, 81]]
    .forEach(([bt, n]) => E_(B(SB.maxwell, bt), 'pluck', 0.4, { n, g: 0.06, dec: 2.2, bright: 3500 }, 2.2));
  chords(SB.state, ['Dm', 'Bb', 'Gm', 'A', 'A'], { g: 0.045, bass: 0.13, hi: 2600 });
  pulse(SB.state, ['Dm', 'Bb', 'Gm', 'A', 'A'], { g: 0.04, sub: 4, pat: [1, 2, 3, 4], cut: 2400 });
  drums(SB.state, 5, { kick: [1, 0, 0, 0], snare: [0, 0, 1, 0], kg: 0.45, hat: 0.03 });
  for (let b = 0; b < 5; b++) E_(B(SB.state + b), 'taiko', 1, { g: 0.35 }, 1.5);
  E_(B(SB.state + 3), 'growl', BAR * 2 - 0.2, { f: 36.7, g: 0.08, hi: 3000 }, 0.5);
  chords(SB.phase, ['F', 'C', 'Dm', 'Bb'], { g: 0.04, lo: 600, hi: 2400, bass: 0.08 });
  arp(SB.phase, ['F', 'C', 'Dm', 'Bb'], { steps: 8, g: 0.035, dec: 1 });
  drums(SB.phase, 4, { kick: [1, 0, 0, 0], kg: 0.3, hat: 0.025 });
  chords(SB.lorenz, ['Dm', 'Dm', 'A'], { g: 0.045, bass: 0.1 });
  arp(SB.lorenz, ['Dm', 'Dm', 'A'], { steps: 16, g: 0.03, dec: 0.6, pat: [1, 3, 2, 4, 1, 4, 3, 2] });
  arp(SB.lorenz + 1, ['Dm', 'A'], { steps: 12, g: 0.022, dec: 0.5, oct: 12.3, pat: [4, 2, 3, 1, 3, 4] });
  E_(B(SB.lorenz + 1), 'shepard', BAR * 2, { g: 0.03, per: 3, fmin: 80 }, 0.5);
  E_(B(SB.lorenz + 2), 'glitch', BAR, { n: 18, g: 0.02 }, 0.5);
  buildScoreB(ev, E_, B, chords, pulse, arp, drums);
  return ev;
}
