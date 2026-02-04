#!/usr/bin/env python3
"""
Strict Role Filter

Filters jobs to ONLY match user's target roles from their profile.
Excludes generic engineering roles unless explicitly in target_roles.
"""

import re
from typing import Dict, List

class RoleFilter:
    """Filter to strictly match user's target roles"""
    
    # Senior-level keywords to EXCLUDE (for junior/mid-level candidates)
    SENIOR_LEVEL_KEYWORDS = [
        "senior", "sr", "sr.", "lead", "principal", "staff", 
        "director", "vp", "vice president", "head of", "chief",
        "manager" # Exclude manager roles unless it's "Account Manager" or "Technical Account Manager"
    ]
    
    # Generic engineering roles to EXCLUDE (unless in user's target_roles)
    EXCLUDED_ENGINEERING_ROLES = [
        "software engineer", "backend engineer", "frontend engineer", "full stack engineer",
        "devops engineer", "site reliability engineer", "sre", "platform engineer",
        "data engineer", "ml engineer", "machine learning engineer", "ai engineer",
        "qa engineer", "test engineer", "quality assurance engineer",
        "security engineer", "infrastructure engineer", "systems engineer",
        "network engineer", "database engineer", "embedded engineer",
        "mobile engineer", "ios engineer", "android engineer",
        "web developer", "software developer", "programmer",
        "architect", "principal engineer", "staff engineer", "engineering manager"
    ]
    
    def __init__(self, target_roles: List[str], max_experience_years: int = 5):
        """
        Initialize role filter with user's target roles.
        
        Args:
            target_roles: List of roles from user profile (e.g., ["Sales Engineer", "Solutions Engineer"])
            max_experience_years: Maximum years of experience (default 5 = exclude senior roles)
        """
        self.target_roles = [role.lower().strip() for role in target_roles]
        self.max_experience_years = max_experience_years
        
    def is_senior_role(self, title: str) -> bool:
        """
        Check if title indicates a senior-level role.
        Returns True if role is too senior for candidate.
        """
        title_lower = title.lower()
        
        for keyword in self.SENIOR_LEVEL_KEYWORDS:
            # Special case: Allow "Technical Account Manager" and "Account Manager"
            if keyword == "manager":
                if "account manager" in title_lower or "technical account manager" in title_lower:
                    continue  # Don't exclude
                elif keyword in title_lower:
                    return True  # Exclude other manager roles
            # Check for senior keywords
            elif f" {keyword} " in f" {title_lower} " or title_lower.startswith(f"{keyword} "):
                return True
        
        return False
    
    def normalize_title(self, title: str) -> str:
        """Normalize job title for matching (but keep seniority for filtering)"""
        # Remove location info
        title = re.sub(r'\s*[-–]\s*[A-Z]{2,}\s*$', '', title)
        # Remove extra whitespace
        title = ' '.join(title.split())
        return title.lower().strip()
    
    def is_excluded_engineering_role(self, title: str) -> bool:
        """Check if title is a generic engineering role (to exclude)"""
        normalized = self.normalize_title(title)
        
        for excluded_role in self.EXCLUDED_ENGINEERING_ROLES:
            # Exact match or contains the excluded role
            if excluded_role in normalized:
                # But allow if it's actually a sales/solutions role
                if any(keyword in normalized for keyword in ["sales", "solutions", "pre-sales", "presales", "demo", "customer success", "technical account", "account manager"]):
                    return False  # Don't exclude
                return True  # Exclude
        
        return False
    
    def matches_target_role(self, title: str) -> bool:
        """Check if title matches any of user's target roles"""
        normalized = self.normalize_title(title)
        
        for target_role in self.target_roles:
            # Exact match
            if target_role == normalized:
                return True
            
            # Check for word-order-sensitive matches
            # "Solutions Engineer" should match "Senior Solutions Engineer"
            # but NOT "Solutions Software Engineer"
            target_words = target_role.split()
            
            # For multi-word target roles, check if words appear in correct order
            if len(target_words) > 1:
                # Find positions of target words in title
                positions = []
                for word in target_words:
                    if word in normalized:
                        positions.append(normalized.find(word))
                    else:
                        positions.append(-1)
                
                # If all words found and in correct order (ascending positions)
                if all(p >= 0 for p in positions) and positions == sorted(positions):
                    # Extra check: make sure there's no "software" or "developer" between them
                    between_text = normalized[positions[0]:positions[-1]]
                    if not any(bad in between_text for bad in ["software", "developer", "backend", "frontend"]):
                        return True
            
            # Single-word roles (e.g., "engineer") - skip to avoid false positives
            elif len(target_words) == 1:
                # Only match if it's the exact word (not part of compound)
                if f" {target_role} " in f" {normalized} ":
                    return True
        
        # Special case: "Technical Sales" variations
        if any(phrase in normalized for phrase in ["technical sales", "tech sales"]):
            return True
        
        return False
    
    def filter_jobs(self, jobs: List[Dict]) -> List[Dict]:
        """
        Filter jobs to ONLY include roles matching user's target_roles.
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Filtered list of jobs matching target roles
        """
        filtered_jobs = []
        
        for job in jobs:
            title = job.get("title", "")
            
            # Skip if empty title
            if not title:
                continue
            
            # EXCLUDE senior-level roles (NEW)
            if self.is_senior_role(title):
                continue
            
            # Exclude generic engineering roles
            if self.is_excluded_engineering_role(title):
                continue
            
            # Include if matches target role
            if self.matches_target_role(title):
                filtered_jobs.append(job)
        
        return filtered_jobs
    
    def get_match_explanation(self, title: str) -> str:
        """Get explanation of why title matched"""
        normalized = self.normalize_title(title)
        
        for target_role in self.target_roles:
            if target_role in normalized or normalized in target_role:
                return f"Matches target role: {target_role}"
        
        return "No match"


