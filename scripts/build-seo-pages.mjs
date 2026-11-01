#!/usr/bin/env node
/**
 * Build the static, crawlable companions of the single-page site from the
 * data files:
 *
 *   publications/index.html  every paper as plain HTML (titles, authors,
 *                            venues, DOIs, Google Scholar citations) plus
 *                            schema.org structured data
 *   llms.txt                 a plain-text summary for AI assistants
 *   sitemap.xml              both pages, each with its own lastmod
 *
 * The main page renders its sections with JavaScript, which Google runs but
 * many other crawlers (Bing, link previews, AI search) do not. These files
 * put the same content in front of them as ordinary HTML and text.
 *
 * Output is deterministic: a file is rewritten only when its content changes,
 * and a sitemap lastmod moves only when that page changed. Run by
 * .github/workflows/update-scholar.yml after the citation refresh.
 *
 * Usage: node scripts/build-seo-pages.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://umankhalid.github.io/';
const PUBLICATIONS_URL = `${SITE}publications/`;
const PERSON_ID = `${SITE}#person`;
const SELF = 'U. Khalid';
const SELF_FULL = 'Uman Khalid';
const PROFILE_IMAGE = `${SITE}assets/images/profile/umankhalid_profile.jpg`;
const SHARE_IMAGE = `${SITE}assets/images/meta/og-image.jpg`;

const PROFILES = [
    ['Google Scholar', 'https://scholar.google.com/citations?user=CyVQHYEAAAAJ'],
    ['ORCID', 'https://orcid.org/0000-0002-9089-1139'],
    ['ResearchGate', 'https://www.researchgate.net/profile/Uman-Khalid-3'],
    ['LinkedIn', 'https://www.linkedin.com/in/uman-khalid-552b70b4/'],
    ['Communications and Quantum Information Laboratory', 'https://cqilab.khu.ac.kr/people/']
];

const SECTIONS = [
    { key: 'journals', id: 'journals', title: 'International Journal Papers' },
    { key: 'conferences', id: 'conferences', title: 'International Conference Papers' },
    { key: 'korean_conferences', id: 'korean-conferences', title: 'Korean Conference Papers' },
    { key: 'books_patents', id: 'books-patents', title: 'Book Chapters and Patents' }
];

const today = () => new Date().toISOString().slice(0, 10);
const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n');

async function readJson(path) {
    return JSON.parse(await readFile(join(ROOT, path), 'utf8'));
}

async function readText(path) {
    try {
        return normalizeNewlines(await readFile(join(ROOT, path), 'utf8'));
    } catch {
        return null;
    }
}

/** Write only when the content differs; returns whether it changed. */
async function writeIfChanged(path, content) {
    const current = await readText(path);
    if (current === content) return false;
    await mkdir(dirname(join(ROOT, path)), { recursive: true });
    await writeFile(join(ROOT, path), content, 'utf8');
    return true;
}

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const isSelf = (author) => author.includes(SELF);

// ---------------------------------------------------------------------------
// Google Scholar citations (same matching as assets/js/script.js)
// ---------------------------------------------------------------------------

const titleKey = (title) =>
    String(title || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]/g, '');

function scholarCitations(scholar, title) {
    const key = titleKey(title);
    const papers = Array.isArray(scholar.papers) ? scholar.papers : [];
    const matches = papers.filter((paper) => {
        const paperKey = titleKey(paper.title);
        return paperKey === key || (key.length >= 30 && paperKey.startsWith(key));
    });
    if (!key || matches.length === 0) return null;
    const best = matches.reduce((a, b) => ((b.citations || 0) > (a.citations || 0) ? b : a));
    return {
        citations: matches.reduce((sum, paper) => sum + (Number(paper.citations) || 0), 0),
        url: best.url
    };
}

// ---------------------------------------------------------------------------
// Publication fields
// ---------------------------------------------------------------------------

function venueLine(pub) {
    if (pub.conference) {
        return [pub.conference, pub.location, pub.date].filter(Boolean).join(', ');
    }
    return [pub.journal, pub.volume, pub.pages].filter(Boolean).join(', ');
}

const doiOf = (pub) => (pub.doi && pub.doi !== '#' ? pub.doi : '');
const bareDoi = (url) => url.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');

// ---------------------------------------------------------------------------
// publications/index.html
// ---------------------------------------------------------------------------

