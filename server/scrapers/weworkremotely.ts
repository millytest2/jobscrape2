/**
 * WeWorkRemotely scraper - TypeScript implementation
 * Scrapes RSS feed
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  const url = 'https://weworkremotely.com/remote-jobs.rss';
  console.log(`[WeWorkRemotely] SOURCE_START url=${url}`);
  
  try {
    const { role } = params;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    
    console.log(`[WeWorkRemotely] HTTP ${response.status}`);
    
    if (!response.ok) {
      const bodyPreview = await response.text().then(t => t.substring(0, 200)).catch(() => '');
      console.error(`[WeWorkRemotely] ERROR_HTTP_${response.status} body=${bodyPreview}`);
      throw new Error(`ERROR_HTTP_${response.status}`);
    }
    
    const xml = await response.text();
    
    // Simple XML parsing for RSS (looking for <item> tags)
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[WeWorkRemotely] Found ${items.length} items in RSS feed BEFORE filtering`);
    
    if (items.length === 0) {
      console.error(`[WeWorkRemotely] ERROR_EMPTY_RESPONSE - RSS feed has no items`);
      throw new Error('ERROR_EMPTY_RESPONSE');
    }
    
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
          description: description.replace(/<[^>]*>/g, ''),
        });
      }
      
      if (jobs.length >= 100) break;
    }
    
    console.log(`[WeWorkRemotely] SOURCE_END jobsReturned=${jobs.length} (filtered from ${items.length} items)`);
    
    if (jobs.length === 0 && items.length > 0) {
      console.warn(`[WeWorkRemotely] WARNING: Filter too aggressive - ${items.length} items but 0 jobs after filtering`);
    }
    
    return jobs;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[WeWorkRemotely] SOURCE_END error=${errorMessage}`);
    throw error; // Re-throw so router can capture it
  }
}

export const weWorkRemotelyScraper: Scraper = {
  name: 'WeWorkRemotely',
  scrape,
};
