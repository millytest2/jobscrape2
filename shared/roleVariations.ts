/**
 * Role Variations Helper
 * Provides direct and indirect role variations for job searches
 */

export interface RoleVariations {
  direct: string[];
  indirect: string[];
  all: string[];
}

/**
 * Get role variations based on the primary role
 * @param primaryRole - The main role to search for (e.g., "Sales Engineer")
 * @returns Object containing direct, indirect, and all role variations
 */
export function getRoleVariations(primaryRole: string): RoleVariations {
  // Normalize the primary role
  const normalized = primaryRole.toLowerCase().trim();
  
  // Define role variations based on common patterns
  const direct: string[] = [primaryRole]; // Always include the original
  const indirect: string[] = [];
  
  // Sales Engineer variations
  if (normalized.includes('sales') && normalized.includes('engineer')) {
    direct.push('Pre-Sales Engineer', 'Solutions Engineer');
    indirect.push('Technical Account Manager', 'Demo Engineer', 'Sales Solutions Architect', 'Customer Engineer');
  }
  // Solutions Engineer variations
  else if (normalized.includes('solutions') && normalized.includes('engineer')) {
    direct.push('Sales Engineer', 'Pre-Sales Engineer');
    indirect.push('Technical Account Manager', 'Customer Engineer', 'Sales Solutions Architect');
  }
  // Pre-Sales Engineer variations
  else if (normalized.includes('pre-sales') || normalized.includes('presales')) {
    direct.push('Sales Engineer', 'Solutions Engineer');
    indirect.push('Technical Account Manager', 'Demo Engineer', 'Customer Engineer');
  }
  // Software Engineer variations
  else if (normalized.includes('software') && normalized.includes('engineer')) {
    direct.push('Full Stack Engineer', 'Backend Engineer', 'Frontend Engineer');
    indirect.push('Software Developer', 'Application Engineer');
  }
  // Data variations
  else if (normalized.includes('data')) {
    if (normalized.includes('scientist')) {
      direct.push('Machine Learning Engineer', 'Data Analyst');
      indirect.push('AI Engineer', 'Research Scientist');
    } else if (normalized.includes('engineer')) {
      direct.push('Data Scientist', 'Analytics Engineer');
      indirect.push('Data Analyst', 'ML Engineer');
    }
  }
  
  // Remove duplicates and return
  const directUnique = Array.from(new Set(direct));
  const indirectUnique = Array.from(new Set(indirect));
  const allRoles = Array.from(new Set([...direct, ...indirect]));
  
  return {
    direct: directUnique,
    indirect: indirectUnique,
    all: allRoles
  };
}

/**
 * Get a limited set of role variations for API calls with query limits
 * @param primaryRole - The main role to search for
 * @param maxVariations - Maximum number of variations to return (default: 3)
 * @returns Array of role variations, prioritizing direct matches
 */
export function getLimitedRoleVariations(primaryRole: string, maxVariations: number = 3): string[] {
  const variations = getRoleVariations(primaryRole);
  
  // Prioritize direct roles, then add indirect if space allows
  const limited = [...variations.direct];
  
  if (limited.length < maxVariations) {
    const remaining = maxVariations - limited.length;
    limited.push(...variations.indirect.slice(0, remaining));
  }
  
  return limited.slice(0, maxVariations);
}
