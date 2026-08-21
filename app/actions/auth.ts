"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  department: string;
  semester: number;
  currentCgpa: number;
}) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, message: "User with this email already exists!" };
    }

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        department: data.department,
        semester: data.semester,
        currentCgpa: data.currentCgpa,
      },
    });

    revalidatePath('/login');
    return { success: true, message: "Registration successful!" };
  } catch (error: any) {
    console.error("Registration Error:", error);
    return { success: false, message: `Registration failed: ${error?.message || "Unknown error"}` };
  }
}

export async function loginUser(data: { email: string; password: string }) {
  try {
    // 1. Query database for email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return { success: false, message: "User not found. Please register first." };
    }

    if (user.password !== data.password) {
      return { success: false, message: "Wrong password. Click 'Forgot password?' if you need help." };
    }

    // 2. Set user cookie asynchronously
    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, { path: '/' });

    return { success: true, message: "Login successful!" };
  } catch (error: any) {
    console.error("Detailed Login Error:", error);
    // Directly display the error message on screen
    return { 
      success: false, 
      message: error?.message ? `Database Error: ${error.message}` : "An error occurred during login." 
    };
  }
}