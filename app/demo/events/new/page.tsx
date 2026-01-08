'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload } from 'lucide-react';
import { Event, LogoAlignment, TimerGradient, GRADIENT_PRESETS } from '@/lib/types';
import { generateId, compressImage } from '@/lib/utils';
import ActivityForm from '@/components/ActivityForm';
import GradientPicker from '@/components/GradientPicker';

const DEMO_EVENTS_KEY = 'eventchron_demo_events';
const MAX_DEMO_EVENTS = 5;

export default function DemoNewEventPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoAlignment, setLogoAlignment] = useState<LogoAlignment>('center');
  const [timerGradient, setTimerGradient] = useState<TimerGradient>(GRADIENT_PRESETS[0]);
  const [activities, setActivities] = useState<Event['activities']>([]);

  // Demo-specific storage functions
  const getDemoEvents = (): Event[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(DEMO_EVENTS_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  };

  const saveDemoEvent = (event: Event): void => {
    const events = getDemoEvents();
    const existingIndex = events.findIndex(e => e.id === event.id);
    
    if (existingIndex >= 0) {
      events[existingIndex] = { ...event, updatedAt: new Date().toISOString() };
    } else {
      if (events.length >= MAX_DEMO_EVENTS) {
        alert(`Demo mode is limited to ${MAX_DEMO_EVENTS} events. Please sign up to create unlimited events.`);
        return;
      }
      events.push(event);
    }
    
    localStorage.setItem(DEMO_EVENTS_KEY, JSON.stringify(events));
  };

  // Check for imported event data
  useEffect(() => {
    const importedData = sessionStorage.getItem('importedEventData');
    if (importedData) {
      try {
        const imported = JSON.parse(importedData);
        if (imported.eventName) setEventName(imported.eventName);
        if (imported.eventDate) {
          // Ensure date is in YYYY-MM-DD format for HTML date input
          let dateStr = imported.eventDate;
          if (dateStr.includes('T')) {
            // ISO format - extract just the date part
            dateStr = dateStr.split('T')[0];
          } else if (dateStr.includes(' ')) {
            // Date string format - convert to YYYY-MM-DD
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
              dateStr = dateObj.toISOString().split('T')[0];
            }
          }
          setEventDate(dateStr);
        }
        if (imported.logoUrl) setLogoUrl(imported.logoUrl);
        if (imported.logoAlignment) setLogoAlignment(imported.logoAlignment);
        if (imported.timerGradient) setTimerGradient(imported.timerGradient);
        if (imported.activities && Array.isArray(imported.activities)) {
          setActivities(imported.activities);
        }
        // Clear the imported data after use
        sessionStorage.removeItem('importedEventData');
      } catch (error) {
        console.error('Error parsing imported event data:', error);
      }
    }
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Check file size (warn if over 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      if (!confirm('This image is large and will be compressed. Continue?')) {
        return;
      }
    }

    try {
      // Compress and resize the image before storing
      const compressedDataUrl = await compressImage(file, 800, 800, 0.8);
      setLogoUrl(compressedDataUrl);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Failed to process image. Please try a different image.');
    }
  };

  const handleSave = () => {
    if (!eventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    if (activities.length === 0) {
      alert('Please add at least one activity');
      return;
    }

    const events = getDemoEvents();
    if (events.length >= MAX_DEMO_EVENTS) {
      alert(`Demo mode is limited to ${MAX_DEMO_EVENTS} events. Please sign up to create unlimited events.`);
      return;
    }

    const newEvent: Event = {
      id: generateId(),
      eventName: eventName.trim(),
      eventDate,
      logoUrl,
      logoAlignment,
      timerGradient,
      activities: activities.map(a => ({
        ...a,
        isCompleted: false,
        isActive: false,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveDemoEvent(newEvent);
    router.push(`/demo/events/${newEvent.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Create New Event (Demo)</h1>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
              Demo Mode - Limited to {MAX_DEMO_EVENTS} events
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Sunday Service, Conference 2025"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Event Date *
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Logo (Optional)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
                    <button
                      onClick={() => setLogoUrl('')}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {logoUrl && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Logo Alignment
                </label>
                <div className="flex gap-4">
                  {(['left', 'center', 'right'] as LogoAlignment[]).map((alignment) => (
                    <button
                      key={alignment}
                      onClick={() => setLogoAlignment(alignment)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        logoAlignment === alignment
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timer Background Gradient */}
            <GradientPicker value={timerGradient} onChange={setTimerGradient} />

            <ActivityForm activities={activities} onChange={setActivities} />

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => router.push('/demo')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

