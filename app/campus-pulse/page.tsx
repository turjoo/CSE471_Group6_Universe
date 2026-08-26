"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cancelCampusEvent,
  closeHangout,
  createCampusEvent,
  createHangout,
  getCampusPulseData,
  getHangoutThread,
  rsvpToEvent,
  sendHangoutMessage,
  toggleJoinHangout,
} from "@/app/actions/campus-pulse";
import type {
  ChatMessageData,
  EventCardData,
  HangoutCardData,
  PulseFilters,
} from "@/app/actions/campus-pulse";

const EVENT_CATEGORIES = [
  { value: "WORKSHOP", label: "Workshop", emoji: "🛠️" },
  { value: "SEMINAR", label: "Seminar", emoji: "🎓" },
  { value: "TOURNAMENT", label: "Tournament", emoji: "🏆" },
  { value: "CULTURAL", label: "Cultural", emoji: "🎭" },
  { value: "CAREER", label: "Career", emoji: "💼" },
  { value: "SOCIAL", label: "Social", emoji: "🎉" },
];

const ACTIVITIES = [
  { value: "CARROM", label: "Carrom", emoji: "🎯" },
  { value: "LUNCH", label: "Lunch", emoji: "🍛" },
  { value: "TEA", label: "Tea Break", emoji: "☕" },
  { value: "CRICKET", label: "Cricket", emoji: "🏏" },
  { value: "FUTSAL", label: "Futsal", emoji: "⚽" },
  { value: "BADMINTON", label: "Badminton", emoji: "🏸" },
  { value: "TABLE_TENNIS", label: "Table Tennis", emoji: "🏓" },
  { value: "CHESS", label: "Chess", emoji: "♟️" },
  { value: "STUDY", label: "Study Together", emoji: "📚" },
  { value: "OTHER", label: "Other", emoji: "✨" },
];

function activityMeta(value: string) {
  return ACTIVITIES.find((a) => a.value === value) ?? ACTIVITIES[ACTIVITIES.length - 1];
}

