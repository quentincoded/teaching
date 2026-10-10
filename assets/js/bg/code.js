// Informatik II background: falling code and bits, plus terminal commands that type themselves out.
// Scrolling speeds the rain up.
import { reduceMotion } from '../core.js';

const SNIPPETS = [
  'def merge_sort(a):', 'return sorted(xs)', 'heapq.heappush(pq,(d,v))', 'np.array([1,2,3])', 'lambda x: x**2',
  'for i in range(n):', 'dp[i][j]=max(dp[i-1][j],v)', 'while lo<hi:', 'mid=(lo+hi)//2', 'class Node:', 'self.left=None',
  'import pandas as pd', 'df.groupby("k")', 'plt.plot(x,y)', 'O(n log n)', '0x3F', '0b101101', 'yield from gen()',
  'if not root: return', 'model.fit(X,y)', 'kmeans.predict(X)', '[x for x in xs if x]', 'memo={}', 'try:', 'except KeyError:',
];
const COMMANDS = [
  '>>> sorted(data, key=lambda r: r[1])', '$ python3 dp_knapsack.py --n 42', '>>> import numpy as np',
  '$ git commit -m "fix off-by-one"', '>>> heap = [5, 3, 8]; heapq.heapify(heap)', '$ jupyter notebook',
  '>>> T(n) = 2T(n/2) + O(n)  # => O(n log n)', '>>> model = MLPClassifier(hidden_layer_sizes=(8, 2))',
  '$ ssh student@ethz.ch', '>>> fib = lambda n: n if n < 2 else fib(n-1) + fib(n-2)', '$ pip install scikit-learn',
  '>>> np.linalg.svd(X)', '$ make test  # 14/14 passed',
];

export function codeBg(canvas) {
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, fs = 15, cw = 9, cols = [], raf = 0, col = {}, boost = 0, lastY = scrollY, lastTerm = 0;
  const terms = [];

  function readTheme() {
    const cs = getComputedStyle(document.body);
    const dark = document.documentElement.dataset.theme === 'dark';
    col = {
      bg: cs.getPropertyValue('--bg').trim(),
      accent: cs.getPropertyValue('--accent').trim(),
      accent2: cs.getPropertyValue('--accent-2').trim(),
      head: dark ? '#e9e5ff' : '#1b1250',
      fade: dark ? 0.11 : 0.16,
      a: dark ? 0.7 : 0.45,
    };
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, W, H);
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fs = W < 600 ? 13 : 15;
    cw = fs * 1.15;
    const n = Math.ceil(W / cw);
    cols = Array.from({ length: n }, () => newCol(true));
    if (col.bg) { ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H); }
  }
  function newCol(initial) {
    const s = SNIPPETS[(Math.random() * SNIPPETS.length) | 0];
    return {
      y: initial ? Math.random() * -H / fs * 2 : -Math.random() * 20,
      sp: 0.12 + Math.random() * 0.32,
      s: Math.random() < 0.3 ? bits(14) : s,
      i: 0,
      on: Math.random() < 0.55,
    };
  }
  const bits = (n) => Array.from({ length: n }, () => (Math.random() < 0.5 ? '0' : '1')).join('');

  function frame(now) {
    // fade previous frame → trails
    ctx.globalAlpha = 1;
    ctx.fillStyle = withA(col.bg, col.fade);
    ctx.fillRect(0, 0, W, H);
    ctx.font = `500 ${fs}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    const v = 1 + boost;
    cols.forEach((c, x) => {
      if (!c.on) { if (Math.random() < 0.002) cols[x] = newCol(false); return; }
      const prev = Math.floor(c.y);
      c.y += c.sp * v;
      if (Math.floor(c.y) !== prev) {
        const ch = c.s[c.i++ % c.s.length];
        const px = x * cw + cw / 2, py = Math.floor(c.y) * fs;
        ctx.globalAlpha = col.a;
        ctx.fillStyle = col.head;
        ctx.fillText(ch, px, py);
        // re-tint the char above in accent so only the head is bright
        ctx.fillStyle = Math.random() < 0.15 ? col.accent2 : col.accent;
        ctx.fillText(c.s[(c.i - 2 + c.s.length) % c.s.length], px, py - fs);
      }
      if (c.y * fs > H + 40) cols[x] = newCol(false);
    });
    boost *= 0.94;

    // terminal lines
    if (now - lastTerm > 2600 && terms.length < 3) {
      lastTerm = now;
      terms.push({
        s: COMMANDS[(Math.random() * COMMANDS.length) | 0],
        x: 20 + Math.random() * Math.max(10, W * 0.55),
        y: Math.round((0.15 + Math.random() * 0.75) * H),
        born: now,
      });
    }
    ctx.textAlign = 'left';
    for (let i = terms.length - 1; i >= 0; i--) {
      const tm = terms[i];
      const age = now - tm.born;
      const shown = Math.min(tm.s.length, Math.floor(age / 45));
      const life = age > 5200 ? 1 - (age - 5200) / 800 : 1;
      if (life <= 0) { terms.splice(i, 1); continue; }
      const txt = tm.s.slice(0, shown);
      const wpx = ctx.measureText(tm.s).width;
      ctx.globalAlpha = 0.9 * life;
      ctx.fillStyle = col.bg;
      ctx.fillRect(tm.x - 8, tm.y - fs - 4, wpx + 30, fs + 14);
      ctx.fillStyle = col.accent;
      ctx.fillText(txt, tm.x, tm.y);
      if (Math.floor(age / 400) % 2 === 0 || shown < tm.s.length) {
        const cx = tm.x + ctx.measureText(txt).width + 2;
        ctx.fillRect(cx, tm.y - fs + 2, fs * 0.55, fs);
      }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function staticFrame() {
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = `500 ${fs}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = col.a * 0.6;
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = i % 5 ? col.accent : col.accent2;
      ctx.fillText(SNIPPETS[i % SNIPPETS.length][(i * 7) % 10] || '1', Math.random() * W, Math.random() * H);
    }
    ctx.globalAlpha = 1;
  }

  function start() {
    cancelAnimationFrame(raf);
    if (reduceMotion.matches) staticFrame(); else raf = requestAnimationFrame(frame);
  }
  resize(); readTheme(); start();
  addEventListener('resize', () => { resize(); if (reduceMotion.matches) staticFrame(); });
  addEventListener('scroll', () => { boost = Math.min(5, boost + Math.abs(scrollY - lastY) * 0.02); lastY = scrollY; }, { passive: true });
  document.addEventListener('themechange', () => { readTheme(); if (reduceMotion.matches) staticFrame(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? cancelAnimationFrame(raf) : start()));
}

function withA(hex, a) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
