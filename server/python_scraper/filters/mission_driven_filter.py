#!/usr/bin/env python3
"""
Mission-Driven Company Filter

Identifies companies that are mission-driven, innovative, or solving unique problems
based on company descriptions, funding stage, and industry keywords.
"""

import re
from typing import Dict, List, Optional

class MissionDrivenFilter:
    """Filter to identify mission-driven, innovative companies"""
    
    # Keywords that indicate mission-driven or innovative companies
    MISSION_KEYWORDS = [
        # Mission-driven
        "mission", "purpose", "impact", "social good", "change the world",
        "make a difference", "transform", "revolutionize", "empower",
        "democratize", "accessibility", "sustainability", "climate",
        "healthcare", "education", "social impact", "non-profit",
        
        # Innovation
        "AI", "artificial intelligence", "machine learning", "ML",
        "deep learning", "generative AI", "LLM", "GPT",
        "cutting-edge", "innovative", "breakthrough", "pioneering",
        "next-generation", "state-of-the-art", "advanced technology",
        
        # Problem-solving
        "solving", "problem", "challenge", "pain point", "solution",
        "helping", "improving", "optimizing", "streamlining",
        "automating", "simplifying", "enabling",
        
        # Unique/Special
        "unique", "first-of-its-kind", "novel", "groundbreaking",
        "disruptive", "game-changing", "industry-leading",
        "award-winning", "recognized", "featured in"
    ]
    
    # Industries that tend to be mission-driven
    MISSION_INDUSTRIES = [
        "AI", "Machine Learning", "Data Science",
        "Healthcare", "HealthTech", "MedTech", "BioTech",
        "Education", "EdTech", "E-Learning",
        "Climate Tech", "Clean Energy", "Sustainability",
        "Social Impact", "Non-Profit", "NGO",
        "Developer Tools", "DevOps", "Infrastructure",
        "B2B SaaS", "Enterprise Software",
        "Data Analytics", "Business Intelligence",
        "Cybersecurity", "Privacy", "Security"
    ]
    
    # Funding stages (Series A-C preferred for startups)
    PREFERRED_FUNDING_STAGES = [
        "Series A", "Series B", "Series C",
        "Seed", "Pre-Seed", "Angel",
        "Venture-backed", "VC-backed"
    ]
    
    # Red flag keywords (avoid these companies)
    RED_FLAG_KEYWORDS = [
        "pyramid scheme", "MLM", "multi-level marketing",
        "commission only", "100% commission",
        "insurance sales", "door-to-door",
        "cold calling only", "telemarketing"
    ]
    
    # Industry exclusions (traditional/boring industries to avoid)
    EXCLUDED_INDUSTRIES = [
        "industrial equipment", "manufacturing", "compressor",
        "hvac", "plumbing", "construction equipment",
        "heavy machinery", "automotive parts", "hardware store",
        "retail", "restaurant", "hospitality",
        "insurance", "real estate", "mortgage",
        "traditional banking", "accounting firm",
        "law firm", "consulting firm"
    ]
    
    # Exciting companies whitelist (always include these)
    EXCITING_COMPANIES = [
        "openai", "anthropic", "stripe", "databricks",
        "snowflake", "figma", "notion", "airtable",
        "vercel", "supabase", "replicate", "hugging face",
        "cohere", "mistral", "together ai", "anyscale",
        "modal", "weights & biases", "langchain",
        "pinecone", "weaviate", "milvus", "chroma"
    ]
    
    def __init__(self):
        """Initialize the filter"""
        pass
    
    def calculate_mission_score(self, job: Dict) -> float:
        """
        Calculate mission-driven score (0-100) based on company description,
        industry, funding stage, and other signals.
        
        Args:
            job: Job dictionary with company info
            
        Returns:
            Mission score (0-100, higher = more mission-driven)
        """
        score = 0.0
        max_score = 100.0
        
        company_name = job.get("company", "").lower()
        description = job.get("description", "").lower()
        title = job.get("title", "").lower()
        
        # Combine all text for analysis
        all_text = f"{company_name} {description} {title}"
        
        # Check for red flags first (disqualify immediately)
        for red_flag in self.RED_FLAG_KEYWORDS:
            if red_flag in all_text:
                return 0.0  # Disqualify
        
        # Check for excluded industries (disqualify)
        for excluded in self.EXCLUDED_INDUSTRIES:
            if excluded in all_text:
                return 0.0  # Disqualify boring industries
        
        # Whitelist check - exciting companies get bonus points
        is_exciting_company = any(company in company_name for company in self.EXCITING_COMPANIES)
        if is_exciting_company:
            score += 50.0  # Big bonus for exciting companies
        
        # 1. Mission keyword matching (40 points max)
        mission_keyword_count = 0
        for keyword in self.MISSION_KEYWORDS:
            if keyword.lower() in all_text:
                mission_keyword_count += 1
        
        # Normalize to 40 points (diminishing returns after 10 keywords)
        mission_score = min(40.0, mission_keyword_count * 4.0)
        score += mission_score
        
        # 2. Mission industry matching (30 points max)
        industry_match = False
        for industry in self.MISSION_INDUSTRIES:
            if industry.lower() in all_text:
                industry_match = True
                score += 30.0
                break
        
        # 3. Funding stage matching (20 points max)
        for funding_stage in self.PREFERRED_FUNDING_STAGES:
            if funding_stage.lower() in all_text:
                score += 20.0
                break
        
        # 4. Company size signals (10 points max)
        # Look for signals of small-to-mid size companies
        if any(phrase in all_text for phrase in ["startup", "early-stage", "growing team", "small team"]):
            score += 10.0
        elif any(phrase in all_text for phrase in ["fortune 500", "enterprise", "10,000+ employees"]):
            # Large company - only give points if mission keywords are strong
            if mission_score >= 20.0:
                score += 5.0
        
        # Normalize to 0-100
        score = min(score, max_score)
        
        return score
    
    def is_mission_driven(self, job: Dict, threshold: float = 40.0) -> bool:
        """
        Check if company is mission-driven based on threshold.
        
        Args:
            job: Job dictionary
            threshold: Minimum score to be considered mission-driven (default 40)
            
        Returns:
            True if mission-driven, False otherwise
        """
        score = self.calculate_mission_score(job)
        return score >= threshold
    
    def filter_jobs(self, jobs: List[Dict], threshold: float = 40.0) -> List[Dict]:
        """
        Filter jobs to only include mission-driven companies.
        
        Args:
            jobs: List of job dictionaries
            threshold: Minimum mission score (default 40)
            
        Returns:
            Filtered list of jobs with mission scores added
        """
        filtered_jobs = []
        
        for job in jobs:
            mission_score = self.calculate_mission_score(job)
            
            if mission_score >= threshold:
                # Add mission score to job
                job["mission_score"] = mission_score
                filtered_jobs.append(job)
        
        return filtered_jobs
    
    def get_mission_explanation(self, job: Dict) -> str:
        """
        Get human-readable explanation of why company is mission-driven.
        
        Args:
            job: Job dictionary
            
        Returns:
            Explanation string
        """
        company_name = job.get("company", "Unknown")
        mission_score = job.get("mission_score", 0)
        description = job.get("description", "").lower()
        
        reasons = []
        
        # Check for specific signals
        if any(kw in description for kw in ["AI", "artificial intelligence", "machine learning"]):
            reasons.append("AI/ML company")
        
        if any(kw in description for kw in ["healthcare", "healthtech", "medical"]):
            reasons.append("Healthcare impact")
        
        if any(kw in description for kw in ["education", "edtech", "learning"]):
            reasons.append("Education impact")
        
        if any(kw in description for kw in ["climate", "sustainability", "clean energy"]):
            reasons.append("Climate/sustainability focus")
        
        if any(kw in description for kw in ["mission", "purpose", "impact", "social good"]):
            reasons.append("Mission-driven culture")
        
        if any(kw in description for kw in ["innovative", "cutting-edge", "breakthrough"]):
            reasons.append("Innovative technology")
        
        if any(kw in description for kw in ["Series A", "Series B", "Series C", "startup"]):
            reasons.append("Growth-stage startup")
        
        if reasons:
            return f"{company_name} ({int(mission_score)}% mission fit): {', '.join(reasons)}"
        else:
            return f"{company_name} ({int(mission_score)}% mission fit)"


