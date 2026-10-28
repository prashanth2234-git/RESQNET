import React from 'react';
import { PriorityBand, RequestStatus } from '../../types';

interface PriorityBadgeProps {
  priority: PriorityBand | string;
  score?: number;
  showScore?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, score, showScore = true }) => {
  const p = priority?.toUpperCase();

  let styles = 'bg-slate-100 text-slate-800 border-slate-300';
  let dotColor = 'bg-slate-400';

  if (p === 'CRITICAL') {
    styles = 'bg-red-100 text-red-900 border-red-300 ring-1 ring-red-400';
    dotColor = 'bg-red-600';
  } else if (p === 'HIGH') {
    styles = 'bg-amber-100 text-amber-900 border-amber-300';
    dotColor = 'bg-amber-600';
  } else if (p === 'MEDIUM') {
    styles = 'bg-blue-100 text-blue-900 border-blue-300';
    dotColor = 'bg-blue-600';
  } else if (p === 'LOW') {
    styles = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    dotColor = 'bg-emerald-600';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide uppercase ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{p}</span>
      {showScore && score !== undefined && (
        <span className="ml-0.5 font-mono text-[11px] opacity-80">({score})</span>
      )}
    </span>
  );
};

interface StatusBadgeProps {
  status: RequestStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status?.toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = s;

  switch (s) {
    case 'RECEIVED':
      styles = 'bg-purple-50 text-purple-800 border-purple-200';
      label = 'Received (Awaiting Triage)';
      break;
    case 'VERIFIED':
      styles = 'bg-blue-50 text-blue-800 border-blue-200';
      label = 'Verified';
      break;
    case 'ASSIGNED':
      styles = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      label = 'Assigned';
      break;
    case 'EN_ROUTE':
      styles = 'bg-amber-50 text-amber-900 border-amber-300 font-semibold';
      label = 'En Route';
      break;
    case 'ASSISTANCE_PROVIDED':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      label = 'Assistance Provided';
      break;
    case 'CLOSED':
      styles = 'bg-slate-100 text-slate-800 border-slate-300';
      label = 'Closed / Resolved';
      break;
    case 'REJECTED':
      styles = 'bg-rose-50 text-rose-800 border-rose-200';
      label = 'Rejected';
      break;
    case 'CANCELLED':
      styles = 'bg-gray-100 text-gray-600 border-gray-300';
      label = 'Cancelled';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${styles}`}>
      {label}
    </span>
  );
};

export const AvailabilityBadge: React.FC<{ availability: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY' }> = ({ availability }) => {
  if (availability === 'AVAILABLE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        Available
      </span>
    );
  }
  if (availability === 'BUSY') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        Busy / At Capacity
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Off Duty
    </span>
  );
};
