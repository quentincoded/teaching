// Sorting visualizer: bubble, insertion, merge and quick sort as step generators.
import { icon } from '../icons.js';
import { t, onLangChange } from '../i18n.js';
import { reduceMotion } from '../core.js';

function* bubble(a) {
  for (let i = 0; i < a.length; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      yield { t: 'cmp', i: j, j: j + 1 };
      if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; yield { t: 'swap', i: j, j: j + 1 }; }
    }
    if (!swapped) return;
  }
}
function* insertion(a) {
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0) {
      yield { t: 'cmp', i: j - 1, j };
      if (a[j - 1] <= a[j]) break;
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      yield { t: 'swap', i: j - 1, j };
      j--;
    }
  }
}
function* merge(a, lo = 0, hi = a.length) {
  if (hi - lo < 2) return;
  const mid = (lo + hi) >> 1;
  yield* merge(a, lo, mid);
  yield* merge(a, mid, hi);
  const left = a.slice(lo, mid), right = a.slice(mid, hi);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    yield { t: 'cmp', i: lo + i, j: mid + j };
    a[k] = left[i] <= right[j] ? left[i++] : right[j++];
    yield { t: 'set', i: k++ };
  }
  while (i < left.length) { a[k] = left[i++]; yield { t: 'set', i: k++ }; }
  while (j < right.length) { a[k] = right[j++]; yield { t: 'set', i: k++ }; }
}
function* quick(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const p = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    yield { t: 'cmp', i: j, j: hi };
    if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; yield { t: 'swap', i, j }; i++; }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  yield { t: 'swap', i, j: hi };
  yield* quick(a, lo, i - 1);
  yield* quick(a, i + 1, hi);
}
const ALGOS = { bubble: ['Bubble', bubble], insertion: ['Insertion', insertion], merge: ['Merge', merge], quick: ['Quick', quick] };

