/**
 * RemoteOK scraper - TypeScript implementation
 * API: https://remoteok.com/api
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role } = params;
    
    // RemoteOK API endpoint
    const url = 'https://remoteok.com/api';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[RemoteOK] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // RemoteOK API returns array where first item is metadata
    const jobs = data.slice(1);
    
    // Filter by role (case-insensitive)
    const roleKeywords = role.toLowerCase().split(' ');
    const filtered = jobs.filter((job: any) => {
      const title = (job.position || '').toLowerCase();
      const tags = (job.tags || []).map((t: string) => t.toLowerCase());
      
      return roleKeywords.some(keyword => 
        title.includes(keyword) || tags.some((tag: string) => tag.includes(keyword))
      );
    });
    
    // Normalize to our Job interface
    return filtered.slice(0, 100).map((job: any) => ({
      title: job.position || 'Unknown Title',
      company: job.company || 'Unknown Company',
      location: job.location || 'Remote',
      url: `https://remoteok.com/remote-jobs/${job.slug}`,
      source: 'RemoteOK',
      postedDate: job.date || undefined,
      salary: job.salary_min && job.salary_max 
        ? `$${job.salary_min}-$${job.salary_max}` 
        : undefined,
      description: job.description || undefined,
    }));
  } catch (error) {
    console.error('[RemoteOK] Scrape error:', error);
    return [];
  }
}

export const remoteOKScraper: Scraper = {
  name: 'RemoteOK',
  scrape,
};
