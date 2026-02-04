#!/usr/bin/env python3
"""
Flask API wrapper for job scraper
Exposes /scrape endpoint for web app
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import json
from web_runner_v4_comprehensive import main

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/scrape', methods=['POST'])
def scrape():
    """
    Scrape jobs based on role and location
    
    Request body:
    {
        "role": "Sales Engineer",
        "location": "Los Angeles"
    }
    
    Response:
    {
        "status": "success",
        "params": {...},
        "stats": {...},
        "jobs": [...]
    }
    """
    try:
        data = request.get_json()
        role = data.get('role', 'Sales Engineer')
        location = data.get('location', 'Los Angeles')
        
        print(f"[Flask API] Received request: role={role}, location={location}", file=sys.stderr)
        
        # Run scraper
        result = main(location, role, profile_path='miles_profile.json', top_n=20)
        
        return jsonify(result)
    
    except Exception as e:
        print(f"[Flask API] Error: {e}", file=sys.stderr)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    print("[Flask API] Starting on port 5000...", file=sys.stderr)
    app.run(host='0.0.0.0', port=5000, debug=False)
