import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
          // Run the Python scraper
          const { stdout } = await execAsync(
            `env -u PYTHONPATH -u PYTHONHOME /usr/bin/python3.11 /home/ubuntu/job_pipeline/web_runner.py "${location}" "${role}"`,
            { 
              maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
              timeout: 180000, // 3 minutes timeout for scraping
              cwd: '/home/ubuntu/job_pipeline'
            }
          );
          
          // Parse the JSON output from the scraper
          const result = JSON.parse(stdout);
          
          return result;
        } catch (error: any) {
          console.error("Scraper error:", error);
          throw new Error(error.message || "Failed to run scraper");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
