"use client";

import React from 'react';

interface CarpoolCardProps {
  post: any;
  currentUserId: string;
  onRequestJoin: (postId: string) => void;
  onViewDetails: (postId: string) => void;
}

export default function CarpoolCard({ post, currentUserId, onRequestJoin, onViewDetails }: CarpoolCardProps) {
  const isAuthor = post.authorId === currentUserId;
  const hasRequested = post.requests?.some((r: any) => r.userId === currentUserId);
  const isApproved = post.requests?.some((r: any) => r.userId === currentUserId && r.status === 'APPROVED');
  const approvedCount = post.requests?.filter((r: any) => r.status === 'APPROVED').length || 0;

  const transportIcons: Record<string, string> = {
    CNG: '🛺',
    RICKSHAW: '🚲',
    TAXI: '🚕',
    CAR: '🚗',
  };

  const farePerPerson = approvedCount > 0
    ? (post.estimatedFare / (approvedCount + 1)).toFixed(0)
    : post.estimatedFare.toFixed(0);

  const departureDate = new Date(post.departureTime);
  const isPast = departureDate < new Date();

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-5 transition-all hover:shadow-md ${isPast ? 'opacity-60 border-gray-200' : 'border-gray-100'}`}>
      {/* Header Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0f172a] text-white rounded-xl flex items-center justify-center text-lg font-bold">
            {post.author?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{post.author?.name}</p>
            <p className="text-[10px] text-gray-400 font-medium">{post.author?.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{transportIcons[post.transportMode] || '🚗'}</span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
            post.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
            post.status === 'MATCHED' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
            'bg-gray-100 text-gray-600'
          }`}>
            {post.status}
          </span>
        </div>
      </div>

      {/* Route */}
      <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">From</p>
          <p className="font-bold text-gray-900 text-sm">{post.origin}</p>
        </div>
        <div className="text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </div>
        <div className="flex-1 text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">To</p>
          <p className="font-bold text-gray-900 text-sm">{post.destination}</p>
        </div>
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="bg-amber-50 text-amber-800 border border-amber-100 font-bold px-2.5 py-1 rounded-lg">
          🕐 {departureDate.toLocaleDateString()} at {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="bg-green-50 text-green-800 border border-green-100 font-bold px-2.5 py-1 rounded-lg">
          💰 Tk {post.estimatedFare} total → ~Tk {farePerPerson}/person
        </span>
        <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 font-bold px-2.5 py-1 rounded-lg">
          👥 {approvedCount} joined
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isAuthor ? (
          <button
            onClick={() => onViewDetails(post.id)}
            className="flex-1 bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            Manage Ride
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        ) : isApproved ? (
          <button
            onClick={() => onViewDetails(post.id)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            Open Chat
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </button>
        ) : hasRequested ? (
          <button
            disabled
            className="flex-1 bg-gray-100 text-gray-500 font-bold py-2.5 px-4 rounded-xl text-xs cursor-not-allowed"
          >
            ⏳ Request Pending
          </button>
        ) : (
          <button
            onClick={() => onRequestJoin(post.id)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
          >
            🙋 Request to Join
          </button>
        )}
      </div>
    </div>
  );
}
