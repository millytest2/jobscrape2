import { scrapeAdzuna } from './adzuna';
import type { Scraper, ScrapeParams } from './types';

async function scrapeAdzunaWrapper(params: ScrapeParams) {
  return scrapeAdzuna(params.role, params.location);
}

export const adzunaScraper: Scraper = {
  name: 'Adzuna',
  scrape: scrapeAdzunaWrapper,
};
