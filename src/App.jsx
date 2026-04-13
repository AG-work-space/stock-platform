import React, { useEffect, useCallback, useRef, useState } from 'react'
import Header          from './components/Header.jsx'
import SearchBar       from './components/SearchBar.jsx'
import TimeRangeBar    from './components/TimeRangeBar.jsx'
import MetricCards     from './components/MetricCards.jsx'
import PriceChart      from './components/PriceChart.jsx'
import PredictionPanel from './components/PredictionPanel.jsx'
import TutorPanel      from './components/TutorPanel.jsx'
import Watchlist       from './components/Watchlist.jsx'
import NewsFeed        from './components/NewsFeed.jsx'
import Portfolio       from './components/Portfolio.jsx'
import { useStock }    from './hooks/useStock.js'
import styles          from './App.module.css'

export default function App() {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [signalResult, setSignalResult] = useState(null)   // lifted from PredictionPanel
  const intervalRef = useRef(null)

  const { symbol, setSymbol, rangeKey, setRangeKey, points, meta, stats, loading, error, lastUpdated, load } = useStock()

  const handleLoad = useCallback((sym) => load(sym, rangeKey), [load, rangeKey])
  const handleRangeChange = useCallback((r) => { setRangeKey(r); load(symbol, r) }, [load, symbol, setRangeKey])

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => {
      if (prev) { clearInterval(intervalRef.current); return false }
      intervalRef.current = setInterval(() => load(symbol, rangeKey), 60000)
      return true
    })
  }, [load, symbol, rangeKey])

  useEffect(() => { load('AAPL', '1D'); return () => clearInterval(intervalRef.current) }, [])

  return (
    <div className={styles.layout}>
      <Header />
      <SearchBar symbol={symbol} setSymbol={setSymbol} loading={loading} error={error}
        lastUpdated={lastUpdated} onLoad={handleLoad}
        autoRefresh={autoRefresh} toggleAutoRefresh={toggleAutoRefresh} />
      <TimeRangeBar rangeKey={rangeKey} onChange={handleRangeChange} loading={loading} />

      <div className={styles.contentGrid}>
        {/* ── Left main column ── */}
        <div className={styles.mainCol}>
          <MetricCards stats={stats} meta={meta} symbol={symbol} />
          <div className={styles.divider} />
          <PriceChart points={points} isUp={stats?.isUp ?? true} rangeKey={rangeKey} />
          <div className={styles.divider} />
          <PredictionPanel points={points} onResult={setSignalResult} />
          <div className={styles.divider} />
          <TutorPanel result={signalResult} points={points} stats={stats} />
        </div>

        {/* ── Right sidebar ── */}
        <div className={styles.sideCol}>
          <Watchlist currentSymbol={symbol} onSelect={sym => { setSymbol(sym); load(sym, rangeKey) }} />
          <NewsFeed symbol={symbol} />
        </div>
      </div>

      <Portfolio />
    </div>
  )
}
