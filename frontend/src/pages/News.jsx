import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { fetchNews } from '../api';

const CATEGORIES = [
  { label: 'Market',   query: 'stock market' },
  { label: 'Tech',     query: 'AAPL MSFT NVDA tech stocks' },
  { label: 'Crypto',   query: 'cryptocurrency bitcoin' },
  { label: 'Economy',  query: 'economy inflation GDP' },
  { label: 'Earnings', query: 'earnings report quarterly' },
];

export default function News() {
  const { language } = useLanguage();
  const t = translations[language];
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadNews(activeCategory.query); }, [activeCategory]);

  const loadNews = async (query) => {
    setLoading(true);
    try {
      const data = await fetchNews(query, 20);
      setArticles(data);
    } catch { setArticles([]); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) loadNews(searchQuery.trim());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMs = Date.now() - d;
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffHrs < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-heading">{t.news_title.split(' ')[0]} <span className="text-gradient">{t.news_title.split(' ').slice(1).join(' ')}</span></h1>
        <p className="text-gray-400 mt-1 font-medium">{t.news_subtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input type="text" placeholder={t.news_search} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary">{t.news_btn}</button>
        </form>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat.label}
            onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeCategory.label === cat.label
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 dark:shadow-orange-500/20'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 card border-dashed">
          <p className="text-gray-400 text-lg">{t.news_notfound}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article, i) => (
            <a key={i} href={article.link} target="_blank" rel="noopener noreferrer"
              className="group card overflow-hidden hover:-translate-y-1"
            >
              {article.thumbnail && (
                <div className="h-44 overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img src={article.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="p-5">
                <h3 className="text-base font-bold text-heading group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug mb-3">
                  {article.title}
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-500 font-semibold">{article.publisher}</span>
                  <span className="text-gray-400">{formatDate(article.publishedAt)}</span>
                </div>
                {article.relatedTickers?.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {article.relatedTickers.slice(0, 4).map(t => (
                      <span key={t} className="bg-orange-50 dark:bg-orange-500/10 text-xs text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md font-mono font-semibold border border-orange-100 dark:border-orange-500/30">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
