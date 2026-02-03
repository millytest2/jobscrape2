#!/usr/bin/env python3
"""
Probability of Landing Calculator
Scores jobs based on how likely the user is to land them, not just keyword match

Scoring Factors (based on user preferences):
1. Company Size (<500 employees preferred) - 20%
2. Seniority Match (mid-level preferred) - 20%
3. Location Match (local vs remote) - 15%
4. Role Match (direct + indirect) - 25%
5. Recency (posted <14 days) - 10%
6. Application Competition (fewer applicants) - 10%
"""
import re
from datetime import datetime, timedelta
from typing import Dict

def calculate_landing_probability(job: Dict, user_preferences: Dict) -> int:
    """
    Calculate probability of landing this job (0-100 score)
    
    Args:
        job: Job dict with title, company, location, description, etc.
        user_preferences: Dict with:
            - role: Target role (e.g., "Sales Engineer")
            - location: Target location (e.g., "Los Angeles")
            - seniority: Preferred seniority ("junior", "mid", "senior")
            - company_size_preference: "small" (<500), "medium" (500-5000), "large" (>5000)
            - remote_preference: "remote", "hybrid", "onsite", "flexible"
    
    Returns:
        Score from 0-100 (higher = better chance of landing)
    """
    score = 0.0
    
    # Factor 1: Company Size Match (20 points)
    company_size_score = score_company_size(job, user_preferences.get('company_size_preference', 'small'))
    score += company_size_score * 0.20
    
    # Factor 2: Seniority Match (20 points)
    seniority_score = score_seniority_match(job, user_preferences.get('seniority', 'mid'))
    score += seniority_score * 0.20
    
    # Factor 3: Location Match (15 points)
    location_score = score_location_match(job, user_preferences.get('location', ''), user_preferences.get('remote_preference', 'flexible'))
    score += location_score * 0.15
    
    # Factor 4: Role Match (25 points)
    role_score = score_role_match(job, user_preferences.get('role', ''))
    score += role_score * 0.25
    
    # Factor 5: Recency (10 points)
    recency_score = score_recency(job)
    score += recency_score * 0.10
    
    # Factor 6: Application Competition (10 points)
    competition_score = score_competition(job)
    score += competition_score * 0.10
    
    return min(int(score), 100)

def score_company_size(job: Dict, preference: str) -> int:
    """Score based on company size preference"""
    description = (job.get('description', '') + ' ' + job.get('company', '')).lower()
    company = job.get('company', '').lower()
    
    # Try to detect company size from description
    # Look for patterns like "500+ employees", "startup", "Fortune 500"
    
    if preference == 'small':  # <500 employees preferred
        if any(word in description for word in ['startup', 'early stage', 'seed', 'series a', 'series b']):
            return 100
        elif any(word in description for word in ['50-200 employees', '100-500 employees', 'small team']):
            return 90
        elif any(word in description for word in ['fortune 500', 'enterprise', '10,000+', 'multinational']):
            return 30  # Large company (not preferred)
        else:
            return 60  # Unknown size, neutral
    
    elif preference == 'large':  # >5000 employees preferred
        if any(word in description for word in ['fortune 500', 'enterprise', '10,000+', 'multinational']):
            return 100
        elif any(word in description for word in ['startup', 'early stage', 'seed']):
            return 30
        else:
            return 60
    
    else:  # Medium or flexible
        return 70

def score_seniority_match(job: Dict, preferred_seniority: str) -> int:
    """Score based on seniority level match"""
    title = job.get('title', '').lower()
    
    # Detect job seniority
    if any(word in title for word in ['senior', 'sr.', 'sr ', 'lead', 'principal', 'staff']):
        job_seniority = 'senior'
    elif any(word in title for word in ['junior', 'jr.', 'jr ', 'entry', 'associate', ' i ', ' i-', ' i)', 'early career']):
        job_seniority = 'junior'
    else:
        job_seniority = 'mid'
    
    # Perfect match = 100, one level off = 50, two levels off = 0
    seniority_levels = ['junior', 'mid', 'senior']
    
    if job_seniority == preferred_seniority:
        return 100
    elif abs(seniority_levels.index(job_seniority) - seniority_levels.index(preferred_seniority)) == 1:
        return 50
    else:
        return 0

