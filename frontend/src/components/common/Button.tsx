import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  let baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  let sizeStyles = 'px-3.5 py-2 text-sm gap-2';
  if (size === 'sm') sizeStyles = 'px-2.5 py-1 text-xs gap-1.5';
  if (size === 'lg') sizeStyles = 'px-5 py-2.5 text-base gap-2.5';

  let variantStyles = 'bg-resq-blue hover:bg-resq-blue-dark text-white focus:ring-resq-blue shadow-sm';
  if (variant === 'secondary') {
    variantStyles = 'bg-resq-navy hover:bg-resq-navy-dark text-white focus:ring-resq-navy shadow-sm';
  } else if (variant === 'danger') {
    variantStyles = 'bg-resq-red hover:bg-red-700 text-white focus:ring-resq-red shadow-sm';
  } else if (variant === 'outline') {
    variantStyles = 'border border-resq-border bg-white hover:bg-slate-50 text-resq-text focus:ring-resq-blue';
  } else if (variant === 'ghost') {
    variantStyles = 'bg-transparent hover:bg-slate-100 text-resq-muted hover:text-resq-text focus:ring-slate-400';
  }

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : icon}
      <span>{children}</span>
    </button>
  );
};
