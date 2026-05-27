import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import StockAnimation from '../components/StockAnimation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logótipo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="StockSim Logo" className="h-16 w-auto object-contain" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">{t.login_welcome}</h2>
          <p className="text-gray-400 mt-1">{t.login_subtitle}</p>
        </div>

        <div className="card-elevated p-8">
          <StockAnimation />

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium animate-slide-up">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1.5">{t.login_email}</label>
              <input type="email" className="input-field" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1.5">{t.login_password}</label>
              <input type="password" className="input-field" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              />
            </div>
            <button type="submit" disabled={loading}
              className={`w-full font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'btn-primary'}`}
            >
              {loading ? t.login_signingin : t.login_signin}
            </button>
          </form>
          
          <p className="mt-5 text-center text-gray-400 text-sm">
            {t.login_noaccount} <Link to="/register" className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">{t.login_register_link}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
