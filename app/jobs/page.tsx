"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getJobsData,
  markAllAlertsRead,
  markAlertRead,
  refreshJobFeed,
  saveJobPreference,
  toggleSaveJob,
  updateApplicationStatus,
} from "@/app/actions/jobs";
import type {
  AlertData,
  ApplicationStatus,
  JobCardData,
  JobFilters,
  PreferenceData,
} from "@/app/actions/jobs";

const JOB_TYPES = [
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
];

const CATEGORIES = [
  { value: "ALL", label: "All fields" },
  { value: "SOFTWARE", label: "Software" },
  { value: "DATA", label: "Data & AI" },
  { value: "HARDWARE", label: "Hardware & Electronics" },
  { value: "BUSINESS", label: "Business" },
  { value: "FINANCE", label: "Finance" },
  { value: "MARKETING", label: "Marketing" },
  { value: "GENERAL", label: "General" },
];

const SOURCES = [
  { value: "ALL", label: "All sources" },
  { value: "LINKEDIN", label: "Google Jobs (LinkedIn, Indeed, etc.)" },
  { value: "BDJOBS", label: "BDJobs" },
  { value: "CURATED", label: "Sample data" },
];

const STATUSES: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

const EMPTY_PIPELINE = {
  SAVED: 0,
  APPLIED: 0,
  INTERVIEW: 0,
  OFFER: 0,
  REJECTED: 0,
};

