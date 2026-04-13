import React, { useState, useEffect } from 'react'
import { fetchNews } from '../utils/stockApi.js'
import styles from './NewsFeed.module.css'

export default function NewsFeed({ symbol }) {
  const [news,    setNews]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchNews(symbol).then(items => {
      if (cancelled) return
      if (items.length === 0) setError('No news available for ' + symbol)
      else setNews(items)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [symbol])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>News — {symbol}</div>
      {loading && <div className={styles.state}>Loading…</div>}
      {error   && <div className={styles.state}>{error}</div>}
      {!loading && !error && news.length === 0 && (
        <div className={styles.state}>No news found</div>
      )}
      <div className={styles.list}>
        {news.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className={styles.item}>
            <div className={styles.title}>{item.title}</div>
            <div className={styles.meta}>
              <span className={styles.publisher}>{item.publisher}</span>
              {item.time && <span className={styles.time}>{item.time}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
