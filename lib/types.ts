export type LogoAlignment = 'left' | 'center' | 'right';

export interface TimerGradient {
  id: string;
  name: string;
  colors: string[]; // Array of color stops
  direction: string; // CSS gradient direction (e.g., 'to-br', 'to-r')
}

export interface Activity {
  id: string;
  activityName: string;
  timeAllotted: number; // in seconds
  timeSpent?: number; // in seconds
  extraTimeTaken?: number; // in seconds
  timeGained?: number; // in seconds
  isCompleted?: boolean;
  isActive?: boolean;
}

export interface Event {
  id: string;
  eventName: string;
  eventDate: string;
  logoUrl?: string;
  logoAlignment: LogoAlignment;
  timerGradient?: TimerGradient;
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

// Predefined gradient presets
export const GRADIENT_PRESETS: TimerGradient[] = [
  { id: 'default', name: 'Ocean Breeze', colors: ['#dbeafe', '#e0e7ff'], direction: 'to-br' },
  { id: 'sunset', name: 'Sunset Glow', colors: ['#fef3c7', '#fecaca', '#fae8ff'], direction: 'to-br' },
  { id: 'forest', name: 'Forest Mist', colors: ['#d1fae5', '#cffafe'], direction: 'to-br' },
  { id: 'lavender', name: 'Lavender Dream', colors: ['#ede9fe', '#fce7f3'], direction: 'to-br' },
  { id: 'midnight', name: 'Midnight Sky', colors: ['#1e3a5f', '#312e81', '#4c1d95'], direction: 'to-br' },
  { id: 'coral', name: 'Coral Reef', colors: ['#fee2e2', '#fed7aa', '#fef08a'], direction: 'to-r' },
  { id: 'arctic', name: 'Arctic Aurora', colors: ['#e0f2fe', '#ccfbf1', '#d1fae5'], direction: 'to-br' },
  { id: 'rose', name: 'Rose Garden', colors: ['#fce7f3', '#fbcfe8', '#f9a8d4'], direction: 'to-br' },
  { id: 'ember', name: 'Warm Ember', colors: ['#fef3c7', '#fde68a', '#fcd34d'], direction: 'to-br' },
  { id: 'slate', name: 'Slate Professional', colors: ['#f1f5f9', '#e2e8f0', '#cbd5e1'], direction: 'to-br' },
];

export interface ActivityResult {
  activityName: string;
  timeAllotted: string;
  timeSpent: string;
  extraTimeTaken: string;
  timeGained: string;
  date: string;
}


