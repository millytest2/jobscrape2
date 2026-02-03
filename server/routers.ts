import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ============================================================================
// JOB SCRAPER - Node.js Implementation
// ============================================================================

const SERPAPI_KEY = "5b8384737ad51a6dc40c3ad037895b1ea4262d80e1489ae6a67f58109f256456";
const JOOBLE_KEY = "c6b7f43f-3c5f-4e2b-b5c2-f7f8e5e5e5e5";

interface Job {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  source: string;
  posted_date?: string;
  salary?: string;
  landing_probability?: number;
  mission_score?: number;
}

// ============================================================================
// SCRAPERS
// ============================================================================

async function scrapeSerpAPI(location: string, role: string, maxResults: number = 50): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    // Ensure location has state for better results
    if (!location.includes(',')) {
      location = `${location}, CA`;
    }
    
    const params = new URLSearchParams({
      engine: "google_jobs",
      q: role,
      location: location,
      api_key: SERPAPI_KEY,
      num: maxResults.toString()
    });
    
    const response = await fetch(`https://serpapi.com/search?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.jobs_results) {
      for (const job of data.jobs_results) {
        jobs.push({
          title: job.title || "",
          company: job.company_name || "",
          location: job.location || "",
          url: job.apply_options?.[0]?.link || job.related_links?.[0]?.link || job.share_link || "",
          description: job.description || "",
          source: "SerpAPI",
          posted_date: job.detected_extensions?.posted_at || "",
          salary: job.detected_extensions?.salary || ""
        });
      }
    }
    
    console.log(`[SerpAPI] Scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[SerpAPI] Error: ${error.message}`);
  }
  
  return jobs;
}

async function scrapeRemoteOK(role: string): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`RemoteOK error: ${response.status}`);
    }
    
    const data = await response.json();
    const roleKeywords = role.toLowerCase().split(' ');
    
    for (const job of data.slice(1)) { // Skip first item (metadata)
      const title = (job.position || "").toLowerCase();
      const description = (job.description || "").toLowerCase();
      
      // Check if job matches role
      const matchesRole = roleKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      if (matchesRole) {
        jobs.push({
          title: job.position || "",
          company: job.company || "",
          location: job.location || "Remote",
          url: `https://remoteok.com/remote-jobs/${job.slug}`,
          description: job.description || "",
          source: "RemoteOK",
          posted_date: job.date || "",
          salary: ""
        });
      }
    }
    
    console.log(`[RemoteOK] Scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[RemoteOK] Error: ${error.message}`);
  }
  
  return jobs;
}

async function scrapeWeWorkRemotely(role: string): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    const response = await fetch('https://weworkremotely.com/remote-jobs.rss');
    
    if (!response.ok) {
      throw new Error(`WeWorkRemotely error: ${response.status}`);
    }
    
    const text = await response.text();
    const roleKeywords = role.toLowerCase().split(' ');
    
    // Simple RSS parsing
    const items = text.split('<item>').slice(1);
    
    for (const item of items) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1];
        const description = descMatch ? descMatch[1] : "";
        
        // Check if job matches role
        const matchesRole = roleKeywords.some(keyword => 
          title.toLowerCase().includes(keyword) || description.toLowerCase().includes(keyword)
        );
        
        if (matchesRole) {
          // Parse title format: "Company: Job Title"
          const parts = title.split(':');
          const company = parts.length > 1 ? parts[0].trim() : "";
          const jobTitle = parts.length > 1 ? parts.slice(1).join(':').trim() : title;
          
          jobs.push({
            title: jobTitle,
            company: company,
            location: "Remote",
            url: linkMatch[1],
            description: description,
            source: "WeWorkRemotely",
            posted_date: "",
            salary: ""
          });
        }
      }
    }
    
    console.log(`[WeWorkRemotely] Scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[WeWorkRemotely] Error: ${error.message}`);
  }
  
  return jobs;
}

