"use client";

import React, { useState, useEffect } from 'react';
import { AcademicTask } from '@prisma/client';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingTask: AcademicTask | null;
}

export default function AddTaskModal({ isOpen, onClose, onSave, editingTask }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('ASSIGNMENT');
  const [course, setCourse] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setType(editingTask.type);
      setCourse(editingTask.course || '');
      // Format date for datetime-local input
      const date = new Date(editingTask.dueAt);
      const iso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setDueAt(iso);
      setNotes(editingTask.notes || '');
    } else {
      setTitle('');
      setType('ASSIGNMENT');
      setCourse('');
      setDueAt('');
      setNotes('');
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({
      title,
      type,
      course,
      dueAt: new Date(dueAt),
      notes
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Task Title</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              placeholder="e.g., Midterm Essay"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Type</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              >
                <option value="ASSIGNMENT">Assignment</option>
                <option value="QUIZ">Quiz</option>
                <option value="EXAM">Exam</option>
                <option value="PROJECT">Project</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Course (Optional)</label>
              <input 
                type="text" 
                value={course} 
                onChange={(e) => setCourse(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                placeholder="e.g., CSE471"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Due Date & Time</label>
            <input 
              type="datetime-local" 
              required 
              value={dueAt} 
              onChange={(e) => setDueAt(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Notes (Optional)</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 resize-none"
              placeholder="Add any extra details here..."
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
              {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
              {editingTask ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
