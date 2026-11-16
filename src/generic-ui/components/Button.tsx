import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap shrink-0';

    const variants = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 focus:ring-indigo-500 active:scale-[0.98]',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 active:scale-[0.98]',
      outline:
        'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-indigo-500 active:scale-[0.98]',
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 focus:ring-slate-300',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 focus:ring-rose-500 active:scale-[0.98]',
      success:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 focus:ring-emerald-500 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-9 min-h-[36px] max-h-[36px] text-xs px-3 rounded-xl gap-1.5 leading-none shrink-0',
      md: 'h-10 min-h-[40px] max-h-[40px] text-sm px-4 rounded-xl gap-2 leading-none shrink-0',
      lg: 'h-11 min-h-[44px] max-h-[44px] text-base px-5 rounded-xl gap-2.5 leading-none shrink-0',
      icon: 'h-9 w-9 min-h-[36px] max-h-[36px] min-w-[36px] max-w-[36px] p-0 rounded-xl shrink-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span className="whitespace-nowrap truncate inline-flex items-center gap-1.5">{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
