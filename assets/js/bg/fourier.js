// Analysis III background: a Fourier series being synthesised live.
// Scrolling adds harmonics (n grows with scroll progress) and morphs the target wave
// square → sawtooth → triangle. A chain of epicycles draws the wave's leading edge.
import { reduceMotion } from '../core.js';

export const WAVES = {
  square: (k) => (k % 2 ? 4 / (Math.PI * k) : 0),
  saw: (k) => (2 * (k % 2 ? 1 : -1)) / (Math.PI * k),
  triangle: (k) => (k % 2 ? (8 / (Math.PI * Math.PI * k * k)) * (((k - 1) / 2) % 2 ? -1 : 1) : 0),
};

export function fourierBg(canvas) {
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, raf = 0, t = 0, nCur = 1, mixCur = 0;
  let col = {};

  function readTheme() {
    const cs = getComputedStyle(document.body);
    const dark = document.documentElement.dataset.theme === 'dark';
    col = {
      accent: cs.getPropertyValue('--accent').trim(),
      accent2: cs.getPropertyValue('--accent-2').trim(),
      grid: dark ? 'rgba(255,255,255,0.045)' : 'rgba(10,12,30,0.05)',
      text: cs.getPropertyValue('--text-3').trim(),
      alpha: dark ? 0.8 : 0.75,
    };
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function coeffs(n, mix) {
    // mix ∈ [0, 2]: 0 = square, 1 = saw, 2 = triangle (blended in between)
    const a = Math.floor(Math.min(mix, 1.999)), f = mix - a;
    const order = [WAVES.square, WAVES.saw, WAVES.triangle];
    const out = [];
    for (let k = 1; k <= n; k++) out.push((1 - f) * order[a](k) + f * order[a + 1](k));
    return out;
  }

  function draw() {
    const doc = document.documentElement;
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, doc.scrollHeight - innerHeight)));
    const nTarget = 1 + p * 34;
    nCur += (nTarget - nCur) * 0.06;
    mixCur += (p * 2 - mixCur) * 0.05;
    const n = Math.max(1, Math.round(nCur));
    const b = coeffs(n, mixCur);

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = col.alpha;

    // grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.grid;
    const gs = 56;
    ctx.beginPath();
    for (let x = (-(scrollY * 0.15) % gs); x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    const small = W < 700;
    const y0 = H * (small ? 0.72 : 0.62);
    const A = Math.min(H * 0.17, 150);
    const x0 = small ? W * 0.16 : W * 0.14;
    const omega = (Math.PI * 2) / (W * (small ? 0.7 : 0.42));
    const phase = t * 0.9 + scrollY * 0.006;

    // axis
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();

    // individual harmonics (first few, faint)
    ctx.lineWidth = 1;
    for (let k = 1; k <= Math.min(n, 5); k++) {
      if (!b[k - 1]) continue;
      ctx.strokeStyle = withAlpha(col.accent2, 0.22 - k * 0.025);
      ctx.beginPath();
      for (let x = x0; x <= W; x += 4) {
        const y = y0 - A * b[k - 1] * Math.sin(k * (phase - (x - x0) * omega));
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // partial sum
    const sum = (th) => { let s = 0; for (let k = 1; k <= n; k++) s += b[k - 1] * Math.sin(k * th); return s; };
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = col.accent;
    ctx.shadowColor = col.accent;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let x = x0; x <= W; x += 2) {
      const y = y0 - A * sum(phase - (x - x0) * omega);
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // epicycles
    let cx = x0 - A * 1.4, cy = y0;
    ctx.lineWidth = 1;
    for (let k = 1; k <= Math.min(n, 18); k++) {
      const r = A * Math.abs(b[k - 1]);
      if (r < 0.5) continue;
      const ang = k * phase;
      ctx.strokeStyle = withAlpha(col.accent2, 0.28);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      // vertical component of each phasor is exactly bₖ·sin(kφ), so the tip traces the partial sum
      const nx = cx + r * Math.cos(ang);
      const ny = cy - A * b[k - 1] * Math.sin(ang);
      ctx.strokeStyle = withAlpha(col.accent, 0.6);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
      cx = nx; cy = ny;
    }
    // connect tip to wave start
    const ys = y0 - A * sum(phase);
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = withAlpha(col.accent, 0.5);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x0, ys); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col.accent;
    ctx.beginPath(); ctx.arc(x0, ys, 4, 0, Math.PI * 2); ctx.fill();

    // label
    const names = ['square', 'sawtooth', 'triangle'];
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = col.text;
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`f(t) ≈ Σ bₖ sin(kωt)   n = ${String(n).padStart(2, '0')}   ${names[Math.round(mixCur)]}`, W - 20, H - 22);
    ctx.globalAlpha = 1;
  }

  function loop() { t += 0.008; draw(); raf = requestAnimationFrame(loop); }
  function start() {
    cancelAnimationFrame(raf);
    if (reduceMotion.matches) { nCur = 12; draw(); } else loop();
  }
  readTheme(); resize(); start();
  addEventListener('resize', () => { resize(); if (reduceMotion.matches) draw(); });
  if (reduceMotion.matches) addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true });
  document.addEventListener('themechange', () => { readTheme(); if (reduceMotion.matches) draw(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? cancelAnimationFrame(raf) : start()));
}

export function withAlpha(color, a) {
  a = Math.max(0, Math.min(1, a));
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return color;
}
