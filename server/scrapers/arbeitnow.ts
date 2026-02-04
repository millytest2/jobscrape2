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
    
    // Filter by role (case-insensitive) - expanded to get more results
    const roleKeywords = role.toLowerCase().split(' ');
    
    // Add related keywords to expand search
    const expandedKeywords = [...roleKeywords];
    if (role.toLowerCase().includes('sales engineer')) {
      expandedKeywords.push('solutions', 'presales', 'technical sales', 'demo', 'customer engineer', 'account manager');
    }
    
    const filtered = jobs.filter((job: any) => {
      const title = (job.title || '').toLowerCase();
      const tags = (job.tags || []).map((t: string) => t.toLowerCase());
      const description = (job.description || '').toLowerCase();
      
      return expandedKeywords.some(keyword => 
        title.includes(keyword) || 
        tags.some((tag: string) => tag.includes(keyword)) ||
        description.includes(keyword)
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
      description: job.description ? job.description : undefined,
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
