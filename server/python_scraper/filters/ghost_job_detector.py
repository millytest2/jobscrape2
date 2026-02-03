"""Advanced ghost job detection based on multiple risk factors"""
import re
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

sys.path.insert(0, '/home/ubuntu/job_pipeline')
from filters.job_history_tracker import record_job_sighting, get_job_repost_status

def detect_ghost_job(job: dict, job_history: List[dict] = None, record_sighting: bool = True) -> Dict:
    """
    Detect if a job is likely a ghost job based on multiple criteria.
    Returns a dict with risk_score (0-100) and risk_factors.
    
    Ghost job indicators:
    1. Repeatedly reposted (same company + similar title) - tracked via job_history_tracker
    2. Old posting with high applicant count
    3. Company is hiring during known layoffs
    
    Args:
        job: Job dict with company, title, url, description
        job_history: Legacy parameter (deprecated, uses tracker instead)
        record_sighting: Whether to record this job sighting in tracker (default True)
    """
    risk_score = 0
    risk_factors = []
    
    company = job.get('company', 'Unknown')
    title = job.get('title', '')
    url = job.get('url', '')
    
    # Factor 1: Repeatedly reposted (30 points) - using job history tracker
    if record_sighting and company and title:
        repost_data = record_job_sighting(company, title, url)
    else:
        repost_data = get_job_repost_status(company, title) if company and title else None
    
    if repost_data and repost_data.get('is_repost'):
        times_seen = repost_data.get('times_seen', 0)
        days_active = repost_data.get('days_active', 0)
        risk_score += 30
        risk_factors.append(f"Reposted {times_seen} times over {days_active} days")
    elif repost_data and repost_data.get('times_seen', 0) == 2:
        risk_score += 15
        risk_factors.append("Seen twice (potential repost)")
    
    # Factor 2: High applicant count on old posting (40 points)
    applicant_risk = check_applicant_count(job)
    risk_score += applicant_risk['score']
    if applicant_risk['factor']:
        risk_factors.append(applicant_risk['factor'])
    
    # Factor 3: Company layoffs while hiring (30 points)
    layoff_risk = check_company_layoffs(job)
    risk_score += layoff_risk['score']
    if layoff_risk['factor']:
        risk_factors.append(layoff_risk['factor'])
    
    return {
        'risk_score': min(risk_score, 100),
        'risk_factors': risk_factors,
        'is_ghost': risk_score >= 50  # 50%+ risk = likely ghost job
    }

def count_reposts(job: dict, job_history: List[dict]) -> int:
    """Count how many times this job has been reposted"""
    company = job.get('company', '').lower()
    title = job.get('title', '').lower()
    
    # Normalize title for comparison (remove seniority, location, etc.)
    normalized_title = normalize_job_title(title)
    
    repost_count = 0
    for historical_job in job_history:
        hist_company = historical_job.get('company', '').lower()
        hist_title = normalize_job_title(historical_job.get('title', '').lower())
        
        # Same company + similar title = repost
        if company == hist_company and title_similarity(normalized_title, hist_title) > 0.8:
            repost_count += 1
    
    return repost_count

def normalize_job_title(title: str) -> str:
    """Remove seniority levels, locations, and other noise from job title"""
    # Remove common prefixes/suffixes
    title = re.sub(r'\b(senior|sr|junior|jr|lead|principal|staff|entry level|mid level)\b', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\([^)]*\)', '', title)  # Remove parentheses content
    title = re.sub(r'\s+', ' ', title).strip()  # Normalize whitespace
    return title

def title_similarity(title1: str, title2: str) -> float:
    """Calculate similarity between two job titles (0-1)"""
    words1 = set(title1.split())
    words2 = set(title2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union)

def check_applicant_count(job: dict) -> Dict:
    """Check if job has suspiciously high applicant count for its age"""
    applicant_count = None
    
    # First check if applicant_count is directly provided (from Apify/LinkedIn)
    if 'applicant_count' in job and job['applicant_count']:
        applicant_count = int(job['applicant_count'])
    else:
        # Fall back to extracting from description
        description = job.get('description', '')
        applicant_match = re.search(r'(\d+)\+?\s*(applicants?|applications?)', description, re.IGNORECASE)
        if applicant_match:
            applicant_count = int(applicant_match.group(1))
    
    if not applicant_count:
        return {'score': 0, 'factor': None}
    
    # High applicant count thresholds
    if applicant_count >= 500:
        return {'score': 40, 'factor': f'{applicant_count}+ applicants (very high)'}
    elif applicant_count >= 200:
        return {'score': 25, 'factor': f'{applicant_count}+ applicants (high)'}
    elif applicant_count >= 100:
        return {'score': 15, 'factor': f'{applicant_count}+ applicants (moderate)'}
    
    return {'score': 0, 'factor': None}

def check_company_layoffs(job: dict) -> Dict:
    """Check if company is known to be doing layoffs while hiring"""
    company = job.get('company', '').lower()
    
    # Known companies with recent layoffs (2024-2025)
    # This list should be updated regularly from layoff tracking sites
    layoff_companies = {
        'meta': 'Recent layoffs reported',
        'facebook': 'Recent layoffs reported',
        'google': 'Recent layoffs reported',
        'alphabet': 'Recent layoffs reported',
        'amazon': 'Recent layoffs reported',
        'microsoft': 'Recent layoffs reported',
        'salesforce': 'Recent layoffs reported',
        'tesla': 'Recent layoffs reported',
        'twitter': 'Recent layoffs reported',
        'x corp': 'Recent layoffs reported',
        'uber': 'Recent layoffs reported',
        'lyft': 'Recent layoffs reported',
        'snap': 'Recent layoffs reported',
        'snapchat': 'Recent layoffs reported',
    }
    
    for layoff_company, reason in layoff_companies.items():
        if layoff_company in company:
            return {'score': 30, 'factor': f'Company has {reason.lower()}'}
    
    return {'score': 0, 'factor': None}

def calculate_ghost_risk_percentage(job: dict, job_history: List[dict] = None) -> int:
    """Calculate ghost job risk as a percentage (0-100)"""
    result = detect_ghost_job(job, job_history)
    return result['risk_score']
