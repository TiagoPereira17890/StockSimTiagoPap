import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

/**
 * Obtém o preço atual de uma ação via Yahoo Finance.
 * @param {string} tickerSymbol - Símbolo da ação (ex: 'AAPL')
 * @returns {Promise<number>} - Preço atual da ação
 */
export async function getCurrentPrice(tickerSymbol) {
  if (!tickerSymbol) throw new Error('Ticker symbol is required.');

  try {
    const quote = await yahooFinance.quote(tickerSymbol.toUpperCase());

    if (!quote || !quote.regularMarketPrice) {
      throw new Error(`Invalid or non-existent ticker symbol: ${tickerSymbol}`);
    }

    return quote.regularMarketPrice;
  } catch (error) {
    console.error(`[YFinance] Error fetching price for ${tickerSymbol}:`, error.message);
    throw error;
  }
}

/**
 * Obtém cotação completa de uma ação.
 * @param {string} tickerSymbol
 * @returns {Promise<Object>} - Objeto com preço, variação, volume, etc.
 */
export async function getQuote(tickerSymbol) {
  if (!tickerSymbol) throw new Error('Ticker symbol is required.');

  try {
    const quote = await yahooFinance.quote(tickerSymbol.toUpperCase());
    return {
      ticker: quote.symbol,
      name: quote.shortName || quote.longName || tickerSymbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      previousClose: quote.regularMarketPreviousClose,
    };
  } catch (error) {
    console.error(`[YFinance] Error fetching quote for ${tickerSymbol}:`, error.message);
    throw error;
  }
}

/**
 * Obtém histórico de preços de uma ação.
 * @param {string} tickerSymbol
 * @param {string} period - '1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'
 * @returns {Promise<Array>} - Array de { date, close, open, high, low, volume }
 */
export async function getHistoricalPrices(tickerSymbol, period = '1mo') {
  if (!tickerSymbol) throw new Error('Ticker symbol is required.');

  // Mapear períodos para opções de consulta
  const periodMap = {
    '1d': { period1: daysAgo(1), interval: '5m' },
    '5d': { period1: daysAgo(5), interval: '15m' },
    '1mo': { period1: daysAgo(30), interval: '1d' },
    '3mo': { period1: daysAgo(90), interval: '1d' },
    '6mo': { period1: daysAgo(180), interval: '1wk' },
    '1y': { period1: daysAgo(365), interval: '1wk' },
    '5y': { period1: daysAgo(1825), interval: '1mo' },
  };

  const opts = periodMap[period] || periodMap['1mo'];

  try {
    const result = await yahooFinance.historical(tickerSymbol.toUpperCase(), {
      period1: opts.period1,
      interval: opts.interval,
    });

    return result.map(d => ({
      date: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
  } catch (error) {
    console.error(`[YFinance] Error fetching history for ${tickerSymbol}:`, error.message);
    throw error;
  }
}

/**
 * Obtém notícias para uma ação ou mercado em geral.
 * @param {string} query - Termo de pesquisa (ticker ou tópico)
 * @param {number} count - Número de artigos a devolver
 * @returns {Promise<Array>}
 */
export async function getNews(query = 'stock market', count = 20) {
  try {
    const results = await yahooFinance.search(query, { newsCount: count });
    return (results.news || []).map(article => ({
      title: article.title,
      publisher: article.publisher,
      link: article.link,
      publishedAt: article.providerPublishTime,
      thumbnail: article.thumbnail?.resolutions?.[0]?.url || null,
      relatedTickers: article.relatedTickers || [],
    }));
  } catch (error) {
    console.error(`[YFinance] Error fetching news for "${query}":`, error.message);
    throw error;
  }
}

// ── Auxiliar ─────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
