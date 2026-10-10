import { initPage, esc, observeReveals, initStack, coarse, $ } from '../core.js';
import { icon } from '../icons.js';
import { t, pick, onLangChange } from '../i18n.js';
import { courseUrl, courseTitle, semester, courseStats, totalStats, weekOf, themeOf } from '../data.js';
import { liquid } from '../bg/liquid.js';

liquid(document.getElementById('bg'));
const { materials: m, site } = await initPage({ page: 'home' });

/** A wave made from a few Fourier terms, two periods wide so it can loop with translateX(-50%). */
function wavePath(w, h, terms, amp, periods = 4) {
  let d = '';
  for (let x = 0; x <= w; x += 4) {
    const th = (x / w) * periods * Math.PI * 2;
    let y = 0;
    for (let k = 1; k <= terms * 2; k += 2) y += Math.sin(k * th) / k;
    d += `${x ? 'L' : 'M'}${x} ${(h / 2 - y * amp).toFixed(1)}`;
  }
  return d;
}
const waveArt = () => `
  <svg viewBox="0 0 1600 300" preserveAspectRatio="none" style="width:200%">
    <path class="wave-path wave-move" d="${wavePath(1600, 300, 4, 70)}"/>
    <path class="wave-path wave-path--2 wave-move wave-move--slow" d="${wavePath(1600, 300, 1, 90)}" transform="translate(0 30)"/>
  </svg>`;
const CODE_LINES = ['def dp(i, cap):', '  if i == n: return 0', '  if (i, cap) in memo:', '    return memo[i, cap]', '  best = dp(i + 1, cap)', '  if w[i] <= cap:', '    best = max(best,', '      v[i] + dp(i+1, cap-w[i]))', '  memo[i, cap] = best', '  return best', '', 'heapq.heapify(pq)', 'xs.sort(key=len)', 'np.mean(X, axis=0)', '0b1011 ^ 0b0110', ''];
const codeArt = () => `<div class="code-art"><div class="code-art__scroll">${esc([...CODE_LINES, ...CODE_LINES].join('\n'))}</div></div>`;
const artFor = (c) => (c.motif === 'fourier' ? `<div class="qcard__art">${waveArt()}</div>` : c.motif === 'code' ? codeArt() : '');

function renderStatus() {
  const ns = site.nextSession;
  const sem = site.currentSemester;
  const wk = sem ? weekOf(sem.start, sem.weeks) : null;
  const semText = sem ? (wk?.state === 'active' ? t('home.semweek', { sem: pick(sem.label), w: wk.week }) : t('home.semoff', { sem: pick(sem.label) })) : '';
  $('#status').innerHTML = `
    <span class="pill"><span class="dot ${ns ? 'dot--live' : 'dot--off'}"></span>${ns ? `${esc(pick(ns))}${ns.room ? ` · <span class="mono">${esc(ns.room)}</span>` : ''}` : esc(t('home.next.none'))}</span>
    ${semText ? `<span class="pill">${icon('calendar')}${esc(semText)}</span>` : ''}`;
  $('#status').querySelectorAll('.pill svg').forEach((s) => { s.style.cssText = 'width:15px;height:15px'; });
}

function renderQuick() {
  $('#quick').innerHTML = m.courses.map((c, i) => `
    <a class="qcard grain" href="${courseUrl(c)}" data-tx="${c.theme}" data-tx-expand data-tx-label="${esc(courseTitle(c))}" style="--c: var(--s-${themeOf(c)}); --d:${0.45 + i * 0.12}s">
      ${artFor(c)}
      <div class="qcard__glow"></div>
      <div class="qcard__top"><span class="qcard__sem">${esc(semester(c))}</span><span class="qcard__arrow">${icon('arrowUpRight')}</span></div>
      <div><span class="qcard__index">${esc(t('home.course_index', { n: String(i + 1).padStart(2, '0') }))}</span><h2>${esc(courseTitle(c))}</h2><p>${esc(pick(c.tagline))}</p></div>
    </a>`).join('');
  if (!coarse.matches) {
    $('#quick').querySelectorAll('.qcard').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }
  const total = totalStats(m);
  $('[data-search-hero]').textContent = t('search.hero', { n: total.docs });
}

