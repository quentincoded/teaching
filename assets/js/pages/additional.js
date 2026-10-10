import { initPage, esc, observeReveals, fileTile, $ } from '../core.js';
import { icon } from '../icons.js';
import { t, pick, onLangChange } from '../i18n.js';
import { liquid } from '../bg/liquid.js';

liquid(document.getElementById('bg'));
const { materials: m } = await initPage({ page: 'additional' });
const COLORS = ['var(--c-analysis)', 'var(--c-informatik)', 'var(--accent-2)', 'var(--c-home)'];

function render(first) {
  $('#subjects').innerHTML = m.additional.map((a, i) => `
    <article class="subject" data-reveal style="--d:${i * 0.1}s">
      <div class="subject__blob" style="--sc:${COLORS[i % COLORS.length]}; animation-delay:${i * -3}s"></div>
      <span class="subject__num">${String(i + 1).padStart(2, '0')}</span>
      <h3>${esc(pick(a, 'subject'))}</h3>
      <p class="subject__author">${esc(t('additional.by', { a: a.author }))}</p>
      <div class="files" style="grid-template-columns:1fr">${a.files.map((f, k) => fileTile(f, k)).join('')}</div>
    </article>`).join('') + `
    <a class="subject" href="https://amiv.ethz.ch/en/studies/documents" target="_blank" rel="noopener" data-reveal style="--d:${m.additional.length * 0.1}s;background:var(--text);color:var(--bg)">
      <div class="subject__blob" style="--sc:var(--accent)"></div>
      <span class="subject__num">AMIV ${icon('arrowUpRight')}</span>
      <h3>${esc(t('additional.amiv'))}</h3>
      <p style="opacity:.7">amiv.ethz.ch</p>
    </a>`;
  $('#subjects').querySelectorAll('.subject__num svg').forEach((s) => { s.style.cssText = 'width:14px;height:14px;display:inline'; });
  if (first) observeReveals();
  else document.querySelectorAll('#subjects [data-reveal]').forEach((el) => el.classList.add('is-in'));
}
render(true);
onLangChange(() => render(false));
