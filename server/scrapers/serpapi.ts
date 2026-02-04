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
    
    // Normalize location - if specific city fails, try "Los Angeles, CA"
    const locations = [location, 'Los Angeles, CA'];
    
    for (const loc of locations) {
      try {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.set('engine', 'google_jobs');
        url.searchParams.set('q', role);
        url.searchParams.set('location', loc);
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('num', '50');
        
        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
          },
        });
        
        if (!response.ok) {
          console.error(`[SerpAPI] HTTP ${response.status} for location: ${loc}`);
          continue; // Try next location
        }
        
        const data = await response.json();
        const jobs = data.jobs_results || [];
        
        // Normalize to our Job interface
        return jobs.slice(0, 50).map((job: any) => ({
          title: job.title || 'Unknown Title',
          company: job.company_name || 'Unknown Company',
          location: job.location || loc,
          url: job.apply_link || job.share_link || '',
          source: 'SerpAPI',
          postedDate: job.detected_extensions?.posted_at || undefined,
          description: job.description ? job.description.substring(0, 200) : undefined,
        }));
      } catch (error) {
        console.error(`[SerpAPI] Error for location ${loc}:`, error);
        continue;
      }
    }
    
    // All locations failed
    return [];
  } catch (error) {
    console.error('[SerpAPI] Scrape error:', error);
    return [];
  }
}

export const serpAPIScraper: Scraper = {
  name: 'SerpAPI',
  scrape,
};
