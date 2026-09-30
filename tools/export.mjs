// Deterministic frame-by-frame MP4 export of index.html through headless Chrome + ffmpeg.
//   node tools/export.mjs [--fps 60] [--from 0] [--to <end>] [--crf 16] [--out dist/geometry-of-control.mp4]
//   node tools/export.mjs --audio-only        (writes dist/score.wav and prints loudness stats)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, navigate } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);
// --w 2560: output width (16:9, layouts stay in design px) · --sub 4: sub-frames per frame (motion blur) · --shutter 0.5 (180°)
const FPS = Number(opt('fps', 60)), CRF = String(opt('crf', 16)), OW = Number(opt('w', 1920)), SUB = Number(opt('sub', 1)), SHUT = Number(opt('shutter', 0.5));
const OUT = path.resolve(ROOT, opt('out', 'dist/geometry-of-control.mp4'));
const AUDIO_ONLY = flag('audio-only'), NO_AUDIO = flag('no-audio');
mkdirSync(path.dirname(OUT), { recursive: true });

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const cands = [path.join(ROOT, '.venv', 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries')];
  const lib = path.join(ROOT, '.venv', 'lib');
  if (existsSync(lib)) readdirSync(lib).forEach((py) => cands.push(path.join(lib, py, 'site-packages', 'imageio_ffmpeg', 'binaries')));
  for (const dir of cands) {
    if (!existsSync(dir)) continue;
    const exe = readdirSync(dir).find((f) => f.startsWith('ffmpeg'));
    if (exe) return path.join(dir, exe);
  }
  return 'ffmpeg';
}
const FFMPEG = findFfmpeg();
const run = (args, opts = {}) => new Promise((res, rej) => {
  const p = spawn(FFMPEG, args, { stdio: opts.stdin ? ['pipe', 'ignore', 'pipe'] : ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; if (err.length > 200000) err = err.slice(-100000); });
  p.on('close', (code) => (code === 0 ? res(err) : rej(new Error(`ffmpeg exited ${code}\n${err.slice(-3000)}`))));
  // a failed frame must reject here (not escape as an unhandled rejection), so the caller's finally closes Chrome
  if (opts.stdin) opts.stdin(p).catch((e) => { p.kill(); rej(e); });
});

const url = pathToFileURL(path.join(ROOT, 'index.html')).href + `?export=1&w=${OW}` + (NO_AUDIO ? '&noaudio' : '');
const { session, close } = await launch({ width: 1920, height: 1080 });
try {
  const t0 = Date.now();
  await navigate(session, url);
  await session.eval('new Promise((res) => { const w = () => window.__ready ? window.__ready.then(res) : setTimeout(w, 50); w(); })');
  const TOTAL = await session.eval('window.__export.total');
  console.log(`page ready in ${((Date.now() - t0) / 1000).toFixed(1)} s (score synthesis included), film ${TOTAL.toFixed(2)} s`);
  const wavPath = path.join(path.dirname(OUT), 'score.wav');
  if (!NO_AUDIO) {
    const n = await session.eval('window.__export.wav()'), parts = [];
    for (let i = 0; i < n; i += 4 << 20) parts.push(Buffer.from(await session.eval(`window.__export.wavChunk(${i}, ${4 << 20})`), 'base64'));
    writeFileSync(wavPath, Buffer.concat(parts));
    const stats = await run(['-hide_banner', '-nostats', '-i', wavPath, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
    const tail = stats.slice(stats.lastIndexOf('Summary:'));
    console.log(`score.wav ${(n / 1048576).toFixed(1)} MB\n${tail.trim()}`);
  }
  // --audio-only stops here; it must still fall through to finally so the browser is closed
  // (a process.exit() here used to leave headless Chrome running).
  if (!AUDIO_ONLY) await exportVideo(TOTAL, wavPath);
} finally {
  await close();
}

async function exportVideo(TOTAL, wavPath) {
  const FROM = Number(opt('from', 0)), TO = Math.min(TOTAL, Number(opt('to', TOTAL))), N = Math.round((TO - FROM) * FPS);
  const args = ['-y', '-hide_banner', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (!NO_AUDIO) args.push('-ss', String(FROM), '-t', String(TO - FROM), '-i', wavPath, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '320k');
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', OUT);
  const tStart = Date.now();
  await run(args, {
    stdin: async (p) => {
      for (let i = 0; i < N; i++) {
        const t = FROM + i / FPS;
        const data = await session.eval(`window.__export.frame(${t.toFixed(6)}, 0.95, ${SUB}, ${SHUT}, ${FPS})`);
        const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
        if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once('drain', r));
        if (i % 120 === 0 || i === N - 1) {
          const el = (Date.now() - tStart) / 1000, eta = (el / (i + 1)) * (N - i - 1);
          process.stdout.write(`\rframe ${i + 1}/${N}  t=${t.toFixed(2)}s  ${((i + 1) / el).toFixed(1)} fps  ETA ${Math.round(eta)} s   `);
        }
      }
      p.stdin.end();
    },
  });
  console.log(`\nwrote ${path.relative(ROOT, OUT)} in ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
}
