# StockSim - Simulador de Bolsa (PERN Stack)

Simulador de bolsa de valores feito com a stack PERN (PostgreSQL, Express, React, Node.js).
Cada utilizador começa com $10,000 em dinheiro virtual e pode comprar/vender ações, acompanhar o portfólio e ver o valor total em tempo real.

---

## Estrutura do Projeto

```
PAP/
├── backend/               # API Express + Node.js
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js          # Ligação ao PostgreSQL
│   │   ├── db/
│   │   │   └── schema.sql     # Schema da base de dados + dados iniciais
│   │   ├── routes/
│   │   │   ├── auth.js        # POST /api/auth/register|login
│   │   │   ├── stocks.js      # GET  /api/stocks (lista, detalhe, histórico)
│   │   │   └── portfolio.js   # GET/POST /api/portfolio (posições, compra, venda)
│   │   └── server.js          # Ponto de entrada da app Express
│   ├── .env.example           # Template de variáveis de ambiente
│   └── package.json
│
└── frontend/              # SPA React + Vite
    ├── src/
    │   ├── api/
    │   │   └── index.js       # Cliente Axios (todos os pedidos num só ficheiro)
    │   ├── components/
    │   │   └── Navbar.jsx     # Barra de navegação
    │   ├── context/
    │   │   └── AuthContext.jsx # Estado global de autenticação
    │   ├── pages/
    │   │   ├── Dashboard.jsx  # Página inicial com visão geral do mercado
    │   │   ├── MarketPage.jsx # Interface de compra/venda
    │   │   ├── PortfolioPage.jsx # Posições do utilizador + valor total
    │   │   └── LoginPage.jsx  # Formulário de login e registo
    │   ├── App.jsx            # Router + rotas protegidas
    │   ├── main.jsx           # Ponto de entrada React
    │   └── index.css          # Estilos globais (tema escuro)
    ├── .env.example
    └── package.json
```

---

## Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| Node.js    | >= 18  |
| npm        | >= 9   |
| PostgreSQL | >= 14  |

---

## Como Começar

### 1. Clonar / abrir o projeto

```bash
cd PAP
```

### 2. Configurar a base de dados

1. Abrir o pgAdmin ou `psql` e criar a base de dados:
   ```sql
   CREATE DATABASE stock_simulator;
   ```
2. Correr o ficheiro de schema para criar as tabelas e inserir as ações iniciais:
   ```bash
   psql -U postgres -d stock_simulator -f backend/src/db/schema.sql
   ```

### 3. Configurar variáveis de ambiente do backend

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` com as credenciais do PostgreSQL:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_simulator
DB_USER=postgres
DB_PASSWORD=a_tua_password
```

### 4. Configurar variáveis de ambiente do frontend

```bash
cp frontend/.env.example frontend/.env
```

O valor por defeito `VITE_API_URL=http://localhost:5000/api` funciona para desenvolvimento local.

---

## Correr os Servidores

### Backend (API Express)

```bash
cd backend
npm run dev        # corre com nodemon (reinicia automaticamente ao alterar ficheiros)
# ou
npm start          # modo produção
```

O servidor fica disponível em **http://localhost:5000**

### Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

A aplicação abre em **http://localhost:5173**

---

## Referência da API

| Método | Endpoint                       | Descrição              |
|--------|--------------------------------|------------------------|
| GET    | `/api/health`                  | Health check           |
| POST   | `/api/auth/register`           | Registar utilizador    |
| POST   | `/api/auth/login`              | Login                  |
| GET    | `/api/stocks`                  | Listar todas as ações  |
| GET    | `/api/stocks/:ticker`          | Detalhe de uma ação    |
| GET    | `/api/stocks/:ticker/history`  | Histórico de preços    |
| GET    | `/api/portfolio/:userId`       | Portfólio do utilizador|
| POST   | `/api/portfolio/buy`           | Comprar ações          |
| POST   | `/api/portfolio/sell`           | Vender ações           |

---

## Stack Tecnológica

| Camada     | Tecnologia          |
|------------|---------------------|
| Base de dados | PostgreSQL + `pg` |
| API        | Node.js + Express   |
| Frontend   | React 18 + Vite     |
| Routing    | React Router v6     |
| Cliente HTTP | Axios             |
| Dev server | Nodemon             |

---

## Notas de Desenvolvimento

- As rotas de autenticação usam passwords em texto simples para facilitar o desenvolvimento. Adicionar `bcryptjs` antes de usar em produção.
- O sistema de autenticação guarda o utilizador em localStorage. Substituir por JWT para produção.
- Para preços reais, integrar uma API de dados de mercado (ex: Alpha Vantage, Finnhub) que atualize o `stocks.current_price` periodicamente.
- Para simular o mercado, adicionar um cron job ou intervalo que altere os preços das ações aleatoriamente.
