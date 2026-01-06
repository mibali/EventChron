'use client';

import { useState, useEffect } from 'react';
import { Edit2, Save, X, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { Activity } from '@/lib/types';
import { formatTimeReadable, parseTimeToSeconds, generateId } from '@/lib/utils';

interface EditableActivityListProps {
  activities: Activity[];
  onUpdate: (activities: Activity[]) => void;
  disabled?: boolean;
  currentActivityIndex?: number;
}

export default function EditableActivityList({ activities, onUpdate, disabled = false, currentActivityIndex }: EditableActivityListProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedActivities, setEditedActivities] = useState<Activity[]>(activities);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editTime, setEditTime] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityTime, setNewActivityTime] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync editedActivities when activities prop changes (but not when editing)
  useEffect(() => {
    if (!isEditing) {
      setEditedActivities(activities);
    }
  }, [activities, isEditing]);

  const handleStartEdit = (index: number) => {
    const activity = editedActivities[index];
    setEditingIndex(index);
    setEditName(activity.activityName);
    setEditTime(formatTimeReadable(activity.timeAllotted));
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const seconds = parseTimeToSeconds(editTime);
    if (seconds === 0) {
      alert('Please enter a valid time (e.g., "3 minutes", "12 minutes")');
      return;
    }

    const updated = [...editedActivities];
    updated[editingIndex] = {
      ...updated[editingIndex],
      activityName: editName.trim(),
      timeAllotted: seconds,
    };

    setEditedActivities(updated);
    setEditingIndex(null);
    setEditName('');
    setEditTime('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditName('');
    setEditTime('');
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

    const updated = [...editedActivities];
    const draggedItem = updated[draggedIndex];
    
    // Remove the dragged item
    updated.splice(draggedIndex, 1);
    
    // Insert at new position
    updated.splice(dropIndex, 0, draggedItem);
    
    setEditedActivities(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      const updated = editedActivities.filter((_, i) => i !== index);
      setEditedActivities(updated);
    }
  };

  const handleSaveAll = () => {
    onUpdate(editedActivities);
    setIsEditing(false);
  };

  const handleCancelAll = () => {
    setEditedActivities(activities);
    setIsEditing(false);
    setEditingIndex(null);
    setShowAddForm(false);
    setNewActivityName('');
    setNewActivityTime('');
  };

  const handleAddActivity = () => {
    if (!newActivityName.trim() || !newActivityTime.trim()) {
      alert('Please enter both activity name and time');
      return;
    }

    const seconds = parseTimeToSeconds(newActivityTime);
    if (seconds === 0) {
      alert('Please enter a valid time (e.g., "3 minutes", "12 minutes")');
      return;
    }

    const newActivity: Activity = {
      id: generateId(),
      activityName: newActivityName.trim(),
      timeAllotted: seconds,
      isCompleted: false,
      isActive: false,
    };

    setEditedActivities([...editedActivities, newActivity]);
    setNewActivityName('');
    setNewActivityTime('');
    setShowAddForm(false);
  };

  if (!isEditing && !disabled) {
    return (
      <div className="mt-12 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Activity List</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Activities
          </button>
        </div>
        {activities.map((activity, idx) => (
          <div
            key={activity.id}
            className={`p-4 rounded-lg border-2 ${
              idx === currentActivityIndex
                ? 'border-indigo-600 bg-indigo-50'
                : activity.isCompleted
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activity.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                )}
                <span className="text-gray-500 font-semibold w-8">{idx + 1}.</span>
                <span className="font-medium text-gray-900">{activity.activityName}</span>
                <span className="text-gray-600">
                  ({formatTimeReadable(activity.timeAllotted)})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Edit Activities</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={handleCancelAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>

      {/* Add New Activity Form */}
      {showAddForm ? (
        <div className="p-4 rounded-lg border-2 border-indigo-300 bg-indigo-50 mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Add New Activity</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Activity Name
              </label>
              <input
                type="text"
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="e.g., Opening Prayer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Time Allotted
              </label>
              <input
                type="text"
                value={newActivityTime}
                onChange={(e) => setNewActivityTime(e.target.value)}
                placeholder="e.g., 3 minutes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddActivity}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Activity
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewActivityName('');
                  setNewActivityTime('');
                }}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold rounded-lg border-2 border-dashed border-indigo-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Activity
        </button>
      )}

      {editedActivities.map((activity, idx) => (
        <div
          key={activity.id}
          draggable={editingIndex !== idx}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className={`p-4 rounded-lg border-2 transition-all cursor-move ${
            editingIndex === idx
              ? 'border-indigo-400 bg-indigo-100'
              : draggedIndex === idx
              ? 'border-indigo-500 bg-indigo-100 opacity-50'
              : dragOverIndex === idx
              ? 'border-indigo-500 bg-indigo-100 border-dashed'
              : 'border-indigo-200 bg-indigo-50'
          }`}
        >
          {editingIndex === idx ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Time Allotted
                </label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="e.g., 3 minutes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
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
                  <span className="text-gray-500 font-semibold w-8">{idx + 1}.</span>
                </div>
                <span className="font-medium text-gray-900">{activity.activityName}</span>
                <span className="text-gray-600">
                  ({formatTimeReadable(activity.timeAllotted)})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleStartEdit(idx)}
                  className="p-1.5 text-indigo-600 hover:text-indigo-700"
                  title="Edit"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  className="p-1.5 text-red-600 hover:text-red-700"
                  title="Delete"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

