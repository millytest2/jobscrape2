/**
 * Craigslist scraper - TypeScript implementation
 * Scrapes HTML from Craigslist job listings
 * Note: Requires cheerio for HTML parsing (will install later)
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role, location } = params;
    
    // Map location to Craigslist subdomain
    const subdomain = location.toLowerCase().includes('los angeles') ? 'losangeles' : 'losangeles';
    
    // Craigslist search URL
    const searchQuery = encodeURIComponent(role);
    const url = `https://${subdomain}.craigslist.org/search/jjj?query=${searchQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`[Craigslist] HTTP ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    
    // Simple regex-based parsing (cheerio would be better, but keeping it simple for now)
    const jobs: Job[] = [];
    
    // Match job listings in HTML
    const listingRegex = /<li class="cl-search-result[^>]*>[\s\S]*?<\/li>/g;
    const listings = html.match(listingRegex) || [];
    
    for (const listing of listings.slice(0, 50)) {
      // Extract title
      const titleMatch = listing.match(/<div class="title"><a[^>]*>(.*?)<\/a>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract URL
      const urlMatch = listing.match(/<a href="(\/jjj\/[^"]+)"/);
      const jobUrl = urlMatch ? `https://${subdomain}.craigslist.org${urlMatch[1]}` : '';
      
      // Extract location
      const locMatch = listing.match(/<span class="location">(.*?)<\/span>/);
      const jobLocation = locMatch ? locMatch[1].trim() : location;
      
      if (title && jobUrl) {
        jobs.push({
          title,
          company: 'Unknown Company', // Craigslist doesn't always show company
          location: jobLocation,
          url: jobUrl,
          source: 'Craigslist',
        });
      }
    }
    
    return jobs;
  } catch (error) {
    console.error('[Craigslist] Scrape error:', error);
    return [];
  }
}

export const craigslistScraper: Scraper = {
  name: 'Craigslist',
  scrape,
};
