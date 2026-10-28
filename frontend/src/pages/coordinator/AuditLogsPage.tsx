import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Clock, FileText } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { ActivityItem } from '../../types';
import { LoadingSpinner } from '../../components/common/Loading';

export const AuditLogsPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const data = await dashboardService.getActivity(50);
        setActivities(data);
      } catch (err: any) {
        console.error('Failed to load audit trail:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAudit();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Retrieving compliance audit records..." className="py-20" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-resq-border pb-4">
        <h1 className="text-2xl font-black text-resq-text tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-slate-700" />
          Administrative Audit &amp; Governance Trail
        </h1>
        <p className="text-xs text-resq-muted mt-0.5">
          Immutable event ledger recording priority overrides, verification timestamps, and responder assignments.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-resq-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-resq-border text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Incident Tracking Code</th>
                <th className="py-3 px-4">Responsible Actor</th>
                <th className="py-3 px-4">Audit Description / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(act.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {act.action_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-resq-blue whitespace-nowrap">
                    {act.tracking_code || '—'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    {act.actor_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-md">
                    {act.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
