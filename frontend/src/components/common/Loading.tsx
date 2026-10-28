import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading operational data...',
  className = 'py-12',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-resq-blue animate-spin mb-3" />
      <p className="text-sm font-medium text-resq-muted">{message}</p>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="h-10 bg-slate-100 rounded mb-3" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 py-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div key={cIdx} className="h-4 bg-slate-200 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
