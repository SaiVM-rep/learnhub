import React, { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      // 2FA flow: credentials verified, OTP sent — don't store tokens yet
      if (response.data.otp_required) {
        return { success: true, otp_required: true, email: response.data.email };
      }
      // Fallback for direct login (should not happen in normal flow)
      const { tokens, user: userData } = response.data;
      localStorage.setItem('tokens', JSON.stringify(tokens));
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      await authAPI.register(data);
      return { success: true };
    } catch (error) {
      const errors = error.response?.data || {};
      const message = typeof errors === 'string' ? errors :
        Object.values(errors).flat().join(' ');
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
      await authAPI.logout({ refresh: tokens.refresh });
    } catch (e) {
      // Ignore errors on logout
    }
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const requestOTP = async (email) => {
    try {
      await authAPI.requestOTP(email);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send OTP. Please try again.';
      return { success: false, error: message };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await authAPI.verifyOTP(email, otp);
      const { tokens, user: userData } = response.data;
      localStorage.setItem('tokens', JSON.stringify(tokens));
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.error || 'OTP verification failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const isAuthenticated = !!user;
  const isStudent = user?.role === 'STUDENT';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated, isStudent, isInstructor, isAdmin,
      login, register, logout, setUser, requestOTP, verifyOTP,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
