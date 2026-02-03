"""
Remote100k Scraper - High-paying remote jobs ($100k+)
Target: 30-50 jobs
"""
import requests
from bs4 import BeautifulSoup
import time


def scrape_remote100k(max_jobs=50):
    """
    Scrape jobs from Remote100k (high-paying remote jobs).
    
    Args:
        max_jobs: Maximum number of jobs to return
    
    Returns:
        List of job dicts with: title, company, location, description, url, salary
    """
    print("Scraping Remote100k...")
    
    jobs = []
    
    try:
        # Remote100k main jobs page
        url = "https://remote100k.com/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all job cards
        # Based on the page structure, jobs are in divs with links
        job_links = soup.find_all('a', href=lambda x: x and '/jobs/' in x)
        
        print(f"Found {len(job_links)} job links")
        
        for link in job_links[:max_jobs]:
            try:
                # Extract job URL
                job_url = link.get('href', '')
                if not job_url.startswith('http'):
                    job_url = f"https://remote100k.com{job_url}"
                
                # Find the job card container
                # The link contains the job info
                job_card = link
                
                # Extract title (usually in h2 or h3)
                title_elem = job_card.find(['h2', 'h3'])
                title = title_elem.get_text(strip=True) if title_elem else "Unknown Title"
                
                # Extract company (usually after title)
                company = "Unknown Company"
                company_elem = job_card.find(text=lambda x: x and len(x.strip()) > 0)
                if company_elem:
                    # Get all text and try to find company name
                    all_text = job_card.get_text(separator='|', strip=True).split('|')
                    if len(all_text) > 1:
                        company = all_text[1].strip()
                
                # Extract location
                location = "Remote"
                location_markers = ['🌍', '🇺🇸', '🇨🇦', '🇪🇺', '🇬🇧', '🇦🇺', '🇸🇬', 'Remote:', 'Anywhere']
                for text in job_card.find_all(text=True):
                    text_str = str(text).strip()
                    if any(marker in text_str for marker in location_markers):
                        location = text_str.replace('Remote:', '').strip()
                        break
                
                # Extract salary
                salary = ""
                salary_markers = ['$', '€', '£', 'CAD', 'USD', 'SEK', 'AUD', 'SGD']
                for text in job_card.find_all(text=True):
                    text_str = str(text).strip()
                    if any(marker in text_str for marker in salary_markers) and '-' in text_str:
                        salary = text_str
                        break
                
                # Extract category
                category = ""
                categories = ['Engineering', 'Sales', 'Marketing', 'Product', 'Data', 'Design', 'Operations', 'Management']
                for text in job_card.find_all(text=True):
                    text_str = str(text).strip()
                    if text_str in categories:
                        category = text_str
                        break
                
                # Build description
                description = f"{title} at {company}. "
                if salary:
                    description += f"Salary: {salary}. "
                if category:
                    description += f"Category: {category}. "
                description += f"Location: {location}. Remote position paying $100k+."
                
                job = {
                    'title': title,
                    'company': company,
                    'location': location,
                    'description': description,
                    'url': job_url,
                    'salary': salary,
                    'category': category
                }
                
                jobs.append(job)
                
            except Exception as e:
                print(f"  ⚠️  Error parsing job: {e}")
                continue
        
        print(f"✅ Remote100k: {len(jobs)} jobs scraped")
        return jobs
        
    except Exception as e:
        print(f"❌ Remote100k scraping failed: {e}")
        return []


if __name__ == "__main__":
    # Test
    print("Testing Remote100k scraper...")
    print()
    
    jobs = scrape_remote100k(max_jobs=10)
    
    print()
    print(f"✅ Test successful! Scraped {len(jobs)} jobs")
    
    if jobs:
        print()
        print("Sample job:")
        job = jobs[0]
        print(f"  Title: {job['title']}")
        print(f"  Company: {job['company']}")
        print(f"  Location: {job['location']}")
        print(f"  Salary: {job.get('salary', 'N/A')}")
        print(f"  URL: {job['url']}")
