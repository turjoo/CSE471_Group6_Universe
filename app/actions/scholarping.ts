"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { findMatches } from '@/lib/scholarping/matching';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

// Helper to get the logged in user
async function getUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return null;

  return await prisma.user.findUnique({ where: { id: userId } });
}

export async function getMatchedScholarships() {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, message: "User not logged in" };
    }

    // Get all active scholarships
    const allScholarships = await prisma.scholarship.findMany({
      where: { isActive: true },
      orderBy: { deadline: 'asc' },
    });

    // Run matching engine
    const matched = findMatches(allScholarships, user);

    return { success: true, scholarships: matched, user };
  } catch (error: any) {
    console.error("Failed to fetch scholarships:", error);
    return { success: false, message: "Failed to fetch scholarships" };
  }
}

export async function addScholarship(data: {
  title: string;
  description: string;
  coverage: string;
  category: string;
  requirementCgpa: number;
  department: string;
  deadline: Date;
}) {
  try {
    // Generate a unique ID for the scholarship since it's a String @id but missing @default(cuid()) in schema
    // Wait, let me check schema again. `id String @id` without default. I'll use crypto.randomUUID().
    const crypto = require('crypto');
    const id = crypto.randomUUID();

    const scholarship = await prisma.scholarship.create({
      data: {
        id,
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/scholarping');
    return { success: true, scholarship };
  } catch (error: any) {
    console.error("Failed to add scholarship:", error);
    return { success: false, message: "Failed to add scholarship" };
  }
}

export async function deleteScholarship(id: string) {
  try {
    await prisma.scholarship.delete({ where: { id } });
    revalidatePath('/scholarping');
    return { success: true, message: "Scholarship deleted" };
  } catch (error: any) {
    console.error("Failed to delete scholarship:", error);
    return { success: false, message: "Failed to delete scholarship" };
  }
}
