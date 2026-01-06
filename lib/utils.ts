import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);

  return parts.join(' ');
}

export function parseTimeToSeconds(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') return 0;
  
  const trimmed = timeString.trim();
  
  // Handle HH:MM:SS or MM:SS format (e.g., "00:05:00", "05:00")
  const timeFormatMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeFormatMatch) {
    const hours = timeFormatMatch[3] !== undefined ? parseInt(timeFormatMatch[1]) : 0;
    const minutes = timeFormatMatch[3] !== undefined ? parseInt(timeFormatMatch[2]) : parseInt(timeFormatMatch[1]);
    const seconds = timeFormatMatch[3] !== undefined ? parseInt(timeFormatMatch[3]) : parseInt(timeFormatMatch[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  // Handle seconds format (e.g., "90s", "120s")
  const secondsMatch = trimmed.match(/^(\d+)s$/i);
  if (secondsMatch) {
    return parseInt(secondsMatch[1]);
  }
  
  // Handle natural language format (e.g., "3 minutes", "1 hour 30 minutes")
  const parts = trimmed.toLowerCase().split(/\s+/);
  let totalSeconds = 0;

  for (let i = 0; i < parts.length; i += 2) {
    const value = parseInt(parts[i]);
    if (isNaN(value)) continue;
    
    const unit = parts[i + 1] || '';

    if (unit.includes('hour')) {
      totalSeconds += value * 3600;
    } else if (unit.includes('minute') || unit.includes('min')) {
      totalSeconds += value * 60;
    } else if (unit.includes('second') || unit.includes('sec')) {
      totalSeconds += value;
    } else if (i === 0 && parts.length === 1) {
      // If it's just a number, assume minutes
      totalSeconds += value * 60;
    }
  }

  return totalSeconds || 0;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function compressImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with quality compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}