function categoryMeta(value: string) {
  return EVENT_CATEGORIES.find((c) => c.value === value) ?? EVENT_CATEGORIES[1];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CampusPulsePage() {
  const router = useRouter();

  const [tab, setTab] = useState<"EVENTS" | "HANGOUTS">("EVENTS");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [events, setEvents] = useState<EventCardData[]>([]);
  const [hangouts, setHangouts] = useState<HangoutCardData[]>([]);
  const [myEventCount, setMyEventCount] = useState(0);
  const [myHangoutCount, setMyHangoutCount] = useState(0);

  const [filters, setFilters] = useState<PulseFilters>({
    category: "ALL",
    search: "",
    showPastEvents: false,
    activity: "ALL",
  });

  const [showEventForm, setShowEventForm] = useState(false);
  const [showHangoutForm, setShowHangoutForm] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [chatOpenId, setChatOpenId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatError, setChatError] = useState("");

  const [eventDraft, setEventDraft] = useState({
    title: "",
    description: "",
    category: "SEMINAR",
    clubName: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    feeTaka: "0",
    contactInfo: "",
  });

  const [hangoutDraft, setHangoutDraft] = useState({
    activity: "CARROM",
    title: "",
    note: "",
    location: "",
    spotsNeeded: 1,
    minutesFromNow: 15,
    validForMinutes: 120,
  });

  const loadData = useCallback(
    async (active: PulseFilters) => {
      const res = await getCampusPulseData(active);

      if (res.authRequired) {
        router.push("/login");
        return;
      }

      if (!res.success) {
        setStatus(res.message);
        setLoading(false);
        return;
      }

      setEvents(res.events);
      setHangouts(res.hangouts);
      setMyEventCount(res.myEventCount);
      setMyHangoutCount(res.myHangoutCount);
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    const timer = setTimeout(() => loadData(filters), 250);
    return () => clearTimeout(timer);
  }, [filters, loadData]);

  // Refresh every 30 seconds to keep the hangout feed live
  useEffect(() => {
    if (tab !== "HANGOUTS") return;
    const interval = setInterval(() => loadData(filters), 30_000);
    return () => clearInterval(interval);
  }, [tab, filters, loadData]);

  const handleCreateEvent = async () => {
    setStatus("Posting event…");
    const res = await createCampusEvent({
      ...eventDraft,
      capacity: eventDraft.capacity ? Number(eventDraft.capacity) : null,
      feeTaka: Number(eventDraft.feeTaka) || 0,
    });
    setStatus(res.message);
    if (res.success) {
      setShowEventForm(false);
      setEventDraft({
        title: "",
        description: "",
        category: "SEMINAR",
        clubName: "",
        venue: "",
        startsAt: "",
        endsAt: "",
        capacity: "",
        feeTaka: "0",
        contactInfo: "",
      });
      await loadData(filters);
    }
  };

  const handleRsvp = async (eventId: string, next: "GOING" | "INTERESTED") => {
    const res = await rsvpToEvent(eventId, next);
    setStatus(res.message);
    await loadData(filters);
  };

  const handleCancelEvent = async (eventId: string) => {
    const res = await cancelCampusEvent(eventId);
    setStatus(res.message);
    await loadData(filters);
  };

  const handleCreateHangout = async () => {
    setStatus("Broadcasting…");
    const res = await createHangout(hangoutDraft);
    setStatus(res.message);
    if (res.success) {
      setShowHangoutForm(false);
      setHangoutDraft({ ...hangoutDraft, title: "", note: "", location: "" });
      await loadData(filters);
    }
  };

  const handleJoin = async (broadcastId: string) => {
    const res = await toggleJoinHangout(broadcastId);
    setStatus(res.message);
    await loadData(filters);
  };

  const handleCloseHangout = async (broadcastId: string) => {
    const res = await closeHangout(broadcastId);
    setStatus(res.message);
    if (chatOpenId === broadcastId) setChatOpenId(null);
    await loadData(filters);
  };

  const openChat = async (broadcastId: string) => {
    if (chatOpenId === broadcastId) {
      setChatOpenId(null);
      return;
    }
    setChatOpenId(broadcastId);
    setChatError("");
    const res = await getHangoutThread(broadcastId);
    if (res.success) {
      setChatMessages(res.messages);
    } else {
      setChatMessages([]);
      setChatError(res.message);
    }
  };

  const handleSendMessage = async (broadcastId: string) => {
    if (!chatDraft.trim()) return;
    const res = await sendHangoutMessage(broadcastId, chatDraft);
    if (res.success) {
      setChatDraft("");
      const thread = await getHangoutThread(broadcastId);
      if (thread.success) setChatMessages(thread.messages);
    } else {
      setChatError(res.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-ping" />
          <p className="text-gray-500 font-bold text-sm">Loading Campus Pulse…</p>
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
              Campus Pulse
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Official club events and live hangouts for your free time — all on one board.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition"
          >
            ← Dashboard
          </Link>
        </div>

        {status && (
          <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            {status}
          </p>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Upcoming Events", value: events.filter((e) => !e.isCancelled).length, tone: "text-gray-900" },
            { label: "Live Hangouts", value: hangouts.filter((h) => h.status === "OPEN").length, tone: "text-emerald-600" },
            { label: "I'm Going", value: myEventCount, tone: "text-indigo-600" },
            { label: "Joined Hangouts", value: myHangoutCount, tone: "text-amber-500" },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
              <p className={`text-2xl font-black mt-1 ${m.tone}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
          <button
            onClick={() => setTab("EVENTS")}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl transition ${
              tab === "EVENTS" ? "bg-[#0f172a] text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            📅 Event Calendar
          </button>
          <button
            onClick={() => setTab("HANGOUTS")}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl transition ${
              tab === "HANGOUTS" ? "bg-[#0f172a] text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            📡 Hangout Broadcast
            {hangouts.filter((h) => h.status === "OPEN").length > 0 && (
              <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">
                {hangouts.filter((h) => h.status === "OPEN").length}
              </span>
            )}
          </button>
        </div>

        {/* ================= EVENTS TAB ================= */}
        {tab === "EVENTS" && (
          <>
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  value={filters.search ?? ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search event, club or venue"
                  className="md:col-span-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Categories</option>
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowEventForm((v) => !v)}
                  className="bg-[#0f172a] hover:bg-gray-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  {showEventForm ? "Close Form" : "+ Post Event"}
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <input
                  type="checkbox"
                  checked={filters.showPastEvents ?? false}
                  onChange={(e) => setFilters({ ...filters, showPastEvents: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Show past events too
              </label>
            </div>

            {showEventForm && (
              <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm space-y-5">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-lg">New Event</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Club executives can post workshops, tournaments, or seminars here.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Event Title
                    </label>
                    <input
                      value={eventDraft.title}
                      onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                      placeholder="Intra-University Programming Contest 2026"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Club / Department
                    </label>
                    <input
                      value={eventDraft.clubName}
                      onChange={(e) => setEventDraft({ ...eventDraft, clubName: e.target.value })}
                      placeholder="BRACU Computer Club (BUCC)"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Category
                    </label>
                    <select
                      value={eventDraft.category}
                      onChange={(e) => setEventDraft({ ...eventDraft, category: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {EVENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.emoji} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Venue
                    </label>
                    <input
                      value={eventDraft.venue}
                      onChange={(e) => setEventDraft({ ...eventDraft, venue: e.target.value })}
                      placeholder="Multipurpose Hall, 8th Floor"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Starts
                    </label>
                    <input
                      type="datetime-local"
                      value={eventDraft.startsAt}
                      onChange={(e) => setEventDraft({ ...eventDraft, startsAt: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Ends
                    </label>
                    <input
                      type="datetime-local"
                      value={eventDraft.endsAt}
                      onChange={(e) => setEventDraft({ ...eventDraft, endsAt: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Seat Count (optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={eventDraft.capacity}
                      onChange={(e) => setEventDraft({ ...eventDraft, capacity: e.target.value })}
                      placeholder="Leave empty for unlimited"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Registration Fee (Taka)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={eventDraft.feeTaka}
                      onChange={(e) => setEventDraft({ ...eventDraft, feeTaka: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Contact (optional)
                    </label>
                    <input
                      value={eventDraft.contactInfo}
                      onChange={(e) => setEventDraft({ ...eventDraft, contactInfo: e.target.value })}
                      placeholder="01XXXXXXXXX or club@bracu.ac.bd"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Details
                    </label>
                    <textarea
                      value={eventDraft.description}
                      onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
                      rows={4}
                      placeholder="What's included, who can join, what to bring…"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {status && (
                  <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    {status}
                  </p>
                )}

                <button
                  onClick={handleCreateEvent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  Publish Event
                </button>
              </div>
            )}

            {events.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                {(filters.search?.trim() ?? "") !== "" || (filters.category && filters.category !== "ALL") ? (
                  <>
                    <p className="text-sm font-semibold text-gray-400">No events match your filters.</p>
                    <button
                      onClick={() => setFilters({ ...filters, search: "", category: "ALL" })}
                      className="text-xs font-bold text-indigo-600 hover:underline mt-2"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-400">No events yet.</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Post the first event using the button above.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => {
                  const meta = categoryMeta(event.category);
                  const expanded = expandedEventId === event.id;
                  const isFull = event.seatsLeft === 0;

                  return (
                    <div
                      key={event.id}
                      className={`bg-white rounded-3xl p-6 border shadow-sm transition ${
                        event.isCancelled ? "border-red-100 opacity-70" : "border-gray-100 hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row gap-5">
                        {/* Date block */}
                        <div className="bg-[#0f172a] text-white rounded-2xl w-20 h-20 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                            {new Date(event.startsAt).toLocaleDateString("en-GB", { month: "short" })}
                          </span>
                          <span className="text-2xl font-black leading-none mt-0.5">
                            {new Date(event.startsAt).getDate()}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400 mt-0.5">
                            {formatClock(event.startsAt)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {meta.emoji} {meta.label}
                            </span>
                            {event.isCancelled && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600">
                                Cancelled
                              </span>
                            )}
                            {isFull && !event.isCancelled && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                All seats full
                              </span>
                            )}
                            {event.feeTaka > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                Fee Tk {event.feeTaka}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-extrabold text-gray-900">{event.title}</h3>
                          <p className="text-sm font-semibold text-gray-500">
                            {event.clubName} · {event.venue}
                          </p>

                          <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-bold text-gray-500">
                            <span>👥 {event.goingCount} going</span>
                            <span>⭐ {event.interestedCount} interested</span>
                            {event.seatsLeft !== null && (
                              <span className="text-indigo-600">{event.seatsLeft} seats left</span>
                            )}
                            <span className="text-gray-400">
                              {formatDateTime(event.startsAt)} – {formatClock(event.endsAt)}
                            </span>
                          </div>

                          {expanded && (
                            <>
                              <p className="mt-4 text-xs text-gray-500 font-medium leading-relaxed whitespace-pre-line">
                                {event.description || "No details provided."}
                              </p>
                              {event.contactInfo && (
                                <p className="mt-2 text-xs font-bold text-indigo-600">
                                  Contact: {event.contactInfo}
                                </p>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => setExpandedEventId(expanded ? null : event.id)}
                            className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                          >
                            {expanded ? "Show less" : "View details"}
                          </button>
                        </div>

                        <div className="flex flex-row lg:flex-col gap-2 lg:w-36 shrink-0">
                          <button
                            onClick={() => handleRsvp(event.id, "GOING")}
                            disabled={event.isCancelled || (isFull && event.myRsvp !== "GOING")}
                            className={`flex-1 font-bold text-xs px-4 py-2.5 rounded-xl transition disabled:opacity-40 ${
                              event.myRsvp === "GOING"
                                ? "bg-emerald-600 text-white"
                                : "bg-[#0f172a] hover:bg-gray-800 text-white"
                            }`}
                          >
                            {event.myRsvp === "GOING" ? "✓ Going" : "Go"}
                          </button>
                          <button
                            onClick={() => handleRsvp(event.id, "INTERESTED")}
                            disabled={event.isCancelled}
                            className={`flex-1 font-bold text-xs px-4 py-2.5 rounded-xl border transition disabled:opacity-40 ${
                              event.myRsvp === "INTERESTED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {event.myRsvp === "INTERESTED" ? "⭐ Interested" : "Interested"}
                          </button>
                          {event.isMine && (
                            <button
                              onClick={() => handleCancelEvent(event.id)}
                              className="flex-1 font-bold text-xs px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition"
                            >
                              {event.isCancelled ? "Reactivate" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ================= HANGOUTS TAB ================= */}
        {tab === "HANGOUTS" && (
          <>
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 md:items-center">
              <select
                value={filters.activity}
                onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Hangout Types</option>
                {ACTIVITIES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.emoji} {a.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowHangoutForm((v) => !v)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                {showHangoutForm ? "Close Form" : "📡 Broadcast Now"}
              </button>
              <p className="text-[11px] font-semibold text-gray-400 md:ml-auto">
                Feed refreshes automatically every 30 seconds.
              </p>
            </div>

            {showHangoutForm && (
              <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm space-y-5">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-lg">Got free time?</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Find a carrom, lunch, or tea buddy between classes. Everyone nearby on campus will see it.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      What do you want to do
                    </label>
                    <select
                      value={hangoutDraft.activity}
                      onChange={(e) => setHangoutDraft({ ...hangoutDraft, activity: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {ACTIVITIES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.emoji} {a.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      How many people needed
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={hangoutDraft.spotsNeeded}
                      onChange={(e) =>
                        setHangoutDraft({ ...hangoutDraft, spotsNeeded: Number(e.target.value) })
                      }
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Title
                    </label>
                    <input
                      value={hangoutDraft.title}
                      onChange={(e) => setHangoutDraft({ ...hangoutDraft, title: e.target.value })}
                      placeholder="Need a carrom partner"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Where on campus
                    </label>
                    <input
                      value={hangoutDraft.location}
                      onChange={(e) => setHangoutDraft({ ...hangoutDraft, location: e.target.value })}
                      placeholder="Cafeteria, ground floor"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      How many minutes from now ({hangoutDraft.minutesFromNow} min)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="5"
                      value={hangoutDraft.minutesFromNow}
                      onChange={(e) =>
                        setHangoutDraft({ ...hangoutDraft, minutesFromNow: Number(e.target.value) })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      How long it stays in the feed ({hangoutDraft.validForMinutes} min)
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="360"
                      step="15"
                      value={hangoutDraft.validForMinutes}
                      onChange={(e) =>
                        setHangoutDraft({ ...hangoutDraft, validForMinutes: Number(e.target.value) })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      value={hangoutDraft.note}
                      onChange={(e) => setHangoutDraft({ ...hangoutDraft, note: e.target.value })}
                      rows={2}
                      placeholder="I have the board, just come by"
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {status && (
                  <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    {status}
                  </p>
                )}

                <button
                  onClick={handleCreateHangout}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  Go Live
                </button>
              </div>
            )}

            {hangouts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                {filters.activity && filters.activity !== "ALL" ? (
                  <>
                    <p className="text-sm font-semibold text-gray-400">No live hangouts match this filter.</p>
                    <button
                      onClick={() => setFilters({ ...filters, activity: "ALL" })}
                      className="text-xs font-bold text-indigo-600 hover:underline mt-2"
                    >
                      Clear filter
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-400">No live hangouts right now.</p>
                    <p className="text-xs text-gray-300 mt-1">Be the first to broadcast one.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hangouts.map((h) => {
                  const meta = activityMeta(h.activity);
                  const chatOpen = chatOpenId === h.id;
                  const canChat = h.isHost || h.hasJoined;

                  return (
                    <div
                      key={h.id}
                      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {meta.label}
                            </span>
                            {h.status === "FULL" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                Full
                              </span>
                            )}
                            {h.minutesLeft <= 30 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600">
                                {h.minutesLeft} min left
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-gray-900 text-base">{h.title}</h3>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">
                            📍 {h.location} · ⏰ {formatClock(h.startsAt)}
                          </p>
                          <p className="text-[11px] font-semibold text-gray-400 mt-1">
                            {h.hostName} · {h.hostDepartment}
                          </p>
                          {h.note && (
                            <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">
                              {h.note}
                            </p>
                          )}
                          <p className="text-[11px] font-bold text-emerald-600 mt-2">
                            {h.joinedCount} / {h.spotsNeeded} joined
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {!h.isHost && (
                          <button
                            onClick={() => handleJoin(h.id)}
                            disabled={h.status === "FULL" && !h.hasJoined}
                            className={`flex-1 font-bold text-xs px-4 py-2.5 rounded-xl transition disabled:opacity-40 ${
                              h.hasJoined
                                ? "bg-emerald-600 text-white"
                                : "bg-[#0f172a] hover:bg-gray-800 text-white"
                            }`}
                          >
                            {h.hasJoined ? "✓ Joined" : "I'm coming"}
                          </button>
                        )}
                        <button
                          onClick={() => openChat(h.id)}
                          disabled={!canChat}
                          className="flex-1 font-bold text-xs px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-gray-300 transition disabled:opacity-40"
                        >
                          💬 Chat {h.messageCount > 0 && `(${h.messageCount})`}
                        </button>
                        {h.isHost && (
                          <button
                            onClick={() => handleCloseHangout(h.id)}
                            className="font-bold text-xs px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition"
                          >
                            Close
                          </button>
                        )}
                      </div>

                      {chatOpen && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          {chatError && (
                            <p className="text-xs font-bold text-amber-600 mb-2">{chatError}</p>
                          )}
                          <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                            {chatMessages.length === 0 ? (
                              <p className="text-xs text-gray-300 font-semibold text-center py-4">
                                No messages yet.
                              </p>
                            ) : (
                              chatMessages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`text-xs rounded-xl px-3 py-2 max-w-[85%] ${
                                    m.isMine
                                      ? "bg-indigo-600 text-white ml-auto"
                                      : "bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  {!m.isMine && (
                                    <span className="block font-bold text-[10px] text-gray-400 mb-0.5">
                                      {m.authorName}
                                    </span>
                                  )}
                                  {m.body}
                                </div>
                              ))
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={chatDraft}
                              onChange={(e) => setChatDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSendMessage(h.id);
                              }}
                              placeholder="Type a message…"
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => handleSendMessage(h.id)}
                              className="bg-[#0f172a] hover:bg-gray-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
