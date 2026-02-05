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
// Expanded LA region - all Southern California cities within ~30 mile radius
const LA_REGION = [
  // Core LA
  'los angeles', 'la', 'downtown la', 'dtla',
  // Westside
  'santa monica', 'venice', 'marina del rey', 'culver city', 'el segundo',
  'playa vista', 'playa del rey', 'westchester', 'mar vista', 'palms',
  // Hollywood/West Hollywood
  'hollywood', 'west hollywood', 'weho', 'beverly hills', 'century city',
  // Valley
  'burbank', 'glendale', 'pasadena', 'studio city', 'sherman oaks',
  'van nuys', 'north hollywood', 'noho', 'encino', 'woodland hills',
  'calabasas', 'canoga park',
  // South Bay
  'torrance', 'manhattan beach', 'hermosa beach', 'redondo beach',
  'el segundo', 'hawthorne', 'inglewood', 'gardena', 'carson',
  // Long Beach
  'long beach', 'signal hill', 'lakewood', 'cerritos',
  // Orange County (nearby)
  'irvine', 'orange county', 'oc', 'newport beach', 'costa mesa',
  'huntington beach', 'anaheim', 'fullerton', 'tustin',
  // East LA
  'alhambra', 'monterey park', 'arcadia', 'monrovia', 'azusa',
  // South LA
  'compton', 'lynwood', 'paramount', 'downey', 'norwalk',
  // General Southern California
  'southern california', 'socal', 'so cal', 'california'
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
  
  // Scam/spam keywords to detect fake jobs
  const scamKeywords = [
    'work from home', 'make money online', 'earn from home', 'no experience required',
    'easy money', 'get paid to', 'click here', 'limited time offer', 'act now',
    'urgently hiring', 'immediate start', 'no interview', 'guaranteed income'
  ];
  
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
    
    // Check for scam patterns in title
    const titleLower = job.title.toLowerCase();
    const isScam = scamKeywords.some(keyword => titleLower.includes(keyword));
    if (isScam) {
      console.log(`[Ghost Filter] Rejected scam job: "${job.title}"`);
      continue;
    }
    
    // Check for generic/vague titles
    const genericTitles = ['job', 'position', 'opening', 'opportunity', 'hiring'];
    const isGeneric = genericTitles.some(word => titleLower === word || titleLower === word + 's');
    if (isGeneric) {
      console.log(`[Ghost Filter] Rejected generic title: "${job.title}"`);
      continue;
    }
    
    // Check if posting is very old (if date available)
    if (job.postedDate) {
      const posted = new Date(job.postedDate);
      const now = new Date();
      const daysSincePosted = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
      
      // Skip jobs older than 60 days
      if (daysSincePosted > 60) {
        console.log(`[Ghost Filter] Rejected old job (${Math.round(daysSincePosted)} days): "${job.title}"`);
        continue;
      }
    }
    
    filtered.push(job);
  }
  
  console.log(`[Ghost Filter] ${jobs.length} jobs → ${filtered.length} after ghost removal (removed ${jobs.length - filtered.length})`);
  return filtered;
}

/**
 * Calculate role match score (0-100) - FLEXIBLE matching for exploration
 * Profile target_roles are used to RANK jobs, not exclude them
 * This allows users to search ANY role while getting personalized top 20
 */
