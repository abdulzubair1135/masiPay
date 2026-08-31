'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  createdAt: string | Date;
  warningMinutes?: number;
  lateMinutes?: number;
  className?: string;
}

export const OrderTimerBadge: React.FC<Props> = ({
  createdAt,
  warningMinutes = 10,
  lateMinutes = 20,
  className = '',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - created) / 1000)));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let dotColor = 'bg-emerald-500';

  if (minutes >= lateMinutes) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
    dotColor = 'bg-rose-500';
  } else if (minutes >= warningMinutes) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold shadow-2xs ${colorClasses} ${className}`}
      title={`Elapsed order time: ${formattedTime}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <Clock className="w-3.5 h-3.5" />
      <span>{formattedTime}</span>
    </div>
  );
};
