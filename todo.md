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

## Production Deployment Fix (Completed)
- [x] Migrate Python scraper to TypeScript/Node.js for production deployment
- [x] Create TypeScript scrapers for all 8 sources
- [x] Port mission-driven filter to TypeScript
- [x] Port landing probability calculator to TypeScript
- [x] Update tRPC router to use TypeScript scraper
- [x] Test on local dev server (150 jobs → 20 matches, 100-95% landing probability)

## Bundle Python Scraper for Production
- [ ] Copy Python scraper files into web app directory
- [ ] Add Python dependencies to deployment configuration
- [ ] Update server router to use bundled Python scraper
- [ ] Test on local dev server
- [ ] Test on published site

## Separate Python Scraper Service (Option 2)
- [ ] Create Flask API service that wraps Python scraper
- [ ] Deploy Flask service and get public URL
- [ ] Update web app to call Flask API instead of local Python
- [ ] Test end-to-end on local dev server
- [ ] Test on published site

## Node.js Backend Scraper (Completed)
- [x] Convert Python scraper to Node.js (server/routers.ts)
- [x] Implement 6 working scrapers (SerpAPI, RemoteOK, WeWorkRemotely, Jooble, Arbeitnow, Remotive)
- [x] Implement mission-driven filtering (35+ score threshold)
- [x] Implement landing probability calculator (6 factors)
- [x] Fix posted_date.includes error
- [x] Test on dev server: 103 jobs scraped → 20 top matches (75-80% landing probability)
- [x] Verify system works on backend (no CORS issues)
- [x] Ready for production deployment (no external Flask API needed)
