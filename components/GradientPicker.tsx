'use client';

import { useState } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { TimerGradient, GRADIENT_PRESETS } from '@/lib/types';

interface GradientPickerProps {
  value: TimerGradient | undefined;
  onChange: (gradient: TimerGradient) => void;
}

// Helper to convert gradient to CSS
export function gradientToCSS(gradient: TimerGradient | undefined): string {
  if (!gradient) {
    return 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)';
  }
  
  const direction = gradient.direction === 'to-br' ? 'to bottom right' :
                    gradient.direction === 'to-r' ? 'to right' :
                    gradient.direction === 'to-b' ? 'to bottom' :
                    gradient.direction === 'to-tr' ? 'to top right' :
                    'to bottom right';
  
  return `linear-gradient(${direction}, ${gradient.colors.join(', ')})`;
}

export default function GradientPicker({ value, onChange }: GradientPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>(
    value?.colors || ['#dbeafe', '#e0e7ff']
  );
  const [customDirection, setCustomDirection] = useState(value?.direction || 'to-br');

  const handlePresetSelect = (preset: TimerGradient) => {
    onChange(preset);
    setShowCustom(false);
  };

  const handleCustomColorChange = (index: number, color: string) => {
    const newColors = [...customColors];
    newColors[index] = color;
    setCustomColors(newColors);
    
    onChange({
      id: 'custom',
      name: 'Custom Gradient',
      colors: newColors,
      direction: customDirection,
    });
  };

  const handleAddColor = () => {
    if (customColors.length < 4) {
      const newColors = [...customColors, '#ffffff'];
      setCustomColors(newColors);
      onChange({
        id: 'custom',
        name: 'Custom Gradient',
        colors: newColors,
        direction: customDirection,
      });
    }
  };

  const handleRemoveColor = (index: number) => {
    if (customColors.length > 2) {
      const newColors = customColors.filter((_, i) => i !== index);
      setCustomColors(newColors);
      onChange({
        id: 'custom',
        name: 'Custom Gradient',
        colors: newColors,
        direction: customDirection,
      });
    }
  };

  const handleDirectionChange = (direction: string) => {
    setCustomDirection(direction);
    onChange({
      id: 'custom',
      name: 'Custom Gradient',
      colors: customColors,
      direction,
    });
  };

  const isSelected = (preset: TimerGradient) => {
    if (!value) return preset.id === 'default';
    return value.id === preset.id;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600" />
            Timer Background
          </div>
        </label>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
            showCustom 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
          }`}
        >
          {showCustom ? 'Show Presets' : 'Custom Colors'}
        </button>
      </div>

      {/* Preview */}
      <div 
        className="h-24 rounded-xl shadow-inner border border-gray-200 flex items-center justify-center overflow-hidden"
        style={{ background: gradientToCSS(value || GRADIENT_PRESETS[0]) }}
      >
        <div className="text-center">
          <p className="text-4xl font-mono font-bold text-gray-800/80">12:34</p>
          <p className="text-xs text-gray-600/70 mt-1">Preview</p>
        </div>
      </div>

      {!showCustom ? (
        /* Preset Gradients Grid */
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`relative group rounded-xl p-1 transition-all ${
                isSelected(preset)
                  ? 'ring-2 ring-indigo-500 ring-offset-2'
                  : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
              }`}
            >
              <div
                className="h-14 rounded-lg shadow-sm"
                style={{ background: gradientToCSS(preset) }}
              />
              <p className="text-xs text-gray-600 mt-1.5 truncate px-1">
                {preset.name}
              </p>
              {isSelected(preset) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Custom Color Picker */
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Sparkles className="w-4 h-4" />
            Create your own gradient
          </div>

          {/* Color Stops */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Color Stops
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {customColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleCustomColorChange(index, e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white shadow-md"
                  />
                  {customColors.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {customColors.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddColor}
                  className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 text-gray-400 hover:text-indigo-500 transition-colors flex items-center justify-center text-2xl"
                >
                  +
                </button>
              )}
            </div>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Direction
            </label>
            <div className="flex gap-2">
              {[
                { value: 'to-br', label: '↘', title: 'Diagonal' },
                { value: 'to-r', label: '→', title: 'Horizontal' },
                { value: 'to-b', label: '↓', title: 'Vertical' },
                { value: 'to-tr', label: '↗', title: 'Diagonal Up' },
              ].map((dir) => (
                <button
                  key={dir.value}
                  type="button"
                  onClick={() => handleDirectionChange(dir.value)}
                  title={dir.title}
                  className={`w-10 h-10 rounded-lg text-lg font-bold transition-colors ${
                    customDirection === dir.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
