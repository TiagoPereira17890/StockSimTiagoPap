import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /api/leaderboard — classificação por valor líquido (saldo + posições)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.balance,
        COALESCE(SUM(p.quantity * s.current_price), 0) AS holdings_value,
        u.balance + COALESCE(SUM(p.quantity * s.current_price), 0) AS net_worth
      FROM users u
      LEFT JOIN portfolio p ON p.user_id = u.id AND p.quantity > 0
      LEFT JOIN stocks s    ON s.id = p.stock_id
      GROUP BY u.id
      ORDER BY net_worth DESC
    `);

    // Calcular retorno % com base no saldo inicial de $10.000
    const ranked = rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      username: r.username,
      balance: parseFloat(r.balance),
      holdingsValue: parseFloat(r.holdings_value),
      netWorth: parseFloat(r.net_worth),
      returnPct: parseFloat((((r.net_worth - 10000) / 10000) * 100).toFixed(2)),
    }));

    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
