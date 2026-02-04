"""SerpAPI Google Jobs Scraper"""
import requests
import sys
from typing import List, Dict

SERPAPI_KEY = "5b8384737ad51a6dc40c3ad037895b1ea4262d80e1489ae6a67f58109f256456"

def scrape_serpapi(location: str, role: str, max_results: int = 50) -> List[Dict]:
    # Ensure location has state for better results
    if ',' not in location:
        location = f"{location}, CA"  # Default to California
    jobs = []
    try:
        params = {
            "engine": "google_jobs",
            "q": role,
            "location": location,
            "api_key": SERPAPI_KEY,
            "num": max_results
        }
        response = requests.get("https://serpapi.com/search", params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if "jobs_results" in data:
            for job in data["jobs_results"]:
                jobs.append({
                    "title": job.get("title", ""),
                    "company": job.get("company_name", ""),
                    "location": job.get("location", ""),
                    "url": (
                        job.get("apply_options", [{}])[0].get("link") or
                        job.get("related_links", [{}])[0].get("link") or
                        job.get("share_link", "")
                    ),
                    "description": job.get("description", ""),
                    "source": "SerpAPI",
                    "posted_date": job.get("detected_extensions", {}).get("posted_at", ""),
                    "salary": job.get("detected_extensions", {}).get("salary", "")
                })
        print(f"[SerpAPI] Scraped {len(jobs)} jobs", file=sys.stderr)
    except Exception as e:
        print(f"[SerpAPI] Error: {e}", file=sys.stderr)
    return jobs
