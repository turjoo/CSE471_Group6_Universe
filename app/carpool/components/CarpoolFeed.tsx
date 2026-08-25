"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { getCarpoolPosts, requestToJoin } from '@/app/actions/carpool';
import CarpoolCard from './CarpoolCard';
import CreateCarpoolModal from './CreateCarpoolModal';
import { useRouter } from 'next/navigation';

export default function CarpoolFeed() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const res = await getCarpoolPosts();
    if (res.success) {
      setPosts(res.posts || []);
      setCurrentUserId(res.currentUserId || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleRequestJoin = async (postId: string) => {
    setJoiningId(postId);
    const res = await requestToJoin(postId);
    if (!res.success) alert(res.message);
    await loadPosts();
    setJoiningId(null);
  };

  const handleViewDetails = (postId: string) => {
    router.push(`/carpool/${postId}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b pb-4 border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f172a]">🚗 Campus Carpool Hub</h1>
          <p className="text-gray-500 mt-1">Find students heading your way and split the fare</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Post a Ride
        </button>
      </div>

      {/* How it works banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <span className="text-2xl">📋</span>
          <p className="font-bold text-indigo-900 mt-1">Post Your Trip</p>
          <p className="text-indigo-600">Share your route & fare</p>
        </div>
        <div>
          <span className="text-2xl">🙋</span>
          <p className="font-bold text-indigo-900 mt-1">Students Join</p>
          <p className="text-indigo-600">Request to hop along</p>
        </div>
        <div>
          <span className="text-2xl">💬</span>
          <p className="font-bold text-indigo-900 mt-1">Chat & Split</p>
          <p className="text-indigo-600">Coordinate and save money</p>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <span className="text-5xl">🛺</span>
          <h3 className="mt-3 text-sm font-semibold text-gray-900">No rides posted yet</h3>
          <p className="mt-1 text-sm text-gray-500">Be the first to post a ride and find travel companions!</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Post a Ride
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map(post => (
            <CarpoolCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onRequestJoin={handleRequestJoin}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      <CreateCarpoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={loadPosts}
      />
    </div>
  );
}
