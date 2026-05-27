import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { buyStock, fetchQuotes } from '../api';
import Globe from 'react-globe.gl';

const INITIAL_MARKERS = [
  { lat: 39.8283, lng: -98.5795, name: 'USA', exchange: 'NYSE / NASDAQ', color: '#f97316', topStocks: [
    { ticker: 'AAPL', name: 'Apple Inc.', price: 192.50, change: 1.2 },
    { ticker: 'MSFT', name: 'Microsoft Corp.', price: 415.00, change: 0.8 },
    { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 875.00, change: 2.5 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 185.70, change: -0.4 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 175.30, change: 0.1 }
  ]},
  { lat: 51.5074, lng: -0.1278, name: 'UK', exchange: 'London Stock Exchange (LSE)', color: '#ea580c', topStocks: [
    { ticker: 'SHEL.L', name: 'Shell plc', price: 2850.00, change: 0.5 },
    { ticker: 'AZN.L', name: 'AstraZeneca', price: 10400.00, change: 1.1 },
    { ticker: 'HSBA.L', name: 'HSBC Holdings', price: 620.00, change: -0.2 },
    { ticker: 'ULVR.L', name: 'Unilever', price: 3900.00, change: 0.4 },
    { ticker: 'BP.L', name: 'BP plc', price: 480.00, change: 0.7 }
  ]},
  { lat: 51.1657, lng: 10.4515, name: 'Germany', exchange: 'Frankfurt (XETRA)', color: '#fb923c', topStocks: [
    { ticker: 'SAP.DE', name: 'SAP SE', price: 175.00, change: 1.5 },
    { ticker: 'SIE.DE', name: 'Siemens AG', price: 165.00, change: 0.9 },
    { ticker: 'ALV.DE', name: 'Allianz SE', price: 260.00, change: -0.1 },
    { ticker: 'AIR.DE', name: 'Airbus SE', price: 155.00, change: 2.1 },
    { ticker: 'DTE.DE', name: 'Deutsche Telekom', price: 22.50, change: 0.3 }
  ]},
  { lat: 36.2048, lng: 138.2529, name: 'Japan', exchange: 'Tokyo Stock Exchange (TSE)', color: '#c2410c', topStocks: [
    { ticker: '7203.T', name: 'Toyota Motor', price: 3500.00, change: 1.8 },
    { ticker: '6758.T', name: 'Sony Group', price: 13500.00, change: -0.5 },
    { ticker: '8306.T', name: 'Mitsubishi UFJ', price: 1550.00, change: 2.3 },
    { ticker: '6861.T', name: 'Keyence', price: 68000.00, change: 0.4 },
    { ticker: '9984.T', name: 'SoftBank Group', price: 8800.00, change: 1.2 }
  ]},
  { lat: 23.6978, lng: 120.9605, name: 'Taiwan', exchange: 'Taiwan Stock Exchange (TWSE)', color: '#fdba74', topStocks: [
    { ticker: '2330.TW', name: 'TSMC', price: 850.00, change: 2.8 },
    { ticker: '2454.TW', name: 'MediaTek', price: 1150.00, change: 1.4 },
    { ticker: '2317.TW', name: 'Hon Hai (Foxconn)', price: 155.00, change: 0.5 },
    { ticker: '2308.TW', name: 'Delta Electronics', price: 340.00, change: -0.3 },
    { ticker: '2382.TW', name: 'Quanta Computer', price: 280.00, change: 3.1 }
  ]},
  { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia', exchange: 'Tadawul', color: '#9a3412', topStocks: [
    { ticker: '2222.SR', name: 'Saudi Aramco', price: 30.50, change: 0.2 },
    { ticker: '1120.SR', name: 'Al Rajhi Bank', price: 85.00, change: 1.1 },
    { ticker: '1180.SR', name: 'SNB', price: 38.00, change: 0.4 },
    { ticker: '2010.SR', name: 'SABIC', price: 78.00, change: -0.6 },
    { ticker: '7010.SR', name: 'STC', price: 40.50, change: 0.1 }
  ]},
  { lat: 40.4637, lng: -3.7492, name: 'Iberia', exchange: 'Euronext / BME', color: '#f59e0b', topStocks: [
    { ticker: 'IBE.MC', name: 'Iberdrola', price: 11.50, change: 0.8 },
    { ticker: 'EDP.LS', name: 'EDP', price: 3.80, change: 1.2 },
    { ticker: 'ITX.MC', name: 'Inditex', price: 45.20, change: -0.5 },
    { ticker: 'SAN.MC', name: 'Banco Santander', price: 4.50, change: 2.1 },
    { ticker: 'GALP.LS', name: 'Galp Energia', price: 16.20, change: 0.4 }
  ]}
];

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [markets, setMarkets]               = useState(INITIAL_MARKERS);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [buyQty, setBuyQty]                 = useState(1);
  const [buyStatus, setBuyStatus]           = useState(null);
  const [buyLoading, setBuyLoading]         = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [tooltipPos, setTooltipPos]         = useState({ x: 0, y: 0 });
  const [badgePositions, setBadgePositions] = useState({});
  const globeRef   = useRef();
  const wrapperRef = useRef();

  const handleMouseMove = (e) => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const flagMap = { USA: '🇺🇸', UK: '🇬🇧', Germany: '🇩🇪', Japan: '🇯🇵', Taiwan: '🇹🇼', 'Saudi Arabia': '🇸🇦', Iberia: '🇵🇹🇪🇸' };

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate      = true;
      globeRef.current.controls().autoRotateSpeed = 0.4;
    }
  }, []);

  // Acompanhar as posições no ecrã de cada badge de mercado via rAF
  useEffect(() => {
    let rafId;
    const update = () => {
      if (globeRef.current) {
        const newPos = {};
        markets.forEach(m => {
          const coords = globeRef.current.getScreenCoords(m.lat, m.lng, 0.015);
          if (coords) newPos[m.name] = { x: coords.x, y: coords.y };
        });
        setBadgePositions(newPos);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [markets]);

  const handleMarkerClick = (marker) => {
    const liveMarket = markets.find(m => m.name === marker.name) || marker;
    setSelectedCountry(liveMarket);
    setHoveredCountry(null);
    setBuyStatus(null);
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ lat: marker.lat, lng: marker.lng, altitude: 1.5 }, 1000);
    }
  };

  const handleLabelHover = (obj) => {
    setHoveredCountry(obj ? (markets.find(m => m.name === obj.name) || obj) : null);
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const allTickers = INITIAL_MARKERS.flatMap(m => m.topStocks.map(s => s.ticker));
      const quotes     = await fetchQuotes(allTickers);
      const quoteMap   = {};
      quotes.forEach(q => { if (q?.price) quoteMap[q.ticker] = q; });

      setMarkets(prevMarkets => {
        const newMarkets = prevMarkets.map(m => ({
          ...m,
          topStocks: m.topStocks.map(s => {
            const q = quoteMap[s.ticker];
            return q
              ? { ...s, price: q.price, change: q.changePercent != null ? parseFloat(q.changePercent).toFixed(2) : s.change }
              : s;
          }),
        }));
        setSelectedCountry(prev => prev ? newMarkets.find(m => m.name === prev.name) ?? prev : null);
        return newMarkets;
      });
    } catch (err) {
      console.error('Refresh prices error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefreshPrices();
    const interval = setInterval(handleRefreshPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickBuy = async (ticker) => {
    if (!user) return;
    setBuyLoading(true);
    setBuyStatus(null);
    try {
      const res = await buyStock(user.id, ticker, buyQty);
      if (res.balance !== undefined) updateUser({ balance: res.balance });
      setBuyStatus({ type: 'success', message: `Bought ${buyQty} share(s) of ${ticker}! Total: $${parseFloat(res.total).toFixed(2)}` });
    } catch (err) {
      setBuyStatus({ type: 'error', message: err.response?.data?.error || 'Trade failed' });
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-900 to-gray-900"
    >
      {/* ── Globo ──────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#fb923c"
          atmosphereAltitude={0.15}
          // ── Marcadores de anel pulsante ────────────────────────────────────────
          ringsData={markets}
          ringLat={d => d.lat}
          ringLng={d => d.lng}
          ringColor={d => () => hoveredCountry?.name === d.name ? 'rgba(255,255,255,0.9)' : d.color ?? '#f97316'}
          ringMaxRadius={d => hoveredCountry?.name === d.name ? 6 : 4}
          ringPropagationSpeed={d => hoveredCountry?.name === d.name ? 4 : 2}
          ringRepeatPeriod={d => hoveredCountry?.name === d.name ? 600 : 900}
          // ── Labels invisíveis (hitbox para hover/click) ──────────────────
          labelsData={markets}
          labelLat={d => d.lat}
          labelLng={d => d.lng}
          labelText={() => ''}
          labelColor={() => 'rgba(0,0,0,0)'}
          labelDotRadius={0}
          labelSize={3}
          labelResolution={1}
          labelAltitude={0.015}
          onLabelHover={handleLabelHover}
          onLabelClick={handleMarkerClick}
        />
      </div>

      {/* ── Badges em bolha de vidro (posicionados via getScreenCoords) ─ */}
      {markets.map(m => {
        const pos = badgePositions[m.name];
        if (!pos) return null;
        const isHovered = hoveredCountry?.name === m.name;
        return (
          <div
            key={m.name}
            className="pointer-events-auto cursor-pointer absolute z-10"
            style={{
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
            }}
            onMouseEnter={() => handleLabelHover(m)}
            onMouseLeave={() => handleLabelHover(null)}
            onClick={(e) => {
              e.stopPropagation(); // Evitar interferência do arrasto do mapa
              handleMarkerClick(m);
            }}
          >
            <div
              style={{ fontFamily: "'Poppins', sans-serif" }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md
                border whitespace-nowrap transition-all duration-200
                ${isHovered
                  ? 'bg-gradient-to-r from-orange-500/95 to-orange-600/95 border-white/50 shadow-[0_0_20px_rgba(249,115,22,0.7),0_0_40px_rgba(249,115,22,0.3)] scale-110'
                  : 'bg-gradient-to-r from-gray-900/85 to-gray-800/85 border-orange-500/40 shadow-lg shadow-black/50 scale-100'
                }
              `}
            >
              <span className={`leading-none ${isHovered ? 'text-base' : 'text-sm'}`}>{flagMap[m.name]}</span>
              <span className={`font-bold tracking-wide ${isHovered ? 'text-[13px] text-white' : 'text-[11px] text-amber-300/90'}`}>
                {m.name}
              </span>
              <span className={`
                inline-block rounded-full
                ${isHovered ? 'w-2 h-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]' : 'w-1.5 h-1.5 bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.9)]'}
              `} />
            </div>
          </div>
        );
      })}

      {/* ── Cartão ao passar o rato ─────────────────────────────────────────────────────── */}
      {hoveredCountry && !selectedCountry && (
        <div
          className="pointer-events-none absolute z-30"
          style={{ left: tooltipPos.x + 18, top: tooltipPos.y - 12, transition: 'left 0.05s, top 0.05s' }}
        >
          <div style={{ fontFamily: "'Poppins', sans-serif" }}
            className="bg-gray-900/95 backdrop-blur-xl border border-orange-500/30 text-white rounded-2xl shadow-2xl shadow-orange-500/20 px-5 py-4 min-w-[220px]"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{flagMap[hoveredCountry.name]}</span>
              <div>
                <p className="font-bold text-lg text-white leading-tight">{hoveredCountry.name}</p>
                <p className="text-xs text-orange-400 font-medium">{hoveredCountry.exchange}</p>
              </div>
            </div>
            <div className="border-t border-gray-700/60 pt-2.5 space-y-1.5">
              {hoveredCountry.topStocks.slice(0, 3).map(s => (
                <div key={s.ticker} className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-300 font-mono">{s.ticker}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">${parseFloat(s.price).toFixed(2)}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${parseFloat(s.change) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {parseFloat(s.change) >= 0 ? '+' : ''}{s.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-2.5 text-center uppercase tracking-wider">Click to trade</p>
          </div>
        </div>
      )}

      {/* ── Título sobreposto ──────────────────────────────────────────────────── */}
      <div className="absolute top-8 left-8 pointer-events-none z-10 animate-slide-right">
        <h1 style={{ fontFamily: "'Poppins', sans-serif" }} className="text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
          {t.dash_title.split(' ')[0]}&nbsp;<span className="text-gradient">{t.dash_title.split(' ').slice(1).join(' ')}</span>
        </h1>
        <p className="text-gray-400 mt-2 font-medium text-lg mb-4">{t.dash_subtitle}</p>
        <button
          onClick={handleRefreshPrices}
          disabled={refreshing}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-sm text-sm font-bold text-white hover:bg-white/20 hover:border-orange-400/50 transition-all active:scale-95"
        >
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-400' : 'text-orange-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? t.dash_updating : t.dash_refresh}
        </button>
      </div>

      {/* ── Painel do país ──────────────────────────────────────────────────── */}
      {selectedCountry && (
        <div className="absolute top-6 right-6 w-[420px] bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-orange-500/10 border border-gray-700/60 p-6 z-20 animate-slide-up max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 style={{ fontFamily: "'Poppins', sans-serif" }} className="text-2xl font-bold text-white">{selectedCountry.name}</h2>
              <p className="text-sm font-medium text-orange-400 mt-0.5">{selectedCountry.exchange}</p>
            </div>
            <button
              onClick={() => { setSelectedCountry(null); if (globeRef.current) globeRef.current.controls().autoRotate = true; }}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {buyStatus && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-medium animate-fade-in ${buyStatus.type === 'success' ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-red-900/40 text-red-300 border border-red-700/50'}`}>
              {buyStatus.message}
            </div>
          )}

          {/* Compra rápida */}
          <div className="mb-5 p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">{t.dash_quickbuy}</p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400 font-medium">{t.dash_shares}</label>
              <input
                type="number"
                min="1"
                value={buyQty}
                onChange={e => setBuyQty(Number(e.target.value))}
                className="w-20 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <span className="text-xs text-gray-500 ml-auto">{t.dash_clicktobuy}</span>
            </div>
          </div>

          {/* Lista de ações */}
          <div className="space-y-2">
            {selectedCountry.topStocks.map(stock => (
              <div
                key={stock.ticker}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-800/60 hover:bg-orange-500/10 border border-gray-700/50 hover:border-orange-500/40 transition-all duration-200 group cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/10"
                onClick={() => handleQuickBuy(stock.ticker)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Poppins', sans-serif" }} className="font-bold text-white">{stock.ticker}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${parseFloat(stock.change) >= 0 ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>
                      {parseFloat(stock.change) >= 0 ? '+' : ''}{stock.change}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 truncate block">{stock.name}</span>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="font-bold text-gray-200">${parseFloat(stock.price).toFixed(2)}</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-orange-500/30">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="w-full mt-5 btn-primary"
            disabled={buyLoading}
            onClick={() => window.location.href = '/trade'}
          >
            {t.dash_opentrade}
          </button>
        </div>
      )}
    </div>
  );
}
