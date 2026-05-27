import React, { useEffect, useState } from 'react';
import { fetchStocks, buyStock, sellStock } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MarketPage() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStocks()
      .then(setStocks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTrade = async (ticker, type) => {
    const quantity = parseInt(qty[ticker] || 1);
    if (quantity <= 0) return;
    try {
      const fn = type === 'buy' ? buyStock : sellStock;
      const res = await fn(user.id, ticker, quantity);
      setMessage(`✅ ${type === 'buy' ? 'Bought' : 'Sold'} ${quantity} × ${ticker} — Total: $${parseFloat(res.total).toFixed(2)}`);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || 'Trade failed'}`);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Market</h1>
        <p className="subtitle">Buy and sell stocks at live simulator prices.</p>
      </div>

      {message && (
        <div className="alert" onClick={() => setMessage('')}>{message}</div>
      )}

      {loading ? (
        <div className="loader">Loading…</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr key={s.ticker}>
                  <td><span className="ticker-badge">{s.ticker}</span></td>
                  <td>{s.company_name}</td>
                  <td className="green">${parseFloat(s.current_price).toFixed(2)}</td>
                  <td>
                    <input
                      id={`qty-${s.ticker}`}
                      type="number"
                      min="1"
                      className="qty-input"
                      value={qty[s.ticker] || 1}
                      onChange={e => setQty(q => ({ ...q, [s.ticker]: e.target.value }))}
                    />
                  </td>
                  <td className="actions">
                    <button
                      id={`buy-${s.ticker}`}
                      className="btn btn-buy"
                      onClick={() => handleTrade(s.ticker, 'buy')}
                    >Buy</button>
                    <button
                      id={`sell-${s.ticker}`}
                      className="btn btn-sell"
                      onClick={() => handleTrade(s.ticker, 'sell')}
                    >Sell</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
