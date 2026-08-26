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
 * Module 3 · Feature: Emergency Contact & Campus Alert System
 *
 *  - One-tap calling to national and campus emergency numbers (tel: links open the phone's dialer)
 *  - SOS request logging so the Proctor's Office can review it later
 *  - Campus-wide alert broadcasting
 *  - "I'm safe" check-in
 *
 * Important: this app is not a substitute for any emergency service. It only
 * keeps the numbers in one place and logs incidents. Real help comes from calling 999.
 */

async function getAuthUserId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("userId")?.value;
}

// ---------------------------------------------------------------------------
// Serializable types
// ---------------------------------------------------------------------------

export interface ContactData {
  id: string;
  name: string;
  role: string;
  phone: string;
  category: string;
  building: string | null;
  floor: string | null;
  isNational: boolean;
}

export interface AlertData {
  id: string;
  title: string;
  message: string;
  severity: string;
  category: string;
  location: string | null;
  raisedByName: string;
  isActive: boolean;
  createdAt: string;
  resolvedAt: string | null;
  safeCount: number;
  needHelpCount: number;
  myAck: { isSafe: boolean; note: string | null } | null;
  isMine: boolean;
}

export interface SosData {
  id: string;
  type: string;
  location: string;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface SosAdminData extends SosData {
  resolvedAt: string | null;
  requesterName: string;
  requesterDepartment: string;
}

// ---------------------------------------------------------------------------
// Bangladesh national emergency numbers and default campus contacts
// ---------------------------------------------------------------------------

/**
 * Campus numbers are placeholders — replace them with your university's real
 * numbers. The national numbers are real, working numbers in Bangladesh.
 */
const DEFAULT_CONTACTS = [
  // ---- National Services (Bangladesh) ----
  {
    name: "National Emergency Service",
    role: "Police · Fire Service · Ambulance — 24 hours",
    phone: "999",
    category: "NATIONAL",
    isNational: true,
    priority: 1,
  },
  {
    name: "Fire Service & Civil Defence",
    role: "Fire and rescue operations",
    phone: "102",
    category: "FIRE",
    isNational: true,
    priority: 2,
  },
  {
    name: "Shastho Batayon (Health Helpline)",
    role: "Government health advice and ambulance assistance",
    phone: "16263",
    category: "MEDICAL",
    isNational: true,
    priority: 3,
  },
  {
    name: "Women & Child Abuse Prevention Helpline",
    role: "Report harassment or abuse",
    phone: "109",
    category: "SECURITY",
    isNational: true,
    priority: 4,
  },
  {
    name: "Child Helpline",
    role: "Child protection support",
    phone: "1098",
    category: "SECURITY",
    isNational: true,
    priority: 5,
  },
  {
    name: "National Information Service",
    role: "Government information and guidance",
    phone: "333",
    category: "NATIONAL",
    isNational: true,
    priority: 6,
  },

  // ---- Campus (placeholders — insert real numbers) ----
  {
    name: "Campus Security Control Room",
    role: "Main gate and campus security",
    phone: "01700000001",
    category: "SECURITY",
    isNational: false,
    priority: 10,
  },
  {
    name: "Proctor's Office",
    role: "Discipline and student safety",
    phone: "01700000002",
    category: "SECURITY",
    isNational: false,
    priority: 11,
  },
  {
    name: "Medical Center",
    role: "Campus doctor and first aid",
    phone: "01700000003",
    category: "MEDICAL",
    isNational: false,
    priority: 12,
  },
  {
    name: "Counselling Unit",
    role: "Mental health support",
    phone: "01700000004",
    category: "COUNSELLING",
    isNational: false,
    priority: 13,
  },
  {
    name: "Floor Warden — Academic Building",
    role: "Responsible for fire safety and evacuation",
    phone: "01700000005",
    category: "WARDEN",
    building: "Academic Building",
    floor: "4th Floor",
    isNational: false,
    priority: 20,
  },
  {
    name: "Floor Warden — Library Building",
    role: "Responsible for fire safety and evacuation",
    phone: "01700000006",
    category: "WARDEN",
    building: "Library Building",
    floor: "2nd Floor",
    isNational: false,
    priority: 21,
  },
  {
    name: "Transport Coordinator",
    role: "Bus and emergency transport",
    phone: "01700000007",
    category: "TRANSPORT",
    isNational: false,
    priority: 30,
  },
];

/** Seeds default numbers the first time the page loads. Safe to run repeatedly — no duplicates. */
export async function seedEmergencyContacts() {
  try {
    const existing = await prisma.emergencyContact.count();
    if (existing > 0) {
      return { success: true, message: "Contacts already exist.", created: 0 };
    }

    await prisma.emergencyContact.createMany({
      data: DEFAULT_CONTACTS.map((c) => ({
        name: c.name,
        role: c.role,
        phone: c.phone,
        category: c.category,
        building: c.building ?? null,
        floor: c.floor ?? null,
        isNational: c.isNational,
        priority: c.priority,
      })),
    });

    revalidatePath("/emergency");
    return {
      success: true,
      message: `Added ${DEFAULT_CONTACTS.length} emergency numbers.`,
      created: DEFAULT_CONTACTS.length,
    };
  } catch (error) {
    console.error("Seed Contacts Error:", error);
    return { success: false, message: "Could not add numbers.", created: 0 };
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getEmergencyData() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return {
        success: false,
        authRequired: true,
        message: "Please log in",
        user: null,
        contacts: [] as ContactData[],
        alerts: [] as AlertData[],
        mySosRequests: [] as SosData[],
        activeAlertCount: 0,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, department: true },
    });

