"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllSosRequests, updateSosStatus } from "@/app/actions/emergency";
import type { SosAdminData } from "@/app/actions/emergency";

/**
 * Campus-wide SOS log for whoever is monitoring incidents (e.g. Proctor's Office).
 * There's no staff/role system in this app yet, so this view is open to any
 * logged-in user, same as campus alerts already are.
 */

const SOS_TYPES = [
  { value: "MEDICAL", label: "Medical", emoji: "🚑" },
  { value: "SECURITY", label: "Security", emoji: "🚨" },
  { value: "FIRE", label: "Fire", emoji: "🔥" },
  { value: "HARASSMENT", label: "Harassment", emoji: "🛑" },
  { value: "OTHER", label: "Other", emoji: "❗" },
];

function statusStyle(status: string) {
  if (status === "OPEN") return { wrap: "bg-red-50 border-red-200", chip: "bg-red-600 text-white" };
  if (status === "ACKNOWLEDGED") return { wrap: "bg-amber-50 border-amber-200", chip: "bg-amber-500 text-white" };
  return { wrap: "bg-emerald-50 border-emerald-200", chip: "bg-emerald-600 text-white" };
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString("en-US");
}

export default function SosAdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [requests, setRequests] = useState<SosAdminData[]>([]);

  const loadData = useCallback(async () => {
    const res = await getAllSosRequests();
    if (res.authRequired) {
      router.push("/login");
      return;
    }
    if (!res.success) {
      setStatus(res.message);
      setLoading(false);
      return;
    }
    setRequests(res.requests);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 20_000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleUpdate = async (sosId: string, next: "ACKNOWLEDGED" | "RESOLVED") => {
    const res = await updateSosStatus(sosId, next);
    setStatus(res.message);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <p className="text-gray-500 font-bold text-sm">Loading SOS log…</p>
      </div>
    );
  }

  const openCount = requests.filter((r) => r.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Campus SOS Log</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Every SOS request raised campus-wide, newest first. Refreshes automatically every 20 seconds.
            </p>
          </div>
          <Link
            href="/emergency"
            className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition"
          >
            ← Emergency Center
          </Link>
        </div>

        {status && (
          <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            {status}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Open", value: openCount, tone: "text-red-600" },
            { label: "Acknowledged", value: requests.filter((r) => r.status === "ACKNOWLEDGED").length, tone: "text-amber-500" },
            { label: "Resolved", value: requests.filter((r) => r.status === "RESOLVED").length, tone: "text-emerald-600" },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
              <p className={`text-2xl font-black mt-1 ${m.tone}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
            <p className="text-sm font-semibold text-gray-400">No SOS requests logged yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((sos) => {
              const style = statusStyle(sos.status);
              const type = SOS_TYPES.find((t) => t.value === sos.type);
              return (
                <div key={sos.id} className={`rounded-2xl p-5 border ${style.wrap}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${style.chip}`}>
                          {sos.status}
                        </span>
                        <span className="font-extrabold text-gray-900 text-sm">
                          {type?.emoji ?? "❗"} {type?.label ?? sos.type}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">{timeAgo(sos.createdAt)}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 mt-2">
                        {sos.requesterName}{" "}
                        <span className="text-xs font-semibold text-gray-400">· {sos.requesterDepartment}</span>
                      </p>
                      <p className="text-xs text-gray-600 font-medium mt-1">📍 {sos.location}</p>
                      {sos.note && <p className="text-xs text-gray-500 mt-1 max-w-xl">{sos.note}</p>}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {sos.status === "OPEN" && (
                        <button
                          onClick={() => handleUpdate(sos.id, "ACKNOWLEDGED")}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                        >
                          Acknowledge
                        </button>
                      )}
                      {sos.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleUpdate(sos.id, "RESOLVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                        >
                          Resolve
                        </button>
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
