// Minimal Chrome DevTools Protocol client (Node >= 22, global WebSocket). No npm deps.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export function findChrome() {
  const hit = CANDIDATES.find((p) => existsSync(p));
  if (!hit) throw new Error('Chrome/Edge not found. Set CHROME_PATH.');
  return hit;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
        else p.resolve(msg.result);
      } else if (msg.method) {
        (this.listeners.get(msg.method) || []).forEach((cb) => cb(msg.params));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(cb);
  }
  // Evaluate an expression in the page; returns the JSON value (awaits promises).
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`page exception: ${d.exception?.description || d.text}`);
    }
    return r.result.value;
  }
}

export async function launch({ width = 1920, height = 1080, headless = true, extraArgs = [] } = {}) {
  const userDir = mkdtempSync(path.join(tmpdir(), 'geoctl-'));
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${userDir}`,
    `--window-size=${width},${height}`,
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    ...(headless ? ['--headless=new'] : []),
    ...extraArgs,
    'about:blank',
  ];
  const proc = spawn(findChrome(), args, { stdio: 'ignore' });
  const exited = new Promise((res) => proc.once('exit', res));
  const portFile = path.join(userDir, 'DevToolsActivePort');
  let port = null, browserPath = null;
  for (let i = 0; i < 200 && !port; i++) {
    await sleep(100);
    if (existsSync(portFile)) {
      const [p, b] = readFileSync(portFile, 'utf8').split('\n').map((s) => s.trim());
      if (p && b) { port = Number(p); browserPath = b; }
    }
  }
  // proc.kill() alone left headless Chrome running (profile still locked) on Windows, so ask the
  // browser itself to exit over CDP; kill the process tree only if it does not.
  const shutdown = async () => {
    const bye = new Promise((res) => {
      if (!port) return res();
      try {
        const bws = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`);
        bws.addEventListener('open', () => bws.send(JSON.stringify({ id: 1, method: 'Browser.close' })), { once: true });
        bws.addEventListener('close', res, { once: true });
        bws.addEventListener('error', res, { once: true });
      } catch { res(); }
    });
    await Promise.race([bye, sleep(5000)]);
    if (!(await Promise.race([exited.then(() => true), sleep(3000).then(() => false)]))) {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      else proc.kill('SIGKILL');
      await Promise.race([exited, sleep(3000)]);
    }
    try { await rm(userDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
    catch (e) { console.warn(`[cdp] could not remove ${userDir}: ${e.code}`); }
  };
  if (!port) { await shutdown(); throw new Error('Chrome did not expose a DevTools port'); }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const session = new Session(ws);
  await session.send('Runtime.enable');
  await session.send('Page.enable');
  await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  session.on('Runtime.consoleAPICalled', (p) => {
    if (process.env.PAGE_LOG || p.type === 'error' || p.type === 'warning')
      console.log(`[page ${p.type}]`, p.args.map((a) => a.value ?? a.description).join(' '));
  });
  session.on('Runtime.exceptionThrown', (p) => console.error('[page error]', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  const close = async () => {
    try { ws.close(); } catch {}
    await shutdown();
  };
  return { session, close };
}

export async function navigate(session, url) {
  const loaded = new Promise((res) => session.on('Page.loadEventFired', res));
  await session.send('Page.navigate', { url });
  await loaded;
}
