import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (user: User) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isAdmin: false,
  login: async () => { },
  logout: () => { }
});

export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = 'sessionUser';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Loading start");
    setLoading(true);

    const fallbackTimeout = setTimeout(() => {
      setLoading(false);
      console.log("Loading end (custom auth)");
    }, 500); // reduced timeout because no firebase checking

    return () => {
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Restore our custom system ID session
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(SESSION_KEY);
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const login = async (user: User) => {
    setLoading(true);
    try {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const value = {
    currentUser,
    loading,
    isAdmin: currentUser?.role === UserRole.OWNER,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
