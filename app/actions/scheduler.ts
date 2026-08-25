"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Helper to get the logged in user ID
async function getUserId() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  return userId;
}

export async function getTasks() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "User not logged in" };
    }

    const tasks = await prisma.academicTask.findMany({
      where: { userId },
      orderBy: { dueAt: 'asc' },
    });

    return { success: true, tasks };
  } catch (error: any) {
    console.error("Failed to fetch tasks:", error);
    return { success: false, message: "Failed to fetch tasks" };
  }
}

export async function addTask(data: {
  title: string;
  type: string;
  course?: string;
  dueAt: Date;
  notes?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "User not logged in" };
    }

    const task = await prisma.academicTask.create({
      data: {
        userId,
        title: data.title,
        type: data.type,
        course: data.course || null,
        dueAt: data.dueAt,
        notes: data.notes || null,
      },
    });

    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to add task:", error);
    return { success: false, message: "Failed to add task" };
  }
}

export async function updateTask(id: string, data: {
  title: string;
  type: string;
  course?: string;
  dueAt: Date;
  notes?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "User not logged in" };
    }

    // Verify ownership
    const existing = await prisma.academicTask.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return { success: false, message: "Task not found or unauthorized" };
    }

    const task = await prisma.academicTask.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        course: data.course || null,
        dueAt: data.dueAt,
        notes: data.notes || null,
      },
    });

    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to update task:", error);
    return { success: false, message: "Failed to update task" };
  }
}

export async function deleteTask(id: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "User not logged in" };
    }

    const existing = await prisma.academicTask.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return { success: false, message: "Task not found or unauthorized" };
    }

    await prisma.academicTask.delete({ where: { id } });

    return { success: true, message: "Task deleted successfully" };
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return { success: false, message: "Failed to delete task" };
  }
}

export async function toggleTaskCompletion(id: string, isCompleted: boolean) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "User not logged in" };
    }

    const existing = await prisma.academicTask.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return { success: false, message: "Task not found or unauthorized" };
    }

    const task = await prisma.academicTask.update({
      where: { id },
      data: { isCompleted },
    });

    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to toggle task:", error);
    return { success: false, message: "Failed to toggle task completion" };
  }
}
