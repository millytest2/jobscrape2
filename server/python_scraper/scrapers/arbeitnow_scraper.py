#!/usr/bin/env python3
"""
Arbeitnow job scraper - Enhanced for Sales Engineer roles
Uses the free Arbeitnow API (no auth required)
"""
import sys
import requests

def scrape_arbeitnow(location, role):
    """Scrape jobs from Arbeitnow API with enhanced Sales Engineer filtering"""
    jobs = []
    
    try:
        url = "https://www.arbeitnow.com/api/job-board-api"
        
        print(f"[Arbeitnow] Fetching jobs from API", file=sys.stderr)
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if 'data' not in data:
            print(f"[Arbeitnow] No data field in response", file=sys.stderr)
            return jobs
        
        all_jobs = data['data']
        print(f"[Arbeitnow] Received {len(all_jobs)} total jobs", file=sys.stderr)
        
        # Define Sales Engineer related keywords
        sales_engineer_keywords = [
            'sales engineer', 'sales engineering',
            'solutions engineer', 'solution engineer',
            'presales engineer', 'pre-sales engineer',
            'technical sales', 'sales consultant',
            'solutions consultant', 'solution consultant',
            'technical account manager', 'customer engineer',
            'field engineer', 'implementation engineer',
            'customer success engineer'
        ]
        
        # Exclude pure software engineering roles
        exclude_keywords = [
            'software engineer', 'backend engineer', 'frontend engineer',
            'full stack', 'fullstack', 'devops', 'data engineer',
            'machine learning', 'ml engineer', 'qa engineer',
            'security engineer', 'network engineer'
        ]
        
        for job in all_jobs:
            try:
                title = job.get('title', '')
                title_lower = title.lower()
                description = job.get('description', '').lower()
                
                # Check if title matches Sales Engineer keywords
                title_match = any(keyword in title_lower for keyword in sales_engineer_keywords)
                
                # Exclude irrelevant roles
                is_excluded = any(keyword in title_lower for keyword in exclude_keywords)
                
                # Only include if matches and not excluded
                if title_match and not is_excluded:
                    jobs.append({
                        "title": title,
                        "company": job.get('company_name', 'Unknown'),
                        "location": job.get('location', 'Remote'),
                        "url": job.get('url', ''),
                        "source": "Arbeitnow",
                        "description": job.get('description', ''),
                        "posted_date": job.get('created_at', ''),
                        "salary": ""
                    })
                    
                    if len(jobs) >= 50:  # Limit to 50 jobs
                        break
                        
            except Exception as e:
                print(f"[Arbeitnow] Error parsing job: {e}", file=sys.stderr)
                continue
        
        print(f"[Arbeitnow] Successfully filtered {len(jobs)} Sales Engineer jobs", file=sys.stderr)
        
    except Exception as e:
        print(f"[Arbeitnow] Error: {e}", file=sys.stderr)
    
    return jobs

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python arbeitnow_scraper.py <location> <role>")
        sys.exit(1)
    
    location = sys.argv[1]
    role = sys.argv[2]
    
    jobs = scrape_arbeitnow(location, role)
    
    for job in jobs:
        print(f"{job['title']} at {job['company']} - {job['location']}")
