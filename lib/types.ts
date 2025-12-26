export type LogoAlignment = 'left' | 'center' | 'right';

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
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityResult {
  activityName: string;
  timeAllotted: string;
  timeSpent: string;
  extraTimeTaken: string;
  timeGained: string;
  date: string;
}


