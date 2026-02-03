/**
 * Job Scraper Types
 */

export interface Job {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  posted_date?: string;
  salary?: string;
  description?: string;
  final_score?: number;
  landing_probability?: number;
  ghost_risk?: number;
  ghost_factors?: string[];
  excitement_factors?: string[];
  mission_score?: number;
  applicant_count?: number;
}

export interface ScraperConfig {
  maxResults?: number;
  timeout?: number;
}

export interface ScraperResult {
  jobs: Job[];
  source: string;
  error?: string;
}
