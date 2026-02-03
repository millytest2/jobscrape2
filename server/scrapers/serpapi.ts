import type { Job, ScraperResult } from "./types";

const SERPAPI_KEY = "5b8384737ad51a6dc40c3ad037895b1ea4262d80e1489ae6a67f58109f256456";

export async function scrapeSerpAPI(
  role: string,
  location: string
): Promise<ScraperResult> {
  try {
    const url = `https://serpapi.com/search?engine=google_jobs&q=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&api_key=${SERPAPI_KEY}&num=50`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return { jobs: [], source: "SerpAPI", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.jobs_results || data.jobs_results.length === 0) {
      return { jobs: [], source: "SerpAPI" };
    }

    const jobs: Job[] = data.jobs_results.map((job: any) => ({
      title: job.title || "",
      company: job.company_name || "",
      location: job.location || location,
      url: job.share_url || job.related_links?.[0]?.link || "",
      source: "SerpAPI",
      posted_date: job.detected_extensions?.posted_at || "",
      salary: job.detected_extensions?.salary || "",
      description: job.description || "",
    }));

    return { jobs, source: "SerpAPI" };
  } catch (error) {
    return {
      jobs: [],
      source: "SerpAPI",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
