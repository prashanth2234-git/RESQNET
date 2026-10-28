import React from 'react';
import { AssistanceRequest } from '../../types';
import { PriorityBadge } from '../../components/common/Badge';
import { ShieldAlert, CheckCircle2, XCircle, Info, Edit3 } from 'lucide-react';

interface PriorityBreakdownProps {
  request: AssistanceRequest;
  onOpenOverrideModal?: () => void;
  canOverride?: boolean;
}

export const PriorityBreakdown: React.FC<PriorityBreakdownProps> = ({
  request,
  onOpenOverrideModal,
  canOverride = false,
}) => {
  const isOverridden = request.priority_override_score !== null && request.priority_override_score !== undefined;

  return (
    <div className="bg-slate-50 rounded-lg border border-resq-border p-5 space-y-4">
      {/* Header with Effective Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-resq-blue" />
            <h4 className="text-sm font-bold text-resq-text uppercase tracking-wider">
              Explainable Priority Assessment
            </h4>
          </div>
          <p className="text-xs text-resq-muted mt-0.5">
            Deterministic rule-based triage score calculated from urgency indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-resq-muted block font-medium">Effective Score</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-resq-text font-mono">
                {request.effective_priority_score}
                <span className="text-sm font-normal text-slate-400">/100</span>
              </span>
              <PriorityBadge
                priority={request.effective_priority_band}
                showScore={false}
              />
            </div>
          </div>

          {canOverride && onOpenOverrideModal && (
            <button
              onClick={onOpenOverrideModal}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-resq-blue hover:text-resq-blue rounded text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Override
            </button>
          )}
        </div>
      </div>

      {/* Override Notice if present */}
      {isOverridden && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-900">
          <div className="font-bold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600" />
            Administrative Priority Override Applied by {request.priority_override_by_name || 'Incident Coordinator'}
          </div>
          <p className="mt-1">
            <strong>Reason:</strong> {request.priority_override_reason}
          </p>
          <div className="mt-1 text-[11px] text-amber-700">
            Original Algorithm Score: {request.calculated_priority_score}/100 ({request.priority_band}) • Overridden at:{' '}
            {request.priority_override_at ? new Date(request.priority_override_at).toLocaleString() : 'N/A'}
          </div>
        </div>
      )}

      {/* Factors List */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
          Scoring Rule Factor Breakdown
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {request.priority_factors?.map((f) => (
            <div
              key={f.key}
              className={`p-2.5 rounded border transition ${
                f.applied
                  ? 'bg-white border-blue-200 shadow-xs'
                  : 'bg-slate-100/60 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  {f.applied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-resq-green flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  {f.name}
                </span>
                <span
                  className={`font-mono font-bold text-[11px] ${
                    f.applied ? 'text-resq-blue' : 'text-slate-400'
                  }`}
                >
                  {f.applied ? `+${f.points}` : '0'} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pl-5 leading-tight">{f.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Explanation */}
      <div className="bg-white p-3 rounded border border-slate-200 text-xs text-slate-700">
        <span className="font-bold text-slate-900">Summary: </span>
        <span>{request.priority_explanation}</span>
      </div>
    </div>
  );
};
