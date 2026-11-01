#!/usr/bin/env node
/**
 * Refresh data/scholar.json from the public Google Scholar profile: the
 * profile-wide citations, h-index and i10-index, plus the citation count of
 * every paper listed on the profile.
 *
 * Run by .github/workflows/update-scholar.yml every 5 hours. Doing the scrape
 * here rather than in the browser means every visitor - incognito, a phone, a
 * first-time reader - is served the same numbers straight out of the repo,
 * instead of whatever happened to land in their own localStorage.
 *
 * The file is rewritten only when a number actually changes, so the workflow
 * pushes a commit at most once per real citation update.
 *
 * Usage: node scripts/update-scholar.mjs [--id <scholarId>]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_FILE = join(ROOT, 'data', 'scholar.json');

// Profile: Uman Khalid (CyVQHYEAAAAJ). The workflow passes it with --id; the
// SCHOLAR_ID environment variable and the default below cover local runs.
const idFlag = process.argv.indexOf('--id');
const SCHOLAR_ID =
    (idFlag !== -1 && process.argv[idFlag + 1]) || process.env.SCHOLAR_ID || 'CyVQHYEAAAAJ';
const SCHOLAR_ORIGIN = 'https://scholar.google.com';
const PROFILE_URL = `${SCHOLAR_ORIGIN}/citations?user=${SCHOLAR_ID}&hl=en`;

// Scholar lists at most 100 papers per page; later pages start at cstart.
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const pageUrl = (cstart) =>
    `${PROFILE_URL}&cstart=${cstart}&pagesize=${PAGE_SIZE}&sortby=pubdate`;

const FETCH_TIMEOUT_MS = 20000;
const ROUNDS = 3; // full passes over the source list before giving up
const ROUND_DELAY_MS = 15000;

/**
 * Where to read the profile from, in order of preference. Google frequently
 * answers datacentre IPs (which is what an Actions runner is) with a captcha
 * page, so the direct hit is backed by public read-only relays that fetch from
 * their own addresses.
 */
const SOURCES = [
    { name: 'scholar.google.com', url: (target) => target },
    {
        name: 'codetabs',
        url: (target) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(target)
    },
    {
        name: 'allorigins',
        url: (target) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target)
    },
    {
        name: 'corsproxy.io',
        url: (target) => 'https://corsproxy.io/?url=' + encodeURIComponent(target)
    },
    { name: 'cors.lol', url: (target) => 'https://api.cors.lol/?url=' + encodeURIComponent(target) }
];

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Decode the HTML entities Scholar uses in titles and links. */
function decodeEntities(text) {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}

const absoluteUrl = (href) => (href.startsWith('/') ? SCHOLAR_ORIGIN + href : href);

/**
 * Pull the three "All" figures out of the profile markup.
 * The stats table holds six cells in order: citations(all), citations(since),
 * h(all), h(since), i10(all), i10(since) - so the "All" column is 0, 2, 4.
 */
function parseMetrics(html) {
    if (!html || !html.includes('gsc_rsb_std')) return null;

    const cells = [...html.matchAll(/<td[^>]*class="[^"]*gsc_rsb_std[^"]*"[^>]*>([^<]*)<\/td>/gi)]
        .map((match) => parseInt(match[1].replace(/[^\d]/g, ''), 10))
        .filter((value) => Number.isInteger(value));

    if (cells.length < 5) return null;

    const metrics = { citations: cells[0], hIndex: cells[2], i10Index: cells[4] };
    return isValidMetrics(metrics) ? metrics : null;
}

/**
 * Pull every paper row out of one profile page: title, citation count, year,
 * and a link to its "Cited by" list (or to the paper's Scholar page when
 * nothing cites it yet). Returns null when the page has no paper table.
 */
function parsePapers(html) {
    if (!html || !html.includes('gsc_a_tr')) return null;

    const papers = [];
    for (const [, row] of html.matchAll(/<tr[^>]*class="[^"]*gsc_a_tr[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const titleMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*class="[^"]*gsc_a_at[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
        if (!titleMatch) continue;

        const citedMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*class="[^"]*gsc_a_ac[^"]*"[^>]*>([^<]*)<\/a>/i);
        const yearMatch = row.match(/class="[^"]*gsc_a_h[^"]*"[^>]*>(\d{4})</i);

        const citations = citedMatch ? parseInt(citedMatch[2].replace(/[^\d]/g, ''), 10) || 0 : 0;
        const citedBy = citedMatch && citedMatch[1] ? decodeEntities(citedMatch[1]) : '';
        const viewUrl = decodeEntities(titleMatch[1])
            // Drop the listing's paging parameters from the paper's own link.
            .replace(/&(pagesize|sortby|cstart)=[^&]*/g, '');

        papers.push({
            title: decodeEntities(titleMatch[2].replace(/<[^>]+>/g, '')).trim(),
            citations,
            year: yearMatch ? parseInt(yearMatch[1], 10) : null,
            url: absoluteUrl(citations > 0 && citedBy ? citedBy : viewUrl)
        });
    }
    return papers;
}

/**
 * Sanity-check before anything is written, so a captcha page or a truncated
 * response can never overwrite good numbers.
 */
