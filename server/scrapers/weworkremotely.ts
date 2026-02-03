import type { Job, ScraperResult } from "./types";
import * as cheerio from "cheerio";

export async function scrapeWeWorkRemotely(role: string): Promise<ScraperResult> {
  try {
    const url = "https://weworkremotely.com/remote-jobs/search?utf8=%E2%9C%93&term=" + encodeURIComponent(role);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return { jobs: [], source: "WeWorkRemotely", error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const jobs: Job[] = [];
    
    $("li.feature").each((_: number, elem: any) => {
      const title = $(elem).find(".title").text().trim();
      const company = $(elem).find(".company").text().trim();
      const location = $(elem).find(".region").text().trim() || "Remote";
      const link = $(elem).find("a").attr("href") || "";
      const url = link.startsWith("http") ? link : `https://weworkremotely.com${link}`;
      
      if (title && company) {
        jobs.push({
          title,
          company,
          location,
          url,
          source: "WeWorkRemotely",
        });
      }
    });

    return { jobs, source: "WeWorkRemotely" };
  } catch (error) {
    return {
      jobs: [],
      source: "WeWorkRemotely",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
