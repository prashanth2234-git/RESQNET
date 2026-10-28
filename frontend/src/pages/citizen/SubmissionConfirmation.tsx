import React, { useState, useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle2, WifiOff, Copy, ArrowRight, PhoneCall, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { getPendingRequest } from '../../features/offline/db';
import { syncAllPendingRequests } from '../../features/offline/syncQueue';
import { useAuth } from '../../context/AuthContext';

export const SubmissionConfirmation: React.FC = () => {
  const location = useLocation();
  const initialRequest = location.state?.request;
  const initialIsOffline = Boolean(location.state?.isOffline);

  const [request, setRequest] = useState<any>(initialRequest);
  const [isOffline, setIsOffline] = useState<boolean>(initialIsOffline);
  const [syncStatus, setSyncStatus] = useState<'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED'>(() => {
    if (!initialIsOffline) return 'SYNCED';
    return initialRequest?.sync_status || 'PENDING';
  });
  const [clientLocalId, setClientLocalId] = useState<string | null>(
    initialRequest?.client_local_id || null
  );
  const [trackingCode, setTrackingCode] = useState<string>(
    initialRequest?.tracking_code || initialRequest?.client_local_id || ''
  );
  const [serverRequestId, setServerRequestId] = useState<number | null>(
    initialRequest?.server_request_id || initialRequest?.id || null
  );
  const [syncError, setSyncError] = useState<string | null>(
    initialRequest?.error_message || null
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const { token } = useAuth();

  // If page was accessed without request in state or storage, redirect
  if (!initialRequest && !clientLocalId) {
    return <Navigate to="/request" replace />;
  }

  // 1. Initial check & periodic polling against IndexedDB
  useEffect(() => {
    if (!clientLocalId) return;

    let isMounted = true;

    const checkLocalRecord = async () => {
      try {
        const stored = await getPendingRequest(clientLocalId);
        if (stored && isMounted) {
          setRequest((prev: any) => ({ ...prev, ...stored }));
          if (stored.sync_status === 'SYNCED') {
            setIsOffline(false);
            setSyncStatus('SYNCED');
            if (stored.tracking_code) setTrackingCode(stored.tracking_code);
            if (stored.server_request_id) setServerRequestId(stored.server_request_id);
            setSyncError(null);
          } else if (stored.sync_status === 'FAILED') {
            setSyncStatus('FAILED');
            setSyncError(stored.error_message || 'Synchronization was rejected by server');
          } else if (stored.sync_status === 'SYNCING') {
            setSyncStatus('SYNCING');
          }
        }
      } catch {
        // Ignore IndexedDB read error
      }
    };

    checkLocalRecord();

    // Check periodically while pending or syncing to react seamlessly without manual refresh
    const pollInterval = setInterval(() => {
      if (syncStatus === 'PENDING' || syncStatus === 'SYNCING') {
        checkLocalRecord();
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [clientLocalId, syncStatus]);

  // 2. Event listeners for instant sync updates and network recovery
  useEffect(() => {
    if (!clientLocalId) return;

    // Targeted single request sync event
    const handleTargetedSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      if (detail.status === 'SYNCED') {
        setIsOffline(false);
        setSyncStatus('SYNCED');
        if (detail.tracking_code) setTrackingCode(detail.tracking_code);
        if (detail.server_request_id) setServerRequestId(detail.server_request_id);
        setSyncError(null);
      } else if (detail.status === 'FAILED') {
        setSyncStatus('FAILED');
        setSyncError(detail.error || 'Synchronization was rejected by server');
      }
    };

    // Global sync complete event
    const handleGlobalSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.finalResults) {
        const match = detail.finalResults.find((r: any) => r.localId === clientLocalId);
        if (match) {
          if (match.status === 'SYNCED') {
            setIsOffline(false);
            setSyncStatus('SYNCED');
            if (match.trackingCode) setTrackingCode(match.trackingCode);
            if (match.serverId) setServerRequestId(match.serverId);
            setSyncError(null);
          } else if (match.status === 'FAILED') {
            setSyncStatus('FAILED');
            setSyncError(match.error || 'Synchronization was rejected by server');
          }
        }
      }
    };

    // Auto-trigger sync when network reconnects
    const handleOnline = () => {
      if (syncStatus === 'PENDING' || syncStatus === 'FAILED') {
        handleRetrySync();
      }
    };

    window.addEventListener(`resqnet:request_synced:${clientLocalId}`, handleTargetedSync);
    window.addEventListener('resqnet:sync_complete', handleGlobalSync);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener(`resqnet:request_synced:${clientLocalId}`, handleTargetedSync);
      window.removeEventListener('resqnet:sync_complete', handleGlobalSync);
      window.removeEventListener('online', handleOnline);
    };
  }, [clientLocalId, syncStatus, token]);

  // 3. Retry synchronization action
  const handleRetrySync = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setSyncStatus('SYNCING');
    setSyncError(null);

    try {
      const res = await syncAllPendingRequests(token);
      if (clientLocalId) {
        const match = res.results.find((r) => r.localId === clientLocalId);
        if (match?.status === 'SYNCED') {
          setIsOffline(false);
          setSyncStatus('SYNCED');
          if (match.trackingCode) setTrackingCode(match.trackingCode);
          if (match.serverId) setServerRequestId(match.serverId);
          setSyncError(null);
        } else if (match?.status === 'FAILED') {
          setSyncStatus('FAILED');
          setSyncError(match.error || 'Server rejected synchronization request.');
        } else {
          // If not in results, verify against IndexedDB
          const stored = await getPendingRequest(clientLocalId);
          if (stored?.sync_status === 'SYNCED') {
            setIsOffline(false);
            setSyncStatus('SYNCED');
            if (stored.tracking_code) setTrackingCode(stored.tracking_code);
            if (stored.server_request_id) setServerRequestId(stored.server_request_id);
          } else if (stored?.sync_status === 'FAILED') {
            setSyncStatus('FAILED');
            setSyncError(stored.error_message || 'Synchronization was unsuccessful');
          }
        }
      }
    } catch (err: any) {
      setSyncStatus('FAILED');
      setSyncError(err.message || 'Network connection unavailable. Could not reach sync server.');
    } finally {
      setIsRetrying(false);
    }
  };

  const copyCode = () => {
    const codeToCopy = syncStatus === 'SYNCED' && trackingCode ? trackingCode : (clientLocalId || trackingCode);
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isConfirmedSynced = syncStatus === 'SYNCED' && Boolean(trackingCode);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-resq-border p-8 shadow-sm text-center space-y-6">
        {/* Status Avatar */}
        <div
          className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center transition-colors ${
            isConfirmedSynced
              ? 'bg-emerald-100 text-emerald-600'
              : syncStatus === 'FAILED'
              ? 'bg-rose-100 text-rose-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isConfirmedSynced ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : syncStatus === 'FAILED' ? (
            <AlertCircle className="w-8 h-8" />
          ) : (
            <WifiOff className="w-8 h-8" />
          )}
        </div>

        {/* Title and Explanation */}
        <div>
          <h1 className="text-2xl font-black text-resq-text">
            {isConfirmedSynced
              ? initialIsOffline
                ? 'Assistance Request Synchronized & Logged'
                : 'Assistance Request Logged'
              : syncStatus === 'FAILED'
              ? 'Synchronization Pending (Stored Locally)'
              : 'Request Saved Offline in Queue'}
          </h1>
          <p className="text-sm text-resq-muted mt-1 max-w-md mx-auto">
            {isConfirmedSynced
              ? 'Your incident report has been registered in the RESQNET operational queue and prioritized for coordinator review.'
              : syncStatus === 'FAILED'
              ? 'Your request is safely preserved on your device in local storage, but could not be transmitted to the server. You can retry synchronization.'
              : 'Your device is currently offline. The request has been safely saved in your browser storage and will be synchronized to coordinators as soon as connection returns.'}
          </p>
        </div>

        {/* Tracking Code Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 max-w-sm mx-auto space-y-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            {isConfirmedSynced ? 'Official Tracking Identifier' : 'Local Queue Reference ID'}
          </span>

          <div className="flex items-center justify-center gap-2">
            <span
              className={`text-2xl font-mono font-black tracking-wider ${
                isConfirmedSynced ? 'text-resq-blue' : 'text-amber-900'
              }`}
            >
              {isConfirmedSynced ? trackingCode : (clientLocalId || trackingCode)}
            </span>
            <button
              onClick={copyCode}
              className="p-1 text-slate-400 hover:text-resq-blue rounded hover:bg-slate-200 transition"
              title="Copy identifier"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <span className="text-[11px] font-semibold text-emerald-600 block">Copied to clipboard!</span>}

          {/* If synced from local reference, display linkage */}
          {isConfirmedSynced && clientLocalId && (
            <div className="text-[11px] text-slate-400 font-mono">
              Synced from offline ref: {clientLocalId}
            </div>
          )}

          {/* Status Row */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status:</span>
            {isConfirmedSynced ? (
              <div className="flex items-center gap-1.5">
                <StatusBadge status={request?.status || 'RECEIVED'} />
                <span className="px-2 py-0.5 rounded font-bold text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300">
                  ✓ SYNCED
                </span>
              </div>
            ) : syncStatus === 'SYNCING' ? (
              <span className="px-2 py-0.5 rounded font-bold text-blue-800 bg-blue-100 border border-blue-300 inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                SYNCING...
              </span>
            ) : syncStatus === 'FAILED' ? (
              <span className="px-2 py-0.5 rounded font-bold text-rose-800 bg-rose-100 border border-rose-300 inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                SYNC FAILED - STORED LOCALLY
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-bold text-amber-800 bg-amber-100 border border-amber-300 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                OFFLINE PENDING SYNC
              </span>
            )}
          </div>

          {/* Sync Error Details & Retry Option */}
          {syncStatus === 'FAILED' && (
            <div className="pt-2 text-left space-y-2">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                <span className="font-semibold block text-[11px] text-rose-900">Sync Failure Notice:</span>
                <span className="text-[11px] text-rose-700">{syncError || 'Network unreachable or server rejection.'}</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRetrySync}
                loading={isRetrying}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                className="w-full justify-center"
              >
                Retry Synchronization
              </Button>
            </div>
          )}

          {/* Optional manual sync trigger when pending */}
          {syncStatus === 'PENDING' && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetrySync}
                loading={isRetrying}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                className="w-full justify-center border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                Sync Now
              </Button>
            </div>
          )}

          {/* Priority Details (Available for synced requests) */}
          {isConfirmedSynced && request?.effective_priority_band && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">Calculated Priority:</span>
              <PriorityBadge
                priority={request.effective_priority_band}
                score={request.effective_priority_score}
              />
            </div>
          )}
        </div>

        {/* Emergency Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 text-left space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-red-900">
            <PhoneCall className="w-4 h-4 text-resq-red flex-shrink-0" />
            Prototype Reminder: Not an Official Emergency Dispatch
          </div>
          <p className="leading-relaxed">
            Submitting a request through this simulated coordination prototype does <strong>not</strong> contact government 911/112 dispatchers. If you are in immediate life-threatening danger, dial emergency services immediately.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isConfirmedSynced && serverRequestId && (
            <Link to={`/requests/${serverRequestId}`}>
              <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                View Live Case Status
              </Button>
            </Link>
          )}

          <Link to="/request">
            <Button variant="outline">
              Submit Another Request
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