function isValidMetrics(metrics) {
    if (!metrics) return false;

    const values = [metrics.citations, metrics.hIndex, metrics.i10Index];
    if (!values.every((v) => Number.isInteger(v) && v >= 0 && v < 1000000)) return false;

    // Both indices are bounded by the citation count. (i10-index can exceed
    // the h-index, e.g. h = 16 with i10 = 20, so the two are not compared.)
    return (
        metrics.citations > 0 &&
        metrics.citations >= metrics.hIndex &&
        metrics.citations >= metrics.i10Index
    );
}

/**
 * Fetch one profile page through the source list, retrying in rounds, and
 * return the first response `accept` turns into a value (or null).
 */
async function fetchPage(target, accept) {
    for (let round = 1; round <= ROUNDS; round++) {
        for (const source of SOURCES) {
            try {
                const response = await fetch(source.url(target), {
                    headers: BROWSER_HEADERS,
                    redirect: 'follow',
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
                });
                if (!response.ok) {
                    console.log(`  ${source.name}: HTTP ${response.status}`);
                    continue;
                }

                const value = accept(await response.text());
                if (value) {
                    console.log(`  ${source.name}: ok`);
                    return value;
                }
                console.log(`  ${source.name}: no profile table (captcha or layout change)`);
            } catch (error) {
                console.log(`  ${source.name}: ${error.message}`);
            }
        }

        if (round < ROUNDS) {
            console.log(`Round ${round} found nothing, retrying in ${ROUND_DELAY_MS / 1000}s...`);
            await sleep(ROUND_DELAY_MS);
        }
    }
    return null;
}

/**
 * Read the metrics and the full paper list. The metrics come with the first
 * page; further pages are read only while a page comes back full. `papers` is
 * null if any page could not be read, so a partial list is never written.
 */
async function fetchProfile() {
    console.log('Page 1');
    const first = await fetchPage(pageUrl(0), (html) => {
        const metrics = parseMetrics(html);
        return metrics ? { metrics, papers: parsePapers(html) } : null;
    });
    if (!first) return null;

    let papers = first.papers;
    for (let page = 1; papers && papers.length === page * PAGE_SIZE && page < MAX_PAGES; page++) {
        console.log(`Page ${page + 1}`);
        const more = await fetchPage(pageUrl(page * PAGE_SIZE), parsePapers);
        papers = more ? papers.concat(more) : null;
    }

    // A profile with citations always lists papers; an empty list means the
    // table was missing, so keep the previous list instead.
    if (papers && papers.length === 0) papers = null;

    return { metrics: first.metrics, papers };
}

async function readCurrent() {
    try {
        return JSON.parse(await readFile(OUTPUT_FILE, 'utf8'));
    } catch {
        return {};
    }
}

/** Surface a one-line result on the workflow run page. */
async function summarize(line) {
    if (!process.env.GITHUB_STEP_SUMMARY) return;
    try {
        await writeFile(process.env.GITHUB_STEP_SUMMARY, `${line}\n`, { flag: 'a' });
    } catch {
        /* Summary is a nicety; never fail the run over it. */
    }
}

/** Stable order, so the file only changes when a number or title does. */
function sortPapers(papers) {
    return [...papers].sort(
        (a, b) =>
            (b.year || 0) - (a.year || 0) ||
            a.title.localeCompare(b.title) ||
            b.citations - a.citations
    );
}

async function main() {
    if (!SCHOLAR_ID) {
        console.log('No Google Scholar id configured (set the SCHOLAR_ID repository variable); skipping.');
        await summarize('No SCHOLAR_ID configured - metrics not fetched.');
        return;
    }

    console.log(`Reading Google Scholar profile ${SCHOLAR_ID}`);
    const profile = await fetchProfile();

    if (!profile) {
        // Every source was blocked. Leave the committed numbers alone and warn
        // rather than fail: transient captchas are normal, and the next run in
        // 5 hours usually gets through.
        console.log('::warning::Could not read Google Scholar; keeping the existing metrics.');
        await summarize('Google Scholar unreachable this run - metrics left unchanged.');
        return;
    }

    const { metrics } = profile;
    const current = await readCurrent();
    if (!profile.papers) {
        console.log('::warning::Could not read the full paper list; keeping the existing per-paper counts.');
    }
    const papers = profile.papers ? sortPapers(profile.papers) : current.papers || [];

    const unchanged =
        current.citations === metrics.citations &&
        current.hIndex === metrics.hIndex &&
        current.i10Index === metrics.i10Index &&
        JSON.stringify(current.papers || []) === JSON.stringify(papers);

    const totals = `${metrics.citations} citations, h-index ${metrics.hIndex}, i10-index ${metrics.i10Index}, ${papers.length} papers`;

    if (unchanged) {
        console.log(`No change: ${totals}`);
        await summarize(`No change - ${totals}.`);
        return;
    }

    const updated = {
        citations: metrics.citations,
        hIndex: metrics.hIndex,
        i10Index: metrics.i10Index,
        scholarId: SCHOLAR_ID,
        profileUrl: PROFILE_URL,
        updated: new Date().toISOString().slice(0, 10),
        papers
    };

    await writeFile(OUTPUT_FILE, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    console.log(`Updated: ${current.citations ?? '-'} -> ${totals}`);
    await summarize(`Updated - ${current.citations ?? '-'} -> ${totals}.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
