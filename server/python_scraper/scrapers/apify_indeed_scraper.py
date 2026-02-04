#!/usr/bin/env python3
"""
Apify Indeed job scraper
Uses Apify API to scrape Indeed jobs
"""
import sys
import requests
import time

APIFY_API_KEY = "apify_api_54Zl7lFBQGsNa2c9nRgdf6nvhoiQdo0AIYLg"

def scrape_apify_indeed(location, role):
    """Scrape jobs from Indeed via Apify"""
    jobs = []
    
    try:
        # Apify Indeed scraper actor ID
        actor_id = "misceres/indeed-scraper"
        
        # Start the actor run
        start_url = f"https://api.apify.com/v2/acts/{actor_id}/runs?token={APIFY_API_KEY}"
        
        payload = {
            "queries": [f"{role} in {location}"],
            "maxItems": 50,
            "parseCompanyDetails": False
        }
        
        print(f"[Apify Indeed] Starting scraper for '{role}' in '{location}'", file=sys.stderr)
        
        response = requests.post(start_url, json=payload, timeout=30)
        response.raise_for_status()
        
        run_data = response.json()
        run_id = run_data['data']['id']
        default_dataset_id = run_data['data']['defaultDatasetId']
        
        print(f"[Apify Indeed] Run started: {run_id}", file=sys.stderr)
        
        # Wait for the run to complete (max 2 minutes)
        status_url = f"https://api.apify.com/v2/acts/{actor_id}/runs/{run_id}?token={APIFY_API_KEY}"
        
        for i in range(24):  # Check every 5 seconds for 2 minutes
            time.sleep(5)
            status_response = requests.get(status_url, timeout=10)
            status_data = status_response.json()
            status = status_data['data']['status']
            
            print(f"[Apify Indeed] Status: {status}", file=sys.stderr)
            
            if status in ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']:
                break
        
        if status != 'SUCCEEDED':
            print(f"[Apify Indeed] Run did not succeed: {status}", file=sys.stderr)
            return jobs
        
        # Get the results
        dataset_url = f"https://api.apify.com/v2/datasets/{default_dataset_id}/items?token={APIFY_API_KEY}"
        
        results_response = requests.get(dataset_url, timeout=10)
        results_response.raise_for_status()
        
        results = results_response.json()
        
        print(f"[Apify Indeed] Retrieved {len(results)} jobs", file=sys.stderr)
        
        for job in results:
            try:
                # Extract applicant count if available
                applicant_count = job.get('applicants', job.get('applicantCount', None))
                description = job.get('description', '')
                
                # Add applicant count to description if available
                if applicant_count:
                    description = f"{applicant_count} applicants. {description}"
                
                jobs.append({
                    "title": job.get('positionName', job.get('title', 'Unknown')),
                    "company": job.get('company', 'Unknown'),
                    "location": job.get('location', location),
                    "url": job.get('url', job.get('link', '')),
                    "description": description,
                    "source": "Indeed (Apify)",
                    "posted_date": job.get('postedAt', job.get('datePosted', '')),
                    "salary": job.get('salary', ''),
                    "applicant_count": applicant_count  # Store for ghost detection
                })
            except Exception as e:
                print(f"[Apify Indeed] Error parsing job: {e}", file=sys.stderr)
                continue
        
        print(f"[Apify Indeed] Successfully scraped {len(jobs)} jobs", file=sys.stderr)
        
    except Exception as e:
        print(f"[Apify Indeed] Error: {e}", file=sys.stderr)
    
    return jobs

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python apify_indeed_scraper.py <location> <role>")
        sys.exit(1)
    
    location = sys.argv[1]
    role = sys.argv[2]
    
    jobs = scrape_apify_indeed(location, role)
    
    for job in jobs:
        print(f"{job['title']} at {job['company']} - {job['location']}")
