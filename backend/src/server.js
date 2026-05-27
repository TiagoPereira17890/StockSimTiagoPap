import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stockRoutes from './routes/stocks.js';
import portfolioRoutes from './routes/portfolio.js';
import authRoutes from './routes/auth.js';
import friendsRoutes from './routes/friends.js';
import newsRoutes from './routes/news.js';
import leaderboardRoutes from './routes/leaderboard.js';
import aiRoutes from './routes/ai.js';
import { runPortfolioSync } from './jobs/portfolioSync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Rotas ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/stocks',       stockRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/friends',      friendsRoutes);
app.use('/api/news',         newsRoutes);
app.use('/api/leaderboard',  leaderboardRoutes);
app.use('/api/ai',           aiRoutes);

// ── Verificação de estado ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Rota não encontrada ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Tratamento global de erros ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Executar sincronização ao arrancar e depois a cada 30 minutos
  const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
  runPortfolioSync();
  setInterval(runPortfolioSync, SYNC_INTERVAL_MS);
  console.log(`⏱  Portfolio sync scheduled every 30 minutes`);
});

export default app;
