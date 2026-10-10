// Shared runtime for every page: header/footer, theme + language toggles, unfold page transitions,
// global search, PDF viewer, announcements, scroll reveals and analytics.
import { icon } from './icons.js';
import { t, pick, getLang, setLang, applyI18n, onLangChange } from './i18n.js';
import { loadData, courseUrl, courseTitle, semester, searchIndex, KIND_ICON, isPdf, fileLabel } from './data.js';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const coarse = matchMedia('(hover: none) and (pointer: coarse)');
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { esc, $ };

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
export { store };

/** Theme color for a section ("analysis" | "informatik" | anything else = home blue). */
export function themeColor(theme) {
  const cs = getComputedStyle(document.documentElement);
  const v = { analysis: '--s-analysis', informatik: '--s-informatik' }[theme] || '--s-home';
  return cs.getPropertyValue(v).trim() || '#1d3bd1';
}

/* =========================================================================
   Theme
   ========================================================================= */
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function themePref() { return store.get('theme') || 'system'; }
function resolveTheme(pref) { return pref === 'dark' || (pref === 'system' && darkMQ.matches) ? 'dark' : 'light'; }
function applyTheme() {
  document.documentElement.dataset.theme = resolveTheme(themePref());
  document.dispatchEvent(new CustomEvent('themechange'));
  updateThemeButtons();
}
function updateThemeButtons() {
  const pref = themePref();
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.innerHTML = icon(pref === 'system' ? 'system' : pref === 'dark' ? 'moon' : 'sun');
    b.setAttribute('aria-label', `${t('theme.toggle')} (${t('theme.' + pref)})`);
    b.title = t('theme.' + pref);
  });
}
function cycleTheme(e) {
  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(themePref()) + 1) % 3];
  const before = resolveTheme(themePref());
  store.set('theme', next);
  const changes = resolveTheme(next) !== before;
  if (!changes || !document.startViewTransition || reduceMotion.matches) { applyTheme(); return; }
  // Liquid circular reveal from the button
  const r = e.currentTarget.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.classList.add('vt-theme');
  const vt = document.startViewTransition(applyTheme);
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
  vt.finished.finally(() => document.documentElement.classList.remove('vt-theme'));
}
darkMQ.addEventListener('change', () => { if (themePref() === 'system') applyTheme(); });

/* =========================================================================
   Language
   ========================================================================= */
function toggleLang() {
  const next = getLang() === 'de' ? 'en' : 'de';
  const run = () => setLang(next);
  if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(run);
  else run();
}

/* =========================================================================
   Header / footer
   ========================================================================= */
function navLinks(m, page, courseId) {
  const links = m.courses.map((c) => ({ href: courseUrl(c), label: courseTitle(c), sub: semester(c), tx: c.theme, cid: c.id, active: courseId === c.id }));
  links.push(
    { href: 'exams.html', key: 'nav.exams', active: page === 'exams' },
    { href: 'additional.html', key: 'nav.additional', active: page === 'additional' },
    { href: 'about.html', key: 'nav.about', active: page === 'about' },
  );
  return links;
}

