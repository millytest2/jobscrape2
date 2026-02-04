import axios from "axios";
import type { Job, Scraper, ScrapeParams } from "./types";

const APIFY_API_URL = "https://api.apify.com/v2/acts/fantastic-jobs~career-site-job-listing-api/runs";
const APIFY_TOKEN = process.env.APIFY_API_KEY || "apify_api_54Zl7lFBQGsNa2c9nRgdf6nvhoiQdo0AIYLg";

interface ApifyCareerSiteJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  postedDate?: string;
  salary?: string;
  employmentType?: string;
  atsSystem?: string;
}

/**
 * Scrape jobs from Apify Career Site Job Listing API
 * Covers 175k+ company career sites across 42 ATS platforms
 * (Workday, Greenhouse, Ashby, Lever, Rippling, SuccessFactors, iCIMS, etc.)
 */
async function scrapeApifyCareerSite(params: ScrapeParams): Promise<Job[]> {
  const { role, location } = params;
  try {
    console.log(`[Apify Career Site] Scraping for "${role}" in "${location}"...`);

    // Start the Apify actor run
    const runResponse = await axios.post(
      `${APIFY_API_URL}?token=${APIFY_TOKEN}`,
      {
        query: role,
        location: location,
        maxResults: 50, // Limit to 50 jobs to control costs
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000, // 60 second timeout
      }
    );

    const runId = runResponse.data.data.id;
    console.log(`[Apify Career Site] Run started: ${runId}`);

    // Wait for the run to complete (poll every 2 seconds, max 30 seconds)
    let attempts = 0;
    const maxAttempts = 15;
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      
      runStatus = statusResponse.data.data.status;
      attempts++;
      console.log(`[Apify Career Site] Status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== "SUCCEEDED") {
      console.log(`[Apify Career Site] Run did not complete in time (status: ${runStatus})`);
      return [];
    }

    // Get the results
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
    );

    const jobs: ApifyCareerSiteJob[] = resultsResponse.data;
    console.log(`[Apify Career Site] Found ${jobs.length} jobs`);

    // Transform to our Job format
    return jobs.map(job => ({
      title: job.title,
      company: job.company,
      location: job.location || "Remote",
      url: job.url,
      source: `Career Site (${job.atsSystem || "ATS"})`,
      postedDate: job.postedDate,
      salary: job.salary,
      description: job.description,
    }));
  } catch (error: any) {
    console.error("[Apify Career Site] Error:", error.message);
    return [];
  }
}

export const apifyCareerSiteScraper: Scraper = {
  name: "Apify Career Site",
  scrape: scrapeApifyCareerSite,
};
