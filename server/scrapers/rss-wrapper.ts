import { scrapeRSSFeeds } from './rss-aggregator';
import type { Scraper, ScrapeParams } from './types';

async function scrapeRSSWrapper(params: ScrapeParams) {
  return scrapeRSSFeeds(params.role, params.location);
}

export const rssScraper: Scraper = {
  name: 'RSS Feeds',
  scrape: scrapeRSSWrapper,
};
