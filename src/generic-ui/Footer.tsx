import React from 'react';
import { ShieldCheck, Heart, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 px-6 sm:px-8 border-t border-slate-200/80 bg-white/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-700">EventForm Platform</span>
        <span className="text-slate-300">•</span>
        <span>Dynamic Form Builder & Registration Engine</span>
      </div>

      <div className="flex items-center gap-4 text-slate-500">
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          All Services Operational
        </span>
        <span className="text-slate-300">•</span>
        <span>Open Source Edition</span>
      </div>
    </footer>
  );
};
