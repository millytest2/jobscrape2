import { scrapeUSAJobs } from './usajobs';
import type { Scraper, ScrapeParams } from './types';

async function scrapeUSAJobsWrapper(params: ScrapeParams) {
  return scrapeUSAJobs(params.role, params.location);
}

export const usajobsScraper: Scraper = {
  name: 'USAJobs',
  scrape: scrapeUSAJobsWrapper,
};
