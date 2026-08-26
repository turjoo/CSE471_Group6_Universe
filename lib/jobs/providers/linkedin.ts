
import {
  detectCategory,
  detectExperienceLevel,
  detectJobType,
  detectMinCgpa,
  detectRemote,
  detectSkills,
  fingerprint,
  parseDate,
  stripHtml,
  truncate,
} from "../normalize";
import type { ProviderQuery, ProviderResult, RawJob } from "../types";
 
/**
 * Aggregated job feed provider.
 *
 * LinkedIn's own Job Search API is gated behind their Talent Solutions partner
 * programme, so a student project cannot call it directly. This provider
 * instead talks to a configurable gateway (JSearch on RapidAPI by default),
 * which reads Google for Jobs — the index that already covers LinkedIn,
 * Indeed, Glassdoor, ZipRecruiter and company career pages. One query
 * therefore returns listings originating from several boards, not LinkedIn
 * alone.
 *
 * The internal source identifier stays "LINKEDIN" for database continuity
 * (it is stored on every row and drives the dedupe priority); the user-facing
 * label is "Google Jobs" because that is what the data honestly is.
 *
 * Required env:
 *   LINKEDIN_API_URL   e.g. https://jsearch.p.rapidapi.com/search-v2
 *   LINKEDIN_API_KEY   your gateway key
 * Optional env:
 *   LINKEDIN_API_HOST  RapidAPI host header, e.g. jsearch.p.rapidapi.com
 *   LINKEDIN_API_AUTH_STYLE  "rapidapi" (default) | "bearer" | "query"
 *
 * With no key configured the provider returns an empty, non-failing result so
 * the rest of the aggregator keeps working.
 */
 
interface GatewayJob {
  [key: string]: unknown;
}
 
function pickString(job: GatewayJob, keys: string[]): string {
  for (const key of keys) {
    const value = job[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
 
/** Gateways nest the array under different keys; find the first array of objects. */
function extractJobArray(payload: unknown): GatewayJob[] {
  if (Array.isArray(payload)) return payload as GatewayJob[];
  if (!payload || typeof payload !== "object") return [];
 
  const candidateKeys = ["data", "jobs", "results", "items", "hits", "response"];
  const record = payload as Record<string, unknown>;
 
  for (const key of candidateKeys) {
    const value = record[key];
    if (Array.isArray(value) && value.every((v) => typeof v === "object")) {
      return value as GatewayJob[];
    }
    if (value && typeof value === "object") {
      const nested = extractJobArray(value);
      if (nested.length) return nested;
    }
  }
  return [];
}
 
function toRawJob(job: GatewayJob): RawJob | null {
  const title = pickString(job, ["job_title", "title", "position", "jobTitle"]);
  const company = pickString(job, [
    "employer_name",
    "company",
    "companyName",
    "company_name",
    "organization",
  ]);
 
  if (!title || !company) return null;
 
  const rawDescription = pickString(job, [
    "job_description",
    "description",
    "jobDescription",
    "snippet",
  ]);
  const description = truncate(stripHtml(rawDescription) || `${title} at ${company}.`);
 
  const city = pickString(job, ["job_city", "city"]);
  const country = pickString(job, ["job_country", "country"]);
  const location =
    pickString(job, ["location", "job_location", "formattedLocation"]) ||
    [city, country].filter(Boolean).join(", ") ||
    "Bangladesh";
 
  const url = pickString(job, [
    "job_apply_link",
    "url",
    "link",
    "job_url",
    "jobUrl",
    "applyUrl",
  ]);
 
  const externalId =
    pickString(job, ["job_id", "id", "jobId", "job_posting_id"]) ||
    fingerprint(title, company, location);
 
  const jobType = detectJobType(
    pickString(job, ["job_employment_type", "employmentType", "type"]),
    title,
    description,
  );
 
  const employmentBlob = `${title} ${description}`;
 
  return {
    source: "LINKEDIN",
    externalId,
    url: url || "https://www.google.com/search?q=jobs",
    title,
    company,
    companyLogo: pickString(job, ["employer_logo", "logo", "companyLogo"]) || null,
    location,
    isRemote:
      job.job_is_remote === true ||
      job.isRemote === true ||
      detectRemote(location, employmentBlob),
    jobType,
    experienceLevel: detectExperienceLevel(jobType, employmentBlob),
    description,
    skills: detectSkills(title, description),
    category: detectCategory(title, description),
    salaryText:
      pickString(job, ["salary", "job_salary", "salaryText", "compensation"]) || null,
    minCgpa: detectMinCgpa(description),
    postedAt: parseDate(
      job.job_posted_at_datetime_utc ??
        job.job_posted_at_timestamp ??
        job.postedAt ??
        job.posted_date ??
        job.date,
    ),
    deadline: job.job_offer_expiration_datetime_utc
      ? parseDate(job.job_offer_expiration_datetime_utc)
      : null,
  };
}
 
export async function fetchLinkedInJobs(
  query: ProviderQuery,
): Promise<ProviderResult> {
  const apiUrl = process.env.LINKEDIN_API_URL;
  const apiKey = process.env.LINKEDIN_API_KEY;
 
  if (!apiUrl || !apiKey) {
    return {
      source: "LINKEDIN",
      jobs: [],
      ok: true,
      note: "Google Jobs skipped — set LINKEDIN_API_URL and LINKEDIN_API_KEY in .env to enable live fetching.",
    };
  }
 
  const searchTerm = query.keywords.slice(0, 3).join(" ") || "intern";
  const locationTerm = query.locations[0] || "Bangladesh";
 
  const url = new URL(apiUrl);
  url.searchParams.set("query", `${searchTerm} in ${locationTerm}`);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("date_posted", "month");
 
  const authStyle = process.env.LINKEDIN_API_AUTH_STYLE ?? "rapidapi";
  const headers: Record<string, string> = { Accept: "application/json" };
 
  if (authStyle === "bearer") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (authStyle === "query") {
    url.searchParams.set("api_key", apiKey);
  } else {
    headers["x-rapidapi-key"] = apiKey;
    if (process.env.LINKEDIN_API_HOST) {
      headers["x-rapidapi-host"] = process.env.LINKEDIN_API_HOST;
    }
  }
 
  try {
    const response = await fetch(url.toString(), {
      headers,
      // Listings change slowly; cache for 30 minutes to protect the API quota.
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(12_000),
    });
 
    if (!response.ok) {
      return {
        source: "LINKEDIN",
        jobs: [],
        ok: false,
        note: `Google Jobs gateway returned ${response.status}. Check your API key, endpoint path and quota.`,
      };
    }
 
    const payload: unknown = await response.json();
    const jobs = extractJobArray(payload)
      .slice(0, query.limit)
      .map(toRawJob)
      .filter((job): job is RawJob => job !== null);
 
    return {
      source: "LINKEDIN",
      jobs,
      ok: true,
      note: `Google Jobs returned ${jobs.length} listing${jobs.length === 1 ? "" : "s"} across LinkedIn, Indeed and other boards.`,
    };
  } catch (error) {
    console.error("[jobs] Google Jobs fetch failed:", error);
    return {
      source: "LINKEDIN",
      jobs: [],
      ok: false,
      note: "Google Jobs request failed — network error or timeout.",
    };
  }
}