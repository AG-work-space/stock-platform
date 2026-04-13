import React from 'react'
import { TIME_RANGES } from '../utils/stockApi.js'
import styles from './TimeRangeBar.module.css'

export default function TimeRangeBar({ rangeKey, onChange, loading }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Range</span>
      {TIME_RANGES.map(r => (
        <button
          key={r.key}
          disabled={loading}
          onClick={() => onChange(r.key)}
          className={`${styles.btn} ${r.key === rangeKey ? styles.btnActive : ''}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
