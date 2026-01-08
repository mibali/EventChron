'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Download, FileJson, FileSpreadsheet, CheckCircle2, ChevronLeft, ChevronRight, Maximize2, Minimize2, Edit2, Save, X } from 'lucide-react';
import { Event, Activity, GRADIENT_PRESETS } from '@/lib/types';
import { getEventById, updateEvent } from '@/lib/api';
import { convertActivitiesToResults, exportToJSON, exportToCSV, downloadFile } from '@/lib/export';
import Timer from '@/components/Timer';
import EditableActivityList from '@/components/EditableActivityList';
import { formatTimeReadable } from '@/lib/utils';
import { gradientToCSS } from '@/components/GradientPicker';

export default function EventPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isEventStarted, setIsEventStarted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [allCompletedState, setAllCompletedState] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      loadEvent();
    }
  }, [eventId, status, router]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      const loadedEvent = await getEventById(eventId);
      if (!loadedEvent) {
        router.push('/dashboard');
        return;
      }
      setEvent(loadedEvent);
      setEditEventName(loadedEvent.eventName);
      setEditEventDate(loadedEvent.eventDate);
      
      // Check if event has been started
      const started = loadedEvent.activities.some(a => a.isCompleted || a.isActive);
      setIsEventStarted(started);
      
      // Find first incomplete activity
      const firstIncomplete = loadedEvent.activities.findIndex(a => !a.isCompleted);
      if (firstIncomplete >= 0) {
        setCurrentActivityIndex(firstIncomplete);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEventDetails = async () => {
    if (!event) return;

    if (!editEventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    try {
      const updatedEvent = await updateEvent(eventId, {
        eventName: editEventName.trim(),
        eventDate: editEventDate,
      });

      setEvent(updatedEvent);
      setIsEditingEvent(false);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleCancelEditEvent = () => {
    if (!event) return;
    setEditEventName(event.eventName);
    setEditEventDate(event.eventDate);
    setIsEditingEvent(false);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Event not found</div>
      </div>
    );
  }

  // Ensure currentActivityIndex is valid
  const validIndex = Math.max(0, Math.min(currentActivityIndex, event.activities.length - 1));
  if (validIndex !== currentActivityIndex && event.activities.length > 0) {
    setCurrentActivityIndex(validIndex);
  }

  const currentActivity = event.activities.length > 0 && validIndex < event.activities.length 
    ? event.activities[validIndex] 
    : null;
  const allCompleted = allCompletedState || (event.activities.length > 0 && event.activities.every(a => a.isCompleted));

  // Update allCompletedState when event changes
  useEffect(() => {
    if (event && event.activities.length > 0) {
      const completed = event.activities.every(a => a.isCompleted);
      setAllCompletedState(completed);
    }
  }, [event]);

  const handleActivityStop = async (timeSpent: number) => {
    if (!event || !currentActivity) return;

    // Prevent multiple simultaneous stops
    if (currentActivity.isCompleted) {
      console.warn('Activity already completed, ignoring stop request');
      return;
    }

    // Create updated activities array using map to avoid mutation
    const updatedActivities = event.activities.map((a, idx) => {
      if (idx === currentActivityIndex) {
        const extraTimeTaken = timeSpent > a.timeAllotted ? timeSpent - a.timeAllotted : 0;
        const timeGained = timeSpent <= a.timeAllotted ? a.timeAllotted - timeSpent : 0;
        
        return {
          ...a,
          timeSpent,
          extraTimeTaken,
          timeGained,
          isCompleted: true,
          isActive: false,
        };
      }
      return a;
    });

    // Optimistic update: Update UI immediately for instant feedback
    const optimisticEvent: Event = {
      ...event,
      activities: updatedActivities,
    };
    
    // Check if all activities are now completed
    const allCompletedNow = updatedActivities.every(a => a.isCompleted);
    
    // Update completion state immediately for instant UI update
    setAllCompletedState(allCompletedNow);
    
    setEvent(optimisticEvent);
    setIsEventStarted(true);

    // Find next activity immediately (only if not all completed)
    if (!allCompletedNow) {
      const nextIndex = updatedActivities.findIndex(a => !a.isCompleted);
      if (nextIndex >= 0) {
        setCurrentActivityIndex(nextIndex);
      }
    } else {
      // All activities completed - ensure we're not trying to show a specific activity
      setCurrentActivityIndex(0); // Reset to 0 so we don't show an invalid activity
    }

    // Sync with server in the background (non-blocking)
    try {
      console.log('handleActivityStop: Syncing with server', {
        eventId,
        currentActivityIndex,
        timeSpent,
        activitiesCount: updatedActivities.length,
      });

      const updatedEvent = await updateEvent(eventId, {
        activities: updatedActivities,
      });

      console.log('handleActivityStop: Event synced successfully', {
        eventId: updatedEvent.id,
        activitiesCount: updatedEvent.activities.length,
      });

      // Update with server response (in case server made any adjustments)
      setEvent(updatedEvent);
    } catch (error) {
      console.error('handleActivityStop: Error syncing with server', {
        error,
        eventId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      // Revert to previous state on error
      setEvent(event);
      
      // Show error but don't block the UI
      alert('Failed to save activity time. The activity was stopped locally, but changes may not be saved. Please refresh the page.');
    }
  };

  const handleStartActivity = async () => {
    if (!event || !currentActivity) return;
    
    // Don't allow starting already completed activities
    if (currentActivity.isCompleted) return;

    const updatedActivities = event.activities.map((a, idx) => ({
      ...a,
      isActive: idx === currentActivityIndex,
    }));

    try {
      const updatedEvent = await updateEvent(eventId, {
        activities: updatedActivities,
      });

      setEvent(updatedEvent);
      setIsEventStarted(true);
    } catch (error) {
      console.error('Error starting activity:', error);
      alert('Failed to start activity. Please try again.');
    }
  };

  const handleNextActivity = () => {
    if (!event) return;
    
    // Find next incomplete activity
    const nextIndex = event.activities.findIndex((a, idx) => idx > currentActivityIndex && !a.isCompleted);
    if (nextIndex >= 0) {
      setCurrentActivityIndex(nextIndex);
    }
  };

  const handleStartNextActivity = async () => {
    if (!event) return;
    
    // Find next incomplete activity
    const nextIndex = event.activities.findIndex((a, idx) => idx > currentActivityIndex && !a.isCompleted);
    if (nextIndex >= 0) {
      setCurrentActivityIndex(nextIndex);
      
      // Start the next activity
      const updatedActivities = event.activities.map((a, idx) => ({
        ...a,
        isActive: idx === nextIndex,
      }));

      try {
        const updatedEvent = await updateEvent(eventId, {
          activities: updatedActivities,
        });

        setEvent(updatedEvent);
        setIsEventStarted(true);
      } catch (error) {
        console.error('Error starting next activity:', error);
        alert('Failed to start next activity. Please try again.');
      }
    }
  };

  const handleUpdateActivities = async (updatedActivities: Activity[]) => {
    if (!event) return;

    try {
      const updatedEvent = await updateEvent(eventId, {
        activities: updatedActivities,
      });

      setEvent(updatedEvent);
      
      // Ensure currentActivityIndex is valid after update
      if (updatedActivities.length === 0) {
        setCurrentActivityIndex(0);
      } else if (currentActivityIndex >= updatedActivities.length) {
        // If current index is out of bounds, find first incomplete or use last activity
        const firstIncomplete = updatedActivities.findIndex(a => !a.isCompleted);
        setCurrentActivityIndex(firstIncomplete >= 0 ? firstIncomplete : updatedActivities.length - 1);
      } else {
        // Update to first incomplete if current is completed
        const firstIncomplete = updatedActivities.findIndex(a => !a.isCompleted);
        if (firstIncomplete >= 0 && firstIncomplete !== currentActivityIndex) {
          setCurrentActivityIndex(firstIncomplete);
        }
      }
    } catch (error) {
      console.error('Error updating activities:', error);
      alert('Failed to update activities. Please try again.');
    }
  };

  const handleExportJSON = () => {
    const results = convertActivitiesToResults(event.activities, event.eventDate);
    const json = exportToJSON(results);
    downloadFile(json, `${event.eventName.replace(/\s+/g, '_')}_results.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const results = convertActivitiesToResults(event.activities, event.eventDate);
    const csv = exportToCSV(results);
    downloadFile(csv, `${event.eventName.replace(/\s+/g, '_')}_results.csv`, 'text/csv');
  };

  const getLogoAlignmentClass = () => {
    switch (event.logoAlignment) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      default:
        return 'justify-center';
    }
  };

  // Get the gradient CSS for the timer background (only if gradient is selected)
  const timerBackgroundStyle = event.timerGradient ? {
    background: gradientToCSS(event.timerGradient)
  } : undefined;

  return (
    <div className="min-h-screen" style={timerBackgroundStyle}>
      {/* Header */}
      <div className={`bg-white shadow-md p-4 md:p-6 ${isFullScreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Events
            </button>
            <div className="flex items-center gap-2">
              {!allCompleted && currentActivity && (
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                  title={isFullScreen ? "Show Activity List" : "Hide Activity List"}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      Show List
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      Full Screen
                    </>
                  )}
                </button>
              )}
              {allCompleted && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    <FileJson className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-4 ${getLogoAlignmentClass()}`}>
            {event.logoUrl && (
              <img src={event.logoUrl} alt="Logo" className="h-16 md:h-20 object-contain" />
            )}
            <div className="flex-1">
              {isEditingEvent ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={editEventName}
                      onChange={(e) => setEditEventName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-2xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={editEventDate}
                      onChange={(e) => setEditEventDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEventDetails}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditEvent}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{event.eventName}</h1>
                    <p className="text-gray-600 mt-1">
                      {new Date(event.eventDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {!isEventStarted && (
                    <button
                      onClick={() => setIsEditingEvent(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold rounded-lg transition-colors"
                      title="Edit Event Details"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${isFullScreen ? 'h-screen flex flex-col' : 'max-w-7xl mx-auto p-4 md:p-8 pb-20'}`}>
        {allCompleted ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Completed!</h2>
            <p className="text-gray-600 mb-6">
              All activities have been completed. You can now export the results.
            </p>
            <div className="space-y-4 max-w-2xl mx-auto">
              {event.activities.map((activity, idx) => (
                <div
                  key={activity.id}
                  className="bg-gray-50 p-4 rounded-lg text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{idx + 1}. {activity.activityName}</h3>
                    <span className="text-sm text-gray-600">
                      Allotted: {formatTimeReadable(activity.timeAllotted)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Time Spent: </span>
                      <span className="font-bold text-gray-900">{formatTimeReadable(activity.timeSpent || 0)}</span>
                    </div>
                    <div>
                      <span className="text-red-600">Over by: </span>
                      <span className={`font-bold ${(activity.extraTimeTaken || 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatTimeReadable(activity.extraTimeTaken || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-600">Saved: </span>
                      <span className={`font-bold ${(activity.timeGained || 0) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {formatTimeReadable(activity.timeGained || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentActivity ? (
          <div 
            className={`${isFullScreen ? 'flex-1 flex flex-col items-center justify-center' : 'bg-white rounded-lg shadow-lg p-8 md:p-12'}`}
          >
            {/* Full Screen Header */}
            {isFullScreen && (
              <div className="w-full bg-white shadow-md p-4 flex items-center justify-between">
                <div className={`flex items-center gap-4 ${getLogoAlignmentClass()}`}>
                  {event.logoUrl && (
                    <img src={event.logoUrl} alt="Logo" className="h-12 object-contain" />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{event.eventName}</h1>
                    <h2 className="text-xl font-semibold text-gray-700">
                      {currentActivity.activityName}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Activity {currentActivityIndex + 1} of {event.activities.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                  title="Exit Full Screen"
                >
                  <Minimize2 className="w-4 h-4" />
                  Exit Full Screen
                </button>
              </div>
            )}

            {/* Timer Section */}
            <div className={`${isFullScreen ? 'flex-1 flex flex-col items-center justify-center w-full' : 'text-center mb-8'}`}>
              {!isFullScreen && (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {currentActivity.activityName}
                  </h2>
                  <p className="text-gray-600">
                    Activity {currentActivityIndex + 1} of {event.activities.length}
                  </p>
                </>
              )}

              {!isEventStarted || !currentActivity.isActive ? (
                <div className="text-center">
                  <div className={`font-mono font-bold text-gray-400 mb-8 ${isFullScreen ? 'text-[20rem]' : 'text-7xl md:text-9xl lg:text-[12rem]'}`}>
                    00:00
                  </div>
                  <button
                    onClick={handleStartActivity}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg transition-colors text-lg"
                  >
                    Start Activity
                  </button>
                </div>
              ) : (
                <div className={isFullScreen ? 'w-full' : ''}>
                  <Timer
                    activity={currentActivity}
                    onStop={handleActivityStop}
                    isActive={currentActivity.isActive || false}
                    isFullScreen={isFullScreen}
                    backgroundStyle={timerBackgroundStyle}
                    onNextActivity={handleNextActivity}
                    onStartNext={handleStartNextActivity}
                    hasNextActivity={event.activities.some((a, idx) => idx > currentActivityIndex && !a.isCompleted)}
                  />
                </div>
              )}

              {/* Navigation Controls */}
              {currentActivity && !currentActivity.isActive && !isFullScreen && (
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => {
                      const prevIndex = currentActivityIndex > 0 ? currentActivityIndex - 1 : 0;
                      setCurrentActivityIndex(prevIndex);
                    }}
                    disabled={currentActivityIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const nextIndex = currentActivityIndex < event.activities.length - 1 
                        ? currentActivityIndex + 1 
                        : currentActivityIndex;
                      setCurrentActivityIndex(nextIndex);
                    }}
                    disabled={currentActivityIndex === event.activities.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Activity List */}
            {!isFullScreen && (
              <EditableActivityList
                activities={event.activities}
                onUpdate={handleUpdateActivities}
                disabled={isEventStarted}
                currentActivityIndex={currentActivityIndex}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600">No activities available</p>
          </div>
        )}
      </div>
    </div>
  );
}

