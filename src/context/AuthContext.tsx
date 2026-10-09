import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthUser } from '../services/authService';
import { UserRole } from '../types/auth';

export interface ToastInfo {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signup' | 'login';
  toast: ToastInfo | null;
  openAuthModal: (mode?: 'signup' | 'login') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'signup' | 'login') => void;
  showToast: (info: ToastInfo) => void;
  clearToast: () => void;
  login: (usernameOrEmail: string, password: string, role?: UserRole) => Promise<AuthUser>;
  register: (input: { username: string; phone: string; password: string }) => Promise<AuthUser>;
  quickLogin: (role: UserRole) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login'>('signup');
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const showToast = (info: ToastInfo) => {
    setToast(info);
  };

  const clearToast = () => {
    setToast(null);
  };

  // Verify existing token or default to Bhushan Lokhande Delivery Boy
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

      // Default active staff user (Delivery Boy)
      try {
        const res = await authService.login('delivery@pizzadeliver.com', 'delivery123', 'DELIVERY_PERSON');
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
      } catch {
        setUser({
          id: 'usr-delivery',
          name: 'Bhushan Lokhande (DP-01)',
          username: 'delivery',
          email: 'delivery@pizzadeliver.com',
          role: 'DELIVERY_PERSON',
        });
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const openAuthModal = (mode: 'signup' | 'login' = 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (usernameOrEmail: string, password: string, role?: UserRole): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await authService.login(usernameOrEmail, password, role);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);

      // Trigger Activity Toast
      showToast({
        type: 'success',
        title: 'Logged In Successfully!',
        message: `Welcome back, ${res.user.name || res.user.username}! Active View: ${
          res.user.role === 'ADMIN' ? 'Admin Console' : 'Delivery Boy'
        }.`,
      });

      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: { username: string; phone: string; password: string }): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await authService.register(input);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);

      // Trigger Activity Toast
      showToast({
        type: 'success',
        title: 'Signed Up Successfully!',
        message: `Welcome, ${res.user.name || res.user.username}! Your Delivery Boy account is now active.`,
      });

      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    if (user?.role === newRole) return;
    if (newRole === 'ADMIN' && user?.role !== 'ADMIN') {
      openAuthModal('login');
      return;
    }
    await quickLogin(newRole);
  };

  const quickLogin = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const credMap: Record<UserRole, { user: string; pass: string }> = {
        ADMIN: { user: 'admin@26', pass: 'admin_05' },
        DELIVERY_PERSON: { user: 'delivery@pizzadeliver.com', pass: 'delivery123' },
      };

      const res = await authService.login(credMap[targetRole].user, credMap[targetRole].pass, targetRole);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);

      showToast({
        type: 'info',
        title: 'Switched View',
        message: `Active view set to ${targetRole === 'ADMIN' ? 'Admin Console' : 'Delivery Boy'}.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const prevUser = user;
    authService.logout(prevUser?.name || prevUser?.username, prevUser?.role);

    localStorage.removeItem('token');
    setToken(null);
    setUser(null);

    // Trigger Activity Toast
    showToast({
      type: 'info',
      title: 'Logged Out Successfully',
      message: 'You have been safely signed out. See you next time!',
    });

    openAuthModal('login');
  };

  const currentRole: UserRole = (user?.role as UserRole) || 'DELIVERY_PERSON';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: currentRole,
        currentRole,
        isAuthenticated: Boolean(user),
        isLoading,
        isAuthModalOpen,
        authModalMode,
        toast,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
        showToast,
        clearToast,
        login,
        register,
        quickLogin,
        switchRole,
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

export default AuthContext;
