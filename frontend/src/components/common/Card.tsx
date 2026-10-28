import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
}) => {
  return (
    <div className={`bg-white rounded-lg border border-resq-border shadow-sm overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="px-5 py-4 border-b border-resq-border flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-resq-text">{title}</h3>}
            {subtitle && <p className="text-xs text-resq-muted mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
