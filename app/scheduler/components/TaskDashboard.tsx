"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AcademicTask } from '@prisma/client';
import { getTasks, addTask, updateTask, deleteTask, toggleTaskCompletion } from '@/app/actions/scheduler';
import { sortTasksByUrgency } from '@/lib/urgency';
import TaskCard from './TaskCard';
import AddTaskModal from './AddTaskModal';

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AcademicTask | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const res = await getTasks();
    if (res.success && res.tasks) {
      setTasks(sortTasksByUrgency(res.tasks));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSaveTask = async (data: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask(data);
    }
    await loadTasks();
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    await loadTasks();
  };

  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    await toggleTaskCompletion(id, isCompleted);
    await loadTasks();
  };

  const openAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: AcademicTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-end mb-8 border-b pb-4 border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f172a]">Scheduler</h1>
          <p className="text-gray-500 mt-1">Track assignments, quizzes, and deadlines</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Add Task
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
          <div className="mt-6">
            <button onClick={openAddModal} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              New Task
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={openEditModal} 
              onDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        editingTask={editingTask}
      />
    </div>
  );
}
