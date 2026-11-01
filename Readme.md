<div align="center">

# Uman Khalid: Academic Website

### Research Professor, Kyung Hee University, Korea

Quantum sensing · Quantum communication & networking · Quantum semantic communication · Quantum-enhanced AI for 6G

[![Email](https://img.shields.io/badge/Email-umankhalid%40khu.ac.kr-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:umankhalid@khu.ac.kr)

</div>

---

## Overview

The source of my academic website. It presents my research, publications,
funded projects, academic appointments, awards, and professional service. The
site is a static single-page application: the markup lives in `index.html`, and
almost all content is read from JSON files under `data/`.

## Structure

```
|-- index.html              # Page markup, bio, research interests, education, activities, contact
|-- data/
|   |-- publications.json   # journals, conferences, korean_conferences, books_patents
|   |-- research.json       # Research tab: research themes and key contributions
|   |-- projects.json       # Funded research projects
|   |-- experience.json     # Academic appointments and visiting positions
|   |-- certificates.json   # Awards, scholarships, and professional certifications
|   |-- seminars.json       # Invited talks
|   |-- news.json           # News; the 4 latest are the home-page Highlights
|   |-- skills.json         # Expertise, grouped by category
|   |-- collaborations.json # Co-author network (Activities tab)
|   `-- scholar.json        # Google Scholar metrics and per-paper citations (written by the workflow)
|-- publications/index.html # Static publication list (generated, do not edit)
|-- llms.txt                # Plain-text site summary for AI assistants (generated)
|-- sitemap.xml             # Sitemap (lastmod values maintained by the generator)
|-- scripts/update-scholar.mjs
|-- scripts/build-seo-pages.mjs
|-- .github/workflows/update-scholar.yml
`-- assets/
    |-- css/styles.css
    |-- js/script.js
    |-- images/profile/     # Portrait
    |-- images/meta/        # Favicon
    `-- logos/organizations/
```

## Updating content

- **Publications** (`data/publications.json`): authors are written as in the CV
  (`"U. Khalid"` is highlighted automatically). Optional fields: `doi` (adds a
  DOI link), `impactFactor`, `status` (e.g. `"Early Access"`), `badges`, and
  `topics` (drives the topic filter).
- **Research tab** (`data/research.json`): each theme has a nav label, icon,
  overview paragraphs, and a list of key contributions.
- **News and highlights**: add entries to `data/news.json`. The four latest
  (by `date`, `"YYYY/MM"`) appear as Highlights cards on the home page and the
  rest are listed under News below them. A card links to the tab for its
  `type` (Publication, Patent, Award, Talk, Recognition, PhD); set `link`
  (`"#activities"` or a URL) and `linkLabel` to override.
- **Co-author network** (`data/collaborations.json`): `papers` counts are
  derived from `publications.json`. Affiliations are only filled in where the
  CV states them; add `university` and `country` to other co-authors to enrich
  the Organizations and Countries views.

### Profile photo

The portrait is `assets/images/profile/umankhalid_profile.jpg`. To change it,
replace that file (or point the `src` of `#profileMain` in `index.html` at a
new one). The crop is set by `.profile-image.main` in `styles.css`.

### Profile links

The floating link bar (`.social-floating` in `index.html`) links to Google
Scholar, ORCID, ResearchGate, LinkedIn, the Communications and Quantum
Information Laboratory, and email. A GitHub or Scopus link can be added with
the already-styled `social-icon github` / `social-icon scopus` classes.

### Google Scholar metrics

The citation card under the name on the home page reads `data/scholar.json`.
The `Update Google Scholar metrics` workflow refreshes it from profile
`CyVQHYEAAAAJ` every five hours and commits only when a number changes.
Besides the profile totals, the file lists every paper on the profile with its
citation count; each publication on the Publications tab whose title matches
one (ignoring case and punctuation) shows a Google Scholar badge with that
count, linking to its "Cited by" list. Patents and anything Scholar does not
list get no badge. It needs
**Settings → Actions → General → Workflow permissions → Read and write** so it
can push. The profile id is set in `.github/workflows/update-scholar.yml`
(`--id`).

### Search engines and sharing

The main page draws its sections with JavaScript, which Google runs but many
other crawlers (Bing, link previews, AI search tools) do not. So
`scripts/build-seo-pages.mjs` also writes the content out as plain files:
`publications/index.html` (every paper with authors, venue, DOI, Google Scholar
citations, and schema.org structured data), `llms.txt`, and `sitemap.xml`. The
workflow above runs it after each citation refresh and whenever
`data/publications.json` is pushed, so these never need editing by hand. To
rebuild locally: `node scripts/build-seo-pages.mjs`.

Link previews (LinkedIn, X, Slack) use `assets/images/meta/og-image.jpg`
(1200 x 630).

### Date-stamping hook

```bash
git config core.hooksPath .githooks
```

On each commit the hook stamps today's date into the footer, the JSON-LD
`dateModified`, and `sitemap.xml`.

## Credits and license

Site template by Saddiq Ur Rehman, used under the MIT License (see
[LICENSE](LICENSE)). Content © Uman Khalid.
