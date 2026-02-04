#!/usr/bin/env python3
"""Web Runner for Job Scraper with 6 Sources and Seniority Filtering"""
import sys
import json
from datetime import datetime

sys.path.insert(0, '/home/ubuntu/job_pipeline')
from scrapers.serpapi_scraper import scrape_serpapi
from scrapers.remoteok_scraper import scrape_remoteok
from scrapers.weworkremotely_scraper import scrape_weworkremotely
from scrapers.craigslist_scraper import scrape_craigslist
from scrapers.arbeitnow_scraper import scrape_arbeitnow
from scrapers.apify_indeed_scraper import scrape_apify_indeed
from filters.location_filter import filter_by_location, calculate_location_score
from filters.ghost_job_detector import detect_ghost_job

# Sales Engineer role mapping - direct and indirect matches
ROLE_MAPPINGS = {
    "sales engineer": {
        "direct": ["sales engineer", "sales engineering", "se -", "pre-sales engineer", "presales engineer"],
        "indirect": ["solutions engineer", "solutions architect", "technical account manager",
                    "customer engineer", "field engineer", "customer success engineer", 
                    "implementation engineer", "sales consultant", "technical sales"]
    },
    "solutions engineer": {
        "direct": ["solutions engineer", "solution engineer", "solutions engineering"],
        "indirect": ["sales engineer", "technical account manager", "customer engineer", 
                    "field engineer", "presales engineer"]
    }
}

def extract_seniority_level(title):
    """Extract seniority level from job title"""
    title_lower = title.lower()
    
    if any(word in title_lower for word in ["senior", "sr.", "sr ", "lead", "principal", "staff"]):
        return "senior"
    elif any(word in title_lower for word in ["junior", "jr.", "jr ", "entry", "associate", " i ", " i-", " i)"]):
        return "junior"
    else:
        return "mid"

def get_role_keywords(role):
    """Get direct and indirect role keywords for matching"""
    role_lower = role.lower()
    for key, mapping in ROLE_MAPPINGS.items():
        if key in role_lower:
            return mapping["direct"], mapping["indirect"]
    # Fallback to simple keyword split
    return [role_lower], []

def calculate_role_match_score(job_title, search_role):
    """Calculate how well the job title matches the target role (respecting seniority)"""
    title_lower = job_title.lower()
    
    # Extract seniority from both
    job_seniority = extract_seniority_level(job_title)
    search_seniority = extract_seniority_level(search_role)
    
    # CRITICAL: If search doesn't specify seniority (mid-level), EXCLUDE senior and junior
    if search_seniority == "mid":
        if job_seniority != "mid":
            print(f"[Filter] Excluding {job_title} - seniority mismatch (job={job_seniority}, search={search_seniority})", file=sys.stderr)
            return 0
    # If search specifies seniority, must match exactly
    elif job_seniority != search_seniority:
        print(f"[Filter] Excluding {job_title} - seniority mismatch (job={job_seniority}, search={search_seniority})", file=sys.stderr)
        return 0
    
    # Now check role matching
    direct_keywords, indirect_keywords = get_role_keywords(search_role)
    
    # Direct match gets full points
    for keyword in direct_keywords:
        if keyword in title_lower:
            return 100
    
    # Indirect match gets partial points
    for keyword in indirect_keywords:
        if keyword in title_lower:
            return 75
    
    # NO match - exclude
    return 0

