import React, { useState, useEffect } from 'react'
import styles from './Watchlist.module.css'

const STORAGE_KEY = 'stockai_watchlist'
const DEFAULTS = ['AAPL','TSLA','NVDA','MSFT','GOOGL']

export default function Watchlist({ currentSymbol, onSelect }) {
  const [list,  setList]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULTS } catch { return DEFAULTS }
  })
  const [input, setInput] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }, [list])

  const add = () => {
    const sym = input.trim().toUpperCase()
    if (!sym || list.includes(sym)) return
    setList(prev => [...prev, sym])
    setInput('')
  }

  const remove = (sym) => setList(prev => prev.filter(s => s !== sym))

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>Watchlist</div>
      <div className={styles.addRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add ticker…"
          className={styles.addInput}
        />
        <button onClick={add} className={styles.addBtn}>+</button>
      </div>
      <div className={styles.list}>
        {list.length === 0 && <div className={styles.empty}>No tickers saved yet</div>}
        {list.map(sym => (
          <div
            key={sym}
            className={`${styles.item} ${sym === currentSymbol ? styles.itemActive : ''}`}
            onClick={() => onSelect(sym)}
          >
            <span className={styles.sym}>{sym}</span>
            <button
              className={styles.removeBtn}
              onClick={e => { e.stopPropagation(); remove(sym) }}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
