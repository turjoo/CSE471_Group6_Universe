"use client";

import React, { useState } from 'react';

interface AIScholarship {
  title: string;
  country: string;
  degreeLevel: string;
  description: string;
  matchPercentage: number;
  deadline: string;
  url: string;
}

export default function GlobalSearchTab() {
  const [country, setCountry] = useState('USA');
  const [degreeLevel, setDegreeLevel] = useState('Master');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AIScholarship[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/scholarping/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, degreeLevel }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch scholarships');

      setResults(data.scholarships || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'Japan', 'Global/Any'];
  const degrees = ['Bachelor', 'Master', 'PhD', 'Post-Doc', 'Any'];

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🌍 Global AI Scholarship Search</h2>
        <p className="text-sm text-gray-500 mb-6">
          Powered by Gemini. We use your UniVerse profile (CGPA & Major) to find real-world external scholarships tailored just for you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Target Country</label>
            <select 
              value={country} 
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
            >
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Degree Level</label>
            <select 
              value={degreeLevel} 
              onChange={(e) => setDegreeLevel(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
            >
              {degrees.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              Search with AI
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold border border-red-100">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">✨ AI Matches for You</h3>
          <p className="text-xs text-amber-600 font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">
            ⚠️ <strong>Disclaimer:</strong> Deadlines and match percentages are AI estimates. Always verify exact deadlines and criteria on the official scholarship website.
          </p>

          <div className="grid grid-cols-1 gap-4 mt-4">
            {results.map((scholarship, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg leading-snug">{scholarship.title}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold px-2 py-1 rounded-md">
                        {scholarship.country}
                      </span>
                      <span className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold px-2 py-1 rounded-md">
                        {scholarship.degreeLevel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <div className={`text-xl font-black ${
                      scholarship.matchPercentage >= 80 ? 'text-green-500' :
                      scholarship.matchPercentage >= 60 ? 'text-amber-500' : 'text-gray-400'
                    }`}>
                      {scholarship.matchPercentage}%
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">AI Match</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {scholarship.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-xs font-bold text-gray-900">Est. Deadline: {scholarship.deadline}</span>
                  </div>
                  <a 
                    href={scholarship.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                  >
                    View Official Site →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
