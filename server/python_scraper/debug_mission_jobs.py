#!/usr/bin/env python3
"""Debug script to see mission-driven jobs"""

import json
from scrapers.jooble_scraper import scrape_jooble
from scrapers.remoteok_scraper import scrape_remoteok
from scrapers.weworkremotely_scraper import scrape_weworkremotely
from scrapers.craigslist_scraper import scrape_craigslist
from filters.mission_driven_filter import MissionDrivenFilter

# Scrape jobs
all_jobs = []
all_jobs.extend(scrape_jooble("Los Angeles, CA", "Sales Engineer"))
all_jobs.extend(scrape_remoteok("Sales Engineer"))
all_jobs.extend(scrape_weworkremotely("Sales Engineer"))
all_jobs.extend(scrape_craigslist("Los Angeles", "Sales Engineer"))

print(f"Total jobs: {len(all_jobs)}\n")

# Apply mission filter
mission_filter = MissionDrivenFilter()
for job in all_jobs:
    job["mission_score"] = mission_filter.calculate_mission_score(job)

# Sort by mission score
all_jobs.sort(key=lambda x: x.get("mission_score", 0), reverse=True)

# Show top 10
print("Top 10 by mission score:")
print("=" * 80)
for i, job in enumerate(all_jobs[:10], 1):
    print(f"\n{i}. {job['title']} at {job['company']}")
    print(f"   Mission Score: {job['mission_score']:.1f}/100")
    print(f"   Salary: {job.get('salary', 'Not specified')}")
    print(f"   Source: {job['source']}")
    print(f"   Description snippet: {job.get('description', '')[:150]}...")
