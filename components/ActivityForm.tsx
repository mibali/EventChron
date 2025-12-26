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
            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-500 font-semibold w-8">{index + 1}.</span>
              <span className="font-medium text-gray-900">{activity.activityName}</span>
              <span className="text-gray-600">
                ({Math.floor(activity.timeAllotted / 60)} min)
              </span>
            </div>
            <button
              onClick={() => handleRemove(activity.id)}
              className="text-red-600 hover:text-red-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


