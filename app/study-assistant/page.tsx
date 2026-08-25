"use client";

import React, { useState, useRef, useEffect } from 'react';

type Mode = 'chat' | 'summarize' | 'flashcards';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface Flashcard {
  question: string;
  answer: string;
}

export default function StudyAssistantPage() {
  const [mode, setMode] = useState<Mode>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/study-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          mode,
          history: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      const responseText: string = data.response;

      // Parse flashcards if in flashcard mode
      if (mode === 'flashcards' && responseText.includes('FLASHCARDS_JSON:')) {
        try {
          const jsonStr = responseText.replace('FLASHCARDS_JSON:', '').trim();
          const parsed: Flashcard[] = JSON.parse(jsonStr);
          setFlashcards(parsed);
          setFlippedCards(new Set());
          setMessages([...newMessages, { role: 'model', content: `Generated ${parsed.length} flashcards for you! 🃏` }]);
        } catch {
          setMessages([...newMessages, { role: 'model', content: responseText }]);
        }
      } else {
        setMessages([...newMessages, { role: 'model', content: responseText }]);
        if (mode === 'flashcards') setFlashcards([]);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const toggleFlip = (index: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const clearChat = () => {
    setMessages([]);
    setFlashcards([]);
    setFlippedCards(new Set());
    setError('');
  };

  const modeConfig = {
    chat: { label: '💬 Chat', placeholder: 'Ask any academic question...', color: 'indigo' },
    summarize: { label: '📝 Summarize', placeholder: 'Paste your notes or text to summarize...', color: 'emerald' },
    flashcards: { label: '🃏 Flashcards', placeholder: 'Enter a topic or paste text to generate flashcards...', color: 'amber' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#0f172a]">🤖 AI Study Assistant</h1>
          <p className="text-gray-500 mt-1">Powered by Google Gemini — Ask questions, summarize notes, generate flashcards</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
          {(Object.keys(modeConfig) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); clearChat(); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition ${
                mode === m
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {modeConfig[m].label}
            </button>
          ))}
        </div>

        {/* Chat Window */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="min-h-[350px] max-h-[450px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <span className="text-5xl mb-3">
                  {mode === 'chat' ? '💬' : mode === 'summarize' ? '📝' : '🃏'}
                </span>
                <p className="font-bold text-gray-700">
                  {mode === 'chat' && 'Ask me anything academic!'}
                  {mode === 'summarize' && 'Paste your notes below'}
                  {mode === 'flashcards' && 'Enter a topic to generate flashcards'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {mode === 'chat' && 'Questions, concepts, explanations — I\'ve got you covered'}
                  {mode === 'summarize' && 'I\'ll turn long text into clear, concise bullet points'}
                  {mode === 'flashcards' && 'I\'ll create interactive Q&A cards to help you study'}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0f172a] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  {msg.role === 'model' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-bold text-indigo-500">🤖 StudyBot</span>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 font-semibold">
                ⚠️ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder={modeConfig[mode].placeholder}
                rows={mode === 'summarize' ? 3 : 1}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 resize-none"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  ) : 'Send'}
                </button>
                {messages.length > 0 && (
                  <button type="button" onClick={clearChat} className="text-xs text-gray-400 hover:text-gray-600 transition text-center">
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Flashcards Grid */}
        {flashcards.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3 text-lg">🃏 Your Flashcards <span className="text-sm font-normal text-gray-400">(click to flip)</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {flashcards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => toggleFlip(i)}
                  className={`cursor-pointer rounded-2xl border p-5 min-h-[120px] flex items-center justify-center text-center transition-all hover:shadow-md ${
                    flippedCards.has(i)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-900 border-gray-100'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 block ${flippedCards.has(i) ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {flippedCards.has(i) ? '✓ Answer' : '? Question'}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed">
                      {flippedCards.has(i) ? card.answer : card.question}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
