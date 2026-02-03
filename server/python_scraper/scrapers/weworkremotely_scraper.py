"""We Work Remotely Job Scraper - Fixed HTML parsing"""
import requests
import sys
from bs4 import BeautifulSoup
from typing import List, Dict

def scrape_weworkremotely(role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape WeWorkRemotely for Sales Engineer and related roles.
    Searches multiple relevant categories.
    """
    jobs = []
    
    # Categories to search for Sales Engineer roles
    categories = [
        'remote-sales-and-marketing-jobs',
        'remote-customer-support-jobs',
        'remote-full-stack-programming-jobs'  # Sometimes technical sales listed here
    ]
    
    # Sales Engineer keywords
    sales_keywords = [
        'sales engineer', 'solutions engineer', 'presales',
        'technical sales', 'solutions consultant', 'sales consultant',
        'technical account manager', 'customer engineer',
        'field engineer', 'implementation engineer'
    ]
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        
        for category in categories:
            if len(jobs) >= max_results:
                break
                
            url = f"https://weworkremotely.com/categories/{category}"
            try:
                response = requests.get(url, headers=headers, timeout=30)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all job listings (both feature and regular)
                job_listings = soup.find_all('li', class_=['feature', 'new-listing-container'])
                
                for listing in job_listings:
                    if len(jobs) >= max_results:
                        break
                        
                    try:
                        # Find title in h3 tag
                        title_elem = listing.find('h3', class_='new-listing__header__title')
                        if not title_elem:
                            title_elem = listing.find('span', class_='title')
                        
                        # Find link
                        link_elem = listing.find('a', class_='listing-link--unlocked')
                        if not link_elem:
                            link_elem = listing.find('a')
                        
                        # Find company (usually in the URL or separate element)
                        company_elem = listing.find('span', class_='company')
                        
                        if title_elem and link_elem:
                            title = title_elem.text.strip()
                            title_lower = title.lower()
                            
                            # Check if title matches Sales Engineer keywords
                            if any(keyword in title_lower for keyword in sales_keywords):
                                # Extract company from URL if not found in element
                                company = company_elem.text.strip() if company_elem else "Unknown"
                                if company == "Unknown" and link_elem.get('href'):
                                    # Try to extract from URL like /remote-jobs/company-name-job-title
                                    href = link_elem['href']
                                    parts = href.split('/')
                                    if len(parts) > 2:
                                        company = parts[2].split('-')[0].title()
                                
                                jobs.append({
                                    "title": title,
                                    "company": company,
                                    "location": "Remote",
                                    "url": f"https://weworkremotely.com{link_elem['href']}",
                                    "description": "",
                                    "source": "WeWorkRemotely",
                                    "posted_date": "",
                                    "salary": ""
                                })
                    except Exception as e:
                        print(f"[WeWorkRemotely] Error parsing listing: {e}", file=sys.stderr)
                        continue
                        
            except Exception as e:
                print(f"[WeWorkRemotely] Error fetching {category}: {e}", file=sys.stderr)
                continue
        
        print(f"[WeWorkRemotely] Scraped {len(jobs)} Sales Engineer jobs", file=sys.stderr)
    except Exception as e:
        print(f"[WeWorkRemotely] Error: {e}", file=sys.stderr)
    
    return jobs
