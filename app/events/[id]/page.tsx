'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Download, FileJson, FileSpreadsheet, CheckCircle2, ChevronLeft, ChevronRight, Maximize2, Minimize2, Edit2, Save, X } from 'lucide-react';
import { Event, Activity, GRADIENT_PRESETS } from '@/lib/types';
import { getEventById, updateEvent, updateActivity } from '@/lib/api';
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
  const completionStateRef = useRef<boolean>(false);
  const [isStartingActivity, setIsStartingActivity] = useState(false);
  const [isStoppingActivity, setIsStoppingActivity] = useState(false);
  const [isUpdatingActivities, setIsUpdatingActivities] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [failedUpdates, setFailedUpdates] = useState<Array<{ type: string; data: any; retries: number }>>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      loadEvent();
    }

    // Cleanup on unmount - reset loading states
    return () => {
      setIsStartingActivity(false);
      setIsStoppingActivity(false);
      setIsUpdatingActivities(false);
    };
  }, [eventId, status, router]);

  // Retry failed updates
  useEffect(() => {
    if (failedUpdates.length === 0) {
      if (syncStatus === 'error') {
        setSyncStatus('synced');
      }
      return;
    }

    const retryFailedUpdates = async () => {
      const updatesToRetry = failedUpdates.filter(u => u.retries < 3);
      if (updatesToRetry.length === 0) {
        // All updates exceeded retry limit - clear queue
        setFailedUpdates([]);
        setSyncStatus('error');
        return;
      }

      setSyncStatus('syncing');

      const updatedQueue: typeof failedUpdates = [];
      
      for (const update of updatesToRetry) {
        try {
          if (update.type === 'startActivity' || update.type === 'stopActivity' || update.type === 'skipActivity') {
            await updateActivity(update.data.eventId, update.data.activityId, {
              ...(update.data.isActive !== undefined && { isActive: update.data.isActive }),
              ...(update.data.isCompleted !== undefined && { isCompleted: update.data.isCompleted }),
              ...(update.data.timeSpent !== undefined && { timeSpent: update.data.timeSpent }),
              ...(update.data.extraTimeTaken !== undefined && { extraTimeTaken: update.data.extraTimeTaken }),
              ...(update.data.timeGained !== undefined && { timeGained: update.data.timeGained }),
            });
            
            // Success - don't add back to queue
            console.log('Retry successful for', update.type);
          }
        } catch (error) {
          // Increment retry count and keep in queue
          updatedQueue.push({ ...update, retries: update.retries + 1 });
          console.warn('Retry failed for', update.type, 'attempt', update.retries + 1);
        }
      }

      // Update queue with remaining failed updates
      setFailedUpdates(updatedQueue);

      // Update sync status
      if (updatedQueue.length === 0) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    };

    // Retry after 2 seconds
    const timeout = setTimeout(retryFailedUpdates, 2000);
    return () => clearTimeout(timeout);
  }, [failedUpdates, syncStatus]);

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

  // Calculate valid index - clamp to valid range (no state update needed, just use calculated value)
  const validIndex = event.activities.length > 0 
    ? Math.max(0, Math.min(currentActivityIndex, event.activities.length - 1))
    : 0;
  
  // No useEffect needed - we use validIndex for rendering, which is always valid

  const currentActivity = event.activities.length > 0 && validIndex < event.activities.length 
    ? event.activities[validIndex] 
    : null;
  
  // Compute completion status directly from event activities
  const allCompleted = event.activities.length > 0 && event.activities.every(a => a.isCompleted);
  
  // Update ref for tracking (no useEffect needed - just update it directly)
  completionStateRef.current = allCompleted;

  const handleActivityStop = async (timeSpent: number) => {
    if (!event || !currentActivity) return;

    // Prevent multiple simultaneous stops
    if (isStoppingActivity) {
      console.warn('Stop already in progress, ignoring duplicate stop request');
      return;
    }

    if (currentActivity.isCompleted) {
      console.warn('Activity already completed, ignoring stop request');
      return;
    }

    // Mark as stopping to prevent race conditions
    setIsStoppingActivity(true);
    setSyncStatus('syncing');

    // Calculate time metrics
    const extraTimeTaken = timeSpent > currentActivity.timeAllotted ? timeSpent - currentActivity.timeAllotted : 0;
    const timeGained = timeSpent <= currentActivity.timeAllotted ? currentActivity.timeAllotted - timeSpent : 0;

    // Optimistic update: Update UI immediately for instant feedback
    const optimisticActivities = event.activities.map((a, idx) => {
      if (idx === currentActivityIndex) {
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
    
    const optimisticEvent: Event = {
      ...event,
      activities: optimisticActivities,
    };
    
    // Check if all activities are now completed
    const allCompletedNow = optimisticActivities.every(a => a.isCompleted);
    
    setEvent(optimisticEvent);
    setIsEventStarted(true);

    // Find next activity immediately (only if not all completed)
    if (!allCompletedNow) {
      const nextIndex = optimisticActivities.findIndex(a => !a.isCompleted);
      if (nextIndex >= 0) {
        setCurrentActivityIndex(nextIndex);
      }
    } else {
      // All activities completed - ensure we're not trying to show a specific activity
      setCurrentActivityIndex(0); // Reset to 0 so we don't show an invalid activity
    }

    // Sync with server in the background (non-blocking) - use partial update
    try {
      console.log('handleActivityStop: Syncing with server (partial update)', {
        eventId,
        activityId: currentActivity.id,
        currentActivityIndex,
        timeSpent,
        extraTimeTaken,
        timeGained,
      });

      // Use partial update - only update the single activity being stopped
      const updatedEvent = await updateActivity(eventId, currentActivity.id, {
        timeSpent,
        extraTimeTaken,
        timeGained,
        isCompleted: true,
        isActive: false,
      });

      console.log('handleActivityStop: Activity synced successfully', {
        eventId: updatedEvent.id,
        activityId: currentActivity.id,
      });

      // Update with server response (in case server made any adjustments)
      setEvent(updatedEvent);
      setSyncStatus('synced');
    } catch (error) {
      console.error('handleActivityStop: Error syncing with server', {
        error,
        eventId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      // Set error status
      setSyncStatus('error');
      
      // Queue for retry
      setFailedUpdates(prev => [...prev, {
        type: 'stopActivity',
        data: {
          eventId,
          activityId: currentActivity.id,
          timeSpent,
          extraTimeTaken,
          timeGained,
          isCompleted: true,
          isActive: false,
        },
        retries: 0,
      }]);
      
      // Keep optimistic update since timer already stopped - user saw it stop
      // Show error but don't block the UI
      alert('Failed to save activity time. The activity was stopped locally, but changes may not be saved. Please refresh the page.');
    } finally {
      // Always reset the flag
      setIsStoppingActivity(false);
    }
  };

  const handleStartActivity = async () => {
    if (!event || !currentActivity) return;
    
    // Prevent multiple simultaneous start requests
    if (isStartingActivity) {
      console.warn('Start already in progress, ignoring duplicate start request');
      return;
    }
    
    // Don't allow starting already completed activities
    if (currentActivity.isCompleted) {
      console.warn('Cannot start already completed activity');
      return;
    }

    // Don't allow starting if activity is already active
    if (currentActivity.isActive) {
      console.warn('Activity is already active');
      return;
    }

    // Mark as starting to prevent race conditions
    setIsStartingActivity(true);
    setSyncStatus('syncing');

    // Optimistic update: Update UI immediately
    const optimisticActivities = event.activities.map((a, idx) => ({
      ...a,
      isActive: idx === currentActivityIndex,
    }));
    const optimisticEvent: Event = {
      ...event,
      activities: optimisticActivities,
    };
    setEvent(optimisticEvent);
    setIsEventStarted(true);

    try {
      console.log('handleStartActivity: Starting activity (partial update)', {
        eventId,
        activityId: currentActivity.id,
        currentActivityIndex,
        activityName: currentActivity.activityName,
      });

      // Use partial update - only update the single activity being started
      const updatedEvent = await updateActivity(eventId, currentActivity.id, {
        isActive: true,
      });

      console.log('handleStartActivity: Activity started successfully', {
        eventId: updatedEvent.id,
        activityId: currentActivity.id,
      });

      // Update with server response
      setEvent(updatedEvent);
      setSyncStatus('synced');
      // Update sync status
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error starting activity:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        currentActivityIndex,
        activityId: currentActivity.id,
      });
      
      // Set error status
      setSyncStatus('error');
      
      // Queue for retry
      setFailedUpdates(prev => [...prev, {
        type: 'startActivity',
        data: { eventId, activityId: currentActivity.id, isActive: true },
        retries: 0,
      }]);
      
      // Revert optimistic update on error
      setEvent(event);
      setIsEventStarted(false);
      
      alert(
        'Failed to start activity. Please try again.\n\n' +
        'If the problem persists, you can:\n' +
        '1. Skip this activity and continue with the next one\n' +
        '2. Navigate to another activity and come back later\n' +
        '3. Refresh the page and try again'
      );
    } finally {
      // Always reset the flag
      setIsStartingActivity(false);
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

  const handleSkipActivity = async () => {
    if (!event || !currentActivity) return;
    
    // Confirm skip action
    const confirmed = confirm(
      `Skip "${currentActivity.activityName}"? This will mark it as completed without tracking time. You can still navigate back to it later.`
    );
    
    if (!confirmed) return;

    setSyncStatus('syncing');

    // Optimistic update: Mark activity as completed (skipped) without time tracking
    const optimisticActivities = event.activities.map((a, idx) => {
      if (idx === currentActivityIndex) {
        return {
          ...a,
          isCompleted: true, // Mark as completed (skipped)
          isActive: false,
        };
      }
      return a;
    });

    const optimisticEvent: Event = {
      ...event,
      activities: optimisticActivities,
    };
    setEvent(optimisticEvent);

    // Find next incomplete activity
    const nextIndex = optimisticActivities.findIndex(a => !a.isCompleted);
    if (nextIndex >= 0) {
      setCurrentActivityIndex(nextIndex);
    } else {
      // All activities completed
      setCurrentActivityIndex(0);
    }

    // Sync with server - use partial update
    try {
      console.log('handleSkipActivity: Skipping activity (partial update)', {
        eventId,
        activityId: currentActivity.id,
        activityName: currentActivity.activityName,
      });

      const updatedEvent = await updateActivity(eventId, currentActivity.id, {
        isCompleted: true,
        isActive: false,
      });

      console.log('handleSkipActivity: Activity skipped successfully', {
        eventId: updatedEvent.id,
        activityId: currentActivity.id,
      });

      setEvent(updatedEvent);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error skipping activity:', error);
      setSyncStatus('error');
      
      // Queue for retry
      setFailedUpdates(prev => [...prev, {
        type: 'skipActivity',
        data: {
          eventId,
          activityId: currentActivity.id,
          isCompleted: true,
          isActive: false,
        },
        retries: 0,
      }]);
      
      alert('Failed to skip activity. The activity was skipped locally, but changes may not be saved. Please refresh the page.');
      // Keep optimistic update - user already saw the skip
    }
  };

  const handleStartNextActivity = async () => {
    if (!event) return;
    
    // Prevent multiple simultaneous start requests
    if (isStartingActivity) {
      console.warn('Start already in progress, ignoring duplicate start request');
      return;
    }

    // Find next incomplete activity
    const nextIndex = event.activities.findIndex((a, idx) => idx > currentActivityIndex && !a.isCompleted);
    if (nextIndex >= 0) {
      const nextActivity = event.activities[nextIndex];
      
      // Don't allow starting if next activity is already active or completed
      if (nextActivity.isActive) {
        console.warn('Next activity is already active');
        return;
      }
      if (nextActivity.isCompleted) {
        console.warn('Next activity is already completed');
        return;
      }

      // Mark as starting to prevent race conditions
      setIsStartingActivity(true);
      setSyncStatus('syncing');
      
      setCurrentActivityIndex(nextIndex);
      
      // Optimistic update: Update UI immediately
      const optimisticActivities = event.activities.map((a, idx) => ({
        ...a,
        isActive: idx === nextIndex,
      }));
      const optimisticEvent: Event = {
        ...event,
        activities: optimisticActivities,
      };
      setEvent(optimisticEvent);
      setIsEventStarted(true);

      try {
        console.log('handleStartNextActivity: Starting next activity (partial update)', {
          eventId,
          activityId: nextActivity.id,
          nextIndex,
          activityName: nextActivity.activityName,
        });

        // Use partial update - only update the single activity being started
        const updatedEvent = await updateActivity(eventId, nextActivity.id, {
          isActive: true,
        });

        console.log('handleStartNextActivity: Next activity started successfully', {
          eventId: updatedEvent.id,
          activityId: nextActivity.id,
        });

        // Update with server response
        setEvent(updatedEvent);
        setSyncStatus('synced');
      } catch (error) {
        console.error('Error starting next activity:', {
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          eventId,
          activityId: nextActivity.id,
          nextIndex,
        });
        
        setSyncStatus('error');
        
        // Queue for retry
        setFailedUpdates(prev => [...prev, {
          type: 'startActivity',
          data: { eventId, activityId: nextActivity.id, isActive: true },
          retries: 0,
        }]);
        
        alert('Failed to start next activity. Please try again.');
        // Revert index change on error
        setCurrentActivityIndex(currentActivityIndex);
        // Revert optimistic update
        setEvent(event);
      } finally {
        // Always reset the flag
        setIsStartingActivity(false);
      }
    }
  };

  const handleUpdateActivities = async (updatedActivities: Activity[]) => {
    if (!event) return;

    // Prevent multiple simultaneous update requests
    if (isUpdatingActivities) {
      console.warn('Update already in progress, ignoring duplicate update request');
      return;
    }

    // Mark as updating to prevent race conditions
    setIsUpdatingActivities(true);
    setSyncStatus('syncing');

    // Ensure proper data structure (no id, correct types for all fields)
    const activitiesToSend = updatedActivities.map((a) => ({
      activityName: a.activityName,
      timeAllotted: a.timeAllotted,
      timeSpent: a.timeSpent ?? null,
      extraTimeTaken: a.extraTimeTaken ?? null,
      timeGained: a.timeGained ?? null,
      isCompleted: a.isCompleted ?? false,
      isActive: a.isActive ?? false,
    }));

    try {
      const updatedEvent = await updateEvent(eventId, {
        activities: activitiesToSend,
      });

      setEvent(updatedEvent);
      setSyncStatus('synced');
      
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
      setSyncStatus('error');
      alert('Failed to update activities. Please try again.');
      // Don't update state on error - keep previous state
    } finally {
      // Always reset the flag
      setIsUpdatingActivities(false);
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
              {/* Sync Status Indicator */}
              {syncStatus !== 'synced' && (
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                    syncStatus === 'syncing' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-red-100 text-red-700'
                  }`}
                  title={
                    syncStatus === 'syncing' 
                      ? 'Syncing changes with server...' 
                      : `Sync error. ${failedUpdates.length} update(s) queued for retry.`
                  }
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-600 rounded-full" />
                      Sync Error
                    </>
                  )}
                </div>
              )}
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
                    disabled={isStartingActivity || currentActivity.isActive}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-lg shadow-lg transition-colors text-lg"
                  >
                    {isStartingActivity ? 'Starting...' : 'Start Activity'}
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
                <div className="flex justify-center gap-4 mt-6 flex-wrap">
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
                  {!currentActivity.isCompleted && (
                    <button
                      onClick={handleSkipActivity}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
                      title="Skip this activity (mark as completed without tracking time)"
                    >
                      Skip Activity
                    </button>
                  )}
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

