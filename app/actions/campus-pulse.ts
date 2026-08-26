"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Neon's free-tier database auto-suspends when idle and takes a few seconds to
// wake back up, which makes the first query after a gap fail with "Can't reach
// database server". Retry that specific error a couple of times before giving up.
const prisma = new PrismaClient().$extends({
  query: {
    async $allOperations({ args, query }) {
      const maxAttempts = 5;
      for (let attempt = 1; ; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const isColdStart = message.includes("Can't reach database server");
          if (!isColdStart || attempt >= maxAttempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      }
    },
  },
});

/**
 * Module 3 · Feature: Campus Pulse
 *
 * Two parts in one place:
 *  1) Official event board — club events, RSVP, filter by interest
 *  2) Live Hangout Broadcast — find company during free time + quick chat
 *
 * Same as the rest of the project: reads the userId cookie, returns
 * { success, message, ...data }, and never throws on the client.
 */

async function getAuthUserId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("userId")?.value;
}

// ---------------------------------------------------------------------------
// Serializable types sent to the client
// ---------------------------------------------------------------------------

export interface EventCardData {
  id: string;
  title: string;
  description: string;
  category: string;
  clubName: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  feeTaka: number;
  contactInfo: string | null;
  isCancelled: boolean;
  isMine: boolean;
  goingCount: number;
  interestedCount: number;
  myRsvp: "GOING" | "INTERESTED" | null;
  seatsLeft: number | null;
}

export interface HangoutCardData {
  id: string;
  activity: string;
  title: string;
  note: string | null;
  location: string;
  spotsNeeded: number;
  startsAt: string;
  expiresAt: string;
  status: string;
  hostName: string;
  hostDepartment: string;
  isHost: boolean;
  joinedCount: number;
  hasJoined: boolean;
  messageCount: number;
  minutesLeft: number;
}

