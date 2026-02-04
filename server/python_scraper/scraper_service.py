#!/usr/bin/env python3.11
"""
Background scraper service that runs Python scraper and writes results to file.
This avoids child_process issues by using file-based communication.
"""

import sys
import json
import subprocess
import os
from datetime import datetime

def run_scraper(location, role, profile_path, top_n=20):
    """Run the Python scraper and return results."""
    try:
        # Run the scraper
        result = subprocess.run(
            [
                'python3.11',
                '/home/ubuntu/job_pipeline/web_runner_v4_comprehensive.py',
                '--location', location,
                '--role', role,
                '--profile', profile_path,
                '--top', str(top_n)
            ],
            capture_output=True,
            text=True,
            timeout=180  # 3 minutes timeout
        )
        
        if result.returncode == 0:
            # Parse the JSON output
            try:
                data = json.loads(result.stdout)
                return {
                    'status': 'success',
                    'data': data,
                    'timestamp': datetime.now().isoformat()
                }
            except json.JSONDecodeError as e:
                return {
                    'status': 'error',
                    'message': f'Failed to parse scraper output: {str(e)}',
                    'stdout': result.stdout[:500],
                    'timestamp': datetime.now().isoformat()
                }
        else:
            return {
                'status': 'error',
                'message': f'Scraper failed with code {result.returncode}',
                'stderr': result.stderr[:500],
                'timestamp': datetime.now().isoformat()
            }
            
    except subprocess.TimeoutExpired:
        return {
            'status': 'error',
            'message': 'Scraper timed out after 3 minutes',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Unexpected error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }

if __name__ == '__main__':
    if len(sys.argv) != 5:
        print(json.dumps({
            'status': 'error',
            'message': 'Usage: scraper_service.py <location> <role> <profile_path> <output_file>'
        }))
        sys.exit(1)
    
    location = sys.argv[1]
    role = sys.argv[2]
    profile_path = sys.argv[3]
    output_file = sys.argv[4]
    
    # Run scraper
    result = run_scraper(location, role, profile_path)
    
    # Write to output file
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(json.dumps({'status': 'started', 'output_file': output_file}))
