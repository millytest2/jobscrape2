#!/usr/bin/env python3
"""
Job History Tracker - Detects repeatedly reposted jobs (ghost job indicator)
Stores job hashes and tracks when we see the same job multiple times
"""
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

HISTORY_FILE = Path("/home/ubuntu/job_pipeline/data/job_history.json")

def get_job_hash(company: str, title: str) -> str:
    """Create unique hash for a job based on company + title"""
    # Normalize strings
    company_norm = company.lower().strip()
    title_norm = title.lower().strip()
    
    # Create hash
    job_string = f"{company_norm}||{title_norm}"
    return hashlib.md5(job_string.encode()).hexdigest()

def load_job_history() -> Dict:
    """Load job history from file"""
    if not HISTORY_FILE.exists():
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        return {}
    
    try:
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def save_job_history(history: Dict):
    """Save job history to file"""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def record_job_sighting(company: str, title: str, url: str) -> Dict:
    """
    Record that we saw this job, return repost statistics
    
    Returns:
        {
            'times_seen': int,
            'first_seen': str (ISO date),
            'last_seen': str (ISO date),
            'days_active': int,
            'is_repost': bool (True if seen 3+ times over 30+ days)
        }
    """
    job_hash = get_job_hash(company, title)
    history = load_job_history()
    
    now = datetime.now().isoformat()
    
    if job_hash in history:
        # Job seen before
        job_data = history[job_hash]
        job_data['times_seen'] += 1
        job_data['last_seen'] = now
        job_data['urls'].append(url)
        
        # Calculate days active
        first_seen_dt = datetime.fromisoformat(job_data['first_seen'])
        last_seen_dt = datetime.fromisoformat(now)
        days_active = (last_seen_dt - first_seen_dt).days
        
        job_data['days_active'] = days_active
        
        # Flag as repost if seen 3+ times over 30+ days
        job_data['is_repost'] = job_data['times_seen'] >= 3 and days_active >= 30
        
    else:
        # First time seeing this job
        job_data = {
            'company': company,
            'title': title,
            'times_seen': 1,
            'first_seen': now,
            'last_seen': now,
            'days_active': 0,
            'is_repost': False,
            'urls': [url]
        }
    
    history[job_hash] = job_data
    save_job_history(history)
    
    return job_data

def get_job_repost_status(company: str, title: str) -> Optional[Dict]:
    """Check if a job has been reposted (without recording new sighting)"""
    job_hash = get_job_hash(company, title)
    history = load_job_history()
    return history.get(job_hash)

def cleanup_old_history(days_to_keep: int = 90):
    """Remove job history older than specified days"""
    history = load_job_history()
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    
    cleaned_history = {}
    for job_hash, job_data in history.items():
        last_seen_dt = datetime.fromisoformat(job_data['last_seen'])
        if last_seen_dt >= cutoff_date:
            cleaned_history[job_hash] = job_data
    
    save_job_history(cleaned_history)
    return len(history) - len(cleaned_history)  # Number of entries removed

if __name__ == "__main__":
    # Test the tracker
    print("Testing job history tracker...")
    
    # Record first sighting
    result = record_job_sighting("Google", "Sales Engineer", "https://example.com/job1")
    print(f"First sighting: {result}")
    
    # Record second sighting (same job)
    result = record_job_sighting("Google", "Sales Engineer", "https://example.com/job2")
    print(f"Second sighting: {result}")
    
    # Check status without recording
    status = get_job_repost_status("Google", "Sales Engineer")
    print(f"Current status: {status}")
