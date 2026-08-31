'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { reconnectSocketWithToken } from '../lib/socket';

export interface UserProfile {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  language: 'en' | 'hi' | 'gu';
  role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  loginStudent: (phone: string) => Promise<UserProfile>;
  registerStudent: (data: {
    name: string;
    phone: string;
    profileImage?: string;
    language?: string;
  }) => Promise<UserProfile>;
  loginStaff: (emailOrPhone: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  updateUser: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize from localStorage immediately
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('masi_token');
      const savedUserStr = localStorage.getItem('masi_user');

      if (savedToken) {
        setToken(savedToken);
        if (savedUserStr) {
          try {
            setUser(JSON.parse(savedUserStr));
          } catch (e) {}
        }
        reconnectSocketWithToken(savedToken);

        // Verify token in background without blocking or resetting session prematurely
        api.get('/auth/me')
          .then((res) => {
            const fetchedUser = res.data.data.user;
            setUser(fetchedUser);
            localStorage.setItem('masi_user', JSON.stringify(fetchedUser));
          })
          .catch((err) => {
            if (err.response?.status === 401) {
              console.warn('Session expired, logging out');
              localStorage.removeItem('masi_token');
              localStorage.removeItem('masi_user');
              setUser(null);
              setToken(null);
            }
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      }
    } catch (err) {
      console.warn('Error reading auth state:', err);
    }
    setLoading(false);
  }, []);

  const loginStudent = async (phone: string): Promise<UserProfile> => {
    const res = await api.post('/auth/login/student', { phone: phone.trim() });
    const { token: receivedToken, user: receivedUser } = res.data.data;

    localStorage.setItem('masi_token', receivedToken);
    localStorage.setItem('masi_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    setLoading(false);
    reconnectSocketWithToken(receivedToken);
    return receivedUser;
  };

  const registerStudent = async (data: {
    name: string;
    phone: string;
    profileImage?: string;
    language?: string;
  }): Promise<UserProfile> => {
    const res = await api.post('/auth/register/student', data);
    const { token: receivedToken, user: receivedUser } = res.data.data;

    localStorage.setItem('masi_token', receivedToken);
    localStorage.setItem('masi_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    setLoading(false);
    reconnectSocketWithToken(receivedToken);
    return receivedUser;
  };

  const loginStaff = async (emailOrPhone: string, password: string): Promise<UserProfile> => {
    const res = await api.post('/auth/login/staff', { emailOrPhone, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;

    localStorage.setItem('masi_token', receivedToken);
    localStorage.setItem('masi_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    setLoading(false);
    reconnectSocketWithToken(receivedToken);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('masi_token');
    localStorage.removeItem('masi_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<UserProfile>) => {
    if (user) {
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem('masi_user', JSON.stringify(merged));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginStudent,
        registerStudent,
        loginStaff,
        logout,
        updateUser,
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
