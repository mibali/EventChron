import { Event, ActivityResult } from './types';

const EVENTS_STORAGE_KEY = 'event_timer_events';

export function saveEvent(event: Event): void {
  const events = getAllEvents();
  const existingIndex = events.findIndex(e => e.id === event.id);
  
  if (existingIndex >= 0) {
    events[existingIndex] = { ...event, updatedAt: new Date().toISOString() };
  } else {
    events.push(event);
  }
  
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export function getAllEvents(): Event[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getEventById(id: string): Event | null {
  const events = getAllEvents();
  return events.find(e => e.id === id) || null;
}

export function deleteEvent(id: string): void {
  const events = getAllEvents();
  const filtered = events.filter(e => e.id !== id);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(filtered));
}

export function duplicateEvent(id: string): Event | null {
  const event = getEventById(id);
  if (!event) return null;

  const duplicatedEvent: Event = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventName: `${event.eventName} (Copy)`,
    activities: event.activities.map(a => ({
      ...a,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCompleted: false,
      isActive: false,
      timeSpent: undefined,
      extraTimeTaken: undefined,
      timeGained: undefined,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveEvent(duplicatedEvent);
  return duplicatedEvent;
}

export function bulkDeleteEvents(startDate: string, endDate: string): number {
  const events = getAllEvents();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const filtered = events.filter(event => {
    const eventDate = new Date(event.eventDate);
    return !(eventDate >= start && eventDate <= end);
  });

  const deletedCount = events.length - filtered.length;
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(filtered));
  return deletedCount;
}

export function importEvents(eventsToImport: Event[]): { success: number; errors: string[] } {
  const errors: string[] = [];
  let successCount = 0;

  eventsToImport.forEach((event, index) => {
    try {
      // Validate event structure
      if (!event.eventName || !event.eventDate || !Array.isArray(event.activities)) {
        errors.push(`Event ${index + 1}: Missing required fields (eventName, eventDate, or activities)`);
        return;
      }

      // Generate new IDs to avoid conflicts
      const newEvent: Event = {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
        activities: event.activities.map((a, aIdx) => ({
          ...a,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}-${aIdx}`,
          isCompleted: false,
          isActive: false,
          timeSpent: undefined,
          extraTimeTaken: undefined,
          timeGained: undefined,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveEvent(newEvent);
      successCount++;
    } catch (error) {
      errors.push(`Event ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  return { success: successCount, errors };
}


