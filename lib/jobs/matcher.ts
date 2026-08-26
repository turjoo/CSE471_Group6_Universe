import type { JobCategory, MatchResult, StudentProfile } from "./types";

/**
 * Matching engine.
 *
 * Scores a listing against a student out of 100 and, just as importantly,
 * explains itself. Every point added is paired with a sentence the student can
 * read, so the score is never an unexplained number on a card.
 *
 * Weights:
 *   Skills overlap ............ 35
 *   Field relevance ........... 20
 *   Level fit (student-ready) . 15
 *   Location fit .............. 10
 *   CGPA eligibility .......... 10
 *   Keyword hit ............... 05
 *   Freshness ................. 05
 */

const WEIGHTS = {
  skills: 35,
  field: 20,
  level: 15,
  location: 10,
  cgpa: 10,
  keyword: 5,
  freshness: 5,
} as const;

/** Which job families each department normally feeds into. */
const DEPARTMENT_CATEGORIES: { pattern: RegExp; categories: JobCategory[] }[] = [
  {
    pattern: /computer|software|cse|\bcs\b|information technology|\bit\b/i,
    categories: ["SOFTWARE", "DATA", "HARDWARE"],
  },
  {
    pattern: /electrical|electronic|eee|ece|mechanical|civil/i,
    categories: ["HARDWARE", "SOFTWARE", "DATA"],
  },
  {
    pattern: /bba|business|management|marketing/i,
    categories: ["BUSINESS", "MARKETING", "FINANCE"],
  },
  {
    pattern: /economics|finance|accounting|banking/i,
    categories: ["FINANCE", "BUSINESS", "DATA"],
  },
];

function categoriesForDepartment(department: string): JobCategory[] {
  for (const entry of DEPARTMENT_CATEGORIES) {
    if (entry.pattern.test(department)) return entry.categories;
  }
  return ["GENERAL"];
}

export interface MatchableJob {
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  jobType: string;
  experienceLevel: string;
  description: string;
  skills: string[];
  category: string;
  minCgpa: number | null;
  postedAt: Date;
  deadline: Date | null;
}

