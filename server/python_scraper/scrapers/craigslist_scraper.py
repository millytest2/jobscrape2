#!/usr/bin/env python3
"""
Craigslist job scraper - Fixed HTML parsing
Scrapes jobs from Craigslist for a given location and role
"""
import sys
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

def scrape_craigslist(location, role):
    """Scrape jobs from Craigslist"""
    jobs = []
    
    try:
        # Map location to Craigslist subdomain
        location_map = {
            "los angeles": "losangeles",
            "la": "losangeles",
            "san francisco": "sfbay",
            "sf": "sfbay",
            "new york": "newyork",
            "nyc": "newyork",
            "chicago": "chicago",
            "seattle": "seattle",
            "boston": "boston",
            "austin": "austin",
            "denver": "denver",
            "portland": "portland",
            "san diego": "sandiego",
            "orange county": "orangecounty",
            "irvine": "orangecounty"
        }
        
        subdomain = location_map.get(location.lower(), "losangeles")
        search_query = quote(role)
        
        url = f"https://{subdomain}.craigslist.org/search/jjj?query={search_query}"
        
        print(f"[Craigslist] Fetching: {url}", file=sys.stderr)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        listings = soup.find_all('li', class_='cl-static-search-result')
        
        print(f"[Craigslist] Found {len(listings)} listings", file=sys.stderr)
        
        for listing in listings[:30]:  # Limit to 30 jobs
            try:
                # Get title from the div inside the <a> tag
                title_div = listing.find('div', class_='title')
                if not title_div:
                    continue
                
                title = title_div.text.strip()
                
                # Get link from the <a> tag
                link_elem = listing.find('a')
                if not link_elem or not link_elem.get('href'):
                    continue
                
                job_url = link_elem['href']
                
                # Make URL absolute if needed
                if not job_url.startswith('http'):
                    if job_url.startswith('/'):
                        job_url = f"https://{subdomain}.craigslist.org{job_url}"
                    else:
                        job_url = f"https://{job_url}"
                
                # Extract location from details div
                location_div = listing.find('div', class_='location')
                job_location = location_div.text.strip() if location_div else location
                
                # Extract company if available (usually not on Craigslist)
                company = "Craigslist Posting"
                
                jobs.append({
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "url": job_url,
                    "source": "Craigslist",
                    "description": "",
                    "posted_date": "",
                    "salary": ""
                })
                
            except Exception as e:
                print(f"[Craigslist] Error parsing listing: {e}", file=sys.stderr)
                continue
        
        print(f"[Craigslist] Successfully scraped {len(jobs)} jobs", file=sys.stderr)
        
    except Exception as e:
        print(f"[Craigslist] Error: {e}", file=sys.stderr)
    
    return jobs

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python craigslist_scraper.py <location> <role>")
        sys.exit(1)
    
    location = sys.argv[1]
    role = sys.argv[2]
    
    jobs = scrape_craigslist(location, role)
    
    for job in jobs:
        print(f"{job['title']} at {job['company']} - {job['location']}")
