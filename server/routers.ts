import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as path from "path";
import { promises as fs } from "fs";
import { SCRAPERS, SCRAPER_NAMES } from "./scrapers/registry";
import { removeGhostJobs, rankJobs, type FilterOptions } from "./scrapers/filter";
import type { Job } from "./scrapers/types";

// In-memory cache for last successful scrape results
const scrapeCache = new Map<string, { runId: string; jobs: Job[]; top20: any[]; timestamp: string; stats: any }>();

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
        const sourceStartTime = Date.now();
        const sourceStartedAt = new Date().toISOString();
        try {
          console.log(`[${sourceName}] Starting scrape for role="${role}" location="${location}"`);
          const scraper = SCRAPERS[sourceName];
          const jobs = await scraper.scrape({ role, location });
          const durationMs = Date.now() - sourceStartTime;
          console.log(`[${sourceName}] ✓ Completed in ${durationMs}ms | Jobs: ${jobs.length}`);
          return { sourceName, jobs, durationMs, startedAt: sourceStartedAt };
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
        forceFresh: z.boolean().optional().default(true),
      }))
      .mutation(async ({ input }) => {
        const { location, role, forceFresh } = input;
        
        // Generate unique runId for this scrape
        const runId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const startTime = Date.now();
        const startedAt = new Date().toISOString();
        
        console.log(`[Scraper] ========== NEW RUN: ${runId} ==========`);
        console.log(`[Scraper] Role: "${role}", Location: "${location}", ForceFresh: ${forceFresh}`);
        console.log(`[Scraper] Started at: ${startedAt}`);
        
        try {
          // Check cache only if forceFresh is false
          const cacheKey = `${role}:${location}`;
          
          if (!forceFresh && scrapeCache.has(cacheKey)) {
            const cached = scrapeCache.get(cacheKey)!;
            const cachedAgeSeconds = Math.round((Date.now() - new Date(cached.timestamp).getTime()) / 1000);
            console.log(`[Scraper] Returning CACHED results (age: ${cachedAgeSeconds}s)`);
            
            return {
              status: 'success',
              runId,
              usedCache: true,
              cachedRunId: cached.runId || 'unknown',
              cachedAgeSeconds,
              timestamp: cached.timestamp,
              params: { location, role },
              stats: cached.stats,
              jobs: cached.top20,
              sourceBreakdown: [],
              errorsBySource: {},
              countsBySource: {},
            };
          }
          
          // Force fresh scrape
          scrapeCache.delete(cacheKey);
          console.log(`[Scraper] FRESH SCRAPE - cache cleared`);
          
          // Load profile to get company preferences, red flags, and skills
          const profilePath = path.join(process.cwd(), 'server', 'data', 'profiles', 'miles-tipton.json');
          let profile: any = {};
          try {
            const profileData = await fs.readFile(profilePath, 'utf-8');
            profile = JSON.parse(profileData);
          } catch (error) {
            console.warn('[Scraper] Could not load profile, using defaults');
          }
          
          // Run all scrapers in parallel
          const { jobs: rawJobs, errorsBySource, countsBySource } = await runScrapersParallel(role, location);
          
          console.log(`[Scraper] Collected ${rawJobs.length} raw jobs`);
          
          // Remove ghost jobs (missing URL, duplicates, old postings)
          const validJobs = removeGhostJobs(rawJobs);
          console.log(`[Scraper] ${validJobs.length} jobs after ghost job removal`);
          
          // Rank and filter to top 20 using profile data
          const filterOptions: FilterOptions = {
            targetRoles: [
              role,
              ...(profile.target_roles?.direct || []),
              ...(profile.target_roles?.indirect || []),
            ],
            targetLocation: location,
            missionDrivenKeywords: profile.company_preferences?.mission_driven_keywords || [
              'ai', 'ml', 'machine learning', 'artificial intelligence',
              'saas', 'innovative', 'startup', 'tech', 'developer tools',
            ],
            maxExperienceYears: profile.experience_summary?.total_years || 5,
            companyPreferences: {
              size: profile.company_preferences?.size || [],
              stage: profile.company_preferences?.stage || [],
              industries: profile.company_preferences?.industries || [],
            },
            redFlags: Array.isArray(profile.red_flags) ? profile.red_flags : (profile.red_flags?.avoid || []),
            skills: {
              technical: profile.skills?.technical || [],
              sales: profile.skills?.sales || [],
              soft: profile.skills?.soft_skills || [], // Note: profile has 'soft_skills' not 'soft'
            },
          };
          
          console.log(`[Scraper] Filter options:`, {
            targetRoles: filterOptions.targetRoles.length,
            missionKeywords: filterOptions.missionDrivenKeywords?.length,
            technicalSkills: filterOptions.skills?.technical?.length,
            salesSkills: filterOptions.skills?.sales?.length,
            softSkills: filterOptions.skills?.soft?.length,
          });
          
          const top20 = rankJobs(validJobs, filterOptions, 20);
          
          const finishedAt = new Date().toISOString();
          const durationMs = Date.now() - startTime;
          
          // Final summary log
          console.log(`[Scraper] ========== RUN COMPLETE: ${runId} ==========`);
          console.log(`[Scraper] Duration: ${durationMs}ms (${Math.round(durationMs / 1000)}s)`);
          console.log(`[Scraper] Total jobs: ${rawJobs.length}, Unique: ${validJobs.length}, Top 20: ${top20.length}`);
          console.log(`[Scraper] Per-source counts:`, countsBySource);
          console.log(`[Scraper] Errors:`, errorsBySource);
          
          const result = {
            status: 'success',
            runId,
            usedCache: false,
            startedAt,
            finishedAt,
            timestamp: finishedAt,
            params: { location, role },
            stats: {
              scraped: rawJobs.length,
              filtered: validJobs.length,
              top20: top20.length,
              sources: SCRAPER_NAMES.length,
              errors: Object.keys(errorsBySource).length,
              duration: Math.round(durationMs / 1000),
              durationMs,
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
          scrapeCache.set(cacheKey, {
            runId,
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
