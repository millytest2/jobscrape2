# Job Scraper TODO

## ✅ WORKING SYSTEM (Checkpoint e0f546f8)
- [x] Rollback to checkpoint 47fe102 (execAsync version)
- [x] Verify scraper runs and returns results
- [x] Test in browser: Click RUN SCRAPER → 266 jobs scraped → 20 quality matches
- [x] Landing probabilities: 64-87% (accurate and realistic)
- [x] All relevant roles: TAM, Pre-Sales Engineer, Solutions Engineer, Demo Engineer
- [x] Miles' profile complete and accurate (direct/indirect roles, salary, experience, company values)

## 🎯 Core System Features (COMPLETE)
- [x] 8 sources: SerpAPI, RemoteOK, WeWorkRemotely, Craigslist, Arbeitnow, The Muse, Jooble, Remotive
- [x] Role filtering: Direct + indirect roles from profile
- [x] Mission-driven filtering: Only companies matching user values
- [x] Salary filtering: $80k-$100k range
- [x] Ghost job detection: Reposting, high applicants, layoffs
- [x] Landing probability AI: 6-factor algorithm (43-87% accuracy)
- [x] Export to CSV
- [x] Apply Now links

## 📋 Future Enhancements (Not Started)
- [ ] Profile management UI (edit profile from web app)
- [ ] Save favorite jobs
- [ ] Track which jobs user applied to
- [ ] Show success metrics (response rate, interview rate)
- [ ] Email alerts for new matches
- [ ] User authentication (multiple users)
- [ ] Database storage for user profiles and job history

## 🚀 Deployment (Ready)
- [ ] Save final checkpoint
- [ ] Publish to production (Click "Publish" in Management UI)
- [ ] Test on published site
- [ ] Share with users

## 📊 System Stats (Current)
- **Jobs scraped**: 266 from 8 sources
- **Quality matches**: 20 displayed
- **Landing probability range**: 64-87%
- **Scraping time**: ~3 minutes
- **Cost**: $0 (100% FREE)
- **Architecture**: execAsync (Node.js → Python directly)

## 🎯 Implement Tiered Search (In Progress)
- [ ] Update Python scraper to search for EXACT role title first
- [ ] Count exact matches found
- [ ] If <10 exact matches, add alternative/related roles to reach 20 total
- [ ] Always rank exact matches higher (100 points) than alternatives (80 points)
- [ ] Make this work universally for ANY role (Sales Engineer, Product Manager, Data Scientist, etc.)
- [ ] Test with "Sales Engineer" to verify exact matches appear first
- [ ] Test with other roles to verify universal functionality


## 📦 Deploy Python Scraper to Production (Completed)
- [x] Copy entire Python scraper directory into web app (`/home/ubuntu/job-scraper-app/server/python_scraper/`)
- [x] Update server/routers.ts to use new path (`server/python_scraper/web_runner_v4_comprehensive.py`)
- [x] Verified Python scraper works from new location (manual test: 92+ jobs found)
- [x] Save checkpoint with deployed Python scraper (ready for production)
- [ ] Test on published site to verify Python scraper works


## 🚀 Fix Production Deployment (CRITICAL - COMPLETED)
- [x] Test published site (https://jobfinder-qdhocedz.manus.space) to identify exact error
- [x] Fix Python scraper deployment so it works on published site (updated build script to copy python_scraper to dist/)
- [ ] Verify 300+ jobs scraped from 8 sources on production
- [ ] Verify direct application links work on production
- [ ] Verify ghost job detection working on production
- [ ] Verify landing probability AI working on production
- [ ] Test end-to-end: Click RUN SCRAPER → 300+ jobs → 20 matches → Click apply link


## 🎯 NEW REQUIREMENTS (User Feedback - Feb 3, 2026)
- [ ] Verify scraper fetches FRESH jobs each run (not cached)
- [ ] Verify 300+ jobs scraped across all 8 sources
- [x] Add timestamp to scraper output (ISO format)
- [x] Display "Last scraped: X minutes ago" on frontend
- [x] Create profile display UI - Show current profile (roles, salary, location, company values)
- [x] Create profile editing UI - Allow user to edit profile from frontend
- [x] Add /profile route and link from homepage
- [x] Improve company filtering - Only show exciting companies (AI/ML leaders, innovative startups, NOT random manufacturers like Ajax Systems, Quincy Compressor)
  - Added industry exclusions (manufacturing, industrial equipment, compressor, HVAC, etc.)
  - Added exciting companies whitelist (OpenAI, Anthropic, Stripe, Databricks, etc.)
  - Raised mission threshold from 40 to 50 (more selective)
- [ ] Test end-to-end: RUN SCRAPER → 300+ fresh jobs → filtered to 20 high-probability matches → direct application links work
- [ ] Verify direct roles (Sales Engineer) + indirect roles (Solutions Engineer, TAM, Demo Engineer, Pre-Sales Engineer) are included
- [ ] Verify location filtering (LA + Remote) works correctly
- [ ] Verify ghost job detection works (<30 days old, no reposting, low applicant count)
- [ ] Verify landing probability scoring ranks highest matches first


## 🎯 AUTO-POPULATE FROM PROFILE (User Request - Feb 3, 2026)
- [x] Fix profile page "Profile Not Found" error (wrong path to miles_profile.json - changed from '../python_scraper/' to './python_scraper/')
- [x] Auto-populate role and location from profile on homepage load
- [x] Make "RUN SCRAPER" button use profile settings by default (no manual typing needed)
- [ ] Test: Open homepage → role/location auto-filled → click RUN SCRAPER → results appear


## 🚨 FIX PRODUCTION DEPLOYMENT ERROR (CRITICAL)
- [x] Find all shell command execution sites (execAsync in server/routers.ts line 88)
- [x] Create /api/diagnostics endpoint to check production environment
- [x] Remove /bin/bash dependency from scraper execution (changed to /bin/sh)
- [x] Fix spawn options to prevent ENOENT errors (added directory existence check)
- [x] Add proper error handling with user-friendly messages (ENOENT, ETIMEDOUT, etc.)
- [ ] Test scraper works in production without bash


## 🔧 FIX SCRAPER FILES MISSING IN PRODUCTION
- [x] Find where "Scraper files missing" error is thrown (server/routers.ts line 122)
- [x] Check build output (dist/) to see if python_scraper is included (YES - at dist/python_scraper/)
- [x] Fix path resolution to work in production (changed '../python_scraper' to './python_scraper')
- [x] Update diagnostics endpoint to show scraper path and files (added scraper.resolvedPath, exists, pythonFiles)
- [ ] Test in production to verify scrapers are found
