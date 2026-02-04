/**
 * Remotive scraper - TypeScript implementation
 * API: https://remotive.com/api/remote-jobs
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role } = params;
    
    // Remotive API endpoint
    const url = 'https://remotive.com/api/remote-jobs';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[Remotive] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const jobs = data.jobs || [];
    
    // Filter by role (case-insensitive)
    const roleKeywords = role.toLowerCase().split(' ');
    const filtered = jobs.filter((job: any) => {
      const title = (job.title || '').toLowerCase();
      const category = (job.category || '').toLowerCase();
      
      return roleKeywords.some(keyword => 
        title.includes(keyword) || category.includes(keyword)
      );
    });
    
    // Normalize to our Job interface
    return filtered.slice(0, 50).map((job: any) => ({
      title: job.title || 'Unknown Title',
      company: job.company_name || 'Unknown Company',
      location: job.candidate_required_location || 'Remote',
      url: job.url || '',
      source: 'Remotive',
      postedDate: job.publication_date || undefined,
      salary: job.salary || undefined,
      description: job.description ? job.description.substring(0, 200) : undefined,
    }));
  } catch (error) {
    console.error('[Remotive] Scrape error:', error);
    return [];
  }
}

export const remotiveScraper: Scraper = {
  name: 'Remotive',
  scrape,
};
