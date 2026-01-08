import { Event, Activity } from './types';

const API_BASE = '/api';

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// Transform database event to client format
function transformEvent(event: any): Event {
  return {
    id: event.id,
    eventName: event.eventName,
    eventDate: typeof event.eventDate === 'string' 
      ? event.eventDate 
      : new Date(event.eventDate).toISOString().split('T')[0],
    logoUrl: event.logoUrl || undefined,
    logoAlignment: event.logoAlignment || 'center',
    activities: (event.activities || []).map((a: any) => ({
      id: a.id,
      activityName: a.activityName,
      timeAllotted: a.timeAllotted,
      timeSpent: a.timeSpent || undefined,
      extraTimeTaken: a.extraTimeTaken || undefined,
      timeGained: a.timeGained || undefined,
      isCompleted: a.isCompleted || false,
      isActive: a.isActive || false,
    })),
    createdAt: typeof event.createdAt === 'string' 
      ? event.createdAt 
      : new Date(event.createdAt).toISOString(),
    updatedAt: typeof event.updatedAt === 'string' 
      ? event.updatedAt 
      : new Date(event.updatedAt).toISOString(),
  };
}

// Events API
export async function getEvents(params?: {
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<Event[]> {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.search) queryParams.append('search', params.search);

  const url = `${API_BASE}/events${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });
  const events = await handleResponse<any[]>(response);
  return events.map(transformEvent);
}

export async function getEventById(id: string): Promise<Event> {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    credentials: 'include',
  });
  const event = await handleResponse<any>(response);
  return transformEvent(event);
}

export async function createEvent(event: {
  eventName: string;
  eventDate: string;
  logoUrl?: string;
  logoAlignment: 'left' | 'center' | 'right';
  activities: Omit<Activity, 'id'>[];
}): Promise<Event> {
  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(event),
  });
  const createdEvent = await handleResponse<any>(response);
  return transformEvent(createdEvent);
}

export async function updateEvent(
  id: string,
  event: Partial<{
    eventName: string;
    eventDate: string;
    logoUrl: string;
    logoAlignment: 'left' | 'center' | 'right';
    activities: Activity[];
  }>
): Promise<Event> {
  const url = `${API_BASE}/events/${id}`;
  console.log('updateEvent: Making PUT request', {
    url,
    eventId: id,
    eventIdType: typeof id,
    hasActivities: !!event.activities,
    activitiesCount: event.activities?.length,
  });

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(event),
  });

  console.log('updateEvent: Response received', {
    url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  const updatedEvent = await handleResponse<any>(response);
  return transformEvent(updatedEvent);
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to delete event');
  }
}

// Bulk operations
export async function bulkDeleteEvents(
  startDate: string,
  endDate: string
): Promise<number> {
  const events = await getEvents({ startDate, endDate });
  const deletePromises = events.map((event) => deleteEvent(event.id));
  await Promise.all(deletePromises);
  return events.length;
}

export async function duplicateEvent(id: string): Promise<Event> {
  const event = await getEventById(id);
  const duplicated = await createEvent({
    eventName: `${event.eventName} (Copy)`,
    eventDate: event.eventDate,
    logoUrl: event.logoUrl || undefined,
    logoAlignment: event.logoAlignment,
    activities: event.activities.map((a) => ({
      activityName: a.activityName,
      timeAllotted: a.timeAllotted,
      isCompleted: false,
      isActive: false,
    })),
  });
  return duplicated;
}

