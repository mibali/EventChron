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


