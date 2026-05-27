import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /api/friends/search?q=username
router.get('/search', async (req, res) => {
  try {
    const { q, userId } = req.query;
    if (!q) return res.json([]);
    const { rows } = await pool.query(
      `SELECT id, username FROM users 
       WHERE username ILIKE $1 AND id != $2 
       LIMIT 10`,
      [`%${q}%`, userId || 0]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/friends/request
router.post('/request', async (req, res) => {
  const { userId, targetId } = req.body;
  if (!userId || !targetId) return res.status(400).json({ error: 'Missing ids' });
  
  try {
    // Verificar se já existe pedido ou amizade
    const existing = await pool.query(
      `SELECT * FROM friends WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)`,
      [userId, targetId]
    );
    if (existing.rows.length) return res.status(400).json({ error: 'Request already exists or are already friends' });

    await pool.query(
      `INSERT INTO friends (user_id_1, user_id_2, status) VALUES ($1, $2, 'PENDING')`,
      [userId, targetId]
    );
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// PUT /api/friends/accept
router.put('/accept', async (req, res) => {
  const { userId, requesterId } = req.body; // user_id_2 aceita o pedido de user_id_1
  
  try {
    await pool.query(
      `UPDATE friends SET status = 'ACCEPTED' WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = 'PENDING'`,
      [requesterId, userId]
    );
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// GET /api/friends/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // Amigos aceites
    const { rows: friends } = await pool.query(
      `SELECT u.id, u.username, u.balance
       FROM users u
       JOIN friends f ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
         AND u.id != $1
         AND f.status = 'ACCEPTED'`,
      [userId]
    );

    // Pedidos pendentes (recebidos)
    const { rows: pending } = await pool.query(
      `SELECT u.id, u.username
       FROM users u
       JOIN friends f ON u.id = f.user_id_1
       WHERE f.user_id_2 = $1 AND f.status = 'PENDING'`,
      [userId]
    );

    res.json({ friends, pending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

export default router;