def calculate_ghost_risk_simple(job):
    """Simple ghost job detection for backward compatibility"""
    risk_score = 0
    
    # Check description quality
    desc = job.get("description", "")
    if len(desc) < 100:
        risk_score += 20
    
    # Generic descriptions are suspicious
    generic_phrases = ["fast-paced environment", "wear many hats", "rockstar", "ninja"]
    if any(phrase in desc.lower() for phrase in generic_phrases):
        risk_score += 15
    
    # Missing salary is a yellow flag
    if not job.get("salary"):
        risk_score += 10
    
    # Missing company info
    if not job.get("company") or job.get("company") == "Unknown":
        risk_score += 15
    
    return min(risk_score, 100)

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

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'status': 'error', 'message': 'Usage: web_runner.py <location> <role>'}), file=sys.stderr)
        sys.exit(1)
    
    location, role = sys.argv[1], sys.argv[2]
    
    try:
        # Scrape from ALL 6 sources
        print(f"[Scraping] Starting for role='{role}' location='{location}'", file=sys.stderr)
        all_jobs = []
        
        # For Sales Engineer, search multiple related terms
        search_terms = [role]
        if "sales engineer" in role.lower():
            search_terms.extend([
                "Solutions Engineer",
                "Technical Account Manager", 
                "Customer Engineer",
                "Field Engineer",
                "Implementation Engineer",
                "Sales Consultant"
            ])
        
        # Expand location to nearby cities for more results
        locations = [location]
        if "los angeles" in location.lower():
            locations.extend(["Orange County, CA", "San Diego, CA", "Irvine, CA"])
        
        # 1. SerpAPI (Google Jobs) - search all term/location combinations
        for search_term in search_terms:
            for loc in locations:
                print(f"[SerpAPI] Searching: {search_term} in {loc}", file=sys.stderr)
                serpapi_jobs = scrape_serpapi(loc, search_term, 50)
                all_jobs.extend(serpapi_jobs)
                print(f"[SerpAPI] Added {len(serpapi_jobs)} jobs", file=sys.stderr)
        
        # 2. RemoteOK
        print(f"[RemoteOK] Searching...", file=sys.stderr)
        all_jobs.extend(scrape_remoteok(role, 50))
        
        # 3. We Work Remotely
        print(f"[WeWorkRemotely] Searching...", file=sys.stderr)
        all_jobs.extend(scrape_weworkremotely(role, 50))
        
        # 4. Craigslist
        print(f"[Craigslist] Searching...", file=sys.stderr)
        all_jobs.extend(scrape_craigslist(location, role))
        
        # 5. Arbeitnow
        print(f"[Arbeitnow] Searching...", file=sys.stderr)
        all_jobs.extend(scrape_arbeitnow(location, role))
        
        # 6. Apify Indeed (optional - slow, may timeout)
        try:
            print(f"[Apify Indeed] Searching (may take 2 minutes)...", file=sys.stderr)
            apify_jobs = scrape_apify_indeed(location, role)
            all_jobs.extend(apify_jobs)
            print(f"[Apify Indeed] Added {len(apify_jobs)} jobs", file=sys.stderr)
        except Exception as e:
            print(f"[Apify Indeed] Skipped due to error: {e}", file=sys.stderr)
        
        print(f"[Scraping] Found {len(all_jobs)} total jobs from 6 sources", file=sys.stderr)
        
        # Filter by location
        filtered = filter_by_location(all_jobs, location)
        print(f"[Filtering] {len(filtered)} jobs after location filter", file=sys.stderr)
        
        # Calculate scores and enrich data
        for job in filtered:
            job['final_score'] = calculate_match_score(job, role, location)
            # Use advanced ghost job detection
            ghost_result = detect_ghost_job(job, job_history=None)  # TODO: Pass job history for repost detection
            job['ghost_risk'] = ghost_result['risk_score']
            job['excitement_factors'] = extract_excitement_factors(job)
        
        # Filter by role match - only keep jobs with role score > 0 (respects seniority)
        role_matched = [j for j in filtered if calculate_role_match_score(j.get("title", ""), role) > 0]
        print(f"[Filtering] {len(role_matched)} jobs after role + seniority matching", file=sys.stderr)
        
        # Sort by match score and take top 30
        role_matched.sort(key=lambda x: x['final_score'], reverse=True)
        top = role_matched[:30]
        
        print(json.dumps({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'params': {'location': location, 'role': role},
            'stats': {'scraped': len(all_jobs), 'filtered': len(top)},
            'jobs': top
        }))
    except Exception as e:
        print(f"[Error] {str(e)}", file=sys.stderr)
        print(json.dumps({'status': 'error', 'message': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
