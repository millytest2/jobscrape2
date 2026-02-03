import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// Flask API URL (Python scraper with all the intelligence)
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "https://5000-id88howfpgmln0wzdtptt-8577bfd3.us1.manus.computer";

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
          // Call Flask API service (Python scraper with full intelligence)
          console.log(`[Scraper] Calling Flask API: ${SCRAPER_API_URL}/scrape`);
          
          const response = await fetch(`${SCRAPER_API_URL}/scrape`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role, location }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Flask API error: ${response.status} - ${errorText}`);
          }
          
          // Parse JSON response from Flask API
          const result = await response.json();
          
          return {
            status: result.status,
            params: result.params,
            stats: result.stats,
            jobs: result.jobs,
          };
        } catch (error: any) {
          console.error("[Scraper] Error:", error);
          throw new Error(error.message || "Failed to run scraper");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
