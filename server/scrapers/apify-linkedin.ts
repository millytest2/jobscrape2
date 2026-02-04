import axios from "axios";
import type { Job, Scraper, ScrapeParams } from "./types";

const APIFY_API_URL = "https://api.apify.com/v2/acts/fantastic-jobs~advanced-linkedin-job-search-api/runs";
const APIFY_TOKEN = process.env.APIFY_API_KEY || "apify_api_54Zl7lFBQGsNa2c9nRgdf6nvhoiQdo0AIYLg";

interface ApifyLinkedInJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  postedDate?: string;
  salary?: string;
  employmentType?: string;
  seniority?: string;
  companySize?: string;
  industry?: string;
}

/**
 * Scrape jobs from Apify Advanced LinkedIn Job Search API
 * Access to 10M+ jobs per month with detailed company data, recruiter data, and AI enrichments
 */
async function scrapeApifyLinkedIn(params: ScrapeParams): Promise<Job[]> {
  const { role, location } = params;
  try {
    console.log(`[Apify LinkedIn] Scraping for "${role}" in "${location}"...`);

    // Start the Apify actor run
    const runResponse = await axios.post(
      `${APIFY_API_URL}?token=${APIFY_TOKEN}`,
      {
        query: role,
        location: location,
        maxResults: 100, // Increased to 100 jobs for better coverage
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000, // 60 second timeout
      }
    );

    const runId = runResponse.data.data.id;
    console.log(`[Apify LinkedIn] Run started: ${runId}`);

    // Wait for the run to complete (poll every 3 seconds, max 120 seconds)
    let attempts = 0;
    const maxAttempts = 40; // 40 attempts × 3 seconds = 120 seconds
    let runStatus = "RUNNING";

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      
      runStatus = statusResponse.data.data.status;
      attempts++;
      console.log(`[Apify LinkedIn] Status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== "SUCCEEDED") {
      console.log(`[Apify LinkedIn] Run did not complete in time (status: ${runStatus})`);
      return [];
    }

    // Get the results
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
    );

    const jobs: ApifyLinkedInJob[] = resultsResponse.data;
    console.log(`[Apify LinkedIn] Found ${jobs.length} jobs`);

    // Transform to our Job format
    return jobs.map(job => ({
      title: job.title,
      company: job.company,
      location: job.location || "Remote",
      url: job.url,
      source: "LinkedIn (Apify)",
      postedDate: job.postedDate,
      salary: job.salary,
      description: job.description,
    }));
  } catch (error: any) {
    console.error("[Apify LinkedIn] Error:", error.message);
    return [];
  }
}

export const apifyLinkedInScraper: Scraper = {
  name: "Apify LinkedIn",
  scrape: scrapeApifyLinkedIn,
};