    if (!user) {
      return {
        success: false,
        authRequired: true,
        message: "User not found.",
        user: null,
        contacts: [] as ContactData[],
        alerts: [] as AlertData[],
        mySosRequests: [] as SosData[],
        activeAlertCount: 0,
      };
    }

    // Seed on first load if there are no contacts yet
    const contactCount = await prisma.emergencyContact.count();
    if (contactCount === 0) {
      await seedEmergencyContacts();
    }

    const contactRows = await prisma.emergencyContact.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    });

    const contacts: ContactData[] = contactRows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      phone: row.phone,
      category: row.category,
      building: row.building,
      floor: row.floor,
      isNational: row.isNational,
    }));

    const alertRows = await prisma.campusAlert.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 25,
      include: {
        raisedBy: { select: { name: true } },
        acknowledgements: { select: { userId: true, isSafe: true, note: true } },
      },
    });

    const alerts: AlertData[] = alertRows.map((row) => {
      const mine = row.acknowledgements.find((a) => a.userId === userId);
      return {
        id: row.id,
        title: row.title,
        message: row.message,
        severity: row.severity,
        category: row.category,
        location: row.location,
        raisedByName: row.raisedBy.name,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        safeCount: row.acknowledgements.filter((a) => a.isSafe).length,
        needHelpCount: row.acknowledgements.filter((a) => !a.isSafe).length,
        myAck: mine ? { isSafe: mine.isSafe, note: mine.note } : null,
        isMine: row.raisedById === userId,
      };
    });

    const sosRows = await prisma.sosRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const mySosRequests: SosData[] = sosRows.map((row) => ({
      id: row.id,
      type: row.type,
      location: row.location,
      note: row.note,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      success: true,
      message: "Loaded",
      user,
      contacts,
      alerts,
      mySosRequests,
      activeAlertCount: alerts.filter((a) => a.isActive).length,
    };
  } catch (error) {
    console.error("Emergency Fetch Error:", error);
    return {
      success: false,
      authRequired: false,
      message: "Could not load emergency info. Please try again.",
      user: null,
      contacts: [] as ContactData[],
      alerts: [] as AlertData[],
      mySosRequests: [] as SosData[],
      activeAlertCount: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// SOS
// ---------------------------------------------------------------------------

export async function raiseSosRequest(data: {
  type: string;
  location: string;
  note: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    if (!data.location.trim()) {
      return { success: false, message: "Please enter where you are." };
    }

    await prisma.sosRequest.create({
      data: {
        userId,
        type: data.type,
        location: data.location.trim(),
        note: data.note.trim() || null,
      },
    });

    revalidatePath("/emergency");
    return {
      success: true,
      message: "SOS logged. Call 999 or Campus Security right now.",
    };
  } catch (error) {
    console.error("SOS Error:", error);
    return { success: false, message: "Could not log SOS. Please call 999 directly." };
  }
}

export async function resolveSosRequest(sosId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    await prisma.sosRequest.updateMany({
      where: { id: sosId, userId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    revalidatePath("/emergency");
    return { success: true, message: "Marked as resolved." };
  } catch (error) {
    console.error("Resolve SOS Error:", error);
    return { success: false, message: "Could not update." };
  }
}

/**
 * Campus-wide SOS log for anyone monitoring it (e.g. Proctor's Office).
 * There's no staff/role system in this app, so this is visible to any logged-in
 * user, same as campus alerts already are.
 */
export async function getAllSosRequests() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, authRequired: true, message: "Please log in", requests: [] as SosAdminData[] };
    }

    const rows = await prisma.sosRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, department: true } } },
    });

    const statusRank: Record<string, number> = { OPEN: 0, ACKNOWLEDGED: 1, RESOLVED: 2 };
    const requests: SosAdminData[] = rows
      .map((row) => ({
        id: row.id,
        type: row.type,
        location: row.location,
        note: row.note,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        requesterName: row.user.name,
        requesterDepartment: row.user.department,
      }))
      .sort((a, b) => (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99));

    return { success: true, message: "Loaded", requests };
  } catch (error) {
    console.error("Admin SOS Fetch Error:", error);
    return {
      success: false,
      authRequired: false,
      message: "Could not load SOS requests. Please try again.",
      requests: [] as SosAdminData[],
    };
  }
}

