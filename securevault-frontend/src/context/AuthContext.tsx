import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { mockUser, mockAdminUser } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('sv.auth.token');
    const storedUser = localStorage.getItem('sv.auth.user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Mock login - simulate API call delay
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock authentication logic
    let mockUserData;
    if (email === 'admin@securevault.com') {
      mockUserData = mockAdminUser;
    } else {
      mockUserData = mockUser;
    }
    
    const mockToken = `mock-jwt-token-${Date.now()}`;
    
    localStorage.setItem('sv.auth.token', mockToken);
    localStorage.setItem('sv.auth.user', JSON.stringify(mockUserData));
    
    setToken(mockToken);
    setUser(mockUserData);
    setLoading(false);
  };

  const signup = async (email: string, password: string): Promise<void> => {
    // Mock signup - simulate API call delay
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      role: 'user',
      rate_limit_rps: 10,
      storage_quota_bytes: 5368709120, // 5GB
      created_at: new Date().toISOString()
    };
    
    const mockToken = `mock-jwt-token-${Date.now()}`;
    
    localStorage.setItem('sv.auth.token', mockToken);
    localStorage.setItem('sv.auth.user', JSON.stringify(newUser));
    
    setToken(mockToken);
    setUser(newUser);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('sv.auth.token');
    localStorage.removeItem('sv.auth.user');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};