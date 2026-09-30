// Score, part B: Act III (feedback) → Act IV (autonomy) → finale.
// Pendulum scene beats (scene-local seconds): fall 0.4→3.125, freeze, rewind 3.4→4.3,
// "UNLESS…" hold, CATCH at 5.0 (bar 48 downbeat), disturbances 8.75 / 10 / 11.25, funnel 12.5→20.
const PEND = { fall0: 0.4, freeze: 3.125, rew0: 3.4, rew1: 4.3, catch: 5.0, kicks: [8.75, 10.0, 11.25], funnel: 12.5 };

function buildScoreB(ev, E_, B, chords, pulse, arp, drums) {
  // ---- Act III · Black 1927 ----
  E_(B(SB.black), 'boom', 1, { g: 0.3, dec: 2 }, 2);
  chords(SB.black, ['Dm', 'Bb', 'F'], { g: 0.04, lo: 500, hi: 1800, bass: 0.07 });
  // plucks on the pen strokes (in, Σ, μ) and on the loop lifting off the page at 5.0 s (73/74_black*.js)
  [[0, 62], [0.5, 65], [1, 69], [2, 72], [4, 70], [4.5, 74], [5, 77], [8, 72], [8.5, 69], [9, 65]]
    .forEach(([bt, n]) => E_(B(SB.black, bt), 'pluck', 0.4, { n, g: 0.055, dec: 2.4, bright: 3000 }, 2.4));
  // ---- Nyquist → Evans (75/76_nyq*.js): K = 8 at 3.75 s, glitch at 5.6, the poles cross jω at 7.5 ----
  const N0 = bars(SB.nyq);
  chords(SB.nyq, ['Gm', 'A', 'Bb', 'C', 'A'], { g: 0.04, bass: 0.1, hi: 2400 });
  pulse(SB.nyq, ['Gm', 'A', 'Bb', 'C', 'A'], { g: 0.035, sub: 4, pat: [1, 3, 2, 3], cut: 2200 });
  drums(SB.nyq, 5, { kick: [1, 0, 1, 0], kg: 0.35, hat: 0.025 });
  E_(N0 + 3.75, 'growl', 1.85, { f: 73.4, g: 0.07, hi: 3200 }, 0.5);
  E_(N0 + 3.75, 'pole', 1.85, { f: mtof(74), sigma: 0.9, g: 0.014, pan: -0.2 }, 0.6); // the amplifier sings
  E_(N0 + 5.6, 'glitch', 0.3, { n: 12, g: 0.028 }, 0.5);
  E_(N0 + 7.5, 'boom', 1, { g: 0.22, dec: 1.6 }, 2);
  [[0, 72], [0.5, 76], [1, 79], [2, 84]].forEach(([bt, n]) => E_(B(SB.nyq + 3, bt), 'bell', 1, { n, g: 0.04, dec: 2.5 }, 2.5));

  // ---- Pendulum: fall, rewind, CATCH, Lyapunov funnel ----
  const P0 = bars(SB.pend);
  for (let k = 0; k < 5; k++) E_(P0 + 0.1 + k * 0.625, 'heart', 0.4, { g: 0.26 + k * 0.03 }, 1);
  E_(P0 + 0.2, 'shepard', PEND.freeze - 0.2, { g: 0.045, per: 2.2, fmin: 80 }, 0.4);
  E_(P0 + 1.6, 'growl', PEND.freeze - 1.6, { f: 36.7, g: 0.09, hi: 3000 }, 0.3);
  E_(P0 + PEND.freeze, 'boom', 1, { g: 0.35, hi: 60, dec: 1.2 }, 1.5);
  E_(P0 + PEND.freeze, 'glitch', 0.25, { n: 10, g: 0.03 }, 0.5);
  E_(P0 + PEND.rew0, 'whoosh', PEND.rew1 - PEND.rew0, { f0: 5000, f1: 600, f2: 200, g: 0.12, peak: 0.9 }, 0.5);
  E_(P0 + PEND.rew1 + 0.1, 'sine', 0.45, { n: 81, g: 0.03, a: 0.05, r: 0.5 }, 1);
  const C0 = P0 + PEND.catch;
  E_(C0, 'boom', 3, { g: 0.6, dec: 3 }, 3);
  E_(C0, 'taiko', 1, { g: 0.6 }, 2);
  E_(C0, 'choir', BAR * 3, { n: [58, 62, 65, 70], g: 0.1, a: 0.1, r: 2 }, 3);
  [['Bb', [46, 53, 58, 62]], ['C', [48, 55, 60, 64]], ['D', [50, 57, 62, 66]]].forEach(([c, n], i) => {
    E_(C0 + i * BAR, 'brass', BAR * 0.95, { n, g: 0.075, a: 0.05, hi: 2800 }, 1);
  });
  chords(SB.pend + 2, ['Bb', 'C', 'D'], { g: 0.05, bass: 0.15, hi: 2800, a: 0.05 });
  pulse(SB.pend + 2, ['Bb', 'C', 'D'], { g: 0.04, sub: 4, pat: [1, 2, 3, 4], cut: 2800 });
  drums(SB.pend + 2, 3, { kick: [1, 0, 1, 0], snare: [0, 1, 0, 1], kg: 0.5, hat: 0.03, hat16: true });
  PEND.kicks.forEach((k) => { E_(P0 + k, 'taiko', 1, { g: 0.5, hi: 140 }, 1.5); E_(P0 + k, 'tick', 0.05, { f: 1800, g: 0.05 }, 0.3); });
  chords(SB.pend + 5, ['Dm', 'Bb', 'A'], { g: 0.045, lo: 400, hi: 2000, bass: 0.1 });
  arp(SB.pend + 5, ['Dm', 'Bb', 'A'], { v: 'bell', steps: 8, g: 0.03, dec: 1.8, pat: [4, 3, 2, 1, 4, 3, 2, 1] });
  E_(bars(SB.pont) - 0.9, 'whoosh', 0.9, { f0: 300, f1: 6000, f2: 6000, g: 0.1, peak: 0.97 }, 0.4);

  // ---- Pontryagin: bang-bang, syncopated ----
  chords(SB.pont, ['Dm', 'C', 'Bb', 'A'], { g: 0.035, bass: 0.12 });
  for (let b = 0; b < 4; b++) [0, 1.5, 3].forEach((bt) => {
    const c = ['Dm', 'C', 'Bb', 'A'][b];
    E_(B(SB.pont + b, bt), 'brass', 0.28, { n: CH[c].slice(1, 4), g: 0.05, a: 0.01, hi: 3200 }, 0.8);
    E_(B(SB.pont + b, bt), 'kick', 0.4, { g: 0.4, duck: 0.4 }, 0.6);
  });
  drums(SB.pont, 4, { snare: [0, 0, 1, 0], hat: 0.03, hat16: true });
  E_(bars(SB.pont) + 8.75, 'boom', 1, { g: 0.2, dec: 1.4 }, 1.5); // the hero arrives at rest on the origin (77/78_pont*.js)

  // ---- Kalman / Apollo (79/80_apollo*.js): a bell on each filter fix, quindar tones around CAPCOM, contact at 11.0 ----
  const AP0 = bars(SB.apollo);
  chords(SB.apollo, ['F', 'Dm', 'Bb', 'C', 'C'], { g: 0.04, lo: 350, hi: 1400, bass: 0.06, a: 1.5 });
  [0.15, ...A3.FIX.map(([t]) => t)].forEach((t) => E_(AP0 + t, 'bell', 1, { n: 93, g: 0.018, dec: 3.5, ratio: 1.41, idx: 1 }, 3.5));
  for (let b = 0; b < 5; b++) drums(SB.apollo + b, 1, { hat: 0.018 });
  [3.3, 8.2].forEach((t) => { E_(AP0 + t - 0.3, 'quindar', 0.25, { f: 2525 }, 0.3); E_(AP0 + t + 1.0, 'quindar', 0.25, { f: 2475 }, 0.3); });
  E_(AP0, 'whoosh', A3.T_TD, { f0: 60, f1: 140, f2: 80, g: 0.05, peak: 0.6 }, 0.5); // the descent engine
  E_(AP0 + A3.T_TD, 'boom', 1, { g: 0.2, hi: 70, lo: 30, dec: 1.2 }, 1.5);          // contact

  // ---- Act IV · rocket landing (MPC) ----
  E_(B(SB.rocket), 'whoosh', BAR * 5, { f0: 60, f1: 220, f2: 90, g: 0.16, peak: 0.85 }, 1);
  chords(SB.rocket, ['Dm', 'Bb', 'Gm', 'A', 'A'], { g: 0.04, bass: 0.13, hi: 2600 });
  pulse(SB.rocket, ['Dm', 'Bb', 'Gm', 'A', 'A'], { g: 0.04, sub: 4, pat: [1, 1, 3, 2], cut: 2600 });
  drums(SB.rocket, 5, { kick: [1, 1, 1, 1], snare: [0, 1, 0, 1], kg: 0.4, hat: 0.03, duck: 0.45 });
  for (let b = 0; b < 5; b++) E_(B(SB.rocket + b), 'taiko', 1, { g: 0.38 }, 1.5);
  A4.GUSTS.forEach(([t]) => E_(bars(SB.rocket) + t - 0.25, 'whoosh', 0.6, { f0: 900, f1: 3500, f2: 600, g: 0.09, peak: 0.45, pan: 0.5 }, 0.5)); // the gusts (82/83_rocket*.js)
  E_(B(SB.rocket + 5), 'boom', 3, { g: 0.6, dec: 3.2 }, 3);
  E_(B(SB.rocket + 5), 'brass', BAR * 0.9, { n: [50, 57, 62, 66], g: 0.07, a: 0.05 }, 1);
  E_(B(SB.rocket + 5, 1), 'pad', BAR * 0.8, { n: CH.D, g: 0.04, a: 0.3, lo: 800, hi: 2400 }, 3);

  // ---- Swarm consensus: shimmer ----
  chords(SB.swarm, ['Dm', 'Bb', 'F', 'C', 'Asus'], { g: 0.04, lo: 700, hi: 2600, bass: 0.08 });
  arp(SB.swarm, ['Dm', 'Bb', 'F', 'C', 'Asus'], { v: 'bell', steps: 16, g: 0.02, dec: 1.2, oct: 24, pat: [1, 2, 3, 4, 2, 3, 4, 1] });
  arp(SB.swarm + 1, ['Bb', 'F', 'C', 'Asus'], { steps: 8, g: 0.03, dec: 1.2, pat: [1, 3, 2, 4] });
  drums(SB.swarm, 5, { kick: [1, 0, 0, 1], snare: [0, 0, 1, 0], kg: 0.35, hat: 0.025 });

  // ---- Finale: riser → supernova → title formed by control → pulse → black ----
  const F0 = bars(SB.finale);
  E_(F0, 'shepard', BAR, { g: 0.05, per: 1.25, fmin: 110 }, 0.3);
  E_(F0, 'whoosh', BAR, { f0: 200, f1: 8000, f2: 8000, g: 0.14, peak: 0.98 }, 0.3);
  E_(F0, 'choir', BAR * 0.95, { n: [57, 61, 64, 69], g: 0.05, a: 2.2, r: 0.1 }, 0.5);
  const S0 = bars(SB.finale + 1);
  E_(S0, 'boom', 4, { g: 0.7, dec: 4, lo: 22 }, 4);
  E_(S0, 'taiko', 1, { g: 0.6 }, 2);
  ['Bb', 'C', 'Dm', 'Bb', 'C', 'D'].forEach((c, i) => {
    const t = S0 + i * BAR, n = CH[c];
    E_(t, 'choir', BAR, { n: n.slice(2).map((x) => x + 12), g: 0.08, a: 0.3, r: 1.6 }, 2);
    E_(t, 'brass', BAR * 0.95, { n: n.slice(0, 4), g: 0.055, a: 0.2, hi: 2400 }, 1);
    E_(t, 'bass', BAR * 0.95, { n: ROOT[c], g: 0.14 }, 1);
    E_(t, 'taiko', 1, { g: 0.35 }, 1.5);
  });
  chords(SB.finale + 1, ['Bb', 'C', 'Dm', 'Bb', 'C'], { g: 0.045, hi: 2800 });
  E_(bars(SB.finale + 7), 'pad', BAR * 2.2, { n: CH.D, g: 0.06, a: 0.2, r: 4, hi: 2600, duck: false }, 5);
  E_(bars(SB.finale + 7), 'choir', BAR * 2, { n: [62, 66, 69, 74], g: 0.09, a: 0.3, r: 4 }, 5);
  [[0, 86], [0.5, 81], [1, 78], [1.5, 74], [2, 69]].forEach(([bt, n]) => E_(B(SB.finale + 7, bt), 'bell', 1, { n, g: 0.04, dec: 4 }, 4));
  for (let k = 0; k < 6; k++) E_(bars(SB.finale + 6) + k * BAR * 0.5, 'heart', 0.4, { g: 0.3 - k * 0.035 }, 1);
}

function scoreEvents() { return buildScore(); }