async function scrapeJooble(location: string, role: string, maxResults: number = 50): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    const response = await fetch('https://jooble.org/api/' + JOOBLE_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: role,
        location: location,
        page: 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Jooble error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.jobs) {
      for (const job of data.jobs.slice(0, maxResults)) {
        jobs.push({
          title: job.title || "",
          company: job.company || "",
          location: job.location || "",
          url: job.link || "",
          description: job.snippet || "",
          source: "Jooble",
          posted_date: job.updated || "",
          salary: job.salary || ""
        });
      }
    }
    
    console.log(`[Jooble] Scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[Jooble] Error: ${error.message}`);
  }
  
  return jobs;
}

async function scrapeArbeitnow(role: string): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Arbeitnow error: ${response.status}`);
    }
    
    const data = await response.json();
    const roleKeywords = role.toLowerCase().split(' ');
    
    if (data.data) {
      for (const job of data.data) {
        const title = (job.title || "").toLowerCase();
        const description = (job.description || "").toLowerCase();
        
        const matchesRole = roleKeywords.some(keyword => 
          title.includes(keyword) || description.includes(keyword)
        );
        
        if (matchesRole) {
          jobs.push({
            title: job.title || "",
            company: job.company_name || "",
            location: job.location || "Remote",
            url: job.url || "",
            description: job.description || "",
            source: "Arbeitnow",
            posted_date: job.created_at || "",
            salary: ""
          });
        }
      }
    }
    
    console.log(`[Arbeitnow] Scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[Arbeitnow] Error: ${error.message}`);
  }
  
  return jobs;
}

async function scrapeRemotive(location: string, role: string, maxResults: number = 50): Promise<Job[]> {
  const jobs: Job[] = [];
  try {
    const response = await fetch('https://remotive.com/api/remote-jobs', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Remotive error: ${response.status}`);
    }
    
    const data = await response.json();
    const roleKeywords = role.toLowerCase().split(' ');
    
    if (data.jobs) {
      for (const job of data.jobs.slice(0, maxResults)) {
        const title = (job.title || "").toLowerCase();
        const description = (job.description || "").toLowerCase();
        
        const matchesRole = roleKeywords.some(keyword => 
          title.includes(keyword) || description.includes(keyword)
        );
        
        if (matchesRole) {
          jobs.push({
            title: job.title || "",
            company: job.company_name || "",
            location: job.candidate_required_location || "Remote",
            url: job.url || "",
            description: job.description || "",
            source: "Remotive",
            posted_date: job.publication_date || "",
            salary: job.salary || ""
          });
        }
      }
    }
    
    console.log(`[Remotive] Scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[Remotive] Error: ${error.message}`);
  }
  
  return jobs;
}

// ============================================================================
// FILTERS
// ============================================================================

function calculateMissionScore(company: string, description: string): number {
  const missionKeywords = [
    'ai', 'ml', 'machine learning', 'artificial intelligence', 'innovation',
    'research', 'cutting edge', 'breakthrough', 'transform', 'revolutionize',
    'impact', 'mission', 'vision', 'purpose', 'change the world', 'make a difference'
  ];
  
  const text = `${company} ${description}`.toLowerCase();
  let score = 0;
  
  for (const keyword of missionKeywords) {
    if (text.includes(keyword)) {
      score += 10;
    }
  }
  
  return Math.min(score, 100);
}

function calculateLandingProbability(job: Job, userPrefs: any): number {
  let score = 50; // Base score
  
  // Factor 1: Role match (check if title contains role keywords)
  const roleKeywords = userPrefs.role.toLowerCase().split(' ');
  const titleLower = job.title.toLowerCase();
  const roleMatches = roleKeywords.filter((keyword: string) => titleLower.includes(keyword)).length;
  score += roleMatches * 10;
  
  // Factor 2: Location match
  if (job.location.toLowerCase().includes(userPrefs.location.toLowerCase()) || 
      job.location.toLowerCase().includes('remote')) {
    score += 10;
  }
  
  // Factor 3: Recency (jobs with posted_date get bonus)
  const postedDate = String(job.posted_date || '');
  if (postedDate.includes('day')) {
    score += 15;
  } else if (postedDate.includes('week')) {
    score += 10;
  }
  
  // Factor 4: Mission-driven company
  const missionScore = calculateMissionScore(job.company, job.description || "");
  if (missionScore >= 35) {
    score += 10;
  }
  
  // Factor 5: Salary info available
  if (job.salary && job.salary.length > 0) {
    score += 5;
  }
  
  return Math.min(Math.max(score, 0), 100);
}

