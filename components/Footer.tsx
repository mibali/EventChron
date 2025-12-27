'use client';

import { useState } from 'react';

export default function Footer() {
  const [logoError, setLogoError] = useState(false);

  return (
    <footer className="bg-white border-t border-gray-200 py-3 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-center gap-2.5 text-sm text-gray-600">
          <span>Built by</span>
          {!logoError ? (
            <img
              src="/dualmind-logo.png"
              alt="DualMind"
              width={64}
              height={64}
              className="object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <svg
              width="64"
              height="64"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <circle cx="8" cy="8" r="7" stroke="#3B82F6" strokeWidth="1.5" fill="none"/>
              <path d="M8 1 L8 8 L15 8" stroke="#60A5FA" strokeWidth="1.5" fill="none"/>
            </svg>
          )}
          <span className="text-xs text-gray-400">© 2025</span>
        </div>
      </div>
    </footer>
  );
}

