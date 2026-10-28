import { apiRequest } from './api';
import { DashboardSummary, DashboardAnalytics, ActivityItem } from '../types';

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    return apiRequest<DashboardSummary>('/dashboard/summary');
  },

  getAnalytics: async (): Promise<DashboardAnalytics> => {
    return apiRequest<DashboardAnalytics>('/dashboard/analytics');
  },

  getActivity: async (limit: number = 25): Promise<ActivityItem[]> => {
    return apiRequest<ActivityItem[]>(`/dashboard/activity?limit=${limit}`);
  },
};