# Example usage
if __name__ == "__main__":
    filter = MissionDrivenFilter()
    
    # Test with sample jobs
    test_jobs = [
        {
            "company": "Anthropic",
            "title": "Sales Engineer",
            "description": "Join Anthropic, a mission-driven AI safety company building Claude, a helpful, harmless, and honest AI assistant. We're pioneering research in AI alignment and safety to ensure AI benefits humanity."
        },
        {
            "company": "Generic Corp",
            "title": "Sales Engineer",
            "description": "Sell our enterprise software solutions to Fortune 500 companies. Cold calling and quota-driven environment."
        },
        {
            "company": "HealthTech Startup",
            "title": "Solutions Engineer",
            "description": "Series B healthcare startup using AI to improve patient outcomes and reduce healthcare costs. Join our mission to make healthcare accessible to everyone."
        }
    ]
    
    print("Testing Mission-Driven Filter:")
    print("=" * 60)
    
    for job in test_jobs:
        score = filter.calculate_mission_score(job)
        is_mission = filter.is_mission_driven(job)
        
        print(f"\nCompany: {job['company']}")
        print(f"Mission Score: {score:.1f}/100")
        print(f"Mission-Driven: {'✅ Yes' if is_mission else '❌ No'}")
        
        if is_mission:
            job["mission_score"] = score
            print(f"Explanation: {filter.get_mission_explanation(job)}")
    
    print("\n" + "=" * 60)
    print("\nFiltered Jobs (threshold=40):")
    filtered = filter.filter_jobs(test_jobs, threshold=40.0)
    print(f"Found {len(filtered)} mission-driven companies out of {len(test_jobs)} total")
    
    for job in filtered:
        print(f"  - {job['company']}: {job['mission_score']:.1f}% mission fit")
