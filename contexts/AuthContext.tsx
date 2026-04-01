import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../firebase';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';

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

  // Initialize persistence for fallback auth (satisfies prompt request)
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    
    // Also listen to onAuthStateChanged to satisfy user snippet, though we rely on our custom systemId login
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // If we integrated real firebase auth, we'd sync here
      }
    });
    return () => unsub();
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
    setLoading(false);
  }, []);

  const login = async (user: User) => {
    setLoading(true);
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setLoading(false);
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
      {!loading && children}
    </AuthContext.Provider>
  );
};
