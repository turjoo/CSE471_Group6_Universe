"use client";

import React, { useEffect, useState } from 'react';
import { calculateUrgency, UrgencyLevel } from '@/lib/urgency';

interface CountdownBadgeProps {
  dueAt: Date | string;
  isCompleted: boolean;
}

export default function CountdownBadge({ dueAt, isCompleted }: CountdownBadgeProps) {
  const [urgency, setUrgency] = useState<UrgencyLevel>('LOW');
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const dueDate = new Date(dueAt);
      const diffTime = dueDate.getTime() - now.getTime();
      
      setUrgency(calculateUrgency(dueDate, isCompleted));

      if (isCompleted) {
        setTimeLeftStr('Done');
        return;
      }

      if (diffTime < 0) {
        setTimeLeftStr('Overdue');
        return;
      }

      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffTime / 1000 / 60) % 60);

      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h`);
      } else {
        setTimeLeftStr(`${hours}h ${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dueAt, isCompleted]);

  const getBadgeStyle = () => {
    switch (urgency) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
      {timeLeftStr}
    </span>
  );
}