function renderItem(pub, scholar) {
    const doi = doiOf(pub);
    const cited = scholarCitations(scholar, pub.title);
    const title = doi
        ? `<a href="${escapeHtml(doi)}" rel="noopener">${escapeHtml(pub.title)}</a>`
        : escapeHtml(pub.title);
    const authors = (pub.authors || [])
        .map((author) => (isSelf(author) ? `<strong>${escapeHtml(author)}</strong>` : escapeHtml(author)))
        .join(', ');

    const chips = [];
    if (pub.type) chips.push(`<span class="chip">${escapeHtml(pub.type)}</span>`);
    if (pub.impactFactor) chips.push(`<span class="chip chip-if">IF ${escapeHtml(pub.impactFactor)}</span>`);
    if (cited) {
        chips.push(
            `<a class="chip chip-scholar" href="${escapeHtml(cited.url)}" rel="noopener">Cited by ${cited.citations} on Google Scholar</a>`
        );
    }
    if (doi) chips.push(`<a class="chip chip-doi" href="${escapeHtml(doi)}" rel="noopener">DOI ${escapeHtml(bareDoi(doi))}</a>`);
    if (pub.status) chips.push(`<span class="chip">${escapeHtml(pub.status)}</span>`);
    (pub.badges || []).forEach((badge) => chips.push(`<span class="chip chip-award">${escapeHtml(badge)}</span>`));

    return `        <li>
          <article>
            <h3>${title}</h3>
            <p class="authors">${authors}</p>
            <p class="venue">${escapeHtml(venueLine(pub))} (${escapeHtml(pub.year)})</p>
            ${chips.length ? `<p class="chips">${chips.join(' ')}</p>` : ''}
          </article>
        </li>`;
}

/** schema.org node for one paper; patents have no fitting type and are left out. */
function structuredItem(pub) {
    if (pub.type && /patent/i.test(pub.type)) return null;

    const doi = doiOf(pub);
    const isChapter = pub.type && /chapter/i.test(pub.type);
    const node = {
        '@type': isChapter ? 'Chapter' : 'ScholarlyArticle',
        headline: pub.title,
        name: pub.title,
        datePublished: String(pub.year),
        author: (pub.authors || []).map((author) =>
            isSelf(author) ? { '@id': PERSON_ID } : { '@type': 'Person', name: author }
        ),
        isPartOf: isChapter
            ? { '@type': 'Book', name: pub.journal }
            : pub.conference
              ? { '@type': 'CreativeWork', name: pub.conference }
              : { '@type': 'Periodical', name: pub.journal }
    };
    if (pub.topics && pub.topics.length) node.keywords = pub.topics.join(', ');
    if (doi) {
        node.url = doi;
        node.sameAs = doi;
        node.identifier = { '@type': 'PropertyValue', propertyID: 'DOI', value: bareDoi(doi) };
    }
    return node;
}

