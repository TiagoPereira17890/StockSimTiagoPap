import express from 'express';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, ticker } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let context = '';

    // Se o utilizador está a ver um ticker específico, obter dados em tempo real para contexto
    if (ticker) {
      try {
        const quote = await yahooFinance.quote(ticker);
        const news = await yahooFinance.search(ticker, { newsCount: 3 });
        
        let newsHeadlines = news.news ? news.news.map(n => `- ${n.title}`).join('\n') : 'No recent news.';

        context = `
---
CURRENT MARKET CONTEXT FOR SELECTED STOCK:
Ticker: ${quote.symbol}
Company: ${quote.shortName || quote.longName}
Current Price: ${quote.regularMarketPrice} ${quote.currency}
Market Change today: ${quote.regularMarketChangePercent}%
Recent News Headlines:
${newsHeadlines}
---
`;
      } catch (err) {
        console.error(`Failed to fetch context for ticker ${ticker}:`, err.message);
        // Continuar sem contexto se falhar
      }
    }

    const systemPrompt = `You are an expert AI financial advisor integrated into a stock market simulator app called StockSim.
Your job is to answer the user's questions concisely, accurately, and professionally.

CRITICAL RULES:
1. You MUST ALWAYS reply in European Portuguese (Português de Portugal). DO NOT use Brazilian Portuguese terms or colloquialisms. For example, use "ações" and avoid Brazilian specific stock market contexts unless specifically asked.
2. The user's simulator ONLY supports the following stocks. DO NOT recommend or discuss stocks outside this list:
   - USA: Apple (AAPL), Microsoft (MSFT), NVIDIA (NVDA), Amazon (AMZN), Alphabet (GOOGL)
   - Iberia (Portugal/Spain): Inditex (ITX.MC), Santander (SAN.MC), Iberdrola (IBE.MC), EDP (EDP.LS), Jerónimo Martins (JMT.LS), Galp (GALP.LS)
   - UK/Germany: Shell, AstraZeneca, HSBC, Unilever, BP, SAP, Siemens, Allianz, Airbus, Deutsche Telekom
   - Asia/Middle East: Toyota, Sony, TSMC, Foxconn, Saudi Aramco, etc.
3. If the user asks for recommendations, ONLY recommend from the allowed list above.

${context}

Keep your answers brief (1-3 short paragraphs maximum) since this is a quick chat interface.`;

    // Ligar à instância local do Ollama (llama3)
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:1b',
        prompt: `${systemPrompt}\n\nUser: ${message}\nAI:`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    res.json({ reply: data.response });
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Mensagem amigável se o Ollama não estiver a correr
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
      return res.status(503).json({ 
        error: 'A IA local (Ollama) não está a correr. Certifique-se de que iniciou o Ollama com o modelo llama3.2:1b no seu PC.' 
      });
    }

    res.status(500).json({ error: 'Failed to communicate with AI' });
  }
});

export default router;
