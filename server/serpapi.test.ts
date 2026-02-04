/**
 * Test to validate SerpAPI key
 */

import { describe, it, expect } from 'vitest';

describe('SerpAPI Key Validation', () => {
  it('should have SERPAPI_KEY configured', () => {
    expect(process.env.SERPAPI_KEY).toBeDefined();
    expect(process.env.SERPAPI_KEY).not.toBe('');
  });

  it('should successfully call SerpAPI with configured key', async () => {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      throw new Error('SERPAPI_KEY not configured');
    }

    // Make a lightweight test call to SerpAPI
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', 'Software Engineer');
    url.searchParams.set('location', 'San Francisco, CA');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '1'); // Only fetch 1 result for testing

    const response = await fetch(url.toString());
    
    // Check if API key is valid (should return 200, not 401/403)
    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should have jobs_results or search_metadata (valid response structure)
    expect(data).toHaveProperty('search_metadata');
  }, 30000); // 30s timeout for API call
});
