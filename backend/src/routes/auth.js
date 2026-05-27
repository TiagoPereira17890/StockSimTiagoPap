import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // NOTA: em produção, usar bcrypt para hash da password
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, balance, created_at`,
      [username, email, password]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // NOTA: em produção, comparar com bcrypt
    const { rows } = await pool.query(
      'SELECT id, username, email, balance FROM users WHERE email = $1 AND password_hash = $2',
      [email, password]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  try {
    // Validar o token Google via endpoint tokeninfo
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    const payload = await verifyRes.json();
    
    const { sub: googleId, email, name, picture } = payload;

    // Verificar se já existe utilizador com este google_id
    let { rows } = await pool.query(
      'SELECT id, username, email, balance FROM users WHERE google_id = $1',
      [googleId]
    );

    if (rows.length) {
      return res.json({ user: rows[0] });
    }

    // Verificar se já existe utilizador com este email (associar contas)
    ({ rows } = await pool.query(
      'SELECT id, username, email, balance FROM users WHERE email = $1',
      [email]
    ));

    if (rows.length) {
      // Associar google_id à conta existente
      await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, rows[0].id]);
      return res.json({ user: rows[0] });
    }

    // Criar novo utilizador a partir do perfil Google
    const username = name.replace(/\s+/g, '_').toLowerCase() + '_' + googleId.slice(-4);
    ({ rows } = await pool.query(
      `INSERT INTO users (username, email, google_id)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, balance, created_at`,
      [username, email, googleId]
    ));

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Google OAuth error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Account already exists with this email' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/github
router.post('/github', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'GitHub authorization code is required' });
  }

  try {
    // Trocar o código por um access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(401).json({ error: 'GitHub authentication failed: ' + tokenData.error_description });
    }

    const accessToken = tokenData.access_token;

    // Obter perfil do utilizador no GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const githubUser = await userRes.json();

    // Obter email do utilizador (pode ser privado)
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const emails = await emailRes.json();
    const primaryEmail = Array.isArray(emails) 
      ? (emails.find(e => e.primary)?.email || emails[0]?.email) 
      : null;

    const email = primaryEmail || githubUser.email;
    const githubId = String(githubUser.id);

    if (!email) {
      return res.status(400).json({ error: 'Could not retrieve email from GitHub. Please make your email public in GitHub settings.' });
    }

    // Verificar se já existe utilizador com este github_id
    let { rows } = await pool.query(
      'SELECT id, username, email, balance FROM users WHERE github_id = $1',
      [githubId]
    );

    if (rows.length) {
      return res.json({ user: rows[0] });
    }

    // Verificar se já existe utilizador com este email (associar contas)
    ({ rows } = await pool.query(
      'SELECT id, username, email, balance FROM users WHERE email = $1',
      [email]
    ));

    if (rows.length) {
      await pool.query('UPDATE users SET github_id = $1 WHERE id = $2', [githubId, rows[0].id]);
      return res.json({ user: rows[0] });
    }

    // Criar novo utilizador a partir do perfil GitHub
    const username = (githubUser.login || 'github_user') + '_' + githubId.slice(-4);
    ({ rows } = await pool.query(
      `INSERT INTO users (username, email, github_id)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, balance, created_at`,
      [username, email, githubId]
    ));

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Account already exists with this email' });
    }
    res.status(500).json({ error: 'GitHub authentication failed' });
  }
});

export default router;
