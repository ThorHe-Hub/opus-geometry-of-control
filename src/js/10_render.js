// Renderer, HDR composer, overlay canvases and the final grading shader. The composer never draws to the screen
// itself: compose() (90_main.js) leaves the finished frame in composer.readBuffer, so two scenes can be dissolved
// (rtPrev) and several sub-frames accumulated for motion blur (rtAcc) before present() blits one to the canvas.
// ?w=2560 renders the export at that width (16:9); every layout stays in design pixels (1920×1080).
const OUT_W = EXPORT ? clamp(parseInt(QS.get('w'), 10) || W, 640, 7680) : W, OUT_H = Math.round((OUT_W * 9) / 16), LSC = OUT_W / W;
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: EXPORT });
renderer.setPixelRatio(1);
renderer.autoClear = true;
renderer.setClearColor(0x000000, 1);
stage.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 600);
const root = new THREE.Scene();

// 2D layers, drawn in design pixels through a transform (crisp at any output size). `fx` goes through bloom; `ui` sits on top.
function makeLayer() {
  const c = document.createElement('canvas');
  c.width = Math.round(W * LSC); c.height = Math.round(H * LSC);
  const g = c.getContext('2d');
  g.setTransform(LSC, 0, 0, LSC, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return { c, g, tex };
}
const FXL = makeLayer(), UIL = makeLayer();
const fx = FXL.g, ui = UIL.g;

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

const OverlayShader = {
  uniforms: { tDiffuse: { value: null }, tFX: { value: FXL.tex }, uGain: { value: 1.6 } },
  vertexShader: QUAD_VS,
  fragmentShader: `uniform sampler2D tDiffuse, tFX; uniform float uGain; varying vec2 vUv;
  void main(){ vec4 b = texture2D(tDiffuse, vUv); vec4 f = texture2D(tFX, vUv);
    gl_FragColor = vec4(b.rgb * (1.0 - f.a) + f.rgb * f.a * uGain, 1.0); }`,
};

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, tUI: { value: UIL.tex }, tPrev: { value: null }, uPrevMix: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
    uTime: { value: 0 }, uExposure: { value: 1 }, uFade: { value: 0 }, uFlash: { value: 0 },
    uVig: { value: 0.5 }, uGrain: { value: 0.05 }, uCA: { value: 0.01 }, uScan: { value: 0 },
    uSat: { value: 1 }, uLift: { value: new THREE.Vector3(1, 1, 1) }, uGainC: { value: new THREE.Vector3(1, 1, 1) },
    uLetter: { value: 2.39 }, uUI: { value: 1 },
  },
  vertexShader: QUAD_VS,
  fragmentShader: `
  uniform sampler2D tDiffuse, tUI, tPrev; uniform vec2 uRes;
  uniform float uTime, uExposure, uFade, uFlash, uVig, uGrain, uCA, uScan, uSat, uLetter, uUI, uPrevMix;
  uniform vec3 uLift, uGainC; varying vec2 vUv;
  float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
  vec3 shoulder(vec3 c){ vec3 k = vec3(0.72); vec3 o = max(c - k, 0.0);
    return mix(c, k + (1.0 - k) * (1.0 - exp(-o / (1.0 - k))), step(k, c)); }
  void main(){
    vec2 d = vUv - 0.5; float r2 = dot(d, d);
    vec2 off = d * uCA * (0.25 + r2 * 2.0);
    vec3 c = vec3(texture2D(tDiffuse, vUv - off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + off).b);
    c *= uExposure;
    float hot = max(max(c.r, c.g), c.b);
    c = mix(c, vec3(hot), smoothstep(1.3, 6.0, hot) * 0.75);
    c = shoulder(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSat);
    c *= mix(uLift, uGainC, smoothstep(0.0, 0.75, l));
    float v = 1.0 - uVig * pow(length(d * vec2(1.0, 0.72)) * 1.3, 2.4);
    c *= clamp(v, 0.0, 1.0);
    c *= 1.0 - uScan * 0.35 * (0.5 + 0.5 * sin(vUv.y * 1080.0 * 2.0943951));
    c += uFlash * (1.0 - c);
    c *= 1.0 - uFade;
    float hb = max(0.0, 0.5 - 0.5 * (16.0 / 9.0) / uLetter);
    float edge = 1.5 / uRes.y;
    c *= smoothstep(hb - edge, hb + edge, vUv.y) * smoothstep(hb - edge, hb + edge, 1.0 - vUv.y);
    vec4 u = texture2D(tUI, vUv);
    c = mix(c, u.rgb, u.a * uUI);
    float n = hash(vUv * uRes + fract(uTime * 7.31) * 173.0) - 0.5;
    c += n * uGrain * (0.4 + 0.6 * (1.0 - l));
    c += (hash(vUv * uRes + 91.7) - 0.5) / 255.0;
    // dissolve: the finished frame of the outgoing scene, weighted by uPrevMix
    if (uPrevMix > 0.0) c = mix(c, texture2D(tPrev, vUv).rgb, uPrevMix);
    gl_FragColor = vec4(c, 1.0);
  }`,
};

