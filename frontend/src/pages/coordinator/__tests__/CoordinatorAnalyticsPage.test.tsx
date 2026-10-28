import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoordinatorAnalyticsPage } from '../CoordinatorAnalyticsPage';
import { dashboardService } from '../../../services/dashboardService';
import { requestService } from '../../../services/requestService';
import { DashboardAnalytics, RequestListResponse } from '../../../types';

vi.mock('../../../services/dashboardService');
vi.mock('../../../services/requestService');

describe('CoordinatorAnalyticsPage - Critical Unresolved Incident Watchlist', () => {
  const mockAnalytics: DashboardAnalytics = {
    status_distribution: [
      { status: 'RECEIVED', count: 2 },
      { status: 'CLOSED', count: 1 },
    ],
    incident_type_distribution: [{ incident_type: 'Flood', count: 3 }],
    priority_distribution: [{ priority_band: 'CRITICAL', count: 3 }],
    total_requests: 3,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(dashboardService.getAnalytics).mockResolvedValue(mockAnalytics);
  });

  it('filters out CLOSED and CANCELLED incidents while displaying unresolved critical incidents in priority order', async () => {
    const mockRequestsResponse: RequestListResponse = {
      items: [
        {
          id: 1,
          tracking_code: 'REQ-0001',
          title: 'Closed Balcony Entrapment',
          incident_type: 'Flood',
          description: 'Rescued.',
          location_name: 'Zone A',
          people_affected: 2,
          people_urgent: 1,
          assistance_category: 'Rescue',
          is_immediate_threat: true,
          is_medical_emergency: false,
          is_vulnerable_present: true,
          is_essential_unavailable: false,
          safe_contact_method: 'Phone',
          status: 'CLOSED',
          calculated_priority_score: 100,
          priority_band: 'CRITICAL',
          effective_priority_score: 100,
          effective_priority_band: 'CRITICAL',
          priority_factors: [],
          priority_explanation: '',
          status_history: [],
          assignments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          tracking_code: 'REQ-0002',
          title: 'Active High Priority Rescue',
          incident_type: 'Flood',
          description: 'Awaiting dispatch.',
          location_name: 'Zone B',
          people_affected: 3,
          people_urgent: 2,
          assistance_category: 'Rescue',
          is_immediate_threat: true,
          is_medical_emergency: true,
          is_vulnerable_present: true,
          is_essential_unavailable: false,
          safe_contact_method: 'Radio',
          status: 'RECEIVED',
          calculated_priority_score: 95,
          priority_band: 'CRITICAL',
          effective_priority_score: 95,
          effective_priority_band: 'CRITICAL',
          priority_factors: [],
          priority_explanation: '',
          status_history: [],
          assignments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          tracking_code: 'REQ-0003',
          title: 'Cancelled False Alarm',
          incident_type: 'Storm',
          description: 'Caller safe.',
          location_name: 'Zone C',
          people_affected: 1,
          people_urgent: 0,
          assistance_category: 'Rescue',
          is_immediate_threat: true,
          is_medical_emergency: false,
          is_vulnerable_present: false,
          is_essential_unavailable: false,
          safe_contact_method: 'Phone',
          status: 'CANCELLED',
          calculated_priority_score: 85,
          priority_band: 'CRITICAL',
          effective_priority_score: 85,
          effective_priority_band: 'CRITICAL',
          priority_factors: [],
          priority_explanation: '',
          status_history: [],
          assignments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 4,
          tracking_code: 'REQ-0004',
          title: 'Active Dispatched Ambulance',
          incident_type: 'Medical assistance',
          description: 'En route.',
          location_name: 'Zone D',
          people_affected: 1,
          people_urgent: 1,
          assistance_category: 'Medical assistance',
          is_immediate_threat: true,
          is_medical_emergency: true,
          is_vulnerable_present: false,
          is_essential_unavailable: false,
          safe_contact_method: 'Phone',
          status: 'EN_ROUTE',
          calculated_priority_score: 80,
          priority_band: 'CRITICAL',
          effective_priority_score: 80,
          effective_priority_band: 'CRITICAL',
          priority_factors: [],
          priority_explanation: '',
          status_history: [],
          assignments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 4,
      page: 1,
      page_size: 6,
      total_pages: 1,
    };

    vi.mocked(requestService.getRequests).mockResolvedValue(mockRequestsResponse);

    render(
      <MemoryRouter>
        <CoordinatorAnalyticsPage />
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Critical Unresolved Incident Watchlist')).toBeDefined();
    });

    // Unresolved incidents must appear
    expect(screen.getByText('REQ-0002')).toBeDefined();
    expect(screen.getByText('Active High Priority Rescue')).toBeDefined();
    expect(screen.getByText('REQ-0004')).toBeDefined();
    expect(screen.getByText('Active Dispatched Ambulance')).toBeDefined();

    // Terminal incidents must be excluded
    expect(screen.queryByText('REQ-0001')).toBeNull();
    expect(screen.queryByText('Closed Balcony Entrapment')).toBeNull();
    expect(screen.queryByText('REQ-0003')).toBeNull();
    expect(screen.queryByText('Cancelled False Alarm')).toBeNull();

    // Verify requested with is_unresolved: true
    expect(requestService.getRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        priority_band: 'CRITICAL',
        is_unresolved: true,
      })
    );
  });

  it('renders clean empty state when there are no unresolved critical incidents', async () => {
    vi.mocked(requestService.getRequests).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 6,
      total_pages: 0,
    });

    render(
      <MemoryRouter>
        <CoordinatorAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Critical Unresolved Incidents')).toBeDefined();
      expect(
        screen.getByText(/All high-urgency incidents are currently resolved or closed/i)
      ).toBeDefined();
    });
  });
});
