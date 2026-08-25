"use client";

import React, { useState } from 'react';
import { AcademicTask } from '@prisma/client';
import CountdownBadge from './CountdownBadge';

interface TaskCardProps {
  task: AcademicTask;
  onEdit: (task: AcademicTask) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
}

export default function TaskCard({ task, onEdit, onDelete, onToggleComplete }: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(task.id);
    setIsDeleting(false);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    await onToggleComplete(task.id, !task.isCompleted);
    setIsToggling(false);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${task.isCompleted ? 'border-green-100 opacity-60 bg-gray-50' : 'border-gray-100 hover:shadow-md'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <input 
              type="checkbox" 
              checked={task.isCompleted} 
              onChange={handleToggle}
              disabled={isToggling}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                {task.type}
              </span>
              {task.course && (
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {task.course}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CountdownBadge dueAt={task.dueAt} isCompleted={task.isCompleted} />
          <div className="flex gap-2 text-gray-400">
            <button onClick={() => onEdit(task)} className="hover:text-indigo-600 transition" title="Edit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <button onClick={handleDelete} disabled={isDeleting} className="hover:text-red-600 transition" title="Delete">
              {isDeleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {task.notes && (
        <div className="mt-3 pl-8">
          <p className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-2">{task.notes}</p>
        </div>
      )}
      <div className="mt-2 pl-8 text-xs text-gray-400">
        Due: {new Date(task.dueAt).toLocaleString()}
      </div>
    </div>
  );
}
