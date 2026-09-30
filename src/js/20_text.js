// Typography: plain canvas text helpers and a small TeX-like math typesetter.
const FONT = {
  zh: '"Noto Serif SC", "Songti SC", serif', title: 'Michroma, sans-serif', mono: '"GoC Mono", monospace',
  math: '"STIX Two Text", "STIX Two Math", "Times New Roman", serif', en: '"Cormorant Garamond", Georgia, serif',
  hand: 'Caveat, cursive', fell: '"GoC Oldstyle", Georgia, serif', // GoC Mono / Oldstyle: IBM Plex Mono / IM Fell English renamed (tools/subset_fonts.py)
};

function text(g, s, x, y, o = {}) {
  const size = o.size || 32, sp = o.spacing || 0;
  g.font = `${o.style || 'normal'} ${o.weight || 400} ${size}px ${o.font || FONT.zh}`;
  g.letterSpacing = sp + 'px';
  g.textAlign = o.align || 'left';
  g.textBaseline = o.base || 'alphabetic';
  g.globalAlpha = clamp(o.alpha ?? 1);
  g.fillStyle = o.color || '#fff';
  if (o.glow) { g.shadowColor = o.glowColor || g.fillStyle; g.shadowBlur = o.glow * g.getTransform().a; } // shadowBlur ignores the transform
  const dx = g.textAlign === 'center' ? sp / 2 : g.textAlign === 'right' ? sp : 0;
  g.fillText(s, x + dx, y);
  const w = g.measureText(s).width - sp;
  g.shadowBlur = 0; g.globalAlpha = 1; g.letterSpacing = '0px';
  return w;
}

// "Decoding" reveal: characters past p are replaced by stable pseudo-random glyphs.
const DECODE_SET = '01ABCDEFHKLMNPRSTXYZ#%&*+=<>/\\';
function decode(s, p, t) {
  const n = Math.floor(clamp(p) * s.length), tick = Math.floor(t * 24);
  let out = s.slice(0, n);
  for (let i = n; i < Math.min(s.length, n + 6); i++)
    out += s[i] === ' ' ? ' ' : DECODE_SET[Math.floor(hash1(i * 13.7 + tick) * DECODE_SET.length)];
  return out;
}

// ---------------------------------------------------------------------------
// tex-lite: letters italic, digits/operators upright; ^ _ {} \frac \sqrt \dot \hat
// \bar \vec \c{color}{…} \rm{…} \bf{…} \mat{a & b \\ c & d}, Greek and symbols.
// ---------------------------------------------------------------------------
const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', Pi: 'Π' };
const SYMS = { infty: '∞', to: '→', mapsto: '↦', approx: '≈', le: '≤', ge: '≥', neq: '≠', pm: '±', times: '×', cdot: '·', in: '∈', ni: '∋', partial: '∂', nabla: '∇', int: '∫', sum: '∑', R: 'ℝ', C: 'ℂ', Rightarrow: '⇒', Leftrightarrow: '⇔', Leftarrow: '⇐', uparrow: '↑', downarrow: '↓', gg: '≫', top: 'T', ell: 'ℓ', prime: '′', sim: '∼', dots: '…', lbrace: '{', rbrace: '}' };
const FUNCS = new Set(['cos', 'sin', 'exp', 'det', 'tr', 'lim', 'max', 'min', 'arg', 'log', 'sgn', 'Re', 'Im', 'diag', 'argmin', 'eig', 'rank']);
const ACC = { dot: 1, ddot: 1, hat: 1, bar: 1, vec: 1 };
const OPS_REL = new Set(['=', '<', '>', '≈', '≤', '≥', '≠', '→', '↦', '⇒', '∈', '∋', '∼', ':']);
const OPS_BIN = new Set(['+', '−', '±', '×', '·']);

function texParse(src) {
  let i = 0;
  const name = () => { let n = ''; while (i < src.length && /[a-zA-Z]/.test(src[i])) n += src[i++]; return n; };
  const raw = () => { while (src[i] === ' ') i++; if (src[i] !== '{') return src[i++]; i++; let n = ''; while (i < src.length && src[i] !== '}') n += src[i++]; i++; return n; };
  const arg = () => { while (src[i] === ' ') i++; if (src[i] === '{') { i++; return seq('}'); } return token(); };
  const chr = (c) => c === '-' ? { t: 'ch', s: '−' } : { t: 'ch', s: c, it: /[a-zA-Z]/.test(c) };
  function token() {
    const c = src[i];
    if (c === '\\') {
      i++;
      const n1 = src[i];
      if (n1 === '\\') { i++; return [{ t: 'row' }]; }
      if (n1 === ',') { i++; return [{ t: 'sp', w: 0.17 }]; }
      if (n1 === ';') { i++; return [{ t: 'sp', w: 0.3 }]; }
      if (n1 === ' ') { i++; return [{ t: 'sp', w: 0.33 }]; }
      const nm = name();
      if (GREEK[nm]) return [{ t: 'ch', s: GREEK[nm], it: /^[a-z]/.test(nm) }];
      if (FUNCS.has(nm)) return [{ t: 'ch', s: nm, fn: true }];
      if (SYMS[nm]) return [{ t: 'ch', s: SYMS[nm] }];
      if (nm === 'frac') { const n = arg(), d = arg(); return [{ t: 'frac', n, d }]; }
      if (nm === 'sqrt') return [{ t: 'sqrt', b: arg() }];
      if (ACC[nm]) return [{ t: 'acc', k: nm, b: arg() }];
      if (nm === 'c') { const col = raw(); return [{ t: 'col', c: col, b: arg() }]; }
      if (nm === 'rm' || nm === 'bf') return [{ t: 'ch', s: raw(), bf: nm === 'bf' }];
      if (nm === 'mat') return [{ t: 'mat', b: arg() }];
      if (nm === 'quad') return [{ t: 'sp', w: 1 }];
      if (nm === 'qquad') return [{ t: 'sp', w: 2 }];
      return [{ t: 'ch', s: nm }];
    }
    i++;
    if (c === '{') return [{ t: 'grp', b: seq('}') }];
    if (c === '&') return [{ t: 'amp' }];
    if (c === ' ') return [];
    if (c === '~') return [{ t: 'sp', w: 0.33 }];
    return [chr(c)];
  }
  function seq(close) {
    const out = [];
    while (i < src.length) {
      if (close && src[i] === close) { i++; break; }
      const c = src[i];
      if (c === '^' || c === '_') {
        i++;
        const a = arg();
        let last = out[out.length - 1];
        if (!last || last.t !== 'ss' || (c === '^' ? last.sup : last.sub)) { last = { t: 'ss', base: out.pop() || null, sup: null, sub: null }; out.push(last); }
        if (c === '^') last.sup = a; else last.sub = a;
        continue;
      }
      out.push(...token());
    }
    return out;
  }
  return seq(null);
}
