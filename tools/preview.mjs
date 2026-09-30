// Render still frames at given times: node tools/preview.mjs 12.8 30 121.5 [--audio]
// Writes tmp/preview/t_<time>.jpg. Uses the page's ?export mode (deterministic frame(t)).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, navigate } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const withAudio = args.includes('--audio');
const times = args.filter((a) => !a.startsWith('--')).map(Number);
const out = path.join(ROOT, 'tmp', 'preview');
mkdirSync(out, { recursive: true });

const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '?export=1' + (withAudio ? '' : '&noaudio');
const { session, close } = await launch({ width: 1920, height: 1080 });
try {
  const t0 = Date.now();
  await navigate(session, url);
  await session.eval('new Promise((res) => { const w = () => window.__ready ? window.__ready.then(res) : setTimeout(w, 50); w(); })');
  console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log('debug', JSON.stringify(await session.eval('window.__export.debug')));
  for (const t of times) {
    const s = Date.now();
    const data = await session.eval(`window.__export.frame(${t}, 0.9)`);
    const file = path.join(out, `t_${t.toFixed(2)}.jpg`);
    writeFileSync(file, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
    console.log(`t=${t.toFixed(2)}  ${Date.now() - s} ms  → ${path.relative(ROOT, file)}`);
  }
} finally {
  await close();
}
