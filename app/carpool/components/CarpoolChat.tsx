"use client";

import React, { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface CarpoolChatProps {
  postId: string;
  currentUserId: string;
  initialMessages: Message[];
}

export default function CarpoolChat({ postId, currentUserId, initialMessages }: CarpoolChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to Pusher channel
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });

    const channel = pusher.subscribe(`private-carpool-${postId}`);

    channel.bind('new-message', (data: Message) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-carpool-${postId}`);
      pusher.disconnect();
    };
  }, [postId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const content = input.trim();
    setInput('');

    await fetch('/api/carpool/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, postId }),
    });

    setSending(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <h3 className="font-bold text-sm text-gray-900">Live Ride Chat</h3>
        <span className="text-xs text-gray-400">• End-to-end secured channel</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-gray-400 text-sm">No messages yet.</p>
              <p className="text-gray-300 text-xs mt-1">Be the first to say hi! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user.id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && (
                    <span className="text-[10px] font-bold text-gray-400 ml-1">{msg.user.name}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm font-medium ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-300 mx-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
