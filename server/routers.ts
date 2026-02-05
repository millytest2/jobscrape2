import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as path from "path";
import { promises as fs } from "fs";
import { SCRAPERS, SCRAPER_NAMES } from "./scrapers/registry";
import { removeGhostJobs, rankJobs, type FilterOptions } from "./scrapers/filter";
import type { Job } from "./scrapers/types";
import { logToFile } from "./utils/logger";

// In-memory cache for last successful scrape results
const scrapeCache = new Map<string, { runId: string; jobs: Job[]; top20: any[]; timestamp: string; stats: any }>();

// Clear cache on server startup to force fresh scraping after code changes
scrapeCache.clear();

// Helper to clear cache manually
export function clearScrapeCache() {
  scrapeCache.clear();
  console.log('[Cache] Cleared all scrape cache');
}

/**
 * Run scrapers in parallel with concurrency limit
 */
async function runScrapersParallel(
  role: string,
  location: string,
  concurrency: number = 8
): Promise<{ jobs: Job[]; errorsBySource: Record<string, string>; countsBySource: Record<string, number> }> {
  const runId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const allJobs: Job[] = [];
  const errorsBySource: Record<string, string> = {};
  const countsBySource: Record<string, number> = {};
  const sources = Object.keys(SCRAPERS);
  
  // FILE LOGGING - runScrapersParallel START
  logToFile(`\n🚀 runScrapersParallel START runId=${runId}`);
  logToFile(`📋 Total scrapers registered: ${sources.length}`);
  logToFile(`📝 Names: [${sources.join(', ')}]`);
  
  console.log(`🚀 RUN_START ${runId} role="${role}" location="${location}"`);
  console.log(`📋 SCRAPERS_TOTAL ${runId} count=${sources.length}`);
  console.log(`📝 ENABLED_LIST ${runId} names=[${sources.join(', ')}]`);
  
  // Process sources in batches with concurrency limit
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);
    
    const results = await Promise.allSettled(
      batch.map(async (sourceName) => {
        const sourceStartTime = Date.now();
        const sourceStartedAt = new Date().toISOString();
        logToFile(`▶️  CALL ${sourceName}`);
        console.log(`▶️  CALL_START ${runId} name=${sourceName}`);
        
        try {
          const scraper = SCRAPERS[sourceName];
          
          // Add 40-second timeout to prevent hanging (SerpAPI needs more time)
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 40000)
          );
          
          const jobs = await Promise.race([
            scraper.scrape({ role, location }),
            timeoutPromise
          ]);
          
          const durationMs = Date.now() - sourceStartTime;
          logToFile(`✅ ${sourceName}: ${jobs.length} jobs in ${durationMs}ms`);
          console.log(`✅ CALL_END ${runId} name=${sourceName} jobs=${jobs.length} duration=${durationMs}ms`);
          return { sourceName, jobs, durationMs, startedAt: sourceStartedAt };
        } catch (error: any) {
          const durationMs = Date.now() - sourceStartTime;
          const errorMsg = error.message || 'Unknown error';
          const stackTop = error.stack?.split('\n')[0] || '';
          logToFile(`❌ ${sourceName}: ERROR ${errorMsg}`);
          console.error(`❌ CALL_ERROR ${runId} name=${sourceName} duration=${durationMs}ms error="${errorMsg}" stack="${stackTop}"`);
          return { sourceName, jobs: [], error: errorMsg };
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { sourceName, jobs, error } = result.value;
        if (error) {
          console.error(`[${sourceName}] ❌ Error: ${error}`);
          errorsBySource[sourceName] = error;
          countsBySource[sourceName] = 0;
        } else {
          allJobs.push(...jobs);
          countsBySource[sourceName] = jobs.length;
          if (jobs.length === 0) {
            console.warn(`[${sourceName}] ⚠️ Returned 0 jobs (no error thrown)`);
          } else {
            console.log(`[${sourceName}] ✅ Scraped ${jobs.length} jobs`);
          }
        }
      } else {
        const sourceName = batch[results.indexOf(result)];
        console.error(`[${sourceName}] ❌ Unexpected error:`, result.reason);
        errorsBySource[sourceName] = String(result.reason);
        countsBySource[sourceName] = 0;
      }
    }
    
    // Removed early stop logic - let all scrapers run to get maximum coverage
  }
  
  // FILE LOGGING - runScrapersParallel END
  logToFile(`🏁 runScrapersParallel END: ${allJobs.length} total jobs`);
  
  console.log(`🏁 RUN_END ${runId} totalJobs=${allJobs.length} errors=${Object.keys(errorsBySource).length}\n`);
  
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
      registeredScrapers: Object.keys(SCRAPERS).map(key => ({
        key,
        name: SCRAPERS[key].name,
        hasScrapeFn: typeof SCRAPERS[key].scrape === 'function'
      })),
      pythonReferencesFoundInDist: false, // No Python in this version
      pythonReferencesFoundInSrc: false,
      scrapingUsesChildProcess: false, // No child_process for scraping
      timestamp: new Date().toISOString(),
    };
  }),
  
  testScraper: publicProcedure
    .input(z.object({
      scraperName: z.string(),
      role: z.string(),
      location: z.string()
    }))
    .query(async ({ input }) => {
      console.log(`\n🧪 TEST_SCRAPER_START name=${input.scraperName}`);
      
      const scraper = SCRAPERS[input.scraperName];
      
      if (!scraper) {
        console.log(`❌ TEST_SCRAPER_NOT_FOUND name=${input.scraperName}`);
        console.log(`Available scrapers: ${Object.keys(SCRAPERS).join(', ')}`);
        return { error: `Scraper '${input.scraperName}' not found` };
      }
      
      console.log(`✅ TEST_SCRAPER_FOUND name=${input.scraperName} scraperName="${scraper.name}" fnType=${typeof scraper.scrape}`);
      
      try {
        const startTime = Date.now();
        console.log(`▶️  TEST_SCRAPER_CALLING name=${input.scraperName}`);
        
        const jobs = await scraper.scrape({ role: input.role, location: input.location });
        const duration = Date.now() - startTime;
        
        console.log(`✅ TEST_SCRAPER_SUCCESS name=${input.scraperName} jobs=${jobs.length} duration=${duration}ms`);
        
        return {
          success: true,
          scraperName: input.scraperName,
          scraperDisplayName: scraper.name,
          jobCount: jobs.length,
          duration,
          sampleJob: jobs[0] || null
        };
      } catch (error: any) {
        console.error(`❌ TEST_SCRAPER_ERROR name=${input.scraperName} error="${error.message}"`);
        console.error(error.stack);
        
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    }),
  
  testAllScrapers: publicProcedure
    .input(z.object({
      role: z.string(),
      location: z.string()
    }))
    .query(async ({ input }) => {
      console.log(`\n🧪 TESTING ALL SCRAPERS INDIVIDUALLY`);
      console.log(`Role: ${input.role}`);
      console.log(`Location: ${input.location}`);
      
      const results = [];
      const sources = Object.keys(SCRAPERS);
      
      for (const sourceName of sources) {
        const testStart = Date.now();
        const scraper = SCRAPERS[sourceName];
        console.log(`\n▶️  Testing ${scraper.name}...`);
        
        try {
          const jobs = await scraper.scrape({ role: input.role, location: input.location });
          const duration = Date.now() - testStart;
          
          const result = {
            name: scraper.name,
            key: sourceName,
            success: true,
            jobCount: jobs.length,
            duration: `${duration}ms`,
            sampleTitles: jobs.slice(0, 3).map(j => j.title),
            error: null
          };
          
          console.log(`✅ ${scraper.name}: ${jobs.length} jobs in ${duration}ms`);
          results.push(result);
          
        } catch (error: any) {
          const duration = Date.now() - testStart;
          const result = {
            name: scraper.name,
            key: sourceName,
            success: false,
            jobCount: 0,
            duration: `${duration}ms`,
            sampleTitles: [],
            error: error.message
          };
          
          console.error(`❌ ${scraper.name}: ERROR - ${error.message}`);
          results.push(result);
        }
      }
      
      const totalJobs = results.reduce((sum, r) => sum + r.jobCount, 0);
      const workingScrapers = results.filter(r => r.success && r.jobCount > 0).length;
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`Total scrapers: ${sources.length}`);
      console.log(`Working scrapers: ${workingScrapers}`);
      console.log(`Total jobs: ${totalJobs}`);
      
      return {
        summary: {
          totalScrapers: sources.length,
          workingScrapers,
          totalJobs
        },
        results
      };
    }),
    
    getDebugLog: publicProcedure
      .query(async () => {
        const { readLogFile } = await import('./utils/logger');
        return { log: readLogFile() };
      }),
    
    clearDebugLog: publicProcedure
      .mutation(async () => {
        const { clearLogFile } = await import('./utils/logger');
        clearLogFile();
        return { success: true };
      }),
  
  scraper: router({
    runScraper: protectedProcedure
      .input(z.object({
        location: z.string(),
        role: z.string(),
        forceFresh: z.boolean().optional().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const { location, role, forceFresh } = input;
        
        // Generate unique runId for this scrape
        const runId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const startTime = Date.now();
        const startedAt = new Date().toISOString();
        
        // FILE LOGGING - START
        logToFile(`\n🔑 MUTATION_START runId=${runId} role="${role}" location="${location}"`);
        logToFile(`🔑 forceFresh=${forceFresh} (type: ${typeof forceFresh})`);
        
        console.log(`[Scraper] ========== NEW RUN: ${runId} ==========`);
        console.log(`[Scraper] Role: "${role}", Location: "${location}"`);
        console.log(`🔑 forceFresh INPUT VALUE: ${forceFresh} (type: ${typeof forceFresh})`);
        console.log(`🔑 forceFresh BOOLEAN CHECK: ${forceFresh === true} (strict) | ${!!forceFresh} (truthy)`);
        console.log(`[Scraper] Started at: ${startedAt}`);
        
        try {
          // Check cache only if forceFresh is false
          const cacheKey = `${role}:${location}`;
          
          // FILE LOGGING - CACHE CHECK
          logToFile(`🗄️ cacheKey="${cacheKey}"`);
          logToFile(`🗄️ cache.has(${cacheKey})=${scrapeCache.has(cacheKey)}`);
          logToFile(`🗄️ cache.size=${scrapeCache.size}`);
          
          console.log(`🗄️ CACHE KEY: "${cacheKey}"`);
          console.log(`🗄️ CACHE HAS KEY: ${scrapeCache.has(cacheKey)}`);
          console.log(`🗄️ WILL USE CACHE: ${!forceFresh && scrapeCache.has(cacheKey)}`);
          
          if (!forceFresh && scrapeCache.has(cacheKey)) {
            const cached = scrapeCache.get(cacheKey)!;
            const cachedAgeSeconds = Math.round((Date.now() - new Date(cached.timestamp).getTime()) / 1000);
            
            // FILE LOGGING - RETURNING CACHED
            logToFile(`⚠️ RETURNING_CACHED_RESULTS for key="${cacheKey}"`);
            logToFile(`⚠️ cached.stats.scraped=${cached.stats.scraped}`);
            logToFile(`⚠️ cached.stats.filtered=${cached.stats.filtered}`);
            
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
              allJobs: cached.jobs || [], // Return all jobs from cache
              sourceBreakdown: [],
              errorsBySource: {},
              countsBySource: {},
            };
          }
          
          // Force fresh scrape
          // FILE LOGGING - CACHE CLEARING
          logToFile(`✅ forceFresh=true, calling cache.delete("${cacheKey}")`);
          const hadCache = scrapeCache.has(cacheKey);
          scrapeCache.delete(cacheKey);
          const nowHas = scrapeCache.has(cacheKey);
          logToFile(`🗑️ cache.delete() called, hadCache=${hadCache}, nowHas=${nowHas}`);
          logToFile(`🗑️ cache.size after delete=${scrapeCache.size}`);
          logToFile(`🚀 CALLING runScrapersParallel()`);
          
          console.log(`✅ BYPASSING CACHE - forceFresh=${forceFresh}`);
          const hadCachedData = scrapeCache.has(cacheKey);
          scrapeCache.delete(cacheKey);
          console.log(`🗑️ CACHE CLEARED - had cached data: ${hadCachedData}`);
          console.log(`🗑️ CACHE SIZE AFTER DELETE: ${scrapeCache.size}`);
          console.log(`[Scraper] FRESH SCRAPE - starting scraper execution...`);
          
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
          
          // Rank ALL jobs (not just top 20) so user can see hidden gems
          const allRankedJobs = rankJobs(validJobs, filterOptions, validJobs.length);
          
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
            allJobs: allRankedJobs, // NEW: Return ALL ranked jobs for "View All" feature
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
          
          // Mark top 20 jobs as seen (if user is authenticated)
          if (ctx.user) {
            try {
              const { getDb } = await import('./db');
              const { seenJobs } = await import('../drizzle/schema');
              const { and, eq } = await import('drizzle-orm');
              
              const db = await getDb();
              if (db) {
                // Insert seen jobs (ignore duplicates)
                for (const job of top20) {
                  const existing = await db.select()
                    .from(seenJobs)
                    .where(and(
                      eq(seenJobs.userId, ctx.user.id),
                      eq(seenJobs.jobUrl, job.url)
                    ))
                    .limit(1);
                  
                  if (existing.length === 0) {
                    await db.insert(seenJobs).values({
                      userId: ctx.user.id,
                      jobUrl: job.url,
                      jobTitle: job.title,
                      company: job.company,
                    });
                  }
                }
                console.log(`[Scraper] Marked ${top20.length} jobs as seen for user ${ctx.user.id}`);
              }
            } catch (error) {
              console.error('[Scraper] Error marking jobs as seen:', error);
              // Don't fail the whole request if seen tracking fails
            }
          }
          
          // FILE LOGGING - CACHE STORAGE
          logToFile(`💾 STORING_TO_CACHE key="${cacheKey}" totalJobs=${validJobs.length}`);
          logToFile(`💾 cache.set() called, cache.size=${scrapeCache.size}`);
          logToFile(`🏁 MUTATION_END runId=${runId} duration=${result.stats.duration}s\n`);
          
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
  
  // Saved Jobs Router - allows users to bookmark jobs from scrape results
  savedJobs: router({
    save: protectedProcedure
      .input(z.object({
        title: z.string(),
        company: z.string(),
        location: z.string(),
        url: z.string(),
        source: z.string(),
        finalScore: z.number().optional(),
        experienceScore: z.number().optional(),
        roleScore: z.number().optional(),
        locationScore: z.number().optional(),
        skillsScore: z.number().optional(),
        companyScore: z.number().optional(),
        missionScore: z.number().optional(),
        description: z.string().optional(),
        postedDate: z.string().optional(),
        salary: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { savedJobs } = await import('../drizzle/schema');
        const { and, eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        // Check if job is already saved by this user (by URL)
        const existing = await db.select()
          .from(savedJobs)
          .where(and(
            eq(savedJobs.userId, ctx.user.id),
            eq(savedJobs.url, input.url)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          return { success: true, alreadySaved: true, id: existing[0].id };
        }
        
        // Insert new saved job
        const result = await db.insert(savedJobs).values({
          userId: ctx.user.id,
          ...input,
        });
        
        return { success: true, alreadySaved: false, id: result[0].insertId };
      }),
    
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDb } = await import('./db');
        const { savedJobs } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) return [];
        
        const jobs = await db.select()
          .from(savedJobs)
          .where(eq(savedJobs.userId, ctx.user.id))
          .orderBy(desc(savedJobs.savedAt));
        
        return jobs;
      }),
    
    unsave: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { savedJobs } = await import('../drizzle/schema');
        const { and, eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        // Only allow users to delete their own saved jobs
        await db.delete(savedJobs)
          .where(and(
            eq(savedJobs.id, input.id),
            eq(savedJobs.userId, ctx.user.id)
          ));
        
        return { success: true };
      }),
    
    isSaved: protectedProcedure
      .input(z.object({ url: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { savedJobs } = await import('../drizzle/schema');
        const { and, eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) return { isSaved: false };
        
        const saved = await db.select()
          .from(savedJobs)
          .where(and(
            eq(savedJobs.userId, ctx.user.id),
            eq(savedJobs.url, input.url)
          ))
          .limit(1);
        
        return { isSaved: saved.length > 0, id: saved[0]?.id };
      }),
  }),
  
  // Seen Jobs Router - tracks which jobs user has already viewed across runs
  seenJobs: router({
    markAsSeen: protectedProcedure
      .input(z.object({
        jobUrl: z.string(),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { seenJobs } = await import('../drizzle/schema');
        const { and, eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        // Check if already marked as seen
        const existing = await db.select()
          .from(seenJobs)
          .where(and(
            eq(seenJobs.userId, ctx.user.id),
            eq(seenJobs.jobUrl, input.jobUrl)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          return { success: true, alreadySeen: true };
        }
        
        // Insert new seen job
        await db.insert(seenJobs).values({
          userId: ctx.user.id,
          jobUrl: input.jobUrl,
          jobTitle: input.jobTitle,
          company: input.company,
        });
        
        return { success: true, alreadySeen: false };
      }),
    
    getSeenUrls: protectedProcedure
      .query(async ({ ctx }) => {
        const { getDb } = await import('./db');
        const { seenJobs } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) return [];
        
        const seen = await db.select({ jobUrl: seenJobs.jobUrl })
          .from(seenJobs)
          .where(eq(seenJobs.userId, ctx.user.id));
        
        return seen.map(s => s.jobUrl);
      }),
    
    clearAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { getDb } = await import('./db');
        const { seenJobs } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        await db.delete(seenJobs)
          .where(eq(seenJobs.userId, ctx.user.id));
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
