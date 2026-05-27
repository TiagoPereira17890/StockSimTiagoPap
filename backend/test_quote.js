async function test() {
  const res = await fetch('http://localhost:5000/api/stocks/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers: ["NVDA"] })
  });
  console.log(await res.json());
}
test();
