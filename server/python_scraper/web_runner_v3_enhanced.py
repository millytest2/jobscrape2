#!/usr/bin/env python3
"""
Enhanced Job Scraper v3.0
- 7 sources (SerpAPI, RemoteOK, WeWorkRemotely, Craigslist, Arbeitnow, The Muse, Jooble)
- Mission-driven filtering
- Indirect role expansion
- Landing probability scoring
- Top 20 results
"""

import json
import sys
from typing import List, Dict
from scrapers.serpapi_scraper import scrape_serpapi
from scrapers.remoteok_scraper import scrape_remoteok
from scrapers.weworkremotely_scraper import scrape_weworkremotely
from scrapers.craigslist_scraper import scrape_craigslist
from scrapers.arbeitnow_scraper import scrape_arbeitnow
from scrapers.themuse_scraper import scrape_themuse
from scrapers.jooble_scraper import scrape_jooble
from filters.mission_driven_filter import MissionDrivenFilter
from filters.landing_probability import calculate_landing_probability

def load_profile(profile_path: str) -> Dict:
    """Load user profile"""
    with open(profile_path, 'r') as f:
        return json.load(f)

def deduplicate_jobs(jobs: List[Dict]) -> List[Dict]:
    """Deduplicate jobs by (company + title)"""
    seen = set()
    unique_jobs = []
    
    for job in jobs:
        key = (job.get("company", "").lower(), job.get("title", "").lower())
        if key not in seen and key != ("", ""):
            seen.add(key)
            unique_jobs.append(job)
    
    return unique_jobs

