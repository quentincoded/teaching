import { initPage, esc, observeReveals, examItem, fileTile, $ } from '../core.js';
import { icon } from '../icons.js';
import { t, onLangChange } from '../i18n.js';
import { courseTitle, examSeason, examYear, themeOf } from '../data.js';
import { liquid } from '../bg/liquid.js';

liquid(document.getElementById('bg'));
const { materials: m } = await initPage({ page: 'exams' });
const courses = m.courses.filter((c) => c.exams.length || c.examCollection);
let active = courses.find((c) => `#${c.id}` === location.hash)?.id || courses[0]?.id;
let season = 'all';

function renderTabs() {
  $('#tabs').innerHTML = `<span class="tabs__blob"></span>${courses.map((c) => `
    <button role="tab" data-tab="${c.id}" aria-selected="${c.id === active}" style="--c: var(--c-${themeOf(c)})">${esc(courseTitle(c))}</button>`).join('')}`;
  $('#tabs').querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    active = b.dataset.tab;
    history.replaceState(null, '', `#${active}`);
    season = 'all';
    renderTabs(); renderPanel(true);
  }));
  requestAnimationFrame(moveBlob);
}
function moveBlob() {
  const b = $(`#tabs [data-tab="${active}"]`), blob = $('#tabs .tabs__blob');
  if (!b) return;
  blob.style.width = `${b.offsetWidth}px`;
  blob.style.transform = `translateX(${b.offsetLeft - 5}px)`;
  blob.style.setProperty('--tab-c', `var(--s-${themeOf(courses.find((c) => c.id === active))})`);
  document.body.dataset.page = themeOf(courses.find((c) => c.id === active)) === 'home' ? 'exams' : themeOf(courses.find((c) => c.id === active));
}

function renderPanel(animate) {
  const c = courses.find((x) => x.id === active);
  const panel = $('#panel');
  if (!c) { panel.innerHTML = ''; return; }
  if (c.exams.length) {
    const seasons = ['all', ...new Set(c.exams.map(examSeason))];
    const list = c.exams.filter((e) => season === 'all' || examSeason(e) === season);
    const byYear = {};
    list.forEach((e) => { (byYear[examYear(e)] ||= []).push(e); });
    const years = Object.keys(byYear).sort((a, b) => b - a);
    panel.innerHTML = `
      <div class="toolbar__row" style="margin-bottom:28px">
        <div class="seg" role="group">${seasons.map((s) => `<button data-season="${s}" aria-pressed="${s === season}">${esc(t('exams.filter.' + s))}</button>`).join('')}</div>
        <span class="mono" style="color:var(--text-3)">${list.length} / ${c.exams.length}</span>
      </div>
      <div class="exam-years">
        ${years.map((y) => `
          <div class="exam-year" data-reveal>
            <div class="exam-year__label">${y}</div>
            <div class="exam-year__items">${byYear[y].map((e, i) => examItem(e, i)).join('')}</div>
          </div>`).join('')}
      </div>`;
    panel.querySelectorAll('[data-season]').forEach((b) => b.addEventListener('click', () => { season = b.dataset.season; renderPanel(true); }));
  } else {
    const pvk = c.resources.filter((r) => r.kind === 'script');
    panel.innerHTML = `
      <div class="callout grain" data-reveal="scale">
        <span class="eyebrow" style="color:inherit">${esc(courseTitle(c))}</span>
        <h3>${esc(t('exams.info2.title'))}</h3>
        <p>${esc(t('exams.info2.text'))}</p>
        <a class="btn" href="${esc(c.examCollection)}" target="_blank" rel="noopener">${esc(t('cta.to_collection'))}${icon('arrowUpRight')}</a>
      </div>
      ${pvk.length ? `<div class="files" style="margin-top:16px">${pvk.map((f, k) => fileTile(f, k)).join('')}</div>` : ''}`;
  }
  observeReveals(panel);
  if (animate) panel.querySelectorAll('[data-reveal]').forEach((el, i) => { el.style.setProperty('--d', `${Math.min(i, 8) * 0.05}s`); });
}

renderTabs(); renderPanel(false);
addEventListener('resize', moveBlob);
onLangChange(() => { renderTabs(); renderPanel(false); document.querySelectorAll('#panel [data-reveal]').forEach((el) => el.classList.add('is-in')); });
