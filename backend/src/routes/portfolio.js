import { Router } from 'express';
import pool from '../config/db.js';
import { getQuote } from '../services/stockService.js';

const router = Router();

/**
 * Garante que uma ação existe na BD. Se não existir, obtém dados do Yahoo Finance
 * e insere-a. Devolve { id, current_price } ou lança erro.
 */
async function ensureStock(client, ticker) {
  const upper = ticker.toUpperCase();
  let res = await client.query(
    'SELECT id, current_price FROM stocks WHERE ticker = $1',
    [upper]
  );
  if (res.rows.length) return res.rows[0];

  // Não existe na BD — obter do Yahoo Finance e inserir
  const quote = await getQuote(ticker);
  if (!quote || !quote.price) throw new Error(`Cannot find stock: ${ticker}`);

  res = await client.query(
    `INSERT INTO stocks (ticker, company_name, current_price)
       VALUES ($1, $2, $3)
       ON CONFLICT (ticker) DO UPDATE SET current_price = $3, updated_at = NOW()
       RETURNING id, current_price`,
    [upper, quote.name || ticker, quote.price]
  );
  return res.rows[0];
}

// GET /api/portfolio/:userId — portefólio do utilizador
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      `WITH avg_prices AS (
         SELECT stock_id, SUM(total) / NULLIF(SUM(quantity), 0) AS avg_price
         FROM transactions
         WHERE user_id = $1 AND type = 'BUY'
         GROUP BY stock_id
       )
       SELECT p.quantity,
              s.ticker, s.company_name, s.current_price,
              (p.quantity * s.current_price) AS market_value,
              COALESCE(a.avg_price, s.current_price) AS avg_price,
              ((s.current_price - COALESCE(a.avg_price, s.current_price)) / NULLIF(COALESCE(a.avg_price, s.current_price), 0) * 100) AS growth_percent
         FROM portfolio p
         JOIN stocks s ON s.id = p.stock_id
         LEFT JOIN avg_prices a ON a.stock_id = p.stock_id
        WHERE p.user_id = $1 AND p.quantity > 0
        ORDER BY s.ticker`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// POST /api/portfolio/buy — comprar ações
router.post('/buy', async (req, res) => {
  const { userId, ticker, quantity } = req.body;
  if (!userId || !ticker || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid trade parameters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obter ou inserir ação automaticamente
    const { id: stockId, current_price } = await ensureStock(client, ticker);
    const total = parseFloat(current_price) * quantity;

    // Verificar saldo do utilizador
    const userRes = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    if (!userRes.rows.length) throw new Error('User not found');
    const { balance } = userRes.rows[0];
    if (parseFloat(balance) < total) throw new Error('Insufficient funds');

    // Deduzir saldo
    const updatedUser = await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance',
      [total, userId]
    );
    const newBalance = updatedUser.rows[0].balance;

    // Upsert no portefólio
    await client.query(
      `INSERT INTO portfolio (user_id, stock_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, stock_id)
         DO UPDATE SET quantity = portfolio.quantity + $3`,
      [userId, stockId, quantity]
    );

    // Registar transação
    await client.query(
      `INSERT INTO transactions (user_id, stock_id, type, quantity, price, total)
         VALUES ($1, $2, 'BUY', $3, $4, $5)`,
      [userId, stockId, quantity, current_price, total]
    );

    await client.query('COMMIT');
    res.json({ message: 'Purchase successful', total, balance: newBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/portfolio/sell — vender ações
router.post('/sell', async (req, res) => {
  const { userId, ticker, quantity } = req.body;
  if (!userId || !ticker || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid trade parameters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stockRes = await client.query(
      'SELECT id, current_price FROM stocks WHERE ticker = $1',
      [ticker.toUpperCase()]
    );
    if (!stockRes.rows.length) throw new Error('Stock not found');
    const { id: stockId, current_price } = stockRes.rows[0];
    const total = parseFloat(current_price) * quantity;

    // Verificar posições
    const holdingRes = await client.query(
      'SELECT quantity FROM portfolio WHERE user_id = $1 AND stock_id = $2',
      [userId, stockId]
    );
    if (!holdingRes.rows.length || holdingRes.rows[0].quantity < quantity) {
      throw new Error('Insufficient shares');
    }

    // Creditar saldo
    const updatedUser = await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
      [total, userId]
    );
    const newBalance = updatedUser.rows[0].balance;

    // Reduzir posições
    await client.query(
      `UPDATE portfolio SET quantity = quantity - $1
         WHERE user_id = $2 AND stock_id = $3`,
      [quantity, userId, stockId]
    );

    // Registar transação
    await client.query(
      `INSERT INTO transactions (user_id, stock_id, type, quantity, price, total)
         VALUES ($1, $2, 'SELL', $3, $4, $5)`,
      [userId, stockId, quantity, current_price, total]
    );

    await client.query('COMMIT');
    res.json({ message: 'Sale successful', total, balance: newBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/portfolio/:userId/history
router.get('/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Obter saldo e data de criação da conta
    const userRes = await pool.query(
      'SELECT balance, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const balance  = parseFloat(userRes.rows[0].balance);
    const createdAt = userRes.rows[0].created_at;

    // 2. Calcular valor das posições (preços atualizados pelo job de sincronização)
    const holdingsRes = await pool.query(
      `SELECT COALESCE(SUM(p.quantity * s.current_price), 0) AS stock_value
         FROM portfolio p
         JOIN stocks s ON p.stock_id = s.id
        WHERE p.user_id = $1 AND p.quantity > 0`,
      [userId]
    );
    const stockValue = parseFloat(holdingsRes.rows[0].stock_value);

    const currentNetWorth = balance + stockValue;

    // 3. Upsert do snapshot de hoje (um por dia, atualizado ao longo do dia)
    const todayCheck = await pool.query(
      `SELECT id FROM portfolio_history
        WHERE user_id = $1 AND recorded_at::date = CURRENT_DATE`,
      [userId]
    );
    if (todayCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO portfolio_history (user_id, total_value) VALUES ($1, $2)',
        [userId, currentNetWorth]
      );
    } else {
      await pool.query(
        `UPDATE portfolio_history SET total_value = $1
          WHERE user_id = $2 AND recorded_at::date = CURRENT_DATE`,
        [currentNetWorth, userId]
      );
    }

    // 4. Obter histórico completo por ordem cronológica
    const { rows } = await pool.query(
      `SELECT total_value, recorded_at
         FROM portfolio_history
        WHERE user_id = $1
        ORDER BY recorded_at ASC`,
      [userId]
    );

    // 5. Se só existe um snapshot, adicionar o ponto inicial de $10.000
    if (rows.length === 1) {
      rows.unshift({ total_value: '10000.00', recorded_at: createdAt });
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch portfolio history' });
  }
});

export default router;
