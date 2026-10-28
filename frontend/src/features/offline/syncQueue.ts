import { getAllPendingRequests, updateRequestSyncStatus } from './db';
import { OfflinePendingRequest } from '../../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export interface SyncProgressEventDetail {
  total: number;
  synced: number;
  failed: number;
  inProgress: boolean;
}

export interface SyncResultItem {
  localId: string;
  serverId?: number;
  trackingCode?: string;
  status: 'SYNCED' | 'FAILED';
  error?: string;
}

let activeSyncPromise: Promise<{
  success: number;
  failed: number;
  results: SyncResultItem[];
}> | null = null;

export async function syncAllPendingRequests(token?: string | null): Promise<{
  success: number;
  failed: number;
  results: SyncResultItem[];
}> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      return await executeSyncAllPendingRequests(token);
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

async function executeSyncAllPendingRequests(token?: string | null): Promise<{
  success: number;
  failed: number;
  results: SyncResultItem[];
}> {
  const allRequests = await getAllPendingRequests();
  const queue = allRequests.filter(
    (r) => r.sync_status === 'PENDING' || r.sync_status === 'FAILED' || r.sync_status === 'SYNCING'
  );

  if (queue.length === 0) {
    return { success: 0, failed: 0, results: [] };
  }

  // Mark in-flight as SYNCING
  for (const item of queue) {
    await updateRequestSyncStatus(item.client_local_id, 'SYNCING');
  }

  const payloadItems = queue.map((r) => ({
    title: r.title,
    incident_type: r.incident_type,
    description: r.description,
    location_name: r.location_name,
    latitude: r.latitude,
    longitude: r.longitude,
    people_affected: r.people_affected,
    people_urgent: r.people_urgent,
    assistance_category: r.assistance_category,
    is_immediate_threat: r.is_immediate_threat,
    is_medical_emergency: r.is_medical_emergency,
    is_vulnerable_present: r.is_vulnerable_present,
    is_essential_unavailable: r.is_essential_unavailable,
    safe_contact_method: r.safe_contact_method,
    contact_details: r.contact_details,
    accessibility_medical_notes: r.accessibility_medical_notes,
    idempotency_key: r.idempotency_key,
    client_local_id: r.client_local_id,
  }));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}/sync/requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: payloadItems }),
    });

    if (!res.ok) {
      let serverError = `Sync server responded with HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson?.detail) serverError += `: ${errorJson.detail}`;
      } catch {
        // Response was not JSON
      }
      throw new Error(serverError);
    }

    const data = await res.json();
    let successCount = 0;
    let failedCount = 0;
    const finalResults: SyncResultItem[] = [];

    for (const resItem of data.results) {
      if (resItem.status === 'CREATED' || resItem.status === 'EXISTING_IDEMPOTENT') {
        successCount++;
        await updateRequestSyncStatus(
          resItem.client_local_id,
          'SYNCED',
          resItem.server_request_id,
          resItem.tracking_code,
          undefined
        );
        finalResults.push({
          localId: resItem.client_local_id,
          serverId: resItem.server_request_id,
          trackingCode: resItem.tracking_code,
          status: 'SYNCED',
        });
        window.dispatchEvent(
          new CustomEvent(`resqnet:request_synced:${resItem.client_local_id}`, {
            detail: {
              client_local_id: resItem.client_local_id,
              server_request_id: resItem.server_request_id,
              tracking_code: resItem.tracking_code,
              status: 'SYNCED',
            },
          })
        );
      } else {
        failedCount++;
        const errMsg = resItem.error || 'Server rejected synchronization item.';
        await updateRequestSyncStatus(
          resItem.client_local_id,
          'FAILED',
          undefined,
          undefined,
          errMsg
        );
        finalResults.push({
          localId: resItem.client_local_id,
          status: 'FAILED',
          error: errMsg,
        });
        window.dispatchEvent(
          new CustomEvent(`resqnet:request_synced:${resItem.client_local_id}`, {
            detail: {
              client_local_id: resItem.client_local_id,
              status: 'FAILED',
              error: errMsg,
            },
          })
        );
      }
    }

    // Trigger custom window event so UI badges and confirmation pages update
    window.dispatchEvent(
      new CustomEvent('resqnet:sync_complete', {
        detail: { successCount, failedCount, finalResults },
      })
    );

    return { success: successCount, failed: failedCount, results: finalResults };
  } catch (err: any) {
    // Connectivity failure - reset in-flight queue items back to FAILED
    const errorMsg = err.message || 'Network unreachable';
    for (const item of queue) {
      await updateRequestSyncStatus(
        item.client_local_id,
        'FAILED',
        undefined,
        undefined,
        errorMsg
      );
      window.dispatchEvent(
        new CustomEvent(`resqnet:request_synced:${item.client_local_id}`, {
          detail: {
            client_local_id: item.client_local_id,
            status: 'FAILED',
            error: errorMsg,
          },
        })
      );
    }
    const failedResults: SyncResultItem[] = queue.map((q) => ({
      localId: q.client_local_id,
      status: 'FAILED',
      error: errorMsg,
    }));
    window.dispatchEvent(
      new CustomEvent('resqnet:sync_complete', {
        detail: { successCount: 0, failedCount: queue.length, error: errorMsg, finalResults: failedResults },
      })
    );
    return {
      success: 0,
      failed: queue.length,
      results: failedResults,
    };
  }
}
