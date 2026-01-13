'use client';

import { useEffect, useState, useRef } from 'react';
import { Square, ChevronRight, Play } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Activity } from '@/lib/types';

interface TimerProps {
  activity: Activity;
  onStop: (timeSpent: number) => void;
  isActive: boolean;
  isFullScreen?: boolean;
  backgroundStyle?: React.CSSProperties;
  onNextActivity?: () => void;
  onStartNext?: () => void;
  hasNextActivity?: boolean;
  isStoppingActivity?: boolean;
  isStartingActivity?: boolean;
}

export default function Timer({ 
  activity, 
  onStop, 
  isActive, 
  isFullScreen = false, 
  backgroundStyle,
  onNextActivity,
  onStartNext,
  hasNextActivity = false,
  isStoppingActivity = false,
  isStartingActivity = false,
}: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // Hide overlay when activity becomes inactive (stopped)
      setShowOverlay(false);
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
    // Prevent double-stops
    if (!isRunning) return;
    
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onStop(elapsed);
  };

  const isOverTime = elapsed > activity.timeAllotted;
  const isYellowState = elapsed >= activity.timeAllotted * 0.9;
  const timeColor = isOverTime ? 'text-red-600' : isYellowState ? 'text-yellow-600' : 'text-green-600';
  
  // Use gradient background if provided, otherwise use status-based background
  const defaultBgColor = isOverTime ? 'bg-red-50' : isYellowState ? 'bg-yellow-50' : 'bg-green-50';
  const bgStyle = backgroundStyle || {};
  
  // Only apply gradient if backgroundStyle is provided, otherwise use default status colors
  const shouldUseGradient = backgroundStyle && Object.keys(backgroundStyle).length > 0;

  // Show overlay when in yellow state (90% of time or over)
  useEffect(() => {
    if (isYellowState && isRunning) {
      setShowOverlay(true);
      // Auto-hide after 4 seconds of inactivity
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 4000);
    } else if (!isYellowState) {
      setShowOverlay(false);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isYellowState, isRunning]);

  // Handle mouse movement to show overlay
  useEffect(() => {
    const handleMouseMove = () => {
      if (isYellowState && isRunning) {
        setShowOverlay(true);
        // Reset auto-hide timer
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          setShowOverlay(false);
        }, 4000);
      }
    };

    if (isYellowState && isRunning) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isYellowState, isRunning]);

  const handleOverlayStop = () => {
    // Prevent action if already stopping or if timer is not running
    if (isStoppingActivity || !isRunning) {
      return;
    }
    handleStop();
    // Don't hide overlay immediately - let the operation complete
    // The overlay will hide when the activity becomes inactive
  };

  const handleOverlayNext = () => {
    // Prevent action if operations are in progress
    if (isStoppingActivity || isStartingActivity) {
      return;
    }
    if (onNextActivity) {
      onNextActivity();
      // Keep overlay visible briefly to show action was taken
      setTimeout(() => {
        setShowOverlay(false);
      }, 500);
    }
  };

  const handleOverlayStartNext = () => {
    // Prevent action if already starting or stopping
    if (isStartingActivity || isStoppingActivity) {
      return;
    }
    if (onStartNext) {
      onStartNext();
      // Don't hide overlay immediately - keep it visible during operation
      // It will hide when the new activity becomes active
    }
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center ${isFullScreen ? 'space-y-12 p-12 w-full' : 'space-y-6 p-8 rounded-2xl'} ${shouldUseGradient ? '' : defaultBgColor} transition-colors`}
      style={shouldUseGradient ? bgStyle : {}}
      onMouseEnter={() => {
        if (isYellowState && isRunning) {
          setShowOverlay(true);
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
          }
        }
      }}
    >
      {/* Overlay Controls - Positioned at top center for better visibility */}
      {showOverlay && isYellowState && isRunning && (
        <div 
          className={`absolute ${isFullScreen ? 'top-6' : 'top-2'} left-1/2 transform -translate-x-1/2 bg-black/30 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-2.5 z-50 transition-all duration-300 shadow-2xl border border-white/20`}
          onMouseEnter={() => {
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
            }
          }}
          onMouseLeave={() => {
            hideTimeoutRef.current = setTimeout(() => {
              setShowOverlay(false);
            }, 2000);
          }}
        >
          <button
            onClick={handleOverlayStop}
            disabled={isStoppingActivity || !isRunning}
            className={`p-2.5 bg-red-600/95 hover:bg-red-700 text-white rounded-lg transition-all hover:scale-110 active:scale-95 shadow-lg ${
              isStoppingActivity || !isRunning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={isStoppingActivity ? 'Stopping...' : 'Stop Activity'}
          >
            <Square className={isFullScreen ? 'w-7 h-7' : 'w-5 h-5'} />
          </button>
          {hasNextActivity && onNextActivity && (
            <button
              onClick={handleOverlayNext}
              disabled={isStoppingActivity || isStartingActivity}
              className={`p-2.5 bg-gray-600/95 hover:bg-gray-700 text-white rounded-lg transition-all hover:scale-110 active:scale-95 shadow-lg ${
                isStoppingActivity || isStartingActivity ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={isStoppingActivity || isStartingActivity ? 'Please wait...' : 'Next Activity'}
            >
              <ChevronRight className={isFullScreen ? 'w-7 h-7' : 'w-5 h-5'} />
            </button>
          )}
          {hasNextActivity && onStartNext && (
            <button
              onClick={handleOverlayStartNext}
              disabled={isStartingActivity || isStoppingActivity}
              className={`p-2.5 bg-green-600/95 hover:bg-green-700 text-white rounded-lg transition-all hover:scale-110 active:scale-95 shadow-lg ${
                isStartingActivity || isStoppingActivity ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={isStartingActivity ? 'Starting...' : isStoppingActivity ? 'Please wait...' : 'Start Next Activity'}
            >
              <Play className={isFullScreen ? 'w-7 h-7' : 'w-5 h-5'} />
            </button>
          )}
        </div>
      )}

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

