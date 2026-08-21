"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getAttendanceData() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Unauthorized", user: null, courses: [] };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, department: true, semester: true, currentCgpa: true }
    });

    const courses = await prisma.course.findMany({
      where: { userId },
      include: {
        attendanceLogs: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, user, courses };
  } catch (error) {
    console.error("Attendance Fetch Error:", error);
    return { success: false, message: "Error fetching data", user: null, courses: [] };
  }
}

export async function addCourse(data: { 
  code: string; 
  title: string; 
  section: string; 
  credits: number; 
  semesterNumber: number;
  classDays: string;
  startTime: string;
  endTime: string;
}) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Please log in first." };
    }

    await prisma.course.create({
      data: {
        userId,
        code: data.code.toUpperCase(),
        title: data.title,
        section: data.section,
        credits: data.credits,
        semesterNumber: data.semesterNumber,
        classDays: data.classDays,
        startTime: data.startTime,
        endTime: data.endTime,
      }
    });

    revalidatePath('/attendance');
    revalidatePath('/dashboard');
    revalidatePath('/cgpa-forecast');
    revalidatePath('/grade-sheet');
    return { success: true, message: "Course added successfully!" };
  } catch (error) {
    console.error("Add Course Error:", error);
    return { success: false, message: "Failed to add course." };
  }
}

export async function logAttendance(data: { courseId: string; status: 'PRESENT' | 'ABSENT'; date: string }) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const course = await prisma.course.findUnique({
      where: { id: data.courseId }
    });

    if (!course) {
      return { success: false, message: "Course not found." };
    }

    const targetDate = new Date(data.date);
    
    // Find if there is already an attendance log for this date and course
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        courseId: data.courseId,
        date: targetDate
      }
    });

    if (existingRecord) {
      if (existingRecord.status === data.status) {
        // Toggle off: if clicked the same status, remove the log
        await prisma.attendanceRecord.delete({
          where: { id: existingRecord.id }
        });

        const wasPresent = existingRecord.status === 'PRESENT';
        await prisma.course.update({
          where: { id: data.courseId },
          data: {
            totalClasses: Math.max(0, course.totalClasses - 1),
            attendedClasses: wasPresent ? Math.max(0, course.attendedClasses - 1) : course.attendedClasses,
            missedClasses: !wasPresent ? Math.max(0, course.missedClasses - 1) : course.missedClasses,
          }
        });

        revalidatePath('/attendance');
        revalidatePath('/dashboard');
        return { success: true, message: "Attendance unmarked successfully!" };
      } else {
        // Change status: update record and adjust counts without changing totalClasses
        await prisma.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: { status: data.status }
        });

        const isNowPresent = data.status === 'PRESENT';
        await prisma.course.update({
          where: { id: data.courseId },
          data: {
            attendedClasses: isNowPresent ? course.attendedClasses + 1 : Math.max(0, course.attendedClasses - 1),
            missedClasses: isNowPresent ? Math.max(0, course.missedClasses - 1) : course.missedClasses + 1,
          }
        });

        revalidatePath('/attendance');
        revalidatePath('/dashboard');
        return { success: true, message: `Changed attendance to ${data.status}!` };
      }
    } else {
      // Create new record
      await prisma.attendanceRecord.create({
        data: {
          courseId: data.courseId,
          status: data.status,
          date: targetDate,
        }
      });

      const isPresent = data.status === 'PRESENT';
      await prisma.course.update({
        where: { id: data.courseId },
        data: {
          totalClasses: course.totalClasses + 1,
          attendedClasses: isPresent ? course.attendedClasses + 1 : course.attendedClasses,
          missedClasses: !isPresent ? course.missedClasses + 1 : course.missedClasses,
        }
      });

      revalidatePath('/attendance');
      revalidatePath('/dashboard');
      return { success: true, message: `Logged attendance as ${data.status}!` };
    }
  } catch (error) {
    console.error("Log Attendance Error:", error);
    return { success: false, message: "Failed to log attendance." };
  }
}