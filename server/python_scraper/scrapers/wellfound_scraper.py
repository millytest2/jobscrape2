#!/usr/bin/env python3
"""
Wellfound (formerly AngelList) job scraper
Scrapes startup jobs from Wellfound's public job board
Perfect for mission-driven, innovative startups
"""

import requests
from bs4 import BeautifulSoup
import sys
from typing import List, Dict

def scrape_wellfound(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape jobs from Wellfound (AngelList)
    
    Args:
        location: Location to search (e.g., "Los Angeles")
        role: Job role to search for
        max_results: Maximum number of results to return
        
    Returns:
        List of job dictionaries
    """
    jobs = []
    
    try:
        # Wellfound search URL
        # They have a public jobs page that can be scraped
        search_url = "https://wellfound.com/jobs"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        # Build search parameters
        params = {
            'role': role.lower().replace(' ', '-'),
            'location': location
        }
        
        response = requests.get(search_url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find job listings (Wellfound uses specific class names)
        # Note: These selectors may need adjustment based on their current HTML structure
        job_cards = soup.find_all('div', class_=['styles_component__UCLAu', 'styles_jobListing__PLqQ_'], limit=max_results)
        
        if not job_cards:
            # Try alternative selectors
            job_cards = soup.find_all('div', attrs={'data-test': 'JobSearchResult'}, limit=max_results)
        
        for card in job_cards[:max_results]:
            try:
                # Extract job details
                title_elem = card.find('h2') or card.find('a', class_='styles_title__xpQDw')
                company_elem = card.find('h3') or card.find('div', class_='styles_company__Y_SAH')
                location_elem = card.find('span', class_='styles_location__yPpYd')
                link_elem = card.find('a', href=True)
                
                if not title_elem:
                    continue
                    
                title = title_elem.get_text(strip=True)
                company = company_elem.get_text(strip=True) if company_elem else "Unknown Company"
                job_location = location_elem.get_text(strip=True) if location_elem else location
                
                # Build full URL
                job_url = link_elem['href'] if link_elem else ""
                if job_url and not job_url.startswith('http'):
                    job_url = f"https://wellfound.com{job_url}"
                
                # Extract salary if available
                salary_elem = card.find('span', class_='styles_salary__')
                salary = salary_elem.get_text(strip=True) if salary_elem else ""
                
                # Extract description snippet
                desc_elem = card.find('div', class_='styles_description__')
                description = desc_elem.get_text(strip=True) if desc_elem else ""
                
                job = {
                    'title': title,
                    'company': company,
                    'location': job_location,
                    'url': job_url,
                    'source': 'Wellfound',
                    'description': description,
                    'salary': salary,
                    'posted_date': ''  # Wellfound doesn't always show posted date
                }
                
                jobs.append(job)
                
            except Exception as e:
                print(f"[Wellfound] Error parsing job card: {e}", file=sys.stderr)
                continue
        
        print(f"[Wellfound] Successfully scraped {len(jobs)} jobs", file=sys.stderr)
        
    except requests.exceptions.RequestException as e:
        print(f"[Wellfound] Request failed: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[Wellfound] Unexpected error: {e}", file=sys.stderr)
    
    return jobs


if __name__ == "__main__":
    # Test the scraper
    jobs = scrape_wellfound("Los Angeles", "Sales Engineer", max_results=10)
    print(f"\nFound {len(jobs)} jobs:")
    for job in jobs[:3]:
        print(f"- {job['title']} at {job['company']} ({job['location']})")
        print(f"  URL: {job['url']}")
