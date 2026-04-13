import React from 'react'
import { fmtPrice, fmtVolume, fmtChange } from '../utils/stockApi.js'
import styles from './MetricCards.module.css'

function MetricCard({ label, value, sub }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}

export default function MetricCards({ stats, meta, symbol }) {
  if (!stats) return (
    <div className={styles.grid}>
      <div className={`${styles.card} ${styles.emptyCard}`}>
        Enter a ticker symbol above and click Load Stock to begin.
      </div>
    </div>
  )

  const changeColor = stats.isUp ? 'var(--green)' : 'var(--red)'

  return (
    <div className={styles.grid}>
      {/* Hero price card — dynamic colours still need inline style */}
      <div className={`${styles.card} ${styles.heroCard}`}>
        <div className={styles.stockName}>{meta?.longName || meta?.shortName || symbol}</div>
        <div className={styles.price} style={{ color: changeColor }}>
          {fmtPrice(stats.price)}
        </div>
        <div className={styles.change} style={{ color: changeColor }}>
          {fmtChange(stats.change, stats.changePct)} vs prev close
        </div>
      </div>

      <MetricCard label="Open"       value={fmtPrice(stats.open)} />
      <MetricCard label="Day High"   value={fmtPrice(stats.high)}  sub="today's peak" />
      <MetricCard label="Day Low"    value={fmtPrice(stats.low)}   sub="today's trough" />
      <MetricCard label="Volume"     value={fmtVolume(stats.volume)} />
      <MetricCard label="Prev Close" value={fmtPrice(stats.prevClose)} />
    </div>
  )
}
