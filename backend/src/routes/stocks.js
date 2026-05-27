import { Router } from 'express';
import pool from '../config/db.js';
import { getCurrentPrice, getQuote, getHistoricalPrices } from '../services/stockService.js';

const router = Router();

// GET /api/stocks — listar todas as ações com preços em tempo real
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM stocks ORDER BY ticker ASC'
    );

    // Obter preços em paralelo para todas as ações
    const enriched = await Promise.all(
      rows.map(async (stock) => {
        try {
          const quote = await getQuote(stock.ticker);
          await pool.query(
            'UPDATE stocks SET current_price = $1, updated_at = NOW() WHERE id = $2',
            [quote.price, stock.id]
          );
          return {
            ...stock,
            current_price: quote.price,
            change: quote.change,
            change_percent: quote.changePercent,
            volume: quote.volume,
            day_high: quote.dayHigh,
            day_low: quote.dayLow,
          };
        } catch {
          return { ...stock, change: 0, change_percent: 0 };
        }
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// POST /api/stocks/quote — cotações em tempo real para múltiplos tickers
// Body: { tickers: ["AAPL", "SHEL.L", "7203.T", ...] }
router.post('/quote', async (req, res) => {
  try {
    const { tickers } = req.body;
    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({ error: 'tickers array required' });
    }

    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const quote = await getQuote(ticker);
          return { ticker, price: quote.price, change: quote.change, changePercent: quote.changePercent, name: quote.name, error: null };
        } catch (err) {
          return { ticker, price: null, change: null, changePercent: null, name: null, error: err.message };
        }
      })
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET /api/stocks/:ticker — detalhe de uma ação com dados em tempo real
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM stocks WHERE ticker = $1',
      [ticker.toUpperCase()]
    );

    // Se não existe na BD, tentar obter diretamente do Yahoo Finance
    if (!rows.length) {
      try {
        const quote = await getQuote(ticker);
        // Inserir automaticamente na BD
        const insertRes = await pool.query(
          `INSERT INTO stocks (ticker, company_name, current_price)
             VALUES ($1, $2, $3)
             ON CONFLICT (ticker) DO UPDATE SET current_price = $3, updated_at = NOW()
             RETURNING *`,
          [ticker.toUpperCase(), quote.name, quote.price]
        );
        return res.json({ ...insertRes.rows[0], ...quote, current_price: quote.price });
      } catch {
        return res.status(404).json({ error: 'Stock not found' });
      }
    }

    try {
      const quote = await getQuote(ticker);
      await pool.query(
        'UPDATE stocks SET current_price = $1, updated_at = NOW() WHERE id = $2',
        [quote.price, rows[0].id]
      );
      res.json({ ...rows[0], ...quote, current_price: quote.price });
    } catch {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// GET /api/stocks/:ticker/history?period=1mo — histórico de preços via Yahoo Finance
router.get('/:ticker/history', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period || '1mo';
    const history = await getHistoricalPrices(ticker, period);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

export default router;
