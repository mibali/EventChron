import { Event, Activity, TimerGradient } from './types';

const API_BASE = '/api';

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP error! status: ${response.status} ${response.statusText}` };
    }
    
    const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
    console.error('handleResponse: API error', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorMessage,
    });
    
    throw new Error(errorMessage);
  }
  return response.json();
}

// Transform database event to client format
function transformEvent(event: any): Event {
  // Parse timerGradient if it's a JSON string
  let timerGradient: TimerGradient | undefined;
  if (event.timerGradient) {
    try {
      timerGradient = typeof event.timerGradient === 'string' 
        ? JSON.parse(event.timerGradient) 
        : event.timerGradient;
    } catch {
      timerGradient = undefined;
    }
  }

  return {
    id: event.id,
    eventName: event.eventName,
    eventDate: typeof event.eventDate === 'string' 
      ? event.eventDate 
      : new Date(event.eventDate).toISOString().split('T')[0],
    logoUrl: event.logoUrl || undefined,
    logoAlignment: event.logoAlignment || 'center',
    timerGradient,
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
  timerGradient?: TimerGradient;
  activities: Omit<Activity, 'id'>[];
}): Promise<Event> {
  const url = `${API_BASE}/events`;
  console.log('createEvent: Making POST request', {
    url,
    eventName: event.eventName,
    eventDate: event.eventDate,
    activitiesCount: event.activities.length,
    activities: event.activities.map(a => ({
      name: a.activityName,
      timeAllotted: a.timeAllotted,
      timeAllottedType: typeof a.timeAllotted,
    })),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(event),
  });

  console.log('createEvent: Response received', {
    url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
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
    timerGradient: TimerGradient;
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
    timerGradient: event.timerGradient,
    activities: event.activities.map((a) => ({
      activityName: a.activityName,
      timeAllotted: a.timeAllotted,
      isCompleted: false,
      isActive: false,
    })),
  });
  return duplicated;
}