// HDR ping-pong targets (half float, 4× MSAA) so additive light can exceed 1.0 before bloom.
const rtMain = new THREE.WebGLMultisampleRenderTarget(W, H, {
  type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, stencilBuffer: false,
});
rtMain.samples = 4;
const rtOpt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
const rtPrev = new THREE.WebGLRenderTarget(W, H, rtOpt), rtAcc = new THREE.WebGLRenderTarget(W, H, rtOpt);
const composer = new THREE.EffectComposer(renderer, rtMain);
composer.renderToScreen = false;
composer.addPass(new THREE.RenderPass(root, camera));
const overlayPass = new THREE.ShaderPass(OverlayShader);
composer.addPass(overlayPass);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.55, 0.62);
[bloomPass.renderTargetBright, ...bloomPass.renderTargetsHorizontal, ...bloomPass.renderTargetsVertical]
  .forEach((rt) => { rt.texture.type = THREE.HalfFloatType; });
// Soft knee: the default 0.01 knee turns AA coverage ripple on thin slanted lines into bloomed dashes.
bloomPass.highPassUniforms.smoothWidth.value = 0.45;
composer.addPass(bloomPass);
const finalPass = new THREE.ShaderPass(FinalShader);
composer.addPass(finalPass);
// ShaderPass clones its uniforms (textures included); point them back at the live canvases and targets.
overlayPass.uniforms.tFX.value = FXL.tex;
finalPass.uniforms.tUI.value = UIL.tex;
finalPass.uniforms.tPrev.value = rtPrev.texture;
// blits outside the composer: copy (to rtPrev or the screen) and an additive copy for sub-frame accumulation
const copyPass = new THREE.ShaderPass(THREE.CopyShader), accPass = new THREE.ShaderPass(THREE.CopyShader);
accPass.material.transparent = true;
accPass.material.blending = THREE.CustomBlending;
accPass.material.blendEquation = THREE.AddEquation; accPass.material.blendSrc = THREE.OneFactor; accPass.material.blendDst = THREE.OneFactor;

// Per-frame look. Scenes overwrite fields in update(); reset every frame.
const FX = {};
function resetFX() {
  Object.assign(FX, {
    exposure: 1, fade: 0, flash: 0, vig: 0.55, grain: 0.045, ca: 0.005, scan: 0, sat: 1,
    lift: [1, 1, 1], gain: [1, 1, 1], letter: 2.39, bloom: 0.9, bloomR: 0.55, bloomT: 0.62, fxGain: 1.15, ui: 1,
  });
}
resetFX();

let viewW = W, viewH = H;
const PX_U = { value: 1 }; // shared by all glow sprites: design px → framebuffer px
function fit() {
  const ww = window.innerWidth, wh = window.innerHeight;
  let cw = ww, ch = Math.round(ww * 9 / 16);
  if (ch > wh) { ch = wh; cw = Math.round(wh * 16 / 9); }
  const q = { low: 0.55, med: 0.8, high: 1 }[QS.get('q') || 'high'] || 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = EXPORT ? OUT_W : Math.min(W, Math.round(cw * dpr * q));
  viewH = EXPORT ? OUT_H : Math.round(viewW * 9 / 16);
  renderer.setSize(viewW, viewH, false);
  renderer.domElement.style.width = cw + 'px';
  renderer.domElement.style.height = ch + 'px';
  composer.setSize(viewW, viewH);
  rtPrev.setSize(viewW, viewH); rtAcc.setSize(viewW, viewH);
  // bloom at no more than design resolution, so the glow keeps its radius at 2K / 4K (the blur kernels are in pixels)
  bloomPass.setSize(Math.min(viewW, W), Math.min(viewH, H));
  finalPass.uniforms.uRes.value.set(viewW, viewH);
  PX_U.value = viewH / H;
}
window.addEventListener('resize', fit);
fit();

// Project a world point to design-pixel coordinates on the 2D layers.
const _pv = new THREE.Vector3();
function toScreen(x, y, z) {
  _pv.set(x, y, z).project(camera);
  return { x: (_pv.x + 1) * 0.5 * W, y: (1 - _pv.y) * 0.5 * H, vis: _pv.z < 1 && _pv.z > -1 };
}

// GRAIN_T: the film grain follows the output frame, not the sub-frame (averaging independent grain would erase it).
let GRAIN_T = null;
function renderFrame(t) {
  const u = finalPass.uniforms;
  u.uTime.value = GRAIN_T ?? t; u.uExposure.value = FX.exposure; u.uFade.value = clamp(FX.fade); u.uFlash.value = clamp(FX.flash);
  u.uVig.value = FX.vig; u.uGrain.value = FX.grain; u.uCA.value = FX.ca; u.uScan.value = FX.scan; u.uSat.value = FX.sat;
  u.uLift.value.set(...FX.lift); u.uGainC.value.set(...FX.gain); u.uLetter.value = FX.letter; u.uUI.value = FX.ui;
  overlayPass.uniforms.uGain.value = FX.fxGain;
  bloomPass.strength = FX.bloom; bloomPass.radius = FX.bloomR; bloomPass.threshold = FX.bloomT;
  FXL.tex.needsUpdate = true; UIL.tex.needsUpdate = true;
  composer.render();
}