function filterMissionDriven(jobs: Job[], threshold: number = 35): Job[] {
  return jobs.filter(job => {
    const score = calculateMissionScore(job.company, job.description || "");
    job.mission_score = score;
    return score >= threshold;
  });
}

function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const unique: Job[] = [];
  
  for (const job of jobs) {
    const key = `${job.company.toLowerCase().trim()}|${job.title.toLowerCase().trim()}`;
    if (!seen.has(key) && job.company && job.title) {
      seen.add(key);
      unique.push(job);
    }
  }
  
  return unique;
}

// ============================================================================
// MAIN SCRAPER FUNCTION
// ============================================================================

async function scrapeAllJobs(location: string, role: string): Promise<any> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SCRAPING PHASE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Location: ${location}`);
  console.log(`Role: ${role}`);
  
  const allJobs: Job[] = [];
  
  // Scrape all sources in parallel for speed
  const scrapers = [
    scrapeSerpAPI(location, role, 50),
    scrapeRemoteOK(role),
    scrapeWeWorkRemotely(role),
    scrapeJooble(`${location}, CA`, role, 50),
    scrapeArbeitnow(role),
    scrapeRemotive(location, role, 50)
  ];
  
  const results = await Promise.allSettled(scrapers);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
    }
  }
  
  console.log(`\nTotal jobs scraped: ${allJobs.length}`);
  
  // Deduplicate
  const uniqueJobs = deduplicateJobs(allJobs);
  console.log(`After deduplication: ${uniqueJobs.length} unique jobs`);
  
  // Filter mission-driven
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FILTERING PHASE`);
  console.log(`${'='.repeat(60)}`);
  
  const missionJobs = filterMissionDriven(uniqueJobs, 35);
  console.log(`Mission-driven companies: ${missionJobs.length} jobs`);
  
  // Calculate landing probability
  const userPrefs = {
    role: role,
    location: location,
    seniority: "mid",
    company_size_preference: "small",
    remote_preference: "flexible"
  };
  
  for (const job of missionJobs) {
    job.landing_probability = calculateLandingProbability(job, userPrefs);
  }
  
  // Sort by landing probability
  missionJobs.sort((a, b) => (b.landing_probability || 0) - (a.landing_probability || 0));
  
  // Get top 20
  const topJobs = missionJobs.slice(0, 20);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULTS SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Scraped: ${allJobs.length} jobs from 6 sources`);
  console.log(`Mission-driven: ${missionJobs.length} jobs (score >= 35)`);
  console.log(`Top matches: ${topJobs.length} jobs`);
  
  return {
    status: "success",
    params: {
      location: location,
      role: role
    },
    stats: {
      scraped: allJobs.length,
      unique: uniqueJobs.length,
      mission_driven: missionJobs.length,
      top_matches: topJobs.length
    },
    jobs: topJobs
  };
}

// ============================================================================
// TRPC ROUTER
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  scraper: router({
    runScraper: publicProcedure
      .input(z.object({
        location: z.string(),
        role: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { location, role } = input;
        
        try {
          console.log(`[Scraper] Starting job scrape for ${role} in ${location}`);
          
          // Run Node.js scraper
          const result = await scrapeAllJobs(location, role);
          
          console.log(`[Scraper] Complete! Found ${result.stats.top_matches} top matches`);
          
          return result;
        } catch (error: any) {
          console.error("[Scraper] Error:", error);
          throw new Error(error.message || "Failed to run scraper");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