function renderPublicationsPage(publications, scholar) {
    const sections = SECTIONS.map((section) => ({ ...section, items: publications[section.key] || [] })).filter(
        (section) => section.items.length
    );
    const counts = Object.fromEntries(sections.map((section) => [section.key, section.items.length]));
    const total = sections.reduce((sum, section) => sum + section.items.length, 0);
    const patents = (publications.books_patents || []).filter((pub) => /patent/i.test(pub.type || '')).length;

    const description =
        `Complete list of ${total} publications by Dr. Uman Khalid (Kyung Hee University): ` +
        `${counts.journals || 0} journal papers, ${counts.conferences || 0} international conference papers, ` +
        `${counts.korean_conferences || 0} Korean conference papers, and ${patents} patents on quantum sensing, ` +
        'quantum networking, quantum machine learning, and quantum optimization, with Google Scholar citations.';

    const items = sections
        .flatMap((section) => section.items)
        .map(structuredItem)
        .filter(Boolean);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': `${PUBLICATIONS_URL}#page`,
                url: PUBLICATIONS_URL,
                name: 'Publications - Uman Khalid',
                description,
                inLanguage: 'en',
                isPartOf: { '@id': `${SITE}#website` },
                about: { '@id': PERSON_ID },
                mainEntity: { '@id': `${PUBLICATIONS_URL}#list` },
                ...(scholar.updated ? { dateModified: scholar.updated } : {})
            },
            {
                '@type': 'Person',
                '@id': PERSON_ID,
                name: SELF_FULL,
                url: SITE,
                image: PROFILE_IMAGE,
                jobTitle: 'Research Professor',
                worksFor: { '@type': 'CollegeOrUniversity', name: 'Kyung Hee University', url: 'https://www.khu.ac.kr/' },
                sameAs: PROFILES.map(([, url]) => url)
            },
            {
                '@type': 'ItemList',
                '@id': `${PUBLICATIONS_URL}#list`,
                name: 'Publications by Uman Khalid',
                numberOfItems: items.length,
                itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, item }))
            }
        ]
    };

    const scholarLine = Number.isInteger(scholar.citations)
        ? `<p class="metrics"><a href="${escapeHtml(scholar.profileUrl)}" rel="me noopener">Google Scholar</a>:
        ${scholar.citations.toLocaleString('en-US')} citations &middot; h-index ${scholar.hIndex} &middot; i10-index ${scholar.i10Index}${
            scholar.updated ? ` <span class="muted">(updated ${escapeHtml(scholar.updated)})</span>` : ''
        }</p>`
        : '';

    const toc = sections
        .map((section) => `<li><a href="#${section.id}">${section.title}</a> (${section.items.length})</li>`)
        .join('\n          ');

    const body = sections
        .map(
            (section) => `    <section id="${section.id}">
      <h2>${section.title} <span class="count">${section.items.length}</span></h2>
      <ol reversed>
${section.items.map((pub) => renderItem(pub, scholar)).join('\n')}
      </ol>
    </section>`
        )
        .join('\n\n');

    return `<!doctype html>
<!-- Generated by scripts/build-seo-pages.mjs from data/publications.json and data/scholar.json. Do not edit by hand. -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Publications - Dr. Uman Khalid | Kyung Hee University</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="author" content="Uman Khalid" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta name="theme-color" content="#245f87" />
  <link rel="canonical" href="${PUBLICATIONS_URL}" />
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/images/meta/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/images/meta/apple-touch-icon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Uman Khalid" />
  <meta property="og:title" content="Publications - Dr. Uman Khalid" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${PUBLICATIONS_URL}" />
  <meta property="og:image" content="${SHARE_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Dr. Uman Khalid, Research Professor, Kyung Hee University" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Publications - Dr. Uman Khalid" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${SHARE_IMAGE}" />
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).replace(/<\//g, '<\\/')}
  </script>
  <style>
    :root {
      --ink: #15222d; --body: #465563; --muted: #6b7a88; --link: #245f87;
      --bg: #f5f7f8; --card: #ffffff; --line: #dce3e8; --chip: #edf1f4;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #e8eef3; --body: #b9c5cf; --muted: #8d9aa6; --link: #8dbcdc;
        --bg: #0f1820; --card: #16222c; --line: #2a3a47; --chip: #1d2c38;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--bg); color: var(--body);
      font: 16px/1.6 Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    main, header, footer { max-width: 920px; margin: 0 auto; padding: 0 16px; }
    header { padding-top: 40px; }
    h1, h2, h3 { color: var(--ink); font-family: "Source Serif 4", Georgia, serif; line-height: 1.3; }
    h1 { font-size: 2rem; margin: 0 0 4px; }
    h2 { font-size: 1.45rem; margin: 40px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
    h3 { font-size: 1.08rem; margin: 0 0 4px; }
    a { color: var(--link); }
    h3 a { color: var(--ink); text-decoration: none; }
    h3 a:hover { color: var(--link); text-decoration: underline; }
    nav a { margin-right: 14px; }
    .role { margin: 0 0 12px; }
    .muted, .count { color: var(--muted); font-size: 0.9em; font-weight: 400; }
    .toc { margin: 8px 0 0; padding-left: 20px; }
    ol { padding-left: 28px; }
    li { margin-bottom: 14px; }
    li::marker { color: var(--muted); font-size: 0.9em; }
    article { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
    article p { margin: 2px 0; }
    .authors strong { color: var(--ink); }
    .venue { font-style: italic; }
    .chips { margin-top: 8px !important; display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      font-size: 0.78rem; font-weight: 600; padding: 2px 8px; border-radius: 6px;
      background: var(--chip); border: 1px solid var(--line); color: var(--body); text-decoration: none;
    }
    a.chip:hover { border-color: var(--link); }
    .chip-if, .chip-scholar { color: var(--link); }
    footer { padding: 32px 16px 48px; color: var(--muted); font-size: 0.9rem; }
  </style>
</head>
<body>
  <header>
    <nav aria-label="Site">
      <a href="../">Home</a>
      <a href="../#research">Research</a>
      <a href="../#experience">Experience</a>
      <a href="../#contact">Contact</a>
    </nav>
    <h1>Publications of Dr. Uman Khalid</h1>
    <p class="role">Research Professor, Institute for Communications and Quantum Nexus and Communications and Quantum Information Laboratory, Kyung Hee University, Korea</p>
    ${scholarLine}
    <ol class="toc">
          ${toc}
    </ol>
  </header>

  <main>
${body}
  </main>

  <footer>
    <p>Profiles: ${PROFILES.map(([name, url]) => `<a href="${url}" rel="me noopener">${name}</a>`).join(' &middot; ')}</p>
    <p>An interactive version with filters is on the <a href="../#publications">main site</a>.</p>
  </footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// llms.txt
// ---------------------------------------------------------------------------

function renderLlmsTxt(publications, scholar, seminars) {
    const line = (pub) => {
        const doi = doiOf(pub);
        const cited = scholarCitations(scholar, pub.title);
        const bits = [venueLine(pub), String(pub.year)];
        if (cited && cited.citations) bits.push(`cited by ${cited.citations}`);
        return `- ${doi ? `[${pub.title}](${doi})` : pub.title}: ${(pub.authors || []).join(', ')}. ${bits.join(', ')}.`;
    };
    const patents = (publications.books_patents || []).filter((pub) => /patent/i.test(pub.type || ''));
    const books = (publications.books_patents || []).filter((pub) => !/patent/i.test(pub.type || ''));

    return `# Uman Khalid