export function sortDemo(root) {
  root.innerHTML = `
    <div class="demo" data-reveal="scale">
      <div class="demo__stage"><canvas></canvas>
        <div class="demo__hud"><span><span data-l-cmp></span>: <b data-cmp>0</b></span><span><span data-l-wr></span>: <b data-wr>0</b></span></div>
      </div>
      <div class="demo__controls">
        <div class="seg" role="group" data-algos>${Object.entries(ALGOS).map(([k, [name]], i) => `<button data-algo="${k}" aria-pressed="${i === 2}">${name}</button>`).join('')}</div>
        <div class="grow"><label for="sd-n" data-l-size></label><input id="sd-n" type="range" min="8" max="120" value="48"></div>
        <div class="grow"><label for="sd-v" data-l-speed></label><input id="sd-v" type="range" min="1" max="40" value="8"></div>
        <button class="icon-btn" data-shuffle></button>
        <button class="icon-btn" data-step></button>
        <button class="icon-btn" data-play></button>
      </div>
    </div>`;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const size = root.querySelector('#sd-n'), speed = root.querySelector('#sd-v');
  const playBtn = root.querySelector('[data-play]');
  let algo = 'merge', arr = [], gen, hl = {}, cmp = 0, wr = 0, done = false, playing = false, raf = 0, W = 0, H = 0, col = {}, visible = false, autoplayed = false, doneAt = 0;

  const labels = () => {
    root.querySelector('[data-l-cmp]').textContent = t('demo.sort.compares');
    root.querySelector('[data-l-wr]').textContent = t('demo.sort.writes');
    root.querySelector('[data-l-size]').textContent = t('demo.sort.size');
    root.querySelector('[data-l-speed]').textContent = t('demo.sort.speed');
    root.querySelector('[data-shuffle]').innerHTML = icon('shuffle');
    root.querySelector('[data-shuffle]').setAttribute('aria-label', t('demo.shuffle'));
    root.querySelector('[data-step]').innerHTML = icon('step');
    root.querySelector('[data-step]').setAttribute('aria-label', t('demo.step'));
    playBtn.innerHTML = icon(playing ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', t(playing ? 'demo.pause' : 'demo.play'));
  };
  const readTheme = () => {
    const cs = getComputedStyle(document.body);
    col = { bar: cs.getPropertyValue('--line-strong').trim(), accent: cs.getPropertyValue('--accent').trim(), accent2: cs.getPropertyValue('--accent-2').trim(), text: cs.getPropertyValue('--text-2').trim() };
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  const fills = () => [size, speed].forEach((s) => s.style.setProperty('--fill', `${((s.value - s.min) / (s.max - s.min)) * 100}%`));

  function reset() {
    const n = Number(size.value);
    arr = Array.from({ length: n }, (_, i) => (i + 1) / n);
    for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
    gen = ALGOS[algo][1](arr);
    hl = {}; cmp = 0; wr = 0; done = false; doneAt = 0;
    hud(); draw();
  }
  const hud = () => { root.querySelector('[data-cmp]').textContent = cmp; root.querySelector('[data-wr]').textContent = wr; };

  function step() {
    if (done) return;
    const r = gen.next();
    if (r.done) { done = true; hl = {}; doneAt = performance.now(); setPlaying(false); return; }
    const op = r.value;
    hl = { [op.i]: op.t, ...(op.j !== undefined ? { [op.j]: op.t } : {}) };
    if (op.t === 'cmp') cmp++; else wr += op.t === 'swap' ? 2 : 1;
  }

  function draw(now = performance.now()) {
    ctx.clearRect(0, 0, W, H);
    const n = arr.length, gap = n > 60 ? 1 : 3, pad = 16, top = 54;
    const bw = (W - pad * 2 - gap * (n - 1)) / n;
    if (bw <= 0 || H <= top) return;
    const sweep = done ? Math.min(1, (now - doneAt) / 700) : 0;
    arr.forEach((v, i) => {
      const h = v * (H - top - pad);
      const x = pad + i * (bw + gap), y = H - pad - h;
      let c = col.bar;
      if (hl[i] === 'cmp') c = col.accent2;
      else if (hl[i]) c = col.accent;
      if (done && i / n <= sweep) c = col.accent;
      ctx.fillStyle = c;
      const r = Math.max(0, Math.min(4, bw / 2, h));
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, bw, h, [r, r, 0, 0]) : ctx.rect(x, y, bw, h);
      ctx.fill();
    });
    if (done && sweep < 1) requestAnimationFrame(draw);
  }

  function loop() {
    const ops = Math.max(1, Math.round(Number(speed.value) ** 1.4 / 3));
    for (let i = 0; i < ops && !done; i++) step();
    hud(); draw();
    raf = playing && visible ? requestAnimationFrame(loop) : 0;
  }
  function setPlaying(p) {
    playing = p; labels();
    if (playing && done) reset();
    if (playing && !raf) raf = requestAnimationFrame(loop);
  }

  root.querySelector('[data-algos]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-algo]'); if (!b) return;
    algo = b.dataset.algo;
    root.querySelectorAll('[data-algo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    reset(); setPlaying(true);
  });
  size.addEventListener('input', () => { fills(); reset(); });
  speed.addEventListener('input', fills);
  root.querySelector('[data-shuffle]').addEventListener('click', () => { reset(); });
  root.querySelector('[data-step]').addEventListener('click', () => { setPlaying(false); step(); hud(); draw(); });
  playBtn.addEventListener('click', () => setPlaying(!playing));

  readTheme(); labels(); fills();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !autoplayed && !reduceMotion.matches) { autoplayed = true; setPlaying(true); }
    else if (visible && playing && !raf) raf = requestAnimationFrame(loop);
  }, { threshold: 0.4 }).observe(canvas);
  document.addEventListener('themechange', () => { readTheme(); draw(); });
  onLangChange(labels);
  reset();
}
