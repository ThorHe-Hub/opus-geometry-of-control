// The frame function, clock, input, export hooks. Every scene has registered itself by now.
SCENES.sort((a, b) => a.t0 - b.t0);
const byId = Object.fromEntries(SCENES.map((s) => [s.id, s]));

let lastScene = null;
// Stills only (tools/cover.mjs): a fixed camera pose { p, q, fov } that overrides the scene's own camera, so the
// sub-frames of a long exposure move the particles but not the camera.
let CAM_HOLD = null;
// One scene's finished frame at film time t, left in composer.readBuffer (t may lie a little outside the scene during a dissolve).
function drawScene(host, t) {
  resetFX();
  fx.clearRect(0, 0, W, H); ui.clearRect(0, 0, W, H);
  const hlt = t - host.t0;
  let sc = host, lt = hlt, teaser = -1;
  const rd = host.redirect && host.redirect(hlt);
  if (rd) { sc = byId[rd.id]; lt = rd.lt; teaser = rd.teaser; }
  if (sc !== lastScene) { SCENES.forEach((s) => (s.group.visible = s === sc)); lastScene = sc; }
  const th = typeof sc.theme === 'function' ? sc.theme(lt) : [sc.theme];
  useTheme(...th);
  sc.update(lt, t);
  if (CAM_HOLD) {
    camera.position.fromArray(CAM_HOLD.p); camera.quaternion.fromArray(CAM_HOLD.q); camera.fov = CAM_HOLD.fov;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  if (!CLEAN) sc.draw && sc.draw(lt, t);
  const d = host.t1 - host.t0;
  // fadeIn/fadeOut 0 = hard cut (e.g. hidden inside a white flash); sstep(0, 0, x) would be NaN
  const fin = host.fadeIn > 0 ? 1 - sstep(0, host.fadeIn, hlt) : 0, fout = host.fadeOut > 0 ? sstep(d - host.fadeOut, d, hlt) : 0;
  FX.fade = Math.max(FX.fade, fin, fout, sstep(TOTAL - 4, TOTAL - 1.5, t));
  if (teaser >= 0) {
    FX.fade = 0; FX.flash = Math.max(FX.flash, 0.8 * Math.exp(-teaser / 0.07)); FX.sat *= 0.6; FX.ca = 0.02; FX.grain = 0.1;
    if (teaser > 0.56) FX.fade = 1;
    fx.clearRect(0, 0, W, H); ui.clearRect(0, 0, W, H);
  } else if (!CLEAN) {
    const info = typeof host.hud === 'function' ? host.hud(hlt) : host.hud;
    const hA = typeof host.hudAlpha === 'function' ? host.hudAlpha(hlt) : host.hudAlpha ?? 1;
    const ha = hA * sstep(host.hudIn, host.hudIn + 0.9, hlt) * (1 - sstep(TOTAL - 5, TOTAL - 3, t)) * (HUD_ON ? 1 : 0);
    hudFrame(ui, t, info || {}, ha);
    subtitles(ui, t, SUBS);
  }
  if (CLEAN) { FX.letter = 16 / 9; FX.scan = 0; FX.grain = Math.min(FX.grain, 0.02); }
  else if (t > TOTAL - 3.4) {
    const a = win(t, TOTAL - 3.2, TOTAL - 0.3, 0.8, 0.8);
    text(ui, 'GEOMETRY · SHADERS · SCORE — ALL PROCEDURAL', W / 2, H / 2, { font: FONT.title, size: 12, spacing: 6, align: 'center', color: `rgba(140,180,210,${0.7 * a})` });
    text(ui, 'three.js r128 · WebGL · Web Audio', W / 2, H / 2 + 28, { font: FONT.mono, size: 11, spacing: 3, align: 'center', color: `rgba(110,150,180,${0.6 * a})` });
  }
  renderFrame(t);
}

// Dissolves, keyed by the incoming scene: the two finished frames are mixed over the overlap (s), centred on the cut.
// Every scene clamps its own clock, so it can run a little past its bounds. Act openings keep their dip to black.
const XF = { maxwell: 0.8, state: 0.8, phase: 0.8, lorenz: 0.8, nyq: 0.8, pend: 0.6, pont: 0.8, apollo: 0.8, swarm: 0.8, finale: 0.8 };
function compose(t) {
  t = clamp(t, 0, TOTAL);
  const host = sceneAt(t), i = SCENES.indexOf(host), nx = SCENES[i + 1], pv = SCENES[i - 1];
  let a = null, b = null;
  if (nx && XF[nx.id] && t > nx.t0 - XF[nx.id] / 2) { a = host; b = nx; }
  else if (pv && XF[host.id] && t < host.t0 + XF[host.id] / 2) { a = pv; b = host; }
  finalPass.uniforms.uPrevMix.value = 0;
  if (!a) { drawScene(host, t); return; }
  drawScene(a, t);
  copyPass.renderToScreen = false; copyPass.render(renderer, rtPrev, composer.readBuffer);
  finalPass.uniforms.uPrevMix.value = 1 - sstep(b.t0 - XF[b.id] / 2, b.t0 + XF[b.id] / 2, t);
  drawScene(b, t);
  finalPass.uniforms.uPrevMix.value = 0;
}
function present(src) { copyPass.renderToScreen = true; copyPass.render(renderer, null, src || composer.readBuffer); }
function frame(t) { compose(t); present(); }
// Export: S sub-frames spread over the shutter (fraction of the frame interval), averaged in rtAcc = motion blur.
function frameBlur(t, S, shutter, fps) {
  renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 1); renderer.clear();
  accPass.uniforms.opacity.value = 1 / S; accPass.renderToScreen = false;
  GRAIN_T = t;
  for (let k = 0; k < S; k++) {
    compose(t + (((k + 0.5) / S - 0.5) * shutter) / fps);
    renderer.autoClear = false; // renderer.render() would otherwise clear rtAcc before each additive pass
    accPass.render(renderer, rtAcc, composer.readBuffer);
    renderer.autoClear = true;
  }
  GRAIN_T = null;
  present(rtAcc);
}

