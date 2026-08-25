import React from 'react';
import TaskDashboard from './components/TaskDashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SchedulerPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-white">
      <TaskDashboard />
    </div>
  );
}
