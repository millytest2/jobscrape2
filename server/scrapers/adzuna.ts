import axios from 'axios';
import type { Job } from './types';

export async function scrapeAdzuna(role: string, location: string): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  
  if (!appId || !appKey) {
    console.log('[adzuna] ⚠️ API keys not found (ADZUNA_APP_ID, ADZUNA_APP_KEY)');
    return [];
  }

  try {
    console.log(`[adzuna] Starting scrape for "${role}" in "${location}"`);
    
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1`;
    const response = await axios.get(url, {
      params: {
        app_id: appId,
        app_key: appKey,
        results_per_page: 50,
        what: role,
        where: location,
        category: 'it-jobs',
        sort_by: 'date' // Get newest jobs first
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

    console.log(`[adzuna] ✅ Found ${validJobs.length} jobs`);
    return validJobs;

  } catch (error: any) {
    if (error.response) {
      console.error(`[adzuna] ❌ API error: ${error.response.status} - ${error.response.data?.error || error.message}`);
    } else {
      console.error(`[adzuna] ❌ Request failed: ${error.message}`);
    }
    return [];
  }
}
