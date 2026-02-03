#!/usr/bin/env python3
"""
USAJobs.gov job scraper
Uses USAJobs official API
100% free, no registration required!
Perfect for government and contractor jobs
"""

import requests
import sys
from typing import List, Dict

def scrape_usajobs(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape jobs from USAJobs.gov API
    
    Args:
        location: Location to search (e.g., "Los Angeles, CA")
        role: Job role to search for
        max_results: Maximum number of results to return
        
    Returns:
        List of job dictionaries
    """
    jobs = []
    
    try:
        # USAJobs API endpoint (public, no auth required!)
        api_url = "https://data.usajobs.gov/api/search"
        
        headers = {
            'User-Agent': 'JobBot/1.0 (contact@example.com)',
            'Host': 'data.usajobs.gov'
        }
        
        # USAJobs API parameters
        params = {
            'Keyword': role,
            'LocationName': location,
            'ResultsPerPage': min(max_results, 500)  # API max is 500
        }
        
        response = requests.get(api_url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract jobs from response
        if 'SearchResult' in data and 'SearchResultItems' in data['SearchResult']:
            for item in data['SearchResult']['SearchResultItems'][:max_results]:
                try:
                    job_data = item.get('MatchedObjectDescriptor', {})
                    
                    title = job_data.get('PositionTitle', '')
                    company = job_data.get('OrganizationName', 'US Government')
                    
                    # Get location
                    locations = job_data.get('PositionLocation', [])
                    if locations and len(locations) > 0:
                        loc_data = locations[0]
                        city = loc_data.get('CityName', '')
                        state = loc_data.get('CountrySubDivisionCode', '')
                        job_location = f"{city}, {state}" if city and state else location
                    else:
                        job_location = location
                    
                    # Get URL
                    url = job_data.get('PositionURI', '')
                    
                    # Get description
                    description = job_data.get('UserArea', {}).get('Details', {}).get('JobSummary', '')
                    
                    # Get salary
                    salary_min = job_data.get('PositionRemuneration', [{}])[0].get('MinimumRange', '')
                    salary_max = job_data.get('PositionRemuneration', [{}])[0].get('MaximumRange', '')
                    salary = f"${salary_min}-${salary_max}" if salary_min and salary_max else ""
                    
                    # Get posted date
                    posted_date = job_data.get('PublicationStartDate', '')
                    
                    job = {
                        'title': title,
                        'company': company,
                        'location': job_location,
                        'url': url,
                        'source': 'USAJobs',
                        'description': description[:500],  # Limit description
                        'salary': salary,
                        'posted_date': posted_date
                    }
                    
                    jobs.append(job)
                    
                except Exception as e:
                    print(f"[USAJobs] Error parsing job: {e}", file=sys.stderr)
                    continue
        
        print(f"[USAJobs] Successfully scraped {len(jobs)} jobs from API", file=sys.stderr)
        
    except requests.exceptions.RequestException as e:
        print(f"[USAJobs] Request failed: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[USAJobs] Unexpected error: {e}", file=sys.stderr)
    
    return jobs


if __name__ == "__main__":
    # Test the scraper
    jobs = scrape_usajobs("Los Angeles, CA", "Sales Engineer", max_results=10)
    print(f"\nFound {len(jobs)} jobs:")
    for job in jobs[:3]:
        print(f"- {job['title']} at {job['company']} ({job['location']})")
        print(f"  URL: {job['url']}")
        if job['salary']:
            print(f"  Salary: {job['salary']}")
