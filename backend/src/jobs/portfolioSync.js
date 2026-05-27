import pool from '../config/db.js';
import { getQuote } from '../services/stockService.js';

/**
 * Executa a cada 30 minutos:
 * 1. Obtém preços em tempo real para todas as ações em portefólios ativos
 * 2. Atualiza stocks.current_price na BD
 * 3. Recalcula o valor líquido de todos os utilizadores e atualiza o snapshot diário
 */
export async function runPortfolioSync() {
  const startedAt = new Date().toISOString();
  console.log(`[PortfolioSync] ▶ Starting sync at ${startedAt}`);

  try {
    // ── 1. Obter todos os tickers com posições ativas ───────────────────────────
    const tickerRes = await pool.query(`
      SELECT DISTINCT s.id AS stock_id, s.ticker
        FROM portfolio p
        JOIN stocks s ON p.stock_id = s.id
       WHERE p.quantity > 0
    `);
    const tickers = tickerRes.rows;

    if (tickers.length === 0) {
      console.log('[PortfolioSync] No active holdings found. Skipping price refresh.');
    } else {
      // ── 2. Atualizar preços em paralelo ───────────────────────────────────────
      const priceResults = await Promise.allSettled(
        tickers.map(async ({ stock_id, ticker }) => {
          const quote = await getQuote(ticker);
          if (!quote?.price) throw new Error(`No price for ${ticker}`);
          await pool.query(
            'UPDATE stocks SET current_price = $1, updated_at = NOW() WHERE id = $2',
            [quote.price, stock_id]
          );
          return { ticker, price: quote.price };
        })
      );

      const succeeded = priceResults.filter(r => r.status === 'fulfilled').length;
      const failed    = priceResults.filter(r => r.status === 'rejected').length;
      console.log(`[PortfolioSync] Price refresh: ${succeeded} updated, ${failed} failed`);
    }

    // ── 3. Recalcular valor líquido e atualizar snapshot diário ─────────────────
    const usersRes = await pool.query('SELECT id, balance, created_at FROM users');
    const users    = usersRes.rows;

    let snapshotCount = 0;
    await Promise.all(users.map(async (u) => {
      try {
        const holdingRes = await pool.query(`
          SELECT COALESCE(SUM(p.quantity * s.current_price), 0) AS stock_value
            FROM portfolio p
            JOIN stocks s ON p.stock_id = s.id
           WHERE p.user_id = $1 AND p.quantity > 0
        `, [u.id]);

        const stockValue  = parseFloat(holdingRes.rows[0].stock_value);
        const netWorth    = parseFloat(u.balance) + stockValue;

        // Upsert: um registo por utilizador por dia
        await pool.query(`
          INSERT INTO portfolio_history (user_id, total_value)
               VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [u.id, netWorth]);

        // Atualizar sempre o registo de hoje com o valor mais recente
        await pool.query(`
          UPDATE portfolio_history
             SET total_value = $1
           WHERE user_id = $2
             AND recorded_at::date = CURRENT_DATE
        `, [netWorth, u.id]);

        snapshotCount++;
      } catch (err) {
        console.error(`[PortfolioSync] Failed snapshot for user ${u.id}:`, err.message);
      }
    }));

    console.log(`[PortfolioSync] ✅ Done. Snapshots updated for ${snapshotCount}/${users.length} users.`);
  } catch (err) {
    console.error('[PortfolioSync] ❌ Fatal error during sync:', err);
  }
}
