'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Activity } from '@/lib/types';
import { generateId, parseTimeToSeconds } from '@/lib/utils';

interface ActivityFormProps {
  activities: Activity[];
  onChange: (activities: Activity[]) => void;
}

export default function ActivityForm({ activities, onChange }: ActivityFormProps) {
  const [activityName, setActivityName] = useState('');
  const [timeAllotted, setTimeAllotted] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (!activityName.trim() || !timeAllotted.trim()) return;

    const seconds = parseTimeToSeconds(timeAllotted);
    if (seconds === 0) {
      alert('Please enter a valid time (e.g., "3 minutes", "12 minutes")');
      return;
    }

    const newActivity: Activity = {
      id: generateId(),
      activityName: activityName.trim(),
      timeAllotted: seconds,
    };

    onChange([...activities, newActivity]);
    setActivityName('');
    setTimeAllotted('');
  };

  const handleRemove = (id: string) => {
    onChange(activities.filter(a => a.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...activities];
    const draggedItem = updated[draggedIndex];
    
    // Remove the dragged item
    updated.splice(draggedIndex, 1);
    
    // Insert at new position
    updated.splice(dropIndex, 0, draggedItem);
    
    onChange(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900">Activities</h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Activity name (e.g., Opening Prayer)"
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
        />
        <input
          type="text"
          placeholder="Time (e.g., 3 minutes)"
          value={timeAllotted}
          onChange={(e) => setTimeAllotted(e.target.value)}
          className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
        />
        <button
          onClick={handleAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between bg-gray-50 p-3 rounded-lg transition-all cursor-move ${
              draggedIndex === index
                ? 'opacity-50 border-2 border-indigo-300'
                : dragOverIndex === index
                ? 'border-2 border-indigo-400 border-dashed bg-indigo-50'
                : 'border border-transparent hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-gray-400 cursor-move">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="4" cy="4" r="1.5"/>
                    <circle cx="12" cy="4" r="1.5"/>
                    <circle cx="4" cy="8" r="1.5"/>
                    <circle cx="12" cy="8" r="1.5"/>
                    <circle cx="4" cy="12" r="1.5"/>
                    <circle cx="12" cy="12" r="1.5"/>
                  </svg>
                </div>
                <span className="text-gray-500 font-semibold w-8">{index + 1}.</span>
              </div>
              <span className="font-medium text-gray-900">{activity.activityName}</span>
              <span className="text-gray-600">
                ({Math.floor(activity.timeAllotted / 60)} min)
              </span>
            </div>
            <button
              onClick={() => handleRemove(activity.id)}
              className="text-red-600 hover:text-red-700 p-1"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


