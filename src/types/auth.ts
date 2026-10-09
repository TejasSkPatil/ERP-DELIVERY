export type UserRole = 'ADMIN' | 'DELIVERY_PERSON';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
}
