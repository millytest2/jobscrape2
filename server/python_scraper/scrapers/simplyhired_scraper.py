#!/usr/bin/env python3
"""
SimplyHired RSS job scraper
Scrapes jobs from SimplyHired's RSS feeds
RSS feeds are designed for automated access - no bot protection!
"""

import requests
import xml.etree.ElementTree as ET
import sys
from typing import List, Dict
from urllib.parse import quote_plus
import re

def scrape_simplyhired(location: str, role: str, max_results: int = 50) -> List[Dict]:
    """
    Scrape jobs from SimplyHired RSS feed
    
    Args:
        location: Location to search (e.g., "Los Angeles, CA")
        role: Job role to search for
        max_results: Maximum number of results to return
        
    Returns:
        List of job dictionaries
    """
    jobs = []
    
    try:
        # SimplyHired RSS feed URL
        # Format: https://www.simplyhired.com/search?q={query}&l={location}&format=rss
        query = quote_plus(role)
        loc = quote_plus(location)
        rss_url = f"https://www.simplyhired.com/search?q={query}&l={loc}&format=rss"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0; +http://example.com/bot)'
        }
        
        response = requests.get(rss_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse RSS XML
        root = ET.fromstring(response.content)
        
        # Find all job items in the RSS feed
        for item in root.findall('.//item')[:max_results]:
            try:
                title = item.find('title').text if item.find('title') is not None else ""
                link = item.find('link').text if item.find('link') is not None else ""
                description = item.find('description').text if item.find('description') is not None else ""
                pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                
                # Extract company from title (usually format: "Job Title - Company Name")
                company = "Unknown Company"
                if " - " in title:
                    parts = title.split(" - ")
                    if len(parts) >= 2:
                        company = parts[-1].strip()
                        title = " - ".join(parts[:-1]).strip()
                
                # Extract location from description if available
                job_location = location
                if description:
                    # Look for location patterns in description
                    loc_match = re.search(r'Location:?\s*([^<\n]+)', description)
                    if loc_match:
                        job_location = loc_match.group(1).strip()
                
                # Extract salary from description if available
                salary = ""
                if description:
                    # Look for salary patterns
                    salary_patterns = [
                        r'\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|/)\s*(?:year|yr|hour|hr))?',
                        r'[\d,]+k\s*-\s*[\d,]+k',
                    ]
                    for pattern in salary_patterns:
                        salary_match = re.search(pattern, description, re.IGNORECASE)
                        if salary_match:
                            salary = salary_match.group(0)
                            break
                
                # Clean description (remove HTML tags)
                clean_desc = re.sub(r'<[^>]+>', '', description) if description else ""
                clean_desc = clean_desc[:500]  # Limit to 500 chars
                
                job = {
                    'title': title,
                    'company': company,
                    'location': job_location,
                    'url': link,
                    'source': 'SimplyHired',
                    'description': clean_desc,
                    'salary': salary,
                    'posted_date': pub_date
                }
                
                jobs.append(job)
                
            except Exception as e:
                print(f"[SimplyHired] Error parsing RSS item: {e}", file=sys.stderr)
                continue
        
        print(f"[SimplyHired] Successfully scraped {len(jobs)} jobs from RSS", file=sys.stderr)
        
    except requests.exceptions.RequestException as e:
        print(f"[SimplyHired] Request failed: {e}", file=sys.stderr)
    except ET.ParseError as e:
        print(f"[SimplyHired] XML parsing failed: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[SimplyHired] Unexpected error: {e}", file=sys.stderr)
    
    return jobs


if __name__ == "__main__":
    # Test the scraper
    jobs = scrape_simplyhired("Los Angeles, CA", "Sales Engineer", max_results=10)
    print(f"\nFound {len(jobs)} jobs:")
    for job in jobs[:3]:
        print(f"- {job['title']} at {job['company']} ({job['location']})")
        print(f"  URL: {job['url']}")
        if job['salary']:
            print(f"  Salary: {job['salary']}")
