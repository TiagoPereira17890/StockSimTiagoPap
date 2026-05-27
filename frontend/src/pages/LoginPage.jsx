import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

// Tickers de mercado para animar
const TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK.B', 'LLY', 'AVGO', 
  'V', 'JPM', 'UNH', 'MA', 'JNJ', 'XOM', 'PG', 'HD', 'COST', 'MRK'
];

// Pré-calcular posições aleatórias e posicionamento determinista para cada ticker
const generateParticles = () => {
  return TICKERS.map((ticker, i) => {
    // Começar aleatoriamente pelo ecrã
    const startX = 5 + Math.random() * 90; 
    const startY = 10 + Math.random() * 80;
    
    // Posições-alvo para a fase de gráfico
    const graphX = 5 + (i / (TICKERS.length - 1)) * 90; // Distribuir uniformemente da esquerda para a direita (5% a 95%)
    
    // Criar uma linha ascendente com ruído
    const baseTrend = 70 - (i / TICKERS.length) * 45; 
    const noise = Math.sin(i * 1.5) * 12 + (Math.random() * 8 - 4);
    const graphY = baseTrend + noise;
    
    return { id: ticker, ticker, startX, startY, graphX, graphY };
  });
};

const Particle = ({ data, progress }) => {
  // Interpolar de flutuação orgânica (startX/Y) para gráfico estruturado (graphX/Y)
  // Animação acontece entre 20% e 55% do scroll
  const x = useTransform(progress, [0.2, 0.55], [`${data.startX}vw`, `${data.graphX}vw`]);
  const y = useTransform(progress, [0.2, 0.55], [`${data.startY}vh`, `${data.graphY}vh`]);
  
  // Reduzir ligeiramente os pills ao formar o gráfico
  const scale = useTransform(progress, [0.2, 0.55], [1.1, 0.75]);
  
  // Mudar cores para um "laranja bolsista" coeso ao encaixar no gráfico
  const bgColor = useTransform(progress, [0.3, 0.55], ["rgba(255,255,255,0.05)", "rgba(249,115,22,0.85)"]);
  const borderColor = useTransform(progress, [0.3, 0.55], ["rgba(255,255,255,0.15)", "rgba(249,115,22,0.4)"]);

  // Movimento orgânico aleatório
  return (
    <motion.div
      className="absolute top-0 left-0 will-change-transform"
      style={{ x, y, scale }}
    >
      <motion.div
        animate={{
          y: [0, -12, 0],
          x: [0, 8, 0],
          rotate: [0, 3, -3, 0]
        }}
        transition={{
          duration: 3 + Math.random() * 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="px-4 py-1.5 rounded-full backdrop-blur-md text-white font-bold tracking-wider text-xs shadow-xl"
        style={{ backgroundColor: bgColor, borderColor, borderWidth: '1px' }}
      >
        {data.ticker}
      </motion.div>
    </motion.div>
  );
};

const GraphLine = ({ particles, progress }) => {
  // Desvanecer a linha à medida que as partículas encaixam
  const opacity = useTransform(progress, [0.45, 0.6], [0, 1]);
  // Desenhar a linha da esquerda para a direita
  const pathLength = useTransform(progress, [0.45, 0.65], [0, 1]);

  const pathData = particles.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.graphX} ${p.graphY}`
  ).join(' ');

  return (
    <motion.svg 
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" 
      preserveAspectRatio="none" 
      viewBox="0 0 100 100"
      style={{ opacity }}
    >
      {/* Efeito de brilho atrás da linha */}
      <motion.path
        d={pathData}
        fill="none"
        stroke="rgba(249,115,22, 0.15)"
        strokeWidth="2"
        style={{ pathLength }}
        className="blur-sm"
      />
      {/* Linha principal nítida */}
      <motion.path
        d={pathData}
        fill="none"
        stroke="rgba(249,115,22, 0.8)"
        strokeWidth="0.4"
        style={{ pathLength }}
      />
      {/* Preenchimento gradiente suave abaixo da linha */}
      <motion.path
        d={`${pathData} L 100 100 L 0 100 Z`}
        fill="url(#graphGradient)"
        style={{ opacity: useTransform(progress, [0.55, 0.7], [0, 1]) }}
      />
      <defs>
        <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(249,115,22,0.15)" />
          <stop offset="100%" stopColor="rgba(249,115,22,0)" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
};

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // Configuração de acompanhamento suave do scroll
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  
  // Física de mola para interpolações premium
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20, restDelta: 0.001 });

  // Interpolações da secção hero
  const heroOpacity = useTransform(smoothProgress, [0, 0.25], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.25], [1, 0.85]);
  const heroY = useTransform(smoothProgress, [0, 0.25], [0, -50]);
  
  // Interpolações do painel de autenticação
  const authOpacity = useTransform(smoothProgress, [0.65, 0.85], [0, 1]);
  const authY = useTransform(smoothProgress, [0.65, 0.85], [80, 0]);
  const authPointerEvents = useTransform(smoothProgress, v => v > 0.6 ? 'auto' : 'none');

  // Gerar o layout das partículas uma única vez
  const particles = useMemo(() => generateParticles(), []);

  // ── Handler do Google Sign-In ────────────────────────────────────────────────
  const handleGoogleCallback = useCallback(async (response) => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  // Inicializar Google Identity Services e renderizar o botão
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;
    
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 380,
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
        });
      }
    };

    // O script pode já estar carregado ou ainda a carregar
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [handleGoogleCallback]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    // A altura do container define quanto scroll é necessário para completar a animação (3 ecrãs)
    <div ref={containerRef} className="h-[300vh] bg-slate-950 selection:bg-orange-500/30 text-white font-sans">
      
      {/* Wrapper fixo mantém o viewport enquanto fazemos scroll pelos 300vh */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center">
        
        {/* Fundo subtíl em grelha técnica */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* ── FASE 1: Secção Hero ── */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none px-4"
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        >
          <div className="inline-flex items-center gap-3 mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-300">{t.landing_hero_tag}</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 tracking-tight mb-6 drop-shadow-2xl">
            StockSim
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            {t.landing_hero_desc}
          </p>
          
          <div className="absolute bottom-12 flex flex-col items-center animate-bounce text-gray-500">
            <span className="text-xs font-bold uppercase tracking-widest mb-2">{t.landing_scroll}</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </motion.div>

        {/* ── FASE 2: Partículas e Convergência do Gráfico ── */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <GraphLine particles={particles} progress={smoothProgress} />
          {particles.map(p => <Particle key={p.id} data={p} progress={smoothProgress} />)}
        </div>

        {/* ── FASE 3: Painel de Autenticação ── */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-30 px-4"
          style={{ opacity: authOpacity, y: authY, pointerEvents: authPointerEvents }}
        >
          <div className="w-full max-w-md p-8 md:p-10 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
            
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white text-center mb-2 tracking-tight">
              {mode === 'login' ? t.login_welcome : t.reg_title}
            </h2>
            <p className="text-center text-gray-400 text-sm mb-8">
              {mode === 'login' ? t.login_subtitle : t.reg_subtitle}
            </p>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.reg_username}</label>
                  <input 
                    type="text" name="username" value={form.username} onChange={handleChange} required
                    className="w-full bg-black/40 border border-gray-800 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                    placeholder="e.g. wallstreet_wolf"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.login_email}</label>
                <input 
                  type="email" name="email" value={form.email} onChange={handleChange} required
                  className="w-full bg-black/40 border border-gray-800 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.login_password}</label>
                </div>
                <input 
                  type="password" name="password" value={form.password} onChange={handleChange} required
                  className="w-full bg-black/40 border border-gray-800 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full py-4 mt-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white rounded-xl font-bold text-lg shadow-[0_10px_20px_-10px_rgba(249,115,22,0.6)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : mode === 'login' ? t.login_signin : t.reg_signup}
              </button>
            </form>

            {/* Separador */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{t.login_or || 'or'}</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Botão Google Sign-In (renderizado pelo Google Identity Services) */}
            <div className="flex justify-center">
              <div ref={googleBtnRef} className="w-full" />
            </div>
            {googleLoading && (
              <div className="flex justify-center mt-3">
                <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {/* Botão GitHub Sign-In */}
            <button
              type="button"
              onClick={() => {
                if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === 'YOUR_GITHUB_CLIENT_ID_HERE') {
                  setError(t.login_github_not_configured || 'GitHub Sign-In is not configured.');
                  return;
                }
                const redirectUri = `${window.location.origin}/auth/github/callback`;
                window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
              }}
              className="w-full mt-3 py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 border border-gray-700"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>{t.login_github || 'Continue with GitHub'}</span>
            </button>

            <div className="mt-6 text-center border-t border-gray-800 pt-6">
              <p className="text-gray-400 text-sm">
                {mode === 'login' ? t.login_noaccount + ' ' : t.reg_hasaccount + ' '}
                <button 
                  type="button"
                  onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                >
                  {mode === 'login' ? t.login_register_link : t.reg_login_link}
                </button>
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
