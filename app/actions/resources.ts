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

export async function getResources(filters?: {
  category?: string;
  type?: string;
  search?: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized", resources: [], currentUserId: null };
    }

    const whereClause: any = {};

    if (filters?.category && filters.category !== "ALL") {
      whereClause.category = filters.category.toUpperCase();
    }

    if (filters?.type && filters.type !== "ALL") {
      whereClause.type = filters.type.toUpperCase();
    }

    if (filters?.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const resources = await prisma.resource.findMany({
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

    return { success: true, resources, currentUserId: userId };
  } catch (error) {
    console.error("Get Resources Error:", error);
    return { success: false, message: "Failed to fetch resources", resources: [], currentUserId: null };
  }
}

export async function createResource(data: {
  title: string;
  description: string;
  category: string;
  type: string;
  price?: number;
  contactInfo: string;
}) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized. Please log in." };
    }

    if (!data.title || !data.description || !data.category || !data.type || !data.contactInfo) {
      return { success: false, message: "All fields are required." };
    }

    const priceVal = data.type === 'DONATION' ? 0 : Number(data.price || 0);

    const resource = await prisma.resource.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category.toUpperCase(),
        type: data.type.toUpperCase(),
        price: priceVal,
        contactInfo: data.contactInfo,
        status: "AVAILABLE"
      }
    });

    revalidatePath('/resources');
    return { success: true, message: "Resource listed successfully!", resource };
  } catch (error) {
    console.error("Create Resource Error:", error);
    return { success: false, message: "Failed to list resource." };
  }
}

export async function updateResourceStatus(id: string, status: "AVAILABLE" | "EXCHANGED") {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const resource = await prisma.resource.findUnique({
      where: { id }
    });

    if (!resource || resource.userId !== userId) {
      return { success: false, message: "Unauthorized to update this resource." };
    }

    await prisma.resource.update({
      where: { id },
      data: { status }
    });

    revalidatePath('/resources');
    return { success: true, message: "Status updated successfully!" };
  } catch (error) {
    console.error("Update Resource Status Error:", error);
    return { success: false, message: "Failed to update resource status." };
  }
}

export async function deleteResource(id: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const resource = await prisma.resource.findUnique({
      where: { id }
    });

    if (!resource || resource.userId !== userId) {
      return { success: false, message: "Unauthorized to delete this resource." };
    }

    await prisma.resource.delete({
      where: { id }
    });

    revalidatePath('/resources');
    return { success: true, message: "Resource deleted successfully!" };
  } catch (error) {
    console.error("Delete Resource Error:", error);
    return { success: false, message: "Failed to delete resource." };
  }
}

export async function searchGoogleBooks(query: string) {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    const books = items.map((item: any) => {
      const volumeInfo = item.volumeInfo || {};
      return {
        title: volumeInfo.title || "Unknown Book Title",
        authors: volumeInfo.authors ? volumeInfo.authors.join(", ") : "Unknown Author",
        description: volumeInfo.description || "No description available from Google Books.",
        thumbnail: volumeInfo.imageLinks?.thumbnail || null,
      };
    });

    return { success: true, books };
  } catch (error: any) {
    console.error("Google Books Search Error:", error);
    return { success: false, books: [], message: error.message || "Failed to search books from Google API." };
  }
}