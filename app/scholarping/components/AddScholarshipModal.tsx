"use client";

import React, { useState } from 'react';
import { addScholarship } from '@/app/actions/scholarping';

interface AddScholarshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AddScholarshipModal({ isOpen, onClose, onRefresh }: AddScholarshipModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverage, setCoverage] = useState('Full Tuition');
  const [category, setCategory] = useState('MERIT');
  const [requirementCgpa, setRequirementCgpa] = useState('3.5');
  const [department, setDepartment] = useState('ALL');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    await addScholarship({
      title,
      description,
      coverage,
      category,
      requirementCgpa: parseFloat(requirementCgpa),
      department,
      deadline: new Date(deadline),
    });
    
    setLoading(false);
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Add New Scholarship</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Scholarship Title</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              placeholder="e.g., Dean's Merit Award"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Min CGPA Required</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="4.0"
                required 
                value={requirementCgpa} 
                onChange={(e) => setRequirementCgpa(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Eligible Major</label>
              <input 
                type="text" 
                required
                value={department} 
                onChange={(e) => setDepartment(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 uppercase"
                placeholder="ALL or CSE, BBA, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Coverage</label>
              <input 
                type="text" 
                required 
                value={coverage} 
                onChange={(e) => setCoverage(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                placeholder="e.g., 50% Tuition, 100% Tuition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Deadline</label>
              <input 
                type="datetime-local" 
                required 
                value={deadline} 
                onChange={(e) => setDeadline(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Description & Requirements</label>
            <textarea 
              required
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 resize-none"
              placeholder="Provide details about the scholarship..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Adding...' : 'Add Scholarship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
