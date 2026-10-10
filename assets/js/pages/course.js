// Generic course page. The HTML shell sets <body data-course="<id>">; everything else comes from
// data/materials.json, so a new course only needs a manifest entry and a copy of the shell.
import { initPage, esc, observeReveals, initStack, fileTile, examItem, splitWords, reduceMotion, $ } from '../core.js';
import { icon } from '../icons.js';
import { t, pick, onLangChange } from '../i18n.js';
import { courseTitle, semester, kindGroup, weekOf, formatDate, examYear, isPdf } from '../data.js';
import { fourierBg } from '../bg/fourier.js';
import { codeBg } from '../bg/code.js';
import { fourierDemo } from '../demos/fourier-demo.js';
import { sortDemo } from '../demos/sort-demo.js';

const courseId = document.body.dataset.course;
const { materials: m } = await initPage({ page: document.body.dataset.page, courseId });
const c = m.courses.find((x) => x.id === courseId);
const canvas = document.getElementById('bg');
if (c.motif === 'fourier') fourierBg(canvas);
else if (c.motif === 'code') codeBg(canvas);
else canvas.remove();

const status = weekOf(c.semesterStart, c.weeks.length);
const currentWeek = status?.state === 'active' ? status.week : null;
const state = { group: 'all', q: '', open: new Set(currentWeek ? [currentWeek] : []) };
const hasDemo = c.motif === 'fourier' || c.motif === 'code';
const root = $('#course');

/* ---------- skeleton (rendered once; inner parts re-render on language change) ---------- */
root.innerHTML = `
  <section class="hero course-hero container" id="top"></section>
  <nav class="subnav container" aria-label="Sections"><div class="subnav__inner"><span class="subnav__blob"></span></div></nav>
  <section class="section container" id="weeks"></section>
  ${c.resources.length ? '<section class="section container" id="resources"></section>' : ''}
  ${c.exams.length || c.examCollection ? '<section class="section container" id="exams"></section>' : ''}
  ${hasDemo ? '<section class="section container" id="demo"><div class="section-head" data-demo-head></div><div data-demo></div></section>' : ''}`;

