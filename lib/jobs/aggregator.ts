import prisma from "@/lib/prisma";
import { fetchBdJobs } from "./providers/bdjobs";

import { fetchLinkedInJobs } from "./providers/linkedin";
import type { JobType, ProviderQuery, ProviderResult, RawJob } from "./types";

/**
 * Runs every source in parallel, removes duplicates, and writes the result
 * into JobListing. Providers never throw at this level — a dead source
 * degrades into a note in the sync report rather than an empty page.
 */

export interface SyncReport {
  fetched: number;
  created: number;
  updated: number;
  notes: { source: string; ok: boolean; note: string }[];
}

/** Two posts are the same job if the company and a squashed title agree. */
function dedupeKey(job: RawJob): string {
  const squash = (value: string) =>
    value
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]/g, "");
  return `${squash(job.company)}::${squash(job.title)}`;
}

/** LinkedIn first, then BDJobs, then samples — earlier sources win a tie. */
const SOURCE_PRIORITY: Record<string, number> = {
  LINKEDIN: 0,
  BDJOBS: 1,
  CURATED: 2,
};

export function dedupeJobs(jobs: RawJob[]): RawJob[] {
  const best = new Map<string, RawJob>();

  for (const job of jobs) {
    const key = dedupeKey(job);
    const existing = best.get(key);

    if (!existing) {
      best.set(key, job);
      continue;
    }

    const incomingRank = SOURCE_PRIORITY[job.source] ?? 9;
    const existingRank = SOURCE_PRIORITY[existing.source] ?? 9;

    if (incomingRank < existingRank) {
      best.set(key, job);
    } else if (incomingRank === existingRank && job.description.length > existing.description.length) {
      // Same source, richer text wins.
      best.set(key, job);
    }
  }

  return [...best.values()];
}

export function buildQuery(options: {
  keywords: string[];
  locations: string[];
  jobTypes: string[];
  limit?: number;
}): ProviderQuery {
  return {
    keywords: options.keywords.filter(Boolean).length
      ? options.keywords.filter(Boolean)
      : ["intern"],
    locations: options.locations.filter(Boolean).length
      ? options.locations.filter(Boolean)
      : ["Bangladesh"],
    jobTypes: (options.jobTypes.filter(Boolean) as JobType[]).length
      ? (options.jobTypes as JobType[])
      : ["INTERNSHIP"],
    limit: options.limit ?? 25,
  };
}

export async function syncJobs(query: ProviderQuery): Promise<SyncReport> {
  const settled = await Promise.allSettled([
  fetchLinkedInJobs(query),
  fetchBdJobs(query),
]);

  const results: ProviderResult[] = settled.map((outcome, index) => {
     if (outcome.status === "fulfilled") return outcome.value;

      const source = (["LINKEDIN", "BDJOBS"] as const)[index];
  console.error(`[jobs] ${source} provider rejected:`, outcome.reason);
  return { source, jobs: [], ok: false, note: `${source} provider crashed.` };
});

  const merged = dedupeJobs(results.flatMap((result) => result.jobs));

  let created = 0;
  let updated = 0;

  for (const job of merged) {
    const data = {
      url: job.url,
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo ?? null,
      location: job.location,
      isRemote: job.isRemote,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      description: job.description,
      skills: job.skills,
      category: job.category,
      salaryText: job.salaryText ?? null,
      minCgpa: job.minCgpa ?? null,
      postedAt: job.postedAt,
      deadline: job.deadline ?? null,
      isActive: true,
      fetchedAt: new Date(),
    };

    try {
      const existing = await prisma.jobListing.findUnique({
        where: {
          source_externalId: { source: job.source, externalId: job.externalId },
        },
        select: { id: true },
      });

      await prisma.jobListing.upsert({
        where: {
          source_externalId: { source: job.source, externalId: job.externalId },
        },
        update: data,
        create: { source: job.source, externalId: job.externalId, ...data },
      });

      if (existing) updated += 1;
      else created += 1;
    } catch (error) {
      console.error(`[jobs] Failed to store ${job.source}/${job.externalId}:`, error);
    }
  }

  // Retire anything that has quietly closed.
  await prisma.jobListing.updateMany({
    where: { deadline: { lt: new Date() }, isActive: true },
    data: { isActive: false },
  });

  return {
    fetched: merged.length,
    created,
    updated,
    notes: results.map((result) => ({
      source: result.source,
      ok: result.ok,
      note: result.note,
    })),
  };
}
