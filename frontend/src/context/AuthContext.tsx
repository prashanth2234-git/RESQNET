import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import {
  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  clearAuthToken,
} from '../services/tokenStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (payload: { email: string; password: string; full_name: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  isCoordinator: boolean;
  isResponder: boolean;
  isCitizen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getAuthToken();
      if (storedToken) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
          setStoredUser(userData);
          setToken(storedToken);
        } catch {
          // Token expired or invalid
          clearAuthToken();
          setUser(null);
          setToken(null);
        }
      } else {
        clearAuthToken();
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await authService.login(email, pass);
    setAuthToken(res.access_token);
    setStoredUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: { email: string; password: string; full_name: string; phone?: string }): Promise<User> => {
    const res = await authService.register(payload);
    setAuthToken(res.access_token);
    setStoredUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  const isCoordinator = user?.role === 'COORDINATOR';
  const isResponder = user?.role === 'RESPONDER';
  const isCitizen = user?.role === 'CITIZEN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isCoordinator,
        isResponder,
        isCitizen,
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
