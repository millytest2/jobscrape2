#!/usr/bin/env python3
"""
WEB-OPTIMIZED JOB SCRAPER
Outputs JSON for web interface integration
Accepts location and role as parameters
"""
import sys
import json
import time
from datetime import datetime

sys.path.insert(0, '/home/ubuntu/job_pipeline')

from analyzers.resume_analyzer import get_profile
from scrapers.multi_source_aggregator import scrape_all_sources
from filters.location_filter import filter_by_location
from filters.ghost_job_detector import filter_ghost_jobs
from scorers.intelligent_scorer import score_all_jobs


def main(location: str, role: str):
    """Run job scraper and output JSON."""
    
    start_time = time.time()
    
    # Load profile
    profile = get_profile()
    
    # Override profile with user input
    profile['location'] = [location]
    profile['titles'] = [role]
    
    # Scrape jobs from all sources
    all_jobs = scrape_all_sources()
    
    # Count by source
    source_counts = {}
    for job in all_jobs:
        source = job.get('source', 'Unknown')
        source_counts[source] = source_counts.get(source, 0) + 1
    
    # Filter by location
    location_jobs, rejected_location = filter_by_location(all_jobs, strict=True)
    
    # Detect ghost jobs
    real_jobs, ghost_jobs = filter_ghost_jobs(location_jobs)
    
    # Score jobs
    scored_jobs = score_all_jobs(real_jobs, profile)
    
    # Sort by final score
    scored_jobs.sort(key=lambda x: x.get('final_score', 0), reverse=True)
    
    # Take top 30
    top_jobs = scored_jobs[:30]
    
    # Format for web output
    formatted_jobs = []
    for job in top_jobs:
        formatted_jobs.append({
            'title': job.get('title', 'Unknown'),
            'company': job.get('company', 'Unknown'),
            'location': job.get('location', 'Unknown'),
            'url': job.get('url', '#'),
            'final_score': round(job.get('final_score', 0), 1),
            'source': job.get('source', 'Unknown'),
            'ghost_risk': job.get('ghost_risk', 0),
            'excitement_factors': job.get('excitement_factors', [])
        })
    
    # Build result
    result = {
        'status': 'success',
        'timestamp': datetime.now().isoformat(),
        'params': {
            'location': location,
            'role': role
        },
        'stats': {
            'scraped': len(all_jobs),
            'filtered': len(top_jobs)
        },
        'jobs': formatted_jobs
    }
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        error_result = {
            'status': 'error',
            'message': 'Usage: python3 web_scraper.py <location> <role>'
        }
        print(json.dumps(error_result))
        sys.exit(1)
    
    location = sys.argv[1]
    role = sys.argv[2]
    
    try:
        main(location, role)
    except Exception as e:
        error_result = {
            'status': 'error',
            'message': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
