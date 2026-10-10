// Loads data/materials.json + data/site.json and offers small helpers around them.
import { pick, t, getLang } from './i18n.js';

let cache;
export function loadData() {
  if (!cache) {
    cache = Promise.all([
      fetch('data/materials.json').then((r) => r.json()),
      fetch('data/site.json').then((r) => r.json()),
    ]).then(([materials, site]) => {
      materials.courses.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      return { materials, site };
    });
  }
  return cache;
}

export const courseUrl = (c) => `${c.id}.html`;
/** Color family of a course: 'analysis' | 'informatik' | 'home' (fallback for future courses). */
export const themeOf = (c) => (['analysis', 'informatik'].includes(c?.theme) ? c.theme : 'home');
export const courseTitle = (c) => pick(c, 'title');
export const semester = (c) => pick(c, 'semester');

/** Filter groups for the week toolbar. */
export function kindGroup(kind) {
  if (kind.startsWith('notes')) return 'notes';
  if (kind.startsWith('slides')) return 'slides';
  if (kind === 'exercise' || kind === 'solution' || kind === 'notebook') return kind;
  return 'extra';
}

export const KIND_ICON = {
  'notes-blank': 'pencil', 'notes-full': 'notes', 'notes-clean': 'sparkle', notes: 'notes',
  exercise: 'file', solution: 'check', slides: 'slides', 'slides-blank': 'slides', 'slides-annotated': 'pencil',
  notebook: 'notebook', guide: 'book', extra: 'sparkle', script: 'book', summary: 'layers', exam: 'file',
};

export const fileLabel = (f) => pick(f, 'label');
export const isPdf = (path) => /\.pdf$/i.test(path);

/** Week number (1-based) relative to a start date, or null if outside 1..weeks. */
export function weekOf(startISO, weeks = 14, now = new Date()) {
  if (!startISO) return null;
  const start = new Date(`${startISO}T00:00:00`);
  const diff = Math.floor((now - start) / 86400000);
  if (diff < 0) return { state: 'upcoming', start };
  const w = Math.floor(diff / 7) + 1;
  return w > weeks ? { state: 'done' } : { state: 'active', week: w };
}

export function formatDate(d) {
  return d.toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function courseStats(c) {
  const weekFiles = c.weeks.reduce((n, w) => n + w.files.length, 0);
  return {
    weeks: c.weeks.length,
    files: weekFiles + c.resources.length + c.exams.reduce((n, e) => n + !!e.exam + !!e.solution, 0),
    ownFiles: weekFiles,
    exams: c.exams.length,
    summaries: c.resources.length,
  };
}

export function totalStats(m) {
  let docs = 0, weeks = 0, exams = 0;
  m.courses.forEach((c) => { const s = courseStats(c); docs += s.files; weeks += s.weeks; exams += s.exams; });
  m.additional.forEach((a) => { docs += a.files.length; });
  return { docs, weeks, exams, courses: m.courses.length };
}

export function examSeason(e) {
  if (e.id.startsWith('mock')) return 'mock';
  return e.id.includes('winter') ? 'winter' : 'summer';
}
export const examYear = (e) => e.id.match(/\d{4}/)?.[0] ?? '';

/** Build a flat list of everything searchable. */
export function searchIndex(m) {
  const items = [];
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  m.courses.forEach((c) => {
    const ct = courseTitle(c);
    items.push({ group: 'pages', title: ct, sub: `${semester(c)} · ${pick(c.tagline)}`, href: courseUrl(c), icon: c.motif === 'code' ? 'code' : 'wave', theme: c.theme });
    c.weeks.forEach((w) => {
      const topic = pick(w, 'topic');
      items.push({ group: 'weeks', title: `${t('course.week', { w: w.week })}: ${topic}`, sub: ct, href: `${courseUrl(c)}#week-${w.week}`, icon: 'calendar', theme: c.theme, extra: `${w.topic} ${w.topic_en} woche week ${w.week}` });
      w.files.forEach((f) => items.push({ group: 'files', title: fileLabel(f), sub: `${ct} · ${t('course.week', { w: w.week })} · ${topic}`, file: f, kind: f.kind, icon: KIND_ICON[f.kind], extra: `${f.label} ${f.label_en} ${w.topic} ${w.topic_en} ${t('kind.' + f.kind)} woche week ${w.week}` }));
    });
    c.resources.forEach((f) => items.push({ group: 'files', title: fileLabel(f), sub: `${ct} · ${t('kind.' + f.kind)}`, file: f, kind: f.kind, icon: KIND_ICON[f.kind], extra: `${f.label} ${f.label_en} ${t('kind.' + f.kind)}` }));
    c.exams.forEach((e) => {
      const label = `${ct} ${pick(e, 'label')}`;
      if (e.exam) items.push({ group: 'exams', title: `${t('kind.exam')} ${pick(e, 'label')}`, sub: ct, file: { path: e.exam, label, kind: 'exam' }, kind: 'exam', icon: 'file', extra: `${e.label} ${e.label_en} prüfung exam` });
      if (e.solution) items.push({ group: 'exams', title: `${t('exams.solution')} ${pick(e, 'label')}`, sub: ct, file: { path: e.solution, label: `${label} – ${t('exams.solution')}`, kind: 'solution' }, kind: 'solution', icon: 'check', extra: `${e.label} ${e.label_en} lösung solution` });
    });
  });
  m.additional.forEach((a) => a.files.forEach((f) => items.push({ group: 'files', title: `${pick(a, 'subject')}: ${fileLabel(f)}`, sub: a.author, file: f, kind: f.kind, icon: KIND_ICON[f.kind], extra: `${a.subject} ${a.subject_en} ${f.label} ${f.label_en}` })));
  [['index.html', 'nav.home', 'sparkle'], ['exams.html', 'nav.exams', 'archive'], ['additional.html', 'nav.additional', 'layers'], ['about.html', 'nav.about', 'users']]
    .forEach(([href, key, ic]) => items.push({ group: 'pages', title: t(key), sub: '', href, icon: ic, extra: `${key}` }));
  items.forEach((it) => { it.hay = norm(`${it.title} ${it.sub} ${it.extra ?? ''}`); });
  return { items, norm };
}