function renderDeck() {
  const yearArt = () => {
    const years = [...new Set(m.courses.flatMap((c) => c.exams.map((e) => e.id.match(/\d{4}/)?.[0])).filter(Boolean))].sort();
    return `<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;padding:18px;align-content:center;font-family:var(--font-mono);font-size:13px">
      ${years.map((y, i) => `<span style="padding:10px 0;text-align:center;border-radius:10px;background:var(--surface);border:1px solid var(--line);animation:float ${5 + (i % 4)}s ease-in-out ${i * -0.4}s infinite">${y}</span>`).join('')}</div>`;
  };
  const blobArt = () => `<div class="subject__blob" style="--sc:var(--c-analysis);right:auto;left:10%;top:10%"></div><div class="subject__blob" style="--sc:var(--c-informatik);right:5%;top:30%;animation-delay:-4s"></div><div class="subject__blob" style="--sc:var(--accent-2);left:35%;top:55%;animation-delay:-8s"></div>`;
  const cards = m.courses.map((c) => {
    const s = courseStats(c);
    return {
      color: `var(--s-${themeOf(c)})`, href: courseUrl(c), tx: c.theme, title: courseTitle(c), text: pick(c.description),
      stats: [[s.weeks, t('stat.weeks')], [s.files, t('stat.files')], ...(s.exams ? [[s.exams, t('stat.exams')]] : [])],
      cta: t('cta.open_course'), art: c.motif === 'fourier' ? waveArt() : c.motif === 'code' ? codeArt() : '', sub: semester(c),
    };
  });
  const examCount = m.courses.reduce((n, c) => n + c.exams.length, 0);
  cards.push(
    { href: 'exams.html', title: t('nav.exams'), text: t('home.deck.exams'), stats: [[examCount, t('stat.exams')]], cta: t('cta.view_exams'), art: yearArt() },
    { href: 'additional.html', title: t('nav.additional'), text: t('home.deck.additional'), stats: [[m.additional.length, t('stat.subjects')]], cta: t('cta.view'), art: blobArt() },
    { href: 'about.html', title: t('nav.about'), text: t('home.deck.about'), stats: [], cta: t('cta.about'), art: `<img src="${esc(site.person.portrait)}" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%">` },
  );
  $('#stack').innerHTML = cards.map((c, i) => `
    <div class="stack__item">
      <article class="deck-card ${c.color ? 'deck-card--color grain' : ''}" style="${c.color ? `--c:${c.color}` : ''}">
        <div class="deck-card__body">
          <span class="deck-card__index">${String(i + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}${c.sub ? ` · ${esc(c.sub)}` : ''}</span>
          <div style="display:grid;gap:16px"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>
          ${c.stats.length ? `<div class="deck-card__stats">${c.stats.map(([n, l]) => `<div><b>${n}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
          <a class="btn" href="${c.href}" ${c.tx ? `data-tx="${c.tx}" data-tx-label="${esc(c.title)}"` : ''}>${esc(c.cta)}${icon('arrowRight')}</a>
        </div>
        <div class="deck-card__art">${c.art}</div>
        <div class="deck-card__shade"></div>
      </article>
    </div>`).join('');
  initStack($('#stack'));
}

function renderStats() {
  const s = totalStats(m);
  $('#stats').innerHTML = [[s.docs, 'home.stats.docs'], [s.weeks, 'home.stats.weeks'], [s.exams, 'home.stats.exams'], [s.courses, 'home.stats.courses']]
    .map(([n, k], i) => `<div class="stat" data-reveal style="--d:${i * 0.08}s"><b data-count="${n}">0</b><span>${esc(t(k))}</span></div>`).join('');
}

function renderMarquee() {
  const words = m.courses.flatMap((c) => c.weeks.map((w) => pick(w, 'topic').split('|')[0].trim())).filter((w) => w.length < 28);
  const pickN = [...new Set(words)].slice(0, 16);
  $('#marquee').innerHTML = [...pickN, ...pickN].map((w) => `<span>${esc(w)}</span>`).join('');
}

function renderAll(first) {
  renderStatus(); renderQuick(); renderDeck(); renderStats(); renderMarquee();
  if (first) observeReveals();
  else document.querySelectorAll('[data-reveal], [data-count]').forEach((el) => { el.classList.add('is-in'); if (el.dataset.count) el.textContent = el.dataset.count; });
}
renderAll(true);
onLangChange(() => renderAll(false));
