// Audio engine: the whole score is synthesised offline (OfflineAudioContext, in chunks),
// overlap-added, then normalised and peak-limited. Every event is a pure function of time.
const SR = 48000;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let AX = null; // current chunk bus: { ctx, t0, dry, duck, rev, noise }

const at = (t) => Math.max(0, t - AX.t0);
function env(param, t, a, h, r, peak = 1, floor = 0.0001) {
  param.setValueAtTime(floor, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setValueAtTime(peak, t + a + h);
  param.exponentialRampToValueAtTime(floor, t + a + h + r);
}
function route(node, o = {}) {
  const pan = AX.ctx.createStereoPanner();
  pan.pan.value = clamp(o.pan || 0, -1, 1);
  node.connect(pan);
  pan.connect(o.duck ? AX.duck : AX.dry);
  if (o.rev) { const s = AX.ctx.createGain(); s.gain.value = o.rev; pan.connect(s); s.connect(AX.rev); }
  return pan;
}
function osc(type, f) { const o = AX.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
function gain(v = 0) { const g = AX.ctx.createGain(); g.gain.value = v; return g; }
function filt(type, f, q = 0.7) { const b = AX.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function noiseSrc(t, dur, seed = 0) {
  const s = AX.ctx.createBufferSource();
  s.buffer = AX.noise;
  s.loop = true;
  s.start(t, (hash1(seed * 7.13 + t) * 3) % 3, dur + 0.05);
  return s;
}
let _shaper = null;
function saturator(drive = 2) {
  const ws = AX.ctx.createWaveShaper();
  if (!_shaper) { _shaper = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; _shaper[i] = Math.tanh(x * drive) / Math.tanh(drive); } }
  ws.curve = _shaper;
  return ws;
}

// Procedural hall impulse response: diffuse noise, exponential decay, darkening tail.
let _irData = null;
function makeIR(ctx) {
  const len = Math.floor(SR * 3.6), buf = ctx.createBuffer(2, len, SR);
  if (!_irData) {
    _irData = [0, 1].map((ch) => {
      const r = rng(900 + ch), d = new Float32Array(len);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const tt = i / SR, pre = tt < 0.012 ? 0 : 1;
        const early = tt < 0.09 && r() < 0.004 ? (r() * 2 - 1) * 3 : 0;
        const n = (r() * 2 - 1) * Math.exp(-tt / 0.62) + early * Math.exp(-tt / 0.05);
        const k = 0.55 - 0.45 * Math.min(1, tt / 2.5);
        lp += k * (n - lp);
        d[i] = lp * pre;
      }
      return d;
    });
  }
  buf.copyToChannel(_irData[0], 0); buf.copyToChannel(_irData[1], 1);
  return buf;
}

// Side-chain duck value at absolute time t given the kick times (sorted).
function duckAt(t, kicks) {
  let g = 1;
  for (let i = 0; i < kicks.length; i++) {
    const d = t - kicks[i].t;
    if (d < -0.02) break;
    if (d > 0.5) continue;
    const depth = kicks[i].duck;
    g = Math.min(g, d < 0 ? 1 - depth * (1 + d / 0.02) : 1 - depth * Math.exp(-d / 0.16));
  }
  return g;
}

async function renderScore(events, total, onProgress) {
  events.sort((a, b) => a.t - b.t);
  const N = Math.ceil(total * SR), out = [new Float32Array(N), new Float32Array(N)];
  const kicks = events.filter((e) => e.p && e.p.duck).map((e) => ({ t: e.t, duck: e.p.duck }));
  const CH = 10;
  const nChunks = Math.ceil(total / CH);
  for (let c = 0; c < nChunks; c++) {
    const t0 = c * CH, t1 = Math.min(total, t0 + CH);
    const evs = events.filter((e) => e.t >= t0 && e.t < t1);
    if (!evs.length) { onProgress && onProgress((c + 1) / nChunks); continue; }
    const tailEnd = Math.min(total, Math.max(...evs.map((e) => e.t + (e.d || 0) + (e.tail ?? 2))) + 3.6);
    const len = Math.ceil((tailEnd - t0) * SR);
    const ctx = new OfflineAudioContext(2, len, SR);
    const nb = ctx.createBuffer(1, SR * 3, SR), nd = nb.getChannelData(0), r = rng(4242);
    for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
    const dry = ctx.createGain(), duck = ctx.createGain(), rev = ctx.createConvolver();
    rev.normalize = false; rev.buffer = makeIR(ctx);
    const revOut = ctx.createGain(); revOut.gain.value = 0.32;
    duck.connect(dry); rev.connect(revOut); revOut.connect(ctx.destination); dry.connect(ctx.destination);
    const pts = Math.max(2, Math.ceil((tailEnd - t0) * 200)), curve = new Float32Array(pts);
    for (let i = 0; i < pts; i++) curve[i] = duckAt(t0 + (i / (pts - 1)) * (tailEnd - t0), kicks);
    duck.gain.setValueCurveAtTime(curve, 0, tailEnd - t0);
    AX = { ctx, t0, dry, duck, rev, noise: nb };
    for (const e of evs) {
      const v = VOICES[e.v];
      if (v) v(e.t, e.d || 0, e.p || {}); else if (DEBUG) console.warn('unknown voice', e.v);
    }
    const buf = await ctx.startRendering();
    const o0 = Math.floor(t0 * SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch), o = out[ch], n = Math.min(d.length, N - o0);
      for (let i = 0; i < n; i++) o[o0 + i] += d[i];
    }
    AX = null;
    onProgress && onProgress((c + 1) / nChunks);
    await new Promise((res) => setTimeout(res, 0));
  }
  master(out);
  return out;
}

