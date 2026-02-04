/**
 * Jooble scraper - TypeScript implementation
 * API: https://jooble.org/api/about
 * Requires API key from environment variable
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role, location } = params;
    
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) {
      console.warn('[Jooble] API key not configured (JOOBLE_API_KEY env var)');
      return [];
    }
    
    // Jooble API endpoint
    const url = `https://jooble.org/api/${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
      },
      body: JSON.stringify({
        keywords: role,
        location: location,
      }),
    });
    
    if (!response.ok) {
      console.error(`[Jooble] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const jobs = data.jobs || [];
    
    // Normalize to our Job interface
    return jobs.slice(0, 100).map((job: any) => ({
      title: job.title || 'Unknown Title',
      company: job.company || 'Unknown Company',
      location: job.location || location,
      url: job.link || '',
      source: 'Jooble',
      postedDate: job.updated || undefined,
      salary: job.salary || undefined,
      description: job.snippet ? job.snippet : undefined,
    }));
  } catch (error) {
    console.error('[Jooble] Scrape error:', error);
    return [];
  }
}

export const joobleScraper: Scraper = {
  name: 'Jooble',
  scrape,
};
