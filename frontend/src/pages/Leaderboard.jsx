import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { fetchLeaderboard } from '../api';

export default function Leaderboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard()
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-heading">{t.leader_title}</h1>
          <p className="text-gray-400 mt-1 font-medium">{t.leader_subtitle}</p>
        </div>
        <input 
          type="text" 
          placeholder={t.leader_search}
          className="input-field w-full sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.leader_rank}</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.leader_trader}</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t.leader_networth}</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t.leader_return}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isMe = user && u.id === user.id;
              return (
              <tr key={u.id} className={`border-b border-gray-50 dark:border-slate-700/50 transition-colors ${isMe ? 'bg-orange-50/50 dark:bg-orange-500/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <td className="px-6 py-4">
                  {u.rank <= 3 ? (
                    <span className="text-2xl">{medals[u.rank - 1]}</span>
                  ) : (
                    <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 font-bold text-sm">{u.rank}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-200/40 dark:shadow-orange-500/20">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-heading">{u.username} {isMe && <span className="text-xs text-orange-500 ml-1">({t.leader_you})</span>}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">${u.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className={`px-6 py-4 text-right font-bold ${u.returnPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {u.returnPct >= 0 ? '+' : ''}{u.returnPct}%
                </td>
              </tr>
            )})}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">{t.leader_notfound} "{search}"</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
