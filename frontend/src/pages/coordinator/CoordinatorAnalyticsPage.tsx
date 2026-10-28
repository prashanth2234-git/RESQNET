import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { requestService } from '../../services/requestService';
import { DashboardAnalytics, AssistanceRequest, RequestStatus } from '../../types';
import { LoadingSpinner } from '../../components/common/Loading';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { BarChart3, PieChart as PieIcon, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const CoordinatorAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [criticalIncidents, setCriticalIncidents] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analData, reqData] = await Promise.all([
          dashboardService.getAnalytics(),
          requestService.getRequests({ priority_band: 'CRITICAL', is_unresolved: true, page_size: 6 }),
        ]);
        setAnalytics(analData);
        const TERMINAL_STATUSES: RequestStatus[] = ['CLOSED', 'CANCELLED', 'REJECTED'];
        const unresolved = (reqData.items || []).filter(
          (req) => !TERMINAL_STATUSES.includes(req.status as RequestStatus)
        );
        setCriticalIncidents(unresolved);
      } catch (err: any) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Synthesizing operational analytics..." className="py-20" />;
  }

  const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: '#DC2626',
    HIGH: '#D97706',
    MEDIUM: '#2563EB',
    LOW: '#15803D',
  };

  const STATUS_COLORS: Record<string, string> = {
    RECEIVED: '#A855F7',
    VERIFIED: '#3B82F6',
    ASSIGNED: '#6366F1',
    EN_ROUTE: '#F59E0B',
    ASSISTANCE_PROVIDED: '#10B981',
    CLOSED: '#64748B',
    REJECTED: '#EF4444',
    CANCELLED: '#9CA3AF',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-resq-border pb-4">
        <h1 className="text-2xl font-black text-resq-text tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-resq-blue" />
          Disaster Coordination Analytics
        </h1>
        <p className="text-xs text-resq-muted mt-0.5">
          Macro operational telemetry across hazard types, triage bands, and responder workflows.
        </p>
      </div>

      {/* Main Charts Grid */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Incident Type Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-resq-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-resq-text">Incident Hazard Distribution</h3>
            <p className="text-xs text-resq-muted">Cases categorized by disaster scenario</p>
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.incident_type_distribution}>
                  <XAxis dataKey="incident_type" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Donut Chart */}
          <div className="bg-white p-6 rounded-xl border border-resq-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-resq-text">Status Workflow Progression</h3>
            <p className="text-xs text-resq-muted">Lifecycle distribution of all recorded incidents</p>
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.status_distribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {analytics.status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#2563EB'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Bands Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-resq-border shadow-xs space-y-3 lg:col-span-2">
            <h3 className="text-sm font-bold text-resq-text">Priority Triage Bands (Effective Score)</h3>
            <p className="text-xs text-resq-muted">
              Deterministic priority classification distribution (0–100 scale)
            </p>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.priority_distribution}>
                  <XAxis dataKey="priority_band" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.priority_distribution.map((entry, index) => (
                      <Cell key={`cell-p-${index}`} fill={PRIORITY_COLORS[entry.priority_band] || '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* High Priority Unresolved Incidents Table */}
      <div className="bg-white rounded-xl border border-resq-border shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-resq-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-resq-text flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-resq-red" />
              Critical Unresolved Incident Watchlist
            </h3>
            <p className="text-xs text-resq-muted mt-0.5">
              High-urgency cases currently receiving or awaiting active response intervention.
            </p>
          </div>
          <Link
            to="/coordinator/requests?priority_band=CRITICAL"
            className="text-xs font-semibold text-resq-blue hover:underline flex items-center gap-1"
          >
            All Critical <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {criticalIncidents.length === 0 ? (
            <div className="py-8 text-center text-resq-muted">
              <ShieldAlert className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-slate-700">No Critical Unresolved Incidents</p>
              <p className="text-[11px] mt-0.5">All high-urgency incidents are currently resolved or closed.</p>
            </div>
          ) : (
            criticalIncidents.map((req) => (
              <div key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-resq-blue">{req.tracking_code}</span>
                    <PriorityBadge priority={req.effective_priority_band} score={req.effective_priority_score} />
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="font-bold text-slate-900">{req.title}</div>
                  <div className="text-slate-500 text-[11px]">{req.location_name} • {req.incident_type}</div>
                </div>

                <Link to={`/coordinator/requests/${req.id}`}>
                  <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs transition">
                    Triage Case
                  </button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
