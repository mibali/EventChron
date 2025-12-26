'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock } from 'lucide-react';
import { getAllEvents, deleteEvent } from '@/lib/storage';
import { Event } from '@/lib/types';
import { formatTimeReadable } from '@/lib/utils';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    setEvents(getAllEvents());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEvent(id);
      setEvents(getAllEvents());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Event Timer
          </h1>
          <p className="text-lg text-gray-600">
            Manage your events with professional count-up timers
          </p>
        </div>

        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors mb-8"
        >
          <Plus className="w-5 h-5" />
          Create New Event
        </Link>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No events yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first event to get started
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {event.eventName}
                </h3>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{new Date(event.eventDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {event.activities.length} {event.activities.length === 1 ? 'activity' : 'activities'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/events/${event.id}`}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-center font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


