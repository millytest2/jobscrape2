/**
 * Scraper Registry - Explicit imports, no filesystem discovery
 * All 8 sources registered here
 */

import { remoteOKScraper } from './remoteok';
import { weWorkRemotelyScraper } from './weworkremotely';
import { remotiveScraper } from './remotive';
import { arbeitnowScraper } from './arbeitnow';
import { joobleScraper } from './jooble';
import { serpAPIScraper } from './serpapi';
import { craigslistScraper } from './craigslist';
import { theMuseScraper } from './themuse';

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
};

export const SCRAPER_NAMES = Object.keys(SCRAPERS);