// ---- clock & audio -------------------------------------------------------
let HUD_ON = true;
const clock = { t: clamp(parseFloat(QS.get('t')) || 0, 0, TOTAL), playing: false, perf0: 0, t0: 0, ac: null, buf: null, src: null, gain: null, muted: false };
function now() {
  if (!clock.playing) return clock.t;
  const el = clock.ac && clock.src ? clock.ac.currentTime - clock.perf0 : (performance.now() - clock.perf0) / 1000;
  return clock.t0 + el;
}
function play() {
  if (clock.playing) return;
  clock.t0 = clock.t >= TOTAL ? 0 : clock.t;
  if (clock.ac && clock.buf) {
    clock.src = clock.ac.createBufferSource();
    clock.src.buffer = clock.buf; clock.src.connect(clock.gain);
    clock.src.start(0, clock.t0);
    clock.perf0 = clock.ac.currentTime;
  } else clock.perf0 = performance.now();
  clock.playing = true;
}
function pause() {
  if (!clock.playing) return;
  clock.t = now();
  if (clock.src) { try { clock.src.stop(); } catch (e) { /* already stopped */ } clock.src = null; }
  clock.playing = false;
}
function seek(t) { const p = clock.playing; pause(); clock.t = clamp(t, 0, TOTAL); if (p) play(); }

window.addEventListener('keydown', (e) => {
  if (EXPORT) return;
  const k = e.key;
  if (k === ' ') { e.preventDefault(); clock.playing ? pause() : play(); }
  else if (k === 'ArrowRight') seek(now() + (e.shiftKey ? 1 : 5));
  else if (k === 'ArrowLeft') seek(now() - (e.shiftKey ? 1 : 5));
  else if (/^[0-9]$/.test(k)) seek(bars([SB.cold, SB.euler, SB.watt, SB.state, SB.black, SB.pend, SB.apollo, SB.rocket, SB.swarm, SB.finale][+k]));
  else if (k === 'h' || k === 'H') HUD_ON = !HUD_ON;
  else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (k === 'm' || k === 'M') { clock.muted = !clock.muted; if (clock.gain) clock.gain.gain.value = clock.muted ? 0 : 1; }
});
const scrub = document.getElementById('scrub');
scrub.setAttribute('aria-valuemax', String(Math.round(TOTAL)));
scrub.addEventListener('click', (e) => seek((e.clientX / window.innerWidth) * TOTAL));
function loop() {
  const t = now();
  if (clock.playing && t >= TOTAL) { pause(); clock.t = TOTAL; }
  frame(t);
  scrub.firstElementChild.nextElementSibling.style.width = (100 * t) / TOTAL + '%';
  scrub.setAttribute('aria-valuenow', String(Math.round(t)));
  requestAnimationFrame(loop);
}
