'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { reconnectSocketWithToken } from '../lib/socket';

export interface UserProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
  profileImage?: string;
  language: 'en' | 'hi' | 'gu';
  role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  loginStudent: (rollNumberOrPhone: string) => Promise<UserProfile>;
  registerStudent: (data: {
    name: string;
    rollNumber: string;
    phone?: string;
    email?: string;
    language?: string;
    profileImage?: string;
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

  const checkUser = async () => {
    try {
      const savedToken = localStorage.getItem('masi_token');
      if (savedToken) {
        setToken(savedToken);
        const res = await api.get('/auth/me');
        setUser(res.data.data.user);
        reconnectSocketWithToken(savedToken);
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      localStorage.removeItem('masi_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const loginStudent = async (phone: string): Promise<UserProfile> => {
    const res = await api.post('/auth/login/student', { phone: phone.trim() });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('masi_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    reconnectSocketWithToken(receivedToken);
    return receivedUser;
  };

  const registerStudent = async (data: any): Promise<UserProfile> => {
    const res = await api.post('/auth/register/student', data);
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('masi_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    reconnectSocketWithToken(receivedToken);
    return receivedUser;
  };

  const loginStaff = async (emailOrPhone: string, password: string): Promise<UserProfile> => {
    const res = await api.post('/auth/login/staff', { emailOrPhone, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('masi_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    reconnectSocketWithToken(receivedToken);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('masi_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updated });
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
