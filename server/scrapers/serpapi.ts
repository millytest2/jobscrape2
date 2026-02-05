/**
 * SerpAPI scraper - TypeScript implementation
 * API: https://serpapi.com/google-jobs-api
 * Requires API key from environment variable
 */

import type { Job, ScrapeParams, Scraper } from './types';

async function scrape(params: ScrapeParams): Promise<Job[]> {
  try {
    const { role, location } = params;
    
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      console.warn('[SerpAPI] API key not configured (SERPAPI_KEY env var)');
      return [];
    }
    
    // Use full location format that SerpAPI expects
    let searchLocation = location;
    if (location.toLowerCase().includes('los angeles')) {
      searchLocation = 'Los Angeles, California, United States';
    }
    
    // Use single query to avoid timeout (was timing out with multiple role variations)
    const allJobs: Job[] = [];
    
    try {
      const url = new URL('https://serpapi.com/search.json');
      // Use engine=google_jobs as shown in SerpAPI documentation
      url.searchParams.set('engine', 'google_jobs');
      url.searchParams.set('q', `${role} ${location}`);
      url.searchParams.set('hl', 'en'); // English language
      url.searchParams.set('num', '50'); // Request up to 50 results
      url.searchParams.set('api_key', apiKey);
      
      console.log(`[SerpAPI] Fetching: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
        },
      });
      
      if (!response.ok) {
        console.error(`[SerpAPI] HTTP ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`[SerpAPI] Response keys:`, Object.keys(data));
      
      // jobs_results is an array at the top level
      const jobs = data.jobs_results || [];
      console.log(`[SerpAPI] jobs_results:`, Array.isArray(jobs) ? `${jobs.length} jobs` : 'not an array');
      
      console.log(`[SerpAPI] Found ${jobs.length} jobs for "${role}" in "${location}"`);
      
      // Normalize to our Job interface and add to collection
      const normalized = jobs.map((job: any) => ({
        title: job.title || 'Unknown Title',
        company: job.company_name || 'Unknown Company',
        location: job.location || searchLocation,
        url: job.apply_link || job.share_link || job.related_links?.[0]?.link || '',
        source: 'SerpAPI',
        postedDate: job.detected_extensions?.posted_at || undefined,
        description: job.description ? job.description : undefined,
      }));
      
      allJobs.push(...normalized);
    } catch (error) {
      console.error(`[SerpAPI] Error:`, error);
      return [];
    }
    
    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allJobs.filter(job => {
      if (seen.has(job.url)) return false;
      seen.add(job.url);
      return true;
    });
    
    return unique.slice(0, 100);
  } catch (error) {
    console.error('[SerpAPI] Scrape error:', error);
    return [];
  }
}

export const serpAPIScraper: Scraper = {
  name: 'SerpAPI',
  scrape,
};
