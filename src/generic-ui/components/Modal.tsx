import React, { useEffect, useRef } from 'react';
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
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
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
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Transparent backdrop - completely eliminates dark background layer */}
      <div
        className="fixed inset-0 bg-transparent cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content - properly centered in middle area, fits viewport cleanly without unnecessary scrolling */}
      <div
        className={`relative w-full ${maxWidths[maxWidth]} max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 text-left overflow-hidden z-10 transition-all transform animate-fade-in flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - fixed at top of modal, never scrolls off */}
        <div className="flex items-start justify-between p-4 sm:p-5 px-5 sm:px-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="pr-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">{title}</h3>
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - cleanly fits content; scrolls only as fallback on extremely constrained screens */}
        <div
          ref={modalBodyRef}
          className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain"
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3 sm:p-4 px-5 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
