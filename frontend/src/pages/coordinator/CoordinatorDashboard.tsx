import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { requestService } from '../../services/requestService';
import { responderService } from '../../services/responderService';
import {
  DashboardSummary,
  DashboardAnalytics,
  AssistanceRequest,
  ResponderProfile,
  ActivityItem,
} from '../../types';
import { PriorityBadge, StatusBadge, AvailabilityBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
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
} from 'recharts';

export const CoordinatorDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [criticalQueue, setCriticalQueue] = useState<AssistanceRequest[]>([]);
  const [responders, setResponders] = useState<ResponderProfile[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumData, analData, reqData, respData, actData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getAnalytics(),
        requestService.getRequests({ assigned_state: 'unassigned', page_size: 5 }),
        responderService.getResponders(),
        dashboardService.getActivity(8),
      ]);
      setSummary(sumData);
      setAnalytics(analData);
      setCriticalQueue(reqData.items);
      setResponders(respData);
      setActivities(actData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 20000); // 20s background sync
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Initializing Incident Command Center..." className="py-20" />;
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
      {/* Top Header & Live Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-resq-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-resq-text tracking-tight">
              Incident Command Center
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-resq-muted mt-0.5">
            Real-time incident triage desk, responder assignment, and priority governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/coordinator/map">
            <Button variant="outline" size="sm">
              View Disaster Map
            </Button>
          </Link>
          <Link to="/coordinator/requests">
            <Button variant="primary" size="sm">
              All Incidents Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Summary Operational Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-resq-border shadow-xs">
          <span className="text-[11px] font-bold text-resq-muted uppercase tracking-wider block">
            Total Active
          </span>
          <div className="text-2xl font-black text-resq-text font-mono mt-1">
            {summary?.total_active_requests ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Open operational cases</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs bg-red-50/20">
          <span className="text-[11px] font-bold text-resq-red uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Critical Review
          </span>
          <div className="text-2xl font-black text-resq-red font-mono mt-1">
            {summary?.critical_awaiting_review ?? 0}
          </div>
          <span className="text-[10px] text-red-600 mt-0.5 block">Urgent priority</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Unassigned
          </span>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            {summary?.unassigned_requests ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Awaiting unit dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Available Units
          </span>
          <div className="text-2xl font-black text-emerald-800 font-mono mt-1">
            {summary?.responders_available ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Ready for deployment</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-bold text-resq-blue uppercase tracking-wider block">
            Assisted Cases
          </span>
          <div className="text-2xl font-black text-resq-blue font-mono mt-1">
            {summary?.assistance_provided ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Relief successfully delivered</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
            Pending Triage
          </span>
          <div className="text-2xl font-black text-purple-800 font-mono mt-1">
            {summary?.awaiting_verification ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Verification needed</span>
        </div>
      </div>

      {/* Main Operational Split: Triage Queue & Responder Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Urgent Unassigned Queue */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-resq-text flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-resq-red" />
              High-Priority Incidents Requiring Dispatch
            </h2>
            <Link
              to="/coordinator/requests?assigned_state=unassigned"
              className="text-xs font-semibold text-resq-blue hover:underline flex items-center gap-1"
            >
              View Full Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {criticalQueue.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-resq-border text-center text-xs text-resq-muted">
                No unassigned requests awaiting triage at this time.
              </div>
            ) : (
              criticalQueue.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-4 rounded-xl border border-resq-border hover:border-blue-400 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-resq-blue">
                        {req.tracking_code}
                      </span>
                      <PriorityBadge
                        priority={req.effective_priority_band}
                        score={req.effective_priority_score}
                      />
                      <StatusBadge status={req.status} />
                    </div>
                    <h3 className="font-bold text-sm text-resq-text leading-snug">
                      {req.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-resq-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {req.location_name}
                      </span>
                      <span>• {req.incident_type}</span>
                      <span>• {req.people_affected} affected ({req.people_urgent} urgent)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/coordinator/requests/${req.id}`}>
                      <Button size="sm" variant="primary" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Triage &amp; Assign
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Responder Availability Strip */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-resq-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-resq-border pb-3">
            <h3 className="text-sm font-bold text-resq-text flex items-center gap-2">
              <Users className="w-4 h-4 text-resq-blue" />
              Field Unit Capacity
            </h3>
            <Link to="/coordinator/responders" className="text-xs text-resq-blue hover:underline font-semibold">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {responders.slice(0, 6).map((resp) => {
              const capPercent = Math.min(100, Math.round((resp.current_assignment_count / resp.max_concurrent_assignments) * 100));
              return (
                <div key={resp.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-resq-text">{resp.team}</h4>
                      <p className="text-[11px] text-resq-muted">{resp.name}</p>
                    </div>
                    <AvailabilityBadge availability={resp.availability} />
                  </div>

                  {/* Workload Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1 font-medium">
                      <span>Workload:</span>
                      <span className="font-mono font-bold">
                        {resp.current_assignment_count} / {resp.max_concurrent_assignments} cases ({capPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          capPercent >= 100
                            ? 'bg-resq-red'
                            : capPercent >= 75
                            ? 'bg-resq-amber'
                            : 'bg-resq-blue'
                        }`}
                        style={{ width: `${capPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-resq-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-resq-text">Incident Status Breakdown</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.status_distribution}>
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#2563EB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white p-5 rounded-xl border border-resq-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-resq-text">Priority Band Distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.priority_distribution}>
                  <XAxis dataKey="priority_band" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.priority_distribution.map((entry, index) => (
                      <Cell key={`cell-prio-${index}`} fill={PRIORITY_COLORS[entry.priority_band] || '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Operational Activity Ticker */}
      <div className="bg-white p-5 rounded-xl border border-resq-border shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-resq-text flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Recent Operational Activity Ledger
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          {activities.map((act) => (
            <div key={act.id} className="py-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {act.tracking_code && (
                  <span className="font-mono font-bold text-resq-blue">
                    {act.tracking_code}
                  </span>
                )}
                <span className="text-slate-800">{act.description}</span>
              </div>
              <div className="text-right flex-shrink-0 text-slate-400 text-[11px]">
                <span className="font-semibold text-slate-600 mr-2">{act.actor_name}</span>
                <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
