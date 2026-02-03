#!/usr/bin/env python3
"""Fast Web Runner for Job Scraper - Optimized for speed and reliability"""
import sys
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, '/home/ubuntu/job_pipeline')
from scrapers.serpapi_scraper import scrape_serpapi
from scrapers.remoteok_scraper import scrape_remoteok
from scrapers.weworkremotely_scraper import scrape_weworkremotely
from scrapers.craigslist_scraper import scrape_craigslist
from scrapers.arbeitnow_scraper import scrape_arbeitnow
from scrapers.themuse_scraper import scrape_themuse
from filters.location_filter import filter_by_location, calculate_location_score
from filters.ghost_job_detector import detect_ghost_job
from filters.landing_probability import calculate_landing_probability

# Role-agnostic keyword expansion
ROLE_EXPANSIONS = {
    "sales engineer": ["Solutions Engineer", "Technical Account Manager"],
    "data scientist": ["Machine Learning Engineer", "Applied Scientist"],
    "product manager": ["Product Owner", "Technical Product Manager"],
    "solutions engineer": ["Sales Engineer", "Customer Engineer"],
}

def get_search_terms(role):
    """Get search terms for a role (max 3 to avoid timeout)"""
    role_lower = role.lower()
    for key, expansions in ROLE_EXPANSIONS.items():
        if key in role_lower:
            return [role] + expansions[:2]  # Original + 2 expansions max
    return [role]  # Just the original role if no expansion

def get_locations(location):
    """Get locations to search (skip problematic ones)"""
    locations = [location]
    if "los angeles" in location.lower():
        # Only add San Diego - skip Orange County and Irvine (they cause 400 errors)
        locations.append("San Diego, CA")
    return locations

def extract_seniority_level(title):
    """Extract seniority level from job title"""
    title_lower = title.lower()
    if any(word in title_lower for word in ["senior", "sr.", "sr ", "lead", "principal", "staff"]):
        return "senior"
    elif any(word in title_lower for word in ["junior", "jr.", "jr ", "entry", "associate", " i ", " i-", " i)"]):
        return "junior"
    else:
        return "mid"

def calculate_role_match_score(job_title, search_role):
    """Calculate role match score (role-agnostic)"""
    title_lower = job_title.lower()
    role_lower = search_role.lower()
    
    # Extract seniority from both
    job_seniority = extract_seniority_level(job_title)
    search_seniority = extract_seniority_level(search_role)
    
    # Seniority filtering
    if search_seniority == "mid" and job_seniority != "mid":
        return 0
    elif job_seniority != search_seniority:
        return 0
    
    # Role keyword matching (simple but effective)
    role_keywords = role_lower.split()
    matches = sum(1 for keyword in role_keywords if keyword in title_lower)
    
    if matches >= len(role_keywords) * 0.6:  # 60% of keywords match
        return 100
    elif matches > 0:
        return 75
    else:
        return 0

def calculate_match_score(job, role, location):
    """Calculate comprehensive match score"""
    score = 0.0
    
    # Role matching (50% weight)
    role_score = calculate_role_match_score(job.get("title", ""), role)
    score += role_score * 0.5
    
    # Location matching (20% weight)
    location_score = calculate_location_score(job, location)
    score += location_score * 0.2
    
    # Job quality signals (30% weight)
    quality_score = 0
    if job.get("description") and len(job.get("description", "")) > 200:
        quality_score += 10
    if job.get("salary"):
        quality_score += 10
    if job.get("company") and job.get("company") != "Unknown":
        quality_score += 10
    score += quality_score * 0.3
    
    return min(int(score), 100)

def extract_excitement_factors(job):
    """Extract excitement factors from job description"""
    factors = []
    desc = (job.get('title', '') + ' ' + job.get('description', '')).lower()
    company = job.get('company', '').lower()
    
    # Technology factors
    if any(term in desc for term in ['ai', 'artificial intelligence', 'machine learning', 'ml']):
        factors.append('AI')
    if any(term in desc for term in ['saas', 'cloud', 'aws', 'gcp', 'azure']):
        factors.append('SaaS')
    
    # Company factors
    if 'startup' in desc or 'series' in desc:
        factors.append('startup')
    if 'yc' in company or 'y combinator' in desc:
        factors.append('YC')
    
    # Benefits
    if any(term in desc for term in ['health', 'healthcare', 'medical', 'dental']):
        factors.append('health')
    if any(term in desc for term in ['equity', 'stock options', 'rsu']):
        factors.append('equity')
    if 'remote' in desc or 'work from home' in desc:
        factors.append('remote')
    
    return factors

