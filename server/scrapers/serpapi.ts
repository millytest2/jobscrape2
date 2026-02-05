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
    
    // Try multiple search strategies with role variations to maximize results
    const roleVariations = [
      role, // Original role (e.g., "Sales Engineer")
      'Solutions Engineer',
      'Pre-Sales Engineer',
      'Technical Account Manager',
      'Demo Engineer',
    ];
    
    const searchStrategies = roleVariations.flatMap(r => [
      { q: `${r} jobs in ${location}`, location: searchLocation, role: r },
      { q: `${r} remote`, location: searchLocation, role: r },
    ]);
    
    const allJobs: Job[] = [];
    
    for (const strategy of searchStrategies) {
      try {
        const url = new URL('https://serpapi.com/search.json');
        // Use engine=google_jobs as shown in SerpAPI documentation
        url.searchParams.set('engine', 'google_jobs');
        url.searchParams.set('q', `${strategy.role} ${location}`);
        url.searchParams.set('hl', 'en'); // English language
        url.searchParams.set('api_key', apiKey);
        
        console.log(`[SerpAPI] Fetching: ${url.toString()}`);
        
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
        console.log(`[SerpAPI] Response keys:`, Object.keys(data));
        
        // jobs_results is an object with a 'jobs' array inside
        const jobs = data.jobs_results?.jobs || [];
        console.log(`[SerpAPI] jobs_results.jobs:`, Array.isArray(jobs) ? `${jobs.length} jobs` : 'not an array');
        
        console.log(`[SerpAPI] Found ${jobs.length} jobs for "${strategy.role}" query: ${strategy.q}`);
        
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
        
        // Stop if we have enough jobs (limit to 50 total to avoid using too many API credits)
        if (allJobs.length >= 50) {
          console.log(`[SerpAPI] Reached 50 jobs limit, stopping search`);
          break;
        }
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
