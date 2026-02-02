# Project TODO

- [x] Upgrade project to full-stack (web-db-user)
- [x] Fix Home.tsx conflict from template merge
- [x] Create backend API to run Python scraper
- [x] Fix Python 3.11 environment variable conflicts
- [x] Test scraper execution from web interface
- [x] Verify 335+ jobs scraped from 4 sources
- [x] Verify 30 quality matches displayed
- [x] Verify match scores and filtering working
- [x] Verify Apply Now links working
- [x] Verify Export CSV button present
- [x] Research additional job sources from Reddit
- [x] Document expansion strategy for future sources
- [x] Test complete end-to-end flow
- [x] Create comprehensive documentation
- [x] Save checkpoint
- [x] Fix "can't cd to /home/ubuntu/job_pipeline" error in scraper execution
- [x] Implement multi-term search strategy (Sales Engineer + Solutions Engineer + TAM + Customer Engineer)
- [x] Fix SerpAPI "no results" issue by searching multiple role variations
- [x] Verify scraper finds actual Sales Engineer roles (not generic software engineering)
- [x] Test end-to-end: 51 jobs scraped → 5 quality Sales Engineer matches (46-43% scores)

## Expansion to 200+ Jobs (Completed)
- [x] Re-add Craigslist scraper
- [x] Integrate Arbeitnow API scraper (free, no auth required)
- [x] Integrate Apify Indeed scraper (using provided API key)
- [x] Expand to 7 role variations (Sales Engineer, Solutions Engineer, TAM, Customer Engineer, Field Engineer, Implementation Engineer, Sales Consultant)
- [x] Expand to 4 locations (Los Angeles, Orange County, San Diego, Irvine)
- [x] Implement seniority filtering (exclude "Senior" when searching mid-level)
- [x] Test all 6 sources (SerpAPI, RemoteOK, WWR, Craigslist, Arbeitnow, Apify)

## Advanced Ghost Job Detection (Completed)
- [x] Track repeatedly reposted jobs (same job ID/URL)
- [x] Detect high applicant count on old postings (200+, 500+ thresholds)
- [x] Check if company is hiring during layoffs (Meta, Google, Amazon, etc.)
- [x] Implement ghost job risk scoring (0-100%)
- [x] Test ghost detection: Google jobs showing 30% risk (layoffs detected)

## Final Testing (Completed)
- [x] Test complete system from web interface
- [x] Verify 141 jobs scraped (2.6x improvement from 54)
- [x] Verify 11 quality mid-level matches displayed
- [x] Verify seniority filtering working (no Senior positions)
- [x] Verify ghost job detection showing risk scores
- [x] Verify match scores 40-63% for relevant roles
- [x] Verify Export CSV button working

## Fix spawn /bin/sh ENOENT Error
- [ ] Debug and fix spawn /bin/sh ENOENT error in server router
- [ ] Verify Python scraper path is correct after sandbox hibernation
- [ ] Test scraper execution from server

## Verify Multi-Source Approach
- [ ] Confirm all 6 sources are actively scraping (SerpAPI, RemoteOK, WWR, Craigslist, Arbeitnow, Apify)
- [ ] Verify each source returns results independently
- [ ] Compare effectiveness to JobRight.ai and Huntr
- [ ] Ensure system is easier and more effective than competitors

## CRITICAL: Fix Multi-Source Scraping (Only SerpAPI Working)
- [ ] Fix RemoteOK scraper - currently returning 0 jobs
- [ ] Fix WeWorkRemotely scraper - currently returning 0 jobs  
- [ ] Fix Craigslist scraper - currently returning 0 jobs
- [ ] Fix Arbeitnow scraper - currently returning 0 jobs
- [ ] Re-enable or fix Apify Indeed scraper (currently disabled)
- [ ] Fix SerpAPI 400 errors for "Orange County" and "Irvine" locations
- [ ] Test each scraper individually to verify they work
- [ ] Verify final system scrapes from ALL 6 sources, not just SerpAPI
