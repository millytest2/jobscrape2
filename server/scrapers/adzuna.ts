import axios from 'axios';
import type { Job, Scraper, ScrapeParams } from './types';

// Inline role variations to avoid import issues
function getRoleVariations(role: string): string[] {
  const normalized = role.toLowerCase().trim();
  if (normalized.includes('sales engineer') || normalized.includes('sales eng')) {
    return ['Sales Engineer', 'Pre-Sales Engineer', 'Solutions Engineer'];
  }
  return [role]; // Fallback to original role
}

async function scrape(params: ScrapeParams): Promise<Job[]> {
  const { role, location } = params;
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  
  if (!appId || !appKey) {
    console.log('[adzuna] ⚠️ API keys not found (ADZUNA_APP_ID, ADZUNA_APP_KEY)');
    return [];
  }

  try {
    console.log(`[adzuna] Starting scrape for "${role}" in "${location}"`);
    
    const roleVariations = getRoleVariations(role); // Search role variations
    console.log(`[adzuna] Searching ${roleVariations.length} role variations:`, roleVariations);
    
    const allJobs: Job[] = [];
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1`;
    
    // Search for each role variation
    for (const roleVariation of roleVariations) {
      try {
        const response = await axios.get(url, {
          params: {
            app_id: appId,
            app_key: appKey,
            results_per_page: 20, // Reduced per variation to avoid hitting limits
            what: roleVariation,
            where: location,
            category: 'it-jobs',
            sort_by: 'date'
          },
          timeout: 15000
        });

        const jobs: Job[] = response.data.results.map((job: any) => ({
          title: job.title || 'Untitled',
          company: job.company?.display_name || 'Unknown Company',
          location: job.location?.display_name || location,
          description: job.description || '',
          url: job.redirect_url || job.url || '',
          source: 'Adzuna',
          postedDate: job.created,
          salary: job.salary_max ? `$${Math.round(job.salary_min)}-$${Math.round(job.salary_max)}` : undefined
        }));

        const validJobs = jobs.filter(job => job.url);
        allJobs.push(...validJobs);
        console.log(`[adzuna] Found ${validJobs.length} jobs for "${roleVariation}"`);
      } catch (err: any) {
        console.warn(`[adzuna] Failed to search "${roleVariation}": ${err.message}`);
      }
    }
    
    // Remove duplicates by URL
    const uniqueJobs = Array.from(
      new Map(allJobs.map(job => [job.url, job])).values()
    );

    console.log(`[adzuna] ✅ Found ${uniqueJobs.length} unique jobs (${allJobs.length} total)`);
    return uniqueJobs;

  } catch (error: any) {
    if (error.response) {
      console.error(`[adzuna] ❌ API error: ${error.response.status} - ${error.response.data?.error || error.message}`);
    } else {
      console.error(`[adzuna] ❌ Request failed: ${error.message}`);
    }
    return [];
  }
}

export const adzunaScraper: Scraper = {
  name: 'Adzuna',
  scrape,
};
