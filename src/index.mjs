// Orchestrateur : scrape multi-sites -> filtre critères -> dédup Supabase -> Telegram.
import { chromium } from 'playwright';
import { loadDotEnv, criteria } from './lib/config.mjs';
import { matchesCriteria } from './lib/filter.mjs';
import { geocodeArrondissement } from './lib/geo.mjs';
import { insertNew } from './lib/supabase.mjs';
import { sendListing } from './lib/telegram.mjs';

import * as pap from './sources/pap.mjs';
// import * as paruvendu from './sources/paruvendu.mjs';  // Phase suivante

const SOURCES = { pap /*, paruvendu */ };

loadDotEnv();
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry') || process.env.DRY_RUN === '1';
const onlyIdx = argv.indexOf('--only');
const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function normalize(source, raw) {
  return {
    source,
    url: raw.url,
    title: raw.title ?? null,
    price: raw.price ?? null,
    surface: raw.surface ?? null,
    rooms: raw.rooms ?? null,
    bedrooms: raw.bedrooms ?? null,
    furnished: raw.furnished ?? null,
    arrondissement: raw.arrondissement ?? null,
    photo_url: raw.photo ?? null,
    dpe: raw.dpe ?? null,
    _desc: raw.desc ?? '',
    _seed: raw.sourceId ?? raw.url,
  };
}

async function scrapeSource(browser, src) {
  const collected = [];
  // Un contexte navigateur FRAIS par URL : certains sites (PAP) soft-bloquent
  // les navigations enchaînées dans la même session. Cookie jar neuf = visite
  // indépendante, ça passe le challenge à chaque fois.
  for (const url of src.buildUrls(criteria)) {
    const ctx = await browser.newContext({
      userAgent: UA, locale: 'fr-FR', viewport: { width: 1366, height: 900 },
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector(src.readySelector, { timeout: 25000 });
      const raw = await page.evaluate(`(${src.extractInPage.toString()})()`);
      collected.push(...raw);
      console.log(`  [${src.name}] ${url.replace(/^https?:\/\/[^/]+/, '')} -> ${raw.length}`);
    } catch (e) {
      console.warn(`  [${src.name}] échec: ${e.message.split('\n')[0]}`);
    } finally {
      await ctx.close();
    }
  }
  return collected;
}

async function main() {
  const chosen = Object.values(SOURCES).filter((s) => !only || s.name === only);
  console.log(`Radar — sources: ${chosen.map((s) => s.name).join(', ')}${DRY ? ' (DRY RUN)' : ''}`);

  const browser = await chromium.launch({ headless: true });
  let candidates = [];
  try {
    for (const src of chosen) {
      const raw = await scrapeSource(browser, src);
      const rows = raw.map((r) => normalize(src.name, r));
      // filtre critères
      const kept = [];
      for (const row of rows) {
        const { keep, reason } = matchesCriteria({ ...row, desc: row._desc }, criteria);
        if (keep) kept.push(row); else if (process.env.VERBOSE) console.log(`    rejeté (${reason}) ${row.url}`);
      }
      console.log(`  [${src.name}] ${kept.length}/${rows.length} passent les critères`);
      candidates.push(...kept);
    }
  } finally {
    await browser.close();
  }

  // dédup intra-lot par url
  const seen = new Set();
  candidates = candidates.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));

  // géocodage + nettoyage des champs internes
  const toInsert = candidates.map(({ _desc, _seed, ...c }) => {
    const { lat, lng } = geocodeArrondissement(c.arrondissement, _seed);
    return { ...c, lat, lng };
  });

  if (DRY) {
    console.log(`\nDRY RUN — ${toInsert.length} annonces retenues (aucune écriture, aucune notif).`);
    console.log(JSON.stringify(toInsert.slice(0, 5), null, 2));
    return;
  }

  const fresh = await insertNew(toInsert);
  console.log(`\n${fresh.length} nouvelle(s) annonce(s) (dédup Supabase).`);

  let sent = 0;
  for (const l of fresh) {
    try { await sendListing(l); sent++; }
    catch (e) { console.warn(`  Telegram échec ${l.url}: ${e.message}`); }
  }
  console.log(`${sent} notification(s) Telegram envoyée(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
