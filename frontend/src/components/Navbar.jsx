import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { translations } from '../utils/translations';

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = translations[language];

  const navLinks = [
    { key: 'nav_markets', path: '/dashboard' },
    { key: 'nav_portfolio', path: '/portfolio' },
    { key: 'nav_trade', path: '/trade' },
    { key: 'nav_news', path: '/news' },
    { key: 'nav_friends', path: '/friends' },
    { key: 'nav_leaderboard', path: '/leaderboard' }
  ];

  return (
    <nav
      className="sticky top-0 z-50 border-b shadow-sm transition-colors duration-300"
      style={{
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderBottomColor: isDark ? '#1e293b' : '#f3f4f6',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logótipo */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center group">
              <img
                src={isDark ? '/logo-dark.png' : '/logo.png'}
                alt="StockSim Logo"
                className="h-16 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Links de navegação desktop */}
            {user && (
              <div className="hidden lg:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname.startsWith(link.path);
                  return (
                    <Link
                      key={link.key}
                      to={link.path}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor: isActive
                          ? (isDark ? 'rgba(249,115,22,0.15)' : '#fff7ed')
                          : 'transparent',
                        color: isActive
                          ? (isDark ? '#fb923c' : '#ea580c')
                          : (isDark ? '#94a3b8' : '#1e3a5f'),
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f8fafc';
                          e.currentTarget.style.color = isDark ? '#e2e8f0' : '#0f2440';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = isDark ? '#94a3b8' : '#1e3a5f';
                        }
                      }}
                    >
                      {t[link.key]}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lado direito */}
          <div className="flex items-center space-x-3">
            
            {/* Alternar modo escuro */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-300 shadow-sm group"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#475569' : '#e5e7eb',
              }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              id="theme-toggle"
            >
              {isDark ? (
                /* Ícone sol */
                <svg className="w-[18px] h-[18px] text-amber-400 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                /* Ícone lua */
                <svg className="w-[18px] h-[18px] text-slate-600 group-hover:-rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Alternar idioma */}
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center w-8 h-8 rounded-full border transition-colors shadow-sm overflow-hidden"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#475569' : '#e5e7eb',
              }}
              title={language === 'en' ? 'Switch to Portuguese' : 'Switch to English'}
            >
              <img 
                src={language === 'en' ? 'https://flagcdn.com/w40/gb.png' : 'https://flagcdn.com/w40/pt.png'} 
                alt={language === 'en' ? 'English' : 'Português'} 
                className="w-full h-full object-cover"
              />
            </button>

            {user ? (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: isDark ? 'rgba(249,115,22,0.1)' : '#fff7ed',
                      borderColor: isDark ? 'rgba(249,115,22,0.3)' : '#ffedd5',
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{user.username?.charAt(0).toUpperCase()}</span>
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isDark ? '#e2e8f0' : '#1e3a5f' }}
                    >
                      {user.username}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="text-sm font-medium transition-colors px-3 py-2"
                  style={{ color: isDark ? '#94a3b8' : '#9ca3af' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? '#94a3b8' : '#9ca3af'; }}
                >
                  {t.nav_logout}
                </button>
                {/* Menu móvel */}
                <button
                  className="lg:hidden p-2 rounded-lg transition-colors"
                  style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}/>
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium transition-colors"
                  style={{ color: isDark ? '#94a3b8' : '#1e3a5f' }}
                >
                  {t.nav_login}
                </Link>
                <Link to="/register" className="btn-primary text-sm !py-2 !px-4">
                  {t.nav_signup}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navegação móvel */}
        {mobileOpen && user && (
          <div className="lg:hidden pb-4 animate-fade-in">
            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.key}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive
                        ? (isDark ? 'rgba(249,115,22,0.15)' : '#fff7ed')
                        : 'transparent',
                      color: isActive
                        ? (isDark ? '#fb923c' : '#ea580c')
                        : (isDark ? '#94a3b8' : '#1e3a5f'),
                    }}
                  >
                    {t[link.key]}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