function renderHeader(m, site, page, courseId) {
  const links = navLinks(m, page, courseId);
  const dot = (l) => (l.tx ? `--dot: var(--c-${l.tx})` : '--dot: var(--c-home)');
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="header-bar">
      <a class="brand" href="index.html" data-tx="home" aria-label="Quentin Türler – ${esc(t('nav.home'))}">
        <span class="brand__mark"><span>QT</span></span>
        <span class="brand__name">Quentin Türler</span>
      </a>
      <nav class="nav" aria-label="Main">
        ${links.map((l) => `<a href="${l.href}" ${l.tx ? `data-tx="${l.tx}"` : ''} style="${dot(l)}" ${l.active ? 'aria-current="page"' : ''} ${l.key ? `data-i18n="${l.key}"` : `data-cid="${l.cid}"`}>${esc(l.key ? t(l.key) : l.label)}</a>`).join('')}
      </nav>
      <div class="header-tools">
        <button class="search-trigger" data-search-open data-i18n-attr="aria-label:search.open">
          ${icon('search')}<span class="search-trigger__label" data-i18n="search.trigger">${t('search.trigger')}</span><span class="kbd">${/Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</span>
        </button>
        <button class="lang-toggle" data-lang-toggle data-i18n-attr="aria-label:lang.toggle"><span>DE</span><span>EN</span></button>
        <button class="icon-btn theme-toggle" data-theme-toggle></button>
        <button class="icon-btn menu-btn" data-menu-toggle aria-expanded="false" aria-controls="mobile-menu" data-i18n-attr="aria-label:nav.menu">${icon('menu')}</button>
      </div>
    </div>`;
  const menu = document.createElement('nav');
  menu.className = 'mobile-menu';
  menu.id = 'mobile-menu';
  menu.setAttribute('aria-label', 'Mobile');
  menu.innerHTML = [{ href: 'index.html', key: 'nav.home', active: page === 'home' }, ...links]
    .map((l) => `<a href="${l.href}" ${l.tx ? `data-tx="${l.tx}"` : ''} style="${dot(l)}" ${l.active ? 'aria-current="page"' : ''} tabindex="-1"><i></i><span ${l.key ? `data-i18n="${l.key}"` : `data-cid="${l.cid}"`}>${esc(l.key ? t(l.key) : l.label)}</span>${l.sub ? `<small data-csem="${l.cid}">${esc(l.sub)}</small>` : ''}</a>`).join('')
    + `<div class="mobile-menu__foot socials">${socialLinks(site)}</div>`;
  document.body.prepend(header, menu);

  const menuBtn = $('[data-menu-toggle]', header);
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = icon(open ? 'close' : 'menu');
    menuBtn.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.menu'));
    menu.querySelectorAll('a').forEach((a) => { a.tabIndex = open ? 0 : -1; });
    document.documentElement.style.overflow = open ? 'hidden' : '';
    header.classList.remove('is-hidden');
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Hide on scroll down, show on scroll up
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (!menu.classList.contains('is-open')) header.classList.toggle('is-hidden', y > 160 && y > lastY + 4);
    if (y < lastY - 4 || y < 160) header.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  header.querySelector('[data-lang-toggle]').addEventListener('click', toggleLang);
  header.querySelector('[data-theme-toggle]').addEventListener('click', cycleTheme);
  updateThemeButtons();
  onLangChange(() => {
    updateThemeButtons();
    m.courses.forEach((c) => {
      document.querySelectorAll(`[data-cid="${c.id}"]`).forEach((n) => { n.textContent = courseTitle(c); });
      document.querySelectorAll(`[data-csem="${c.id}"]`).forEach((n) => { n.textContent = semester(c); });
    });
  });
}

export function socialLinks(site) {
  const c = site.contact;
  return [
    ['mail', `mailto:${c.email}`, t('contact.email')],
    ['linkedin', c.linkedin, 'LinkedIn'], ['github', c.github, 'GitHub'],
    ['youtube', c.youtube, 'YouTube'], ['instagram', c.instagram, 'Instagram'],
  ].filter(([, href]) => href).map(([ic, href, label]) => `<a href="${esc(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(label)}">${icon(ic)}</a>`).join('');
}

function renderFooter(site) {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  const draw = () => {
    footer.innerHTML = `
      <div class="container">
        <div class="footer-cta">
          <span class="eyebrow">${esc(pick(site.person.role))}</span>
          <h2 data-reveal>${t('footer.cta', { email: esc(site.contact.email) })}</h2>
        </div>
        <div class="footer-row">
          <div class="socials">${socialLinks(site)}</div>
          <span>© ${new Date().getFullYear()} ${esc(site.person.name)} · ${t('footer.made')}</span>
        </div>
      </div>`;
    observeReveals(footer);
  };
  draw();
  onLangChange(draw);
  document.body.append(footer);
}

/* =========================================================================
   Announcement (data/site.json → announcement)
   ========================================================================= */
function renderAnnouncement(site) {
  const a = site.announcement;
  if (!a?.enabled) return;
  const key = `announce-dismissed:${a.id}`;
  if (store.get(key)) return;
  const el = document.createElement('div');
  el.className = 'announce';
  el.dataset.tone = a.tone || 'info';
  el.setAttribute('role', 'status');
  const draw = () => {
    el.innerHTML = `
      <span class="announce__icon">${icon('megaphone')}</span>
      <span class="announce__text">${esc(pick(a))}</span>
      ${a.link?.href ? `<a class="announce__link" href="${esc(a.link.href)}" ${a.link.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(pick(a.link))}</a>` : ''}
      <button class="announce__close" aria-label="${esc(t('announce.close'))}">${icon('close')}</button>`;
    el.querySelector('.announce__close').addEventListener('click', () => {
      store.set(key, '1');
      el.classList.remove('is-shown');
      setTimeout(() => el.remove(), 600);
    });
  };
  draw();
  onLangChange(draw);
  $('.site-header').after(el);
  setTimeout(() => el.classList.add('is-shown'), document.documentElement.classList.contains('tx-enter') ? 1500 : 900);
}

/* =========================================================================
   Unfold page transitions
   ========================================================================= */
const STRIPS = () => (innerWidth < 600 ? 4 : 7);

function stripsOverlay(color) {
  const n = STRIPS();
  const tx = document.createElement('div');
  tx.className = 'tx';
  tx.style.setProperty('--n', n);
  tx.style.setProperty('--tx-color', color);
  tx.innerHTML = '<div class="tx__strip"></div>'.repeat(n);
  document.body.append(tx);
  return tx;
}

export function navigate(href, { theme = 'home', label = '', origin = null } = {}) {
  const color = themeColor(theme);
  if (reduceMotion.matches) { location.href = href; return; }
  try { sessionStorage.setItem('tx', JSON.stringify({ color, label, t: Date.now() })); } catch (e) { location.href = href; return; }
  const go = () => { location.href = href; };

  if (origin) {
    // Expand the clicked card into a full-screen sheet, then leave
    const r = origin.getBoundingClientRect();
    const ex = document.createElement('div');
    ex.className = 'tx-expander';
    ex.style.cssText = `inset:0;--tx-color:${color}`;
    document.body.append(ex);
    const from = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 32px)`;
    ex.animate({ clipPath: [from, 'inset(0px 0px 0px 0px round 0px)'] }, { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' })
      .finished.then(go);
    if (label) {
      const lab = document.createElement('div');
      lab.className = 'tx__label';
      lab.textContent = label;
      document.body.append(lab);
      lab.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 350, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    }
    return;
  }
  // Strips close in like shutters
  const tx = stripsOverlay(color);
  const strips = [...tx.children];
  let last;
  strips.forEach((s, i) => {
    s.style.transformOrigin = i % 2 ? '50% 0' : '50% 100%';
    last = s.animate({ transform: ['scaleY(0)', 'scaleY(1)'] }, { duration: 520, delay: i * 45, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' });
  });
  last.finished.then(go);
}

function enterTransition() {
  const html = document.documentElement;
  if (!html.classList.contains('tx-enter')) return;
  let data = {};
  try { data = JSON.parse(sessionStorage.getItem('tx') || '{}'); sessionStorage.removeItem('tx'); } catch (e) { /* ignore */ }
  const color = data.color || themeColor('home');
  const tx = stripsOverlay(color);
  html.classList.add('tx-ready', 'tx-came');
  document.body.classList.add('page-enter');
  let label;
  if (data.label) {
    label = document.createElement('div');
    label.className = 'tx__label';
    label.textContent = data.label;
    document.body.append(label);
    label.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-60px) scale(.96)' }], { duration: 600, delay: 150, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' });
  }
  // Unfold: each strip rotates away around alternating edges, like a folding screen opening
  const strips = [...tx.children];
  let last;
  strips.forEach((s, i) => {
    const fromLeft = i % 2 === 0;
    s.style.transformOrigin = fromLeft ? '0 50%' : '100% 50%';
    last = s.animate(
      [{ transform: 'rotateY(0deg)', filter: 'brightness(1)' }, { transform: `rotateY(${fromLeft ? -92 : 92}deg)`, filter: 'brightness(.6)' }],
      { duration: 900, delay: 250 + i * 70, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' },
    );
  });
  last.finished.then(() => {
    tx.remove(); label?.remove();
    html.classList.remove('tx-enter', 'tx-ready');
    setTimeout(() => document.body.classList.remove('page-enter'), 1200);
  });
}

function bindTransitions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (href === '#search') { e.preventDefault(); openSearch(); return; }
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^https?:/.test(href) || !/\.html(#.*)?$/.test(href)) return;
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname) return; // same page, maybe a hash
    e.preventDefault();
    navigate(href, { theme: a.dataset.tx || 'home', label: a.dataset.txLabel || '', origin: a.hasAttribute('data-tx-expand') ? a : null });
  });
  // Returning via back/forward cache: clear any leftover overlays
  addEventListener('pageshow', (e) => {
    if (e.persisted) document.querySelectorAll('.tx, .tx-expander, .tx__label').forEach((n) => n.remove());
  });
}

