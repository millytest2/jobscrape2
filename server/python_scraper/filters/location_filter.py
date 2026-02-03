"""Location filtering and scoring"""
import re

def normalize_location(location: str) -> str:
    """Normalize location string for comparison"""
    return location.lower().strip().replace(',', '').replace('.', '')

def filter_by_location(jobs: list, target_location: str) -> list:
    """Filter jobs by location - keep jobs in target location or remote"""
    target_norm = normalize_location(target_location)
    filtered = []
    
    for job in jobs:
        job_loc = normalize_location(job.get('location', ''))
        
        # Always include remote jobs
        if 'remote' in job_loc or 'anywhere' in job_loc:
            filtered.append(job)
            continue
        
        # Check if target location is in job location
        if target_norm in job_loc or any(word in job_loc for word in target_norm.split()):
            filtered.append(job)
            continue
    
    return filtered

def calculate_location_score(job: dict, target_location: str) -> int:
    """Calculate location match score (0-100)"""
    job_loc = normalize_location(job.get('location', ''))
    target_norm = normalize_location(target_location)
    
    # Remote jobs get high score
    if 'remote' in job_loc:
        return 90
    
    # Exact match
    if target_norm == job_loc:
        return 100
    
    # Partial match
    if target_norm in job_loc:
        return 85
    
    # City match
    target_words = set(target_norm.split())
    job_words = set(job_loc.split())
    overlap = len(target_words & job_words)
    if overlap > 0:
        return min(70 + (overlap * 10), 85)
    
    return 0
