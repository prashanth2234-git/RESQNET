import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubmissionConfirmation } from '../SubmissionConfirmation';
import { savePendingRequest, getPendingRequest } from '../../../features/offline/db';
import * as syncModule from '../../../features/offline/syncQueue';

// Mock AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: 'test-token',
    isAuthenticated: false,
  }),
}));

describe('SubmissionConfirmation Component Reactive Sync Flow', () => {
  const offlineRequest = {
    client_local_id: 'local-confirm-999',
    idempotency_key: 'idemp-confirm-999',
    title: 'Trapped on Roof',
    incident_type: 'Flood',
    description: 'Rising water reached second floor.',
    location_name: 'Maple Way 5',
    people_affected: 3,
    people_urgent: 1,
    assistance_category: 'Rescue',
    is_immediate_threat: true,
    is_medical_emergency: false,
    is_vulnerable_present: true,
    is_essential_unavailable: false,
    safe_contact_method: 'Phone',
    sync_status: 'PENDING' as const,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    await savePendingRequest({ ...offlineRequest });
  });

  it('1. Renders offline local reference ID and OFFLINE PENDING SYNC state initially', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/confirmation',
            state: { request: offlineRequest, isOffline: true },
          },
        ]}
      >
        <SubmissionConfirmation />
      </MemoryRouter>
    );

    expect(screen.getByText('Request Saved Offline in Queue')).toBeDefined();
    expect(screen.getByText('Local Queue Reference ID')).toBeDefined();
    expect(screen.getByText('local-confirm-999')).toBeDefined();
    expect(screen.getByText(/OFFLINE PENDING SYNC/i)).toBeDefined();
    expect(screen.getByText('Sync Now')).toBeDefined();
  });

  it('2. Reacts to successful sync event without requiring manual refresh, displaying server tracking code and synced confirmation', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/confirmation',
            state: { request: offlineRequest, isOffline: true },
          },
        ]}
      >
        <SubmissionConfirmation />
      </MemoryRouter>
    );

    // Initial state check
    expect(screen.getByText('local-confirm-999')).toBeDefined();

    // Simulate backend confirmation event arriving via targeted custom event
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('resqnet:request_synced:local-confirm-999', {
          detail: {
            client_local_id: 'local-confirm-999',
            server_request_id: 19,
            tracking_code: 'REQ-0019',
            status: 'SYNCED',
          },
        })
      );
    });

    // Confirmation page must immediately react without refresh
    await waitFor(() => {
      expect(screen.getByText('REQ-0019')).toBeDefined();
      expect(screen.getByText('Official Tracking Identifier')).toBeDefined();
      expect(screen.getByText(/✓ SYNCED/i)).toBeDefined();
      expect(screen.getByText('Assistance Request Synchronized & Logged')).toBeDefined();
      expect(screen.getByText(/Synced from offline ref: local-confirm-999/i)).toBeDefined();
      expect(screen.getByText('View Live Case Status')).toBeDefined();
    });
  });

  it('3. Reacts to sync failure event by showing truthful FAILED status and Retry button', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/confirmation',
            state: { request: offlineRequest, isOffline: true },
          },
        ]}
      >
        <SubmissionConfirmation />
      </MemoryRouter>
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('resqnet:request_synced:local-confirm-999', {
          detail: {
            client_local_id: 'local-confirm-999',
            status: 'FAILED',
            error: 'Radio mesh network timeout',
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Synchronization Pending (Stored Locally)')).toBeDefined();
      expect(screen.getByText(/SYNC FAILED - STORED LOCALLY/i)).toBeDefined();
      expect(screen.getByText('Radio mesh network timeout')).toBeDefined();
      expect(screen.getByText('Retry Synchronization')).toBeDefined();
    });
  });

  it('4. Clicking Retry Synchronization triggers sync queue and updates to confirmed state on success', async () => {
    // Spy on syncAllPendingRequests
    const syncSpy = vi.spyOn(syncModule, 'syncAllPendingRequests').mockImplementation(async () => {
      return {
        success: 1,
        failed: 0,
        results: [
          {
            localId: 'local-confirm-999',
            serverId: 22,
            trackingCode: 'REQ-0022',
            status: 'SYNCED' as const,
          },
        ],
      };
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/confirmation',
            state: {
              request: { ...offlineRequest, sync_status: 'FAILED', error_message: 'Prior connection lost' },
              isOffline: true,
            },
          },
        ]}
      >
        <SubmissionConfirmation />
      </MemoryRouter>
    );

    expect(screen.getByText('Retry Synchronization')).toBeDefined();

    // Click retry
    await act(async () => {
      fireEvent.click(screen.getByText('Retry Synchronization'));
    });

    expect(syncSpy).toHaveBeenCalled();

    // Verify it switched to confirmed state with server tracking code
    await waitFor(() => {
      expect(screen.getByText('REQ-0022')).toBeDefined();
      expect(screen.getByText('Official Tracking Identifier')).toBeDefined();
      expect(screen.getByText(/✓ SYNCED/i)).toBeDefined();
    });
  });
});
