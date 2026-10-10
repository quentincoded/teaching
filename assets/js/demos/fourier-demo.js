// Interactive Fourier series: pick a target wave, choose the number of terms, watch the epicycles.
import { icon } from '../icons.js';
import { t, onLangChange } from '../i18n.js';
import { reduceMotion } from '../core.js';
import { WAVES, withAlpha } from '../bg/fourier.js';

const TARGET = {
  square: (th) => Math.sign(Math.sin(th)),
  saw: (th) => { const w = ((th + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return w / Math.PI; },
  triangle: (th) => (2 / Math.PI) * Math.asin(Math.sin(th)),
};
const FORMULA = {
  square: 'f(t) = 4/π · Σ_{k odd} sin(kt) / k',
  saw: 'f(t) = 2/π · Σ_{k≥1} (−1)^{k+1} sin(kt) / k',
  triangle: 'f(t) = 8/π² · Σ_{k odd} (−1)^{(k−1)/2} sin(kt) / k²',
};

export function fourierDemo(root) {
  root.innerHTML = `
    <div class="demo" data-reveal="scale">
      <div class="demo__stage"><canvas></canvas><div class="demo__hud"><span>n = <b data-n></b></span><span data-terms-label></span></div></div>
      <div class="demo__controls">
        <div class="seg" role="group" data-waves>
          <button data-wave="square" aria-pressed="true"></button>
          <button data-wave="saw" aria-pressed="false"></button>
          <button data-wave="triangle" aria-pressed="false"></button>
        </div>
        <div class="grow"><label for="fd-n" data-l-terms></label><input id="fd-n" type="range" min="1" max="60" value="5"></div>
        <button class="icon-btn" data-play></button>
      </div>
      <div class="demo__formula" data-formula></div>
    </div>`;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const slider = root.querySelector('#fd-n');
  const playBtn = root.querySelector('[data-play]');
  let wave = 'square', n = 5, playing = !reduceMotion.matches, phase = 0, raf = 0, W = 0, H = 0, visible = false, col = {};
  const DPR = Math.min(devicePixelRatio || 1, 2);

  const labels = () => {
    root.querySelectorAll('[data-wave]').forEach((b) => { b.textContent = t(`demo.fourier.${b.dataset.wave}`); });
    root.querySelector('[data-l-terms]').textContent = t('demo.fourier.terms');
    playBtn.innerHTML = icon(playing ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', t(playing ? 'demo.pause' : 'demo.play'));
    root.querySelector('[data-formula]').textContent = FORMULA[wave];
  };
  const readTheme = () => {
    const cs = getComputedStyle(document.body);
    col = { accent: cs.getPropertyValue('--accent').trim(), accent2: cs.getPropertyValue('--accent-2').trim(), text: cs.getPropertyValue('--text-3').trim(), line: cs.getPropertyValue('--line-strong').trim() };
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  const fill = () => slider.style.setProperty('--fill', `${((n - 1) / 59) * 100}%`);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const b = []; for (let k = 1; k <= n; k++) b.push(WAVES[wave](k));
    const A = Math.min(H * 0.3, W * 0.12);
    const cx0 = Math.max(A * 1.5, W * 0.17), y0 = H / 2, x0 = cx0 + A * 1.6;
    const omega = (Math.PI * 2) / Math.max(200, (W - x0) * 0.5);
    const sum = (th) => { let s = 0; for (let k = 1; k <= n; k++) s += b[k - 1] * Math.sin(k * th); return s; };

    // axis + target
    ctx.strokeStyle = col.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(W, y0); ctx.stroke();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = withAlpha(col.accent2, 0.7); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = x0; x <= W; x += 2) { const y = y0 - A * TARGET[wave](phase - (x - x0) * omega); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);

    // partial sum
    ctx.strokeStyle = col.accent; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = x0; x <= W; x += 1.5) { const y = y0 - A * sum(phase - (x - x0) * omega); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();

    // epicycles
    let cx = cx0, cy = y0;
    for (let k = 1; k <= n; k++) {
      const r = A * Math.abs(b[k - 1]);
      if (r < 0.3) continue;
      ctx.strokeStyle = withAlpha(col.accent2, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const nx = cx + r * Math.cos(k * phase), ny = cy - A * b[k - 1] * Math.sin(k * phase);
      ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
      cx = nx; cy = ny;
    }
    ctx.strokeStyle = withAlpha(col.accent, 0.5); ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x0, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.accent;
    ctx.beginPath(); ctx.arc(x0, cy, 5, 0, Math.PI * 2); ctx.fill();
  }

  function loop() {
    if (playing) phase += 0.012;
    draw();
    raf = visible && playing ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  root.querySelector('[data-waves]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-wave]'); if (!btn) return;
    wave = btn.dataset.wave;
    root.querySelectorAll('[data-wave]').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
    labels(); draw();
  });
  slider.addEventListener('input', () => { n = Number(slider.value); root.querySelector('[data-n]').textContent = n; fill(); draw(); });
  playBtn.addEventListener('click', () => { playing = !playing; labels(); kick(); });

  readTheme(); labels(); fill();
  root.querySelector('[data-n]').textContent = n;
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('themechange', () => { readTheme(); draw(); });
  onLangChange(labels);
}