def score_location_match(job: Dict, preferred_location: str, remote_preference: str) -> int:
    """Score based on location match"""
    job_location = job.get('location', '').lower()
    preferred_location_lower = preferred_location.lower()
    
    # Check if job is remote
    is_remote = any(word in job_location for word in ['remote', 'anywhere', 'work from home', 'wfh'])
    
    if remote_preference == 'remote':
        # User prefers remote
        if is_remote:
            return 100
        elif preferred_location_lower in job_location:
            return 60  # Local but not remote
        else:
            return 20  # Neither remote nor local
    
    elif remote_preference == 'onsite':
        # User prefers onsite
        if is_remote:
            return 40
        elif preferred_location_lower in job_location:
            return 100
        else:
            return 30
    
    else:  # Flexible or hybrid
        if is_remote or preferred_location_lower in job_location:
            return 100
        else:
            return 50

def score_role_match(job: Dict, target_role: str) -> int:
    """Score based on how well the job title matches target role"""
    title = job.get('title', '').lower()
    target_role_lower = target_role.lower()
    
    # Direct match
    if target_role_lower in title:
        return 100
    
    # Indirect matches (role synonyms)
    role_synonyms = {
        'sales engineer': ['solutions engineer', 'technical account manager', 'customer engineer', 'field engineer'],
        'data scientist': ['machine learning engineer', 'applied scientist', 'ml engineer', 'ai engineer'],
        'product manager': ['product owner', 'technical product manager', 'tpm'],
        'solutions engineer': ['sales engineer', 'customer engineer', 'presales engineer'],
    }
    
    target_key = None
    for key in role_synonyms:
        if key in target_role_lower:
            target_key = key
            break
    
    if target_key:
        for synonym in role_synonyms[target_key]:
            if synonym in title:
                return 80  # Indirect match
    
    # Partial keyword match
    target_keywords = target_role_lower.split()
    matches = sum(1 for keyword in target_keywords if keyword in title)
    
    if matches >= len(target_keywords) * 0.6:
        return 60
    elif matches > 0:
        return 40
    else:
        return 0

def score_recency(job: Dict) -> int:
    """Score based on how recently the job was posted"""
    posted_date_str = job.get('posted_date', '')
    
    if not posted_date_str:
        return 50  # Unknown, neutral score
    
    try:
        # Try to parse various date formats
        posted_date_lower = posted_date_str.lower()
        
        # Handle relative dates like "2 days ago", "1 week ago"
        if 'day' in posted_date_lower or 'today' in posted_date_lower:
            days_match = re.search(r'(\d+)\s*day', posted_date_lower)
            if days_match:
                days_ago = int(days_match.group(1))
            elif 'today' in posted_date_lower:
                days_ago = 0
            else:
                days_ago = 1
            
            if days_ago <= 7:
                return 100
            elif days_ago <= 14:
                return 80
            elif days_ago <= 30:
                return 60
            else:
                return 30
        
        elif 'week' in posted_date_lower:
            weeks_match = re.search(r'(\d+)\s*week', posted_date_lower)
            if weeks_match:
                weeks_ago = int(weeks_match.group(1))
                if weeks_ago == 1:
                    return 80
                elif weeks_ago == 2:
                    return 60
                else:
                    return 40
        
        elif 'month' in posted_date_lower:
            return 30  # Old posting
        
        else:
            return 50  # Unknown format
    
    except Exception:
        return 50

def score_competition(job: Dict) -> int:
    """Score based on application competition (fewer applicants = better)"""
    applicant_count = job.get('applicant_count')
    
    if not applicant_count:
        # Try to extract from description
        description = job.get('description', '')
        applicant_match = re.search(r'(\d+)\+?\s*(applicants?|applications?)', description, re.IGNORECASE)
        if applicant_match:
            applicant_count = int(applicant_match.group(1))
    
    if not applicant_count:
        return 70  # Unknown, assume moderate competition
    
    # Fewer applicants = higher score
    if applicant_count < 10:
        return 100  # Very low competition
    elif applicant_count < 50:
        return 90  # Low competition
    elif applicant_count < 100:
        return 70  # Moderate competition
    elif applicant_count < 200:
        return 50  # High competition
    elif applicant_count < 500:
        return 30  # Very high competition
    else:
        return 10  # Extremely high competition (likely ghost job)

if __name__ == "__main__":
    # Test the scoring
    test_job = {
        'title': 'Sales Engineer',
        'company': 'Startup Inc',
        'location': 'Los Angeles, CA',
        'description': 'Join our 50-person startup. 25 applicants.',
        'posted_date': '3 days ago',
        'applicant_count': 25
    }
    
    test_preferences = {
        'role': 'Sales Engineer',
        'location': 'Los Angeles',
        'seniority': 'mid',
        'company_size_preference': 'small',
        'remote_preference': 'flexible'
    }
    
    score = calculate_landing_probability(test_job, test_preferences)
    print(f"Landing Probability Score: {score}/100")
