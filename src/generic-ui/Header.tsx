import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  ShieldCheck,
  LogOut,
  Settings,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { Button } from './components/Button';

export interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onCreateNewForm: () => void;
  isSupabaseConnected: boolean;
  onOpenSettings: () => void;
  onLogout?: () => void;
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onCreateNewForm,
  isSupabaseConnected,
  onOpenSettings,
  onLogout,
  adminName = 'Hamza Dohadwala',
  adminEmail = 'admin@eventform.com',
  adminRole = 'Administrator',
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      {/* Left section: mobile hamburger & search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-lg">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search forms, events, or submissions (Press '/' to focus)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right section: actions, status, profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Create Form Button */}
        <Button
          onClick={onCreateNewForm}
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          className="hidden sm:inline-flex"
        >
          Create Form
        </Button>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </button>

        {/* Profile Card & Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 py-1 pr-1.5 rounded-xl hover:bg-slate-100 transition-colors border-l border-slate-200/80"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-xs shadow-sm shadow-indigo-200">
              {adminName.charAt(0)}
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <p className="font-semibold text-slate-800">{adminName}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                {adminRole}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {/* Dropdown Popover */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-fade-in text-xs">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{adminName}</p>
                <p className="text-slate-500 truncate mt-0.5">{adminEmail}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    <UserCheck className="w-3 h-3" />
                    Verified Admin
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Platform Settings</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout?.();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out of Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
