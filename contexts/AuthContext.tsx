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
  // Always start as not loading — no async session restore
  const [loading, setLoading] = useState(false);

  const login = async (user: User) => {
    setCurrentUser(user);
    // Persist only for this tab's lifetime; do NOT restore on next load
    // (localStorage write kept so it can be read by other utilities if needed)
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const value = {
    currentUser,
    loading,
    isAdmin: currentUser?.role === UserRole.ADMIN,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
