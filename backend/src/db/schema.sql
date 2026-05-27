-- Esquema da Base de Dados do Simulador de Mercado de Ações
-- Executar este script uma vez contra a base de dados PostgreSQL para criar todas as tabelas.

-- ── Utilizadores ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT,                              -- nullable para utilizadores OAuth
  google_id     TEXT         UNIQUE,               -- ID do Google OAuth
  github_id     TEXT         UNIQUE,               -- ID do GitHub OAuth
  balance       NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,  -- saldo inicial
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Ações ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id            SERIAL PRIMARY KEY,
  ticker        VARCHAR(10)  UNIQUE NOT NULL,
  company_name  VARCHAR(200) NOT NULL,
  current_price NUMERIC(12, 4) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Histórico de Preços ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
  id         SERIAL PRIMARY KEY,
  stock_id   INT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  price      NUMERIC(12, 4) NOT NULL,
  recorded_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Portefólio (posições) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio (
  id         SERIAL PRIMARY KEY,
  user_id    INT    NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  stock_id   INT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  quantity   INT    NOT NULL DEFAULT 0,
  UNIQUE (user_id, stock_id)
);

-- ── Transações ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INT    NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  stock_id    INT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  type        VARCHAR(4) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  quantity    INT    NOT NULL,
  price       NUMERIC(12, 4) NOT NULL,  -- preço por ação no momento da transação
  total       NUMERIC(15, 4) NOT NULL,  -- quantidade * preço
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Histórico do Portefólio ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_history (
  id          SERIAL PRIMARY KEY,
  user_id     INT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_value NUMERIC(15, 2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Amigos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friends (
  id          SERIAL PRIMARY KEY,
  user_id_1   INT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2   INT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id_1, user_id_2)
);

-- ── Dados iniciais: ações de exemplo ─────────────────────────────────────────
INSERT INTO stocks (ticker, company_name, current_price) VALUES
  ('AAPL',  'Apple Inc.',             192.50),
  ('GOOGL', 'Alphabet Inc.',          175.30),
  ('MSFT',  'Microsoft Corporation',  415.00),
  ('AMZN',  'Amazon.com Inc.',        185.70),
  ('TSLA',  'Tesla Inc.',             245.00),
  ('NVDA',  'NVIDIA Corporation',     875.00),
  ('META',  'Meta Platforms Inc.',    520.00),
  ('BRK',   'Berkshire Hathaway',     420.00)
ON CONFLICT (ticker) DO NOTHING;
