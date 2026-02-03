"""Jooble API Scraper"""
import requests
import sys
from typing import List, Dict

JOOBLE_API_KEY = "21b5bb96-d3b9-4fc8-b506-3ec068974c18"

def scrape_jooble(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape jobs from Jooble API
    
    Args:
        location: Location string (e.g., "Los Angeles, CA")
        role: Job role/title to search for
        max_results: Maximum number of results (not used, Jooble returns what it has)
        
    Returns:
        List of job dictionaries
    """
    jobs = []
    try:
        # Jooble API endpoint
        url = f"https://jooble.org/api/{JOOBLE_API_KEY}"
        
        # Request payload
        payload = {
            "keywords": role,
            "location": location,
            "salary": "80000",  # Minimum salary filter
            "radius": "25"  # 25 miles radius
        }
        
        # Make POST request
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Parse jobs
        if "jobs" in data:
            for job in data["jobs"]:
                jobs.append({
                    "title": job.get("title", ""),
                    "company": job.get("company", ""),
                    "location": job.get("location", ""),
                    "url": job.get("link", ""),
                    "description": job.get("snippet", ""),
                    "source": "Jooble",
                    "posted_date": job.get("updated", ""),
                    "salary": job.get("salary", "")
                })
        
        print(f"[Jooble] Scraped {len(jobs)} jobs", file=sys.stderr)
        
    except Exception as e:
        print(f"[Jooble] Error: {e}", file=sys.stderr)
    
    return jobs


if __name__ == "__main__":
    # Test the scraper
    print("Testing Jooble scraper...")
    jobs = scrape_jooble("Los Angeles, CA", "Sales Engineer")
    
    print(f"\nFound {len(jobs)} jobs:")
    for i, job in enumerate(jobs[:5], 1):
        print(f"\n{i}. {job['title']} at {job['company']}")
        print(f"   Location: {job['location']}")
        print(f"   URL: {job['url']}")
        print(f"   Salary: {job['salary']}")