/* =========================================================================
   Reveal-on-scroll + split headlines + counters
   ========================================================================= */
let revealIO;
export function observeReveals(root = document) {
  if (!revealIO) {
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        if (en.target.dataset.count !== undefined) countUp(en.target);
        revealIO.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }
  root.querySelectorAll('[data-reveal]:not(.is-in), .split:not(.is-in), [data-count]').forEach((el) => revealIO.observe(el));
}

/** Wrap each word in .w > span for the liquid word reveal. Inline elements stay whole. */
export function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.innerHTML = `<span style="--i:${i++}">${esc(part)}</span>`;
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement('span');
        inner.style.setProperty('--i', i++);
        n.replaceWith(w);
        inner.append(n);
        w.append(inner);
      }
    });
  };
  walk(el);
  el.classList.add('split');
}

function countUp(el) {
  const end = Number(el.dataset.count);
  if (reduceMotion.matches) { el.textContent = end; return; }
  const t0 = performance.now(), dur = 1600;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(end * (1 - (1 - p) ** 4));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Split all [data-split] elements and re-split after a language switch (words animate in again). */
function initSplits() {
  const run = (animate) => document.querySelectorAll('[data-split][data-i18n-html], [data-split]:not(.split)').forEach((el) => {
    splitWords(el);
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  });
  run(false);
  onLangChange(() => run(true));
}

/* =========================================================================
   Sticky stacking deck: earlier cards shrink and dim as later ones slide over them
   ========================================================================= */
export function initStack(container) {
  const items = [...container.querySelectorAll('.stack__item')];
  items.forEach((it, i) => it.style.setProperty('--i', i));
  if (reduceMotion.matches) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    items.forEach((it, i) => {
      const card = it.firstElementChild, next = items[i + 1];
      if (!next || !card) return;
      const r = it.getBoundingClientRect(), nr = next.getBoundingClientRect();
      const o = Math.min(1, Math.max(0, (r.bottom - nr.top) / r.height));
      card.style.transform = o ? `scale(${1 - o * 0.07}) translateY(${-o * 10}px)` : '';
      const shade = card.querySelector('.deck-card__shade');
      if (shade) shade.style.opacity = (o * 0.35).toFixed(3);
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
}

/* =========================================================================
   Files: tiles + preview viewer
   ========================================================================= */
export function fileTile(f, k = 0, { label } = {}) {
  const lbl = label || fileLabel(f);
  const kindLbl = t('kind.' + f.kind);
  const ext = (f.path.split('.').pop() || '').toUpperCase();
  const pdf = isPdf(f.path);
  let actions;
  if (pdf) {
    actions = `
      <button class="file__btn file__btn--main" data-preview="${esc(f.path)}" data-title="${esc(lbl)}">${icon('eye')}<span>${t('file.preview')}</span></button>
      <a class="file__btn" href="${esc(f.path)}" target="_blank" rel="noopener">${icon('external')}<span>${t('file.open')}</span></a>
      <a class="file__btn file__btn--icon" href="${esc(f.path)}" download aria-label="${esc(t('file.download'))}">${icon('download')}</a>`;
  } else if (/\.ipynb$/i.test(f.path)) {
    actions = `
      <a class="file__btn file__btn--main" data-colab="${esc(f.path)}" href="${esc(f.path)}" target="_blank" rel="noopener">${icon('notebook')}<span>${t('file.colab')}</span></a>
      <a class="file__btn file__btn--icon" href="${esc(f.path)}" download aria-label="${esc(t('file.download'))}">${icon('download')}</a>`;
  } else {
    actions = `<a class="file__btn file__btn--main" href="${esc(f.path)}" download>${icon('download')}<span>${t('file.download')}</span></a>`;
  }
  return `
    <div class="file" data-kind="${esc(f.kind)}" style="--k:${k}">
      <div class="file__icon">${icon(KIND_ICON[f.kind])}</div>
      <div class="file__text"><div class="file__label">${esc(lbl)}</div><div class="file__kind">${ext}${lbl !== kindLbl ? ` · ${esc(kindLbl)}` : ''}</div></div>
      <div class="file__actions">${actions}</div>
    </div>`;
}

export function examItem(e, i = 0) {
  const label = pick(e, 'label');
  const btn = (path, kind) => `<button class="file__btn file__btn--main" data-preview="${esc(path)}" data-title="${esc(`${t('exams.' + kind)} ${label}`)}">${icon(kind === 'exam' ? 'file' : 'check')}<span>${esc(t('exams.' + kind))}</span></button>`;
  return `
    <div class="exam-item" data-reveal style="--d:${(i % 6) * 0.05}s">
      <div class="exam-item__head"><span class="exam-item__name">${esc(label)}</span>${!e.exam ? `<span class="exam-item__tag">${esc(t('exams.only_solution'))}</span>` : ''}</div>
      <div class="exam-item__actions">${e.exam ? btn(e.exam, 'exam') : ''}${e.solution ? btn(e.solution, 'solution') : ''}</div>
    </div>`;
}

let viewer, lastFocus;
function ensureViewer() {
  if (viewer) return viewer;
  viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.innerHTML = `
    <div class="viewer__scrim" data-close></div>
    <div class="viewer__panel">
      <div class="viewer__bar">
        <div class="viewer__title"><b></b><span></span></div>
        <a class="file__btn" data-newtab target="_blank" rel="noopener">${icon('external')}<span class="btn-label" data-i18n="viewer.newtab">${t('viewer.newtab')}</span></a>
        <a class="file__btn" data-dl download>${icon('download')}<span class="btn-label" data-i18n="file.download">${t('file.download')}</span></a>
        <button class="icon-btn" data-close data-i18n-attr="aria-label:viewer.close">${icon('close')}</button>
      </div>
      <div class="viewer__frame"><div class="viewer__loading" data-i18n="viewer.loading">${t('viewer.loading')}</div></div>
    </div>`;
  document.body.append(viewer);
  applyI18n(viewer);
  viewer.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeViewer(); });
  viewer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'Tab') trapFocus(e, viewer.querySelector('.viewer__bar'));
  });
  return viewer;
}

