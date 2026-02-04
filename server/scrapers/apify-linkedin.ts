import axios from "axios";
import type { Job, Scraper, ScrapeParams } from "./types";

// Correct actor ID from user-provided code: vIGxjRrHqDTPuE6M4
const APIFY_ACTOR_ID = "vIGxjRrHqDTPuE6M4";
const APIFY_TOKEN = process.env.APIFY_API_KEY || "apify_api_54Zl7lFBQGsNa2c9nRgdf6nvhoiQdo0AIYLg";

interface ApifyLinkedInJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  postedDate?: string;
  salary?: string;
}

/**
 * Scrape jobs from Apify LinkedIn API using correct actor ID
 * Actor: vIGxjRrHqDTPuE6M4 (fantastic-jobs~advanced-linkedin-job-search-api)
 */
async function scrapeApifyLinkedIn(params: ScrapeParams): Promise<Job[]> {
  const { role, location } = params;
  try {
    console.log(`[Apify LinkedIn] Scraping for "${role}" in "${location}"...`);

    // Start the Apify actor run with correct parameters from user code
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        timeRange: "7d",
        limit: 100,
        includeAi: true,
        titleSearch: role, // Search by role title
        locationSearch: location, // Search by location
        descriptionSearch: null,
        descriptionType: "text",
        remote: null,
        seniorityFilter: null,
        removeAgency: null,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    const runId = runResponse.data.data.id;
    console.log(`[Apify LinkedIn] Run started: ${runId}`);

    // Wait for the run to complete (poll every 3 seconds, max 120 seconds)
    let attempts = 0;
    const maxAttempts = 40;
    let runStatus = "RUNNING";
    let statusResponse: any;

    while (runStatus === "RUNNING" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      
      runStatus = statusResponse.data.data.status;
      attempts++;
      console.log(`[Apify LinkedIn] Status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== "SUCCEEDED") {
      console.log(`[Apify LinkedIn] Run did not complete in time (status: ${runStatus})`);
      throw new Error(`ERROR_TIMEOUT: Actor run timed out after 120s (status: ${runStatus})`);
    }

    // Get the dataset ID from the run response
    const datasetId = statusResponse.data.data.defaultDatasetId;
    if (!datasetId) {
      console.error(`[Apify LinkedIn] No dataset ID found in run response`);
      throw new Error('ERROR_NO_DATASET: No dataset ID returned from actor run');
    }

    console.log(`[Apify LinkedIn] Fetching results from dataset: ${datasetId}`);

    // Get the results using the correct dataset URL
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    const jobs: ApifyLinkedInJob[] = resultsResponse.data;
    console.log(`[Apify LinkedIn] Found ${jobs.length} jobs`);

    if (jobs.length === 0) {
      throw new Error('ERROR_EMPTY_RESPONSE: Actor returned 0 jobs');
    }

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
    // Throw specific error instead of silently returning empty array
    if (error.message?.startsWith('ERROR_')) {
      throw error; // Re-throw our custom errors
    }
    throw new Error(`ERROR_NETWORK: ${error.message}`);
  }
}

export const apifyLinkedInScraper: Scraper = {
  name: "Apify LinkedIn",
  scrape: scrapeApifyLinkedIn,
};
