'use client';
import { useEffect, useState } from 'react';

const card = { background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 16 };

function scorePair(p) {
  let s = 100; const flags = [];
  const liq = p.liquidity?.usd || 0;
  if (liq < 10000) { s -= 40; flags.push('liq thin'); }
  else if (liq < 50000) { s -= 20; }
  const buys = p.txns?.h24?.buys || 0, sells = p.txns?.h24?.sells || 0;
  const r = sells > 0 ? buys / sells : buys;
  if (r < 0.7) s -= 25; else if (r < 1) s -= 10;
  if ((p.priceChange?.h24 || 0) > 300) s -= 15;
  return { s: Math.max(0, s), flags, buys, sells, liq, r };
}

export default function Page() {
  const [pairs, setPairs] = useState([]);
  const [filter, setFilter] = useState('solana');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [ca, setCa] = useState('');
  const [verdict, setVerdict] = useState(null);

  async function loadEarly() {
    setLoading(true);
    try {
      // latest profiles = early discovery, boosts = what people pay to promote
      const [a, b] = await Promise.all([
        fetch('https://api.dexscreener.com/token-profiles/latest/v1').then(r => r.json()),
        fetch('https://api.dexscreener.com/token-boosts/top/v1').then(r => r.json()),
      ]);
      const boostSet = new Set((Array.isArray(b) ? b : []).slice(0, 50).map(t => t.tokenAddress));
      const list = (Array.isArray(a) ? a : []).slice(0, 40);
      // enrich each with pair data (limit to 12 to avoid rate limit)
      const out = [];
      for (const t of list.slice(0, 12)) {
        try {
          const d = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`).then(r => r.json());
          const p = (d.pairs || []).sort((x, y) => (y.liquidity?.usd || 0) - (x.liquidity?.usd || 0))[0];
          if (p) out.push({ profile: t, pair: p, boosted: boostSet.has(t.tokenAddress), ...scorePair(p) });
        } catch {}
      }
      setPairs(out);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadEarly(); }, []);

  async function quickCheck() {
    if (!ca.trim()) return;
    const d = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca.trim()}`).then(r => r.json());
    const p = (d.pairs || []).sort((x, y) => (y.liquidity?.usd || 0) - (x.liquidity?.usd || 0))[0];
    if (!p) { setVerdict({ err: 'not found' }); return; }
    setVerdict({ p, ...scorePair(p) });
  }

  const shown = pairs.filter(x => {
    if (filter !== 'all' && x.pair.chainId !== filter) return false;
    if (query && !JSON.stringify(x).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <p style={{ fontSize: 12, letterSpacing: 2, color: '#a3e635', fontFamily: 'monospace' }}>BUILD IN PUBLIC • EARLY RADAR</p>
      <h1 style={{ fontSize: 42, margin: '8px 0' }}>Find it early, check it fast.</h1>
      <p style={{ color: '#a1a1aa' }}>Early token radar (latest profiles) + 10s safety check. Solana-first. No signup. Not financial advice.</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        <input value={ca} onChange={e => setCa(e.target.value)} placeholder="paste CA to quick-check…" style={{ flex: 1, minWidth: 280, background: '#09090b', border: '1px solid #3f3f46', borderRadius: 12, padding: '10px 14px', color: '#fff', fontFamily: 'monospace' }} />
        <button onClick={quickCheck} style={{ background: '#a3e635', color: '#000', fontWeight: 800, borderRadius: 12, padding: '10px 18px', border: 0, cursor: 'pointer' }}>Quick Check</button>
        <button onClick={loadEarly} style={{ background: '#27272a', color: '#fff', borderRadius: 12, padding: '10px 18px', border: 0, cursor: 'pointer' }}>↻ Refresh early</button>
      </div>

      {verdict && !verdict.err && (
        <div style={{ ...card, marginTop: 16, borderColor: '#a3e635' }}>
          <b>{verdict.p.baseToken?.name} (${verdict.p.baseToken?.symbol})</b>{' '}
          <span style={{ fontFamily: 'monospace', color: '#a1a1aa' }}>${Number(verdict.p.priceUsd).toPrecision(4)} • score {verdict.s}</span>
          <div style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 6 }}>LIQ ${Math.round(verdict.liq).toLocaleString()} • B/S {verdict.buys}/{verdict.sells} • 24h {verdict.p.priceChange?.h24}%</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '28px 0 12px' }}>
        {['solana', 'base', 'bsc', 'ethereum', 'all'].map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ background: filter === c ? '#a3e635' : '#27272a', color: filter === c ? '#000' : '#fff', border: 0, borderRadius: 999, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }}>{c}</button>
        ))}
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="filter…" style={{ marginLeft: 'auto', background: '#09090b', border: '1px solid #3f3f46', borderRadius: 999, padding: '6px 14px', color: '#fff' }} />
      </div>

      {loading ? <p style={{ color: '#71717a' }}>scanning early pairs…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
          {shown.map((x, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {x.pair.info?.imageUrl && <img src={x.pair.info.imageUrl} style={{ width: 40, height: 40, borderRadius: 999 }} />}
                <div><b>${x.pair.baseToken?.symbol}</b><div style={{ fontSize: 12, color: '#a1a1aa', fontFamily: 'monospace' }}>{x.pair.chainId} • {x.pair.dexId}</div></div>
                <div style={{ marginLeft: 'auto', background: x.s >= 75 ? '#a3e635' : x.s >= 50 ? '#facc15' : '#ef4444', color: '#000', fontWeight: 800, borderRadius: 999, padding: '4px 10px' }}>{x.s}</div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 10 }}>LIQ ${Math.round(x.liq).toLocaleString()} • B/S {x.buys}/{x.sells} ({x.r.toFixed(2)})</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#a1a1aa' }}>24h {x.pair.priceChange?.h24}% • vol ${Math.round(x.pair.volume?.h24 || 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#d4d4d8', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>{x.pair.baseToken?.address}</div>
              {x.boosted && <div style={{ fontSize: 11, color: '#a3e635', marginTop: 4 }}>▲ boosted (people pay to promote — extra caution)</div>}
              <a href={x.pair.url} target="_blank" style={{ color: '#a3e635', fontSize: 13 }}>open chart →</a>
            </div>
          ))}
        </div>
      )}
      <p style={{ color: '#52525b', fontSize: 12, marginTop: 32 }}>Single-file logic, Next.js build, deploy via GitHub Actions. Data: DexScreener. DYOR.</p>
    </div>
  );
}
