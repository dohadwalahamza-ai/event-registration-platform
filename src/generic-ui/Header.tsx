import React from 'react';
import { Menu, Search, Bell, Plus, ShieldCheck, Database, ExternalLink } from 'lucide-react';
import { Button } from './components/Button';
import { Badge } from './components/Badge';

export interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onCreateNewForm: () => void;
  isSupabaseConnected: boolean;
  onOpenSettings: () => void;
  adminName?: string;
  adminRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onCreateNewForm,
  isSupabaseConnected,
  onOpenSettings,
  adminName = 'Admin Organizer',
  adminRole = 'Administrator',
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      {/* Left section: mobile hamburger & breadcrumb/search */}
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
        {/* Backend Database Status indicator */}
        <button
          onClick={onOpenSettings}
          title={isSupabaseConnected ? 'Connected to Supabase PostgreSQL' : 'Operating in Offline / Local Mode (Click to configure Supabase)'}
          className="cursor-pointer"
        >
          <Badge
            variant={isSupabaseConnected ? 'success' : 'info'}
            dot
            size="sm"
            className="hidden md:inline-flex items-center gap-1.5 transition-all hover:opacity-85"
          >
            <Database className="w-3 h-3" />
            <span>{isSupabaseConnected ? 'Supabase Live' : 'Local Storage Mode'}</span>
          </Badge>
        </button>

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

        {/* Profile Card */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
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
        </div>
      </div>
    </header>
  );
};
