import { Router } from 'express';
import { getNews } from '../services/stockService.js';

const router = Router();

// GET /api/news?q=AAPL — obter notícias do Yahoo Finance
router.get('/', async (req, res) => {
  try {
    const query = req.query.q || 'stock market';
    const count = parseInt(req.query.count) || 20;
    const articles = await getNews(query, count);
    res.json(articles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router;
