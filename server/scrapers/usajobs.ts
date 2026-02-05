import axios from 'axios';
import type { Job, Scraper, ScrapeParams } from './types';

// Inline role variations to avoid import issues
function getRoleVariations(role: string): string[] {
  const normalized = role.toLowerCase().trim();
  if (normalized.includes('sales engineer') || normalized.includes('sales eng')) {
    return ['Sales Engineer', 'Pre-Sales Engineer', 'Solutions Engineer'];
  }
  return [role];
}

async function scrape(params: ScrapeParams): Promise<Job[]> {
  const { role, location } = params;
  const apiKey = process.env.USAJOBS_API_KEY || '';
  const userAgent = process.env.USAJOBS_USER_AGENT || 'JobScraperApp/1.0 (contact@example.com)';
  
  // API key is optional for USAJobs
  if (!apiKey) {
    console.log('[usajobs] Running without API key (limited results)');
  }

  try {
    console.log(`[usajobs] Starting scrape for "${role}" in "${location}"`);
    
    // Get role variations to search
    const roleVariations = getRoleVariations(role); // Search role variations
    console.log(`[usajobs] Searching ${roleVariations.length} role variations:`, roleVariations);
    
    const allJobs: Job[] = [];
    
    // Search for each role variation
    for (const roleVariation of roleVariations) {
      try {
        const response = await axios.get('https://data.usajobs.gov/api/search', {
          params: {
            Keyword: roleVariation,
            LocationName: location,
            ResultsPerPage: 20, // Reduced per variation
            SortField: 'OpenDate',
            SortDirection: 'Descending'
          },
          headers: {
            'Authorization-Key': apiKey,
            'User-Agent': userAgent
          },
          timeout: 15000
        });

        const searchResult = response.data.SearchResult;
        
        if (!searchResult || !searchResult.SearchResultItems) {
          console.log(`[usajobs] No results for "${roleVariation}"`);
          continue;
        }

        const jobs = searchResult.SearchResultItems.map((item: any) => {
          const matchedJob = item.MatchedObjectDescriptor;
          
          return {
            title: matchedJob.PositionTitle,
            company: matchedJob.OrganizationName,
            location: matchedJob.PositionLocationDisplay,
            description: matchedJob.QualificationSummary || matchedJob.UserArea?.Details?.JobSummary || '',
            url: matchedJob.PositionURI,
            source: 'USAJobs',
            postedDate: matchedJob.PublicationStartDate,
            salary: formatSalary(matchedJob.PositionRemuneration)
          };
        });

        allJobs.push(...jobs);
        console.log(`[usajobs] Found ${jobs.length} jobs for "${roleVariation}"`);
      } catch (err: any) {
        console.warn(`[usajobs] Failed to search "${roleVariation}": ${err.message}`);
      }
    }
    
    // Remove duplicates by URL
    const uniqueJobs = Array.from(
      new Map(allJobs.map(job => [job.url, job])).values()
    );

    console.log(`[usajobs] ✅ Found ${uniqueJobs.length} unique government jobs (${allJobs.length} total)`);
    return uniqueJobs;

  } catch (error: any) {
    if (error.response) {
      console.error(`[usajobs] ❌ API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else {
      console.error(`[usajobs] ❌ Request failed: ${error.message}`);
    }
    return [];
  }
}

function formatSalary(remuneration: any[]): string | undefined {
  if (!remuneration || remuneration.length === 0) return undefined;
  
  const salary = remuneration[0];
  const min = salary.MinimumRange;
  const max = salary.MaximumRange;
  
  if (min && max) {
    return `$${Math.round(min)}-$${Math.round(max)}`;
  }
  
  return undefined;
}

export const usajobsScraper: Scraper = {
  name: 'USAJobs',
  scrape,
};
