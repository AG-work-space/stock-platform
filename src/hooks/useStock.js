import { useState, useCallback, useRef } from 'react'
import { fetchStockData, calcStats, DEFAULT_RANGE } from '../utils/stockApi.js'

export function useStock() {
  const [symbol,      setSymbol]      = useState('AAPL')
  const [rangeKey,    setRangeKey]    = useState(DEFAULT_RANGE)
  const [points,      setPoints]      = useState([])
  const [meta,        setMeta]        = useState(null)
  const [stats,       setStats]       = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const load = useCallback(async (sym, range) => {
    setLoading(true)
    setError(null)
    try {
      const { meta, points, rangeKey: rk } = await fetchStockData(sym, range)
      setMeta(meta)
      setPoints(points)
      setStats(calcStats(points, meta))
      setLastUpdated(new Date())
      if (range) setRangeKey(range)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const startAutoRefresh = useCallback((sym, range, ms = 60000) => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => load(sym, range), ms)
    return () => clearInterval(intervalRef.current)
  }, [load])

  const stopAutoRefresh = useCallback(() => {
    clearInterval(intervalRef.current)
  }, [])

  return {
    symbol, setSymbol,
    rangeKey, setRangeKey,
    points, meta, stats,
    loading, error, lastUpdated,
    load,
    startAutoRefresh,
    stopAutoRefresh,
  }
}
