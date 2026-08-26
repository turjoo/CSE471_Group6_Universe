/**
 * Shared vocabulary for the Smart Job Aggregator.
 *
 * Every external source (LinkedIn, BDJobs, curated fallback) returns its own
 * shape. Each provider is responsible for normalising into `RawJob` so the
 * matcher and the database never need to know where a listing came from.
 */

export type JobSource = "LINKEDIN" | "BDJOBS" | "CURATED";

export type JobType = "INTERNSHIP" | "FULL_TIME" | "PART_TIME" | "CONTRACT";

export type ExperienceLevel = "INTERN" | "ENTRY" | "MID" | "SENIOR";

export type JobCategory =
  | "SOFTWARE"
  | "DATA"
  | "HARDWARE"
  | "BUSINESS"
  | "FINANCE"
  | "MARKETING"
  | "GENERAL";

/** A listing after a provider has normalised it, before it hits the database. */
export interface RawJob {
  source: JobSource;
  externalId: string;
  url: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  location: string;
  isRemote: boolean;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  description: string;
  skills: string[];
  category: JobCategory;
  salaryText?: string | null;
  minCgpa?: number | null;
  postedAt: Date;
  deadline?: Date | null;
}

/** What the aggregator asks each provider to look for. */
export interface ProviderQuery {
  keywords: string[];
  locations: string[];
  jobTypes: JobType[];
  limit: number;
}

export interface ProviderResult {
  source: JobSource;
  jobs: RawJob[];
  ok: boolean;
  /** Human-readable note shown in the sync report, e.g. "no API key set". */
  note: string;
}

/** The student profile the matcher scores against. */
export interface StudentProfile {
  department: string;
  semester: number;
  currentCgpa: number;
  skills: string[];
  keywords: string[];
  preferredLocations: string[];
  jobTypes: string[];
}

export interface MatchResult {
  score: number; // 0 - 100
  reasons: string[]; // why it scored well
  gaps: string[]; // what is missing
}
