import { apiRequest } from './api';
import { ResponderProfile, AssignmentDetailed } from '../types';

export const responderService = {
  getResponders: async (): Promise<ResponderProfile[]> => {
    return apiRequest<ResponderProfile[]>('/responders');
  },

  createResponder: async (payload: {
    user_id: number;
    team: string;
    supported_categories: string[];
    max_concurrent_assignments: number;
    latitude?: number;
    longitude?: number;
  }): Promise<ResponderProfile> => {
    return apiRequest<ResponderProfile>('/responders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyAssignments: async (): Promise<AssignmentDetailed[]> => {
    return apiRequest<AssignmentDetailed[]>('/responders/me/assignments');
  },

  updateMyAvailability: async (availability: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY'): Promise<ResponderProfile> => {
    return apiRequest<ResponderProfile>('/responders/me/availability', {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    });
  },

  acceptAssignment: async (assignmentId: number): Promise<AssignmentDetailed> => {
    return apiRequest<AssignmentDetailed>(`/assignments/${assignmentId}/accept`, {
      method: 'POST',
    });
  },

  completeAssignment: async (assignmentId: number, assistanceNotes: string): Promise<AssignmentDetailed> => {
    return apiRequest<AssignmentDetailed>(`/assignments/${assignmentId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ assistance_notes: assistanceNotes }),
    });
  },
};
