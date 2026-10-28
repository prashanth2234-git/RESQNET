import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, FileText, WifiOff, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { getAllPendingRequests } from '../../features/offline/db';
import { syncAllPendingRequests } from '../../features/offline/syncQueue';
import { AssistanceRequest, OfflinePendingRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export const CitizenDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflinePendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch server requests
      const serverData = await requestService.getRequests();
      setRequests(serverData.items);
    } catch {
      // Might be offline
    }

    try {
      const offlineData = await getAllPendingRequests();
      setOfflineQueue(offlineData.filter((i) => i.sync_status === 'PENDING' || i.sync_status === 'FAILED' || i.sync_status === 'SYNCING'));
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSyncComplete = () => {
      loadData();
    };
    window.addEventListener('resqnet:sync_complete', handleSyncComplete);
    return () => window.removeEventListener('resqnet:sync_complete', handleSyncComplete);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncAllPendingRequests(token);
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your submitted requests..." className="py-20" />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-resq-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-resq-text tracking-tight">Citizen Assistance Portal</h1>
          <p className="text-xs text-resq-muted mt-1">
            Track submitted emergency requests, view responder progress, and manage contact instructions.
          </p>
        </div>

        <Link to="/request">
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
            New Assistance Request
          </Button>
        </Link>
      </div>

      {/* Offline Pending Items Section */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-950">
                Offline Queue ({offlineQueue.length} pending transmission)
              </h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={syncing}
              onClick={handleManualSync}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              Sync Pending Requests
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {offlineQueue.map((item) => (
              <div key={item.client_local_id} className="p-3 bg-white rounded-lg border border-amber-200 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-amber-900 mb-1">
                  <span>{item.client_local_id}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 border border-amber-300">
                    {item.sync_status}
                  </span>
                </div>
                <div className="font-semibold text-slate-900">{item.title}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{item.location_name} • {item.incident_type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted Requests List */}
      <div>
        <h2 className="text-base font-bold text-resq-text mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-resq-blue" />
          Active Incident Tracking ({requests.length})
        </h2>

        {requests.length === 0 && offlineQueue.length === 0 ? (
          <EmptyState
            title="No requests filed"
            description="You have not submitted any disaster assistance requests yet. If you need help, submit a new request."
            action={
              <Link to="/request">
                <Button size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />}>
                  Create First Request
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-5 rounded-xl border border-resq-border hover:border-blue-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-resq-blue">
                      {req.tracking_code}
                    </span>
                    <PriorityBadge
                      priority={req.effective_priority_band}
                      score={req.effective_priority_score}
                    />
                    <StatusBadge status={req.status} />
                  </div>

                  <h3 className="text-base font-bold text-resq-text leading-snug">
                    {req.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-resq-muted">
                    <span>
                      <strong>Type:</strong> {req.incident_type}
                    </span>
                    <span>
                      <strong>Location:</strong> {req.location_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(req.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/requests/${req.id}`}>
                    <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View Status Timeline
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
