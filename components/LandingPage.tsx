
import React from 'react';
import { Icons } from '../constants';
import { TRANSLATIONS, Language } from '../translations';

interface LandingPageProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onLoginOwner: () => void;
  onLoginTenant: () => void;
  onLoginAdmin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ lang, setLang, onLoginOwner, onLoginTenant, onLoginAdmin }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#EAEAEA] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#4B5EAA] p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Icons.Home />
            </div>
            <span className="font-bold text-xl text-[#2D3436] tracking-tight">{t.appTitle}</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-24 pb-32 px-6 flex items-center justify-center min-h-[80vh]">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/90 backdrop-blur-[2px]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center animate-fadeIn relative z-10">
          <div className="inline-block px-4 py-1.5 bg-white/80 border border-[#BBDEFB] text-[#1565C0] rounded-full text-xs font-bold tracking-widest uppercase mb-6 shadow-sm backdrop-blur-sm">
            #1 App for Indian Homes
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[#2D3436] mb-6 leading-tight drop-shadow-sm">
            {t.landingHeroTitle}
          </h1>
          <p className="text-lg md:text-xl text-[#555] mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.landingHeroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onLoginOwner}
              className="w-full sm:w-auto px-8 py-4 bg-[#4B5EAA] text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-[#3D4D8C] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
            >
              <Icons.Home />
              {t.loginOwner}
            </button>
            <button
              onClick={onLoginTenant}
              className="w-full sm:w-auto px-8 py-4 bg-white/90 backdrop-blur text-[#2D3436] border-2 border-[#EAEAEA] rounded-xl font-bold text-lg hover:bg-white hover:border-[#4B5EAA] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
            >
              <Icons.Users />
              {t.loginTenant}
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#2D3436]">{t.featuresTitle}</h2>
            <div className="w-16 h-1 bg-[#4B5EAA] mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#FDFCF9] border border-[#EAEAEA] hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-[#E3F2FD] text-[#1565C0] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icons.Rent />
              </div>
              <h3 className="text-xl font-bold mb-3">{t.feature1Title}</h3>
              <p className="text-[#8E9491] leading-relaxed">{t.feature1Desc}</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FDFCF9] border border-[#EAEAEA] hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-[#FFF8E1] text-[#F57F17] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{t.feature2Title}</h3>
              <p className="text-[#8E9491] leading-relaxed">{t.feature2Desc}</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FDFCF9] border border-[#EAEAEA] hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-[#FFEBEE] text-[#C62828] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icons.Complaint />
              </div>
              <h3 className="text-xl font-bold mb-3">{t.feature3Title}</h3>
              <p className="text-[#8E9491] leading-relaxed">{t.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-[#4B5EAA] text-white relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">{t.testimonialsTitle}</h2>
          <div className="bg-white/10 backdrop-blur-lg p-8 md:p-12 rounded-3xl border border-white/20">
            <div className="flex justify-center mb-6 text-[#FFD700]">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
              ))}
            </div>
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-6">"{t.testi1}"</p>
            <p className="opacity-80 font-bold tracking-wide">— {t.testi1Name}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D3436] text-white py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-lg">
              <Icons.Home />
            </div>
            <span className="font-bold text-xl">{t.appTitle}</span>
          </div>
          <p className="text-white/60 text-sm">{t.footerText} &copy; 2024</p>
          <div className="flex gap-6 text-white/60">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <button onClick={onLoginAdmin} className="hover:text-white transition-colors underline bg-transparent border-none cursor-pointer">Admin Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
