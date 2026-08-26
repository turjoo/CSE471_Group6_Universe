"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { buildQuery, syncJobs } from "@/lib/jobs/aggregator";
import { matchJobToStudent } from "@/lib/jobs/matcher";
import type { StudentProfile } from "@/lib/jobs/types";

/**
 * Module 2 · Feature 3 — Smart Job Aggregator & Alert System
 *
 * Server actions follow the same shape as the rest of UniVerse: read the
 * `userId` cookie, return `{ success, message, ...data }`, never throw at the
 * client.
 */

const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

async function getAuthUserId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("userId")?.value;
}

// ---------------------------------------------------------------------------
// Serialisable shapes sent to the client
// ---------------------------------------------------------------------------

export interface JobCardData {
  id: string;
  source: string;
  url: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  isRemote: boolean;
  jobType: string;
  experienceLevel: string;
  description: string;
  skills: string[];
  category: string;
  salaryText: string | null;
  minCgpa: number | null;
  postedAt: string;
  deadline: string | null;
  daysLeft: number | null;
  matchScore: number;
  matchReasons: string[];
  matchGaps: string[];
  savedStatus: ApplicationStatus | null;
}

export interface PreferenceData {
  keywords: string[];
  skills: string[];
  preferredLocations: string[];
  jobTypes: string[];
  minMatchScore: number;
  alertsEnabled: boolean;
  lastSyncedAt: string | null;
}

export interface AlertData {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  reason: string;
  isRead: boolean;
  createdAt: string;
}

const DEFAULT_PREFERENCE: PreferenceData = {
  keywords: ["intern"],
  skills: [],
  preferredLocations: ["Dhaka"],
  jobTypes: ["INTERNSHIP"],
  minMatchScore: 50,
  alertsEnabled: true,
  lastSyncedAt: null,
};

