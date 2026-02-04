/**
 * Job filtering and ranking logic
 * Filters ghost jobs, matches roles/location, applies profile preferences
 */

import type { Job } from './types';

export interface FilteredJob extends Job {
  score: number;
  scoreExplanation: string;
  scoreBreakdown: {
    roleScore: number;
    locationScore: number;
    experienceScore: number;
    missionScore: number;
  };
  parsedLocation: string;
  isRemote: boolean;
  requiredYears?: number;
  senioritySignals: string[];
}

export interface FilterOptions {
  targetRoles: string[];
  targetLocation: string;
  minSalary?: number;
  maxSalary?: number;
  missionDrivenKeywords?: string[];
  maxExperienceYears?: number;
}

// LA region cities for location matching
const LA_REGION = [
  'los angeles', 'santa monica', 'venice', 'culver city', 'el segundo',
  'west hollywood', 'beverly hills', 'downtown la', 'pasadena', 'burbank',
  'glendale', 'long beach', 'torrance', 'manhattan beach', 'playa vista',
  'irvine', 'orange county'
];

/**
 * Parse location to extract city, state, country
 */
function parseLocation(location: string): { city: string; state: string; country: string; isRemote: boolean } {
  const locationLower = location.toLowerCase().trim();
  
  // Check if remote
  const isRemote = locationLower.includes('remote') || locationLower.includes('anywhere') || locationLower.includes('worldwide');
  
  // Try to extract US state
  const usStateMatch = locationLower.match(/\b([a-z]{2})\b/);
  const state = usStateMatch ? usStateMatch[1].toUpperCase() : '';
  
  // Check if US location (has state code or known US city)
  const isUS = state.length === 2 || LA_REGION.some(city => locationLower.includes(city));
  
  return {
    city: location,
    state,
    country: isUS ? 'US' : 'Unknown',
    isRemote
  };
}

/**
 * Extract required years of experience from job description/title
 */
function extractRequiredYears(job: Job): number | undefined {
  const text = `${job.title} ${job.description || ''}`.toLowerCase();
  
  // Look for patterns like "5+ years", "7 years", "5-7 years"
  const patterns = [
    /(\d+)\+?\s*years?/g,
    /(\d+)-(\d+)\s*years?/g
  ];
  
  const matches: number[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push(parseInt(match[1]));
    }
  }
  
  // Return the maximum years mentioned
  return matches.length > 0 ? Math.max(...matches) : undefined;
}

/**
 * Detect seniority signals in title and description
 */
