'use strict';
// ============================================================================
// THE GEOMETRY OF CONTROL · 控制的几何
// Everything below is procedural: geometry, shaders, typography layout, score.
// Time model: every frame is a pure function of t (seconds). No hidden state.
// ============================================================================

const QS = new URLSearchParams(location.search);
const EXPORT = QS.has('export');
const DEBUG = QS.has('debug');
const CLEAN = QS.has('clean'); // picture only: no HUD, formulas, subtitles, letterbox or scanlines (stills for covers)
const W = 1920, H = 1080;               // design / export resolution
const BPM = 96, BEAT = 60 / BPM, BAR = 4 * BEAT; // 0.625 s beat, 2.5 s bar
const bars = (b) => b * BAR;

const PI = Math.PI, TAU = 2 * Math.PI;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, x) => clamp((x - a) / (b - a));
const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
const sstep = (a, b, x) => { const t = invLerp(a, b, x); return t * t * (3 - 2 * t); };
const s5 = (a, b, x) => { const t = invLerp(a, b, x); return t * t * t * (t * (t * 6 - 15) + 10); };
const fract = (x) => x - Math.floor(x);

// Easing (t in [0,1])
const E = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
  outBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
};

// Window: 0 before a, fade in over fi, hold, fade out over fo ending at b.
const win = (t, a, b, fi = 0.4, fo = 0.4) =>
  Math.min(sstep(a, a + fi, t), 1 - sstep(b - fo, b, t));

// Deterministic PRNG (mulberry32) and hashes.
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash1 = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
function gauss(r) { // Box–Muller from a PRNG
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}
// Smooth 1D value noise for camera shake etc.
function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}

// Palette (display-space RGB 0..1). HDR intensity is applied per material.
const COL = {
  white: [1, 1, 1],
  ice: [0.78, 0.92, 1.0],
  cyan: [0.35, 0.85, 1.0],
  teal: [0.25, 1.0, 0.85],
  blue: [0.3, 0.5, 1.0],
  gold: [1.0, 0.78, 0.38],
  amber: [1.0, 0.62, 0.22],
  red: [1.0, 0.22, 0.2],
  magenta: [1.0, 0.3, 0.7],
  violet: [0.62, 0.45, 1.0],
  dim: [0.3, 0.42, 0.55],
};
const css = (c, a = 1, k = 1) =>
  `rgba(${Math.round(clamp(c[0] * k) * 255)},${Math.round(clamp(c[1] * k) * 255)},${Math.round(clamp(c[2] * k) * 255)},${a})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Format numbers for HUD readouts.
const fmt = (x, d = 2) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
const fmtc = (re, im, d = 2) =>
  Math.abs(im) < 1e-6 ? fmt(re, d) : `${fmt(re, d)} ${im >= 0 ? '+' : '−'} ${Math.abs(im).toFixed(d)}j`;