function trapFocus(e, container) {
  const f = [...container.querySelectorAll('a[href], button, input')].filter((n) => n.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

export function openFile(f, origin) {
  if (!isPdf(f.path)) { window.open(f.path, '_blank', 'noopener'); return; }
  openPdf(f.path, f.label_en && getLang() === 'en' ? f.label_en : f.label, '', origin);
}

export function openPdf(path, title, sub = '', origin = null) {
  // Phones/tablets: the browser's own PDF viewer works far better than an iframe
  if (coarse.matches) { window.open(path, '_blank', 'noopener'); return; }
  const v = ensureViewer();
  lastFocus = document.activeElement;
  v.querySelector('.viewer__title b').textContent = title || path.split('/').pop();
  v.querySelector('.viewer__title span').textContent = sub || path.split('/').pop();
  v.querySelector('[data-newtab]').href = path;
  v.querySelector('[data-dl]').href = path;
  const frame = v.querySelector('.viewer__frame');
  frame.querySelector('iframe')?.remove();
  const iframe = document.createElement('iframe');
  iframe.title = title || 'PDF';
  iframe.src = `${path}#view=FitH`;
  frame.append(iframe);
  const panel = v.querySelector('.viewer__panel');
  // Grow the panel out of the clicked button
  if (origin && !reduceMotion.matches) {
    const pr = panel.getBoundingClientRect(), r = origin.getBoundingClientRect();
    panel.style.setProperty('--ct', `${Math.max(0, r.top - pr.top)}px`);
    panel.style.setProperty('--cl', `${Math.max(0, r.left - pr.left)}px`);
    panel.style.setProperty('--cr', `${Math.max(0, pr.right - r.right)}px`);
    panel.style.setProperty('--cb', `${Math.max(0, pr.bottom - r.bottom)}px`);
  }
  panel.offsetWidth; // commit start state
  v.classList.add('is-open');
  document.documentElement.style.overflow = 'hidden';
  v.querySelector('[data-close].icon-btn').focus({ preventScroll: true });
}

function closeViewer() {
  if (!viewer?.classList.contains('is-open')) return;
  viewer.classList.remove('is-open');
  document.documentElement.style.overflow = '';
  setTimeout(() => { if (!viewer.classList.contains('is-open')) viewer.querySelector('iframe')?.remove(); }, 700);
  lastFocus?.focus?.({ preventScroll: true });
}

function bindFileActions(site) {
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-preview]');
    if (p) { e.preventDefault(); openPdf(p.dataset.preview, p.dataset.title, p.dataset.sub || '', p); return; }
    const c = e.target.closest('[data-colab]');
    if (c && site.repo) {
      e.preventDefault();
      window.open(`https://colab.research.google.com/github/${site.repo}/blob/main/${c.dataset.colab}`, '_blank', 'noopener');
    }
  });
}

