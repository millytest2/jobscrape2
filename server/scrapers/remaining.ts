import type { Job, ScraperResult } from "./types";

/**
 * Craigslist scraper - simplified version without HTML parsing
 * Returns empty for now since Craigslist requires complex HTML parsing
 */
export async function scrapeCraigslist(role: string, location: string): Promise<ScraperResult> {
  // Craigslist requires complex HTML parsing and anti-bot measures
  // For production, we'll skip this source or use a paid API
  return { jobs: [], source: "Craigslist" };
}

/**
 * Arbeitnow API scraper
 */
export async function scrapeArbeitnow(role: string): Promise<ScraperResult> {
  try {
    const url = "https://www.arbeitnow.com/api/job-board-api";
    
    const response = await fetch(url);
    if (!response.ok) {
      return { jobs: [], source: "Arbeitnow", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return { jobs: [], source: "Arbeitnow" };
    }

    // Filter for role match
    const roleKeywords = role.toLowerCase().split(" ");
    const filteredJobs = data.data.filter((job: any) => {
      const jobText = `${job.title || ""} ${job.description || ""}`.toLowerCase();
      return roleKeywords.some(keyword => jobText.includes(keyword));
    });

    const jobs: Job[] = filteredJobs.slice(0, 10).map((job: any) => ({
      title: job.title || "",
      company: job.company_name || "",
      location: job.location || "Remote",
      url: job.url || "",
      source: "Arbeitnow",
      posted_date: job.created_at || "",
      description: job.description || "",
    }));

    return { jobs, source: "Arbeitnow" };
  } catch (error) {
    return {
      jobs: [],
      source: "Arbeitnow",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * The Muse API scraper
 */
export async function scrapeTheMuse(role: string, location: string): Promise<ScraperResult> {
  try {
    const url = `https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&page=0`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return { jobs: [], source: "The Muse", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { jobs: [], source: "The Muse" };
    }

    const jobs: Job[] = data.results.slice(0, 20).map((job: any) => ({
      title: job.name || "",
      company: job.company?.name || "",
      location: job.locations?.[0]?.name || location,
      url: job.refs?.landing_page || "",
      source: "The Muse",
      posted_date: job.publication_date || "",
      description: job.contents || "",
    }));

    return { jobs, source: "The Muse" };
  } catch (error) {
    return {
      jobs: [],
      source: "The Muse",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remotive API scraper
 */
export async function scrapeRemotive(role: string): Promise<ScraperResult> {
  try {
    const url = "https://remotive.com/api/remote-jobs?category=software-dev";
    
    const response = await fetch(url);
    if (!response.ok) {
      return { jobs: [], source: "Remotive", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.jobs || data.jobs.length === 0) {
      return { jobs: [], source: "Remotive" };
    }

    // Filter for role match
    const roleKeywords = role.toLowerCase().split(" ");
    const filteredJobs = data.jobs.filter((job: any) => {
      const jobText = `${job.title || ""} ${job.description || ""}`.toLowerCase();
      return roleKeywords.some(keyword => jobText.includes(keyword));
    });

    const jobs: Job[] = filteredJobs.slice(0, 10).map((job: any) => ({
      title: job.title || "",
      company: job.company_name || "",
      location: "Remote",
      url: job.url || "",
      source: "Remotive",
      posted_date: job.publication_date || "",
      salary: job.salary || "",
      description: job.description || "",
    }));

    return { jobs, source: "Remotive" };
  } catch (error) {
    return {
      jobs: [],
      source: "Remotive",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
