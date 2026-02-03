import type { Job } from "./types";
import { scrapeSerpAPI } from "./serpapi";
import { scrapeJooble } from "./jooble";
import { scrapeRemoteOK } from "./remoteok";
import { scrapeWeWorkRemotely } from "./weworkremotely";
import { scrapeCraigslist, scrapeArbeitnow, scrapeTheMuse, scrapeRemotive } from "./remaining";

/**
 * Main job scraper orchestrator
 * Scrapes multiple sources in parallel and combines results
 */
export async function scrapeJobs(
  role: string,
  location: string
): Promise<{
  jobs: Job[];
  stats: {
    scraped: number;
    unique: number;
    top_matches: number;
  };
}> {
  console.log(`[Scraper] Starting scrape for "${role}" in "${location}"`);

  // Expand role to include indirect matches
  const targetRoles = expandRole(role);
  console.log(`[Scraper] Target roles: ${targetRoles.join(", ")}`);

  // Scrape all sources in parallel for each target role
  const scrapePromises = [];
  
  for (const targetRole of targetRoles) {
    // SerpAPI - primary source (Los Angeles only to avoid 400 errors)
    scrapePromises.push(scrapeSerpAPI(targetRole, location));
    
    // Jooble - secondary source
    scrapePromises.push(scrapeJooble(targetRole, location));
  }
  
  // Remote-focused sources (role-agnostic, don't need location)
  scrapePromises.push(scrapeRemoteOK(role));
  scrapePromises.push(scrapeWeWorkRemotely(role));
  scrapePromises.push(scrapeRemotive(role));
  
  // Other sources
  scrapePromises.push(scrapeArbeitnow(role));
  scrapePromises.push(scrapeTheMuse(role, location));
  scrapePromises.push(scrapeCraigslist(role, location));

  const results = await Promise.all(scrapePromises);

  // Combine all jobs
  let allJobs: Job[] = [];
  for (const result of results) {
    if (result.error) {
      console.log(`[Scraper] ${result.source} error: ${result.error}`);
    } else {
      console.log(`[Scraper] ${result.source} found ${result.jobs.length} jobs`);
      allJobs = allJobs.concat(result.jobs);
    }
  }

  // Deduplicate by URL
  const uniqueJobs = deduplicateJobs(allJobs);
  console.log(`[Scraper] ${allJobs.length} total jobs, ${uniqueJobs.length} unique`);

  // Calculate landing probability for each job
  const scoredJobs = uniqueJobs.map(job => {
    const landingProb = calculateLandingProbability(job, role, location);
    return {
      ...job,
      landing_probability: landingProb,
      final_score: landingProb, // Use landing_probability as final_score
      ghost_risk: 0, // Simplified for now
      excitement_factors: [], // Simplified for now
    };
  });

  // Sort by landing probability and take top 20
  const topJobs = scoredJobs
    .sort((a, b) => (b.landing_probability || 0) - (a.landing_probability || 0))
    .slice(0, 20);

  return {
    jobs: topJobs,
    stats: {
      scraped: allJobs.length,
      unique: uniqueJobs.length,
      top_matches: topJobs.length,
    },
  };
}

/**
 * Expand role to include indirect matches
 */
function expandRole(role: string): string[] {
  const roleMap: Record<string, string[]> = {
    "sales engineer": [
      "Sales Engineer",
      "Solutions Engineer",
      "Technical Sales Specialist",
    ],
    "data scientist": [
      "Data Scientist",
      "Applied Scientist",
      "ML Engineer",
    ],
    "product manager": [
      "Product Manager",
      "Senior Product Manager",
      "Technical Product Manager",
    ],
  };

  const key = role.toLowerCase();
  return roleMap[key] || [role];
}

/**
 * Deduplicate jobs by URL
 */
function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    if (!job.url || seen.has(job.url)) {
      return false;
    }
    seen.add(job.url);
    return true;
  });
}

/**
 * Calculate landing probability (0-100)
 * Based on: role match, location match, recency, company size
 */
function calculateLandingProbability(
  job: Job,
  targetRole: string,
  targetLocation: string
): number {
  let score = 50; // Base score

  // Role match (0-30 points)
  const roleMatch = job.title.toLowerCase().includes(targetRole.toLowerCase());
  if (roleMatch) {
    score += 30;
  } else {
    // Partial match
    const roleWords = targetRole.toLowerCase().split(" ");
    const titleWords = job.title.toLowerCase().split(" ");
    const matchCount = roleWords.filter(word => titleWords.includes(word)).length;
    score += (matchCount / roleWords.length) * 30;
  }

  // Location match (0-20 points)
  const locationMatch = 
    job.location.toLowerCase().includes(targetLocation.toLowerCase()) ||
    job.location.toLowerCase().includes("remote");
  if (locationMatch) {
    score += 20;
  }

  // Recency (0-10 points) - assume recent if no date
  if (!job.posted_date || isRecent(job.posted_date)) {
    score += 10;
  }

  // Normalize to 0-100
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Check if job was posted recently (within 14 days)
 */
function isRecent(dateStr: string): boolean {
  try {
    const posted = new Date(dateStr);
    const now = new Date();
    const daysDiff = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 14;
  } catch {
    return true; // Assume recent if can't parse
  }
}
