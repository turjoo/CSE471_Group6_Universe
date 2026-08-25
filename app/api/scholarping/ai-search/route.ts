import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's basic info for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentCgpa: true, department: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { country, degreeLevel } = await request.json();

    const SYSTEM_PROMPT = `You are a Global Scholarship Search Engine. 
You will be provided with a student's profile (CGPA, Major, desired Country, and Degree Level).
Find 4 real-world scholarships that closely match their profile.

Return the result STRICTLY as a JSON array (do not include markdown code blocks like \`\`\`json). 
Each object in the array must have the following exact keys:
- title: (string) The name of the scholarship
- country: (string) The country it is located in
- degreeLevel: (string) E.g., 'Bachelor', 'Master', 'PhD', or 'All'
- description: (string) A concise 2-sentence summary of the coverage and criteria
- matchPercentage: (number) Estimated match percentage (0-100) based on their CGPA and major
- deadline: (string) Estimated deadline (e.g., 'March 2027' or 'Rolling')
- url: (string) A URL to find more information (or a Google search URL if unknown)`;

    const prompt = `Student Profile:
- Current CGPA: ${user.currentCgpa}
- Major/Department: ${user.department}
- Desired Study Country: ${country}
- Desired Degree Level: ${degreeLevel}

Please provide 4 relevant real-world scholarships matching these criteria as a raw JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will provide a strict JSON array matching those keys.' }] },
        { role: 'user', parts: [{ text: prompt }] }
      ],
    });

    let textResponse = response.text ?? '[]';
    // Clean up potential markdown formatting
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const scholarships = JSON.parse(textResponse);

    return NextResponse.json({ scholarships });

  } catch (error: any) {
    console.error('AI Scholarship Search Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate scholarships from AI.' },
      { status: 500 }
    );
  }
}
