import type { Job, ScraperResult } from "./types";

const JOOBLE_API_KEY = "21b5bb96-d3b9-4fc8-b506-3ec068974c18";

export async function scrapeJooble(
  role: string,
  location: string
): Promise<ScraperResult> {
  try {
    const url = `https://jooble.org/api/${JOOBLE_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: role,
        location: location,
      }),
    });

    if (!response.ok) {
      return { jobs: [], source: "Jooble", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.jobs || data.jobs.length === 0) {
      return { jobs: [], source: "Jooble" };
    }

    const jobs: Job[] = data.jobs.map((job: any) => ({
      title: job.title || "",
      company: job.company || "",
      location: job.location || location,
      url: job.link || "",
      source: "Jooble",
      posted_date: job.updated || "",
      salary: job.salary || "",
      description: job.snippet || "",
    }));

    return { jobs, source: "Jooble" };
  } catch (error) {
    return {
      jobs: [],
      source: "Jooble",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
