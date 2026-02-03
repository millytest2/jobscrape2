#!/usr/bin/env python3
"""
Remotive.io job scraper
Uses Remotive's free public API
100% free, no registration required, no rate limits!
Perfect for remote tech jobs
"""

import requests
import sys
from typing import List, Dict

def scrape_remotive(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape jobs from Remotive.io API
    
    Args:
        location: Location to search (not used - Remotive is remote-only)
        role: Job role to search for
        max_results: Maximum number of results to return
        
    Returns:
        List of job dictionaries
    """
    jobs = []
    
    try:
        # Remotive API endpoint (public, no auth required!)
        api_url = "https://remotive.com/api/remote-jobs"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)'
        }
        
        # Remotive API parameters
        # Note: Remotive API doesn't support search param well, so we fetch all and filter
        params = {
            'limit': 100  # Get more results to filter from
        }
        
        response = requests.get(api_url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract jobs from response
        if 'jobs' in data:
            for job_data in data['jobs'][:max_results]:
                try:
                    title = job_data.get('title', '')
                    company = job_data.get('company_name', 'Unknown Company')
                    job_location = job_data.get('candidate_required_location', 'Remote')
                    url = job_data.get('url', '')
                    description = job_data.get('description', '')
                    salary = job_data.get('salary', '')
                    posted_date = job_data.get('publication_date', '')
                    
                    # Filter by role relevance (more lenient)
                    role_keywords = role.lower().split()
                    title_lower = title.lower()
                    desc_lower = description.lower()
                    
                    # Check if any role keyword appears in title or description
                    has_match = any(keyword in title_lower or keyword in desc_lower for keyword in role_keywords)
                    if not has_match:
                        continue
                    
                    job = {
                        'title': title,
                        'company': company,
                        'location': job_location,
                        'url': url,
                        'source': 'Remotive',
                        'description': description[:500],  # Limit description
                        'salary': salary,
                        'posted_date': posted_date
                    }
                    
                    jobs.append(job)
                    
                except Exception as e:
                    print(f"[Remotive] Error parsing job: {e}", file=sys.stderr)
                    continue
        
        print(f"[Remotive] Successfully scraped {len(jobs)} jobs from API", file=sys.stderr)
        
    except requests.exceptions.RequestException as e:
        print(f"[Remotive] Request failed: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[Remotive] Unexpected error: {e}", file=sys.stderr)
    
    return jobs


if __name__ == "__main__":
    # Test the scraper
    jobs = scrape_remotive("Remote", "Sales Engineer", max_results=10)
    print(f"\nFound {len(jobs)} jobs:")
    for job in jobs[:3]:
        print(f"- {job['title']} at {job['company']} ({job['location']})")
        print(f"  URL: {job['url']}")
