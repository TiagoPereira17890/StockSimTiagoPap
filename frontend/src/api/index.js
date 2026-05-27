import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Ações ─────────────────────────────────────────────────────────────────────
export const fetchStocks = () => API.get('/stocks').then(r => r.data);
export const fetchStock  = (ticker) => API.get(`/stocks/${ticker}`).then(r => r.data);
export const fetchPriceHistory = (ticker) => API.get(`/stocks/${ticker}/history`).then(r => r.data);
export const fetchQuotes = (tickers) => API.post('/stocks/quote', { tickers }).then(r => r.data);

// ── Portefólio ────────────────────────────────────────────────────────────────
export const fetchPortfolio = (userId) => API.get(`/portfolio/${userId}`).then(r => r.data);
export const fetchPortfolioHistory = (userId) => API.get(`/portfolio/${userId}/history`).then(r => r.data);
export const buyStock  = (userId, ticker, quantity) =>
  API.post('/portfolio/buy',  { userId, ticker, quantity }).then(r => r.data);
export const sellStock = (userId, ticker, quantity) =>
  API.post('/portfolio/sell', { userId, ticker, quantity }).then(r => r.data);

// ── Autenticação ──────────────────────────────────────────────────────────────
export const login    = (email, password) => API.post('/auth/login',    { email, password }).then(r => r.data);
export const register = (username, email, password) =>
  API.post('/auth/register', { username, email, password }).then(r => r.data);
export const googleLogin = (credential) =>
  API.post('/auth/google', { credential }).then(r => r.data);

// ── Amigos ────────────────────────────────────────────────────────────────────
export const fetchFriends = (userId) => API.get(`/friends/${userId}`).then(r => r.data);
export const searchFriends = (q, userId) =>
  API.get('/friends/search', { params: { q, userId } }).then(r => r.data);
export const sendFriendRequest = (userId, targetId) => API.post('/friends/request', { userId, targetId }).then(r => r.data);
export const acceptFriendRequest = (userId, requesterId) => API.put('/friends/accept', { userId, requesterId }).then(r => r.data);

// ── Classificação ─────────────────────────────────────────────────────────────
export const fetchLeaderboard = () => API.get('/leaderboard').then(r => r.data);

// ── Notícias ──────────────────────────────────────────────────────────────────
export const fetchNews = (q = 'stock market', count = 20) =>
  API.get('/news', { params: { q, count } }).then(r => r.data);

// ── Chatbot IA ────────────────────────────────────────────────────────────────
export const askAI = (message, ticker) => 
  API.post('/ai/chat', { message, ticker }).then(r => r.data);

// ── OAuth GitHub ──────────────────────────────────────────────────────────────
export const githubLogin = (code) =>
  API.post('/auth/github', { code }).then(r => r.data);

export default API;