export interface ChatMessageData {
  id: string;
  body: string;
  authorName: string;
  isMine: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface PulseFilters {
  category?: string; // "ALL" or a specific category
  search?: string;
  showPastEvents?: boolean;
  activity?: string; // hangout filter
}

export async function getCampusPulseData(filters: PulseFilters = {}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return {
        success: false,
        authRequired: true,
        message: "Please log in",
        user: null,
        events: [] as EventCardData[],
        hangouts: [] as HangoutCardData[],
        myEventCount: 0,
        myHangoutCount: 0,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, department: true, semester: true },
    });

    if (!user) {
      return {
        success: false,
        authRequired: true,
        message: "User not found.",
        user: null,
        events: [] as EventCardData[],
        hangouts: [] as HangoutCardData[],
        myEventCount: 0,
        myHangoutCount: 0,
      };
    }

    // ---- Events ----
    const eventWhere: Record<string, unknown> = {};
    if (!filters.showPastEvents) {
      eventWhere.endsAt = { gte: new Date() };
    }
    if (filters.category && filters.category !== "ALL") {
      eventWhere.category = filters.category;
    }
    if (filters.search?.trim()) {
      const term = filters.search.trim();
      eventWhere.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { clubName: { contains: term, mode: "insensitive" } },
        { venue: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const eventRows = await prisma.campusEvent.findMany({
      where: eventWhere,
      orderBy: { startsAt: "asc" },
      take: 60,
      include: { rsvps: { select: { userId: true, status: true } } },
    });

    const events: EventCardData[] = eventRows.map((row) => {
      const going = row.rsvps.filter((r) => r.status === "GOING").length;
      const mine = row.rsvps.find((r) => r.userId === userId);

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        clubName: row.clubName,
        venue: row.venue,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        capacity: row.capacity,
        feeTaka: row.feeTaka,
        contactInfo: row.contactInfo,
        isCancelled: row.isCancelled,
        isMine: row.createdById === userId,
        goingCount: going,
        interestedCount: row.rsvps.filter((r) => r.status === "INTERESTED").length,
        myRsvp: (mine?.status as "GOING" | "INTERESTED") ?? null,
        seatsLeft: row.capacity === null ? null : Math.max(0, row.capacity - going),
      };
    });

    // ---- Hangout broadcasts ----
    const hangoutWhere: Record<string, unknown> = {
      expiresAt: { gte: new Date() },
      status: { not: "CLOSED" },
    };
    if (filters.activity && filters.activity !== "ALL") {
      hangoutWhere.activity = filters.activity;
    }

    const hangoutRows = await prisma.hangoutBroadcast.findMany({
      where: hangoutWhere,
      orderBy: { startsAt: "asc" },
      take: 40,
      include: {
        host: { select: { name: true, department: true } },
        responses: { select: { userId: true } },
        _count: { select: { messages: true } },
      },
    });

    const hangouts: HangoutCardData[] = hangoutRows.map((row) => ({
      id: row.id,
      activity: row.activity,
      title: row.title,
      note: row.note,
      location: row.location,
      spotsNeeded: row.spotsNeeded,
      startsAt: row.startsAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      status: row.status,
      hostName: row.host.name,
      hostDepartment: row.host.department,
      isHost: row.hostId === userId,
      joinedCount: row.responses.length,
      hasJoined: row.responses.some((r) => r.userId === userId),
      messageCount: row._count.messages,
      minutesLeft: Math.max(
        0,
        Math.round((row.expiresAt.getTime() - Date.now()) / 60_000),
      ),
    }));

    const [myEventCount, myHangoutCount] = await Promise.all([
      prisma.eventRsvp.count({ where: { userId, status: "GOING" } }),
      prisma.hangoutResponse.count({ where: { userId } }),
    ]);

    return {
      success: true,
      message: "Loaded",
      user,
      events,
      hangouts,
      myEventCount,
      myHangoutCount,
    };
  } catch (error) {
    console.error("Campus Pulse Fetch Error:", error);
    return {
      success: false,
      authRequired: false,
      message: "Couldn't load Campus Pulse. Please try again.",
      user: null,
      events: [] as EventCardData[],
      hangouts: [] as HangoutCardData[],
      myEventCount: 0,
      myHangoutCount: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function createCampusEvent(data: {
  title: string;
  description: string;
  category: string;
  clubName: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  feeTaka: number;
  contactInfo: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    if (!data.title.trim() || !data.clubName.trim() || !data.venue.trim()) {
      return { success: false, message: "Title, club name, and venue are required." };
    }

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { success: false, message: "Please provide a valid date and time." };
    }
    if (endsAt <= startsAt) {
      return { success: false, message: "End time must be after the start time." };
    }

    await prisma.campusEvent.create({
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        clubName: data.clubName.trim(),
        venue: data.venue.trim(),
        startsAt,
        endsAt,
        capacity: data.capacity && data.capacity > 0 ? data.capacity : null,
        feeTaka: Math.max(0, data.feeTaka),
        contactInfo: data.contactInfo.trim() || null,
        createdById: userId,
      },
    });

    revalidatePath("/campus-pulse");
    revalidatePath("/dashboard");
    return { success: true, message: "Event posted!" };
  } catch (error) {
    console.error("Create Event Error:", error);
    return { success: false, message: "Couldn't create the event." };
  }
}

export async function rsvpToEvent(eventId: string, status: "GOING" | "INTERESTED") {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    const event = await prisma.campusEvent.findUnique({
      where: { id: eventId },
      include: { rsvps: { where: { status: "GOING" } } },
    });

    if (!event) return { success: false, message: "Event not found." };
    if (event.isCancelled) return { success: false, message: "This event has been cancelled." };

    const existing = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    // Clicking the same button again removes the RSVP
    if (existing && existing.status === status) {
      await prisma.eventRsvp.delete({ where: { id: existing.id } });
      revalidatePath("/campus-pulse");
      return { success: true, message: "RSVP removed." };
    }

    // Seat availability is only checked for a new GOING RSVP
    if (status === "GOING" && event.capacity !== null) {
      const alreadyGoing = existing?.status === "GOING";
      if (!alreadyGoing && event.rsvps.length >= event.capacity) {
        return { success: false, message: "Sorry, all seats are full." };
      }
    }

    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });

    revalidatePath("/campus-pulse");
    return {
      success: true,
      message: status === "GOING" ? "You're going — RSVP confirmed!" : "Interest recorded.",
    };
  } catch (error) {
    console.error("RSVP Error:", error);
    return { success: false, message: "Couldn't complete RSVP." };
  }
}