def scrape_source_safe(scraper_func, *args, source_name="Unknown"):
    """Safely scrape a source with timeout protection"""
    try:
        print(f"[{source_name}] Starting...", file=sys.stderr)
        jobs = scraper_func(*args)
        print(f"[{source_name}] Found {len(jobs)} jobs", file=sys.stderr)
        return jobs
    except Exception as e:
        print(f"[{source_name}] Error: {e}", file=sys.stderr)
        return []

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'status': 'error', 'message': 'Usage: web_runner_fast.py <location> <role>'}))
        sys.exit(1)
    
    location, role = sys.argv[1], sys.argv[2]
    
    try:
        print(f"[Scraping] Starting for role='{role}' location='{location}'", file=sys.stderr)
        all_jobs = []
        
        # Get optimized search terms and locations
        search_terms = get_search_terms(role)
        locations = get_locations(location)
        
        print(f"[Scraping] Will search {len(search_terms)} terms × {len(locations)} locations = {len(search_terms) * len(locations)} SerpAPI calls", file=sys.stderr)
        
        # 1. SerpAPI (Google Jobs) - reduced calls
        for search_term in search_terms:
            for loc in locations:
                jobs = scrape_source_safe(scrape_serpapi, loc, search_term, 20, source_name=f"SerpAPI ({search_term} in {loc})")
                all_jobs.extend(jobs)
        
        # 2-6. Other sources (run sequentially for now - can parallelize later)
        all_jobs.extend(scrape_source_safe(scrape_remoteok, role, 50, source_name="RemoteOK"))
        all_jobs.extend(scrape_source_safe(scrape_weworkremotely, role, 50, source_name="WeWorkRemotely"))
        all_jobs.extend(scrape_source_safe(scrape_craigslist, location, role, source_name="Craigslist"))
        all_jobs.extend(scrape_source_safe(scrape_arbeitnow, location, role, source_name="Arbeitnow"))
        all_jobs.extend(scrape_source_safe(scrape_themuse, location, role, 50, source_name="The Muse"))
        
        # Skip Apify Indeed for now (too slow)
        
        print(f"[Scraping] Found {len(all_jobs)} total jobs from all sources", file=sys.stderr)
        
        # Deduplicate by URL
        seen_urls = set()
        unique_jobs = []
        for job in all_jobs:
            url = job.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_jobs.append(job)
        
        print(f"[Deduplication] {len(unique_jobs)} unique jobs after removing duplicates", file=sys.stderr)
        
        # Filter by location
        filtered = filter_by_location(unique_jobs, location)
        print(f"[Filtering] {len(filtered)} jobs after location filter", file=sys.stderr)
        
        # Define user preferences for probability scoring
        user_preferences = {
            'role': role,
            'location': location,
            'seniority': 'mid',  # Default to mid-level
            'company_size_preference': 'small',  # Prefer <500 employees
            'remote_preference': 'flexible'  # Accept remote or local
        }
        
        # Calculate scores and enrich data
        for job in filtered:
            # Old match score (for backwards compatibility)
            job['final_score'] = calculate_match_score(job, role, location)
            
            # NEW: Probability of landing score (this is the key metric)
            job['landing_probability'] = calculate_landing_probability(job, user_preferences)
            
            # Ghost job detection
            ghost_result = detect_ghost_job(job, job_history=None, record_sighting=True)
            job['ghost_risk'] = ghost_result['risk_score']
            job['ghost_factors'] = ghost_result.get('risk_factors', [])
            
            # Excitement factors
            job['excitement_factors'] = extract_excitement_factors(job)
        
        # Filter by role match
        role_matched = [j for j in filtered if calculate_role_match_score(j.get("title", ""), role) > 0]
        print(f"[Filtering] {len(role_matched)} jobs after role matching", file=sys.stderr)
        
        # Sort by LANDING PROBABILITY (not just keyword match) and take top 20
        role_matched.sort(key=lambda x: x.get('landing_probability', 0), reverse=True)
        top = role_matched[:20]
        
        print(json.dumps({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'params': {'location': location, 'role': role},
            'stats': {'scraped': len(all_jobs), 'unique': len(unique_jobs), 'filtered': len(top)},
            'jobs': top
        }))
    except Exception as e:
        print(f"[Error] {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({'status': 'error', 'message': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
