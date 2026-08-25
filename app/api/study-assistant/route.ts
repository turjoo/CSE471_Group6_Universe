import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { cookies } from 'next/headers';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are StudyBot, an expert AI Study Assistant for university students at BRAC University (UniVerse platform).
You help students with:
1. Answering academic questions clearly and accurately
2. Summarizing long notes into concise bullet points
3. Generating flashcard Q&A pairs from topics or text

Always be clear, structured, and student-friendly. Use bullet points and numbered lists where appropriate.
When generating flashcards, output them as a JSON array like:
[{"question": "...", "answer": "..."}]
Always mark when you're returning flashcards by starting the response with FLASHCARDS_JSON:`;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message, mode, history } = await request.json();

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    // Build conversation history for context
    const contents = [
      ...(history || []).map((h: any) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    // Mode-specific instruction prefixes
    const modePrefix: Record<string, string> = {
      chat: '',
      summarize: 'Please summarize the following notes into clear, concise bullet points with key takeaways:\n\n',
      flashcards: 'Generate 5-8 study flashcards as a JSON array (format: FLASHCARDS_JSON:[{"question":"...","answer":"..."}]) from this topic or text:\n\n',
    };

    const finalContents = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I am StudyBot, ready to help you learn.' }],
      },
      ...contents.slice(0, -1),
      {
        role: 'user',
        parts: [{ text: (modePrefix[mode] || '') + message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: finalContents,
    });

    const text = response.text ?? '';

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: `AI service error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
