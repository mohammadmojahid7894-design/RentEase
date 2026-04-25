import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Property, Payment, Complaint, PaymentStatus, ComplaintStatus } from './types';
import OwnerPanel from './components/OwnerPanel';
import TenantPanel from './components/TenantPanel';
import AdminPanel from './components/AdminPanel';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import { Language } from './translations';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { currentUser, login, logout } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState<'landing' | 'owner' | 'tenant' | 'admin' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.TENANT);

  const isInitialMount = useRef(true);

  // Redirect to dashboard ONLY after an explicit login — skip on first render
  // so the landing page always shows on refresh/direct load.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Do nothing on initial mount
    }
    if (currentUser) {
      if (currentUser.role === UserRole.ADMIN) {
        setView('admin');
      } else {
        setView(currentUser.role === UserRole.OWNER ? 'owner' : 'tenant');
      }
    } else {
      setView('landing');
    }
  }, [currentUser]);

  // --- Authentication Helpers ---
  const navigateToAuth = (role: UserRole, mode: 'login' | 'register' = 'login') => {
    setAuthRole(role);
    setAuthMode(mode);
    setView('auth');
  };

  const handleAuthSuccess = (user: User) => {
    login(user); // AuthContext updates and useEffect will change `view` automatically
  };

  const handleLogout = () => {
    logout();
    setView('landing');
  };



  return (
    <div className="animate-fadeIn">
      {view === 'landing' && (
        <LandingPage
          lang={lang}
          setLang={setLang}
          onLoginOwner={() => navigateToAuth(UserRole.OWNER, 'login')}
          onLoginTenant={() => navigateToAuth(UserRole.TENANT, 'login')}
          onLoginAdmin={() => navigateToAuth(UserRole.ADMIN, 'login')}
        />
      )}
      {view === 'auth' && (
        <Auth
          initialMode={authMode}
          initialRole={authRole}
          onSuccess={handleAuthSuccess}
          onBack={() => setView('landing')}
        />
      )}
      {view === 'owner' && currentUser && (
        <OwnerPanel
          user={currentUser}
          lang={lang}
          onLogout={handleLogout}
        />
      )}
      {view === 'tenant' && currentUser && (
        <TenantPanel
          user={currentUser}
          lang={lang}
          onLogout={handleLogout}
        />
      )}
      {view === 'admin' && currentUser && (
        <AdminPanel
          user={currentUser}
          lang={lang}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