> Dr. Uman Khalid is a Research Professor at Kyung Hee University, Korea (Institute for Communications and Quantum Nexus; Communications and Quantum Information Laboratory), and a Series Editor of the IEEE Journal on Selected Areas in Communications Quantum Series on Quantum Communications and Networking. Research areas: quantum information science, including quantum sensing and metrology, quantum communication and networking, quantum machine learning, variational quantum algorithms and quantum optimization, and neutral-atom and Rydberg platforms.

Ph.D., Electronics and Information Convergence Engineering, Kyung Hee University (2023), advised by Prof. Hyundong Shin. B.E., Electronics Engineering, Ghulam Ishaq Khan Institute of Engineering and Technology, Pakistan (2015).
${Number.isInteger(scholar.citations) ? `\nGoogle Scholar${scholar.updated ? ` (${scholar.updated})` : ''}: ${scholar.citations} citations, h-index ${scholar.hIndex}, i10-index ${scholar.i10Index}.\n` : ''}
## Pages

- [Home](${SITE}): biography, research interests, and recent news
- [Publications](${PUBLICATIONS_URL}): complete publication list with DOIs and Google Scholar citations
- [Research](${SITE}#research): research themes and key contributions
- [Contact](${SITE}#contact): Electronics and Information Building, Global Campus, Kyung Hee University, Yongin-si 17104, Korea; umankhalid@khu.ac.kr

## Profiles

${PROFILES.map(([name, url]) => `- [${name}](${url})`).join('\n')}

## Journal papers

${(publications.journals || []).map(line).join('\n')}

## International conference papers

${(publications.conferences || []).map(line).join('\n')}
${books.length ? `\n## Book chapters\n\n${books.map(line).join('\n')}\n` : ''}${patents.length ? `\n## Patents\n\n${patents.map((pub) => `- ${pub.title}: ${(pub.authors || []).join(', ')}. ${[pub.journal, pub.volume].filter(Boolean).join(', ')}.`).join('\n')}\n` : ''}${seminars.length ? `\n## Invited talks\n\n${seminars.map((talk) => `- ${talk.title}: ${talk.type}, ${talk.organizer}, ${talk.location}, ${talk.date}.`).join('\n')}\n` : ''}`;
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

function existingLastmods(sitemap) {
    const map = {};
    for (const [, loc, lastmod] of (sitemap || '').matchAll(
        /<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g
    )) {
        map[loc] = lastmod;
    }
    return map;
}

function renderSitemap(lastmods) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  The main site is a single page whose sections are #fragments, which search
  engines treat as the same URL; the publication list also has its own static
  page. scripts/build-seo-pages.mjs maintains this file and moves a lastmod
  only when that page changes.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <url>
        <loc>${SITE}</loc>
        <lastmod>${lastmods[SITE]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
        <image:image>
            <image:loc>${PROFILE_IMAGE}</image:loc>
        </image:image>
    </url>
    <url>
        <loc>${PUBLICATIONS_URL}</loc>
        <lastmod>${lastmods[PUBLICATIONS_URL]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>
`;
}

// ---------------------------------------------------------------------------

async function main() {
    const publications = await readJson('data/publications.json');
    const scholar = await readJson('data/scholar.json').catch(() => ({}));
    const seminars = (await readJson('data/seminars.json').catch(() => ({}))).seminars || [];

    const pageChanged = await writeIfChanged('publications/index.html', renderPublicationsPage(publications, scholar));
    const llmsChanged = await writeIfChanged('llms.txt', renderLlmsTxt(publications, scholar, seminars));

    const lastmods = existingLastmods(await readText('sitemap.xml'));
    lastmods[SITE] = lastmods[SITE] || today();
    if (pageChanged || !lastmods[PUBLICATIONS_URL]) lastmods[PUBLICATIONS_URL] = today();
    const sitemapChanged = await writeIfChanged('sitemap.xml', renderSitemap(lastmods));

    const changed = [
        pageChanged && 'publications/index.html',
        llmsChanged && 'llms.txt',
        sitemapChanged && 'sitemap.xml'
    ].filter(Boolean);
    console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'SEO pages already up to date.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
