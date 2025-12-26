'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Download, FileJson, FileSpreadsheet, CheckCircle2, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Event, Activity } from '@/lib/types';
import { getEventById, saveEvent } from '@/lib/storage';
import { convertActivitiesToResults, exportToJSON, exportToCSV, downloadFile } from '@/lib/export';
import Timer from '@/components/Timer';
import { formatTimeReadable } from '@/lib/utils';

export default function EventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isEventStarted, setIsEventStarted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const loadedEvent = getEventById(eventId);
    if (!loadedEvent) {
      router.push('/');
      return;
    }
    setEvent(loadedEvent);
    
    // Check if event has been started
    const started = loadedEvent.activities.some(a => a.isCompleted || a.isActive);
    setIsEventStarted(started);
    
    // Find first incomplete activity
    const firstIncomplete = loadedEvent.activities.findIndex(a => !a.isCompleted);
    if (firstIncomplete >= 0) {
      setCurrentActivityIndex(firstIncomplete);
    }
  }, [eventId, router]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentActivity = event.activities[currentActivityIndex];
  const allCompleted = event.activities.every(a => a.isCompleted);

  const handleActivityStop = (timeSpent: number) => {
    if (!event || !currentActivity) return;

    const updatedActivities = [...event.activities];
    const activity = updatedActivities[currentActivityIndex];
    
    activity.timeSpent = timeSpent;
    activity.isCompleted = true;
    activity.isActive = false;

    if (timeSpent > activity.timeAllotted) {
      activity.extraTimeTaken = timeSpent - activity.timeAllotted;
      activity.timeGained = 0;
    } else {
      activity.timeGained = activity.timeAllotted - timeSpent;
      activity.extraTimeTaken = 0;
    }

    const updatedEvent = {
      ...event,
      activities: updatedActivities,
      updatedAt: new Date().toISOString(),
    };

    setEvent(updatedEvent);
    saveEvent(updatedEvent);

    // Move to next activity if available
    const nextIndex = updatedActivities.findIndex(a => !a.isCompleted);
    if (nextIndex >= 0) {
      setCurrentActivityIndex(nextIndex);
    }
  };

  const handleStartActivity = () => {
    if (!event) return;

    const updatedActivities = event.activities.map((a, idx) => ({
      ...a,
      isActive: idx === currentActivityIndex,
    }));

    const updatedEvent = {
      ...event,
      activities: updatedActivities,
      updatedAt: new Date().toISOString(),
    };

    setEvent(updatedEvent);
    saveEvent(updatedEvent);
    setIsEventStarted(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className={`bg-white shadow-md p-4 md:p-6 ${isFullScreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/')}
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${isFullScreen ? 'h-screen flex flex-col' : 'max-w-7xl mx-auto p-4 md:p-8'}`}>
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
          <div className={`${isFullScreen ? 'flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100' : 'bg-white rounded-lg shadow-lg p-8 md:p-12'}`}>
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
                  />
                </div>
              )}

              {/* Navigation Controls */}
              {!currentActivity.isActive && !isFullScreen && (
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
              <div className="mt-12 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity List</h3>
                {event.activities.map((activity, idx) => (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-lg border-2 ${
                      idx === currentActivityIndex
                        ? 'border-indigo-600 bg-indigo-50'
                        : activity.isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {activity.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">
                          {idx + 1}. {activity.activityName}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTimeReadable(activity.timeAllotted)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

