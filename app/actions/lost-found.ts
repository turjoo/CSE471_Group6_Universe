"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function getAuthUserId() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    return userId || null;
  } catch (error) {
    console.error("Auth Cookie Error:", error);
    return null;
  }
}

export async function getLostFoundItems(filters?: {
  type?: string; // "LOST", "FOUND" or "ALL"
  category?: string; // "ELECTRONICS", etc. or "ALL"
  search?: string; // Matches title, description or location
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized", items: [], currentUserId: null };
    }

    const whereClause: any = {};

    if (filters?.type && filters.type !== "ALL") {
      whereClause.type = filters.type.toUpperCase();
    }

    if (filters?.category && filters.category !== "ALL") {
      whereClause.category = filters.category.toUpperCase();
    }

    if (filters?.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.lostFoundItem.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, items, currentUserId: userId };
  } catch (error) {
    console.error("Get Lost/Found Items Error:", error);
    return { success: false, message: "Failed to fetch items", items: [], currentUserId: null };
  }
}

export async function createLostFoundItem(data: {
  title: string;
  description: string;
  type: string;
  category: string;
  location: string;
  imageUrl?: string; // base64 string
  contactInfo: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized. Please log in." };
    }

    if (!data.title || !data.description || !data.type || !data.category || !data.location || !data.contactInfo) {
      return { success: false, message: "All fields are required." };
    }

    const item = await prisma.lostFoundItem.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        type: data.type.toUpperCase(),
        category: data.category.toUpperCase(),
        location: data.location,
        imageUrl: data.imageUrl || null,
        contactInfo: data.contactInfo,
        status: "ACTIVE"
      }
    });

    revalidatePath('/lost-found');
    return { success: true, message: "Item reported successfully!", item };
  } catch (error) {
    console.error("Create Lost/Found Item Error:", error);
    return { success: false, message: "Failed to report item." };
  }
}

export async function updateLostFoundStatus(id: string, status: "ACTIVE" | "RESOLVED") {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const item = await prisma.lostFoundItem.findUnique({
      where: { id }
    });

    if (!item || item.userId !== userId) {
      return { success: false, message: "Unauthorized to update this item." };
    }

    await prisma.lostFoundItem.update({
      where: { id },
      data: { status }
    });

    revalidatePath('/lost-found');
    return { success: true, message: "Status updated successfully!" };
  } catch (error) {
    console.error("Update Lost/Found Status Error:", error);
    return { success: false, message: "Failed to update item status." };
  }
}

export async function deleteLostFoundItem(id: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const item = await prisma.lostFoundItem.findUnique({
      where: { id }
    });

    if (!item || item.userId !== userId) {
      return { success: false, message: "Unauthorized to delete this item." };
    }

    await prisma.lostFoundItem.delete({
      where: { id }
    });

    revalidatePath('/lost-found');
    return { success: true, message: "Item deleted successfully!" };
  } catch (error) {
    console.error("Delete Lost/Found Item Error:", error);
    return { success: false, message: "Failed to delete item." };
  }
}
