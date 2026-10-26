import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  Inbox,
  Settings,
  Sparkles,
  CalendarCheck2,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { Badge } from './components/Badge';

export type NavigationTab = 'dashboard' | 'forms' | 'new-form' | 'responses' | 'settings';

export interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  totalFormsCount: number;
  totalResponsesCount: number;
  onPreviewSampleEvent?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  totalFormsCount,
  totalResponsesCount,
  onPreviewSampleEvent,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'forms' as NavigationTab,
      label: 'All Forms',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: totalFormsCount > 0 ? totalFormsCount.toString() : null,
    },
    {
      id: 'new-form' as NavigationTab,
      label: 'Create New Form',
      icon: <PlusCircle className="w-4 h-4" />,
      badge: 'New',
      badgeVariant: 'success' as const,
    },
    {
      id: 'responses' as NavigationTab,
      label: 'Responses',
      icon: <Inbox className="w-4 h-4" />,
      badge: totalResponsesCount > 0 ? totalResponsesCount.toString() : null,
      badgeVariant: 'info' as const,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                EventForm
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded border border-indigo-400/30">
                  Pro
                </span>
              </span>
              <p className="text-[11px] text-slate-400">Builder & Registration</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <Badge
                    variant={item.badgeVariant || (isActive ? 'default' : 'neutral')}
                    size="sm"
                    className={
                      isActive
                        ? 'bg-indigo-500/40 text-indigo-100 border-indigo-400/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Public Event Test Box */}
        {onPreviewSampleEvent && (
          <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Live Participant View
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Test how cricket players or attendees view and fill your published form.
            </p>
            <button
              onClick={onPreviewSampleEvent}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs"
            >
              <span>Open Public Page</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Google Forms Alternative</span>
          <span className="font-mono text-slate-400">v1.2.0</span>
        </div>
      </aside>
    </>
  );
};
