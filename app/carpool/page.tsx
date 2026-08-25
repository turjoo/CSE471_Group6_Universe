import React from 'react';
import CarpoolFeed from './components/CarpoolFeed';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CarpoolPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-white">
      <CarpoolFeed />
    </div>
  );
}
