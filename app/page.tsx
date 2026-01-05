'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock, Copy, Download, Filter, Search, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllEvents, deleteEvent, duplicateEvent, bulkDeleteEvents } from '@/lib/storage';
import { Event } from '@/lib/types';
import { formatTimeReadable, generateId, parseTimeToSeconds } from '@/lib/utils';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventsToDeleteCount, setEventsToDeleteCount] = useState(0);

  useEffect(() => {
    const events = getAllEvents();
    setAllEvents(events);
    applyFilters(events);
  }, []);

  const applyFilters = (events: Event[]) => {
    let filtered = [...events];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.eventDate);
        return eventDate >= start;
      });
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.eventDate);
        return eventDate <= end;
      });
    }

    setFilteredEvents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  useEffect(() => {
    applyFilters(allEvents);
  }, [searchQuery, filterStartDate, filterEndDate, allEvents]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEvent(id);
      const events = getAllEvents();
      setAllEvents(events);
      applyFilters(events);
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicated = duplicateEvent(id);
    if (duplicated) {
      const events = getAllEvents();
      setAllEvents(events);
      applyFilters(events);
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (!deleteStartDate || !deleteEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(deleteStartDate);
    const end = new Date(deleteEndDate);
    end.setHours(23, 59, 59, 999);

    const eventsToDelete = allEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate >= start && eventDate <= end;
    });

    if (eventsToDelete.length === 0) {
      alert('No events found in the selected date range');
      return;
    }

    setEventsToDeleteCount(eventsToDelete.length);
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteExecute = () => {
    const deletedCount = bulkDeleteEvents(deleteStartDate, deleteEndDate);
    const events = getAllEvents();
    setAllEvents(events);
    applyFilters(events);
    setShowBulkDelete(false);
    setDeleteStartDate('');
    setDeleteEndDate('');
    alert(`Successfully deleted ${deletedCount} event(s)`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'json' && fileExtension !== 'csv') {
      alert('Please select a JSON or CSV file');
      return;
    }

    // Extract filename without extension and clean it up
    const fileNameWithoutExt = file.name
      .replace(/\.(json|csv)$/i, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      const text = await file.text();
      let importedEvent: Partial<Event> | null = null;

      if (fileExtension === 'json') {
        const parsed = JSON.parse(text);
        // Handle both array and single object - use first event
        const rawEvents = Array.isArray(parsed) ? parsed : [parsed];
        
        if (rawEvents.length === 0) {
          alert('No events found in the file');
          e.target.value = '';
          return;
        }

        const rawEvent = rawEvents[0];
        
        // Convert exported format to Event format
        importedEvent = {
          eventName: fileNameWithoutExt || rawEvent.eventName || rawEvent.name || 'Imported Event',
          eventDate: rawEvent.eventDate || rawEvent.date || new Date().toISOString().split('T')[0],
          logoUrl: rawEvent.logoUrl || '',
          logoAlignment: (rawEvent.logoAlignment || 'center') as 'left' | 'center' | 'right',
          activities: (rawEvent.activities || []).map((activity: any) => ({
            id: generateId(),
            activityName: activity.activityName || activity.name || 'Activity',
            timeAllotted: typeof activity.timeAllotted === 'string' 
              ? parseTimeToSeconds(activity.timeAllotted)
              : (activity.timeAllotted || 180), // Default to 3 minutes
            isCompleted: false,
            isActive: false,
          })),
        };
      } else {
        // Parse CSV - handle quoted fields properly
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('CSV file must have a header row and at least one data row');
        }

        // Parse CSV with proper quote handling
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
        const activities: { activityName: string; timeAllotted: number }[] = [];
        let firstEventName = '';
        let firstEventDate = '';

        // Check if this is bulk export format (has Event Name, Event Date) or single event format
        const hasEventName = headers.includes('Event Name') || headers.includes('eventName');
        const hasEventDate = headers.includes('Event Date') || headers.includes('eventDate');
        const activityNameHeader = headers.find(h => 
          h.toLowerCase().includes('activity') && h.toLowerCase().includes('name')
        ) || 'Activity Name';
        const timeAllottedHeader = headers.find(h => 
          h.toLowerCase().includes('time') && h.toLowerCase().includes('allotted')
        ) || 'Time Allotted';

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length !== headers.length) continue;

          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx].replace(/^"|"$/g, '').trim();
          });

          // Extract event name and date from first row (if available)
          if (i === 1) {
            firstEventName = row['Event Name'] || row['eventName'] || row[activityNameHeader] || 'Imported Event';
            firstEventDate = row['Event Date'] || row['eventDate'] || row['Date'] || row['date'] || new Date().toISOString().split('T')[0];
          }

          // Extract activity name and time allotted
          const activityName = row[activityNameHeader] || row['Activity Name'] || row['activityName'];
          const timeAllotted = row[timeAllottedHeader] || row['Time Allotted'] || row['timeAllotted'];

          if (activityName && timeAllotted) {
            const seconds = parseTimeToSeconds(timeAllotted);
            if (seconds > 0) {
              // Check if we already have this activity (avoid duplicates)
              const exists = activities.some(a => 
                a.activityName === activityName && a.timeAllotted === seconds
              );
              if (!exists) {
                activities.push({
                  activityName,
                  timeAllotted: seconds,
                });
              }
            }
          }
        }

        if (activities.length === 0) {
          alert('No valid activities found in the CSV file. Please ensure the file contains "Activity Name" and "Time Allotted" columns.');
          e.target.value = '';
          return;
        }

        // Create imported event with extracted activities
        importedEvent = {
          eventName: fileNameWithoutExt || firstEventName || 'Imported Event',
          eventDate: firstEventDate || new Date().toISOString().split('T')[0],
          logoUrl: '',
          logoAlignment: 'center',
          activities: activities.map(a => ({
            id: generateId(),
            activityName: a.activityName,
            timeAllotted: a.timeAllotted,
            isCompleted: false,
            isActive: false,
          })),
        };
      }

      if (!importedEvent || !importedEvent.eventName || !importedEvent.eventDate) {
        alert('No valid event data found in the file');
        e.target.value = '';
        return;
      }

      // Store in sessionStorage and navigate to create page
      sessionStorage.setItem('importedEventData', JSON.stringify(importedEvent));
      router.push('/events/new');
    } catch (error) {
      alert(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      e.target.value = '';
    }
  };

  const handleBulkExport = (format: 'json' | 'csv') => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include entire end date

    const exportFilteredEvents = allEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate >= start && eventDate <= end;
    });

    if (exportFilteredEvents.length === 0) {
      alert('No events found in the selected date range');
      return;
    }

    if (format === 'json') {
      // Export as JSON
      const exportData = exportFilteredEvents.map(event => ({
        eventName: event.eventName,
        eventDate: event.eventDate,
        activities: event.activities.map(a => ({
          activityName: a.activityName,
          timeAllotted: formatTimeReadable(a.timeAllotted),
          timeSpent: a.timeSpent ? formatTimeReadable(a.timeSpent) : 'Not completed',
          extraTimeTaken: a.extraTimeTaken ? formatTimeReadable(a.extraTimeTaken) : '0 seconds',
          timeGained: a.timeGained ? formatTimeReadable(a.timeGained) : '0 seconds',
          isCompleted: a.isCompleted || false,
        })),
      }));

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `events_${startDate}_to_${endDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Export as CSV
      const csvRows: string[] = [];
      csvRows.push('Event Name,Event Date,Activity Name,Time Allotted,Time Spent,Extra Time Taken,Time Gained,Completed');

      exportFilteredEvents.forEach(event => {
        event.activities.forEach(activity => {
          csvRows.push([
            `"${event.eventName}"`,
            `"${event.eventDate}"`,
            `"${activity.activityName}"`,
            `"${formatTimeReadable(activity.timeAllotted)}"`,
            `"${activity.timeSpent ? formatTimeReadable(activity.timeSpent) : 'Not completed'}"`,
            `"${activity.extraTimeTaken ? formatTimeReadable(activity.extraTimeTaken) : '0 seconds'}"`,
            `"${activity.timeGained ? formatTimeReadable(activity.timeGained) : '0 seconds'}"`,
            `"${activity.isCompleted ? 'Yes' : 'No'}"`,
          ].join(','));
        });
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `events_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setShowBulkExport(false);
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

        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Event
          </Link>
          <button
            onClick={() => setShowBulkExport(!showBulkExport)}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Bulk Export
          </button>
          <button
            onClick={() => setShowBulkDelete(!showBulkDelete)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Bulk Delete
          </button>
          <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            Import Events
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Events
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by event name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          </div>
          {(searchQuery || filterStartDate || filterEndDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Bulk Delete Panel */}
        {showBulkDelete && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Bulk Delete Events by Date Range
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={deleteStartDate}
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={deleteEndDate}
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDeleteConfirm}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Events
              </button>
              <button
                onClick={() => {
                  setShowBulkDelete(false);
                  setDeleteStartDate('');
                  setDeleteEndDate('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showBulkExport && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Export Events by Date Range
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkExport('json')}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => handleBulkExport('csv')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowBulkExport(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {filteredEvents.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} event(s)
            {allEvents.length !== filteredEvents.length && ` (${allEvents.length} total)`}
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No events yet
            </h2>
            <p className="text-gray-500 mb-6">
              {allEvents.length === 0
                ? 'Create your first event to get started'
                : 'No events match your search criteria'}
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedEvents.map((event) => (
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
                    onClick={() => handleDuplicate(event.id)}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-colors flex items-center gap-1"
                    title="Duplicate Event"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Items per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleBulkDeleteExecute}
          title="Confirm Bulk Delete"
          message={`Are you sure you want to delete ${eventsToDeleteCount} event(s) within the selected date range? This action cannot be undone.`}
          confirmText="Delete Events"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </div>
  );
}


