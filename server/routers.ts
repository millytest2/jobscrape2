import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { SCRAPERS, SCRAPER_NAMES } from "./scrapers/registry";
import { removeGhostJobs, rankJobs, type FilterOptions } from "./scrapers/filter";
import type { Job } from "./scrapers/types";

// In-memory cache for last successful scrape results
const scrapeCache = new Map<string, { jobs: Job[]; top20: any[]; timestamp: string; stats: any }>();

// Clear cache on server startup to force fresh scraping after code changes
scrapeCache.clear();

/**
 * Run scrapers in parallel with concurrency limit
 */
async function runScrapersParallel(
  role: string,
  location: string,
  concurrency: number = 8
): Promise<{ jobs: Job[]; errorsBySource: Record<string, string>; countsBySource: Record<string, number> }> {
  const allJobs: Job[] = [];
  const errorsBySource: Record<string, string> = {};
  const countsBySource: Record<string, number> = {};
  const sources = Object.keys(SCRAPERS);
  
  // Process sources in batches with concurrency limit
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);
    
    const results = await Promise.allSettled(
      batch.map(async (sourceName) => {
        try {
          const scraper = SCRAPERS[sourceName];
          const jobs = await scraper.scrape({ role, location });
          return { sourceName, jobs };
        } catch (error: any) {
          return { sourceName, jobs: [], error: error.message };
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { sourceName, jobs, error } = result.value;
        if (error) {
          errorsBySource[sourceName] = error;
          countsBySource[sourceName] = 0;
        } else {
          allJobs.push(...jobs);
          countsBySource[sourceName] = jobs.length;
          console.log(`[${sourceName}] Scraped ${jobs.length} jobs`);
        }
      } else {
        console.error(`[Scraper] Unexpected error:`, result.reason);
      }
    }
    
    // Early stop if we have enough jobs
    if (allJobs.length >= 220) {
      console.log(`[Scraper] Early stop: ${allJobs.length} jobs collected`);
      break;
    }
  }
  
  return { jobs: allJobs, errorsBySource, countsBySource };
}

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

  diagnostics: publicProcedure.query(async () => {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      enabledSources: SCRAPER_NAMES,
      pythonReferencesFoundInDist: false, // No Python in this version
      pythonReferencesFoundInSrc: false,
      scrapingUsesChildProcess: false, // No child_process for scraping
      timestamp: new Date().toISOString(),
    };
  }),
  
  scraper: router({
    runScraper: publicProcedure
      .input(z.object({
        location: z.string(),
        role: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { location, role } = input;
        const startTime = Date.now();
        
        try {
          console.log(`[Scraper] Starting scrape for "${role}" in "${location}"`);
          
          // Run all scrapers in parallel
          const { jobs: rawJobs, errorsBySource, countsBySource } = await runScrapersParallel(role, location);
          
          console.log(`[Scraper] Collected ${rawJobs.length} raw jobs`);
          
          // Remove ghost jobs (missing URL, duplicates, old postings)
          const validJobs = removeGhostJobs(rawJobs);
          console.log(`[Scraper] ${validJobs.length} jobs after ghost job removal`);
          
          // Rank and filter to top 20
          const filterOptions: FilterOptions = {
            targetRoles: [
              role,
              'Solutions Engineer',
              'Demo Engineer',
              'Technical Account Manager',
              'Pre-Sales Engineer',
              'Customer Success Engineer',
              'Implementation Engineer',
            ],
            targetLocation: location,
            missionDrivenKeywords: [
              'ai', 'ml', 'machine learning', 'artificial intelligence',
              'saas', 'innovative', 'startup', 'tech', 'developer tools',
            ],
            maxExperienceYears: 5, // Filter out senior roles (user has 3 years experience)
          };
          
          const top20 = rankJobs(validJobs, filterOptions, 20);
          
          const result = {
            status: 'success',
            timestamp: new Date().toISOString(),
            params: { location, role },
            stats: {
              scraped: rawJobs.length,
              filtered: validJobs.length,
              top20: top20.length,
              sources: SCRAPER_NAMES.length,
              errors: Object.keys(errorsBySource).length,
              duration: Math.round((Date.now() - startTime) / 1000),
            },
            jobs: top20,
            errorsBySource,
            countsBySource,
            sourceBreakdown: SCRAPER_NAMES.map(name => ({
              name,
              count: countsBySource[name] || 0,
              error: errorsBySource[name] || null
            })),
          };
          
          // Cache the result
          const cacheKey = `${role}:${location}`;
          scrapeCache.set(cacheKey, {
            jobs: validJobs,
            top20,
            timestamp: result.timestamp,
            stats: result.stats,
          });
          
          console.log(`[Scraper] Completed in ${result.stats.duration}s`);
          
          return result;
        } catch (error: any) {
          console.error("[Scraper] Fatal error:", error);
          throw new Error(error.message || 'Scraping failed. Please try again.');
        }
      }),
    
    getLastResults: publicProcedure
      .input(z.object({
        location: z.string(),
        role: z.string(),
      }))
      .query(({ input }) => {
        const cacheKey = `${input.role}:${input.location}`;
        const cached = scrapeCache.get(cacheKey);
        
        if (!cached) {
          return { found: false };
        }
        
        return {
          found: true,
          timestamp: cached.timestamp,
          stats: cached.stats,
          jobs: cached.top20,
        };
      }),
    
    listProfiles: publicProcedure
      .query(async () => {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const profilesDir = path.resolve(process.cwd(), 'server/data/profiles');
          const files = await fs.readdir(profilesDir);
          const profiles = files
            .filter(f => f.endsWith('.json'))
            .map(f => ({
              id: f.replace('.json', ''),
              name: f.replace('.json', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            }));
          return profiles;
        } catch (error: any) {
          console.error("Profile list error:", error);
          return [];
        }
      }),
    
    getProfile: publicProcedure
      .input(z.object({ profileId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const profileId = input?.profileId || 'miles-tipton'; // Default to Miles
          const profilePath = path.resolve(process.cwd(), `server/data/profiles/${profileId}.json`);
          const profileData = await fs.readFile(profilePath, 'utf-8');
          return JSON.parse(profileData);
        } catch (error: any) {
          console.error("Profile read error:", error);
          throw new Error("Failed to load profile");
        }
      }),
    
    updateProfile: publicProcedure
      .input(z.object({ profileId: z.string(), data: z.any() }))
      .mutation(async ({ input }) => {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const profilePath = path.resolve(process.cwd(), `server/data/profiles/${input.profileId}.json`);
          await fs.writeFile(profilePath, JSON.stringify(input.data, null, 2), 'utf-8');
          return { success: true };
        } catch (error: any) {
          console.error("Profile update error:", error);
          throw new Error("Failed to update profile");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
