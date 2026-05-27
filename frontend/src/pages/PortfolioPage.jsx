import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { fetchPortfolio, fetchPortfolioHistory, fetchQuotes } from '../api';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

// Formatador de datas para o eixo X
function fmtDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const t = translations[language];

  const [holdings, setHoldings]       = useState([]);
  const [history,  setHistory]        = useState([]);
  const [loading,  setLoading]        = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const balance = user ? parseFloat(user.balance) : 0;

  // ── Carregar portefólio + histórico ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [portfolioData, historyData] = await Promise.all([
        fetchPortfolio(user.id),
        fetchPortfolioHistory(user.id),
      ]);

      setHoldings(portfolioData || []);

      if (Array.isArray(historyData) && historyData.length > 0) {
        const cleaned = historyData.map(h => {
          const d = new Date(h.recorded_at);
          return {
            recorded_at: h.recorded_at,
            display_date: fmtDate(h.recorded_at),
            full_date: d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            total_value: parseFloat(h.total_value),
          };
        });
        setHistory(cleaned);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Portfolio load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Atualizar preços em direto a cada 30 s ────────────────────────────────────
  useEffect(() => {
    if (!holdings.length) return;
    const timer = setTimeout(async () => {
      try {
        setRefreshing(true);
        const tickers = holdings.map(h => h.ticker);
        const quotes  = await fetchQuotes(tickers);
        const qMap = {};
        quotes.forEach(q => { if (q?.price) qMap[q.ticker] = q.price; });
        setHoldings(prev => prev.map(h => {
          const newPrice = qMap[h.ticker] ?? parseFloat(h.current_price);
          return { ...h, current_price: newPrice, market_value: newPrice * h.quantity };
        }));
      } catch (err) {
        console.error('Auto-refresh error:', err);
      } finally {
        setRefreshing(false);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [holdings]);

  // ── Valores derivados ────────────────────────────────────────────────────────
  const totalHoldingsValue = holdings.reduce((s, h) => s + parseFloat(h.market_value), 0);
  const totalNetWorth      = balance + totalHoldingsValue;

  // Líquidos vs $10,000 iniciais
  const startingValue = 10000;
  const pnl           = totalNetWorth - startingValue;
  const pnlPct        = ((pnl / startingValue) * 100).toFixed(2);
  const pnlPositive   = pnl >= 0;

  // Cor do gráfico: verde se atual > inicial, vermelho se abaixo
  const chartColor = history.length >= 2
    ? (history[history.length - 1].total_value >= history[0].total_value ? '#22c55e' : '#ef4444')
    : '#f97316';

  // ── Skeleton de carregamento ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Tooltip interativo personalizado ─────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`backdrop-blur-sm border rounded-xl shadow-2xl p-4 min-w-[200px] z-50 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-100'}`}>
        <p className={`text-xs font-semibold mb-2 border-b pb-2 ${isDark ? 'text-gray-400 border-slate-700' : 'text-gray-500 border-gray-100'}`}>
          {payload[0].payload.full_date}
        </p>
        <div className="flex justify-between items-center">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Portfolio Value</span>
          <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ${parseFloat(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">

      {/* ── Cartões de estatísticas ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Património líquido */}
        <div className="card-elevated p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.port_networth}</p>
          <h2 className="text-4xl font-black text-heading">
            ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div className={`mt-2 flex items-center gap-1 text-sm font-semibold ${pnlPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              {pnlPositive
                ? <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"/>
                : <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"/>
              }
            </svg>
            {pnlPositive ? '+' : ''}${Math.abs(pnl).toFixed(2)} ({pnlPositive ? '+' : ''}{pnlPct}%)
          </div>
        </div>

        {/* Valor em ações */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.port_stockvalue}</p>
          <h2 className="text-3xl font-bold text-orange-500">
            ${totalHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          {refreshing && <p className="text-xs text-orange-400 mt-1 animate-pulse">Updating prices…</p>}
        </div>

        {/* Saldo disponível */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.port_cash}</p>
          <h2 className="text-3xl font-bold text-heading-secondary">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* ── Gráfico de crescimento ───────────────────────────────────────── */}
      <div className="card-elevated p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 style={{ fontFamily: "'Poppins', sans-serif" }} className="text-lg font-bold text-heading">
            {t.port_growth}
          </h3>
          {history.length > 0 && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${pnlPositive ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
              {pnlPositive ? '▲' : '▼'} {Math.abs(pnlPct)}%
            </span>
          )}
        </div>

        <div className="h-80 w-full">
          {history.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <svg className="w-12 h-12 text-orange-200 dark:text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-sm font-medium">No portfolio history yet.</p>
              <p className="text-xs text-gray-300 dark:text-gray-600">Make your first trade to start tracking growth.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f3f4f6'} />
                <XAxis
                  dataKey="recorded_at"
                  stroke={isDark ? '#64748b' : '#9ca3af'}
                  tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 11 }}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke={isDark ? '#64748b' : '#9ca3af'}
                  tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 11 }}
                  tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                  width={60}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="total_value"
                  stroke={chartColor}
                  strokeWidth={2.5}
                  fill="url(#portGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: chartColor, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Tabela de posições ─────────────────────────────────────────── */}
      <div>
        <h3 style={{ fontFamily: "'Poppins', sans-serif" }} className="text-xl font-bold text-heading mb-4">
          {t.port_holdings}
        </h3>
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.port_asset}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t.port_shares}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t.port_price}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t.port_growth}</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t.port_marketvalue}</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <a 
                      href={`https://finance.yahoo.com/quote/${h.ticker}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:underline transition-colors"
                      title="View on Yahoo Finance"
                    >
                      {h.ticker} 
                      <svg className="w-3 h-3 mb-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <span className="block text-xs text-gray-400">{h.company_name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium text-right">{h.quantity}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium text-right">
                    ${parseFloat(h.current_price).toFixed(2)}
                    <span className="block text-[10px] text-gray-400 font-normal">Avg: ${parseFloat(h.avg_price || h.current_price).toFixed(2)}</span>
                  </td>
                  <td className={`px-6 py-4 font-bold text-right ${h.growth_percent >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {h.growth_percent >= 0 ? '+' : ''}{parseFloat(h.growth_percent || 0).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 font-bold text-heading-secondary text-right">
                    ${parseFloat(h.market_value).toFixed(2)}
                  </td>
                </tr>
              ))}
              {holdings.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">{t.port_noholdings}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
