import { Activity, ActivityResult } from './types';
import { formatTimeReadable } from './utils';

export function convertActivitiesToResults(activities: Activity[], eventDate: string): ActivityResult[] {
  return activities
    .filter(a => a.isCompleted && a.timeSpent !== undefined)
    .map(activity => {
      const timeSpent = activity.timeSpent || 0;
      const timeAllotted = activity.timeAllotted;
      
      let extraTimeTaken = 0;
      let timeGained = 0;

      if (timeSpent > timeAllotted) {
        extraTimeTaken = timeSpent - timeAllotted;
      } else {
        timeGained = timeAllotted - timeSpent;
      }

      return {
        activityName: activity.activityName,
        timeAllotted: formatTimeReadable(timeAllotted),
        timeSpent: formatTimeReadable(timeSpent),
        extraTimeTaken: formatTimeReadable(extraTimeTaken),
        timeGained: formatTimeReadable(timeGained),
        date: eventDate,
      };
    });
}

export function exportToJSON(data: ActivityResult[]): string {
  return JSON.stringify(data, null, 2);
}

export function exportToCSV(data: ActivityResult[]): string {
  if (data.length === 0) return '';

  const headers = ['Activity Name', 'Time Allotted', 'Time Spent', 'Extra Time Taken', 'Time Gained', 'Date'];
  const rows = data.map(item => [
    item.activityName,
    item.timeAllotted,
    item.timeSpent,
    item.extraTimeTaken,
    item.timeGained,
    item.date,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


