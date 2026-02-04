#!/bin/bash
# Wrapper script to run Python scraper
# Simply passes through to Python without environment changes

# Run scraper with all arguments passed through
exec python3.11 /home/ubuntu/job_pipeline/web_runner_v4_comprehensive.py "$@"
