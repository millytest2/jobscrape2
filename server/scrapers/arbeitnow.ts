/**
 * Arbeitnow scraper - TypeScript implementation
 * API: https://www.arbeitnow.com/api/job-board-api
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role } = params;
    
    // Arbeitnow API endpoint
    const url = 'https://www.arbeitnow.com/api/job-board-api';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[Arbeitnow] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const jobs = data.data || [];
    
    // Filter by role (case-insensitive)
    const roleKeywords = role.toLowerCase().split(' ');
    const filtered = jobs.filter((job: any) => {
      const title = (job.title || '').toLowerCase();
      const tags = (job.tags || []).map((t: string) => t.toLowerCase());
      
      return roleKeywords.some(keyword => 
        title.includes(keyword) || tags.some((tag: string) => tag.includes(keyword))
      );
    });
    
    // Normalize to our Job interface
    return filtered.slice(0, 100).map((job: any) => ({
      title: job.title || 'Unknown Title',
      company: job.company_name || 'Unknown Company',
      location: job.location || 'Remote',
      url: job.url || '',
      source: 'Arbeitnow',
      postedDate: job.created_at || undefined,
      description: job.description ? job.description.substring(0, 200) : undefined,
    }));
  } catch (error) {
    console.error('[Arbeitnow] Scrape error:', error);
    return [];
  }
}

export const arbeitnowScraper: Scraper = {
  name: 'Arbeitnow',
  scrape,
};
