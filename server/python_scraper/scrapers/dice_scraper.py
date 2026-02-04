#!/usr/bin/env python3
"""
Dice job scraper
Scrapes tech jobs from Dice.com
Perfect for technical sales and engineering roles
"""

import requests
from bs4 import BeautifulSoup
import sys
from typing import List, Dict
import time

def scrape_dice(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape jobs from Dice.com
    
    Args:
        location: Location to search (e.g., "Los Angeles, CA")
        role: Job role to search for
        max_results: Maximum number of results to return
        
    Returns:
        List of job dictionaries
    """
    jobs = []
    
    try:
        # Dice search URL
        search_url = "https://www.dice.com/jobs"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.dice.com/'
        }
        
        # Build search parameters
        params = {
            'q': role,
            'location': location,
            'radius': '30',
            'radiusUnit': 'mi',
            'page': '1',
            'pageSize': str(max_results)
        }
        
        response = requests.get(search_url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find job cards (Dice uses specific class names)
        job_cards = soup.find_all('div', class_=['card', 'search-card'], limit=max_results)
        
        if not job_cards:
            # Try alternative selectors
            job_cards = soup.find_all('div', attrs={'data-cy': 'search-result'}, limit=max_results)
        
        if not job_cards:
            # Try finding any divs with job-related classes
            job_cards = soup.find_all('div', class_=lambda x: x and 'job' in x.lower(), limit=max_results)
        
        for card in job_cards[:max_results]:
            try:
                # Extract job details
                title_elem = card.find('a', class_=lambda x: x and 'job-title' in x.lower() if x else False)
                if not title_elem:
                    title_elem = card.find('h5') or card.find('a', attrs={'data-cy': 'card-title-link'})
                
                company_elem = card.find('a', class_=lambda x: x and 'company' in x.lower() if x else False)
                if not company_elem:
                    company_elem = card.find('span', class_=lambda x: x and 'company' in x.lower() if x else False)
                
                location_elem = card.find('span', class_=lambda x: x and 'location' in x.lower() if x else False)
                
                if not title_elem:
                    continue
                    
                title = title_elem.get_text(strip=True)
                company = company_elem.get_text(strip=True) if company_elem else "Unknown Company"
                job_location = location_elem.get_text(strip=True) if location_elem else location
                
                # Build full URL
                job_url = title_elem.get('href', '') if title_elem.name == 'a' else ""
                if job_url and not job_url.startswith('http'):
                    job_url = f"https://www.dice.com{job_url}"
                
                # Extract salary if available
                salary_elem = card.find('span', class_=lambda x: x and 'salary' in x.lower() if x else False)
                salary = salary_elem.get_text(strip=True) if salary_elem else ""
                
                # Extract description snippet
                desc_elem = card.find('div', class_=lambda x: x and 'description' in x.lower() if x else False)
                description = desc_elem.get_text(strip=True) if desc_elem else ""
                
                # Extract posted date
                posted_elem = card.find('span', class_=lambda x: x and 'posted' in x.lower() if x else False)
                posted_date = posted_elem.get_text(strip=True) if posted_elem else ""
                
                job = {
                    'title': title,
                    'company': company,
                    'location': job_location,
                    'url': job_url,
                    'source': 'Dice',
                    'description': description,
                    'salary': salary,
                    'posted_date': posted_date
                }
                
                jobs.append(job)
                
            except Exception as e:
                print(f"[Dice] Error parsing job card: {e}", file=sys.stderr)
                continue
        
        print(f"[Dice] Successfully scraped {len(jobs)} jobs", file=sys.stderr)
        
        # Add small delay to be respectful
        time.sleep(1)
        
    except requests.exceptions.RequestException as e:
        print(f"[Dice] Request failed: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[Dice] Unexpected error: {e}", file=sys.stderr)
    
    return jobs


if __name__ == "__main__":
    # Test the scraper
    jobs = scrape_dice("Los Angeles, CA", "Sales Engineer", max_results=10)
    print(f"\nFound {len(jobs)} jobs:")
    for job in jobs[:3]:
        print(f"- {job['title']} at {job['company']} ({job['location']})")
        print(f"  URL: {job['url']}")
