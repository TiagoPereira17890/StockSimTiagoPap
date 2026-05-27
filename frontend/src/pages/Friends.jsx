import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import {
  fetchPortfolio, fetchPortfolioHistory,
  fetchFriends, searchFriends, sendFriendRequest, acceptFriendRequest
} from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Toast de notificação ───────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const base = 'p-3 rounded-xl text-sm font-medium animate-slide-up mb-4';
  const styles = type === 'error'
    ? `${base} bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30`
    : `${base} bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30`;
  return <div className={styles}>{msg}</div>;
}

export default function Friends() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const t = translations[language];

  // dados de amigos
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMsg, setSearchMsg] = useState({ text: '', type: '' });

  // visualizar portefólio de amigo
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendPortfolio, setFriendPortfolio] = useState(null);
  const [friendHistory, setFriendHistory] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // ── carregar ao montar ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) loadFriends();
  }, [user]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await fetchFriends(user.id);
      setFriends(data.friends || []);
      setPending(data.pending || []);
    } catch (err) {
      console.error('loadFriends error:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  // ── pesquisa ─────────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchMsg({ text: '', type: '' });
    setSearchResults([]);
    try {
      const data = await searchFriends(q, user.id);
      if (!data || data.length === 0) {
        setSearchMsg({ text: 'No users found.', type: 'error' });
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('search error:', err);
      setSearchMsg({ text: err.response?.data?.error || 'Search failed. Try again.', type: 'error' });
    } finally {
      setSearchLoading(false);
    }
  };

  // ── enviar pedido de amizade ────────────────────────────────────────────────────
  const sendRequest = async (targetId, targetUsername) => {
    try {
      await sendFriendRequest(user.id, targetId);
      setSearchResults(prev => prev.filter(u => u.id !== targetId));
      setSearchMsg({ text: `Friend request sent to ${targetUsername}!`, type: 'success' });
    } catch (err) {
      console.error('sendRequest error:', err);
      setSearchMsg({ text: err.response?.data?.error || 'Failed to send request.', type: 'error' });
    }
  };

  // ── aceitar pedido de amizade ──────────────────────────────────────────────────
  const acceptRequest = async (requesterId) => {
    try {
      await acceptFriendRequest(user.id, requesterId);
      await loadFriends();
    } catch (err) {
      console.error('acceptRequest error:', err);
    }
  };

  // ── ver portefólio de amigo ────────────────────────────────────────────────────
  const viewFriendPortfolio = async (friend) => {
    if (selectedFriend?.id === friend.id) return;
    setSelectedFriend(friend);
    setFriendPortfolio(null);
    setFriendHistory([]);
    setLoadingPortfolio(true);
    try {
      const [portfolioRes, historyRes] = await Promise.all([
        fetchPortfolio(friend.id),
        fetchPortfolioHistory(friend.id)
      ]);
      setFriendPortfolio(portfolioRes || []);

      const validHistory = Array.isArray(historyRes) && historyRes.length > 0 && !historyRes.error;
      if (validHistory) {
        setFriendHistory(historyRes.map(h => ({
          ...h,
          recorded_at: new Date(h.recorded_at).toISOString().split('T')[0],
          total_value: parseFloat(h.total_value)
        })));
      } else {
        // Gerar linha de crescimento simulada
        const mock = [];
        const now = new Date();
        let v = 10000;
        for (let i = 30; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          v += (Math.random() - 0.42) * 180;
          mock.push({ recorded_at: d.toISOString().split('T')[0], total_value: +v.toFixed(2) });
        }
        setFriendHistory(mock);
      }
    } catch (err) {
      console.error('viewFriendPortfolio error:', err);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  // ── renderizar ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8 animate-fade-in">

      {/* ── Barra lateral ────────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/3 space-y-6">

        {/* Cartão de pesquisa */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-heading mb-4">{t.friends_find}</h2>
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              id="friends-search-input"
              type="text"
              placeholder={t.friends_search_placeholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field flex-1 !py-2"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="btn-primary !py-2 !px-4 text-sm disabled:opacity-60"
            >
              {searchLoading ? '...' : t.friends_search_btn}
            </button>
          </form>

          <Toast msg={searchMsg.text} type={searchMsg.type} />

          {searchResults.length > 0 && (
            <div className="space-y-2 animate-slide-up">
              {searchResults.map(u => (
                <div key={u.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{u.username}</span>
                  </div>
                  <button
                    onClick={() => sendRequest(u.id, u.username)}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-sm active:scale-95"
                  >
                    {t.friends_add}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos pendentes */}
        {pending.length > 0 && (
          <div className="card p-6 border-l-4 border-l-orange-400 animate-slide-up">
            <h2 className="text-lg font-bold text-heading mb-1">{t.friends_requests}</h2>
            <p className="text-xs text-gray-400 mb-4">{pending.length} {t.friends_pending}</p>
            <div className="space-y-2">
              {pending.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{p.username}</span>
                  </div>
                  <button
                    onClick={() => acceptRequest(p.id)}
                    className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors active:scale-95"
                  >
                    {t.friends_accept}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de amigos */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-heading">{t.friends_my}</h2>
            <span className="text-xs font-semibold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full">
              {friends.length}
            </span>
          </div>

          {loadingFriends ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              {t.friends_none}
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map(f => (
                <button
                  key={f.id}
                  onClick={() => viewFriendPortfolio(f)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                    selectedFriend?.id === f.id
                      ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-md shadow-orange-200/40 dark:shadow-orange-500/20">
                    {f.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-heading font-semibold block">{f.username}</span>
                    <span className="text-xs text-gray-400">{t.friends_clickview}</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Painel principal ─────────────────────────────────────────────────── */}
      <div className="w-full md:w-2/3">
        {selectedFriend ? (
          <div className="card-elevated p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-heading">{selectedFriend.username}'s Portfolio</h2>
                <p className="text-gray-400 text-sm">{t.friends_readonly}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-200/50 dark:shadow-orange-500/20">
                {selectedFriend.username.charAt(0).toUpperCase()}
              </div>
            </div>

            {loadingPortfolio ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Gráfico */}
                <div className="bg-gray-50 dark:bg-slate-700/30 p-5 rounded-xl border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t.friends_growth}</h3>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={friendHistory} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="friendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f3f4f6'} />
                        <XAxis dataKey="recorded_at" stroke={isDark ? '#64748b' : '#d1d5db'} tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 11 }} />
                        <YAxis
                          domain={['auto', 'auto']}
                          stroke={isDark ? '#64748b' : '#d1d5db'}
                          tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 11 }}
                          tickFormatter={v => `$${v.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#fed7aa'}`, borderRadius: '0.75rem', color: isDark ? '#e2e8f0' : '#1f2937' }}
                          formatter={v => [`$${parseFloat(v).toFixed(2)}`, 'Value']}
                        />
                        <Area type="monotone" dataKey="total_value" stroke="#f97316" strokeWidth={2} fill="url(#friendGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Posições */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t.friends_holdings}</h3>
                  {(!friendPortfolio || friendPortfolio.length === 0) ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-600">
                      {t.friends_noholdings}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friendPortfolio.map((h, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors">
                          <div>
                            <span className="font-bold text-heading">{h.ticker}</span>
                            <span className="text-xs text-gray-400 block">{h.company_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 dark:text-gray-400 text-sm block">{h.quantity} shares</span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">${parseFloat(h.market_value).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full card border-dashed flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-300 dark:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-400 mb-1">{t.friends_select}</h3>
            <p className="text-gray-300 dark:text-gray-600 text-sm">{t.friends_select_desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
