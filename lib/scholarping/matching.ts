import { Scholarship, User } from '@prisma/client';

/**
 * Checks if a user is eligible for a given scholarship based on CGPA and department.
 */
export function isEligibleForScholarship(scholarship: Scholarship, user: User): boolean {
  // Check CGPA
  if (user.currentCgpa < scholarship.requirementCgpa) {
    return false;
  }

  // Check Department / Major
  // "ALL" means any major is eligible
  if (scholarship.department.toUpperCase() === 'ALL') {
    return true;
  }

  // Otherwise, the department must match exactly (case-insensitive)
  if (scholarship.department.toLowerCase() !== user.department.toLowerCase()) {
    return false;
  }

  return true;
}

/**
 * Filters a list of scholarships down to only the ones the user is eligible for.
 */
export function findMatches(scholarships: Scholarship[], user: User): Scholarship[] {
  return scholarships.filter((s) => isEligibleForScholarship(s, user));
}
