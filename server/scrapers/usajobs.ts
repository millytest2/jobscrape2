import axios from 'axios';
import type { Job } from './types';

export async function scrapeUSAJobs(role: string, location: string): Promise<Job[]> {
  const apiKey = process.env.USAJOBS_API_KEY || '';
  const userAgent = process.env.USAJOBS_USER_AGENT || 'JobScraperApp/1.0 (contact@example.com)';
  
  // API key is optional for USAJobs
  if (!apiKey) {
    console.log('[usajobs] Running without API key (limited results)');
  }

  try {
    console.log(`[usajobs] Starting scrape for "${role}" in "${location}"`);
    
    const response = await axios.get('https://data.usajobs.gov/api/search', {
      params: {
        Keyword: role,
        LocationName: location,
        ResultsPerPage: 50,
        SortField: 'OpenDate', // Newest first
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
      console.log('[usajobs] ⚠️ No results found');
      return [];
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

    console.log(`[usajobs] ✅ Found ${jobs.length} government jobs`);
    return jobs;

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
