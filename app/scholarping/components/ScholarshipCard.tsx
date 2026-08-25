"use client";

import React, { useState } from 'react';
import { Scholarship } from '@prisma/client';
import CountdownBadge from '@/app/scheduler/components/CountdownBadge';
import { deleteScholarship } from '@/app/actions/scholarping';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  onRefresh: () => void;
}

export default function ScholarshipCard({ scholarship, onRefresh }: ScholarshipCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this scholarship?")) {
      setIsDeleting(true);
      await deleteScholarship(scholarship.id);
      setIsDeleting(false);
      onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md p-5 transition-all relative overflow-hidden group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900 leading-tight">
            {scholarship.title}
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase">
              Min CGPA: {scholarship.requirementCgpa.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase">
              {scholarship.department === 'ALL' ? 'All Majors' : scholarship.department}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100 uppercase">
              {scholarship.coverage}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CountdownBadge dueAt={scholarship.deadline} isCompleted={false} />
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
            title="Delete (Admin)"
          >
             {isDeleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              )}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
        {scholarship.description}
      </p>
      <div className="flex items-center justify-between text-xs pt-4 border-t border-gray-50">
        <span className="text-gray-400 font-medium">
          Deadline: {new Date(scholarship.deadline).toLocaleDateString()}
        </span>
        <button className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
          View Details →
        </button>
      </div>
    </div>
  );
}
