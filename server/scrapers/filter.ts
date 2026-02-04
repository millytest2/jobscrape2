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
  companyPreferences?: {
    size?: string[];
    stage?: string[];
    industries?: string[];
  };
  redFlags?: string[];
  skills?: {
    technical?: string[];
    sales?: string[];
    soft?: string[];
  };
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
  
  // Detect international locations explicitly
  const internationalKeywords = [
    'mexico', 'guadalajara', 'canada', 'toronto', 'vancouver', 'montreal',
    'uk', 'london', 'europe', 'asia', 'india', 'bangalore', 'mumbai',
    'australia', 'sydney', 'brazil', 'argentina', 'colombia'
  ];
  
  const isInternational = internationalKeywords.some(keyword => locationLower.includes(keyword));
  
  // Try to extract US state
  const usStateMatch = locationLower.match(/\b([a-z]{2})\b/);
  const state = usStateMatch ? usStateMatch[1].toUpperCase() : '';
  
  // Check if US location (has state code or known US city)
  const isUS = !isInternational && (state.length === 2 || LA_REGION.some(city => locationLower.includes(city)));
  
  return {
    city: location,
    state,
    country: isInternational ? 'International' : (isUS ? 'US' : 'Unknown'),
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
  
  // Allowed variants for Sales Engineer (EXPLICIT whitelist only)
  if (roleCluster.some(r => r.includes('sales engineer') || r.includes('sales') || r.includes('solutions'))) {
    // High match: Direct sales/solutions roles
    if (title.includes('solutions engineer') || title.includes('solution engineer')) return 90;
    if (title.includes('pre-sales') || title.includes('presales')) return 85;
    if (title.includes('demo engineer') || title.includes('technical demo')) return 80;
    if (title.includes('technical account manager') || title.includes('tam')) return 75;
    if (title.includes('customer engineer') || title.includes('customer success engineer')) return 70;
    if (title.includes('field engineer') && title.includes('sales')) return 65;
    if (title.includes('sales development') || title.includes('technical sales')) return 85;
    
    // Reject: Pure engineering roles (NOT sales-related)
    const rejectKeywords = [
      'software engineer', 'backend', 'frontend', 'full stack', 'fullstack',
      'machine learning', 'ml engineer', 'data scientist', 'data engineer',
      'devops', 'platform engineer', 'infrastructure', 'security engineer',
      'qa engineer', 'test engineer', 'research engineer'
    ];
    
    for (const reject of rejectKeywords) {
      if (title.includes(reject)) {
        return 0; // Hard reject - wrong role type
      }
    }
  }
  
  // NO partial matching - if not in whitelist, return 0
  return 0;
}

/**
 * Calculate location match score (0-100) with strict US/LA region validation
 */
