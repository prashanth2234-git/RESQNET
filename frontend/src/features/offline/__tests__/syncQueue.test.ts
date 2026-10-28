import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePendingRequest,
  getPendingRequest,
  getAllPendingRequests,
  updateRequestSyncStatus,
} from '../db';
import { syncAllPendingRequests } from '../syncQueue';
import { OfflinePendingRequest } from '../../../types';

describe('Offline Synchronization & Queue Management', () => {
  const sampleOfflineRequest: OfflinePendingRequest = {
    client_local_id: 'local-test-req-001',
    idempotency_key: 'idemp-test-001',
    title: 'Emergency Flood Extraction',
    incident_type: 'Flood',
    description: 'Ground floor submerged with elderly resident.',
    location_name: 'Harbor Gate 12',
    latitude: 25.76,
    longitude: -80.19,
    people_affected: 2,
    people_urgent: 1,
    assistance_category: 'Rescue',
    is_immediate_threat: true,
    is_medical_emergency: false,
    is_vulnerable_present: true,
    is_essential_unavailable: false,
    safe_contact_method: 'Phone',
    contact_details: '+1 555-0100',
    accessibility_medical_notes: 'Wheelchair user',
    created_at: new Date().toISOString(),
    sync_status: 'PENDING',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    // Save sample request in clean state
    await savePendingRequest({ ...sampleOfflineRequest });
  });

  it('1. Persists offline request in IndexedDB with local reference and PENDING status', async () => {
    const item = await getPendingRequest(sampleOfflineRequest.client_local_id);
    expect(item).toBeDefined();
    expect(item?.client_local_id).toBe('local-test-req-001');
    expect(item?.sync_status).toBe('PENDING');
    expect(item?.tracking_code).toBeUndefined();
    expect(item?.server_request_id).toBeUndefined();
  });

  it('2. Successfully synchronizes pending request, saves server ID, tracking code, and SYNCED state', async () => {
    // Mock backend returning successful creation
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_received: 1,
        successful_count: 1,
        results: [
          {
            client_local_id: 'local-test-req-001',
            server_request_id: 19,
            tracking_code: 'REQ-0019',
            idempotency_key: 'idemp-test-001',
            status: 'CREATED',
            error: null,
          },
        ],
      }),
    } as any);

    // Spy on custom events
    const syncCompleteSpy = vi.fn();
    const targetedSyncSpy = vi.fn();
    window.addEventListener('resqnet:sync_complete', syncCompleteSpy);
    window.addEventListener(`resqnet:request_synced:local-test-req-001`, targetedSyncSpy);

    const syncResult = await syncAllPendingRequests();

    expect(syncResult.success).toBe(1);
    expect(syncResult.failed).toBe(0);
    expect(syncResult.results[0]).toEqual({
      localId: 'local-test-req-001',
      serverId: 19,
      trackingCode: 'REQ-0019',
      status: 'SYNCED',
    });

    // Verify local queue record in IndexedDB has been updated
    const updated = await getPendingRequest('local-test-req-001');
    expect(updated).toBeDefined();
    expect(updated?.sync_status).toBe('SYNCED');
    expect(updated?.server_request_id).toBe(19);
    expect(updated?.tracking_code).toBe('REQ-0019');

    // Verify targeted and global events fired
    expect(targetedSyncSpy).toHaveBeenCalled();
    const targetedEvent = targetedSyncSpy.mock.calls[0][0] as CustomEvent;
    expect(targetedEvent.detail.status).toBe('SYNCED');
    expect(targetedEvent.detail.tracking_code).toBe('REQ-0019');
    expect(targetedEvent.detail.server_request_id).toBe(19);

    expect(syncCompleteSpy).toHaveBeenCalled();
  });

  it('3. Preserves queued request on server rejection and marks status FAILED with error', async () => {
    // Mock backend returning rejection error
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_received: 1,
        successful_count: 0,
        results: [
          {
            client_local_id: 'local-test-req-001',
            server_request_id: null,
            tracking_code: null,
            idempotency_key: 'idemp-test-001',
            status: 'ERROR',
            error: 'Simulated backend rate limit or validation rejection',
          },
        ],
      }),
    } as any);

    const syncResult = await syncAllPendingRequests();

    expect(syncResult.success).toBe(0);
    expect(syncResult.failed).toBe(1);
    expect(syncResult.results[0].status).toBe('FAILED');
    expect(syncResult.results[0].error).toContain('Simulated backend rate limit');

    // Request is retained in IndexedDB, NEVER deleted
    const retained = await getPendingRequest('local-test-req-001');
    expect(retained).toBeDefined();
    expect(retained?.sync_status).toBe('FAILED');
    expect(retained?.error_message).toContain('Simulated backend rate limit');
    expect(retained?.tracking_code).toBeUndefined();
  });

  it('4. Retains queued request on network failure and allows retry with identical idempotency key', async () => {
    // 1. First attempt: network offline / fetch throws
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network connection failed. You may be offline.'));

    const failResult = await syncAllPendingRequests();
    expect(failResult.success).toBe(0);
    expect(failResult.failed).toBe(1);

    const itemAfterNetFail = await getPendingRequest('local-test-req-001');
    expect(itemAfterNetFail).toBeDefined();
    expect(itemAfterNetFail?.sync_status).toBe('FAILED');
    expect(itemAfterNetFail?.idempotency_key).toBe('idemp-test-001'); // Preserved!

    // 2. Retry attempt: network is restored, backend confirms EXISTING_IDEMPOTENT or CREATED
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_received: 1,
        successful_count: 1,
        results: [
          {
            client_local_id: 'local-test-req-001',
            server_request_id: 19,
            tracking_code: 'REQ-0019',
            idempotency_key: 'idemp-test-001',
            status: 'EXISTING_IDEMPOTENT',
            error: null,
          },
        ],
      }),
    } as any);

    const retryResult = await syncAllPendingRequests();
    expect(retryResult.success).toBe(1);
    expect(retryResult.failed).toBe(0);
    expect(retryResult.results[0].trackingCode).toBe('REQ-0019');

    // Verify local IndexedDB record is now fully SYNCED
    const finalItem = await getPendingRequest('local-test-req-001');
    expect(finalItem?.sync_status).toBe('SYNCED');
    expect(finalItem?.server_request_id).toBe(19);
    expect(finalItem?.tracking_code).toBe('REQ-0019');
  });

  it('5. Does not re-sync items that are already SYNCED', async () => {
    await updateRequestSyncStatus('local-test-req-001', 'SYNCED', 19, 'REQ-0019');

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const result = await syncAllPendingRequests();
    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('6. Deduplicates concurrent sync calls into a single in-flight network request', async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => {
      // Small artificial delay to simulate in-flight network request
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        ok: true,
        json: async () => ({
          total_received: 1,
          successful_count: 1,
          results: [
            {
              client_local_id: 'local-test-req-001',
              server_request_id: 19,
              tracking_code: 'REQ-0019',
              idempotency_key: 'idemp-test-001',
              status: 'CREATED',
            },
          ],
        }),
      } as any;
    });

    globalThis.fetch = fetchSpy;

    // Trigger two sync calls concurrently
    const [resultA, resultB] = await Promise.all([
      syncAllPendingRequests(),
      syncAllPendingRequests(),
    ]);

    // Both calls must succeed with the same result
    expect(resultA.success).toBe(1);
    expect(resultB.success).toBe(1);
    expect(resultA.results[0].trackingCode).toBe('REQ-0019');
    expect(resultB.results[0].trackingCode).toBe('REQ-0019');

    // Fetch MUST only be called once, not twice
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('7. Retains request in IndexedDB on HTTP 500 server error and allows subsequent successful retry', async () => {
    // 1. First attempt: Server returns HTTP 500
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Database locked or unique constraint' }),
    } as any);

    const failRes = await syncAllPendingRequests();
    expect(failRes.success).toBe(0);
    expect(failRes.failed).toBe(1);
    expect(failRes.results[0].status).toBe('FAILED');
    expect(failRes.results[0].error).toContain('HTTP 500');

    // Request is NOT lost: verified preserved in IndexedDB
    const preservedItem = await getPendingRequest('local-test-req-001');
    expect(preservedItem).toBeDefined();
    expect(preservedItem?.sync_status).toBe('FAILED');
    expect(preservedItem?.error_message).toContain('HTTP 500');

    // 2. Retry attempt: Server returns 200 OK with EXISTING_IDEMPOTENT
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_received: 1,
        successful_count: 1,
        results: [
          {
            client_local_id: 'local-test-req-001',
            server_request_id: 22,
            tracking_code: 'REQ-0022',
            idempotency_key: 'idemp-test-001',
            status: 'EXISTING_IDEMPOTENT',
          },
        ],
      }),
    } as any);

    const retryRes = await syncAllPendingRequests();
    expect(retryRes.success).toBe(1);
    expect(retryRes.failed).toBe(0);
    expect(retryRes.results[0].status).toBe('SYNCED');
    expect(retryRes.results[0].trackingCode).toBe('REQ-0022');

    // Verify local item updated to SYNCED
    const syncedItem = await getPendingRequest('local-test-req-001');
    expect(syncedItem?.sync_status).toBe('SYNCED');
    expect(syncedItem?.server_request_id).toBe(22);
    expect(syncedItem?.tracking_code).toBe('REQ-0022');
  });
});