function daysUntil(deadline: Date | null): number | null {
  if (!deadline) return null;
  return Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface JobFilters {
  search?: string;
  jobType?: string; // "ALL" or a JobType
  category?: string; // "ALL" or a JobCategory
  source?: string; // "ALL" | "LINKEDIN" | "BDJOBS" | "CURATED"
  minScore?: number;
  sortBy?: "MATCH" | "RECENT" | "DEADLINE";
}

export async function getJobsData(filters: JobFilters = {}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return {
        success: false,
        authRequired: true,
        message: "Unauthorized",
        user: null,
        preference: DEFAULT_PREFERENCE,
        jobs: [] as JobCardData[],
        alerts: [] as AlertData[],
        unreadAlerts: 0,
        pipeline: { SAVED: 0, APPLIED: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0 },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        semester: true,
        currentCgpa: true,
      },
    });

    if (!user) {
      return {
        success: false,
        authRequired: true,
        message: "User not found.",
        user: null,
        preference: DEFAULT_PREFERENCE,
        jobs: [] as JobCardData[],
        alerts: [] as AlertData[],
        unreadAlerts: 0,
        pipeline: { SAVED: 0, APPLIED: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0 },
      };
    }

    const preferenceRow = await prisma.jobPreference.findUnique({
      where: { userId },
    });

    const preference: PreferenceData = preferenceRow
      ? {
          keywords: preferenceRow.keywords,
          skills: preferenceRow.skills,
          preferredLocations: preferenceRow.preferredLocations,
          jobTypes: preferenceRow.jobTypes,
          minMatchScore: preferenceRow.minMatchScore,
          alertsEnabled: preferenceRow.alertsEnabled,
          lastSyncedAt: preferenceRow.lastSyncedAt?.toISOString() ?? null,
        }
      : DEFAULT_PREFERENCE;

    const profile: StudentProfile = {
      department: user.department,
      semester: user.semester,
      currentCgpa: user.currentCgpa,
      skills: preference.skills,
      keywords: preference.keywords,
      preferredLocations: preference.preferredLocations,
      jobTypes: preference.jobTypes,
    };

    const where: Record<string, unknown> = { isActive: true };
    if (filters.jobType && filters.jobType !== "ALL") where.jobType = filters.jobType;
    if (filters.category && filters.category !== "ALL") where.category = filters.category;
    if (filters.source && filters.source !== "ALL") where.source = filters.source;
    if (filters.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const listings = await prisma.jobListing.findMany({
      where,
      orderBy: { postedAt: "desc" },
      take: 120,
    });

    const savedJobs = await prisma.savedJob.findMany({ where: { userId } });
    const savedByJobId = new Map(savedJobs.map((row) => [row.jobId, row.status]));

    const minScore = filters.minScore ?? 0;

    let jobs: JobCardData[] = listings
      .map((listing) => {
        const match = matchJobToStudent(
          {
            title: listing.title,
            company: listing.company,
            location: listing.location,
            isRemote: listing.isRemote,
            jobType: listing.jobType,
            experienceLevel: listing.experienceLevel,
            description: listing.description,
            skills: listing.skills,
            category: listing.category,
            minCgpa: listing.minCgpa,
            postedAt: listing.postedAt,
            deadline: listing.deadline,
          },
          profile,
        );

        return {
          id: listing.id,
          source: listing.source,
          url: listing.url,
          title: listing.title,
          company: listing.company,
          companyLogo: listing.companyLogo,
          location: listing.location,
          isRemote: listing.isRemote,
          jobType: listing.jobType,
          experienceLevel: listing.experienceLevel,
          description: listing.description,
          skills: listing.skills,
          category: listing.category,
          salaryText: listing.salaryText,
          minCgpa: listing.minCgpa,
          postedAt: listing.postedAt.toISOString(),
          deadline: listing.deadline?.toISOString() ?? null,
          daysLeft: daysUntil(listing.deadline),
          matchScore: match.score,
          matchReasons: match.reasons,
          matchGaps: match.gaps,
          savedStatus: (savedByJobId.get(listing.id) as ApplicationStatus) ?? null,
        };
      })
      .filter((job) => job.matchScore >= minScore);

    const sortBy = filters.sortBy ?? "MATCH";
    jobs = jobs.sort((a, b) => {
      if (sortBy === "RECENT") {
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      }
      if (sortBy === "DEADLINE") {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      }
      return b.matchScore - a.matchScore;
    });

    const alertRows = await prisma.jobAlert.findMany({
      where: { userId },
      include: { job: { select: { title: true, company: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const alerts: AlertData[] = alertRows.map((row) => ({
      id: row.id,
      jobId: row.jobId,
      jobTitle: row.job.title,
      company: row.job.company,
      matchScore: row.matchScore,
      reason: row.reason,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    }));

    const pipeline = { SAVED: 0, APPLIED: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0 };
    savedJobs.forEach((row) => {
      if (row.status in pipeline) {
        pipeline[row.status as ApplicationStatus] += 1;
      }
    });

    return {
      success: true,
      message: "Loaded",
      user,
      preference,
      jobs,
      alerts,
      unreadAlerts: alerts.filter((alert) => !alert.isRead).length,
      pipeline,
    };
  } catch (error) {
    console.error("Job Feed Fetch Error:", error);
    return {
      success: false,
      authRequired: false,
      message: "Could not load the job feed. Try refreshing.",
      user: null,
      preference: DEFAULT_PREFERENCE,
      jobs: [] as JobCardData[],
      alerts: [] as AlertData[],
      unreadAlerts: 0,
      pipeline: { SAVED: 0, APPLIED: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// Sync + alert generation
// ---------------------------------------------------------------------------

export async function refreshJobFeed() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Unauthorized", notes: [] };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: "User not found.", notes: [] };

    const preference = await prisma.jobPreference.findUnique({ where: { userId } });

    const query = buildQuery({
      keywords: preference?.keywords ?? DEFAULT_PREFERENCE.keywords,
      locations: preference?.preferredLocations ?? DEFAULT_PREFERENCE.preferredLocations,
      jobTypes: preference?.jobTypes ?? DEFAULT_PREFERENCE.jobTypes,
      limit: 25,
    });

    const report = await syncJobs(query);

    const alertsCreated = await generateAlertsForUser(userId);

    if (preference) {
      await prisma.jobPreference.update({
        where: { userId },
        data: { lastSyncedAt: new Date() },
      });
    }

    revalidatePath("/jobs");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Synced ${report.fetched} listings · ${report.created} new · ${alertsCreated} alert${alertsCreated === 1 ? "" : "s"} raised.`,
      notes: report.notes,
    };
  } catch (error) {
    console.error("Job Sync Error:", error);
    return { success: false, message: "Sync failed. Check the server log.", notes: [] };
  }
}

/**
 * Scores every active listing the student has not been alerted about yet and
 * records an alert for anything above their threshold.
 */
async function generateAlertsForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const preference = await prisma.jobPreference.findUnique({ where: { userId } });
  if (preference && !preference.alertsEnabled) return 0;

  const profile: StudentProfile = {
    department: user.department,
    semester: user.semester,
    currentCgpa: user.currentCgpa,
    skills: preference?.skills ?? [],
    keywords: preference?.keywords ?? DEFAULT_PREFERENCE.keywords,
    preferredLocations:
      preference?.preferredLocations ?? DEFAULT_PREFERENCE.preferredLocations,
    jobTypes: preference?.jobTypes ?? DEFAULT_PREFERENCE.jobTypes,
  };

  const threshold = preference?.minMatchScore ?? DEFAULT_PREFERENCE.minMatchScore;

  const existingAlerts = await prisma.jobAlert.findMany({
    where: { userId },
    select: { jobId: true },
  });
  const alreadyAlerted = new Set(existingAlerts.map((row) => row.jobId));

  const listings = await prisma.jobListing.findMany({
    where: { isActive: true, id: { notIn: [...alreadyAlerted] } },
    orderBy: { postedAt: "desc" },
    take: 100,
  });

  let created = 0;

  for (const listing of listings) {
    const match = matchJobToStudent(
      {
        title: listing.title,
        company: listing.company,
        location: listing.location,
        isRemote: listing.isRemote,
        jobType: listing.jobType,
        experienceLevel: listing.experienceLevel,
        description: listing.description,
        skills: listing.skills,
        category: listing.category,
        minCgpa: listing.minCgpa,
        postedAt: listing.postedAt,
        deadline: listing.deadline,
      },
      profile,
    );

    if (match.score < threshold) continue;

    const deadlineNote =
      listing.deadline && daysUntil(listing.deadline) !== null
        ? ` Closes in ${daysUntil(listing.deadline)} days.`
        : "";

    try {
      await prisma.jobAlert.create({
        data: {
          userId,
          jobId: listing.id,
          matchScore: match.score,
          reason: `${match.reasons[0] ?? "Fits your saved search."}${deadlineNote}`,
        },
      });
      created += 1;
    } catch {
      // Unique constraint — the alert already exists. Nothing to do.
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function saveJobPreference(data: {
  keywords: string[];
  skills: string[];
  preferredLocations: string[];
  jobTypes: string[];
  minMatchScore: number;
  alertsEnabled: boolean;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Unauthorized" };

    const clean = (values: string[]) =>
      [...new Set(values.map((v) => v.trim()).filter(Boolean))].slice(0, 20);

    const payload = {
      keywords: clean(data.keywords),
      skills: clean(data.skills),
      preferredLocations: clean(data.preferredLocations),
      jobTypes: data.jobTypes.length ? data.jobTypes : ["INTERNSHIP"],
      minMatchScore: Math.min(100, Math.max(0, Math.round(data.minMatchScore))),
      alertsEnabled: data.alertsEnabled,
    };

    await prisma.jobPreference.upsert({
      where: { userId },
      update: payload,
      create: { userId, ...payload },
    });

    revalidatePath("/jobs");
    return { success: true, message: "Preferences saved. Refresh the feed to re-score." };
  } catch (error) {
    console.error("Save Job Preference Error:", error);
    return { success: false, message: "Could not save preferences." };
  }
}

// ---------------------------------------------------------------------------
// Application pipeline
// ---------------------------------------------------------------------------

export async function toggleSaveJob(jobId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Unauthorized", saved: false };

    const existing = await prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    if (existing) {
      await prisma.savedJob.delete({ where: { id: existing.id } });
      revalidatePath("/jobs");
      return { success: true, message: "Removed from your list.", saved: false };
    }

    await prisma.savedJob.create({ data: { userId, jobId, status: "SAVED" } });
    revalidatePath("/jobs");
    return { success: true, message: "Saved to your list.", saved: true };
  } catch (error) {
    console.error("Toggle Save Job Error:", error);
    return { success: false, message: "Could not update your list.", saved: false };
  }
}

export async function updateApplicationStatus(
  jobId: string,
  status: ApplicationStatus,
  notes?: string,
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Unauthorized" };

    if (!APPLICATION_STATUSES.includes(status)) {
      return { success: false, message: "Unknown application status." };
    }

    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: {
        status,
        notes: notes ?? undefined,
        appliedAt: status === "APPLIED" ? new Date() : undefined,
      },
      create: {
        userId,
        jobId,
        status,
        notes: notes ?? null,
        appliedAt: status === "APPLIED" ? new Date() : null,
      },
    });

    revalidatePath("/jobs");
    return { success: true, message: `Moved to ${status.toLowerCase()}.` };
  } catch (error) {
    console.error("Update Application Status Error:", error);
    return { success: false, message: "Could not update the application." };
  }
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function markAlertRead(alertId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Unauthorized" };

    await prisma.jobAlert.updateMany({
      where: { id: alertId, userId },
      data: { isRead: true },
    });

    revalidatePath("/jobs");
    return { success: true, message: "Alert marked as read." };
  } catch (error) {
    console.error("Mark Alert Read Error:", error);
    return { success: false, message: "Could not update the alert." };
  }
}

export async function markAllAlertsRead() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Unauthorized" };

    await prisma.jobAlert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/jobs");
    return { success: true, message: "All alerts marked as read." };
  } catch (error) {
    console.error("Mark All Alerts Read Error:", error);
    return { success: false, message: "Could not update alerts." };
  }
}

/** Small summary for the dashboard card. */
export async function getJobSummary() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, unreadAlerts: 0, savedCount: 0, appliedCount: 0 };
    }

    const [unreadAlerts, savedCount, appliedCount] = await Promise.all([
      prisma.jobAlert.count({ where: { userId, isRead: false } }),
      prisma.savedJob.count({ where: { userId } }),
      prisma.savedJob.count({ where: { userId, status: "APPLIED" } }),
    ]);

    return { success: true, unreadAlerts, savedCount, appliedCount };
  } catch (error) {
    console.error("Job Summary Error:", error);
    return { success: false, unreadAlerts: 0, savedCount: 0, appliedCount: 0 };
  }
}
