
import React from 'react';
import { COLORS } from '../constants';
import { TRANSLATIONS, Language } from '../translations';

interface TabItem {
  id: string;
  label: string;
  icon: React.FC<any>;
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  tabs: TabItem[];
  lang: Language;
  onLogout: () => void;
  userRole: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  tabs, 
  lang,
  onLogout,
  userRole
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EAEAEA] h-screen sticky top-0">
        <div className="p-6 border-b border-[#EAEAEA]">
          <button 
             onClick={onLogout} 
             className="flex items-center gap-2 text-[#8E9491] hover:text-[#4B5EAA] transition-colors text-sm mb-4"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
             </svg>
             {t.backToHome}
          </button>
          <h2 className="text-2xl font-bold text-[#4B5EAA]">Ghar-ka-System</h2>
          <p className="text-xs text-[#8E9491] mt-1">{userRole} Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-[#4B5EAA] text-white shadow-md' 
                  : 'text-[#2D3436] hover:bg-[#F9F8F6]'
              }`}
            >
              <div className={activeTab === tab.id ? 'text-white' : 'text-[#8E9491]'}>
                <tab.icon />
              </div>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#EAEAEA]">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-[#BC4749] hover:bg-[#FFEBEE] rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            <span className="font-medium">{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAEAEA] flex justify-around p-3 pb-6 safe-area-bottom z-50">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 min-w-[60px] ${
              activeTab === tab.id ? 'text-[#4B5EAA]' : 'text-[#8E9491]'
            }`}
          >
            <div className={`transition-transform duration-200 ${activeTab === tab.id ? '-translate-y-1' : ''}`}>
              <tab.icon />
            </div>
            <span className={`text-[10px] font-bold ${activeTab === tab.id ? 'opacity-100' : 'opacity-80'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
