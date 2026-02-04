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
    
    // Try multiple search strategies to maximize results
    // Use correct format: "job title jobs in location"
    const searchStrategies = [
      { q: `${role} jobs in ${location}`, location: searchLocation },
      { q: `${role} remote jobs in ${location}`, location: searchLocation },
      { q: `${role} hybrid jobs in ${location}`, location: searchLocation },
    ];
    
    const allJobs: Job[] = [];
    
    for (const strategy of searchStrategies) {
      try {
        const url = new URL('https://serpapi.com/search.json');
        // Don't use engine=google_jobs, just use base search with formatted query
        url.searchParams.set('q', strategy.q);
        url.searchParams.set('location', strategy.location);
        url.searchParams.set('api_key', apiKey);
        
        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
          },
        });
        
        if (!response.ok) {
          console.error(`[SerpAPI] HTTP ${response.status} for query: ${strategy.q}`);
          continue;
        }
        
        const data = await response.json();
        const jobs = data.jobs_results || [];
        
        console.log(`[SerpAPI] Found ${jobs.length} jobs for query: ${strategy.q}`);
        
        // Normalize to our Job interface and add to collection
        const normalized = jobs.map((job: any) => ({
          title: job.title || 'Unknown Title',
          company: job.company_name || 'Unknown Company',
          location: job.location || strategy.location,
          url: job.apply_link || job.share_link || '',
          source: 'SerpAPI',
          postedDate: job.detected_extensions?.posted_at || undefined,
          description: job.description ? job.description : undefined,
        }));
        
        allJobs.push(...normalized);
        
        // Stop if we have enough jobs
        if (allJobs.length >= 100) break;
      } catch (error) {
        console.error(`[SerpAPI] Error for strategy ${strategy.q}:`, error);
        continue;
      }
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
