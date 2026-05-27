import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { buyStock, sellStock, askAI } from '../api';
import { Bot, X, Send, User } from 'lucide-react';

const MARKETS = [
  { name: 'USA', stocks: [ { ticker: 'AAPL', name: 'Apple Inc.' }, { ticker: 'MSFT', name: 'Microsoft Corp.' }, { ticker: 'NVDA', name: 'NVIDIA Corp.' }, { ticker: 'AMZN', name: 'Amazon.com Inc.' }, { ticker: 'GOOGL', name: 'Alphabet Inc.' } ]},
  { name: 'UK', stocks: [ { ticker: 'SHEL.L', name: 'Shell plc' }, { ticker: 'AZN.L', name: 'AstraZeneca' }, { ticker: 'HSBA.L', name: 'HSBC Holdings' }, { ticker: 'ULVR.L', name: 'Unilever' }, { ticker: 'BP.L', name: 'BP plc' } ]},
  { name: 'Germany', stocks: [ { ticker: 'SAP.DE', name: 'SAP SE' }, { ticker: 'SIE.DE', name: 'Siemens AG' }, { ticker: 'ALV.DE', name: 'Allianz SE' }, { ticker: 'AIR.DE', name: 'Airbus SE' }, { ticker: 'DTE.DE', name: 'Deutsche Telekom' } ]},
  { name: 'Japan', stocks: [ { ticker: '7203.T', name: 'Toyota Motor' }, { ticker: '6758.T', name: 'Sony Group' }, { ticker: '8306.T', name: 'Mitsubishi UFJ' }, { ticker: '6861.T', name: 'Keyence' }, { ticker: '9984.T', name: 'SoftBank Group' } ]},
  { name: 'Taiwan', stocks: [ { ticker: '2330.TW', name: 'TSMC' }, { ticker: '2454.TW', name: 'MediaTek' }, { ticker: '2317.TW', name: 'Hon Hai (Foxconn)' }, { ticker: '2308.TW', name: 'Delta Electronics' }, { ticker: '2382.TW', name: 'Quanta Computer' } ]},
  { name: 'Saudi Arabia', stocks: [ { ticker: '2222.SR', name: 'Saudi Aramco' }, { ticker: '1120.SR', name: 'Al Rajhi Bank' }, { ticker: '1180.SR', name: 'SNB' }, { ticker: '2010.SR', name: 'SABIC' }, { ticker: '7010.SR', name: 'STC' } ]},
  { name: 'Iberia', stocks: [ { ticker: 'ITX.MC', name: 'Inditex' }, { ticker: 'SAN.MC', name: 'Banco Santander' }, { ticker: 'IBE.MC', name: 'Iberdrola' }, { ticker: 'EDP.LS', name: 'EDP' }, { ticker: 'JMT.LS', name: 'Jerónimo Martins' }, { ticker: 'GALP.LS', name: 'Galp Energia' } ]}
];

export default function Trade() {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [selectedCountry, setSelectedCountry] = useState('');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState('buy');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Estado do chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Olá! Sou o seu analista financeiro IA. Selecione uma ação e pergunte-me o que quiser!' }]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatOpen) scrollToBottom();
  }, [messages, chatOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const res = action === 'buy'
        ? await buyStock(user.id, ticker, quantity)
        : await sellStock(user.id, ticker, quantity);
      
      if (res.balance !== undefined) {
        updateUser({ balance: res.balance });
      }
      
      setStatus({ type: 'success', message: `${res.message}! Total: $${parseFloat(res.total).toFixed(2)}` });
      setTicker('');
      setQuantity(1);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || `Failed to ${action} stock` });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      // Enviar o ticker atual para a IA ter contexto do Yahoo Finance em tempo real
      const res = await askAI(userMsg, ticker);
      setMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: err.response?.data?.error || 'Desculpe, ocorreu um erro ao contactar a IA local. O Ollama está a correr?' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 animate-fade-in">
      <div className="card-elevated p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-heading">{t.trade_title}</h2>
          <p className="text-gray-400 mt-1">{t.trade_subtitle}</p>
        </div>
        
        {status.message && (
          <div className={`mb-6 p-4 rounded-xl font-medium text-sm animate-slide-up ${status.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t.trade_market_label}</label>
            <select 
              className="input-field mb-4 cursor-pointer"
              value={selectedCountry}
              onChange={e => { setSelectedCountry(e.target.value); setTicker(''); }}
            >
              <option value="">{t.trade_all_custom}</option>
              {MARKETS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>

            {selectedCountry ? (
              <>
                <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t.trade_select_stock}</label>
                <select 
                  className="input-field text-xl font-bold uppercase !py-4 cursor-pointer"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  required
                >
                  <option value="" disabled>{t.trade_select_placeholder}</option>
                  {MARKETS.find(m => m.name === selectedCountry)?.stocks.map(s => (
                    <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t.trade_ticker_label}</label>
                <input 
                  type="text" 
                  className="input-field text-2xl font-bold uppercase !py-4"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  maxLength={10}
                  required
                />
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t.trade_quantity_label}</label>
            <input 
              type="number" 
              className="input-field text-2xl font-bold !py-4"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => setAction('buy')}
              className={`py-4 rounded-xl font-bold text-lg transition-all duration-200 ${action === 'buy' ? 'bg-green-500 text-white shadow-lg shadow-green-200/60 dark:shadow-green-500/20 scale-[1.02]' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              {t.trade_buy}
            </button>
            <button 
              type="button" 
              onClick={() => setAction('sell')}
              className={`py-4 rounded-xl font-bold text-lg transition-all duration-200 ${action === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-200/60 dark:shadow-red-500/20 scale-[1.02]' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              {t.trade_sell}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full mt-4 font-bold py-4 rounded-xl transition-all duration-200 active:scale-[0.98] ${loading ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-500 cursor-not-allowed' : 'btn-primary !shadow-xl'}`}
          >
            {loading ? t.trade_processing : t.trade_execute}
          </button>
        </form>
      </div>

      {/* Chatbot IA flutuante */}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${chatOpen ? 'w-80 sm:w-96' : 'w-auto'}`}>
        {/* Janela do chat */}
        <div className={`rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 origin-bottom-right w-full flex flex-col ${chatOpen ? 'h-[500px] mb-4 opacity-100 scale-100' : 'h-0 opacity-0 scale-95 pointer-events-none'} bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-700`}>
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2 font-bold">
              <Bot size={20} />
              <span>StockSim AI Analyst</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-800/50 text-sm">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"><Bot size={16} /></div>}
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 text-gray-800 dark:text-gray-200 shadow-sm rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"><Bot size={16} /></div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 shadow-sm rounded-tl-sm flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about the market..." 
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm text-gray-800 dark:text-gray-200"
            />
            <button type="submit" disabled={isTyping || !chatInput.trim()} className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center">
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Botão de abrir/fechar o chat */}
        {!chatOpen && (
          <button 
            onClick={() => setChatOpen(true)}
            className="w-14 h-14 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center text-white hover:scale-105 hover:-translate-y-1 transition-all group animate-bounce-slow"
          >
            <Bot size={26} className="group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}
