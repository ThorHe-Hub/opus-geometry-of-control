// The final render in segments (each fits one sitting), cut at scene boundaries, then joined losslessly with the score.
//   node tools/render_final.mjs --list          which segments exist
//   node tools/render_final.mjs --seg 3         render segment 3 (2560×1440, 4 sub-frames, 180° shutter, CRF 16)
//   node tools/render_final.mjs --mux           concat all segments + dist/score.wav → dist/geometry-of-control-1440p.mp4
// Every frame is a pure function of t, so segments join seamlessly (each starts on an IDR frame).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEG = path.join(ROOT, 'dist', 'final_segments'), OUT = path.join(ROOT, 'dist', 'geometry-of-control-1440p.mp4');
const CUTS = [0, 17.5, 42.5, 62.5, 85, 115, 135, 157.5, 185, 207.5];
const W = 2560, SUB = 4, SHUTTER = 0.5, CRF = 16;
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
mkdirSync(SEG, { recursive: true });
const segFile = (i) => path.join(SEG, `seg${String(i).padStart(2, '0')}.mp4`);

if (argv.includes('--list')) {
  for (let i = 0; i < CUTS.length - 1; i++) console.log(`seg ${i}  ${CUTS[i]}–${CUTS[i + 1]} s  ${existsSync(segFile(i)) ? 'done' : '—'}`);
} else if (opt('seg') !== null) {
  const i = Number(opt('seg')), tmp = segFile(i) + '.part.mp4';
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'export.mjs'), '--from', String(CUTS[i]), '--to', String(CUTS[i + 1]),
    '--w', String(W), '--sub', String(SUB), '--shutter', String(SHUTTER), '--crf', String(CRF), '--no-audio', '--out', tmp], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`segment ${i} failed`); process.exit(1); }
  rmSync(segFile(i), { force: true });
  renameSync(tmp, segFile(i));
  console.log(`segment ${i} → ${path.relative(ROOT, segFile(i))}`);
} else if (argv.includes('--mux')) {
  const missing = CUTS.slice(0, -1).map((_, i) => i).filter((i) => !existsSync(segFile(i)));
  if (missing.length) { console.error('missing segments: ' + missing.join(', ')); process.exit(1); }
  const dir = path.join(ROOT, '.venv', 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries');
  const ff = process.env.FFMPEG || (existsSync(dir) ? path.join(dir, readdirSync(dir).find((f) => f.startsWith('ffmpeg'))) : 'ffmpeg');
  const list = path.join(SEG, '_list.txt');
  writeFileSync(list, CUTS.slice(0, -1).map((_, i) => `file '${segFile(i).replace(/\\/g, '/')}'`).join('\n') + '\n');
  const r = spawnSync(ff, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(ROOT, 'dist', 'score.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', '-shortest', OUT], { stdio: 'inherit' });
  rmSync(list, { force: true });
  if (r.status !== 0) process.exit(1);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}
