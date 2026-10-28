import { apiRequest } from './api';
import { NotificationItem } from '../types';

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    return apiRequest<NotificationItem[]>('/notifications');
  },

  markRead: async (notificationId: number): Promise<NotificationItem> => {
    return apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  markAllRead: async (): Promise<{ count: number }> => {
    return apiRequest<{ count: number }>('/notifications/read-all', {
      method: 'POST',
    });
  },
};
