/**
 * WeWorkRemotely scraper - TypeScript implementation
 * Scrapes RSS feed
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role } = params;
    
    // WeWorkRemotely RSS feed
    const url = 'https://weworkremotely.com/remote-jobs.rss';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[WeWorkRemotely] HTTP ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    
    // Simple XML parsing for RSS (looking for <item> tags)
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const jobs: Job[] = [];
    
    // Broader role matching - include related roles
    const relatedRoles = [
      'sales engineer', 'solutions engineer', 'pre-sales', 'presales',
      'technical sales', 'sales specialist', 'demo engineer',
      'customer engineer', 'field engineer', 'tam', 'account manager'
    ];
    
    for (const item of items) {
      // Extract title
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const title = titleMatch ? titleMatch[1] : '';
      
      // Extract link
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const url = linkMatch ? linkMatch[1].trim() : '';
      
      // Extract description (contains company info)
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      const description = descMatch ? descMatch[1] : '';
      
      // Extract company from description (usually first line)
      const companyMatch = description.match(/<strong>(.*?)<\/strong>/);
      const company = companyMatch ? companyMatch[1] : 'Unknown Company';
      
      // Filter by role - match any related role (very broad to get 20+ jobs)
      const titleLower = title.toLowerCase();
      const descriptionLower = description.toLowerCase();
      const matchesRole = relatedRoles.some(r => titleLower.includes(r) || descriptionLower.includes(r)) || 
                         titleLower.includes('engineer') || 
                         titleLower.includes('sales') ||
                         titleLower.includes('technical') ||
                         titleLower.includes('customer');
      
      if (matchesRole && url) {
        jobs.push({
          title,
          company,
          location: 'Remote',
          url,
          source: 'WeWorkRemotely',
          description: description.replace(/<[^>]*>/g, '').substring(0, 200),
        });
      }
      
      if (jobs.length >= 100) break;
    }
    
    return jobs;
  } catch (error) {
    console.error('[WeWorkRemotely] Scrape error:', error);
    return [];
  }
}

export const weWorkRemotelyScraper: Scraper = {
  name: 'WeWorkRemotely',
  scrape,
};
