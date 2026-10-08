import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthUser } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: 'ADMIN' | 'DELIVERY_PERSON' | 'USER';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (role: 'ADMIN' | 'DELIVERY_PERSON' | 'USER') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auto-login / verify existing token or default to Delivery Person
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
          setToken(storedToken);
          setIsLoading(false);
          return;
        } catch {
          localStorage.removeItem('token');
        }
      }

      // Default quick-login as Delivery Agent for seamless developer preview
      try {
        const res = await authService.login('delivery@pizzadeliver.com', 'delivery123');
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
      } catch (err) {
        console.warn('Initial auth fallback:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: 'ADMIN' | 'DELIVERY_PERSON' | 'USER') => {
    setIsLoading(true);
    try {
      const emailMap = {
        ADMIN: 'admin@pizzadeliver.com',
        DELIVERY_PERSON: 'delivery@pizzadeliver.com',
        USER: 'customer@pizzadeliver.com',
      };
      const passMap = {
        ADMIN: 'admin123',
        DELIVERY_PERSON: 'delivery123',
        USER: 'customer123',
      };

      const res = await authService.login(emailMap[role], passMap[role]);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const currentRole = user?.role || 'DELIVERY_PERSON';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: currentRole,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
