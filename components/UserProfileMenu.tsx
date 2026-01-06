'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Settings, Trash2, ChevronDown } from 'lucide-react';

interface UserProfileMenuProps {
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}

export default function UserProfileMenu({ onDeleteAccount, isDeletingAccount }: UserProfileMenuProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!session?.user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors shadow-sm"
      >
        <User className="w-4 h-4" />
        <span className="text-sm">{session.user.email}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{session.user.name || 'User'}</p>
                <p className="text-xs text-gray-600">{session.user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Account</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  const confirmMessage = 'Are you absolutely sure? This will permanently delete:\n\n' +
                    '• Your account\n' +
                    '• All your events and activities\n' +
                    '• All associated data\n\n' +
                    'This action cannot be undone. You can sign up again with the same email in the future if you wish.';
                  
                  if (confirm(confirmMessage)) {
                    onDeleteAccount();
                  }
                }}
                disabled={isDeletingAccount}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </span>
              </button>
            </div>

            <div className="border-t border-gray-200 pt-2 mt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

