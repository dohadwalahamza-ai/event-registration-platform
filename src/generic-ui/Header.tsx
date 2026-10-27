import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  ShieldCheck,
  LogOut,
  ChevronDown,
  UserCheck,
  Inbox,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from './components/Button';
import { Form, Submission } from '../types';

export interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onCreateNewForm: () => void;
  isSupabaseConnected?: boolean;
  onLogout?: () => void;
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
  submissions?: Submission[];
  forms?: Form[];
  onSelectFormResponses?: (formId: string) => void;
}

function formatTimeAgo(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recent';
  }
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onCreateNewForm,
  isSupabaseConnected,
  onLogout,
  adminName = 'Hamza Dohadwala',
  adminEmail = 'admin@admin.com',
  adminRole = 'Administrator',
  submissions = [],
  forms = [],
  onSelectFormResponses,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const recentSubmissions = useMemo(() => {
    return [...submissions]
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 8);
  }, [submissions]);

  const formTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of forms) {
      map[f.id] = f.title;
    }
    return map;
  }, [forms]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotificationsOpen(false);
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

        {/* Notification Bell with Responses Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
              isNotificationsOpen
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="View recent response notifications"
          >
            <Bell className="w-4 h-4" />
            {recentSubmissions.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                {recentSubmissions.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-fade-in text-xs">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Inbox className="w-4 h-4 text-indigo-600" />
                  <span>Submitted Responses</span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {recentSubmissions.length} recent
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {recentSubmissions.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-400 space-y-1">
                    <p className="font-medium text-slate-600 text-xs">No responses yet</p>
                    <p className="text-[11px]">When participants submit your forms, their responses will appear here in real time.</p>
                  </div>
                ) : (
                  recentSubmissions.map((sub) => {
                    const applicant =
                      sub.applicant_name ||
                      sub.submission_data?.full_name ||
                      sub.submission_data?.name ||
                      'New Participant';
                    const formTitle = formTitleMap[sub.form_id] || 'Event Registration Form';
                    const timeAgo = formatTimeAgo(sub.submitted_at);

                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          if (onSelectFormResponses) {
                            onSelectFormResponses(sub.form_id);
                          } else {
                            window.location.hash = `#/responses/${sub.form_id}`;
                          }
                        }}
                        className="w-full text-left p-3.5 hover:bg-indigo-50/50 transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                          {applicant.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                              {applicant}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {timeAgo}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Registered for <span className="font-medium text-slate-700">{formTitle}</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase">
                              {sub.status || 'Confirmed'}
                            </span>
                            {sub.submission_data?.phone_number && (
                              <span className="text-[10px] text-slate-400 truncate">
                                • {sub.submission_data.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {recentSubmissions.length > 0 && (
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      window.location.hash = '#/responses';
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Responses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
