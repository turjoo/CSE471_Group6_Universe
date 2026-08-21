"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function getDashboardData() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Unauthorized", user: null, courses: [], latestGoal: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        semester: true,
        currentCgpa: true,
      },
    });

    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const latestGoal = await prisma.academicGoal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch budget and expenses for the dashboard summary
    const currentDate = new Date();
    const targetMonth = currentDate.getMonth() + 1;
    const targetYear = currentDate.getFullYear();

    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: targetMonth,
          year: targetYear
        }
      }
    });

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { 
      success: true, 
      user, 
      courses, 
      latestGoal,
      currentBudget: budget ? budget.amount : 0,
      currentSpent: totalSpent
    };
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    return { 
      success: false, 
      message: "Failed to load dashboard data.", 
      user: null, 
      courses: [], 
      latestGoal: null,
      currentBudget: 0,
      currentSpent: 0
    };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('userId');
  return { success: true };
}