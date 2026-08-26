"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acknowledgeAlert,
  broadcastCampusAlert,
  getEmergencyData,
  raiseSosRequest,
  resolveCampusAlert,
  resolveSosRequest,
} from "@/app/actions/emergency";
import type { AlertData, ContactData, SosData } from "@/app/actions/emergency";

/**
 * Module 3 · Emergency Contact & Campus Alert System
 *
 * One-tap calling, SOS logging, campus-wide alerts, and an "I'm safe" check-in.
 * No external API needed — everything runs from our own database.
 * Opens the phone's dialer via `tel:` links, so calls go through directly on mobile.
 */

const SOS_TYPES = [
  { value: "MEDICAL", label: "Medical", emoji: "🚑" },
  { value: "SECURITY", label: "Security", emoji: "🚨" },
  { value: "FIRE", label: "Fire", emoji: "🔥" },
  { value: "HARASSMENT", label: "Harassment", emoji: "🛑" },
  { value: "OTHER", label: "Other", emoji: "❗" },
];

const CATEGORY_LABELS: Record<string, string> = {
  NATIONAL: "National Service",
  SECURITY: "Security",
  MEDICAL: "Medical",
  FIRE: "Fire Service",
  WARDEN: "Floor Warden",
  COUNSELLING: "Counselling",
  TRANSPORT: "Transport",
};

const ALERT_CATEGORIES = [
  { value: "FIRE", label: "Fire" },
  { value: "MEDICAL", label: "Medical" },
  { value: "SECURITY", label: "Security" },
  { value: "WEATHER", label: "Weather" },
  { value: "UTILITY", label: "Electricity/Water" },
  { value: "OTHER", label: "Other" },
];

function severityStyle(severity: string) {
  if (severity === "CRITICAL") {
    return {
      wrap: "bg-red-50 border-red-200",
      chip: "bg-red-600 text-white",
      label: "Critical",
    };
  }
  if (severity === "WARNING") {
    return {
      wrap: "bg-amber-50 border-amber-200",
      chip: "bg-amber-500 text-white",
      label: "Warning",
    };
  }
  return { wrap: "bg-sky-50 border-sky-200", chip: "bg-sky-600 text-white", label: "Info" };
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString("en-US");
}

