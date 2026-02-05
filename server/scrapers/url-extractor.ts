/**
 * URL Extractor - Extracts direct company URLs from aggregator redirect links
 * 
 * Many job boards (ZipRecruiter, Indeed, LinkedIn, etc.) use redirect URLs that
 * point back to their own site instead of the actual company job posting.
 * 
 * This utility attempts to extract the original company URL from these redirects.
 */



/**
 * Extract direct company URL from aggregator redirect
 * 
 * @param url - The original URL (might be a redirect)
 * @param source - The source name (e.g., "Jooble", "SerpAPI")
 * @returns Direct company URL if found, otherwise original URL
 */
export function extractDirectUrl(url: string, source: string): string {
  try {
    // Check if URL is from known aggregators
    const aggregators = [
      'ziprecruiter.com',
      'indeed.com',
      'linkedin.com/jobs',
      'glassdoor.com',
      'monster.com',
      'careerbuilder.com',
      'simplyhired.com',
    ];
    
    const isAggregator = aggregators.some(agg => url.includes(agg));
    
    if (!isAggregator) {
      return url; // Not an aggregator, return as-is
    }
    
    // Try to extract direct URL from query parameters
    const directUrl = extractFromQueryParams(url);
    if (directUrl) {
      console.log(`[URL Extractor] ${source}: Found direct URL in query params`);
      return directUrl;
    }
    
    return url; // Couldn't extract, return original
    
  } catch (error) {
    console.error(`[URL Extractor] Error extracting URL: ${error}`);
    return url; // On error, return original URL
  }
}

/**
 * Extract direct URL from query parameters
 * Common patterns:
 * - ?url=https://company.com/jobs/123
 * - ?redirect=https://company.com/jobs/123
 * - ?link=https://company.com/jobs/123
 */
function extractFromQueryParams(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Check common parameter names
    const paramNames = ['url', 'redirect', 'link', 'target', 'dest', 'destination', 'ref'];
    
    for (const param of paramNames) {
      const value = params.get(param);
      if (value && value.startsWith('http')) {
        // Decode URL-encoded value
        return decodeURIComponent(value);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}



/**
 * Batch extract direct URLs from multiple jobs
 * Processes synchronously (no HTTP requests)
 */
export function batchExtractDirectUrls(
  jobs: Array<{ url: string; source: string }>
): Map<string, string> {
  const urlMap = new Map<string, string>();
  
  for (const job of jobs) {
    const directUrl = extractDirectUrl(job.url, job.source);
    urlMap.set(job.url, directUrl);
  }
  
  return urlMap;
}
