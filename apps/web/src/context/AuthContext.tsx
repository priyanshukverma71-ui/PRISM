import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'INSTITUTION_USER' | 'REGIONAL_OFFICER' | 'BUREAU_OFFICER' | 'COMMITTEE_REVIEWER' | 'SYSTEM_ADMIN' | 'AUDITOR';
  institutionId?: string | null;
  institutionName?: string | null;
  institutionCode?: string | null;
  region?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: string) => Promise<void>;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('prism_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('prism_reduced_motion') === 'true';
  });

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => {
      const next = !prev;
      localStorage.setItem('prism_reduced_motion', String(next));
      return next;
    });
  };

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiRequest<any>('/auth/me');
        const actualUser = res?.user || res?.data || res;
        setUser(actualUser);
      } catch (err) {
        console.warn('Session expired or invalid, clearing credentials.');
        localStorage.removeItem('prism_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('prism_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      // Continue cleanup
    }
    localStorage.removeItem('prism_token');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (role: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/switch-demo-role', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      localStorage.setItem('prism_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchRole,
        reducedMotion,
        toggleReducedMotion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
