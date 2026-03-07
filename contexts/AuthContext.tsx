import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
const SESSION_TIME_KEY = 'sessionLoginTime';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session if still valid (within 5 minutes)
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(SESSION_KEY);
      const loginTime = localStorage.getItem(SESSION_TIME_KEY);

      if (storedUser && loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed < SESSION_DURATION_MS) {
          setCurrentUser(JSON.parse(storedUser));
        } else {
          // Session expired — clear it
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_TIME_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_TIME_KEY);
    }
    setLoading(false);
  }, []);

  // Periodically check if session has expired while app is open
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const loginTime = localStorage.getItem(SESSION_TIME_KEY);
      if (!loginTime || Date.now() - parseInt(loginTime, 10) >= SESSION_DURATION_MS) {
        setCurrentUser(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_TIME_KEY);
      }
    }, 30_000); // check every 30 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  // Listen to browser back/forward — re-validate session
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const loginTime = localStorage.getItem(SESSION_TIME_KEY);
        if (!loginTime || Date.now() - parseInt(loginTime, 10) >= SESSION_DURATION_MS) {
          setCurrentUser(null);
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_TIME_KEY);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('popstate', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('popstate', handleVisibility);
    };
  }, []);

  const login = async (user: User) => {
    setLoading(true);
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_TIME_KEY, String(Date.now()));
    setLoading(false);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TIME_KEY);
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
