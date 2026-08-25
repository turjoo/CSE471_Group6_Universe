import React from 'react';
import ScholarPingTabs from './components/ScholarPingTabs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ScholarPingPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/login');
  }

  return (
    <div className="bg-white">
      <ScholarPingTabs />
    </div>
  );
}