function renderHero() {
  const words = courseTitle(c).split(' ');
  const last = words.pop();
  let statusText;
  if (status?.state === 'active') statusText = t('course.status.week', { w: status.week });
  else if (status?.state === 'upcoming') statusText = t('course.status.upcoming', { d: formatDate(status.start) });
  else statusText = t('course.status.done');
  const sessions = (c.sessions || []).map((s) => `
    <div class="info-card">
      <span class="info-card__icon">${icon(s.type === 'exercise' ? 'users' : 'pin')}</span>
      <span class="info-card__label">${esc(t('course.session.' + s.type))}</span>
      <span class="info-card__value">${esc(pick(s))}<span class="room">${esc(s.room || '')}</span></span>
    </div>`).join('');
  $('#top').innerHTML = `
    <a class="back-link" href="index.html" data-tx="home">${icon('arrowLeft')}<span>${esc(t('course.back'))}</span></a>
    <div class="hero__meta" style="margin:18px 0 22px">
      <span class="pill"><span class="dot"></span>${esc(semester(c))}</span>
      <span class="pill"><span class="dot ${currentWeek ? 'dot--live' : 'dot--off'}"></span>${esc(statusText)}</span>
    </div>
    <h1 class="hero__title" data-split>${esc(words.join(' '))} <span class="accent-word">${esc(last)}</span></h1>
    <div class="course-hero__grid">
      <div>
        <p class="hero__lead" data-reveal style="--d:.5s">${esc(pick(c.description))}</p>
        <div class="link-row" data-reveal style="--d:.6s">
          ${c.links.map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(pick(l, 'label'))}${l.note ? ` <span class="count">${esc(l.note)}</span>` : ''}${icon('arrowUpRight')}</a>`).join('')}
        </div>
      </div>
      <div class="info-cards" data-reveal style="--d:.7s">${sessions}</div>
    </div>`;
}

function renderSubnav() {
  const links = [['weeks', 'course.nav.weeks'], ['resources', 'course.nav.resources'], ['exams', 'course.nav.exams'], ['demo', 'course.nav.demo']]
    .filter(([id]) => document.getElementById(id));
  const inner = $('.subnav__inner');
  inner.querySelectorAll('a').forEach((a) => a.remove());
  inner.insertAdjacentHTML('beforeend', links.map(([id, k]) => `<a href="#${id}" data-sec="${id}">${esc(t(k))}</a>`).join(''));
  spy();
}

/* ---------- weeks ---------- */
const GROUPS = ['all', 'notes', 'exercise', 'solution', 'slides', 'notebook', 'extra'];
function renderWeeks() {
  const counts = {};
  c.weeks.forEach((w) => w.files.forEach((f) => { const g = kindGroup(f.kind); counts[g] = (counts[g] || 0) + 1; }));
  const groups = GROUPS.filter((g) => g === 'all' || counts[g]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  $('#weeks').innerHTML = `
    <div class="section-head">
      <span class="eyebrow">${esc(t('course.weeks.eyebrow'))}</span>
      <h2 data-reveal>${esc(t('course.weeks.title'))}</h2>
      <p data-reveal style="--d:.1s">${esc(t('course.weeks.lead'))}</p>
    </div>
    <div class="toolbar" data-reveal>
      <div class="toolbar__row">
        <label class="field">${icon('search')}<input type="search" data-q placeholder="${esc(t('course.filter.search'))}" aria-label="${esc(t('course.filter.search'))}" value="${esc(state.q)}"></label>
        <button class="chip" data-expand>${icon('layers')}<span></span></button>
      </div>
      <div class="toolbar__row" role="group">
        ${groups.map((g) => `<button class="chip" data-group="${g}" aria-pressed="${state.group === g}">${esc(t('course.filter.' + g))}<span class="count">${g === 'all' ? total : counts[g]}</span></button>`).join('')}
      </div>
      <nav class="week-rail" aria-label="${esc(t('course.nav.weeks'))}">
        ${c.weeks.map((w) => `<a href="#week-${w.week}" data-rail="${w.week}" class="${w.week === currentWeek ? 'is-current' : ''}" aria-label="${esc(t('course.week', { w: w.week }))}">${String(w.week).padStart(2, '0')}</a>`).join('')}
      </nav>
    </div>
    <div class="timeline">
      <div class="timeline__line"><div class="timeline__fill"></div></div>
      ${c.weeks.map(weekHtml).join('')}
      <div class="empty-state" data-empty hidden>${esc(t('course.filter.none'))}</div>
    </div>`;
  const q = $('[data-q]');
  q.addEventListener('input', () => { state.q = q.value; applyFilter(true); });
  $('#weeks').querySelectorAll('[data-group]').forEach((b) => b.addEventListener('click', () => {
    state.group = b.dataset.group;
    $('#weeks').querySelectorAll('[data-group]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applyFilter(true);
  }));
  $('[data-expand]').addEventListener('click', () => {
    const visible = [...document.querySelectorAll('.week:not([hidden])')];
    const allOpen = visible.every((w) => w.classList.contains('is-open'));
    visible.forEach((w) => setOpen(w, !allOpen));
    updateExpandBtn();
  });
  document.querySelectorAll('.week-card__head').forEach((h) => h.addEventListener('click', () => {
    const w = h.closest('.week');
    setOpen(w, !w.classList.contains('is-open'));
    updateExpandBtn();
  }));
  applyFilter(false);
  updateExpandBtn();
}

function weekHtml(w) {
  const now = w.week === currentWeek;
  const open = state.open.has(w.week);
  return `
    <article class="week ${now ? 'is-current' : ''} ${open ? 'is-open' : ''}" id="week-${w.week}" data-week="${w.week}" data-reveal="left">
      <span class="week__node" aria-hidden="true">${String(w.week).padStart(2, '0')}</span>
      <div class="week-card">
        <button class="week-card__head" aria-expanded="${open}" aria-controls="week-${w.week}-body">
          <span class="week-card__num">${esc(t('course.week', { w: String(w.week).padStart(2, '0') }))}${now ? `<span class="now">${esc(t('course.this_week'))}</span>` : ''}</span>
          <span class="week-card__topic">${esc(pick(w, 'topic'))}</span>
          <span class="week-card__meta"><span class="files-count">${esc(w.files.length === 1 ? t('course.n_file') : t('course.n_files', { n: w.files.length }))}</span><span class="week-card__chev">${icon('chevronDown')}</span></span>
        </button>
        <div class="week-card__body" id="week-${w.week}-body" ${open ? '' : 'inert'}><div><div class="week-card__content">
          <div class="files">${w.files.map((f, k) => fileTile(f, k)).join('')}</div>
          ${w.links.length ? `<div class="ext-links">${w.links.map((l, k) => `<a class="ext-link" style="--k:${w.files.length + k}" href="${esc(l.url)}" target="_blank" rel="noopener">${icon('link')}${esc(pick(l, 'label'))}</a>`).join('')}</div>` : ''}
        </div></div></div>
      </div>
    </article>`;
}

function setOpen(w, open) {
  w.classList.toggle('is-open', open);
  w.querySelector('.week-card__head').setAttribute('aria-expanded', String(open));
  const body = w.querySelector('.week-card__body');
  if (open) body.removeAttribute('inert'); else body.setAttribute('inert', '');
  const n = Number(w.dataset.week);
  if (open) state.open.add(n); else state.open.delete(n);
}

function updateExpandBtn() {
  const visible = [...document.querySelectorAll('.week:not([hidden])')];
  const allOpen = visible.length && visible.every((w) => w.classList.contains('is-open'));
  $('[data-expand] span').textContent = t(allOpen ? 'course.collapse_all' : 'course.expand_all');
}

function applyFilter(userAction) {
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(state.q.trim());
  let shown = 0;
  c.weeks.forEach((w) => {
    const el = document.getElementById(`week-${w.week}`);
    const hay = norm(`${w.week} ${t('course.week', { w: w.week })} ${w.topic} ${w.topic_en} ${w.files.map((f) => `${f.label} ${f.label_en}`).join(' ')}`);
    const qOk = !q || q.split(/\s+/).every((tk) => hay.includes(tk));
    let fileHits = 0;
    el.querySelectorAll('.file').forEach((tile, i) => {
      const hit = state.group === 'all' || kindGroup(w.files[i].kind) === state.group;
      tile.hidden = !hit;
      fileHits += hit;
    });
    el.querySelector('.ext-links')?.toggleAttribute('hidden', state.group !== 'all');
    const vis = qOk && fileHits > 0;
    el.hidden = !vis;
    shown += vis;
    $(`[data-rail="${w.week}"]`)?.classList.toggle('is-dim', !vis);
    if (userAction && vis && (q || state.group !== 'all')) setOpen(el, true);
  });
  $('[data-empty]').hidden = shown > 0;
  if (userAction) { updateExpandBtn(); progress(); }
}

/* ---------- resources (stacked cards) ---------- */
function renderResources() {
  const el = $('#resources');
  if (!el) return;
  el.innerHTML = `
    <div class="section-head">
      <span class="eyebrow">${esc(t('course.res.eyebrow'))}</span>
      <h2 data-reveal>${esc(t('course.res.title'))}</h2>
      <p data-reveal style="--d:.1s">${esc(t('course.res.lead'))}</p>
    </div>
    <div class="stack">
      ${c.resources.map((f, i) => `
        <div class="stack__item">
          <article class="res-card" data-kind="${esc(f.kind)}">
            <div class="res-card__kind"><span>${esc(t('kind.' + f.kind))}</span><span>${String(i + 1).padStart(2, '0')} / ${String(c.resources.length).padStart(2, '0')}</span></div>
            <h3>${esc(pick(f, 'label'))}</h3>
            <div class="res-card__actions">
              ${isPdf(f.path) ? `<button class="btn btn--accent" data-preview="${esc(f.path)}" data-title="${esc(pick(f, 'label'))}">${icon('eye')}${esc(t('file.preview'))}</button>` : ''}
              <a class="btn btn--ghost" href="${esc(f.path)}" target="_blank" rel="noopener">${esc(t('file.open'))}${icon('external')}</a>
              <a class="btn btn--ghost" href="${esc(f.path)}" download aria-label="${esc(t('file.download'))}">${icon('download')}</a>
            </div>
            <div class="deck-card__shade"></div>
          </article>
        </div>`).join('')}
    </div>`;
  initStack(el.querySelector('.stack'));
}

/* ---------- exams teaser ---------- */
function renderExams() {
  const el = $('#exams');
  if (!el) return;
  if (c.exams.length) {
    const years = c.exams.map(examYear).filter(Boolean).sort();
    const recent = [...c.exams].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 6);
    el.innerHTML = `
      <div class="section-head">
        <span class="eyebrow">${esc(t('course.exams.eyebrow'))}</span>
        <h2 data-reveal>${esc(t('course.exams.title'))}</h2>
        <p data-reveal style="--d:.1s">${esc(t('course.exams.lead', { n: c.exams.length, from: years[0], to: years[years.length - 1] }))}</p>
      </div>
      <div class="exam-mini">${recent.map((e, i) => examItem(e, i)).join('')}</div>
      <a class="btn" style="margin-top:24px" href="exams.html#${c.id}" data-tx="${c.theme}" data-tx-label="${esc(t('nav.exams'))}">${esc(t('cta.all_exams'))}${icon('arrowRight')}</a>`;
  } else {
    el.innerHTML = `
      <div class="callout grain" data-reveal="scale">
        <span class="eyebrow" style="color:inherit">${esc(t('course.exams.eyebrow'))}</span>
        <h3>${esc(t('course.exams.title'))}</h3>
        <p>${esc(t('course.exams.external'))}</p>
        <a class="btn" href="${esc(c.examCollection)}" target="_blank" rel="noopener">${esc(t('cta.to_collection'))}${icon('arrowUpRight')}</a>
      </div>`;
  }
}

/* ---------- demo ---------- */
function renderDemoHead() {
  const head = $('[data-demo-head]');
  if (!head) return;
  const k = c.motif === 'fourier' ? 'fourier' : 'sort';
  head.innerHTML = `
    <span class="eyebrow">${esc(t('course.demo.eyebrow'))}</span>
    <h2 data-reveal>${esc(t(`demo.${k}.title`))}</h2>
    <p data-reveal style="--d:.1s">${esc(t(`demo.${k}.lead`))}</p>`;
}

/* ---------- scroll: timeline progress + subnav spy ---------- */
function progress() {
  const tl = $('.timeline');
  if (!tl) return;
  const r = tl.getBoundingClientRect();
  const line = innerHeight * 0.6;
  const p = Math.min(1, Math.max(0, (line - r.top) / r.height));
  tl.querySelector('.timeline__fill').style.setProperty('--p', p.toFixed(4));
  document.querySelectorAll('.week').forEach((w) => {
    w.classList.toggle('is-passed', w.getBoundingClientRect().top + 30 < line);
  });
}

function spy() {
  const links = [...document.querySelectorAll('.subnav a')];
  if (!links.length) return;
  let active = links[0];
  links.forEach((a) => {
    const sec = document.getElementById(a.dataset.sec);
    if (sec && sec.getBoundingClientRect().top < innerHeight * 0.4) active = a;
  });
  links.forEach((a) => a.classList.toggle('is-active', a === active));
  const blob = $('.subnav__blob');
  blob.style.width = `${active.offsetWidth}px`;
  blob.style.transform = `translateX(${active.offsetLeft}px)`;
  if (active.offsetLeft < active.parentElement.scrollLeft || active.offsetLeft + active.offsetWidth > active.parentElement.scrollLeft + active.parentElement.clientWidth) {
    active.parentElement.scrollTo({ left: active.offsetLeft - 20, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
}

let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; progress(); spy(); });
}, { passive: true });
addEventListener('resize', () => { progress(); spy(); });

/* ---------- deep links: #week-N ---------- */
function openFromHash(smooth) {
  const mm = location.hash.match(/^#week-(\d+)$/);
  if (!mm) return;
  const w = document.getElementById(`week-${mm[1]}`);
  if (!w) return;
  if (w.hidden) {
    state.group = 'all'; state.q = '';
    $('[data-q]').value = '';
    $('#weeks').querySelectorAll('[data-group]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.group === 'all')));
    applyFilter(false);
  }
  setOpen(w, true);
  updateExpandBtn();
  w.classList.add('is-in');
  setTimeout(() => w.scrollIntoView({ behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto', block: 'start' }), smooth ? 0 : 50);
}
addEventListener('hashchange', () => openFromHash(true));

/* ---------- render ---------- */
function renderAll(first) {
  document.title = `${courseTitle(c)} · Quentin Türler`;
  renderHero(); renderSubnav(); renderWeeks(); renderResources(); renderExams(); renderDemoHead();
  document.querySelectorAll('#course [data-split]').forEach((el) => splitWords(el));
  if (first) observeReveals();
  else document.querySelectorAll('#course [data-reveal], #course .split').forEach((el) => el.classList.add('is-in'));
  progress();
}
renderAll(true);
if (hasDemo) {
  (c.motif === 'fourier' ? fourierDemo : sortDemo)($('[data-demo]'));
  observeReveals();
}
onLangChange(() => renderAll(false));
if (location.hash) openFromHash(false);
else if (currentWeek && !reduceMotion.matches) setTimeout(() => { location.hash = `#week-${currentWeek}`; }, 1600);
