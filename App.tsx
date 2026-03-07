import React, { useState, useEffect } from 'react';
import { User, UserRole, Property, Payment, Complaint, PaymentStatus, ComplaintStatus } from './types';
import OwnerPanel from './components/OwnerPanel';
import TenantPanel from './components/TenantPanel';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import { Language } from './translations';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { currentUser, login, logout } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState<'landing' | 'owner' | 'tenant' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.TENANT);

  // Set View based on Role
  useEffect(() => {
    if (currentUser) {
      setView(currentUser.role === UserRole.OWNER ? 'owner' : 'tenant');
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


  if (!currentUser && view !== 'landing' && view !== 'auth') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="animate-fadeIn">
      {view === 'landing' && (
        <LandingPage
          lang={lang}
          setLang={setLang}
          onLoginOwner={() => navigateToAuth(UserRole.OWNER, 'login')}
          onLoginTenant={() => navigateToAuth(UserRole.TENANT, 'login')}
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
