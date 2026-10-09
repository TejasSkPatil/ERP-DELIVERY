import apiClient from './api';
import { User, UserRole } from '../types/auth';

export type AuthUser = User;

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  register: async (input: { username: string; phone: string; password: string }): Promise<LoginResponse> => {
    try {
      const res = await apiClient.post<LoginResponse>('/auth/register', input);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      throw new Error(msg);
    }
  },

  login: async (usernameOrEmail: string, password?: string, role?: UserRole): Promise<LoginResponse> => {
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', {
        username: usernameOrEmail,
        email: usernameOrEmail,
        password,
        role,
      });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid username or password';
      throw new Error(msg);
    }
  },

  logout: async (userName?: string, userRole?: string): Promise<void> => {
    try {
      await apiClient.post('/auth/logout', { userName, userRole });
    } catch {
      // Ignore network errors during logout
    }
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return { user: res.data.user };
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
