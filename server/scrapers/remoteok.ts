import type { Job, ScraperResult } from "./types";

export async function scrapeRemoteOK(role: string): Promise<ScraperResult> {
  try {
    const url = "https://remoteok.com/api";
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return { jobs: [], source: "RemoteOK", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    // First item is metadata, skip it
    const jobsData = data.slice(1);
    
    // Filter for role match
    const roleKeywords = role.toLowerCase().split(" ");
    const filteredJobs = jobsData.filter((job: any) => {
      const jobText = `${job.position || ""} ${job.description || ""}`.toLowerCase();
      return roleKeywords.some(keyword => jobText.includes(keyword));
    });

    const jobs: Job[] = filteredJobs.slice(0, 20).map((job: any) => ({
      title: job.position || "",
      company: job.company || "",
      location: job.location || "Remote",
      url: `https://remoteok.com/remote-jobs/${job.slug}` || "",
      source: "RemoteOK",
      posted_date: job.date || "",
      salary: job.salary_min && job.salary_max 
        ? `$${job.salary_min}-${job.salary_max}` 
        : "",
      description: job.description || "",
    }));

    return { jobs, source: "RemoteOK" };
  } catch (error) {
    return {
      jobs: [],
      source: "RemoteOK",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
