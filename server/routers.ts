import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { scrapeJobs } from "./scrapers/index";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
          // Run the TypeScript scraper (works in production)
          const result = await scrapeJobs(role, location);
          
          return {
            status: "success",
            params: { location, role },
            stats: {
              scraped: result.stats.scraped,
              unique: result.stats.unique,
              filtered: result.stats.top_matches,
              mission_driven: 0, // Simplified for now
              salary_match: 0, // Simplified for now
              top_matches: result.stats.top_matches,
            },
            jobs: result.jobs,
          };
        } catch (error: any) {
          console.error("Scraper error:", error);
          throw new Error(error.message || "Failed to run scraper");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
