import React from 'react'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.dot} />
        StockAI
      </div>
      <div className={styles.tag}>
        <span>RSI · MACD · Bollinger · EMA</span>
        <span className={styles.freeBadge}>100% Free</span>
      </div>
    </header>
  )
}
