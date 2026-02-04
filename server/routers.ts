import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

  diagnostics: publicProcedure.query(async () => {
    const fs = await import('fs');
    const os = await import('os');
    
    // Check if shells exist
    const existsSh = fs.existsSync('/bin/sh');
    const existsBash = fs.existsSync('/bin/bash');
    
    // Test if /tmp is writable
    let writableTmp = false;
    try {
      const testFile = '/tmp/test-write-' + Date.now();
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      writableTmp = true;
    } catch {
      writableTmp = false;
    }
    
    // Check scraper path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scraperDir = resolve(__dirname, './python_scraper');
    const scraperExists = fs.existsSync(scraperDir);
    
    let scraperFiles: string[] = [];
    if (scraperExists) {
      try {
        scraperFiles = fs.readdirSync(scraperDir).filter(f => f.endsWith('.py'));
      } catch {
        scraperFiles = ['Error reading directory'];
      }
    }
    
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PATH: process.env.PATH,
      },
      existsSh,
      existsBash,
      writableTmp,
      scraper: {
        resolvedPath: scraperDir,
        exists: scraperExists,
        pythonFiles: scraperFiles,
      },
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
        
        try {
          // Run the Python scraper v4 (comprehensive with remote-first + indirect roles)
          // Use path relative to server directory (deployed with app)
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          // In production: __dirname is /dist/, scrapers are at /dist/python_scraper/
          // In dev: __dirname is /server/, scrapers are at /server/python_scraper/
          const scraperPath = resolve(__dirname, './python_scraper/web_runner_v4_comprehensive.py');
          const scraperDir = resolve(__dirname, './python_scraper');
          
          // Check if scraper directory exists
          const fs = await import('fs/promises');
          try {
            await fs.access(scraperDir);
          } catch (error) {
            throw new Error(`Scraper directory not found: ${scraperDir}`);
          }
          
          // Execute Python scraper without bash dependency
          const { stdout } = await execAsync(
            `/usr/bin/python3.11 "${scraperPath}" --location "${location}" --role "${role}" --profile miles_profile.json --top 20`,
            { 
              maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
              timeout: 180000, // 180 seconds timeout (comprehensive scraper)
              cwd: scraperDir,
              shell: '/bin/sh', // Use POSIX shell instead of bash
              env: {
                ...process.env,
                PYTHONPATH: '',
                PYTHONHOME: '',
              }
            }
          );
          
          // Parse the JSON output from the scraper
          const result = JSON.parse(stdout);
          
          return result;
        } catch (error: any) {
          console.error("Scraper error:", error);
          
          // Provide user-friendly error messages
          if (error.code === 'ENOENT') {
            if (error.path?.includes('bash')) {
              throw new Error('Shell not available in production environment. Please contact support.');
            } else if (error.syscall === 'spawn') {
              throw new Error('Python interpreter not found. Please contact support.');
            } else {
              throw new Error(`Required file not found: ${error.path || 'unknown'}`);
            }
          } else if (error.code === 'ETIMEDOUT' || error.killed) {
            throw new Error('Scraping timed out after 3 minutes. Please try again with fewer sources.');
          } else if (error.message?.includes('Scraper directory not found')) {
            throw new Error('Scraper files missing from deployment. Please contact support.');
          } else {
            throw new Error(error.message || 'Failed to run scraper. Please try again.');
          }
        }
      }),
    
    getProfile: publicProcedure
      .query(async () => {
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const profilePath = resolve(__dirname, './python_scraper/miles_profile.json');
          
          const fs = await import('fs/promises');
          const profileData = await fs.readFile(profilePath, 'utf-8');
          return JSON.parse(profileData);
        } catch (error: any) {
          console.error("Profile read error:", error);
          throw new Error("Failed to load profile");
        }
      }),
    
    updateProfile: publicProcedure
      .input(z.any()) // Accept any profile structure for now
      .mutation(async ({ input }) => {
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const profilePath = resolve(__dirname, './python_scraper/miles_profile.json');
          
          const fs = await import('fs/promises');
          await fs.writeFile(profilePath, JSON.stringify(input, null, 2));
          
          return { success: true };
        } catch (error: any) {
          console.error("Profile update error:", error);
          throw new Error("Failed to update profile");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