export default function EmergencyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [mySos, setMySos] = useState<SosData[]>([]);

  const [showSosForm, setShowSosForm] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const [sosDraft, setSosDraft] = useState({
    type: "SECURITY",
    location: "",
    note: "",
  });

  const [alertDraft, setAlertDraft] = useState({
    title: "",
    message: "",
    severity: "WARNING",
    category: "SECURITY",
    location: "",
  });

  const loadData = useCallback(async () => {
    const res = await getEmergencyData();
    if (res.authRequired) {
      router.push("/login");
      return;
    }
    if (!res.success) {
      setStatus(res.message);
      setLoading(false);
      return;
    }
    setContacts(res.contacts);
    setAlerts(res.alerts);
    setMySos(res.mySosRequests);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
    // Refresh every 20 seconds so alerts show up quickly
    const timer = setInterval(loadData, 20_000);
    return () => clearInterval(timer);
  }, [loadData]);

  const nationalContacts = useMemo(
    () => contacts.filter((c) => c.isNational),
    [contacts],
  );
  const campusContacts = useMemo(
    () => contacts.filter((c) => !c.isNational),
    [contacts],
  );
  const activeAlerts = useMemo(() => alerts.filter((a) => a.isActive), [alerts]);
  const openSos = useMemo(() => mySos.filter((s) => s.status !== "RESOLVED"), [mySos]);

  const handleSos = async () => {
    setStatus("Logging SOS…");
    const res = await raiseSosRequest(sosDraft);
    setStatus(res.message);
    if (res.success) {
      setSosDraft({ type: "SECURITY", location: "", note: "" });
      setShowSosForm(false);
      await loadData();
    }
  };

  const handleBroadcast = async () => {
    setStatus("Sending alert…");
    const res = await broadcastCampusAlert(alertDraft);
    setStatus(res.message);
    if (res.success) {
      setAlertDraft({
        title: "",
        message: "",
        severity: "WARNING",
        category: "SECURITY",
        location: "",
      });
      setShowBroadcast(false);
      await loadData();
    }
  };

  const handleAck = async (alertId: string, isSafe: boolean) => {
    const res = await acknowledgeAlert(alertId, isSafe);
    setStatus(res.message);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-red-600 animate-ping" />
          <p className="text-gray-500 font-bold text-sm">Loading emergency info…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Emergency Assistance & Campus Alerts
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Call in one tap, log incidents, and view campus safety alerts.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/emergency/admin"
              className="bg-red-50 text-red-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-100 transition"
            >
              🛡️ SOS Admin View
            </Link>
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

        {/* 999 — the biggest button, front and center */}
        <div className="bg-red-600 rounded-3xl p-6 lg:p-8 shadow-lg text-white">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-red-200">
                National Emergency Service
              </p>
              <h2 className="text-2xl font-black mt-1">Police · Fire Service · Ambulance</h2>
              <p className="text-sm font-medium text-red-100 mt-2 max-w-xl">
                Call 999 directly for a life-threatening emergency or a crime in progress. It&apos;s
                free and available 24 hours a day across Bangladesh.
              </p>
            </div>

            <a
              href="tel:999"
              className="bg-white text-red-600 font-black text-3xl px-12 py-6 rounded-2xl shadow-md hover:bg-red-50 transition shrink-0"
            >
              Call 999
            </a>
          </div>

          <div className="mt-6 pt-5 border-t border-red-500/40 flex flex-wrap gap-3">
            <button
              onClick={() => setShowSosForm((open) => !open)}
              className="bg-red-800/60 hover:bg-red-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
            >
              {showSosForm ? "Cancel" : "Send SOS to Campus"}
            </button>
            <button
              onClick={() => setShowBroadcast((open) => !open)}
              className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
            >
              {showBroadcast ? "Cancel" : "Broadcast Campus Alert"}
            </button>
          </div>
        </div>

        {/* SOS form */}
        {showSosForm && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border-2 border-red-100 shadow-sm space-y-5">
            <div>
              <h2 className="font-extrabold text-gray-900 text-lg">Campus SOS</h2>
              <p className="text-xs text-gray-500 mt-1">
                This logs the incident for the Proctor&apos;s Office. In immediate danger, call
                999 first, then fill this out.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                What kind of help do you need
              </p>
              <div className="flex flex-wrap gap-2">
                {SOS_TYPES.map((type) => {
                  const active = sosDraft.type === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSosDraft({ ...sosDraft, type: type.value })}
                      className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
                        active
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {type.emoji} {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Where are you right now
              </label>
              <input
                value={sosDraft.location}
                onChange={(e) => setSosDraft({ ...sosDraft, location: e.target.value })}
                placeholder="e.g., Academic Building, 6th Floor, Room 602"
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Briefly, what happened (optional)
              </label>
              <textarea
                value={sosDraft.note}
                onChange={(e) => setSosDraft({ ...sosDraft, note: e.target.value })}
                rows={3}
                placeholder="Share as much as you can…"
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
              />
            </div>

            {status && (
              <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                {status}
              </p>
            )}

            <button
              onClick={handleSos}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md transition"
            >
              Send SOS
            </button>
          </div>
        )}

        {/* Broadcast form */}
        {showBroadcast && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm space-y-5">
            <div>
              <h2 className="font-extrabold text-gray-900 text-lg">Send Campus Alert</h2>
              <p className="text-xs text-gray-500 mt-1">
                This will be visible on every student&apos;s screen. Use it only for real
                incidents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Title
                </label>
                <input
                  value={alertDraft.title}
                  onChange={(e) => setAlertDraft({ ...alertDraft, title: e.target.value })}
                  placeholder="e.g., Fire drill at the Library Building"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Location
                </label>
                <input
                  value={alertDraft.location}
                  onChange={(e) => setAlertDraft({ ...alertDraft, location: e.target.value })}
                  placeholder="e.g., Library Building, 2nd Floor"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Message
              </label>
              <textarea
                value={alertDraft.message}
                onChange={(e) => setAlertDraft({ ...alertDraft, message: e.target.value })}
                rows={3}
                placeholder="What happened and what students should do…"
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Severity
                </p>
                <div className="flex gap-2">
                  {[
                    { value: "INFO", label: "Info" },
                    { value: "WARNING", label: "Warning" },
                    { value: "CRITICAL", label: "Critical" },
                  ].map((level) => {
                    const active = alertDraft.severity === level.value;
                    return (
                      <button
                        key={level.value}
                        onClick={() => setAlertDraft({ ...alertDraft, severity: level.value })}
                        className={`flex-1 text-xs font-bold px-3 py-2.5 rounded-xl border transition ${
                          active
                            ? "bg-[#0f172a] text-white border-[#0f172a]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {level.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Category
                </label>
                <select
                  value={alertDraft.category}
                  onChange={(e) => setAlertDraft({ ...alertDraft, category: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ALERT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {status && (
              <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                {status}
              </p>
            )}

            <button
              onClick={handleBroadcast}
              className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md transition"
            >
              Broadcast Alert
            </button>
          </div>
        )}

        {/* Active alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-900 text-base">Active Alerts</h2>
            {activeAlerts.map((alert) => {
              const style = severityStyle(alert.severity);
              return (
                <div key={alert.id} className={`rounded-3xl border-2 p-6 ${style.wrap}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded ${style.chip}`}>
                      {style.label}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">
                      {timeAgo(alert.createdAt)} · {alert.raisedByName}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900">{alert.title}</h3>
                  {alert.location && (
                    <p className="text-xs font-bold text-gray-500 mt-0.5">📍 {alert.location}</p>
                  )}
                  <p className="text-sm text-gray-700 font-medium mt-2 leading-relaxed whitespace-pre-line">
                    {alert.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <button
                      onClick={() => handleAck(alert.id, true)}
                      className={`font-bold text-xs px-5 py-2.5 rounded-xl transition ${
                        alert.myAck?.isSafe
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      ✓ I&apos;m Safe
                    </button>
                    <button
                      onClick={() => handleAck(alert.id, false)}
                      className={`font-bold text-xs px-5 py-2.5 rounded-xl transition ${
                        alert.myAck && !alert.myAck.isSafe
                          ? "bg-red-600 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      ✗ I Need Help
                    </button>

                    <span className="text-xs font-bold text-gray-500">
                      {alert.safeCount} safe · {alert.needHelpCount} need help
                    </span>

                    {alert.isMine && (
                      <button
                        onClick={async () => {
                          const res = await resolveCampusAlert(alert.id);
                          setStatus(res.message);
                          await loadData();
                        }}
                        className="ml-auto text-xs font-bold text-gray-400 hover:text-gray-700"
                      >
                        Close Alert
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* National numbers */}
        <div>
          <h2 className="font-bold text-gray-900 text-base mb-1">National Emergency Numbers</h2>
          <p className="text-xs text-gray-400 mb-4">
            Government services in Bangladesh — free from anywhere in the country.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nationalContacts.map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.phone}`}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition group"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-gray-900 text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{contact.role}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded shrink-0">
                    {CATEGORY_LABELS[contact.category] ?? contact.category}
                  </span>
                </div>
                <p className="text-2xl font-black text-red-600 mt-3 group-hover:text-red-700">
                  {contact.phone}
                </p>
                <p className="text-[11px] font-bold text-gray-400 mt-1">Tap to call</p>
              </a>
            ))}
          </div>
        </div>

        {/* Campus numbers */}
        <div>
          <h2 className="font-bold text-gray-900 text-base mb-1">Campus Numbers</h2>
          <p className="text-xs text-gray-400 mb-4">
            Security, medical center, floor wardens, and counselling.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campusContacts.map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.phone}`}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-gray-900 text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{contact.role}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded shrink-0">
                    {CATEGORY_LABELS[contact.category] ?? contact.category}
                  </span>
                </div>
                {(contact.building || contact.floor) && (
                  <p className="text-[11px] font-bold text-gray-400 mt-2">
                    📍 {[contact.building, contact.floor].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-lg font-black text-[#0f172a] mt-3">{contact.phone}</p>
              </a>
            ))}
          </div>
        </div>

        {/* My SOS */}
        {openSos.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-900 text-base mb-4">My Active SOS Requests</h2>
            <div className="space-y-3">
              {openSos.map((sos) => (
                <div
                  key={sos.id}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-red-50/50 border border-red-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {SOS_TYPES.find((t) => t.value === sos.type)?.label ?? sos.type} · {sos.location}
                    </p>
                    {sos.note && (
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{sos.note}</p>
                    )}
                    <p className="text-[11px] font-bold text-gray-400 mt-1">
                      {timeAgo(sos.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await resolveSosRequest(sos.id);
                      setStatus(res.message);
                      await loadData();
                    }}
                    className="text-xs font-bold text-emerald-600 hover:underline shrink-0"
                  >
                    Resolved
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="pt-8 border-t border-gray-200/60 text-center text-xs font-semibold text-gray-400">
          This app is not a substitute for emergency services. In a real emergency, call 999 first.
        </footer>
      </div>
    </div>
  );
}
