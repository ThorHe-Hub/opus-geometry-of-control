// B站 cover from the Lyapunov funnel: a clean still (no HUD / formulas / subtitles / letterbox) rendered at 5120×2880,
// cropped to 16:10 around the equilibrium, graded, titled in the film's fonts (page side: tools/cover_page.js).
// B站 shows centre crops of the 16:10 upload (16:9 on PC, 4:3 in the app), so the title and the subject stay inside
// both, and nothing important sits in the bottom 15 % (stats bar).
//   node tools/cover.mjs --sheet 133.1,133.3 [--o '{"exp":0}'] [--cols 2]   candidates → tmp/cover/sheet.jpg
//   node tools/cover.mjs [--yt] [--o '{"t":133.3,"dolly":1.1,"T":{"formula":"…"}}']   → dist/cover/ (defaults: cover_page.js DEF)
// Keeps the 3840×2400 PNG masters and JPEGs (4:4:4, q 2); the crop / feed-card check goes to tmp/cover/check.jpg.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { launch, navigate } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// as in export.mjs: imageio-ffmpeg's binary in .venv (ffmpeg is not on PATH here)
const findFfmpeg = () => {
  const dir = path.join(ROOT, '.venv', 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries');
  const exe = existsSync(dir) && readdirSync(dir).find((f) => f.startsWith('ffmpeg'));
  return process.env.FFMPEG || (exe ? path.join(dir, exe) : 'ffmpeg');
};
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
// --yt: YouTube thumbnail (16:9, English title card, 1920×1080 + 1280×720, < 2 MB), same shot and grade
const YT = { ar: 16 / 9, name: 'youtube', sizes: [1920, 1280], clean: false, T: { lang: 'en', y: 200, size: 100 } };
const U = JSON.parse(opt('o', '{}')), P = argv.includes('--yt') ? YT : {};
const O = { ...P, ...U, G: { ...P.G, ...U.G }, T: { ...P.T, ...U.T } }, SHEET = opt('sheet', null), W = Number(opt('w', SHEET ? 1920 : 5120));
const OUT = path.join(ROOT, SHEET ? 'tmp/cover' : 'dist/cover');
mkdirSync(OUT, { recursive: true });

const errors = [];
const { session, close } = await launch({ width: 1920, height: 1080 });
session.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
try {
  await navigate(session, pathToFileURL(path.join(ROOT, 'index.html')).href + `?export=1&noaudio&clean&w=${W}`);
  await session.eval('new Promise((res) => { const w = () => window.__ready ? window.__ready.then(res) : setTimeout(w, 50); w(); })');
  await session.eval(readFileSync(path.join(ROOT, 'tools', 'cover_page.js'), 'utf8'));
  const t0 = Date.now();
  // --sheet 133.1,133.3 or a JSON list of per-tile overrides: --sheet '[{"t":133.1,"exp":0.2}, …]'
  const list = SHEET && (SHEET.startsWith('[') ? JSON.parse(SHEET) : SHEET.split(',').map((t) => ({ t: Number(t) })));
  const keys = SHEET
    ? await session.eval(`__cover.sheet(${JSON.stringify(list)}, ${JSON.stringify(O)}, ${Number(opt('cols', 2))})`)
    : await session.eval(`__cover.make(${JSON.stringify(O)})`);
  console.log(`rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s at ${W} px wide`);
  for (const k of keys) {
    // fetch the data URL in slices (a 3840×2400 PNG is tens of MB of base64)
    const n = await session.eval(`__co[${JSON.stringify(k)}].length`), parts = [];
    for (let i = 0; i < n; i += 4e6) parts.push(await session.eval(`__co[${JSON.stringify(k)}].slice(${i}, ${i + 4e6})`));
    const d = parts.join(''), dir = k.endsWith('check') ? path.join(ROOT, 'tmp', 'cover') : OUT, png = path.join(dir, k + '.png');
    mkdirSync(dir, { recursive: true });
    writeFileSync(png, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
    // JPEG for upload / review: 4:4:4 chroma (4:2:0 smears the thin amber lines on black)
    const jpg = png.replace(/\.png$/, '.jpg');
    execFileSync(findFfmpeg(), ['-y', '-v', 'error', '-i', png, '-pix_fmt', 'yuvj444p', '-q:v', '2', jpg]);
    if (!k.includes('3840')) unlinkSync(png);
    const kb = Math.round(statSync(jpg).size / 1024);
    console.log(`  ${path.relative(ROOT, jpg)}  ${kb} KB` + (P === YT && kb > 2000 && !k.includes('3840') ? '  (over YouTube’s 2 MB limit)' : ''));
  }
} finally {
  await close();
  console.log(errors.length ? `PAGE ERRORS (${errors.length}):\n` + errors.join('\n') : 'no page errors');
}
