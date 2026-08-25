"use client";

import React, { useState } from 'react';
import { createCarpoolPost } from '@/app/actions/carpool';

interface CreateCarpoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CreateCarpoolModal({ isOpen, onClose, onRefresh }: CreateCarpoolModalProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [transportMode, setTransportMode] = useState('CNG');
  const [estimatedFare, setEstimatedFare] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await createCarpoolPost({
      origin,
      destination,
      departureTime: new Date(departureTime),
      transportMode,
      estimatedFare: parseFloat(estimatedFare),
    });

    setLoading(false);

    if (res.success) {
      setOrigin(''); setDestination(''); setDepartureTime('');
      setTransportMode('CNG'); setEstimatedFare('');
      onRefresh();
      onClose();
    } else {
      setError(res.message || 'Something went wrong');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Post a Ride</h3>
            <p className="text-xs text-gray-500 mt-0.5">Share your trip and find students to split the fare</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 font-semibold">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">From (Origin)</label>
              <input
                type="text" required value={origin} onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                placeholder="e.g., BRACU Gate"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">To (Destination)</label>
              <input
                type="text" required value={destination} onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                placeholder="e.g., Mirpur 10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Departure Time</label>
            <input
              type="datetime-local" required value={departureTime} onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Transport Mode</label>
              <select
                value={transportMode} onChange={(e) => setTransportMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              >
                <option value="CNG">🛺 CNG</option>
                <option value="RICKSHAW">🚲 Rickshaw</option>
                <option value="TAXI">🚕 Taxi</option>
                <option value="CAR">🚗 Car</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Total Fare (Tk)</label>
              <input
                type="number" required min="1" value={estimatedFare} onChange={(e) => setEstimatedFare(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                placeholder="e.g., 300"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2">
              {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
              {loading ? 'Posting...' : 'Post Ride 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
