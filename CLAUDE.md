# Teaching Assistant Page — Quentin Türler

Personal website for my ETH Zürich teaching-assistant work (D-MAVT). Students use it to find the
materials for my exercise sessions: weekly notes, exercise sheets, solutions, summaries and old exams.
It is also linked on my CV, so recruiters see it too: it should look polished and professional.
It replaces my old site (`C:\Users\quent\Documents\Code\n.ETHZ.ch Homepage`, which is no longer online).

## Status

- 2026-10-10: first version built (all pages, interactions, both themes, DE/EN). Tested headless at 360, 390,
  820 (iPad portrait), 1180 (iPad landscape) and 1440 px: no JS errors and no horizontal overflow.
- Not yet committed or pushed. The planned URL is `https://quentincoded.github.io/teaching/` (repo `quentincoded/teaching`).
- `BUILD-BRIEF.md` holds my answers about content, style and features. **Read it before bigger changes.**
  It is **gitignored on purpose** (personal answers). Never commit or publish it, and don't copy private details from it into public files unless I ask.

## Hard rules

- **Do not copy or imitate the old site's design** (HTML5 UP "Arcana" template). It felt too boxy and lacked good UX.
  The vibe is **liquid and technical**, with plenty of animation (4 out of 5).
- **Host on GitHub Pages**:
  - Static files only. No server code, no database, no secrets.
  - Use **relative URLs** everywhere (`sources/...`, `data/...`), never root-absolute. The only exception is `404.html`,
    which has `<base href="/teaching/">` because Pages serves it for nested missing paths. Update it if the repo name changes.
  - Keep `.nojekyll`.
  - Git rejects files over **100 MB**, and GitHub warns at 50 MB. Keep the site under 1 GB (currently about 290 MB).
  - File names are case-sensitive on Pages, though not on Windows.
- **No build step, no framework.** Plain HTML + CSS + vanilla ES modules. Don't add a bundler unless I ask.
- Commit and push only when I ask. Never force-push.

## Architecture

```
index.html            landing: liquid background, quick access to courses (unfold transition), stacked deck, stats
analysis3.html        course shells: <body data-page="analysis" data-course="analysis3">; everything is rendered
informatik2.html        by assets/js/pages/course.js from data/materials.json
exams.html            past exams: tabs per course, season filter, grouped by year
additional.html       other subjects + AMIV link
about.html            bio, portrait, teaching history, contact, feedback
404.html              uses <base href="/teaching/">
data/materials.json   ALL files, weeks, topics, links, course metadata (single source of truth)
data/site.json        live info: announcement, next session, current semester, bio, contact, feedback URL, analytics
assets/css/main.css   all styles; color tokens on :root, [data-theme="dark"], page accents via body[data-page]
assets/js/
  core.js             shared: header/footer, theme + language toggles, unfold page transitions, search (Ctrl/⌘K, "/"),
                      PDF viewer, announcement, scroll reveals, word-split headlines, stacking deck, analytics
  i18n.js             ALL UI strings (de + en), t(), pick(), applyI18n(); data-i18n / data-i18n-html / data-i18n-attr
  data.js             loads JSON, helpers (week-of-semester, stats, search index, kind → icon/group)
  icons.js            inline SVG icon set
  bg/liquid.js        landing/other pages: low-res canvas blobs that follow the pointer
  bg/fourier.js       Analysis: live Fourier synthesis; scrolling adds harmonics and morphs square → saw → triangle
  bg/code.js          Informatik: falling code/bits + self-typing terminal commands; scrolling speeds it up
  demos/              fourier-demo.js (epicycles, terms slider), sort-demo.js (bubble/insertion/merge/quick)
  pages/              one module per page
sources/              all PDFs/notebooks (see below)
images/portrait.jpg   1000 px web version; full-size original is in images/originals/ (gitignored)
```

The `<head>` of every page has the same inline boot script. It sets `data-theme`, `lang` and the `js` class
before the first paint and flags an incoming unfold transition. **If you change it, change it in all seven HTML files.**

### Key behaviors
- **Unfold transition**: an internal `.html` link with `data-tx="analysis|informatik|home"` triggers it. Quick-access cards also have
  `data-tx-expand`: the card grows to full screen and shows `data-tx-label`. The next page then folds open in vertical strips.
  It's stored in `sessionStorage` and expires after 8 s. It respects `prefers-reduced-motion` and the back/forward cache.
- **Theme**: system → light → dark cycle, saved in `localStorage.theme`, with a circular View Transition reveal.
  `--s-*` tokens are solid surfaces behind white text and are the same in both themes for contrast. `--c-*` tokens are
  theme-aware accents.