export async function cancelCampusEvent(eventId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    const event = await prisma.campusEvent.findFirst({
      where: { id: eventId, createdById: userId },
    });

    if (!event) {
      return { success: false, message: "You can only cancel events you posted." };
    }

    await prisma.campusEvent.update({
      where: { id: eventId },
      data: { isCancelled: !event.isCancelled },
    });

    revalidatePath("/campus-pulse");
    return {
      success: true,
      message: event.isCancelled ? "Event reactivated." : "Event marked as cancelled.",
    };
  } catch (error) {
    console.error("Cancel Event Error:", error);
    return { success: false, message: "Couldn't update the event." };
  }
}

// ---------------------------------------------------------------------------
// Hangout Broadcast
// ---------------------------------------------------------------------------

export async function createHangout(data: {
  activity: string;
  title: string;
  note: string;
  location: string;
  spotsNeeded: number;
  minutesFromNow: number; // how many minutes from now it will happen
  validForMinutes: number; // how many minutes it stays in the feed
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    if (!data.title.trim() || !data.location.trim()) {
      return { success: false, message: "Please provide a title and location." };
    }

    const now = Date.now();
    const startsAt = new Date(now + Math.max(0, data.minutesFromNow) * 60_000);
    const validFor = Math.min(480, Math.max(15, data.validForMinutes));
    const expiresAt = new Date(startsAt.getTime() + validFor * 60_000);

    await prisma.hangoutBroadcast.create({
      data: {
        hostId: userId,
        activity: data.activity,
        title: data.title.trim(),
        note: data.note.trim() || null,
        location: data.location.trim(),
        spotsNeeded: Math.min(20, Math.max(1, data.spotsNeeded)),
        startsAt,
        expiresAt,
      },
    });

    revalidatePath("/campus-pulse");
    return { success: true, message: "Broadcast is live! Everyone nearby will see it." };
  } catch (error) {
    console.error("Create Hangout Error:", error);
    return { success: false, message: "Couldn't post the broadcast." };
  }
}

export async function toggleJoinHangout(broadcastId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in", joined: false };

    const broadcast = await prisma.hangoutBroadcast.findUnique({
      where: { id: broadcastId },
      include: { responses: true },
    });

    if (!broadcast) {
      return { success: false, message: "Broadcast not found.", joined: false };
    }
    if (broadcast.hostId === userId) {
      return { success: false, message: "No need to join your own broadcast.", joined: false };
    }

    const existing = broadcast.responses.find((r) => r.userId === userId);

    if (existing) {
      await prisma.hangoutResponse.delete({ where: { id: existing.id } });
      await prisma.hangoutBroadcast.update({
        where: { id: broadcastId },
        data: { status: "OPEN" },
      });
      revalidatePath("/campus-pulse");
      return { success: true, message: "You've left.", joined: false };
    }

    if (broadcast.responses.length >= broadcast.spotsNeeded) {
      return { success: false, message: "This hangout is full.", joined: false };
    }

    await prisma.hangoutResponse.create({ data: { broadcastId, userId } });

    const nowFull = broadcast.responses.length + 1 >= broadcast.spotsNeeded;
    if (nowFull) {
      await prisma.hangoutBroadcast.update({
        where: { id: broadcastId },
        data: { status: "FULL" },
      });
    }

    revalidatePath("/campus-pulse");
    return { success: true, message: "Joined! Chat with the group.", joined: true };
  } catch (error) {
    console.error("Join Hangout Error:", error);
    return { success: false, message: "Couldn't join.", joined: false };
  }
}

