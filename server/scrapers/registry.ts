/**
 * Scraper Registry - Explicit imports, no filesystem discovery
 * All 13 sources registered here
 */

import { remoteOKScraper } from './remoteok';
import { weWorkRemotelyScraper } from './weworkremotely';
import { remotiveScraper } from './remotive';
import { arbeitnowScraper } from './arbeitnow';
import { joobleScraper } from './jooble';
import { serpAPIScraper } from './serpapi';
import { craigslistScraper } from './craigslist';
import { theMuseScraper } from './themuse';
import { apifyCareerSiteScraper } from './apify-career-site';
import { apifyLinkedInScraper } from './apify-linkedin';
import { adzunaScraper } from './adzuna';
import { rssScraper } from './rss-aggregator';
import { usajobsScraper } from './usajobs';

import type { ScraperRegistry } from './types';

export const SCRAPERS: ScraperRegistry = {
  remoteok: remoteOKScraper,
  weworkremotely: weWorkRemotelyScraper,
  remotive: remotiveScraper,
  arbeitnow: arbeitnowScraper,
  jooble: joobleScraper,
  serpapi: serpAPIScraper,
  craigslist: craigslistScraper,
  themuse: theMuseScraper,
  'apify-career-site': apifyCareerSiteScraper,
  'apify-linkedin': apifyLinkedInScraper,
  adzuna: adzunaScraper,
  rss: rssScraper,
  usajobs: usajobsScraper,
};

export const SCRAPER_NAMES = Object.keys(SCRAPERS);

// Smoke test on import - verify all scrapers are valid
console.log('\n🔍 SMOKE TEST: Validating scraper registry');
Object.entries(SCRAPERS).forEach(([key, scraper]) => {
  const nameValid = typeof scraper.name === 'string';
  const scrapeValid = typeof scraper.scrape === 'function';
  const valid = nameValid && scrapeValid;
  console.log(`  ${valid ? '✅' : '❌'} ${key}: name="${scraper.name}", scrape=${typeof scraper.scrape}`);
  
  if (!valid) {
    throw new Error(`FATAL: Scraper '${key}' is invalid (name: ${typeof scraper.name}, scrape: ${typeof scraper.scrape})`);
  }
});
console.log('✅ SMOKE TEST PASSED: All scrapers valid\n');
