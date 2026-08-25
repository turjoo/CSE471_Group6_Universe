"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Scholarship, User } from '@prisma/client';
import { getMatchedScholarships } from '@/app/actions/scholarping';
import ScholarshipCard from './ScholarshipCard';
import AddScholarshipModal from './AddScholarshipModal';

export default function ScholarshipFeed() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadScholarships = useCallback(async () => {
    setLoading(true);
    const res = await getMatchedScholarships();
    if (res.success) {
      setScholarships(res.scholarships || []);
      setUser(res.user || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-end items-end mb-4 border-b pb-4 border-gray-200">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Add Internal Waiver
        </button>
      </div>

      {user && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex justify-between items-center text-sm">
          <div>
            <span className="text-gray-600 font-medium">Matching Profile: </span>
            <strong className="text-indigo-900">{user.department} Major</strong>
          </div>
          <div>
            <span className="text-gray-600 font-medium">CGPA: </span>
            <strong className="text-indigo-900">{user.currentCgpa.toFixed(2)}</strong>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : scholarships.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No matches right now</h3>
          <p className="mt-1 text-sm text-gray-500">We couldn't find any scholarships matching your CGPA and Major.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {scholarships.map(scholarship => (
            <ScholarshipCard 
              key={scholarship.id} 
              scholarship={scholarship} 
              onRefresh={loadScholarships}
            />
          ))}
        </div>
      )}

      <AddScholarshipModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={loadScholarships}
      />
    </div>
  );
}