function calculateRoleScore(job: Job, targetRoles: string[]): number {
  const title = job.title.toLowerCase();
  const roleCluster = targetRoles.map(r => r.toLowerCase());
  
  // Exact match to profile target roles
  for (const role of roleCluster) {
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
  
  // High-scoring variants for Sales Engineer profile
  if (roleCluster.some(r => r.includes('sales engineer') || r.includes('sales') || r.includes('solutions'))) {
    if (title.includes('solutions engineer') || title.includes('solution engineer')) return 95;
    if (title.includes('pre-sales') || title.includes('presales')) return 90;
    if (title.includes('demo engineer') || title.includes('technical demo')) return 85;
    if (title.includes('technical account manager') || title.includes('tam')) return 80;
    if (title.includes('customer engineer') || title.includes('customer success engineer')) return 75;
    if (title.includes('field engineer') && title.includes('sales')) return 70;
    if (title.includes('sales development') || title.includes('technical sales')) return 90;
  }
  
  // Medium-scoring: Related sales/technical roles (NEW - allow exploration)
  if (title.includes('account executive') || title.includes('ae')) return 50;
  if (title.includes('business development') || title.includes('bdr') || title.includes('sdr')) return 45;
  if (title.includes('sales manager') || title.includes('sales director')) return 40;
  if (title.includes('account manager') && !title.includes('technical')) return 35;
  if (title.includes('customer success') && !title.includes('engineer')) return 30;
  
  // Low-scoring: Pure engineering (not sales-related) but still allow through
  const engineeringKeywords = [
    'software engineer', 'backend', 'frontend', 'full stack', 'fullstack',
    'machine learning', 'ml engineer', 'data scientist', 'data engineer',
    'devops', 'platform engineer', 'infrastructure', 'security engineer',
    'qa engineer', 'test engineer', 'research engineer', 'sdet'
  ];
  
  for (const keyword of engineeringKeywords) {
    if (title.includes(keyword)) {
      return 10; // Low score but don't exclude
    }
  }
  
  // Default: Any other role gets base score (allow exploration)
  return 20;
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
  
  // If hybrid/onsite and not in LA region, very low score (STRENGTHENED)
  if (!parsed.isRemote && !isInLARegion) {
    return 10; // Changed from 20 to 10 - penalize harder
  }
  
  // Unknown location parsing = low score (STRENGTHENED)
  if (parsed.country === 'Unknown') {
    return 40; // Changed from 50 to 40 - be more cautious
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
 * Calculate company score (0-100) based on detected company type signals
 * SaaS/AI/ML/DevTools/Cloud/Startup → higher scores
 * Manufacturing/insurance/logistics/finance ops → lower scores
 * If no signal detected, score ≤30
 * Normalized to 10+ distinct values
 */
function calculateCompanyScore(job: Job, companyPreferences?: { size?: string[]; stage?: string[]; industries?: string[] }): number {
  const text = normalizeText(`${job.title} ${job.company} ${job.description || ''}`);
  const companyName = normalizeText(job.company);
  
  // PREMIUM COMPANY TIER BONUS
  // Load premium companies list
  let premiumCompanies: any = {};
  try {
    const fs = require('fs');
    const path = require('path');
    const premiumPath = path.join(process.cwd(), 'server', 'data', 'premium-companies.json');
    premiumCompanies = JSON.parse(fs.readFileSync(premiumPath, 'utf-8'));
  } catch (error) {
    // If file doesn't exist, continue without premium bonus
  }
  
  // Check if company is in premium tiers
  let tierBonus = 0;
  const allTiers = [
    { tier: 'tier1_faang', bonus: 100 },
    { tier: 'tier1_unicorns', bonus: 95 },
    { tier: 'tier1_finance', bonus: 95 },
    { tier: 'tier1_media', bonus: 90 },
    { tier: 'tier2_established_tech', bonus: 80 },
    { tier: 'tier2_healthcare_biotech', bonus: 80 },
    { tier: 'tier2_nyc_tech', bonus: 75 },
    { tier: 'tier3_well_funded_startups', bonus: 70 }
  ];
  
  for (const { tier, bonus } of allTiers) {
    const companies = premiumCompanies[tier] || [];
    for (const premiumCompany of companies) {
      if (companyName.includes(normalizeText(premiumCompany))) {
        tierBonus = bonus;
        break;
      }
    }
    if (tierBonus > 0) break;
  }
  
  // If premium company detected, return tier bonus immediately
  if (tierBonus > 0) {
    return tierBonus;
  }
  
  let positiveSignals = 0;
  let negativeSignals = 0;
  
  // POSITIVE SIGNALS (tech/startup/modern)
  const positiveKeywords = [
    // Core tech
    'saas', 'software as a service', 'platform', 'cloud', 'api',
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm',
    'devtools', 'developer tools', 'infrastructure', 'kubernetes',
    // Startup signals
    'startup', 'early stage', 'seed', 'series a', 'series b', 'venture backed',
    'yc', 'y combinator', 'techstars', 'founder', 'fast-growing',
    // Modern tech
    'react', 'node', 'python', 'typescript', 'aws', 'azure', 'gcp',
    'microservices', 'serverless', 'containerization', 'ci/cd',
    // Innovation
    'innovative', 'cutting-edge', 'disruptive', 'next-generation',
    'b2b saas', 'enterprise software', 'developer platform'
  ];
  
  for (const keyword of positiveKeywords) {
    if (text.includes(keyword)) {
      positiveSignals++;
    }
  }
  
  // NEGATIVE SIGNALS (traditional/non-tech)
  const negativeKeywords = [
    // Manufacturing
    'manufacturing', 'factory', 'production line', 'assembly', 'industrial',
    'automotive', 'aerospace', 'mechanical', 'fabrication',
    // Insurance/finance ops
    'insurance', 'underwriting', 'claims', 'actuarial', 'policy',
    'banking', 'financial services', 'wealth management', 'investment banking',
    // Logistics/supply chain
    'logistics', 'supply chain', 'warehousing', 'distribution', 'freight',
    'shipping', 'transportation', 'trucking', 'fulfillment',
    // Other traditional
    'retail', 'hospitality', 'restaurant', 'food service', 'healthcare operations',
    'real estate', 'construction', 'energy', 'utilities'
  ];
  
  for (const keyword of negativeKeywords) {
    if (text.includes(keyword)) {
      negativeSignals++;
    }
  }
  
  // Calculate raw score based on signal balance
  const netSignals = positiveSignals - (negativeSignals * 2); // Negative signals weighted 2x
  
  // If no signals detected at all, return low score (≤30)
  if (positiveSignals === 0 && negativeSignals === 0) {
    return Math.floor(Math.random() * 15) + 10; // 10-25 range for no signals
  }
  
  // If only negative signals, return very low score
  if (positiveSignals === 0 && negativeSignals > 0) {
    return Math.max(5, 30 - (negativeSignals * 5)); // 5-25 range
  }
  
  // Map net signals to 0-100 range with distinct bands
  // Base score starts at 30, increases with positive signals
  const rawScore = 30 + (netSignals * 8);
  const normalizedScore = Math.max(10, Math.min(100, rawScore));
  
  return Math.round(normalizedScore); // Round to ensure distinct integer values
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
 * Calculate skills match score (0-100) with tiered matching
 * Tier 1: Exact matches (profile skills)
 * Tier 2: Related terms and synonyms
 * Tier 3: Category matches (sales engineering, technical sales, etc.)
 * Normalized to 0-100 with 10+ distinct bands
 */
function calculateSkillsScore(job: Job, skills?: { technical?: string[]; sales?: string[]; soft?: string[] }): number {
  const text = normalizeText(`${job.title} ${job.description || ''}`);
  
  let tier1Matches = 0; // Exact matches from profile
  let tier2Matches = 0; // Synonyms and related terms
  let tier3Matches = 0; // Category matches
  
  // Tier 1: Exact profile skill matches
  const allProfileSkills: string[] = [];
  if (skills?.technical) allProfileSkills.push(...skills.technical);
  if (skills?.sales) allProfileSkills.push(...skills.sales);
  if (skills?.soft) allProfileSkills.push(...skills.soft);
  
  for (const skill of allProfileSkills) {
    if (text.includes(skill.toLowerCase())) {
      tier1Matches++;
    }
  }
  
  // Tier 2: Synonyms and related terms
  const tier2Keywords = [
    // Technical synonyms
    'api', 'rest', 'graphql', 'sdk', 'integration', 'webhook',
    'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker',
    'javascript', 'typescript', 'node', 'react', 'vue', 'angular',
    'sql', 'database', 'postgres', 'mysql', 'mongodb',
    'ci/cd', 'devops', 'git', 'github', 'gitlab',
    // Sales engineering synonyms
    'demo', 'proof of concept', 'poc', 'trial', 'pilot',
    'technical presentation', 'solution design', 'architecture review',
    'customer success', 'onboarding', 'implementation',
    'crm', 'salesforce', 'hubspot', 'outreach', 'apollo',
    'quota', 'pipeline', 'forecasting', 'deal', 'close',
    // Soft skill synonyms
    'communication', 'presentation', 'collaboration', 'teamwork',
    'problem solving', 'analytical', 'strategic', 'leadership'
  ];
  
  for (const keyword of tier2Keywords) {
    if (text.includes(keyword)) {
      tier2Matches++;
    }
  }
  
  // Tier 3: Category matches (sales engineering, technical sales, pre-sales)
  const tier3Keywords = [
    'sales engineer', 'solutions engineer', 'pre-sales', 'presales',
    'technical sales', 'sales specialist', 'demo engineer',
    'customer engineer', 'field engineer', 'technical account manager',
    'solution architect', 'sales consultant', 'technical consultant'
  ];
  
  for (const keyword of tier3Keywords) {
    if (text.includes(keyword)) {
      tier3Matches++;
    }
  }
  
  // Calculate weighted score
  // Tier 1: 5 points per match (exact profile skills)
  // Tier 2: 2 points per match (related terms)
  // Tier 3: 3 points per match (category)
  const rawScore = (tier1Matches * 5) + (tier2Matches * 2) + (tier3Matches * 3);
  
  // Normalize to 0-100 range with distinct bands
  // If no matches at all, return very low score (≤20)
  if (rawScore === 0) {
    return Math.floor(Math.random() * 10) + 5; // 5-15 range for no matches
  }
  
  // Map raw score to 0-100 with logarithmic scaling for distinct bands
  const normalizedScore = Math.min(100, 20 + (Math.log(rawScore + 1) * 15));
  
  return Math.round(normalizedScore); // Round to ensure distinct integer values
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
  
  // HARD BLOCK: Finance analyst, Crypto trader, Clinical/healthcare, Project manager, Insurance sales
  const hardBlockKeywords = [
    // Finance
    'finance analyst', 'financial analyst', 'finance manager', 'finance operations',
    'accounting', 'accountant', 'controller', 'cfo', 'finance director',
    // Crypto/trading
    'crypto', 'cryptocurrency', 'bitcoin', 'blockchain trader', 'trading',
    'quantitative analyst', 'quant', 'hedge fund',
    // Clinical/healthcare
    'clinical', 'healthcare', 'medical', 'hospital', 'patient', 'nurse',
    'physician', 'doctor', 'pharmacist', 'health services',
    // Project manager
    'project manager', 'program manager', 'pmo', 'scrum master', 'agile coach',
    // Insurance
    'insurance', 'underwriting', 'claims', 'actuarial', 'policy',
    // Manufacturing/industrial
    'manufacturing', 'factory', 'production', 'assembly',
    'warehouse', 'logistics', 'supply chain', 'operations',
    'quality assurance', 'qa engineer', 'quality engineer',
    'process engineer', 'industrial', 'mechanical'
  ];
  if (hardBlockKeywords.some(kw => title.includes(kw) || description.includes(kw))) {
    return true; // Block irrelevant roles
  }
  
  // HARD BLOCK: SDR-only roles (unless user is targeting SDR)
  const userTargetsSDR = options.targetRoles.some(r => 
    r.toLowerCase().includes('sdr') || 
    r.toLowerCase().includes('sales development representative')
  );
  if (!userTargetsSDR) {
    const sdrKeywords = [
      'sdr', 'sales development representative', 'business development representative',
      'bdr', 'outbound sales rep', 'lead generation specialist'
    ];
    if (sdrKeywords.some(kw => title.includes(kw))) {
      // Exception: If title also includes 'engineer' or 'solutions', it might be a hybrid role
      if (!title.includes('engineer') && !title.includes('solutions')) {
        return true; // Block pure SDR
      }
    }
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
  
  // HARD BLOCK: International locations for US searches (STRENGTHENED)
  const internationalKeywords = [
    // Asia
    'india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai',
    'china', 'beijing', 'shanghai', 'singapore', 'hong kong', 'taiwan', 'japan', 'tokyo',
    'philippines', 'manila', 'vietnam', 'thailand', 'bangkok', 'malaysia', 'indonesia',
    // Europe
    'uk', 'united kingdom', 'london', 'manchester', 'europe', 'germany', 'berlin',
    'france', 'paris', 'spain', 'madrid', 'italy', 'netherlands', 'amsterdam',
    'poland', 'ireland', 'dublin', 'sweden', 'denmark', 'norway', 'finland',
    // Americas (non-US)
    'mexico', 'guadalajara', 'mexico city', 'canada', 'toronto', 'vancouver', 'montreal',
    'brazil', 'sao paulo', 'argentina', 'buenos aires', 'colombia', 'bogota', 'chile',
    // Oceania
    'australia', 'sydney', 'melbourne', 'new zealand', 'auckland',
    // Middle East
    'israel', 'tel aviv', 'dubai', 'uae', 'saudi arabia'
  ];
  
  // Block if ANY international keyword found in location
  if (internationalKeywords.some(kw => location.includes(kw))) {
    return true; // Block all international locations
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
  
  // HARD BLOCK: Required years >= 7 (clearly too senior)
  if (requiredYears && requiredYears >= 7) {
    return true;
  }
  
  // REMOVED: Hard role blocking - now using profile for RANKING only, not exclusion
  // Profile target_roles are used in calculateRoleScore() to rank jobs by fit
  // This allows users to explore ANY role while still getting personalized top 20
  
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
  // If topN >= 100, assume "show all" mode and skip diversity constraints
  if (topN >= 100) {
    console.log(`[FILTER] Show all mode (topN=${topN}), skipping diversity constraints`);
    return scored; // Return all scored jobs without diversity limits
  }
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
    
    // Check source diversity constraint (max 6 per source in top N mode)
    const currentSourceCount = sourceCount[source] || 0;
    if (currentSourceCount >= 6) {
      continue; // Skip if source already has 6 jobs in top N
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
  
  // FILTER OUT LOW-QUALITY MATCHES (NEW - minimum 65% score)
  const MIN_SCORE_THRESHOLD = 65;
  const highQualityJobs = scored.filter(job => job.score >= MIN_SCORE_THRESHOLD);
  
  console.log(`[FILTER] Score threshold: ${scored.length} jobs → ${highQualityJobs.length} jobs above ${MIN_SCORE_THRESHOLD}%`);
  
  // If we have fewer than topN high-quality jobs, lower threshold to 60%
  const jobsToRank = highQualityJobs.length >= topN ? highQualityJobs : scored.filter(job => job.score >= 60);
  
  // Apply diversity constraints to high-quality jobs only
  const diversified = applyDiversityConstraints(jobsToRank, options.targetRoles, topN);
  
  return diversified;
}
