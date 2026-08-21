'use server';

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Groq from 'groq-sdk';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Groq Client Initialization 
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

export async function getBudgetData(month?: number, year?: number) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized", user: null, budget: null, expenses: [] };
    }

    const currentDate = new Date();
    const targetMonth = month !== undefined ? month : currentDate.getMonth() + 1;
    const targetYear = year !== undefined ? year : currentDate.getFullYear();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, department: true, semester: true, currentCgpa: true }
    });

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
      },
      orderBy: { date: 'desc' }
    });

    return { success: true, user, budget, expenses, month: targetMonth, year: targetYear };
  } catch (error) {
    console.error("Budget Fetch Error:", error);
    return { success: false, message: "Error fetching budget data", user: null, budget: null, expenses: [] };
  }
}

export async function updateBudget(amount: number, month: number, year: number) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return { success: false, message: "Invalid budget amount." };
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return { success: false, message: "User record not found in database. Please log in again." };
    }

    const existingBudget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year
        }
      }
    });

    if (existingBudget) {
      await prisma.budget.update({
        where: { id: existingBudget.id },
        data: { amount: parsedAmount }
      });
    } else {
      await prisma.budget.create({
        data: {
          userId,
          amount: parsedAmount,
          month,
          year
        }
      });
    }

    revalidatePath('/budget');
    revalidatePath('/dashboard');
    return { success: true, message: "Budget updated successfully!" };
  } catch (error) {
    console.error("Update Budget Error:", error);
    return { success: false, message: "Failed to update budget limit." };
  }
}

export async function addExpense(data: { amount: number; category: string; description?: string; date: string }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    await prisma.expense.create({
      data: {
        userId,
        amount: Number(data.amount),
        category: (data.category || 'OTHER').toUpperCase(),
        description: data.description || "",
        date: data.date ? new Date(data.date) : new Date()
      }
    });

    revalidatePath('/budget');
    revalidatePath('/dashboard');
    return { success: true, message: "Expense logged successfully!" };
  } catch (error) {
    console.error("Add Expense Error:", error);
    return { success: false, message: "Failed to log expense." };
  }
}

export async function deleteExpense(id: string) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, message: "Unauthorized" };
    }

    const expense = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!expense) {
      return { success: false, message: "Expense not found." };
    }

    await prisma.expense.delete({
      where: { id }
    });

    revalidatePath('/budget');
    revalidatePath('/dashboard');
    return { success: true, message: "Expense deleted successfully!" };
  } catch (error) {
    console.error("Delete Expense Error:", error);
    return { success: false, message: "Failed to delete expense." };
  }
}

export interface AIInsightCard {
  title: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  icon: string;
  message: string;
}

export async function getAISpendingInsights(month: number, year: number) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, insights: [], shortageForecast: null };
    }

    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year
        }
      }
    });

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const totalBudget = budget?.amount || 0;
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = totalBudget - totalSpent;

    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const currentDay = today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : daysInMonth;

    const dailyAverage = currentDay > 0 ? totalSpent / currentDay : 0;
    const projectedTotal = dailyAverage * daysInMonth;

    let shortageForecastText = "";
    let shortageType: 'success' | 'warning' | 'danger' | 'info' = 'success';

    if (totalBudget === 0) {
      shortageForecastText = "Please set a monthly budget limit to enable AI shortage forecasting.";
      shortageType = 'info';
    } else {
      shortageForecastText = `Based on your daily average spend of Tk ${dailyAverage.toFixed(2)}, your projected total spend is Tk ${projectedTotal.toFixed(2)}. ${
        projectedTotal > totalBudget 
          ? `You are projected to face a budget shortage of Tk ${(projectedTotal - totalBudget).toFixed(2)} by month end.` 
          : `You are on track to stay within your budget limit!`
      }`;
      shortageType = remaining < 0 ? 'danger' : (projectedTotal > totalBudget ? 'warning' : 'success');
    }

    const categoryTotals: { [key: string]: number } = {
      FOOD: 0,
      TRANSIT: 0,
      PRINTING: 0,
      ACADEMIC: 0,
      ENTERTAINMENT: 0,
      OTHER: 0
    };

    expenses.forEach(e => {
      const cat = (e.category || 'OTHER').toUpperCase();
      if (categoryTotals[cat] !== undefined) {
        categoryTotals[cat] += e.amount;
      } else {
        categoryTotals['OTHER'] += e.amount;
      }
    });

    const insights: AIInsightCard[] = [];

    try {
      const recommendationPrompt = `Act as a concise AI finance mentor for a university student. Here is their current spending summary:
      - Budget: Tk ${totalBudget}
      - Spent So Far: Tk ${totalSpent}
      - Food: Tk ${categoryTotals['FOOD']}
      - Transit: Tk ${categoryTotals['TRANSIT']}
      - Academic & Printing: Tk ${categoryTotals['PRINTING'] + categoryTotals['ACADEMIC']}
      - Entertainment: Tk ${categoryTotals['ENTERTAINMENT']}

      Give a short, friendly, and direct recommendation in 2 to 3 sentences on how they should manage or adjust these specific expenses.`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: recommendationPrompt }],
        temperature: 0.6,
        max_tokens: 250,
      });

      const recommendationText = completion.choices[0]?.message?.content || "Keep an eye on your daily food and transit expenses to stay on track.";

      insights.push({
        title: "AI Savings Recommendations",
        type: shortageType,
        icon: "💡",
        message: recommendationText
      });
    } catch (err: any) {
      console.error("Groq Recommendation Error:", err);
      insights.push({
        title: "AI Savings Recommendations",
        type: "warning",
        icon: "💡",
        message: `You have spent Tk ${totalSpent} out of your Tk ${totalBudget} budget. Try to optimize your major spending categories.`
      });
    }

    return {
      success: true,
      insights,
      shortageForecast: {
        dailyAverage,
        projectedTotal,
        projectedShortage: projectedTotal > totalBudget ? projectedTotal - totalBudget : 0,
        text: shortageForecastText,
        type: shortageType
      }
    };
  } catch (error) {
    console.error("AI Insights Error:", error);
    return { success: false, insights: [], shortageForecast: null };
  }
}