def filter_by_salary(jobs: List[Dict], min_salary: int = 80000, max_salary: int = 100000) -> List[Dict]:
    """Filter jobs by salary range"""
    import re
    
    filtered = []
    for job in jobs:
        salary_val = job.get("salary", "")
        # Handle both string and int/float salary values
        if isinstance(salary_val, (int, float)):
            salary_text = str(salary_val)
        else:
            salary_text = str(salary_val).lower()
        
        if not salary_text or salary_text == "" or salary_text == "0":
            # No salary info - include by default (let user decide)
            filtered.append(job)
            continue
        
        # Extract salary numbers
        numbers = re.findall(r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', salary_text)
        
        if numbers:
            # Convert to integers
            salaries = []
            for n in numbers:
                try:
                    val = int(n.replace(',', '').split('.')[0])
                    # Handle "k" notation
                    if 'k' in salary_text and val < 1000:
                        val = val * 1000
                    salaries.append(val)
                except:
                    pass
            
            # Check if salary range overlaps with target range
            if salaries:
                if any(min_salary <= s <= max_salary for s in salaries):
                    filtered.append(job)
                elif min(salaries) <= max_salary and max(salaries) >= min_salary:
                    filtered.append(job)
            else:
                filtered.append(job)
        else:
            # Can't parse salary - include by default
            filtered.append(job)
    
    return filtered

def main(location: str, role: str, profile_path: str, top_n: int = 20):
    """Main scraper function"""
    
    print(f"Loading profile: {profile_path}", file=sys.stderr)
    profile = load_profile(profile_path)
    
    # Get target roles (expand to indirect roles)
    target_roles = profile.get("target_roles", [role])
    print(f"Target roles: {', '.join(target_roles[:3])}... ({len(target_roles)} total)", file=sys.stderr)
    
    # Scrape from all sources for primary role only (to save time)
    print(f"\nScraping for: {role} in {location}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    all_jobs = []
    
    # Source 1: SerpAPI
    try:
        jobs = scrape_serpapi(location, role, max_results=50)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[SerpAPI] Failed: {e}", file=sys.stderr)
    
    # Source 2: RemoteOK
    try:
        jobs = scrape_remoteok(role)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[RemoteOK] Failed: {e}", file=sys.stderr)
    
    # Source 3: WeWorkRemotely
    try:
        jobs = scrape_weworkremotely(role)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[WeWorkRemotely] Failed: {e}", file=sys.stderr)
    
    # Source 4: Craigslist
    try:
        jobs = scrape_craigslist(location, role)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[Craigslist] Failed: {e}", file=sys.stderr)
    
    # Source 5: Arbeitnow
    try:
        jobs = scrape_arbeitnow(role)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[Arbeitnow] Failed: {e}", file=sys.stderr)
    
    # Source 6: The Muse
    try:
        jobs = scrape_themuse(role, location)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[The Muse] Failed: {e}", file=sys.stderr)
    
    # Source 7: Jooble
    try:
        jobs = scrape_jooble(location, role, max_results=50)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[Jooble] Failed: {e}", file=sys.stderr)
    
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Total jobs scraped: {len(all_jobs)}", file=sys.stderr)
    
    # Deduplicate
    all_jobs = deduplicate_jobs(all_jobs)
    print(f"After deduplication: {len(all_jobs)} unique jobs", file=sys.stderr)
    
    # Apply mission-driven filter (lowered threshold to 35 for more results)
    print(f"Applying mission-driven filter...", file=sys.stderr)
    mission_filter = MissionDrivenFilter()
    mission_jobs = mission_filter.filter_jobs(all_jobs, threshold=35.0)
    print(f"Mission-driven companies (score >= 35): {len(mission_jobs)} jobs", file=sys.stderr)
    
    # Apply salary filter
    print(f"Applying salary filter ($80k-$100k)...", file=sys.stderr)
    salary_min = profile["preferences"]["salary_range"]["min"]
    salary_max = profile["preferences"]["salary_range"]["max"]
    salary_jobs = filter_by_salary(mission_jobs, salary_min, salary_max)
    print(f"Salary match: {len(salary_jobs)} jobs", file=sys.stderr)
    
    # Calculate landing probability
    print(f"Calculating landing probability...", file=sys.stderr)
    
    user_prefs = {
        "role": role,
        "location": location,
        "seniority": "mid",
        "company_size_preference": "small",
        "remote_preference": "flexible"
    }
    
    for job in salary_jobs:
        job["landing_probability"] = calculate_landing_probability(job, user_prefs)
    
    # Sort by landing probability
    salary_jobs.sort(key=lambda x: x.get("landing_probability", 0), reverse=True)
    
    # Get top N
    top_jobs = salary_jobs[:top_n]
    print(f"Top {top_n} matches by landing probability", file=sys.stderr)
    
    # Output results
    result = {
        "status": "success",
        "params": {
            "location": location,
            "role": role,
            "profile": profile_path
        },
        "stats": {
            "scraped": len(all_jobs),
            "unique": len(all_jobs),
            "mission_driven": len(mission_jobs),
            "salary_match": len(salary_jobs),
            "top_matches": len(top_jobs)
        },
        "jobs": top_jobs
    }
    
    print(json.dumps(result, indent=2))
    
    # Print summary to stderr
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"RESULTS SUMMARY", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    print(f"Scraped: {len(all_jobs)} jobs from 7 sources", file=sys.stderr)
    print(f"Mission-driven: {len(mission_jobs)} jobs (score >= 40)", file=sys.stderr)
    print(f"Salary match: {len(salary_jobs)} jobs ($80k-$100k)", file=sys.stderr)
    print(f"Top matches: {len(top_jobs)} jobs", file=sys.stderr)
    
    if top_jobs:
        print(f"\nTop 5 Matches:", file=sys.stderr)
        for i, job in enumerate(top_jobs[:5], 1):
            prob = job.get("landing_probability", 0)
            mission = job.get("mission_score", 0)
            print(f"{i}. {job['title']} at {job['company']}", file=sys.stderr)
            print(f"   Landing Probability: {prob:.0f}% | Mission Fit: {mission:.0f}%", file=sys.stderr)
            print(f"   Source: {job['source']} | URL: {job['url'][:60]}...", file=sys.stderr)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Job Scraper v3.0")
    parser.add_argument("--location", default="Los Angeles", help="Job location")
    parser.add_argument("--role", default="Sales Engineer", help="Job role")
    parser.add_argument("--profile", default="miles_profile.json", help="User profile JSON")
    parser.add_argument("--top", type=int, default=20, help="Number of top matches to return")
    
    args = parser.parse_args()
    
    main(args.location, args.role, args.profile, args.top)