# Example usage
if __name__ == "__main__":
    # Test with Miles' target roles
    target_roles = [
        "Sales Engineer",
        "Solutions Engineer",
        "Technical Sales Specialist",
        "Demo Engineer",
        "Technical Demo Engineer",
        "Customer Engineer",
        "Technical Account Manager",
        "Pre-Sales Engineer",
        "Sales Development Representative"
    ]
    
    role_filter = RoleFilter(target_roles)
    
    # Test jobs
    test_jobs = [
        {"title": "Senior Sales Engineer", "company": "Cisco"},
        {"title": "Solutions Engineer", "company": "Block"},
        {"title": "Software Engineer", "company": "Google"},  # Should be excluded
        {"title": "ML Engineer", "company": "OpenAI"},  # Should be excluded
        {"title": "Technical Account Manager", "company": "AWS"},
        {"title": "QA Engineer", "company": "Meta"},  # Should be excluded
        {"title": "Pre-Sales Solutions Engineer", "company": "Salesforce"},
        {"title": "DevOps Engineer", "company": "Netflix"},  # Should be excluded
        {"title": "Demo Engineer", "company": "Manus"},
        {"title": "Backend Engineer", "company": "Stripe"},  # Should be excluded
    ]
    
    print("Testing Role Filter:")
    print("=" * 60)
    print(f"Target Roles: {', '.join(target_roles[:3])}...")
    print("=" * 60)
    
    for job in test_jobs:
        title = job["title"]
        company = job["company"]
        
        is_excluded = role_filter.is_excluded_engineering_role(title)
        matches = role_filter.matches_target_role(title)
        
        if matches and not is_excluded:
            status = "✅ INCLUDE"
        else:
            status = "❌ EXCLUDE"
        
        print(f"\n{status}: {title} at {company}")
        if is_excluded:
            print(f"  Reason: Generic engineering role")
        elif matches:
            print(f"  Reason: {role_filter.get_match_explanation(title)}")
        else:
            print(f"  Reason: Does not match target roles")
    
    print("\n" + "=" * 60)
    print("\nFiltered Results:")
    filtered = role_filter.filter_jobs(test_jobs)
    print(f"Found {len(filtered)} matching jobs out of {len(test_jobs)} total")
    
    for job in filtered:
        print(f"  - {job['title']} at {job['company']}")
