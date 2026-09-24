#!/usr/bin/env node
/**
 * Refresh data/scholar.json from the public Google Scholar profile.
 *
 * Run by .github/workflows/update-scholar.yml every 6 hours. Doing the scrape
 * here rather than in the browser means every visitor - incognito, a phone, a
 * first-time reader - is served the same numbers straight out of the repo,
 * instead of whatever happened to land in their own localStorage.
 *
 * The file is rewritten only when the metrics actually change, so the workflow
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
const PROFILE_URL = `https://scholar.google.com/citations?user=${SCHOLAR_ID}&hl=en`;

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
    { name: 'scholar.google.com', url: () => PROFILE_URL },
    {
        name: 'codetabs',
        url: () => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(PROFILE_URL)
    },
    {
        name: 'allorigins',
        url: () => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(PROFILE_URL)
    },
    {
        name: 'corsproxy.io',
        url: () => 'https://corsproxy.io/?url=' + encodeURIComponent(PROFILE_URL)
    },
    { name: 'cors.lol', url: () => 'https://api.cors.lol/?url=' + encodeURIComponent(PROFILE_URL) }
];

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function fetchMetrics() {
    for (let round = 1; round <= ROUNDS; round++) {
        for (const source of SOURCES) {
            try {
                const response = await fetch(source.url(), {
                    headers: BROWSER_HEADERS,
                    redirect: 'follow',
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
                });
                if (!response.ok) {
                    console.log(`  ${source.name}: HTTP ${response.status}`);
                    continue;
                }

                const metrics = parseMetrics(await response.text());
                if (metrics) {
                    console.log(`  ${source.name}: ok`);
                    return metrics;
                }
                console.log(`  ${source.name}: no metrics table (captcha or layout change)`);
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

async function main() {
    if (!SCHOLAR_ID) {
        console.log('No Google Scholar id configured (set the SCHOLAR_ID repository variable); skipping.');
        await summarize('No SCHOLAR_ID configured - metrics not fetched.');
        return;
    }

    console.log(`Reading Google Scholar profile ${SCHOLAR_ID}`);
    const metrics = await fetchMetrics();

    if (!metrics) {
        // Every source was blocked. Leave the committed numbers alone and warn
        // rather than fail: transient captchas are normal, and the next run in
        // 6 hours usually gets through.
        console.log('::warning::Could not read Google Scholar; keeping the existing metrics.');
        await summarize('Google Scholar unreachable this run - metrics left unchanged.');
        return;
    }

    const current = await readCurrent();
    const unchanged =
        current.citations === metrics.citations &&
        current.hIndex === metrics.hIndex &&
        current.i10Index === metrics.i10Index;

    if (unchanged) {
        console.log(
            `No change: ${metrics.citations} citations, h-index ${metrics.hIndex}, i10 ${metrics.i10Index}`
        );
        await summarize(
            `No change - ${metrics.citations} citations, h-index ${metrics.hIndex}, i10-index ${metrics.i10Index}.`
        );
        return;
    }

    const updated = {
        citations: metrics.citations,
        hIndex: metrics.hIndex,
        i10Index: metrics.i10Index,
        scholarId: SCHOLAR_ID,
        profileUrl: PROFILE_URL,
        updated: new Date().toISOString().slice(0, 10)
    };

    await writeFile(OUTPUT_FILE, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    console.log(
        `Updated: ${current.citations ?? '-'} -> ${updated.citations} citations, ` +
            `h-index ${updated.hIndex}, i10 ${updated.i10Index}`
    );
    await summarize(
        `Updated - ${current.citations ?? '-'} -> ${updated.citations} citations, ` +
            `h-index ${updated.hIndex}, i10-index ${updated.i10Index}.`
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
