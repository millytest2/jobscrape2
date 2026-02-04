#!/usr/bin/env python3
"""
The Muse API job scraper
Free API - 500 requests/hour without key, 3600 with key
"""
import sys
import requests
from typing import List, Dict

def scrape_themuse(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """Scrape jobs from The Muse API"""
    jobs = []
    
    try:
        base_url = "https://www.themuse.com/api/public/jobs"
        
        # The Muse uses category-based search, map common roles
        category_map = {
            "sales": "Sales",
            "engineer": "Engineering",
            "data": "Data Science",
            "product": "Product",
            "marketing": "Marketing",
            "design": "Design",
        }
        
        # Try to find matching category
        category = None
        role_lower = role.lower()
        for key, value in category_map.items():
            if key in role_lower:
                category = value
                break
        
        # Calculate how many pages we need (20 results per page)
        pages_needed = (max_results + 19) // 20
        
        print(f"[The Muse] Searching for '{role}' in '{location}'", file=sys.stderr)
        
        for page in range(pages_needed):
            params = {
                "page": page,
                "descending": "false"
            }
            
            # Add category if found
            if category:
                params["category"] = category
            
            # Add location if specified
            if location and location.lower() not in ["remote", "anywhere"]:
                params["location"] = location
            
            response = requests.get(base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                break
            
            for job in results:
                try:
                    # Filter by role keywords in title
                    title = job.get("name", "")
                    title_lower = title.lower()
                    
                    # Check if role keywords match
                    role_keywords = role.lower().split()
                    if not any(keyword in title_lower for keyword in role_keywords):
                        continue
                    
                    # Extract locations
                    locations = job.get("locations", [])
                    location_str = ", ".join([loc.get("name", "") for loc in locations]) if locations else "Remote"
                    
                    # Extract company
                    company_data = job.get("company", {})
                    company_name = company_data.get("name", "Unknown")
                    
                    jobs.append({
                        "title": title,
                        "company": company_name,
                        "location": location_str,
                        "url": job.get("refs", {}).get("landing_page", ""),
                        "description": job.get("contents", ""),
                        "source": "The Muse",
                        "posted_date": job.get("publication_date", ""),
                        "salary": ""  # The Muse doesn't provide salary in API
                    })
                    
                    if len(jobs) >= max_results:
                        break
                        
                except Exception as e:
                    print(f"[The Muse] Error parsing job: {e}", file=sys.stderr)
                    continue
            
            if len(jobs) >= max_results:
                break
        
        print(f"[The Muse] Successfully scraped {len(jobs)} jobs", file=sys.stderr)
        
    except Exception as e:
        print(f"[The Muse] Error: {e}", file=sys.stderr)
    
    return jobs

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python themuse_scraper.py <location> <role>")
        sys.exit(1)
    
    location = sys.argv[1]
    role = sys.argv[2]
    
    jobs = scrape_themuse(location, role)
    
    for job in jobs:
        print(f"{job['title']} at {job['company']} - {job['location']}")
