import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    '4xl': 'max-w-7xl',
    full: 'max-w-[96vw]',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Transparent backdrop - completely eliminates dark background layer */}
      <div
        className="fixed inset-0 bg-transparent pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centering wrapper ensuring modal is always in the proper middle area and never clipped */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-5 lg:p-8 text-center pointer-events-none">
        {/* Modal Dialog Content - takes full spacious area */}
        <div
          className={`pointer-events-auto relative w-full ${maxWidths[maxWidth]} bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 text-left overflow-hidden z-10 transition-all transform animate-fade-in my-auto sm:my-6`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 sm:p-8 border-b border-slate-100 bg-slate-50/40">
            <div className="pr-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{title}</h3>
              {description && <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body with full area support */}
          <div className="p-6 sm:p-8 max-h-[calc(88vh-140px)] overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
