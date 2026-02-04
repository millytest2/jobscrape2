/**
 * The Muse scraper - TypeScript implementation
 * API: https://www.themuse.com/developers/api/v2
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role, location } = params;
    
    // The Muse API endpoint
    const url = new URL('https://www.themuse.com/api/public/jobs');
    // Don't use category parameter - it's too restrictive
    url.searchParams.set('location', location);
    url.searchParams.set('page', '0');
    url.searchParams.set('descending', 'true');
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[The Muse] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const jobs = data.results || [];
    
    // Filter by role (case-insensitive)
    const roleKeywords = role.toLowerCase().split(' ');
    const filtered = jobs.filter((job: any) => {
      const title = (job.name || '').toLowerCase();
      const categories = (job.categories || []).map((c: any) => c.name.toLowerCase());
      
      return roleKeywords.some(keyword => 
        title.includes(keyword) || categories.some((cat: string) => cat.includes(keyword))
      );
    });
    
    // Normalize to our Job interface
    return filtered.slice(0, 100).map((job: any) => ({
      title: job.name || 'Unknown Title',
      company: job.company?.name || 'Unknown Company',
      location: job.locations?.[0]?.name || location,
      url: job.refs?.landing_page || '',
      source: 'The Muse',
      postedDate: job.publication_date || undefined,
      description: job.contents ? job.contents.substring(0, 200) : undefined,
    }));
  } catch (error) {
    console.error('[The Muse] Scrape error:', error);
    return [];
  }
}

export const theMuseScraper: Scraper = {
  name: 'The Muse',
  scrape,
};
