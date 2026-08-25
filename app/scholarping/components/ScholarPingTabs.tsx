"use client";

import React, { useState } from 'react';
import ScholarshipFeed from './ScholarshipFeed';
import GlobalSearchTab from './GlobalSearchTab';

export default function ScholarPingTabs() {
  const [activeTab, setActiveTab] = useState<'internal' | 'global'>('internal');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header & Tabs */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
              🎓
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">ScholarPing</h1>
              <p className="text-sm font-medium text-gray-500">Your personal scholarship matching engine</p>
            </div>
          </div>

          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl w-full max-w-sm">
            <button
              onClick={() => setActiveTab('internal')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition ${
                activeTab === 'internal'
                  ? 'bg-white text-emerald-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏛️ Internal Waivers
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition ${
                activeTab === 'global'
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🌍 Global AI Search
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6">
        {activeTab === 'internal' ? <ScholarshipFeed /> : <GlobalSearchTab />}
      </div>
    </div>
  );
}