function detectSenioritySignals(job: Job): string[] {
  const text = `${job.title} ${job.description || ''}`.toLowerCase();
  const signals: string[] = [];
  
  const seniorKeywords = [
    'senior', 'sr.', 'sr ', 'lead', 'principal', 'staff',
    'director', 'vp', 'vice president', 'head of', 'chief'
  ];
  
  for (const keyword of seniorKeywords) {
    if (text.includes(keyword)) {
      signals.push(keyword);
    }
  }
  
  return signals;
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
 * Calculate role match score (0-100) - STRICT matching only
 */
function calculateRoleScore(job: Job, targetRoles: string[]): number {
  const title = job.title.toLowerCase();
  const roleCluster = targetRoles.map(r => r.toLowerCase());
  
  // Exact match or very close variant
  for (const role of roleCluster) {
    // Exact match
    if (title === role) {
      return 100;
    }
    
    // Very close match (all words present)
    const roleWords = role.split(' ');
    const allWordsPresent = roleWords.every(word => title.includes(word));
    if (allWordsPresent) {
      return 95;
    }
  }
  
  // Allowed variants for Sales Engineer
  if (roleCluster.some(r => r.includes('sales engineer'))) {
    if (title.includes('solutions engineer') || title.includes('solution engineer')) return 90;
    if (title.includes('pre-sales') || title.includes('presales')) return 85;
    if (title.includes('demo engineer')) return 80;
    if (title.includes('technical account manager') || title.includes('tam')) return 75;
    if (title.includes('customer engineer')) return 70;
    if (title.includes('field engineer')) return 65;
  }
  
  // Partial match (some words present) - but penalize heavily
  let partialScore = 0;
  for (const role of roleCluster) {
    const roleWords = role.split(' ').filter(w => w !== 'engineer' && w !== 'manager'); // Ignore generic words
    const matchedWords = roleWords.filter(word => title.includes(word));
    const matchRatio = matchedWords.length / Math.max(roleWords.length, 1);
    partialScore = Math.max(partialScore, matchRatio * 40); // Cap at 40% for partial matches
  }
  
  return partialScore;
}

/**
 * Calculate location match score (0-100) with strict US/LA region validation
 */
function calculateLocationScore(job: Job, targetLocation: string): number {
  const parsed = parseLocation(job.location);
  const targetParsed = parseLocation(targetLocation);
  
  // If job is remote, check if it's US-based or international
  if (parsed.isRemote) {
    // If target is US and job is international remote, reduce score
    if (targetParsed.country === 'US' && parsed.country !== 'US') {
      return 60; // Allow international remote but lower priority
    }
    return 100; // US remote or unknown remote
  }
  
  // Hard penalty: US target + non-US job = 0 score
  if (targetParsed.country === 'US' && parsed.country !== 'US') {
    return 0;
  }
  
  // Check if job location is in LA region
  const locationLower = job.location.toLowerCase();
  const isInLARegion = LA_REGION.some(city => locationLower.includes(city));
  
  // If target is LA and job is in LA region, high score
  if (targetParsed.city.toLowerCase().includes('los angeles') && isInLARegion) {
    return 90;
  }
  
  // If hybrid/onsite and not in LA region, low score
  if (!parsed.isRemote && !isInLARegion) {
    return 20;
  }
  
  // Unknown location parsing = neutral score
  if (parsed.country === 'Unknown') {
    return 50;
  }
  
  // Partial match
  if (locationLower.includes(targetLocation.toLowerCase()) || targetLocation.toLowerCase().includes(locationLower)) {
    return 70;
  }
  
  return 30; // Default score for other locations
}

/**
 * Calculate experience match score (0-100) - rules-based, not title-only
 */
function calculateExperienceScore(job: Job, maxExperienceYears: number = 5): number {
  const requiredYears = extractRequiredYears(job);
  const senioritySignals = detectSenioritySignals(job);
  
  // If no experience requirements found, assume entry-level (high score)
  if (!requiredYears && senioritySignals.length === 0) {
    return 90;
  }
  
  // If required years clearly exceed profile, low score
  if (requiredYears && requiredYears >= 7) {
    return 10; // Too senior
  }
  
  if (requiredYears && requiredYears >= 5) {
    return 40; // Borderline senior
  }
  
  // If seniority signals present, reduce score but don't eliminate
  if (senioritySignals.length > 0) {
    // Check if requirements confirm seniority
    if (requiredYears && requiredYears >= maxExperienceYears) {
      return 30; // Title + requirements confirm too senior
    }
    
    // Title suggests senior but requirements don't confirm - moderate score
    return 60;
  }
  
  // Good fit: 0-4 years required, no seniority signals
  return 95;
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
 * Apply sanity checks to prevent inflated scores
 */
function applySanityChecks(
  roleScore: number,
  locationScore: number,
  experienceScore: number,
  missionScore: number,
  isRemote: boolean
): number {
  // Weighted average
  let totalScore = (roleScore * 0.4) + (locationScore * 0.3) + (experienceScore * 0.2) + (missionScore * 0.1);
  
  // Sanity check: 90% total match requires high subscores
  if (totalScore >= 90) {
    const meetsRequirements = 
      roleScore >= 80 && 
      (locationScore >= 80 || isRemote) && 
      experienceScore >= 70;
    
    if (!meetsRequirements) {
      totalScore = Math.min(totalScore, 65); // Cap at 65 if requirements not met
    }
  }
  
  // If any subscore is very low, cap total score
  if (roleScore < 50 || locationScore < 30 || experienceScore < 30) {
    totalScore = Math.min(totalScore, 60);
  }
  
  return totalScore;
}

/**
 * Check if job should be excluded based on hard filters
 */
function shouldExcludeJob(job: Job, options: FilterOptions): boolean {
  const senioritySignals = detectSenioritySignals(job);
  const requiredYears = extractRequiredYears(job);
  const maxYears = options.maxExperienceYears || 5;
  
  // Hard block: Senior title + high experience requirement
  if (senioritySignals.length > 0 && requiredYears && requiredYears >= 7) {
    return true; // Definitely too senior
  }
  
  // Hard block: Senior title in specific positions (not IC roles like TAM)
  const title = job.title.toLowerCase();
  const isSeniorNonIC = (
    (title.includes('senior') || title.includes('sr.') || title.includes('sr ')) &&
    !title.includes('account manager') &&
    !title.includes('tam')
  );
  
  if (isSeniorNonIC && maxYears < 5) {
    return true; // Block senior roles for junior candidates
  }
  
  // Hard block: Lead, Principal, Staff, Director, VP
  const hardSeniorKeywords = ['lead', 'principal', 'staff', 'director', 'vp', 'vice president', 'head of', 'chief'];
  for (const keyword of hardSeniorKeywords) {
    if (title.includes(keyword)) {
      return true; // Always block these titles
    }
  }
  
  return false; // Don't exclude
}

/**
 * Rank and filter jobs, return top N
 */
export function rankJobs(
  jobs: Job[],
  options: FilterOptions,
  topN: number = 20
): FilteredJob[] {
  // First, hard filter out excluded jobs
  const filtered = jobs.filter(job => !shouldExcludeJob(job, options));
  const scored: FilteredJob[] = filtered.map(job => {
    const parsed = parseLocation(job.location);
    const requiredYears = extractRequiredYears(job);
    const senioritySignals = detectSenioritySignals(job);
    
    const roleScore = calculateRoleScore(job, options.targetRoles);
    const locationScore = calculateLocationScore(job, options.targetLocation);
    const experienceScore = calculateExperienceScore(job, options.maxExperienceYears || 5);
    const missionScore = calculateMissionScore(job, options.missionDrivenKeywords || []);
    
    const totalScore = applySanityChecks(roleScore, locationScore, experienceScore, missionScore, parsed.isRemote);
    
    const explanation = `Total: ${totalScore.toFixed(0)} | Role: ${roleScore.toFixed(0)} | Location: ${locationScore.toFixed(0)} | Experience: ${experienceScore.toFixed(0)} | Mission: ${missionScore.toFixed(0)}`;
    
    return {
      ...job,
      score: totalScore,
      scoreExplanation: explanation,
      scoreBreakdown: {
        roleScore,
        locationScore,
        experienceScore,
        missionScore
      },
      parsedLocation: parsed.city,
      isRemote: parsed.isRemote,
      requiredYears,
      senioritySignals
    };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, topN);
}
