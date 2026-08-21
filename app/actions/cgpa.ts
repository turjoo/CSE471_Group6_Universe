"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getCGPAData() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Unauthorized", user: null, courses: [], academicGoals: [] };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, department: true, semester: true, currentCgpa: true }
    });

    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: [{ semesterNumber: 'asc' }, { code: 'asc' }]
    });

    const academicGoals = await prisma.academicGoal.findMany({
      where: { userId },
      include: { simulatedCourses: true },
      orderBy: { semesterNumber: 'asc' }
    });

    return { success: true, user, courses, academicGoals };
  } catch (error) {
    console.error("CGPA Fetch Error:", error);
    return { success: false, message: "Failed to load CGPA data.", user: null, courses: [], academicGoals: [] };
  }
}

export async function saveSemesterGrades(courseGrades: { id: string; grade: string }[]) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    for (const item of courseGrades) {
      await prisma.course.update({
        where: { id: item.id },
        data: { grade: item.grade }
      });
    }

    revalidatePath('/cgpa-forecast');
    revalidatePath('/grade-sheet');
    revalidatePath('/dashboard');
    return { success: true, message: "Grades updated in official Grade Sheet!" };
  } catch (error) {
    console.error("Save Grades Error:", error);
    return { success: false, message: "Failed to save grades." };
  }
}

export async function saveAcademicGoal(data: {
  semesterNumber: number;
  currentCgpa: number;
  completedCredits: number;
  targetCgpa: number;
  upcomingCredits: number;
  requiredGpa: number;
  isPossible: boolean;
  courses: { name: string; credits: number; targetGrade: string }[];
}) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    await prisma.academicGoal.create({
      data: {
        userId,
        semesterNumber: data.semesterNumber,
        currentCgpa: data.currentCgpa,
        completedCredits: data.completedCredits,
        targetCgpa: data.targetCgpa,
        upcomingCredits: data.upcomingCredits,
        requiredGpa: data.requiredGpa,
        isPossible: data.isPossible,
        simulatedCourses: {
          create: data.courses
        }
      }
    });

    revalidatePath('/cgpa-forecast');
    return { success: true, message: "Academic goal saved!" };
  } catch (error) {
    console.error("Save Goal Error:", error);
    return { success: false, message: "Failed to save goal." };
  }
}