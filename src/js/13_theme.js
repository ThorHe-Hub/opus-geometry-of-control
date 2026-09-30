// Per-act look: the UI palette (HUD, panels, formulas, subtitles, chapter cards), the clear colour
// and the grade every frame of that act starts from; scenes still override FX in update().
// Semantic colours never change between acts: red = unstable, cyan = stable / the controller.
const THEMES = {
  cold: { hud: [160, 205, 235], hi: [236, 245, 255], lo: [170, 205, 232], glow: [110, 190, 255], bg: [0, 4, 8], clear: [0, 0, 0], fx: {} },
  brass: {
    hud: [222, 184, 124], hi: [252, 240, 218], lo: [220, 194, 152], glow: [255, 176, 80], bg: [9, 6, 2], clear: [0, 0, 0],
    fx: { lift: [1.05, 0.99, 0.9], gain: [1.03, 1.0, 0.93], sat: 0.92, grain: 0.06 },
  },
  blueprint: {
    hud: [128, 196, 255], hi: [228, 242, 255], lo: [156, 200, 240], glow: [70, 150, 255], bg: [0, 8, 22], clear: [0.004, 0.014, 0.04],
    fx: { lift: [0.94, 1.0, 1.1] },
  },
  amber: {
    hud: [236, 176, 92], hi: [255, 238, 206], lo: [240, 194, 128], glow: [255, 142, 36], bg: [10, 5, 0], clear: [0, 0, 0],
    fx: { lift: [1.06, 0.98, 0.88], scan: 0.14 },
  },
  // Act IV: pure white-cyan; the only warm light is the rocket's plume
  white: {
    hud: [190, 228, 246], hi: [246, 252, 255], lo: [182, 220, 240], glow: [120, 220, 255], bg: [0, 6, 10], clear: [0, 0.004, 0.01],
    fx: { lift: [0.97, 1.0, 1.03] },
  },
};
const ACT_THEME = { 0: 'cold', 1: 'cold', 2: 'blueprint', 3: 'amber', 4: 'white' };
const TH_KEYS = ['hud', 'hi', 'lo', 'glow', 'bg', 'clear'];
let TH = THEMES.cold;
const _clearC = new THREE.Color();

// Activate theme a, or a blend a → b by k. Called by frame() after resetFX(), before the scene update.
function useTheme(a, b, k = 0) {
  const A = THEMES[a || 'cold'], B = b ? THEMES[b] : A;
  if (B === A || k <= 0) TH = A;
  else { TH = {}; TH_KEYS.forEach((key) => { TH[key] = A[key].map((v, i) => lerp(v, B[key][i], k)); }); }
  const fa = A.fx, fb = B.fx, u = B === A ? 0 : k;
  new Set([...Object.keys(fa), ...Object.keys(fb)]).forEach((key) => {
    const va = key in fa ? fa[key] : FX[key], vb = key in fb ? fb[key] : FX[key];
    FX[key] = Array.isArray(va) ? va.map((v, i) => lerp(v, vb[i], u)) : lerp(va, vb, u);
  });
  renderer.setClearColor(_clearC.setRGB(TH.clear[0], TH.clear[1], TH.clear[2]), 1);
}

// Theme colour as a CSS string: thc('hud', 0.5). thp('hud') is the 'rgba(r,g,b,' prefix for code that appends alpha.
const thp = (key) => { const c = TH[key]; return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},`; };
const thc = (key, a = 1) => thp(key) + a + ')';