- **Language**: `localStorage.lang`. The default is German; English if the browser is English. Switching re-renders in place with a crossfade.
- **"This week"**: a course's `semesterStart` + 14 weeks decides whether a week is highlighted and auto-opened.
  Past courses show "Course finished".
- **PDF preview**: in a modal iframe on desktop. On touch devices it opens the PDF in a new tab. `.ipynb` gets an "Open in Colab"
  link (uses `site.json → repo`, so it works only once the repo is public).
- **Search**: indexes courses, weeks, files, exams and pages in both languages, with diacritics ignored.

## Content

### Single source of truth: `data/materials.json`
```
courses[]: { id, title, title_en, semester, semester_en, order, theme, motif, semesterStart,
             tagline{de,en}, description{de,en}, sessions[], links[], resources[], weeks[], exams[], examCollection? }
  sessions[]: { type: "exercise"|"studycenter", de, en, room }
  links[]:    { label, label_en, url, note? }
  resources[] / weeks[].files[]: { label, label_en, kind, path }
  weeks[]:    { week, topic, topic_en, files[], links[] }
  exams[]:    { id ("2019-winter", "mock-2024"), label, label_en, exam|null, solution|null }
additional[]: { subject, subject_en, author, files[] }
```
- `theme`: `analysis` (red-orange), `informatik` (blue-purple). Anything else falls back to the landing's dark blue.
- `motif`: `fourier` → Fourier background + Fourier demo, `code` → code-rain background + sorting demo, anything else → no background or demo.
- `kind`: `notes-blank`, `notes-full`, `notes-clean`, `notes`, `exercise`, `solution`, `slides`, `slides-blank`,
  `slides-annotated`, `notebook`, `guide`, `extra`, `script`, `summary`.

**Adding a file**: put it under `sources/<course>/...` with a lowercase, hyphenated, ASCII-only name
(`week05-notes-full.pdf`, `2025-winter-solution.pdf`), then add an entry with `label` + `label_en`.

**Adding a new course** (the site must support future subjects):
1. Add a `courses[]` entry (unique `id`, `order`, `theme`, `motif`, `semesterStart`, texts in both languages).
2. Copy `analysis3.html` to `<id>.html` and change `data-course` and `data-page`. `data-page="analysis"`/`"informatik"`
   selects the accent colors; for a new color, add a `body[data-page="…"]` block plus `--c-…`/`--s-…` tokens in `main.css`
   and extend `themeOf()` in `data.js`.
3. Nav, landing cards, deck, search, exams tabs and the about page pick it up automatically.

### Editing live info: `data/site.json` (can be edited directly on github.com)
- **Announcement banner**: `announcement.enabled` true/false; `de`/`en` text; optional `link` (`href` can be `#search`);
  `tone`: `info` or `warning` (yellow). **Change `id` for every new message**, because visitors who dismissed the old one would otherwise not see it.
  It's a pill under the header on desktop and a bottom toast on phones.
- **Next exercise session** (landing page status pill): `nextSession: null` shows "No upcoming exercise classes".
  Otherwise use `{ "de": "Mi 16–18 Uhr", "en": "Wed 4–6 pm", "room": "ML E12" }`.
- `currentSemester.start` drives "HS 2026 · Semesterwoche N" on the landing page.
- `feedbackUrl`: empty means a mailto link is used. Put a Google/Microsoft Forms link here for anonymous feedback.
- `analytics.goatcounter`: GoatCounter site code (privacy-friendly, no cookie banner needed). Or `analytics.ga4`: a GA4 ID.
  Only loads on the live site, not on localhost.

### Facts
- Analysis III (HS 2024): exercise class Mittwoch 16–18 ML E12, study center Donnerstag 18–20 HG F7.
- Informatik II (FS 2025): exercise class Mittwoch 16–18 IFW C33, study center Donnerstag 18:15–20:00 ML D28 (from week 3).
- I'm not a TA this semester (HS 2026, started 2026-09-14), so `nextSession` is `null`.
- Bio: first-semester MSc Mechanical Engineering at ETH, focus robotics.
- Summaries by other students are published with their consent (they're also on other student portals).
- The chemistry notes PDF was rasterized at 200 dpi to get it from 102 MB down to 10.5 MB. The original is in the old folder.

## Local development

`fetch()` doesn't work over `file://`, so serve the folder:
```
python -m http.server 8000
```
Then open http://localhost:8000. Test at phone, iPad and laptop widths in both themes and both languages.
Chrome DevTools device mode is enough. Check for horizontal overflow.

## Deployment (when I ask)

1. Create the GitHub repo `quentincoded/teaching` (public, so Pages and Colab links work).
2. `git remote add origin https://github.com/quentincoded/teaching.git`, commit, then `git push -u origin main`.
3. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
4. Open https://quentincoded.github.io/teaching/ and check: PDF links (case-sensitive), the 404 page, Colab links.
