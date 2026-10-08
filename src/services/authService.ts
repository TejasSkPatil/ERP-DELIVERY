import apiClient from './api';
import { User, UserRole } from '../types/auth';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, role: UserRole = 'DELIVERY_PERSON'): Promise<LoginResponse> => {
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', { email, role });
      return res.data;
    } catch {
      // Mock auth fallback for Phase 2 frontend testing
      return {
        token: `mock-token-${role.toLowerCase()}`,
        user: {
          id: `usr-${role.toLowerCase()}`,
          name: role === 'ADMIN' ? 'Admin Manager' : role === 'USER' ? 'Amit Verma' : 'Rahul Sharma (DP-01)',
          email: `${role.toLowerCase()}@pizzadeliver.com`,
          role,
        },
      };
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const res = await apiClient.get<{ user: User }>('/auth/me');
      return res.data.user;
    } catch {
      return null;
    }
  },
};

export default authService;
