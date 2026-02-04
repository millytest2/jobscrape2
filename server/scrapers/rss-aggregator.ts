import Parser from 'rss-parser';
import type { Job } from './types';

const parser = new Parser();

const RSS_FEEDS = [
  { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', name: 'weworkremotely' },
  { url: 'https://remotive.com/api/remote-jobs/feed', name: 'remotive-rss' },
  { url: 'https://stackoverflow.com/jobs/feed', name: 'stackoverflow' }
];

export async function scrapeRSSFeeds(role: string, location: string): Promise<Job[]> {
  const allJobs: Job[] = [];
  const roleKeywords = role.toLowerCase().split(' ');
  
  console.log(`[rss-aggregator] Starting scrape for "${role}" in "${location}"`);
  
  for (const feed of RSS_FEEDS) {
    try {
      console.log(`[rss-aggregator] Fetching ${feed.name}...`);
      
      const feedData = await parser.parseURL(feed.url);
      
      const jobs = feedData.items
        .filter(item => {
          const title = (item.title || '').toLowerCase();
          const content = (item.contentSnippet || item.content || '').toLowerCase();
          
          // Check if any role keyword appears in title or content
          return roleKeywords.some(keyword => 
            title.includes(keyword) || content.includes(keyword)
          );
        })
        .map(item => ({
          title: item.title || '',
          company: extractCompany(item),
          location: extractLocation(item, location),
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source: `RSS (${feed.name})`,
          postedDate: item.pubDate || item.isoDate
        }));
      
      console.log(`[rss-aggregator] ${feed.name}: Found ${jobs.length} matching jobs`);
      allJobs.push(...jobs);
      
    } catch (error: any) {
      console.error(`[rss-aggregator] ❌ ${feed.name} failed: ${error.message}`);
    }
  }
  
  console.log(`[rss-aggregator] ✅ Total: ${allJobs.length} jobs from ${RSS_FEEDS.length} feeds`);
  return allJobs;
}

function extractCompany(item: any): string {
  // Try to parse company from title like "Company Name: Job Title"
  const match = item.title?.match(/^([^:]+):/);
  if (match) return match[1].trim();
  
  // Try to parse from content
  const contentMatch = item.contentSnippet?.match(/Company:\s*([^\n]+)/i);
  if (contentMatch) return contentMatch[1].trim();
  
  return 'Unknown';
}

function extractLocation(item: any, searchLocation: string): string {
  const content = (item.contentSnippet || item.content || '').toLowerCase();
  
  // Check for remote
  if (content.includes('remote') || content.includes('anywhere')) {
    return 'Remote';
  }
  
  // Check for specific location mentions
  if (content.includes(searchLocation.toLowerCase())) {
    return searchLocation;
  }
  
  // Try to extract location from content
  const locationMatch = item.contentSnippet?.match(/Location:\s*([^\n]+)/i);
  if (locationMatch) return locationMatch[1].trim();
  
  return 'Remote'; // Default to remote for RSS feeds
}