// Loudness normalisation (RMS target) + 5 ms look-ahead peak limiter + soft ceiling.
// RBJ biquad, applied in place (direct form I).
function biquad(x, type, f0, q, gainDb = 0) {
  const w = (TAU * f0) / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else { // low shelf (slope 1)
    const k = 2 * Math.sqrt(A) * al;
    b0 = A * (A + 1 - (A - 1) * cw + k); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - k);
    a0 = A + 1 + (A - 1) * cw + k; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - k;
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i], y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = y; x[i] = y;
  }
}

// Mix automation (dB over [t0, t1], 0.4 s ramps), before normalisation: the other big hits step back so the
// pendulum catch (bar 48, 120 s) is the loudest moment of the film, as the plan asks.
const mixAutoList = () => [ // SB loads later
  [bars(SB.title) + 2.3, bars(SB.title) + 5.0, -2.5],      // the title hit
  [bars(SB.rocket) + 12.3, bars(SB.rocket) + 14.5, -3.5],  // the booster's touchdown
  [bars(SB.finale) + 2.3, bars(SB.finale) + 17.5, -3.0],   // supernova → the title formed by control
  [bars(SB.finale) + 2.3, bars(SB.finale) + 4.0, -2.0],    // the supernova hit itself, once more
];
function mixAuto(out) {
  for (const [t0, t1, db] of mixAutoList()) {
    const g = Math.pow(10, db / 20), a = Math.floor((t0 - 0.4) * SR), b = Math.ceil((t1 + 0.4) * SR);
    for (let i = Math.max(0, a); i < Math.min(out[0].length, b); i++) {
      const t = i / SR, k = Math.min(sstep(t0 - 0.4, t0, t), 1 - sstep(t1, t1 + 0.4, t)), f = 1 + (g - 1) * k;
      out[0][i] *= f; out[1][i] *= f;
    }
  }
}

function master(out) {
  const [L, R] = out, N = L.length;
  for (const ch of out) { biquad(ch, 'hp', 28, 0.707); biquad(ch, 'ls', 140, 0.707, -2.5); }
  mixAuto(out);
  let s = 0;
  for (let i = 0; i < N; i++) s += L[i] * L[i] + R[i] * R[i];
  // RMS −17 dBFS: less of the film rides the limiter, so the mix automation can actually shape the peaks
  const rms = Math.sqrt(s / (2 * N)) || 1e-6, g0 = Math.min(8, Math.pow(10, -17 / 20) / rms);
  const la = Math.floor(0.005 * SR), ceil = 0.89, rel = Math.exp(-1 / (0.12 * SR)), att = Math.exp(-1 / (0.0015 * SR));
  const peak = new Float32Array(N);
  for (let i = 0; i < N; i++) peak[i] = Math.max(Math.abs(L[i]), Math.abs(R[i])) * g0;
  const need = new Float32Array(N);
  const dq = new Int32Array(N); let h = 0, tl = 0;
  for (let i = N - 1; i >= 0; i--) {
    while (tl > h && peak[dq[tl - 1]] <= peak[i]) tl--;
    dq[tl++] = i;
    while (dq[h] > i + la) h++;
    const pk = peak[dq[h]];
    need[i] = pk > ceil ? ceil / pk : 1;
  }
  // Linear below the knee, tanh-rounded above it: nothing can exceed 0.98.
  const knee = 0.8, soft = (x) => {
    const a = Math.abs(x);
    return a <= knee ? x : Math.sign(x) * (knee + (0.98 - knee) * Math.tanh((a - knee) / (0.98 - knee)));
  };
  let gg = 1;
  for (let i = 0; i < N; i++) {
    const tgt = need[i];
    gg = tgt < gg ? att * gg + (1 - att) * tgt : rel * gg + (1 - rel) * tgt;
    gg = Math.min(gg, tgt * 1.02);
    const k = g0 * gg;
    L[i] = soft(L[i] * k); R[i] = soft(R[i] * k);
  }
  // Final 3.5 s raised-cosine fade so the last chord dies with the picture.
  const f0 = Math.max(0, N - Math.floor(3.5 * SR));
  for (let i = f0; i < N; i++) { const g = 0.5 + 0.5 * Math.cos((PI * (i - f0)) / (N - f0)); L[i] *= g; R[i] *= g; }
}

function toWav(out) {
  const N = out[0].length, buf = new ArrayBuffer(44 + N * 4), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + N * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true);
  v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, N * 4, true);
  for (let i = 0, o = 44; i < N; i++) for (let ch = 0; ch < 2; ch++, o += 2) v.setInt16(o, Math.round(clamp(out[ch][i], -1, 1) * 32767), true);
  return new Uint8Array(buf);
}
