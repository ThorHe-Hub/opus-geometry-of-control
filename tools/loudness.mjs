// Loudness arc of dist/score.wav: RMS per scene and the loudest 0.5 s windows. node tools/loudness.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buf = readFileSync(path.join(ROOT, 'dist', 'score.wav'));
let off = 12, dOff = -1, dLen = 0, sr = 48000, nch = 2;
while (off + 8 <= buf.length) {
  const id = buf.toString('ascii', off, off + 4), len = buf.readUInt32LE(off + 4);
  if (id === 'fmt ') { nch = buf.readUInt16LE(off + 10); sr = buf.readUInt32LE(off + 12); }
  if (id === 'data') { dOff = off + 8; dLen = len; break; }
  off += 8 + len + (len & 1);
}
const pcm = new Int16Array(buf.buffer.slice(buf.byteOffset + dOff, buf.byteOffset + dOff + dLen)), N = pcm.length / nch;
const rms = (t0, t1) => {
  const a = Math.floor(t0 * sr) * nch, b = Math.min(N, Math.floor(t1 * sr)) * nch;
  let s = 0; for (let i = a; i < b; i++) { const v = pcm[i] / 32768; s += v * v; }
  return 10 * Math.log10(s / Math.max(1, b - a) + 1e-20);
};
const wins = [];
for (let t = 0; t + 0.5 <= N / sr; t += 0.25) wins.push([t, rms(t, t + 0.5)]);
wins.sort((a, b) => b[1] - a[1]);
const top = [];
for (const w of wins) { if (top.every((x) => Math.abs(x[0] - w[0]) > 3)) top.push(w); if (top.length >= 8) break; }
console.log('loudest 0.5 s windows: ' + top.map(([t, r]) => `${t.toFixed(2)}s ${r.toFixed(1)}`).join(' | '));
const c = top.find(([t]) => t > 118 && t < 123);
console.log(c && top[0] === c ? 'the pendulum catch is the loudest moment' : `catch (≈120 s) rank ${top.indexOf(c) + 1 || '>8'}`);