/** Lets whoever is monitoring the SOS log update any request's status, not just their own. */
export async function updateSosStatus(sosId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    await prisma.sosRequest.update({
      where: { id: sosId },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });

    revalidatePath("/emergency/admin");
    revalidatePath("/emergency");
    return {
      success: true,
      message: status === "RESOLVED" ? "Marked as resolved." : "Marked as acknowledged.",
    };
  } catch (error) {
    console.error("Update SOS Status Error:", error);
    return { success: false, message: "Could not update." };
  }
}

// ---------------------------------------------------------------------------
// Campus alerts
// ---------------------------------------------------------------------------

export async function broadcastCampusAlert(data: {
  title: string;
  message: string;
  severity: string;
  category: string;
  location: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    if (!data.title.trim() || !data.message.trim()) {
      return { success: false, message: "Please enter both a title and a message." };
    }

    await prisma.campusAlert.create({
      data: {
        title: data.title.trim(),
        message: data.message.trim(),
        severity: data.severity,
        category: data.category,
        location: data.location.trim() || null,
        raisedById: userId,
      },
    });

    revalidatePath("/emergency");
    revalidatePath("/dashboard");
    return { success: true, message: "Alert broadcast." };
  } catch (error) {
    console.error("Broadcast Alert Error:", error);
    return { success: false, message: "Could not send alert." };
  }
}

export async function acknowledgeAlert(
  alertId: string,
  isSafe: boolean,
  note?: string,
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    await prisma.alertAcknowledgement.upsert({
      where: { alertId_userId: { alertId, userId } },
      update: { isSafe, note: note?.trim() || null },
      create: { alertId, userId, isSafe, note: note?.trim() || null },
    });

    revalidatePath("/emergency");
    return {
      success: true,
      message: isSafe
        ? "Thanks — you're marked as safe."
        : "Help request sent. Call 999 right now.",
    };
  } catch (error) {
    console.error("Acknowledge Alert Error:", error);
    return { success: false, message: "Could not check in." };
  }
}

export async function resolveCampusAlert(alertId: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: "Please log in" };

    const alert = await prisma.campusAlert.findFirst({
      where: { id: alertId, raisedById: userId },
    });

    if (!alert) {
      return { success: false, message: "Only the person who raised the alert can close it." };
    }

    await prisma.campusAlert.update({
      where: { id: alertId },
      data: { isActive: false, resolvedAt: new Date() },
    });

    revalidatePath("/emergency");
    return { success: true, message: "Alert closed." };
  } catch (error) {
    console.error("Resolve Alert Error:", error);
    return { success: false, message: "Could not close." };
  }
}

/** For the dashboard card. */
export async function getEmergencySummary() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, activeAlerts: 0, contactCount: 0 };

    const [activeAlerts, contactCount] = await Promise.all([
      prisma.campusAlert.count({ where: { isActive: true } }),
      prisma.emergencyContact.count({ where: { isActive: true } }),
    ]);

    return { success: true, activeAlerts, contactCount };
  } catch (error) {
    console.error("Emergency Summary Error:", error);
    return { success: false, activeAlerts: 0, contactCount: 0 };
  }
}