export async function closeHangout(broadcastId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    const broadcast = await prisma.hangoutBroadcast.findFirst({
      where: { id: broadcastId, hostId: userId },
    });

    if (!broadcast) {
      return { success: false, message: "Only the host can close the broadcast." };
    }

    await prisma.hangoutBroadcast.update({
      where: { id: broadcastId },
      data: { status: "CLOSED" },
    });

    revalidatePath("/campus-pulse");
    return { success: true, message: "Broadcast closed." };
  } catch (error) {
    console.error("Close Hangout Error:", error);
    return { success: false, message: "Couldn't close it." };
  }
}

/** Quick-chat thread. Only the host and joined members can see it. */
export async function getHangoutThread(broadcastId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Please log in", messages: [] as ChatMessageData[] };
    }

    const broadcast = await prisma.hangoutBroadcast.findUnique({
      where: { id: broadcastId },
      include: { responses: { select: { userId: true } } },
    });

    if (!broadcast) {
      return { success: false, message: "Broadcast not found.", messages: [] as ChatMessageData[] };
    }

    const isMember =
      broadcast.hostId === userId ||
      broadcast.responses.some((r) => r.userId === userId);

    if (!isMember) {
      return {
        success: false,
        message: "Join first to see the chat.",
        messages: [] as ChatMessageData[],
      };
    }

    const rows = await prisma.hangoutMessage.findMany({
      where: { broadcastId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { name: true } } },
    });

    const messages: ChatMessageData[] = rows.map((row) => ({
      id: row.id,
      body: row.body,
      authorName: row.user.name,
      isMine: row.userId === userId,
      createdAt: row.createdAt.toISOString(),
    }));

    return { success: true, message: "ok", messages };
  } catch (error) {
    console.error("Get Thread Error:", error);
    return { success: false, message: "Couldn't load the chat.", messages: [] as ChatMessageData[] };
  }
}

export async function sendHangoutMessage(broadcastId: string, body: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    const trimmed = body.trim();
    if (!trimmed) return { success: false, message: "Please write a message." };
    if (trimmed.length > 500) return { success: false, message: "Message is too long." };

    const broadcast = await prisma.hangoutBroadcast.findUnique({
      where: { id: broadcastId },
      include: { responses: { select: { userId: true } } },
    });

    if (!broadcast) return { success: false, message: "Broadcast not found." };

    const isMember =
      broadcast.hostId === userId ||
      broadcast.responses.some((r) => r.userId === userId);

    if (!isMember) return { success: false, message: "Join first." };

    await prisma.hangoutMessage.create({
      data: { broadcastId, userId, body: trimmed },
    });

    revalidatePath("/campus-pulse");
    return { success: true, message: "Sent." };
  } catch (error) {
    console.error("Send Message Error:", error);
    return { success: false, message: "Couldn't send the message." };
  }
}

/** Small summary for the dashboard card. */
export async function getPulseSummary() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, upcomingEvents: 0, liveHangouts: 0, myRsvps: 0 };
    }

    const [upcomingEvents, liveHangouts, myRsvps] = await Promise.all([
      prisma.campusEvent.count({
        where: { startsAt: { gte: new Date() }, isCancelled: false },
      }),
      prisma.hangoutBroadcast.count({
        where: { expiresAt: { gte: new Date() }, status: "OPEN" },
      }),
      prisma.eventRsvp.count({ where: { userId, status: "GOING" } }),
    ]);

    return { success: true, upcomingEvents, liveHangouts, myRsvps };
  } catch (error) {
    console.error("Pulse Summary Error:", error);
    return { success: false, upcomingEvents: 0, liveHangouts: 0, myRsvps: 0 };
  }
}
