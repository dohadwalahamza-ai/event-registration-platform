import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, NavigationTab } from './Sidebar';
import { Footer } from './Footer';
import { Form, Submission } from '../types';

export interface LayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onCreateNewForm: () => void;
  totalFormsCount: number;
  totalResponsesCount: number;
  isSupabaseConnected: boolean;
  onLogout?: () => void;
  adminName?: string;
  adminEmail?: string;
  submissions?: Submission[];
  forms?: Form[];
  onSelectFormResponses?: (formId: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  onCreateNewForm,
  totalFormsCount,
  totalResponsesCount,
  isSupabaseConnected,
  onLogout,
  adminName,
  adminEmail,
  submissions,
  forms,
  onSelectFormResponses,
  children,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        totalFormsCount={totalFormsCount}
        totalResponsesCount={totalResponsesCount}
        onLogout={onLogout}
        adminName={adminName}
        adminEmail={adminEmail}
      />

      {/* Main Content Wrapper (offset for fixed sidebar on lg screens) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen transition-all duration-300">
        {/* Top Header */}
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onCreateNewForm={onCreateNewForm}
          isSupabaseConnected={isSupabaseConnected}
          onLogout={onLogout || (() => {})}
          adminName={adminName}
          adminEmail={adminEmail}
          submissions={submissions}
          forms={forms}
          onSelectFormResponses={onSelectFormResponses}
        />

        {/* Page Content View - Full Fluid Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};