/* =========================================================================
   Global search (Ctrl/⌘ K, "/")
   ========================================================================= */
let searchEl, searchData, searchSel = 0, searchResults = [];
const GROUP_ORDER = ['pages', 'weeks', 'files', 'exams'];

function ensureSearch() {
  if (searchEl) return searchEl;
  searchEl = document.createElement('div');
  searchEl.className = 'search';
  searchEl.setAttribute('role', 'dialog');
  searchEl.setAttribute('aria-modal', 'true');
  searchEl.innerHTML = `
    <div class="search__scrim" data-close></div>
    <div class="search__panel">
      <label class="search__input">${icon('search')}
        <input type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="search-results" data-i18n-attr="placeholder:search.placeholder;aria-label:search.placeholder">
        <button class="icon-btn" data-close data-i18n-attr="aria-label:search.close">${icon('close')}</button>
      </label>
      <div class="search__results" id="search-results" role="listbox"></div>
      <div class="search__foot"><span><span class="kbd">↑↓</span> <span data-i18n="search.navigate"></span></span><span><span class="kbd">↵</span> <span data-i18n="search.open_item"></span></span><span><span class="kbd">esc</span> <span data-i18n="search.close"></span></span></div>
    </div>`;
  document.body.append(searchEl);
  applyI18n(searchEl);
  const input = searchEl.querySelector('input');
  input.addEventListener('input', () => runSearch(input.value));
  searchEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeSearch(); return; }
    const item = e.target.closest('.search__item');
    if (item) activate(Number(item.dataset.idx), item);
  });
  searchEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!searchResults.length) return;
      searchSel = (searchSel + (e.key === 'ArrowDown' ? 1 : -1) + searchResults.length) % searchResults.length;
      markSel(true);
    }
    if (e.key === 'Enter' && searchResults[searchSel]) {
      e.preventDefault();
      activate(searchSel, searchEl.querySelector(`[data-idx="${searchSel}"]`));
    }
  });
  onLangChange(() => { searchData = null; applyI18n(searchEl); });
  return searchEl;
}

