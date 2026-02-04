/**
 * Job filtering and ranking logic
 * Filters ghost jobs, matches roles/location, applies profile preferences
 */

import type { Job } from './types';

export interface FilteredJob extends Job {
  score: number;
  scoreExplanation: string;
}

export interface FilterOptions {
  targetRoles: string[];
  targetLocation: string;
  minSalary?: number;
  maxSalary?: number;
  missionDrivenKeywords?: string[];
  maxExperienceYears?: number;
}

/**
 * Check if a job title indicates a senior role
 */
function isSeniorRole(title: string, maxExperienceYears: number = 5): boolean {
  const titleLower = title.toLowerCase();
  
  // Senior-level keywords
  const seniorKeywords = [
    'senior', 'sr.', 'sr ', 'lead', 'principal', 'staff',
    'director', 'vp', 'vice president', 'head of', 'chief',
    'manager', 'mgr', 'management'
  ];
  
  // Exception: These "manager" roles are actually IC roles
  const managerExceptions = [
    'technical account manager', 'account manager', 'tam',
    'customer success manager', 'csm'
  ];
  
  // Check for exceptions first
  for (const exception of managerExceptions) {
    if (titleLower.includes(exception)) {
      return false; // Not a senior role
    }
  }
  
  // Check for senior keywords
  for (const keyword of seniorKeywords) {
    if (titleLower.includes(keyword)) {
      return true; // Is a senior role
    }
  }
  
  // Check for experience requirements in title
  const experienceMatch = titleLower.match(/(\d+)\+?\s*years?/);
  if (experienceMatch) {
    const years = parseInt(experienceMatch[1]);
    if (years > maxExperienceYears) {
      return true; // Requires too much experience
    }
  }
  
  return false;
}

/**
 * Remove ghost jobs (missing URL, duplicates, very old postings)
 */
export function removeGhostJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const filtered: Job[] = [];
  
  for (const job of jobs) {
    // Must have URL
    if (!job.url || job.url.trim() === '') {
      continue;
    }
    
    // Deduplicate by URL
    if (seen.has(job.url)) {
      continue;
    }
    seen.add(job.url);
    
    // Check if posting is very old (if date available)
    if (job.postedDate) {
      const posted = new Date(job.postedDate);
      const now = new Date();
      const daysSincePosted = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
      
      // Skip jobs older than 60 days
      if (daysSincePosted > 60) {
        continue;
      }
    }
    
    filtered.push(job);
  }
  
  return filtered;
}

/**
 * Calculate role match score (0-100)
 */
function calculateRoleScore(job: Job, targetRoles: string[]): number {
  const title = job.title.toLowerCase();
  let score = 0;
  
  for (const role of targetRoles) {
    const roleWords = role.toLowerCase().split(' ');
    const matchedWords = roleWords.filter(word => title.includes(word));
    const matchRatio = matchedWords.length / roleWords.length;
    score = Math.max(score, matchRatio * 100);
  }
  
  return score;
}

/**
 * Calculate location match score (0-100)
 */
function calculateLocationScore(job: Job, targetLocation: string): number {
  const location = job.location.toLowerCase();
  const target = targetLocation.toLowerCase();
  
  // Remote jobs always score high
  if (location.includes('remote') || location.includes('anywhere')) {
    return 100;
  }
  
  // Check for LA region keywords
  const laKeywords = ['los angeles', 'la', 'santa monica', 'pasadena', 'burbank', 'glendale', 'culver city'];
  const matchesLA = laKeywords.some(keyword => location.includes(keyword) || target.includes(keyword));
  
  if (matchesLA) {
    return 90;
  }
  
  // Partial match
  if (location.includes(target) || target.includes(location)) {
    return 70;
  }
  
  return 30; // Default score for other locations
}

/**
 * Calculate mission-driven score (0-100)
 */
function calculateMissionScore(job: Job, keywords: string[]): number {
  if (!keywords || keywords.length === 0) {
    return 50; // Neutral score if no keywords
  }
  
  const text = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase();
  
  let matches = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return Math.min(100, (matches / keywords.length) * 100 + 30);
}

/**
 * Rank and filter jobs, return top N
 */
export function rankJobs(
  jobs: Job[],
  options: FilterOptions,
  topN: number = 20
): FilteredJob[] {
  // Filter out senior roles if maxExperienceYears is set
  let filteredJobs = jobs;
  if (options.maxExperienceYears) {
    filteredJobs = jobs.filter(job => !isSeniorRole(job.title, options.maxExperienceYears));
    console.log(`[Filter] Removed ${jobs.length - filteredJobs.length} senior roles (max experience: ${options.maxExperienceYears} years)`);
  }
  
  const scored: FilteredJob[] = filteredJobs.map(job => {
    const roleScore = calculateRoleScore(job, options.targetRoles);
    const locationScore = calculateLocationScore(job, options.targetLocation);
    const missionScore = calculateMissionScore(job, options.missionDrivenKeywords || []);
    
    // Weighted average
    const score = (roleScore * 0.5) + (locationScore * 0.3) + (missionScore * 0.2);
    
    const explanation = `Role: ${roleScore.toFixed(0)}, Location: ${locationScore.toFixed(0)}, Mission: ${missionScore.toFixed(0)}`;
    
    return {
      ...job,
      score,
      scoreExplanation: explanation,
    };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, topN);
}
