"""RemoteOK Job Scraper - Enhanced for Sales Engineer roles"""
import requests
import sys
from typing import List, Dict

def scrape_remoteok(role: str, max_results: int = 100) -> List[Dict]:
    """
    Scrape RemoteOK API for Sales Engineer and related roles.
    Enhanced filtering to find actual Sales Engineer positions.
    """
    jobs = []
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get("https://remoteok.com/api", headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Define Sales Engineer related keywords (direct and indirect matches)
        sales_engineer_keywords = [
            'sales engineer', 'sales engineering',
            'solutions engineer', 'solution engineer',
            'presales engineer', 'pre-sales engineer',
            'technical sales', 'sales consultant',
            'solutions consultant', 'solution consultant',
            'technical account manager', 'customer engineer',
            'field engineer', 'implementation engineer',
            'customer success engineer', 'solutions architect'
        ]
        
        # Exclude pure SDR/BDR/Account Manager roles
        exclude_keywords = [
            'software engineer', 'backend engineer', 'frontend engineer',
            'full stack', 'fullstack', 'devops', 'data engineer',
            'machine learning', 'ml engineer', 'ai engineer',
            'mobile engineer', 'ios engineer', 'android engineer',
            'qa engineer', 'test engineer', 'sdet',
            'security engineer', 'network engineer', 'infrastructure engineer',
            'sdr', 'bdr', 'business development rep',
            'account executive', 'account manager'
        ]
        
        for job in data[1:]:  # Skip first element (metadata)
            if not isinstance(job, dict):
                continue
                
            title = job.get("position", "").lower()
            description = job.get("description", "").lower()
            
            # Check if title matches Sales Engineer keywords
            title_match = any(keyword in title for keyword in sales_engineer_keywords)
            
            # Check if description mentions Sales Engineer (for indirect matches)
            desc_match = any(keyword in description for keyword in sales_engineer_keywords[:6])  # Core keywords only
            
            # Exclude irrelevant roles
            is_excluded = any(keyword in title for keyword in exclude_keywords)
            
            if (title_match or desc_match) and not is_excluded:
                jobs.append({
                    "title": job.get("position", ""),
                    "company": job.get("company", ""),
                    "location": job.get("location", "Remote"),
                    "url": f"https://remoteok.com/remote-jobs/{job.get('slug', '')}",
                    "description": job.get("description", ""),
                    "source": "RemoteOK",
                    "posted_date": job.get("date", ""),
                    "salary": job.get("salary_min", "")
                })
                
                if len(jobs) >= max_results:
                    break
        
        print(f"[RemoteOK] Scraped {len(jobs)} Sales Engineer jobs", file=sys.stderr)
    except Exception as e:
        print(f"[RemoteOK] Error: {e}", file=sys.stderr)
    
    return jobs
