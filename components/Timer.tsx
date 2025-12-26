'use client';

import { useEffect, useState, useRef } from 'react';
import { Square } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Activity } from '@/lib/types';

interface TimerProps {
  activity: Activity;
  onStop: (timeSpent: number) => void;
  isActive: boolean;
  isFullScreen?: boolean;
}

export default function Timer({ activity, onStop, isActive, isFullScreen = false }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer when activity changes
  useEffect(() => {
    setElapsed(0);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [activity.id]);

  // Auto-start when activity becomes active
  useEffect(() => {
    if (isActive) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStop = () => {
    setIsRunning(false);
    onStop(elapsed);
  };

  const isOverTime = elapsed > activity.timeAllotted;
  const timeColor = isOverTime ? 'text-red-600' : elapsed >= activity.timeAllotted * 0.9 ? 'text-yellow-600' : 'text-green-600';
  const bgColor = isOverTime ? 'bg-red-50' : elapsed >= activity.timeAllotted * 0.9 ? 'bg-yellow-50' : 'bg-green-50';

  return (
    <div className={`flex flex-col items-center justify-center ${isFullScreen ? 'space-y-12 p-12 w-full' : 'space-y-6 p-8 rounded-2xl'} ${bgColor} transition-colors`}>
      <div className={`font-mono font-bold ${timeColor} transition-colors drop-shadow-lg ${isFullScreen ? 'text-[20rem] xl:text-[25rem]' : 'text-7xl md:text-9xl lg:text-[12rem]'}`}>
        {formatTime(elapsed)}
      </div>
      
      <div className={`${isFullScreen ? 'text-3xl' : 'text-lg'} text-gray-600`}>
        Allotted: {formatTime(activity.timeAllotted)}
      </div>

      {isOverTime && (
        <div className={`${isFullScreen ? 'text-4xl' : 'text-xl'} font-semibold text-red-600`}>
          Over by: {formatTime(elapsed - activity.timeAllotted)}
        </div>
      )}

      {!isOverTime && elapsed > 0 && (
        <div className={`${isFullScreen ? 'text-4xl' : 'text-xl'} font-semibold text-green-600`}>
          Remaining: {formatTime(activity.timeAllotted - elapsed)}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleStop}
          className={`flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-colors ${isFullScreen ? 'py-4 px-12 text-2xl' : 'py-3 px-8 text-lg'}`}
        >
          <Square className={isFullScreen ? 'w-6 h-6' : 'w-5 h-5'} />
          Stop Activity
        </button>
      </div>
    </div>
  );
}