async function openSearch() {
  const el = ensureSearch();
  lastFocus = document.activeElement;
  el.classList.add('is-open');
  document.documentElement.style.overflow = 'hidden';
  const input = el.querySelector('input');
  input.value = '';
  setTimeout(() => input.focus(), 50);
  runSearch('');
}

function closeSearch() {
  if (!searchEl?.classList.contains('is-open')) return;
  searchEl.classList.remove('is-open');
  document.documentElement.style.overflow = '';
  lastFocus?.focus?.({ preventScroll: true });
}

async function runSearch(q) {
  if (!searchData) {
    const { materials } = await loadData();
    searchData = searchIndex(materials);
  }
  const { items, norm } = searchData;
  const box = searchEl.querySelector('.search__results');
  const tokens = norm(q.trim()).split(/\s+/).filter(Boolean);
  let res;
  if (!tokens.length) {
    res = items.filter((it) => it.group === 'pages');
  } else {
    res = items
      .filter((it) => tokens.every((tk) => it.hay.includes(tk)))
      .map((it) => ({ it, score: tokens.reduce((s, tk) => s + (norm(it.title).includes(tk) ? 2 : 1), 0) }))
      .sort((a, b) => GROUP_ORDER.indexOf(a.it.group) - GROUP_ORDER.indexOf(b.it.group) || b.score - a.score)
      .map((r) => r.it)
      .slice(0, 60);
  }
  searchResults = res;
  searchSel = 0;
  if (!res.length) {
    box.innerHTML = `<div class="search__empty">${esc(t('search.empty', { q }))}<br><small>${esc(t('search.hint'))}</small></div>`;
    return;
  }
  const hl = (s) => {
    let out = esc(s);
    tokens.forEach((tk) => {
      if (tk.length < 2) return;
      const re = new RegExp(`(${tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  };
  let html = '', group = '';
  res.forEach((it, i) => {
    if (it.group !== group) { group = it.group; html += `<div class="search__group">${esc(t('search.g.' + group))}</div>`; }
    html += `<button class="search__item" role="option" data-idx="${i}" style="--k:${Math.min(i, 20)}" ${it.kind ? `data-kind="${it.kind}"` : ''}>
      <span class="file__icon">${icon(it.icon)}</span>
      <span><b>${hl(it.title)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>
      ${icon(it.file ? (isPdf(it.file.path) ? 'eye' : 'download') : 'arrowRight', 'go')}
    </button>`;
  });
  box.innerHTML = (tokens.length ? '' : `<div class="search__empty" style="padding:14px 12px 4px;text-align:left"><small>${esc(t('search.hint'))}</small></div>`) + html;
  markSel(false);
}

function markSel(scroll) {
  searchEl.querySelectorAll('.search__item').forEach((n) => {
    const on = Number(n.dataset.idx) === searchSel;
    n.setAttribute('aria-selected', String(on));
    if (on && scroll) n.scrollIntoView({ block: 'nearest' });
  });
}

function activate(i, node) {
  const it = searchResults[i];
  if (!it) return;
  if (it.file) {
    closeSearch();
    if (isPdf(it.file.path)) openPdf(it.file.path, it.title, it.sub, node);
    else window.open(it.file.path, '_blank', 'noopener');
    return;
  }
  closeSearch();
  const url = new URL(it.href, location.href);
  if (url.pathname === location.pathname) {
    if (url.hash) { history.replaceState(null, '', url.hash); dispatchEvent(new HashChangeEvent('hashchange')); }
    else scrollTo({ top: 0 });
    return;
  }
  navigate(it.href, { theme: it.theme || 'home' });
}

function bindSearch() {
  document.addEventListener('click', (e) => { if (e.target.closest('[data-search-open]')) { e.preventDefault(); openSearch(); } });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchEl?.classList.contains('is-open') ? closeSearch() : openSearch(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
  });
}

/* =========================================================================
   Analytics (privacy-friendly GoatCounter, or GA4) from site.json
   ========================================================================= */
function initAnalytics(site) {
  const a = site.analytics || {};
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:') return;
  if (a.goatcounter) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = `https://${a.goatcounter}.goatcounter.com/count`;
    document.head.append(s);
  } else if (a.ga4) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.ga4)}`;
    document.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', a.ga4, { anonymize_ip: true });
  }
}

/* =========================================================================
   Init
   ========================================================================= */
export async function initPage({ page, courseId } = {}) {
  document.documentElement.classList.add('js', 'ready');
  applyI18n();
  applyTheme();
  bindTransitions();
  enterTransition();
  const { materials, site } = await loadData();
  renderHeader(materials, site, page, courseId);
  renderFooter(site);
  renderAnnouncement(site);
  bindSearch();
  bindFileActions(site);
  applyI18n();
  initSplits();
  observeReveals();
  initAnalytics(site);
  const titleKey = document.body.dataset.titleKey;
  const setTitle = () => { if (titleKey) document.title = t(titleKey); };
  setTitle();
  onLangChange(setTitle);
  return { materials, site };
}
