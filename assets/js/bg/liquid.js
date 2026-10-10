// Landing background: soft liquid color blobs. Rendered at very low resolution and upscaled by the
// browser, which gives a cheap, natural blur. One blob follows the pointer.
import { reduceMotion } from '../core.js';

const PALETTE = {
  dark: { bg: '#07080d', mode: 'lighter', a: 0.55, blobs: ['#1d34e0', '#3a1fb0', '#0098c7', '#5a45f0', '#ee4a1a', '#1d3bd1'] },
  light: { bg: '#f4f3ef', mode: 'source-over', a: 0.42, blobs: ['#3d5cff', '#8ea8ff', '#2bc6e8', '#a597ff', '#ff9b73', '#6c86ff'] },
};

export function liquid(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const SCALE = 0.09;
  let W = 0, H = 0, raf = 0, pal = PALETTE.light, t = Math.random() * 100;
  const ptr = { x: 0.7, y: 0.35, tx: 0.7, ty: 0.35 };
  const blobs = Array.from({ length: 6 }, (_, i) => ({
    ax: 0.15 + Math.random() * 0.7, ay: 0.1 + Math.random() * 0.7,
    rx: 0.18 + Math.random() * 0.22, ry: 0.12 + Math.random() * 0.2,
    sp: 0.05 + Math.random() * 0.08, ph: Math.random() * Math.PI * 2,
    r: 0.32 + Math.random() * 0.25, c: i,
  }));

  function readTheme() { pal = document.documentElement.dataset.theme === 'dark' ? PALETTE.dark : PALETTE.light; }
  function resize() {
    W = Math.max(40, Math.round(innerWidth * SCALE));
    H = Math.max(40, Math.round(innerHeight * SCALE * 1.15));
    canvas.width = W; canvas.height = H;
  }
  function draw() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = pal.mode;
    const m = Math.min(W, H);
    blobs.forEach((b, i) => {
      const x = (b.ax + Math.sin(t * b.sp + b.ph) * b.rx) * W;
      const y = (b.ay + Math.cos(t * b.sp * 1.3 + b.ph) * b.ry) * H;
      blob(x, y, b.r * m * 1.6, pal.blobs[b.c], i > 3 ? pal.a * 0.6 : pal.a);
    });
    ptr.x += (ptr.tx - ptr.x) * 0.04;
    ptr.y += (ptr.ty - ptr.y) * 0.04;
    blob(ptr.x * W, ptr.y * H, m * 0.55, pal.blobs[2], pal.a * 0.9);
  }
  function blob(x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, a));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function loop() {
    t += 0.016;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { cancelAnimationFrame(raf); if (reduceMotion.matches) draw(); else loop(); }

  readTheme(); resize(); start();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { ptr.tx = e.clientX / innerWidth; ptr.ty = e.clientY / innerHeight; }, { passive: true });
  document.addEventListener('themechange', () => { readTheme(); if (reduceMotion.matches) draw(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? cancelAnimationFrame(raf) : start()));
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
