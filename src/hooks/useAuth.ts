import { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types/auth';
import { authService } from '../services/authService';

export const useAuth = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('DELIVERY_PERSON');
  const [user, setUser] = useState<User | null>({
    id: 'usr-delivery',
    name: 'Rahul Sharma (DP-01)',
    email: 'delivery@pizzadeliver.com',
    role: 'DELIVERY_PERSON',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const switchRole = useCallback(async (newRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await authService.login(`${newRole.toLowerCase()}@pizzadeliver.com`, newRole);
      localStorage.setItem('token', res.token);
      setUser(res.user);
      setCurrentRole(newRole);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      localStorage.setItem('token', 'mock-token-delivery_person');
    }
  }, []);

  return {
    user,
    currentRole,
    isLoading,
    switchRole,
  };
};

export default useAuth;
