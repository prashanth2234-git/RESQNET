import { apiRequest } from './api';
import { AssistanceRequest, RequestListResponse, StatusHistoryItem } from '../types';

export interface CreateRequestPayload {
  title: string;
  incident_type: string;
  description: string;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  people_affected: number;
  people_urgent: number;
  assistance_category: string;
  is_immediate_threat: boolean;
  is_medical_emergency: boolean;
  is_vulnerable_present: boolean;
  is_essential_unavailable: boolean;
  safe_contact_method: string;
  contact_details?: string | null;
  accessibility_medical_notes?: string | null;
  idempotency_key?: string | null;
  client_local_id?: string | null;
}

export const requestService = {
  createRequest: async (payload: CreateRequestPayload): Promise<AssistanceRequest> => {
    return apiRequest<AssistanceRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getRequests: async (params: {
    incident_type?: string;
    priority_band?: string;
    status?: string;
    assistance_category?: string;
    search?: string;
    assigned_state?: string;
    is_unresolved?: boolean;
    page?: number;
    page_size?: number;
    tracking_code?: string;
  } = {}): Promise<RequestListResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    return apiRequest<RequestListResponse>(`/requests?${query.toString()}`);
  },

  getRequestById: async (id: number | string): Promise<AssistanceRequest> => {
    return apiRequest<AssistanceRequest>(`/requests/${id}`);
  },

  updateRequestCitizen: async (id: number, payload: {
    safe_contact_method?: string;
    contact_details?: string;
    accessibility_medical_notes?: string;
  }): Promise<AssistanceRequest> => {
    return apiRequest<AssistanceRequest>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  verifyRequest: async (id: number, verification_notes?: string): Promise<AssistanceRequest> => {
    return apiRequest<AssistanceRequest>(`/requests/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verification_notes }),
    });
  },

  overridePriority: async (
    id: number,
    override_score: number,
    override_band: string,
    reason: string
  ): Promise<AssistanceRequest> => {
    return apiRequest<AssistanceRequest>(`/requests/${id}/priority-override`, {
      method: 'POST',
      body: JSON.stringify({
        override_score,
        override_band,
        reason,
      }),
    });
  },

  assignResponder: async (
    requestId: number,
    responderId: number,
    overrideReason?: string
  ): Promise<AssistanceRequest> => {
    return apiRequest<AssistanceRequest>(`/requests/${requestId}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        responder_id: responderId,
        override_workload_reason: overrideReason || null,
      }),
    });
  },

  updateStatus: async (
    requestId: number,
    payloadOrStatus:
      | {
          new_status: string;
          explanation?: string;
          is_override?: boolean;
          assistance_confirmed?: boolean;
          assistance_notes?: string;
          closure_explanation?: string;
          override_reason?: string;
        }
      | string,
    explanation?: string,
    isOverride: boolean = false
  ): Promise<AssistanceRequest> => {
    let body: any;
    if (typeof payloadOrStatus === 'string') {
      body = {
        new_status: payloadOrStatus,
        explanation,
        is_override: isOverride,
      };
    } else {
      body = payloadOrStatus;
    }
    return apiRequest<AssistanceRequest>(`/requests/${requestId}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getRequestHistory: async (requestId: number): Promise<StatusHistoryItem[]> => {
    return apiRequest<StatusHistoryItem[]>(`/requests/${requestId}/history`);
  },
};
