import React, { useState } from 'react'
import styles from './SearchBar.module.css'

const QUICK = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX']

export default function SearchBar({ symbol, setSymbol, loading, error, lastUpdated, onLoad, autoRefresh, toggleAutoRefresh }) {
  const [input, setInput] = useState(symbol)

  const submit = () => {
    const val = input.trim().toUpperCase()
    if (!val) return
    setSymbol(val)
    onLoad(val)
  }

  const pickQuick = (sym) => {
    setInput(sym)
    setSymbol(sym)
    onLoad(sym)
  }

  return (
    <div className={styles.wrap}>
      <input
        value={input}
        onChange={e => setInput(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Ticker symbol…"
      />
      <button className={styles.loadBtn} onClick={submit} disabled={loading}>
        {loading ? 'Loading…' : 'Load Stock'}
      </button>

      {QUICK.map(sym => (
        <button key={sym} className={styles.chip} onClick={() => pickQuick(sym)}>
          {sym}
        </button>
      ))}

      <button
        className={`${styles.autoBtn} ${autoRefresh ? styles.autoBtnActive : ''}`}
        onClick={toggleAutoRefresh}
      >
        {autoRefresh ? '⏹ Stop Auto-refresh' : '▶ Auto-refresh (60s)'}
      </button>

      {error && <span className={styles.error}>⚠ {error}</span>}
      {lastUpdated && !error && (
        <span className={styles.updatedAt}>Updated {lastUpdated.toLocaleTimeString()}</span>
      )}
    </div>
  )
}
