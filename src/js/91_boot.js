// Boot: fonts → shaders → score (offline synthesis) → play. Export/preview hooks for tools/*.mjs.
const NOAUDIO = QS.has('noaudio');
async function boot() {
  const bar = document.getElementById('lbar'), msg = document.getElementById('lmsg'), go = document.getElementById('go');
  const step = async (p, m) => { bar.style.width = (100 * p).toFixed(1) + '%'; msg.textContent = m; await new Promise((r) => setTimeout(r, 16)); };
  await step(0.02, 'FONTS');
  const faces = ['400 20px "Noto Serif SC"', '600 20px "Noto Serif SC"', '900 20px "Noto Serif SC"', '20px Michroma', '400 20px "GoC Mono"', '500 20px "GoC Mono"',
    '20px "STIX Two Text"', 'italic 20px "STIX Two Text"', '20px "STIX Two Math"', '500 20px "Cormorant Garamond"', 'italic 500 20px "Cormorant Garamond"', '500 20px Caveat', '20px "GoC Oldstyle"', 'italic 20px "GoC Oldstyle"'];
  await Promise.all(faces.map((f) => document.fonts.load(f, 'Aa0 控制 ∈⇒∞')));
  await step(0.08, 'SHADERS');
  SCENES.forEach((s) => (s.group.visible = true));
  renderer.compile(root, camera);
  frame(0);
  lastScene = null;
  let audio = null;
  if (!NOAUDIO) {
    await step(0.1, 'SYNTHESISING SCORE');
    audio = await renderScore(scoreEvents(), TOTAL, (p) => step(0.1 + 0.88 * p, `SYNTHESISING SCORE · ${Math.round(p * 100)}%`));
  }
  await step(1, 'READY');
  return audio;
}

if (EXPORT) {
  const ready = boot().then((audio) => {
    window.__export = {
      total: TOTAL,
      frame: (t, q = 0.95, S = 1, shutter = 0.5, fps = 60) => { if (S > 1) frameBlur(t, S, shutter, fps); else frame(t); return renderer.domElement.toDataURL('image/jpeg', q); },
      wav: () => { const b = toWav(audio); window.__wav = b; return b.length; },
      wavChunk: (i, n) => {
        const b = window.__wav.subarray(i, i + n);
        let s = '';
        for (let k = 0; k < b.length; k += 0x8000) s += String.fromCharCode.apply(null, b.subarray(k, k + 0x8000));
        return btoa(s);
      },
      scenes: SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })),
      // stills (tools/cover.mjs): render into the canvas without encoding; camera pose at t; hold a pose; world → design px
      render: (t, S = 1, shutter = 0.5, fps = 60) => { if (S > 1) frameBlur(t, S, shutter, fps); else frame(t); return renderer.domElement; },
      pose: (t) => { CAM_HOLD = null; frame(t); return { p: camera.position.toArray(), q: camera.quaternion.toArray(), fov: camera.fov }; },
      hold: (pose) => { CAM_HOLD = pose; },
      project: (x, y, z) => toScreen(x, y, z),
      lib: { drawTex, text, FONT, COL, css },
      debug: { th0: byId.cold.th0, catchTheta: PD.TH_C, K: CP.K[0], residual: CP.residual, sfResidual: SF.residual },
    };
    document.getElementById('loader').style.display = 'none';
    return true;
  });
  window.__ready = ready.catch((e) => { console.error(e); throw e; });
} else {
  boot().then((audio) => {
    const go = document.getElementById('go'), loader = document.getElementById('loader');
    go.classList.add('ready');
    go.focus();
    go.addEventListener('click', async () => {
      if (audio) {
        clock.ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
        await clock.ac.resume();
        clock.buf = clock.ac.createBuffer(2, audio[0].length, SR);
        clock.buf.copyToChannel(audio[0], 0); clock.buf.copyToChannel(audio[1], 1);
        clock.gain = clock.ac.createGain(); clock.gain.connect(clock.ac.destination);
      }
      loader.style.opacity = 0;
      setTimeout(() => (loader.style.display = 'none'), 900);
      play();
    }, { once: true });
    requestAnimationFrame(loop);
  }).catch((e) => {
    console.error(e);
    document.getElementById('lmsg').textContent = 'ERROR · ' + e.message;
  });
}