export function matchJobToStudent(
  job: MatchableJob,
  profile: StudentProfile,
): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const gaps: string[] = [];

  const haystack = `${job.title} ${job.description}`.toLowerCase();

  // ---- 1. Skills overlap -------------------------------------------------
  const studentSkills = profile.skills.map((s) => s.toLowerCase().trim()).filter(Boolean);
  const jobSkills = job.skills.map((s) => s.toLowerCase());

  if (studentSkills.length === 0) {
    // No skills on file yet: award a neutral half so early users aren't
    // buried under 10% matches before they've filled in their profile.
    score += WEIGHTS.skills * 0.5;
    gaps.push("Add your skills in preferences to sharpen this match.");
  } else {
    const overlap = studentSkills.filter(
      (skill) => jobSkills.includes(skill) || haystack.includes(skill),
    );
    const ratio = Math.min(overlap.length / Math.min(studentSkills.length, 4), 1);
    score += WEIGHTS.skills * ratio;

    if (overlap.length > 0) {
      const shown = overlap.slice(0, 4).map(titleCase).join(", ");
      reasons.push(`Matches your skills: ${shown}.`);
    } else {
      gaps.push("None of your listed skills appear in this post.");
    }

    const missing = jobSkills.filter((skill) => !studentSkills.includes(skill));
    if (missing.length > 0) {
      gaps.push(`Post also mentions: ${missing.slice(0, 3).map(titleCase).join(", ")}.`);
    }
  }

  // ---- 2. Field relevance ------------------------------------------------
  const preferred = categoriesForDepartment(profile.department);
  const jobCategory = job.category as JobCategory;

  if (preferred[0] === jobCategory) {
    score += WEIGHTS.field;
    reasons.push(`Core ${friendlyCategory(jobCategory)} role for ${profile.department}.`);
  } else if (preferred.includes(jobCategory)) {
    score += WEIGHTS.field * 0.7;
    reasons.push(`Adjacent to your department (${friendlyCategory(jobCategory)}).`);
  } else if (jobCategory === "GENERAL") {
    score += WEIGHTS.field * 0.5;
  } else {
    score += WEIGHTS.field * 0.25;
    gaps.push(`Outside the usual ${profile.department} track.`);
  }

  // ---- 3. Level fit ------------------------------------------------------
  const wantsInternship = profile.jobTypes.includes(job.jobType);
  const isStudentFriendly =
    job.experienceLevel === "INTERN" || job.experienceLevel === "ENTRY";

  if (isStudentFriendly && wantsInternship) {
    score += WEIGHTS.level;
    reasons.push(`${friendlyType(job.jobType)} role open to students.`);
  } else if (isStudentFriendly) {
    score += WEIGHTS.level * 0.6;
  } else if (wantsInternship) {
    score += WEIGHTS.level * 0.3;
    gaps.push("Post expects prior professional experience.");
  } else {
    gaps.push("Neither the role type nor the seniority fits a current student.");
  }

  // Final-year students get a nudge toward full-time graduate roles.
  if (profile.semester >= 10 && job.jobType === "FULL_TIME" && isStudentFriendly) {
    score += 3;
    reasons.push("Graduate-entry role, and you are close to finishing.");
  }

  // ---- 4. Location fit ---------------------------------------------------
  const locations = profile.preferredLocations.map((l) => l.toLowerCase().trim());
  const jobLocation = job.location.toLowerCase();

  if (job.isRemote && locations.some((l) => l.includes("remote"))) {
    score += WEIGHTS.location;
    reasons.push("Remote, which you asked for.");
  } else if (locations.length === 0) {
    score += WEIGHTS.location * 0.6;
  } else if (locations.some((l) => l && jobLocation.includes(l))) {
    score += WEIGHTS.location;
    reasons.push(`Located in ${job.location}.`);
  } else if (job.isRemote) {
    score += WEIGHTS.location * 0.8;
    reasons.push("Remote-friendly.");
  } else {
    score += WEIGHTS.location * 0.3;
    gaps.push(`Commute to ${job.location} may not suit you.`);
  }

  // ---- 5. CGPA eligibility ----------------------------------------------
  if (job.minCgpa === null) {
    score += WEIGHTS.cgpa * 0.8;
  } else if (profile.currentCgpa >= job.minCgpa) {
    score += WEIGHTS.cgpa;
    reasons.push(
      `You clear the CGPA bar (needs ${job.minCgpa.toFixed(2)}, you have ${profile.currentCgpa.toFixed(2)}).`,
    );
  } else {
    const shortfall = job.minCgpa - profile.currentCgpa;
    score += shortfall <= 0.15 ? WEIGHTS.cgpa * 0.4 : 0;
    gaps.push(
      `Asks for CGPA ${job.minCgpa.toFixed(2)}; you are ${shortfall.toFixed(2)} short.`,
    );
  }

  // ---- 6. Keyword hit ----------------------------------------------------
  const keywordHit = profile.keywords.find(
    (kw) => kw.trim() && haystack.includes(kw.toLowerCase().trim()),
  );
  if (keywordHit) {
    score += WEIGHTS.keyword;
    reasons.push(`Contains your search term "${keywordHit}".`);
  }

  // ---- 7. Freshness ------------------------------------------------------
  const ageDays = (Date.now() - job.postedAt.getTime()) / 86_400_000;
  if (ageDays <= 3) {
    score += WEIGHTS.freshness;
    reasons.push("Posted within the last three days.");
  } else if (ageDays <= 14) {
    score += WEIGHTS.freshness * 0.5;
  }

  // ---- Deadline pressure is a warning, not a score change ----------------
  if (job.deadline) {
    const daysLeft = Math.ceil((job.deadline.getTime() - Date.now()) / 86_400_000);
    if (daysLeft <= 0) {
      gaps.push("The application deadline has passed.");
    } else if (daysLeft <= 3) {
      gaps.push(`Closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — apply now.`);
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    gaps,
  };
}

export function matchBand(score: number): {
  label: string;
  tone: "excellent" | "strong" | "fair" | "weak";
} {
  if (score >= 80) return { label: "Excellent match", tone: "excellent" };
  if (score >= 65) return { label: "Strong match", tone: "strong" };
  if (score >= 45) return { label: "Fair match", tone: "fair" };
  return { label: "Weak match", tone: "weak" };
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function friendlyCategory(category: JobCategory): string {
  const map: Record<JobCategory, string> = {
    SOFTWARE: "software",
    DATA: "data",
    HARDWARE: "hardware and electronics",
    BUSINESS: "business",
    FINANCE: "finance",
    MARKETING: "marketing",
    GENERAL: "general",
  };
  return map[category] ?? "general";
}

function friendlyType(jobType: string): string {
  const map: Record<string, string> = {
    INTERNSHIP: "Internship",
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
  };
  return map[jobType] ?? "Open";
}
