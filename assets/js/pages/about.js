import { initPage, esc, observeReveals, $ } from '../core.js';
import { icon } from '../icons.js';
import { t, pick, onLangChange } from '../i18n.js';
import { courseUrl, courseTitle, semester, courseStats, themeOf } from '../data.js';
import { liquid } from '../bg/liquid.js';

liquid(document.getElementById('bg'));
const { materials: m, site } = await initPage({ page: 'about' });

function render(first) {
  $('#bio').textContent = pick(site.person.bio);
  $('#role').textContent = pick(site.person.role);
  $('#portrait').src = site.person.portrait;

  $('#teaching').innerHTML = m.courses.map((c, i) => {
    const s = courseStats(c);
    return `
      <a class="teach" href="${courseUrl(c)}" data-tx="${c.theme}" data-tx-label="${esc(courseTitle(c))}" style="--c:var(--s-${themeOf(c)}); --d:${i * 0.1}s" data-reveal>
        <span class="teach__sem">${esc(semester(c))}</span>
        <h3>${esc(courseTitle(c))}</h3>
        <p>${esc(pick(c.tagline))} · ${esc(t('about.teaching.item', { weeks: s.weeks, files: s.ownFiles }))}</p>
        <span class="teach__go">${icon('arrowUpRight')}</span>
      </a>`;
  }).join('');

  const ct = site.contact;
  const items = [
    ['mail', t('contact.email'), ct.email, `mailto:${ct.email}`],
    ['linkedin', 'LinkedIn', 'Quentin Türler', ct.linkedin],
    ['github', 'GitHub', ct.github?.replace('https://github.com/', '@'), ct.github],
    ['youtube', 'YouTube', '@quentinsvisuals', ct.youtube],
    ['instagram', 'Instagram', '@q_.pictures', ct.instagram],
  ].filter((x) => x[3]);
  $('#contacts').innerHTML = items.map(([ic, name, sub, href], i) => `
    <a class="contact" href="${esc(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} data-reveal style="--d:${i * 0.06}s">
      ${icon(ic)}<div><b>${esc(name)}</b><span>${esc(sub || '')}</span></div>
    </a>`).join('');

  const fb = site.feedbackUrl || `mailto:${ct.email}?subject=${encodeURIComponent(t('about.feedback.subject'))}`;
  $('#feedback').innerHTML = `
    <span class="eyebrow" style="color:inherit">Feedback</span>
    <h3>${esc(t('about.feedback.title'))}</h3>
    <p>${esc(t('about.feedback.text'))}</p>
    <a class="btn" href="${esc(fb)}" ${fb.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${icon('message')}${esc(t('about.feedback.cta'))}</a>`;

  if (first) observeReveals();
  else document.querySelectorAll('main [data-reveal]').forEach((el) => el.classList.add('is-in'));
}
render(true);
onLangChange(() => render(false));
