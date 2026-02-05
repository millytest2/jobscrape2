/**
 * Job scraper types for Node/TypeScript implementation
 * Phase 1: Basic types for RemoteOK, WeWorkRemotely, Remotive
 */

export interface Job {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  postedDate?: string;
  salary?: string;
  description?: string;
  score?: number; // Added by rankJobs() function
  scoreExplanation?: string; // Added by rankJobs() function
}

export interface ScrapeParams {
  role: string;
  location: string;
}

export interface ScrapeResult {
  jobs: Job[];
  source: string;
  error?: string;
}

export interface Scraper {
  name: string;
  scrape: (params: ScrapeParams) => Promise<Job[]>;
}

export interface ScraperRegistry {
  [key: string]: Scraper;
}
