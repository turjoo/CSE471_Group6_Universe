"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPostDetails, approveJoinRequest } from '@/app/actions/carpool';
import CarpoolChat from '../components/CarpoolChat';

export default function CarpoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = async () => {
    setLoading(true);
    const res = await getPostDetails(postId);
    if (res.success) {
      setData(res);
    } else {
      router.push('/carpool');
    }
    setLoading(false);
  };

  useEffect(() => { loadDetails(); }, [postId]);

  const handleApprove = async (requestId: string) => {
    await approveJoinRequest(requestId);
    await loadDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    );
  }

  if (!data) return null;

  const { post, currentUserId, isAuthor, canChat } = data;

  const transportIcons: Record<string, string> = { CNG: '🛺', RICKSHAW: '🚲', TAXI: '🚕', CAR: '🚗' };
  const approvedRequests = post.requests?.filter((r: any) => r.status === 'APPROVED') || [];
  const pendingRequests = post.requests?.filter((r: any) => r.status === 'PENDING') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back button */}
        <Link href="/carpool" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Carpool Hub
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Ride Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Trip Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-gray-900">Trip Details</h2>
                <span className="text-2xl">{transportIcons[post.transportMode] || '🚗'}</span>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">From</p>
                  <p className="font-bold text-gray-900">{post.origin}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">To</p>
                  <p className="font-bold text-gray-900">{post.destination}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Departure</p>
                    <p className="font-bold text-gray-900 text-sm">{new Date(post.departureTime).toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-green-600 uppercase">Total Fare</p>
                    <p className="font-bold text-gray-900">Tk {post.estimatedFare}</p>
                  </div>
                </div>
              </div>

              {/* Author */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#0f172a] text-white rounded-xl flex items-center justify-center font-bold text-sm">
                  {post.author?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{post.author?.name}</p>
                  <p className="text-xs text-gray-400">{post.author?.email}</p>
                </div>
              </div>
            </div>

            {/* Join Requests (only for author) */}
            {isAuthor && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-3">
                  Join Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingRequests.length} pending</span>
                  )}
                </h3>

                {pendingRequests.length === 0 && approvedRequests.length === 0 && (
                  <p className="text-sm text-gray-400">No requests yet.</p>
                )}

                {pendingRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">
                        {req.user?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{req.user?.name}</p>
                    </div>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Approve ✓
                    </button>
                  </div>
                ))}

                {approvedRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-700">
                        {req.user?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{req.user?.name}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">✓ Approved</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-3">
            {canChat ? (
              <CarpoolChat
                postId={postId}
                currentUserId={currentUserId}
                initialMessages={post.messages?.map((m: any) => ({
                  id: m.id,
                  content: m.content,
                  createdAt: m.createdAt,
                  user: { id: m.user.id, name: m.user.name },
                })) || []}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center h-full flex items-center justify-center">
                <div>
                  <span className="text-4xl">🔒</span>
                  <h3 className="mt-3 font-bold text-gray-900">Chat Locked</h3>
                  <p className="text-sm text-gray-500 mt-1">The author needs to approve your request to unlock the chat.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
