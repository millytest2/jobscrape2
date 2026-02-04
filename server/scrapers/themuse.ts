/**
 * The Muse scraper - TypeScript implementation
 * API: https://www.themuse.com/developers/api/v2
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role, location } = params;
    
    const allJobs: any[] = [];
    
    // Fetch multiple pages to get more jobs
    for (let page = 0; page < 5; page++) {
      const url = new URL('https://www.themuse.com/api/public/jobs');
      url.searchParams.set('location', location);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('descending', 'true');
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
        },
      });
      
      if (!response.ok) {
        console.error(`[The Muse] HTTP ${response.status} on page ${page}`);
        break;
      }
      
      const data = await response.json();
      const jobs = data.results || [];
      
      if (jobs.length === 0) break;
      allJobs.push(...jobs);
      
      // Stop if we have enough
      if (allJobs.length >= 100) break;
    }
    
    const jobs = allJobs;
    
    // Filter by role (case-insensitive) - expanded to get more results
    const roleKeywords = role.toLowerCase().split(' ');
    
    // Add related keywords to expand search
    const expandedKeywords = [...roleKeywords];
    if (role.toLowerCase().includes('sales engineer')) {
      expandedKeywords.push('solutions', 'presales', 'technical sales', 'demo', 'customer engineer', 'account manager');
    }
    
    const filtered = jobs.filter((job: any) => {
      const title = (job.name || '').toLowerCase();
      const categories = (job.categories || []).map((c: any) => c.name.toLowerCase());
      const contents = (job.contents || '').toLowerCase();
      
      return expandedKeywords.some(keyword => 
        title.includes(keyword) || 
        categories.some((cat: string) => cat.includes(keyword)) ||
        contents.includes(keyword)
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
      description: job.contents ? job.contents : undefined,
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
