#!/usr/bin/env python3
"""
Comprehensive Job Scraper v4.0
- Remote-first + nearby cities
- Auto-expand to indirect roles
- Maximize each source's capacity
- Mission-driven filtering
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
from scrapers.remotive_scraper import scrape_remotive
from filters.mission_driven_filter import MissionDrivenFilter
from filters.landing_probability import calculate_landing_probability
from filters.role_filter import RoleFilter

def load_profile(profile_path: str) -> Dict:
    """Load user profile"""
    with open(profile_path, 'r') as f:
        return json.load(f)

def get_nearby_cities(primary_city: str) -> List[str]:
    """Get nearby cities for a given primary city"""
    city_map = {
        "Los Angeles": ["Los Angeles", "Santa Monica", "Pasadena", "Long Beach", "Irvine", "Orange County"],
        "San Francisco": ["San Francisco", "Oakland", "San Jose", "Palo Alto", "Mountain View"],
        "New York": ["New York", "Brooklyn", "Manhattan", "Queens", "Jersey City"],
        "Seattle": ["Seattle", "Bellevue", "Redmond", "Tacoma"],
        "Austin": ["Austin", "Round Rock", "Cedar Park"],
        "Boston": ["Boston", "Cambridge", "Somerville", "Brookline"],
        "Chicago": ["Chicago", "Evanston", "Oak Park", "Naperville"],
        "Denver": ["Denver", "Boulder", "Aurora", "Lakewood"],
    }
    
    # Find matching city
    for key in city_map:
        if key.lower() in primary_city.lower():
            return city_map[key]
    
    # Default: return primary city only
    return [primary_city]

def deduplicate_jobs(jobs: List[Dict]) -> List[Dict]:
    """Deduplicate jobs by (company + title)"""
    seen = set()
    unique_jobs = []
    
    for job in jobs:
        key = (job.get("company", "").lower().strip(), job.get("title", "").lower().strip())
        if key not in seen and key != ("", ""):
            seen.add(key)
            unique_jobs.append(job)
    
    return unique_jobs

def filter_by_salary(jobs: List[Dict], min_salary: int = 80000, max_salary: int = 100000) -> List[Dict]:
    """Filter jobs by salary range (lenient - includes jobs with no salary info)"""
    import re
    
    filtered = []
    for job in jobs:
        salary_val = job.get("salary", "")
        
        # Handle both string and int/float salary values
        if isinstance(salary_val, (int, float)):
            salary_text = str(salary_val)
        else:
            salary_text = str(salary_val).lower()
        
        # Include jobs with no salary info (let user decide)
        if not salary_text or salary_text == "" or salary_text == "0":
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
                # If any salary in range, include
                if any(min_salary <= s <= max_salary for s in salaries):
                    filtered.append(job)
                # If salary range overlaps, include
                elif min(salaries) <= max_salary and max(salaries) >= min_salary:
                    filtered.append(job)
                # If outside range, exclude
                else:
                    pass
            else:
                # Can't parse - include by default
                filtered.append(job)
        else:
            # Can't parse - include by default
            filtered.append(job)
    
    return filtered

def scrape_all_sources(location: str, role: str, include_remote: bool = True) -> List[Dict]:
    """Scrape all sources for a given role and location"""
    all_jobs = []
    
    # Get nearby cities
    cities = get_nearby_cities(location)
    print(f"Searching in: {', '.join(cities)}", file=sys.stderr)
    
    # Source 1: SerpAPI (location-based)
    for city in cities[:2]:  # Limit to 2 cities for speed
        try:
            jobs = scrape_serpapi(city, role, max_results=50)
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"[SerpAPI {city}] Failed: {e}", file=sys.stderr)
    
    # Source 2: RemoteOK (remote-first)
    try:
        jobs = scrape_remoteok(role)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[RemoteOK] Failed: {e}", file=sys.stderr)
    
    # Source 3: WeWorkRemotely (remote-first)
    try:
        jobs = scrape_weworkremotely(role)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[WeWorkRemotely] Failed: {e}", file=sys.stderr)
    
    # Source 4: Craigslist (location-based)
    for city in cities[:2]:  # Limit to 2 cities
        try:
            jobs = scrape_craigslist(city, role)
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"[Craigslist {city}] Failed: {e}", file=sys.stderr)
    
    # Source 5: Arbeitnow (remote-first)
    try:
        jobs = scrape_arbeitnow(role, role)  # Fix: pass role twice
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[Arbeitnow] Failed: {e}", file=sys.stderr)
    
    # Source 6: The Muse (location-based)
    for city in cities[:2]:  # Limit to 2 cities
        try:
            jobs = scrape_themuse(role, city)
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"[The Muse {city}] Failed: {e}", file=sys.stderr)
    
    # Source 7: Jooble (location-based, best source)
    for city in cities[:2]:  # Limit to 2 cities for speed
        try:
            jobs = scrape_jooble(f"{city}, CA", role, max_results=50)
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"[Jooble {city}] Failed: {e}", file=sys.stderr)
    
    # Source 8: Remotive (remote-first, free API)
    try:
        jobs = scrape_remotive("Remote", role, max_results=50)
        all_jobs.extend(jobs)
    except Exception as e:
        print(f"[Remotive] Failed: {e}", file=sys.stderr)
    
    return all_jobs

def main(location: str, role: str, profile_path: str, top_n: int = 20):
    """Main scraper function"""
    
    print(f"Loading profile: {profile_path}", file=sys.stderr)
    profile = load_profile(profile_path)
    
    # Get target roles (direct + indirect)
    target_roles_config = profile.get("target_roles", {})
    
    # Handle both old format (list) and new format (dict with direct/indirect)
    if isinstance(target_roles_config, list):
        # Old format: just use the list
        target_roles = target_roles_config[:5]
    else:
        # New format: combine direct + indirect (prioritize direct)
        direct_roles = target_roles_config.get("direct", [])
        indirect_roles = target_roles_config.get("indirect", [])
        target_roles = direct_roles + indirect_roles[:2]  # Direct roles + top 2 indirect
    
    print(f"Target roles: {', '.join(target_roles)}", file=sys.stderr)
    
    # Scrape all related roles (exact + alternatives)
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"SCRAPING PHASE", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    
    all_jobs = []
    for search_role in target_roles:
        print(f"\nSearching for: {search_role}", file=sys.stderr)
        jobs = scrape_all_sources(location, search_role, include_remote=True)
        all_jobs.extend(jobs)
        print(f"Found {len(jobs)} jobs for {search_role}", file=sys.stderr)
    
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Total jobs scraped: {len(all_jobs)}", file=sys.stderr)
    
    # Deduplicate
    all_jobs = deduplicate_jobs(all_jobs)
    print(f"After deduplication: {len(all_jobs)} unique jobs", file=sys.stderr)
    
    # Apply role filter FIRST (strict matching)
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"FILTERING PHASE", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    print(f"Applying strict role filter (only target roles)...", file=sys.stderr)
    role_filter = RoleFilter(target_roles)
    role_matched_jobs = role_filter.filter_jobs(all_jobs)
    print(f"Role-matched jobs: {len(role_matched_jobs)} jobs", file=sys.stderr)
    
    # Apply mission-driven filter (balanced threshold)
    print(f"Applying mission-driven filter (threshold >= 40)...", file=sys.stderr)
    mission_filter = MissionDrivenFilter()
    mission_jobs = mission_filter.filter_jobs(role_matched_jobs, threshold=40.0)
    print(f"Mission-driven companies: {len(mission_jobs)} jobs", file=sys.stderr)
    
    # Apply salary filter
    print(f"Applying salary filter ($80k-$100k, lenient)...", file=sys.stderr)
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
            "target_roles": target_roles,
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
    print(f"Scraped: {len(all_jobs)} jobs from 7 sources × {len(target_roles)} roles", file=sys.stderr)
    print(f"Mission-driven: {len(mission_jobs)} jobs (score >= 35)", file=sys.stderr)
    print(f"Salary match: {len(salary_jobs)} jobs ($80k-$100k)", file=sys.stderr)
    print(f"Top matches: {len(top_jobs)} jobs", file=sys.stderr)
    
    if top_jobs:
        print(f"\nTop 5 Matches:", file=sys.stderr)
        for i, job in enumerate(top_jobs[:5], 1):
            prob = job.get("landing_probability", 0)
            mission = job.get("mission_score", 0)
            salary = job.get("salary", "Not specified")
            print(f"\n{i}. {job['title']} at {job['company']}", file=sys.stderr)
            print(f"   Landing: {prob:.0f}% | Mission: {mission:.0f}% | Salary: {salary}", file=sys.stderr)
            print(f"   Location: {job.get('location', 'N/A')}", file=sys.stderr)
            print(f"   Source: {job['source']}", file=sys.stderr)
            print(f"   URL: {job['url'][:70]}...", file=sys.stderr)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensive Job Scraper v4.0")
    parser.add_argument("--location", default="Los Angeles", help="Primary job location")
    parser.add_argument("--role", default="Sales Engineer", help="Primary job role")
    parser.add_argument("--profile", default="miles_profile.json", help="User profile JSON")
    parser.add_argument("--top", type=int, default=20, help="Number of top matches to return")
    
    args = parser.parse_args()
    
    main(args.location, args.role, args.profile, args.top)