function scoreStyles(score: number) {
  if (score >= 80) {
    return { ring: "#059669", chip: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Excellent match" };
  }
  if (score >= 65) {
    return { ring: "#4f46e5", chip: "bg-indigo-50 text-indigo-700 border-indigo-100", label: "Strong match" };
  }
  if (score >= 45) {
    return { ring: "#d97706", chip: "bg-amber-50 text-amber-700 border-amber-100", label: "Fair match" };
  }
  return { ring: "#94a3b8", chip: "bg-gray-100 text-gray-600 border-gray-200", label: "Weak match" };
}

function sourceBadge(source: string) {
  if (source === "LINKEDIN") return { label: "Google Jobs", className: "bg-[#0a66c2]/10 text-[#0a66c2]" };
  return { label: "BDJobs", className: "bg-emerald-50 text-emerald-700" };
}
function relativeDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MatchRing({ score }: { score: number }) {
  const { ring } = scoreStyles(score);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={ring}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-900">
        {score}
      </span>
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState("");
  const [syncNotes, setSyncNotes] = useState<{ source: string; ok: boolean; note: string }[]>([]);

  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [pipeline, setPipeline] = useState(EMPTY_PIPELINE);
  const [preference, setPreference] = useState<PreferenceData | null>(null);

  const [showPreferences, setShowPreferences] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const [filters, setFilters] = useState<JobFilters>({
    search: "",
    jobType: "ALL",
    category: "ALL",
    source: "ALL",
    minScore: 0,
    sortBy: "MATCH",
  });

  // Draft copy of preferences so typing doesn't fire a save on every keystroke.
  const [draft, setDraft] = useState({
    keywords: "",
    skills: "",
    preferredLocations: "",
    jobTypes: ["INTERNSHIP"] as string[],
    minMatchScore: 50,
    alertsEnabled: true,
  });

  const loadData = useCallback(
    async (activeFilters: JobFilters) => {
      const res = await getJobsData(activeFilters);

      if (res.authRequired) {
        router.push("/login");
        return;
      }

      if (!res.success) {
        setStatus(res.message);
        setLoading(false);
        return;
      }

      setJobs(res.jobs);
      setAlerts(res.alerts);
      setUnreadAlerts(res.unreadAlerts);
      setPipeline(res.pipeline);
      setPreference(res.preference);
      setDraft({
        keywords: res.preference.keywords.join(", "),
        skills: res.preference.skills.join(", "),
        preferredLocations: res.preference.preferredLocations.join(", "),
        jobTypes: res.preference.jobTypes,
        minMatchScore: res.preference.minMatchScore,
        alertsEnabled: res.preference.alertsEnabled,
      });
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    const timer = setTimeout(() => loadData(filters), 250);
    return () => clearTimeout(timer);
  }, [filters, loadData]);

  const handleRefresh = async () => {
    setSyncing(true);
    setStatus("Fetching listings from LinkedIn and BDJobs…");
    const res = await refreshJobFeed();
    setStatus(res.message);
    setSyncNotes(res.notes ?? []);
    await loadData(filters);
    setSyncing(false);
  };

  const handleSavePreferences = async () => {
    setStatus("Saving preferences…");
    const res = await saveJobPreference({
      keywords: draft.keywords.split(","),
      skills: draft.skills.split(","),
      preferredLocations: draft.preferredLocations.split(","),
      jobTypes: draft.jobTypes,
      minMatchScore: draft.minMatchScore,
      alertsEnabled: draft.alertsEnabled,
    });
    setStatus(res.message);
    await loadData(filters);
  };

  const handleToggleSave = async (jobId: string) => {
    const res = await toggleSaveJob(jobId);
    setStatus(res.message);
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId ? { ...job, savedStatus: res.saved ? "SAVED" : null } : job,
      ),
    );
    await loadData(filters);
  };

  const handleStatusChange = async (jobId: string, next: ApplicationStatus) => {
    const res = await updateApplicationStatus(jobId, next);
    setStatus(res.message);
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, savedStatus: next } : job)),
    );
    await loadData(filters);
  };

  const handleReadAlert = async (alertId: string) => {
    await markAlertRead(alertId);
    setAlerts((current) =>
      current.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)),
    );
    setUnreadAlerts((count) => Math.max(0, count - 1));
  };

  const handleReadAllAlerts = async () => {
    await markAllAlertsRead();
    setAlerts((current) => current.map((alert) => ({ ...alert, isRead: true })));
    setUnreadAlerts(0);
  };

  const topMatchScore = useMemo(
    () => (jobs.length ? Math.max(...jobs.map((job) => job.matchScore)) : 0),
    [jobs],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-ping" />
          <p className="text-gray-500 font-bold text-sm">Loading your job matches…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Career Matchmaker
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
  Internships and graduate roles aggregated from Google Jobs (covering LinkedIn,
  Indeed, Glassdoor and more) and BDJobs, scored against your department,
  semester and CGPA.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={syncing}
              className="bg-[#0f172a] hover:bg-gray-800 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              {syncing ? "Fetching…" : "Refresh listings"}
            </button>
            <button
              onClick={() => setShowPreferences((open) => !open)}
              className="bg-white border border-gray-200 hover:border-gray-300 text-gray-800 font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
            >
              {showPreferences ? "Hide preferences" : "Edit preferences"}
            </button>
            <Link
              href="/dashboard"
              className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {status && (
          <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            {status}
          </p>
        )}

        {syncNotes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Source report
            </p>
            {syncNotes.map((note) => (
              <div key={note.source} className="flex items-start gap-2 text-xs font-semibold">
                <span
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${note.ok ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <span className="text-gray-600">
                  <strong className="text-gray-900">{note.source}</strong> — {note.note}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Matched roles", value: jobs.length, tone: "text-gray-900" },
            { label: "Best match", value: `${topMatchScore}%`, tone: "text-indigo-600" },
            { label: "Unread alerts", value: unreadAlerts, tone: "text-amber-500" },
            { label: "Applications sent", value: pipeline.APPLIED, tone: "text-emerald-600" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
            >
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {metric.label}
              </p>
              <p className={`text-2xl font-black mt-1 ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Preferences */}
        {showPreferences && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm space-y-5">
            <div>
              <h2 className="font-extrabold text-gray-900 text-lg">What should we look for?</h2>
              <p className="text-xs text-gray-400 mt-1">
                These terms drive both the search sent to LinkedIn and BDJobs, and the score on
                every card. Separate entries with commas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Search terms
                </label>
                <input
                  value={draft.keywords}
                  onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
                  placeholder="software intern, trainee engineer"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Your skills
                </label>
                <input
                  value={draft.skills}
                  onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
                  placeholder="React, Python, SQL"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Preferred locations
                </label>
                <input
                  value={draft.preferredLocations}
                  onChange={(e) => setDraft({ ...draft, preferredLocations: e.target.value })}
                  placeholder="Dhaka, Remote"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Role types
                </p>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => {
                    const active = draft.jobTypes.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            jobTypes: active
                              ? draft.jobTypes.filter((t) => t !== type.value)
                              : [...draft.jobTypes, type.value],
                          })
                        }
                        className={`text-xs font-bold px-4 py-2 rounded-xl border transition ${
                          active
                            ? "bg-[#0f172a] text-white border-[#0f172a]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Alert me above {draft.minMatchScore}% match
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={draft.minMatchScore}
                  onChange={(e) =>
                    setDraft({ ...draft, minMatchScore: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
                <label className="flex items-center gap-2 mt-3 text-xs font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={draft.alertsEnabled}
                    onChange={(e) => setDraft({ ...draft, alertsEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Raise an alert when a new listing clears that score
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSavePreferences}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                Save preferences
              </button>
              {preference?.lastSyncedAt && (
                <span className="text-xs font-semibold text-gray-400">
                  Last synced {relativeDate(preference.lastSyncedAt)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Alerts */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900 text-base">
                Alerts{" "}
                {unreadAlerts > 0 && (
                  <span className="ml-2 bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {unreadAlerts} new
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Raised automatically when a new listing clears your match threshold.
              </p>
            </div>
            <div className="flex gap-3">
              {unreadAlerts > 0 && (
                <button
                  onClick={handleReadAllAlerts}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowAlerts((open) => !open)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                {showAlerts ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showAlerts && (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-gray-400">No alerts yet.</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Refresh the listings to score new posts against your profile.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 flex items-start gap-4 ${alert.isRead ? "bg-white" : "bg-amber-50/40"}`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${alert.isRead ? "bg-gray-200" : "bg-amber-500"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {alert.jobTitle}{" "}
                        <span className="text-gray-400 font-semibold">· {alert.company}</span>
                      </p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{alert.reason}</p>
                      <p className="text-[11px] text-gray-300 font-semibold mt-1">
                        {relativeDate(alert.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs font-black text-indigo-600 shrink-0">
                      {alert.matchScore}%
                    </span>
                    {!alert.isRead && (
                      <button
                        onClick={() => handleReadAlert(alert.id)}
                        className="text-[11px] font-bold text-gray-400 hover:text-gray-700 shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={filters.search ?? ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search title, company or description"
            className="md:col-span-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filters.jobType}
            onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All role types</option>
            {JOB_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters({ ...filters, sortBy: e.target.value as JobFilters["sortBy"] })
            }
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="MATCH">Best match first</option>
            <option value="RECENT">Newest first</option>
            <option value="DEADLINE">Closing soonest</option>
          </select>

          <div className="md:col-span-5 flex flex-wrap items-center gap-4 pt-1">
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 text-xs font-bold text-gray-500">
              Minimum match {filters.minScore}%
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
                className="w-40 accent-indigo-600"
              />
            </label>
          </div>
        </div>

        {/* Job list */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
            <p className="text-sm font-semibold text-gray-400">No listings match these filters.</p>
            <p className="text-xs text-gray-300 mt-1">
              Widen the filters, or press Refresh listings to pull a fresh batch.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const styles = scoreStyles(job.matchScore);
              const badge = sourceBadge(job.source);
              const expanded = expandedJobId === job.id;

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex flex-col lg:flex-row gap-5">
                    <MatchRing score={job.matchScore} />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles.chip}`}
                        >
                          {styles.label}
                        </span>
                        {job.isRemote && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                            Remote
                          </span>
                        )}
                        {job.daysLeft !== null && job.daysLeft <= 5 && job.daysLeft >= 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600">
                            Closes in {job.daysLeft} day{job.daysLeft === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold text-gray-900">{job.title}</h3>
                      <p className="text-sm font-semibold text-gray-500">
                        {job.company} · {job.location}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                          {JOB_TYPES.find((t) => t.value === job.jobType)?.label ?? job.jobType}
                        </span>
                        {job.salaryText && (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">
                            {job.salaryText}
                          </span>
                        )}
                        {job.minCgpa !== null && (
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                            Needs CGPA {job.minCgpa.toFixed(2)}
                          </span>
                        )}
                        <span className="bg-gray-50 text-gray-400 px-2.5 py-1 rounded-lg">
                          Posted {relativeDate(job.postedAt)}
                        </span>
                      </div>

                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.skills.slice(0, 8).map((skill) => (
                            <span
                              key={skill}
                              className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {job.matchReasons.length > 0 && (
                        <ul className="mt-4 space-y-1">
                          {job.matchReasons.slice(0, expanded ? 8 : 2).map((reason) => (
                            <li
                              key={reason}
                              className="text-xs font-semibold text-emerald-700 flex gap-2"
                            >
                              <span aria-hidden="true">✓</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}

                      {expanded && (
                        <>
                          {job.matchGaps.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {job.matchGaps.map((gap) => (
                                <li
                                  key={gap}
                                  className="text-xs font-semibold text-amber-600 flex gap-2"
                                >
                                  <span aria-hidden="true">!</span>
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-4 text-xs text-gray-500 font-medium leading-relaxed whitespace-pre-line">
                            {job.description}
                          </p>
                        </>
                      )}

                      <button
                        onClick={() => setExpandedJobId(expanded ? null : job.id)}
                        className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        {expanded ? "Show less" : "Why this match?"}
                      </button>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 lg:w-44 shrink-0">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-[#0f172a] hover:bg-gray-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
                      >
                        Open listing
                      </a>
                      <button
                        onClick={() => handleToggleSave(job.id)}
                        className={`flex-1 font-bold text-xs px-4 py-2.5 rounded-xl border transition ${
                          job.savedStatus
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {job.savedStatus ? "Saved" : "Save"}
                      </button>
                      {job.savedStatus && (
                        <select
                          value={job.savedStatus}
                          onChange={(e) =>
                            handleStatusChange(job.id, e.target.value as ApplicationStatus)
                          }
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {value.charAt(0) + value.slice(1).toLowerCase()}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        
      </div>
    </div>
  );
}
