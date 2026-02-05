import axios from "axios";
import type { Job, Scraper, ScrapeParams } from "./types";

// Inline role variations to avoid import issues
function getRoleVariations(role: string): string[] {
  const normalized = role.toLowerCase().trim();
  if (normalized.includes('sales engineer') || normalized.includes('sales eng')) {
    return ['Sales Engineer', 'Pre-Sales Engineer', 'Solutions Engineer', 'Technical Account Manager', 'Demo Engineer'];
  }
  return [role];
}

// Correct actor ID from user-provided code: s3dtSTZSZWFtAVLn5
const APIFY_ACTOR_ID = "s3dtSTZSZWFtAVLn5";
const APIFY_TOKEN = process.env.APIFY_API_KEY || "apify_api_54Zl7lFBQGsNa2c9nRgdf6nvhoiQdo0AIYLg";

interface ApifyCareerSiteJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  postedDate?: string;
  salary?: string;
}

/**
 * Scrape jobs from Apify Career Site Job Listing API using correct actor ID
 * Actor: s3dtSTZSZWFtAVLn5 (fantastic-jobs~career-site-job-listing-api)
 */
async function scrapeApifyCareerSite(params: ScrapeParams): Promise<Job[]> {
  const { role, location } = params;
  try {
    console.log(`[Apify Career Site] Scraping for "${role}" in "${location}"...`);
    
    // Get role variations to search
    const roleVariations = getRoleVariations(role); // Search role variations
    console.log(`[Apify Career Site] Searching ${roleVariations.length} role variations:`, roleVariations);

    // Normalize location to avoid abbreviations (Apify docs: "Please do not use any abbreviations")
    const normalizedLocation = location
      .replace(/\bCA\b/g, 'California')
      .replace(/\bNY\b/g, 'New York')
      .replace(/\bTX\b/g, 'Texas')
      .replace(/\bFL\b/g, 'Florida')
      .replace(/\bIL\b/g, 'Illinois')
      .replace(/\bPA\b/g, 'Pennsylvania')
      .replace(/\bOH\b/g, 'Ohio')
      .replace(/\bGA\b/g, 'Georgia')
      .replace(/\bNC\b/g, 'North Carolina')
      .replace(/\bMI\b/g, 'Michigan');
    
    console.log(`[Apify Career Site] Normalized location: "${location}" -> "${normalizedLocation}"`);

    // Start the Apify actor run with multiple role variations
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        timeRange: "7d",
        limit: 100,
        titleSearch: roleVariations, // Search ALL role variations
        locationSearch: [normalizedLocation, "United States"], // Broader search with full state names
        descriptionType: "text",
        populateAiRemoteLocation: false,
        populateAiRemoteLocationDerived: false,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    const runId = runResponse.data.data.id;
    console.log(`[Apify Career Site] Run started: ${runId} | Initial status: ${runResponse.data.data.status}`);
    console.log(`[Apify Career Site] Actor ID: ${APIFY_ACTOR_ID} | Input:`, JSON.stringify({ timeRange: "7d", limit: 100, titleSearch: [role], locationSearch: [location] }));

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
      
      if (statusResponse.data.data.statusMessage) {
        console.log(`[Apify Career Site] Status: ${runStatus} | Message: ${statusResponse.data.data.statusMessage} (attempt ${attempts}/${maxAttempts})`);
      } else {
        console.log(`[Apify Career Site] Status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
      }
    }

    if (runStatus !== "SUCCEEDED") {
      console.log(`[Apify Career Site] Run did not complete in time (status: ${runStatus})`);
      throw new Error(`ERROR_TIMEOUT: Actor run timed out after 120s (status: ${runStatus})`);
    }

    // Get the dataset ID from the run response
    const datasetId = statusResponse.data.data.defaultDatasetId;
    if (!datasetId) {
      console.error(`[Apify Career Site] No dataset ID found in run response`);
      throw new Error('ERROR_NO_DATASET: No dataset ID returned from actor run');
    }

    console.log(`[Apify Career Site] Fetching results from dataset: ${datasetId}`);

    // Get the results using the correct dataset URL
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    const jobs: ApifyCareerSiteJob[] = resultsResponse.data;
    console.log(`[Apify Career Site] Found ${jobs.length} jobs`);

    if (jobs.length === 0) {
      throw new Error('ERROR_EMPTY_RESPONSE: Actor returned 0 jobs');
    }

    // Transform to our Job format
    return jobs.map(job => ({
      title: job.title,
      company: job.company,
      location: job.location || "Remote",
      url: job.url,
      source: "Career Sites (Apify)",
      postedDate: job.postedDate,
      salary: job.salary,
      description: job.description,
    }));
  } catch (error: any) {
    console.error("[Apify Career Site] Error:", error.message);
    // Throw specific error instead of silently returning empty array
    if (error.message?.startsWith('ERROR_')) {
      throw error; // Re-throw our custom errors
    }
    throw new Error(`ERROR_NETWORK: ${error.message}`);
  }
}

export const apifyCareerSiteScraper: Scraper = {
  name: "Apify Career Site",
  scrape: scrapeApifyCareerSite,
};
