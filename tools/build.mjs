// Concatenate src/js/*.js (sorted), subset + inline fonts, write ./index.html.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_DIR = path.join(ROOT, 'src', 'js');
const CACHE = path.join(ROOT, '.cache');
if (!existsSync(CACHE)) mkdirSync(CACHE);

const files = readdirSync(JS_DIR).filter((f) => f.endsWith('.js')).sort();
const app = files
  .map((f) => `// ---- ${f} ----\n` + readFileSync(path.join(JS_DIR, f), 'utf8'))
  .join('\n');

const textFile = path.join(CACHE, 'glyph-source.txt');
const cssFile = path.join(CACHE, 'fonts.css');
writeFileSync(textFile, app, 'utf8');
const py = process.platform === 'win32'
  ? path.join(ROOT, '.venv', 'Scripts', 'python.exe')
  : path.join(ROOT, '.venv', 'bin', 'python');
console.log('subsetting fonts…');
execFileSync(py, [path.join(ROOT, 'tools', 'subset_fonts.py'), textFile, cssFile], { stdio: 'inherit' });

// three.js r128 + the postprocessing examples, inlined so index.html runs offline (tools/fetch_vendor.sh).
// Order matters: ShaderPass / RenderPass / UnrealBloomPass extend THREE.Pass, which EffectComposer.js defines.
// Each file gets its own <script>, so one failure cannot silently take the rest with it.
const VENDOR = ['three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js']
  .map((f) => path.join(ROOT, 'tools', 'vendor', 'three', f));
const haveVendor = VENDOR.every((f) => existsSync(f));
const vendor = haveVendor ? VENDOR.map((f) => readFileSync(f, 'utf8').replace(/<\/script/gi, '<\\/script')).join('\n</script>\n<script>\n') : '';
if (!haveVendor) console.log('tools/vendor/three missing: index.html will load three.js from a CDN (run tools/fetch_vendor.sh)');
const shell = readFileSync(path.join(ROOT, 'src', 'shell.html'), 'utf8');
const html = shell
  .replace('/*__FONTS__*/', () => readFileSync(cssFile, 'utf8'))
  .replace('/*__VENDOR__*/', () => vendor)
  .replace('/*__APP__*/', () => app);
const out = path.join(ROOT, 'index.html');
writeFileSync(out, html, 'utf8');
console.log(`index.html  ${(html.length / 1024).toFixed(0)} KB  (${files.length} modules, ${app.split('\n').length} lines JS)`);
