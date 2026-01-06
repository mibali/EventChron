'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Calendar, Clock, Copy, Download, Filter, Search, Upload, Trash2, ChevronLeft, ChevronRight, LogOut, User, Home } from 'lucide-react';
import { getEvents, deleteEvent, duplicateEvent, bulkDeleteEvents } from '@/lib/api';
import { Event } from '@/lib/types';
import { formatTimeReadable, generateId, parseTimeToSeconds } from '@/lib/utils';
import ConfirmationModal from '@/components/ConfirmationModal';
import UserProfileMenu from '@/components/UserProfileMenu';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      loadEvents();
    }
  }, [status, router]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const events = await getEvents({
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        search: searchQuery || undefined,
      });
      setAllEvents(events);
      applyFilters(events);
    } catch (error) {
      console.error('Error loading events:', error);
      alert('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadEvents();
    }
  }, [searchQuery, filterStartDate, filterEndDate]);

  const applyFilters = (events: Event[]) => {
    let filtered = [...events];

    // Additional client-side filtering if needed
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(id);
        await loadEvents();
      } catch (error) {
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateEvent(id);
      await loadEvents();
    } catch (error) {
      alert('Failed to duplicate event. Please try again.');
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (!deleteStartDate || !deleteEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    const eventsToDelete = allEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      const start = new Date(deleteStartDate);
      const end = new Date(deleteEndDate);
      end.setHours(23, 59, 59, 999);
      return eventDate >= start && eventDate <= end;
    });

    if (eventsToDelete.length === 0) {
      alert('No events found in the selected date range');
      return;
    }

    setEventsToDeleteCount(eventsToDelete.length);
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteExecute = async () => {
    try {
      await bulkDeleteEvents(deleteStartDate, deleteEndDate);
      await loadEvents();
      setShowBulkDelete(false);
      setDeleteStartDate('');
      setDeleteEndDate('');
      alert(`Successfully deleted ${eventsToDeleteCount} event(s)`);
    } catch (error) {
      alert('Failed to delete events. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This will permanently delete your account and ALL your events. This cannot be undone.')) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete account. Please try again.');
        setIsDeletingAccount(false);
        return;
      }

      // Sign out and redirect to home
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'json' && fileExtension !== 'csv') {
      alert('Please select a JSON or CSV file');
      return;
    }

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
        
        // Handle different JSON formats
        let activities: any[] = [];
        let eventName = fileNameWithoutExt || 'Imported Event';
        let eventDate = new Date().toISOString().split('T')[0];
        let logoUrl = '';
        let logoAlignment: 'left' | 'center' | 'right' = 'center';
        
        // Check if it's an array of events (bulk export format)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstEvent = parsed[0];
          
          // Check if first item is an event object with activities
          if (firstEvent.eventName && firstEvent.activities && Array.isArray(firstEvent.activities)) {
            eventName = firstEvent.eventName || eventName;
            eventDate = firstEvent.eventDate || eventDate;
            logoUrl = firstEvent.logoUrl || '';
            logoAlignment = firstEvent.logoAlignment || 'center';
            
            activities = firstEvent.activities.map((activity: any) => {
              let timeAllotted = 180; // default
              
              if (activity.timeAllotted) {
                if (typeof activity.timeAllotted === 'string') {
                  // Parse formatted time string (e.g., "3 minutes", "1 hour 30 minutes")
                  timeAllotted = parseTimeToSeconds(activity.timeAllotted);
                } else if (typeof activity.timeAllotted === 'number') {
                  // Already in seconds
                  timeAllotted = activity.timeAllotted;
                }
              }
              
              return {
                id: generateId(),
                activityName: activity.activityName || activity.name || 'Activity',
                timeAllotted: timeAllotted || 180,
                isCompleted: false,
                isActive: false,
              };
            });
          } 
          // Check if it's an array of ActivityResult objects (single event export format)
          else if (firstEvent.activityName && !firstEvent.eventName) {
            activities = parsed.map((result: any) => {
              let timeAllotted = 180;
              
              if (result.timeAllotted) {
                if (typeof result.timeAllotted === 'string') {
                  timeAllotted = parseTimeToSeconds(result.timeAllotted);
                } else if (typeof result.timeAllotted === 'number') {
                  timeAllotted = result.timeAllotted;
                }
              }
              
              return {
                id: generateId(),
                activityName: result.activityName || 'Activity',
                timeAllotted: timeAllotted || 180,
                isCompleted: false,
                isActive: false,
              };
            });
            
            // Try to get event date from first result
            if (parsed[0].date) {
              eventDate = parsed[0].date;
            }
          }
        } 
        // Handle single event object
        else if (parsed && typeof parsed === 'object') {
          if (parsed.eventName) {
            eventName = parsed.eventName;
          }
          if (parsed.eventDate) {
            eventDate = parsed.eventDate;
          }
          if (parsed.logoUrl) {
            logoUrl = parsed.logoUrl;
          }
          if (parsed.logoAlignment) {
            logoAlignment = parsed.logoAlignment;
          }
          
          if (parsed.activities && Array.isArray(parsed.activities)) {
            activities = parsed.activities.map((activity: any) => {
              let timeAllotted = 180;
              
              if (activity.timeAllotted) {
                if (typeof activity.timeAllotted === 'string') {
                  timeAllotted = parseTimeToSeconds(activity.timeAllotted);
                } else if (typeof activity.timeAllotted === 'number') {
                  timeAllotted = activity.timeAllotted;
                }
              }
              
              return {
                id: generateId(),
                activityName: activity.activityName || activity.name || 'Activity',
                timeAllotted: timeAllotted || 180,
                isCompleted: false,
                isActive: false,
              };
            });
          }
        }
        
        if (activities.length === 0) {
          alert('No activities found in the JSON file. Please ensure the file contains an activities array.');
          e.target.value = '';
          return;
        }

        // Ensure date is in YYYY-MM-DD format
        if (eventDate && typeof eventDate === 'string') {
          const dateObj = new Date(eventDate);
          if (!isNaN(dateObj.getTime())) {
            eventDate = dateObj.toISOString().split('T')[0];
          }
        }

        importedEvent = {
          eventName,
          eventDate,
          logoUrl,
          logoAlignment,
          activities,
        };
      } else {
        // CSV parsing
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          alert('CSV file is empty');
          e.target.value = '';
          return;
        }

        // Parse CSV header
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        
        // Find column indices
        const activityNameIdx = headers.findIndex(h => 
          h.includes('activity') && h.includes('name')
        );
        const timeAllottedIdx = headers.findIndex(h => 
          h.includes('time') && (h.includes('allotted') || h.includes('duration'))
        );
        const eventNameIdx = headers.findIndex(h => 
          h.includes('event') && h.includes('name')
        );
        const eventDateIdx = headers.findIndex(h => 
          h.includes('event') && h.includes('date')
        );

        // If we have activity columns, parse activities
        if (activityNameIdx >= 0 && timeAllottedIdx >= 0) {
          const activities: any[] = [];
          
          // Parse data rows (skip header)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Handle quoted values
            const values: string[] = [];
            let currentValue = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim()); // Add last value

            if (values.length > Math.max(activityNameIdx, timeAllottedIdx)) {
              const activityName = values[activityNameIdx]?.replace(/^"|"$/g, '') || 'Activity';
              const timeAllottedStr = values[timeAllottedIdx]?.replace(/^"|"$/g, '') || '3 minutes';
              
              // Parse time string to seconds
              const timeAllotted = parseTimeToSeconds(timeAllottedStr);
              
              activities.push({
                id: generateId(),
                activityName,
                timeAllotted: timeAllotted || 180, // Default to 3 minutes
                isCompleted: false,
                isActive: false,
              });
            }
          }

          // Get event name and date from CSV or use defaults
          let eventName = fileNameWithoutExt || 'Imported Event';
          let eventDate = new Date().toISOString().split('T')[0];

          // Try to extract event name/date from first data row if columns exist
          if (lines.length > 1) {
            const firstDataLine = lines[1];
            const firstValues: string[] = [];
            let currentValue = '';
            let inQuotes = false;
            
            for (let j = 0; j < firstDataLine.length; j++) {
              const char = firstDataLine[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                firstValues.push(currentValue.trim());
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            firstValues.push(currentValue.trim());

            if (eventNameIdx >= 0 && firstValues[eventNameIdx]) {
              eventName = firstValues[eventNameIdx].replace(/^"|"$/g, '') || eventName;
            }
            if (eventDateIdx >= 0 && firstValues[eventDateIdx]) {
              const dateStr = firstValues[eventDateIdx].replace(/^"|"$/g, '');
              // Try to parse date
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                eventDate = parsedDate.toISOString().split('T')[0];
              }
            }
          }

          if (activities.length === 0) {
            alert('No activities found in CSV file. Please ensure the file has "Activity Name" and "Time Allotted" columns.');
            e.target.value = '';
            return;
          }

          importedEvent = {
            eventName,
            eventDate,
            logoUrl: '',
            logoAlignment: 'center' as 'left' | 'center' | 'right',
            activities,
          };
        } else {
          // Try alternative format: simple list of activities
          // Format: Activity Name, Time (one per line, no header)
          if (lines.length > 0 && !headerLine.toLowerCase().includes('activity')) {
            // Assume first line might be header, try parsing as simple format
            const activities: any[] = [];
            const startIdx = headers.some(h => h.includes('activity') || h.includes('name')) ? 1 : 0;
            
            for (let i = startIdx; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
              if (parts.length >= 2) {
                const activityName = parts[0] || 'Activity';
                const timeStr = parts[1] || '3 minutes';
                const timeAllotted = parseTimeToSeconds(timeStr);
                
                activities.push({
                  id: generateId(),
                  activityName,
                  timeAllotted: timeAllotted || 180,
                  isCompleted: false,
                  isActive: false,
                });
              } else if (parts.length === 1 && parts[0]) {
                // Single column - assume it's activity name with default time
                activities.push({
                  id: generateId(),
                  activityName: parts[0],
                  timeAllotted: 180,
                  isCompleted: false,
                  isActive: false,
                });
              }
            }

            if (activities.length > 0) {
              importedEvent = {
                eventName: fileNameWithoutExt || 'Imported Event',
                eventDate: new Date().toISOString().split('T')[0],
                logoUrl: '',
                logoAlignment: 'center' as 'left' | 'center' | 'right',
                activities,
              };
            } else {
              alert('Could not parse CSV file. Please ensure it has "Activity Name" and "Time Allotted" columns, or use the format: Activity Name, Time (e.g., "Opening Prayer, 5 minutes")');
              e.target.value = '';
              return;
            }
          } else {
            alert('CSV file must contain "Activity Name" and "Time Allotted" columns. Please check the file format.');
            e.target.value = '';
            return;
          }
        }
      }

      if (!importedEvent || !importedEvent.eventName || !importedEvent.eventDate) {
        alert('No valid event data found in the file');
        e.target.value = '';
        return;
      }

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
    end.setHours(23, 59, 59, 999);

    const exportFilteredEvents = allEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate >= start && eventDate <= end;
    });

    if (exportFilteredEvents.length === 0) {
      alert('No events found in the selected date range');
      return;
    }

    if (format === 'json') {
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-block">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 hover:text-indigo-600 transition-colors cursor-pointer">
                EventChron
              </h1>
            </Link>
            <p className="text-lg text-gray-600">
              Manage your events with professional count-up timers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </Link>
            <UserProfileMenu
              onDeleteAccount={handleDeleteAccount}
              isDeletingAccount={isDeletingAccount}
            />
          </div>
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
            <div className="mb-4 text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} event(s)
            </div>
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

