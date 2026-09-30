// Contact sheet of many frames in one image, for reviewing a batch of scenes:
//   node tools/sheet.mjs 12.5 19 21 [--cols 3] [--tile 640] [--crop x,y,w,h] [--out tmp/preview/sheet.jpg]
// Uses the page's ?export mode (deterministic frame(t)); reports page errors.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, navigate } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
// --w 2560 renders at that output width (crop stays in design px) · --sub 4 renders each frame with motion blur
const vals = new Set(['--cols', '--tile', '--crop', '--out', '--w', '--sub'].map((k) => argv.indexOf(k) + 1).filter((i) => i > 0));
const times = argv.filter((a, i) => !a.startsWith('--') && !vals.has(i)).map(Number);
const cols = Number(opt('cols', 3)), tw = Number(opt('tile', 640)), crop = opt('crop', null)?.split(',').map(Number) || null;
const OW = Number(opt('w', 1920)), SUB = Number(opt('sub', 1));
const out = path.resolve(ROOT, opt('out', 'tmp/preview/sheet.jpg'));
mkdirSync(path.dirname(out), { recursive: true });

const errors = [];
const { session, close } = await launch({ width: 1920, height: 1080 });
session.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
try {
  await navigate(session, pathToFileURL(path.join(ROOT, 'index.html')).href + `?export=1&noaudio&w=${OW}` + (argv.includes('--clean') ? '&clean' : ''));
  await session.eval(`new Promise((res, rej) => { const s = Date.now(); const w = () => window.__ready ? window.__ready.then(res, rej)
    : Date.now() - s > 120000 ? rej(new Error('timeout: ' + document.getElementById('lmsg').textContent)) : setTimeout(w, 50); w(); })`);
  const cdn = await session.eval('document.querySelectorAll("script[src]").length');
  console.log(cdn ? `three.js from the CDN (${cdn} scripts): the inlined copy failed` : 'three.js inlined (no network)');
  const data = await session.eval(`(async () => {
    const T = ${JSON.stringify(times)}, cols = ${cols}, tw = ${tw}, crop = ${JSON.stringify(crop)};
    const src = crop || [0, 0, 1920, 1080], th = Math.round(tw * src[3] / src[2]);
    const c = document.createElement('canvas'); c.width = cols * tw; c.height = Math.ceil(T.length / cols) * th;
    const g = c.getContext('2d');
    for (let i = 0; i < T.length; i++) {
      const img = new Image(); img.src = window.__export.frame(T[i], 0.92, ${SUB}); await img.decode();
      const x = (i % cols) * tw, y = Math.floor(i / cols) * th, k = img.width / 1920;
      g.drawImage(img, src[0] * k, src[1] * k, src[2] * k, src[3] * k, x, y, tw, th);
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x, y, 92, 20); g.fillStyle = '#ff0'; g.font = '13px monospace'; g.fillText('t=' + T[i].toFixed(2), x + 5, y + 14);
    }
    return c.toDataURL('image/jpeg', 0.88);
  })()`);
  writeFileSync(out, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
  console.log(`${times.length} frames → ${path.relative(ROOT, out)}`);
} finally {
  await close();
  console.log(errors.length ? `PAGE ERRORS (${errors.length}):\n` + errors.join('\n') : 'no page errors');
}
