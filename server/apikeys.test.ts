/**
 * Test to validate Jooble and SerpAPI keys
 */

import { describe, it, expect } from 'vitest';

describe('API Keys Validation', () => {
  it('should have JOOBLE_API_KEY configured', () => {
    expect(process.env.JOOBLE_API_KEY).toBeDefined();
    expect(process.env.JOOBLE_API_KEY).not.toBe('');
  });

  it('should have SERPAPI_KEY configured', () => {
    expect(process.env.SERPAPI_KEY).toBeDefined();
    expect(process.env.SERPAPI_KEY).not.toBe('');
  });

  it('should successfully call Jooble API with configured key', async () => {
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) {
      throw new Error('JOOBLE_API_KEY not configured');
    }

    // Make a lightweight test call to Jooble
    const response = await fetch('https://jooble.org/api/' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: 'test',
        location: 'Los Angeles',
        page: 1
      })
    });
    
    // Check if API key is valid (should return 200, not 401/403)
    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should have jobs array (valid response structure)
    expect(data).toHaveProperty('jobs');
  }, 30000); // 30s timeout for API call

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
    
    // Should have search_metadata (valid response structure)
    expect(data).toHaveProperty('search_metadata');
  }, 30000); // 30s timeout for API call
});