function calculateLocationScore(job: Job, targetLocation: string): number {
  const parsed = parseLocation(job.location);
  const targetParsed = parseLocation(targetLocation);
  
  // DEBUG: Log location parsing for problematic jobs
  if (job.location.toLowerCase().includes('guadalajara') || job.title.toLowerCase().includes('qa engineer')) {
    console.log(`[FILTER DEBUG] Job: "${job.title}" at "${job.location}"`);
    console.log(`[FILTER DEBUG] Parsed: country=${parsed.country}, isRemote=${parsed.isRemote}`);
    console.log(`[FILTER DEBUG] Target: country=${targetParsed.country}`);
  }
  
  // HARD BLOCK: International locations get 0% for US searches
  if (targetParsed.country === 'US' && parsed.country === 'International') {
    return 0; // Guadalajara, Canada, etc. = 0%
  }
  
  // If job is remote, check if it's US-based or international
  if (parsed.isRemote) {
    // International remote gets very low score for US searches
    if (targetParsed.country === 'US' && parsed.country === 'International') {
      return 0; // Block international remote
    }
    // Unknown remote (might be international) gets moderate score
    if (parsed.country === 'Unknown') {
      return 70; // Assume US remote unless proven otherwise
    }
    return 100; // US remote
  }
  
  // Hard penalty: US target + non-US job = 0 score
  if (targetParsed.country === 'US' && parsed.country !== 'US' && parsed.country !== 'Unknown') {
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
  
  const text = normalizeText(`${job.title} ${job.company} ${job.description || ''}`);
  
  let matches = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return Math.min(100, (matches / keywords.length) * 100 + 30);
}

/**
 * Calculate company preferences score (0-100)
 */
function calculateCompanyScore(job: Job, companyPreferences?: { size?: string[]; stage?: string[]; industries?: string[] }): number {
  if (!companyPreferences) {
    return 50; // Neutral score if no preferences
  }
  
  const text = normalizeText(`${job.title} ${job.company} ${job.description || ''}`);
  let totalMatches = 0;
  let totalCategories = 0;
  
  // Check company size keywords
  if (companyPreferences.size && companyPreferences.size.length > 0) {
    totalCategories++;
    const sizeKeywords = {
      'startup': ['startup', 'early stage', 'seed'],
      'small': ['small', 'boutique', '10-50', 'team of'],
      'medium': ['medium', 'mid-size', '50-500', 'growing'],
      'large': ['enterprise', 'fortune', 'large', '500+', 'global']
    };
    
    for (const size of companyPreferences.size) {
      const keywords = sizeKeywords[size.toLowerCase() as keyof typeof sizeKeywords] || [];
      if (keywords.some(kw => text.includes(kw))) {
        totalMatches++;
        break;
      }
    }
  }
  
  // Check company stage keywords
  if (companyPreferences.stage && companyPreferences.stage.length > 0) {
    totalCategories++;
    const stageKeywords = {
      'seed': ['seed', 'pre-seed', 'angel'],
      'series a': ['series a', 'series-a'],
      'series b': ['series b', 'series-b'],
      'growth': ['growth stage', 'series c', 'series d', 'scaling'],
      'public': ['public', 'nasdaq', 'nyse', 'ipo']
    };
    
    for (const stage of companyPreferences.stage) {
      const keywords = stageKeywords[stage.toLowerCase() as keyof typeof stageKeywords] || [];
      if (keywords.some(kw => text.includes(kw))) {
        totalMatches++;
        break;
      }
    }
  }
  
  // Check industry keywords
  if (companyPreferences.industries && companyPreferences.industries.length > 0) {
    totalCategories++;
    let industryMatch = false;
    for (const industry of companyPreferences.industries) {
      if (text.includes(industry.toLowerCase())) {
        industryMatch = true;
        break;
      }
    }
    if (industryMatch) totalMatches++;
  }
  
  if (totalCategories === 0) return 50;
  
  // Score based on percentage of categories matched
  const matchPercentage = (totalMatches / totalCategories) * 100;
  return Math.min(100, matchPercentage + 30); // Boost base score
}

/**
 * Check for red flags (returns true if red flag found)
 */
function hasRedFlags(job: Job, redFlags?: string[] | any): boolean {
  // Defensive check: ensure redFlags is actually an array
  if (!redFlags) {
    return false;
  }
  
  // If redFlags is an object with 'avoid' property, extract it
  if (typeof redFlags === 'object' && !Array.isArray(redFlags)) {
    redFlags = redFlags.avoid || [];
  }
  
  // If still not an array or empty, return false
  if (!Array.isArray(redFlags) || redFlags.length === 0) {
    return false;
  }
  
  const text = normalizeText(`${job.title} ${job.description || ''}`);
  
  const redFlagKeywords: { [key: string]: string[] } = {
    '5+ years experience': ['5+ years', '5 years', '6+ years', '7+ years', '8+ years', '10+ years'],
    'pure engineering': ['software engineer', 'backend engineer', 'frontend engineer', 'full stack engineer'],
    'non-tech industries': ['retail', 'hospitality', 'restaurant', 'food service'],
    'large enterprises': ['enterprise', 'fortune 500', 'fortune 100'],
    'no customer interaction': ['backend only', 'internal tools only']
  };
  
  for (const flag of redFlags) {
    const keywords = redFlagKeywords[flag.toLowerCase()] || [flag.toLowerCase()];
    if (keywords.some(kw => text.includes(kw))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Decode HTML entities and normalize text for matching
 */
function normalizeText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .toLowerCase()
    .trim();
}

/**
 * Calculate skills match score (0-100)
 */
function calculateSkillsScore(job: Job, skills?: { technical?: string[]; sales?: string[]; soft?: string[] }): number {
  if (!skills) {
    return 50; // Neutral score if no skills
  }
  
  const text = normalizeText(`${job.title} ${job.description || ''}`);
  let totalMatches = 0;
  let totalSkills = 0;
  
  // Check technical skills
  if (skills.technical && skills.technical.length > 0) {
    for (const skill of skills.technical) {
      totalSkills++;
      if (text.includes(skill.toLowerCase())) {
        totalMatches++;
      }
    }
  }
  
  // Check sales skills
  if (skills.sales && skills.sales.length > 0) {
    for (const skill of skills.sales) {
      totalSkills++;
      if (text.includes(skill.toLowerCase())) {
        totalMatches++;
      }
    }
  }
  
  // Check soft skills
  if (skills.soft && skills.soft.length > 0) {
    for (const skill of skills.soft) {
      totalSkills++;
      if (text.includes(skill.toLowerCase())) {
        totalMatches++;
      }
    }
  }
  
  if (totalSkills === 0) return 50;
  
  // Score based on percentage of skills matched
  const matchPercentage = (totalMatches / totalSkills) * 100;
  return Math.min(100, matchPercentage + 20); // Small boost
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
  const title = normalizeText(job.title);
  const description = normalizeText(job.description || '');
  const location = normalizeText(job.location);
  
  // HARD BLOCK: Manufacturing/industrial roles
  const manufacturingKeywords = [
    'manufacturing', 'factory', 'production', 'assembly',
    'warehouse', 'logistics', 'supply chain', 'operations',
    'quality assurance', 'qa engineer', 'quality engineer',
    'process engineer', 'industrial', 'mechanical'
  ];
  if (manufacturingKeywords.some(kw => title.includes(kw) || description.includes(kw))) {
    return true; // Block manufacturing jobs
  }
  
  // HARD BLOCK: Pure software engineering (not sales-focused)
  const pureEngineeringKeywords = [
    'software engineer', 'backend engineer', 'frontend engineer',
    'full stack engineer', 'fullstack engineer', 'web developer',
    'mobile developer', 'ios engineer', 'android engineer',
    'devops engineer', 'platform engineer', 'infrastructure engineer',
    'data engineer', 'ml engineer', 'machine learning engineer',
    'data scientist', 'research engineer', 'security engineer'
  ];
  if (pureEngineeringKeywords.some(kw => title.includes(kw))) {
    // Exception: If title also includes sales-related keywords, allow it
    const salesKeywords = ['sales', 'pre-sales', 'presales', 'demo', 'solutions', 'customer'];
    if (!salesKeywords.some(sk => title.includes(sk))) {
      return true; // Block pure engineering
    }
  }
  
  // HARD BLOCK: International locations for US searches
  if (options.targetLocation.toLowerCase().includes('los angeles') || 
      options.targetLocation.toLowerCase().includes('california')) {
    const internationalKeywords = [
      'mexico', 'guadalajara', 'canada', 'toronto', 'vancouver',
      'uk', 'london', 'europe', 'asia', 'india', 'bangalore',
      'australia', 'brazil', 'argentina', 'colombia'
    ];
    if (internationalKeywords.some(kw => location.includes(kw))) {
      return true; // Block international for US searches
    }
  }
  
  // HARD BLOCK: Any senior keyword in title (no exceptions for TAM/Account Manager)
  const seniorKeywords = [
    'senior', 'sr.', 'sr ', 
    'lead', 'principal', 'staff',
    'director', 'vp', 'vice president', 
    'head of', 'chief', 'manager'
  ];
  
  // Exception: "Technical Account Manager" and "Account Manager" are allowed (not management roles)
  const isAccountManager = title.includes('account manager') || title.includes('tam');
  const isSeniorAccountManager = isAccountManager && (title.includes('senior') || title.includes('sr.') || title.includes('sr '));
  
  // Block if ANY senior keyword found (except non-senior Account Manager)
  for (const keyword of seniorKeywords) {
    if (title.includes(keyword)) {
      // Allow non-senior Account Manager/TAM
      if (keyword === 'manager' && isAccountManager && !isSeniorAccountManager) {
        continue; // Don't block "Technical Account Manager" or "Account Manager"
      }
      // Block everything else including "Senior Account Manager"
      return true;
    }
  }
  
  // Hard block: Required years >= 7 (clearly too senior)
  if (requiredYears && requiredYears >= 7) {
    return true;
  }
  
  return false; // Don't exclude
}

/**
 * Apply diversity constraints to ensure balanced top N results
 * - Max 6 jobs from any single source
 * - Min 8 jobs must be in target role cluster (Sales Engineer, Solutions Engineer, etc.)
 * - Exclude pure SDR roles unless user role includes SDR
 */
function applyDiversityConstraints(
  scored: FilteredJob[],
  targetRoles: string[],
  topN: number
): FilteredJob[] {
  const targetRoleCluster = [
    'sales engineer', 'solutions engineer', 'solution engineer',
    'pre-sales', 'presales', 'demo engineer', 'technical demo',
    'technical account manager', 'tam', 'customer engineer',
    'field engineer', 'sales development engineer'
  ];
  
  // Check if user is targeting SDR roles
  const userTargetsSDR = targetRoles.some(r => 
    r.toLowerCase().includes('sdr') || 
    r.toLowerCase().includes('sales development representative')
  );
  
  const result: FilteredJob[] = [];
  const sourceCount: { [source: string]: number } = {};
  let roleClusterCount = 0;
  
  for (const job of scored) {
    if (result.length >= topN) break;
    
    const source = job.source;
    const title = job.title.toLowerCase();
    
    // Check if job is in target role cluster
    const isInRoleCluster = targetRoleCluster.some(role => title.includes(role));
    
    // Check if job is pure SDR (and user doesn't want SDR)
    const isPureSDR = !userTargetsSDR && (
      title.includes('sdr') || 
      title.includes('sales development representative') ||
      (title.includes('business development') && !title.includes('engineer'))
    );
    
    // Skip pure SDR if user doesn't want them
    if (isPureSDR) {
      continue;
    }
    
    // Check source diversity constraint (max 6 per source)
    const currentSourceCount = sourceCount[source] || 0;
    if (currentSourceCount >= 6) {
      continue; // Skip if source already has 6 jobs
    }
    
    // Add job
    result.push(job);
    sourceCount[source] = currentSourceCount + 1;
    if (isInRoleCluster) roleClusterCount++;
  }
  
  // Verify min 8 in role cluster constraint
  if (roleClusterCount < 8 && result.length >= topN) {
    console.warn(`[FILTER] Diversity constraint violated: only ${roleClusterCount} jobs in role cluster (min 8 required)`);
    // Try to backfill with role cluster jobs that were skipped due to source diversity
    const backfill: FilteredJob[] = [];
    for (const job of scored) {
      if (result.includes(job)) continue;
      const title = job.title.toLowerCase();
      const isInRoleCluster = targetRoleCluster.some(role => title.includes(role));
      if (isInRoleCluster) {
        backfill.push(job);
        roleClusterCount++;
        if (roleClusterCount >= 8) break;
      }
    }
    // Replace lowest-scoring non-cluster jobs with backfill
    if (backfill.length > 0) {
      const nonClusterJobs = result.filter(j => {
        const title = j.title.toLowerCase();
        return !targetRoleCluster.some(role => title.includes(role));
      }).sort((a, b) => a.score - b.score); // Sort by score ascending
      
      for (let i = 0; i < Math.min(backfill.length, nonClusterJobs.length); i++) {
        const indexToReplace = result.indexOf(nonClusterJobs[i]);
        result[indexToReplace] = backfill[i];
      }
    }
  }
  
  console.log(`[FILTER] Diversity applied: ${result.length} jobs, ${roleClusterCount} in role cluster, sources:`, sourceCount);
  
  return result;
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
  
  // Second, filter out red flags
  const noRedFlags = filtered.filter(job => !hasRedFlags(job, options.redFlags));
  
  const scored: FilteredJob[] = noRedFlags.map(job => {
    const parsed = parseLocation(job.location);
    const requiredYears = extractRequiredYears(job);
    const senioritySignals = detectSenioritySignals(job);
    
    const roleScore = calculateRoleScore(job, options.targetRoles);
    const locationScore = calculateLocationScore(job, options.targetLocation);
    const experienceScore = calculateExperienceScore(job, options.maxExperienceYears || 5);
    const missionScore = calculateMissionScore(job, options.missionDrivenKeywords || []);
    const companyScore = calculateCompanyScore(job, options.companyPreferences);
    const skillsScore = calculateSkillsScore(job, options.skills);
    
    // Weighted average - prioritize landing probability
    // Experience (30%) - Must match user's level
    // Role (25%) - Exact role match critical
    // Location (20%) - Must be accessible
    // Skills (10%) - Technical fit
    // Company (10%) - Culture/size fit
    // Mission (5%) - Nice to have
    let totalScore = (
      (experienceScore * 0.30) + 
      (roleScore * 0.25) + 
      (locationScore * 0.20) + 
      (skillsScore * 0.10) + 
      (companyScore * 0.10) + 
      (missionScore * 0.05)
    );
    
    // Apply sanity checks
    if (roleScore < 50 || locationScore < 30 || experienceScore < 30) {
      totalScore = Math.min(totalScore, 60);
    }
    
    const explanation = `Total: ${totalScore.toFixed(0)} | Experience: ${experienceScore.toFixed(0)} | Role: ${roleScore.toFixed(0)} | Location: ${locationScore.toFixed(0)} | Skills: ${skillsScore.toFixed(0)} | Company: ${companyScore.toFixed(0)} | Mission: ${missionScore.toFixed(0)}`;
    
    return {
      ...job,
      score: totalScore,
      scoreExplanation: explanation,
      scoreBreakdown: {
        roleScore,
        locationScore,
        experienceScore,
        missionScore,
        companyScore,
        skillsScore
      },
      parsedLocation: parsed.city,
      isRemote: parsed.isRemote,
      requiredYears,
      senioritySignals
    };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Apply diversity constraints
  const diversified = applyDiversityConstraints(scored, options.targetRoles, topN);
  
  return diversified;
}
