import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAllPendingRequests } from '../../features/offline/db';
import { syncAllPendingRequests } from '../../features/offline/syncQueue';
import { useAuth } from '../../context/AuthContext';

export const OfflineBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { token } = useAuth();

  const refreshPendingCount = async () => {
    try {
      const items = await getAllPendingRequests();
      const count = items.filter((i) => i.sync_status === 'PENDING' || i.sync_status === 'FAILED').length;
      setPendingCount(count);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
      // Auto-trigger sync when returning online
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    const handleSyncComplete = () => {
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resqnet:sync_complete', handleSyncComplete);

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resqnet:sync_complete', handleSyncComplete);
    };
  }, [token]);

  const triggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllPendingRequests(token);
      if (res.success > 0) {
        setSyncFeedback({
          message: `Successfully synchronized ${res.success} offline request(s)!`,
          type: 'success',
        });
      } else if (res.failed > 0) {
        setSyncFeedback({
          message: `Failed to synchronize ${res.failed} request(s). Retrying later.`,
          type: 'error',
        });
      }
      refreshPendingCount();
    } catch (err: any) {
      setSyncFeedback({
        message: err.message || 'Offline sync failed',
        type: 'error',
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Only render if offline OR pending queue items exist OR feedback is shown
  if (isOnline && pendingCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-medium transition-colors ${
        !isOnline
          ? 'bg-amber-100 border-amber-300 text-amber-950'
          : pendingCount > 0
          ? 'bg-blue-50 border-blue-200 text-blue-900'
          : 'bg-green-50 border-green-200 text-green-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-700 animate-pulse" />
            <span>
              <strong>OFFLINE MODE:</strong> You are currently disconnected. Requests are safely stored locally in your browser and will queue for synchronization.
            </span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span>Connection restored.</span>
          </>
        )}

        {pendingCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
            {pendingCount} request{pendingCount > 1 ? 's' : ''} queued offline
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {syncFeedback && (
          <span className={`inline-flex items-center gap-1 ${syncFeedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {syncFeedback.message}
          </span>
        )}

        {isOnline && pendingCount > 0 && (
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-resq-blue hover:bg-resq-blue-dark text-white rounded font-medium shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
};
