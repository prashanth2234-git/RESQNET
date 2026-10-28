import { apiRequest } from './api';
import { User } from '../types';
import { clearAuthToken } from './tokenStorage';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (payload: { email: string; password: string; full_name: string; phone?: string }): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: async (): Promise<User> => {
    return apiRequest<User>('/auth/me');
  },

  logout: async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore if offline
    } finally {
      clearAuthToken();
    }
  },
};
