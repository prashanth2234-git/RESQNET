export type UserRole = 'CITIZEN' | 'COORDINATOR' | 'RESPONDER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
}

export type RequestStatus =
  | 'RECEIVED'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ASSISTANCE_PROVIDED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED';

export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityFactor {
  key: string;
  name: string;
  points: number;
  applied: boolean;
  explanation: string;
}

export interface StatusHistoryItem {
  id: number;
  previous_status?: string | null;
  new_status: string;
  changed_by_name?: string | null;
  explanation?: string | null;
  timestamp: string;
}

export interface AssignmentBrief {
  id: number;
  responder_id: number;
  responder_team: string;
  status: string;
  assigned_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  assistance_notes?: string | null;
}

export interface AssistanceRequest {
  id: number;
  tracking_code: string;
  citizen_id?: number | null;
  citizen_name?: string | null;
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
  status: RequestStatus;
  calculated_priority_score: number;
  priority_band: PriorityBand;
  priority_factors: PriorityFactor[];
  priority_explanation: string;
  priority_calculated_at?: string | null;
  priority_override_score?: number | null;
  priority_override_band?: PriorityBand | null;
  priority_override_reason?: string | null;
  priority_override_by_name?: string | null;
  priority_override_at?: string | null;
  effective_priority_score: number;
  effective_priority_band: PriorityBand;
  verification_notes?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  idempotency_key?: string | null;
  client_local_id?: string | null;
  created_at: string;
  updated_at: string;
  status_history: StatusHistoryItem[];
  assignments: AssignmentBrief[];
}

export interface RequestListResponse {
  items: AssistanceRequest[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ResponderProfile {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string | null;
  team: string;
  supported_categories: string[];
  availability: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY';
  max_concurrent_assignments: number;
  current_assignment_count: number;
  latitude?: number | null;
  longitude?: number | null;
  last_active_at: string;
  created_at: string;
}

export interface AssignmentDetailed {
  id: number;
  request_id: number;
  request_tracking_code: string;
  request_title: string;
  request_incident_type: string;
  request_location_name: string;
  request_latitude?: number | null;
  request_longitude?: number | null;
  request_priority_band: PriorityBand;
  request_priority_score: number;
  request_safe_contact_method: string;
  request_contact_details?: string | null;
  request_status: RequestStatus;
  responder_id: number;
  responder_team: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REASSIGNED' | 'CANCELLED';
  assigned_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  assistance_notes?: string | null;
  override_workload_reason?: string | null;
}

export interface DashboardSummary {
  total_active_requests: number;
  critical_awaiting_review: number;
  unassigned_requests: number;
  responders_available: number;
  assistance_provided: number;
  awaiting_verification: number;
  is_live_data: boolean;
  notice: string;
}

export interface DashboardAnalytics {
  status_distribution: { status: string; count: number }[];
  incident_type_distribution: { incident_type: string; count: number }[];
  priority_distribution: { priority_band: string; count: number }[];
  total_requests: number;
}

export interface ActivityItem {
  id: number;
  timestamp: string;
  action_type: string;
  actor_name: string;
  description: string;
  entity_id?: number | null;
  tracking_code?: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  request_id?: number | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface OfflinePendingRequest {
  client_local_id: string;
  idempotency_key: string;
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
  created_at: string;
  sync_status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  error_message?: string;
  server_request_id?: number;
  tracking_code?: string;
}
