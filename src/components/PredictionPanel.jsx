import React, { useState, useEffect } from 'react'
import styles from './PredictionPanel.module.css'

let computeSignals = null
try {
  const mod = await import('../utils/indicators.js')
  computeSignals = mod.computeSignals
} catch { /* indicators.js not added yet */ }

const ACTION_STYLE = {
  BUY:  { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.35)'  },
  SELL: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.35)'  },
  HOLD: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
}
const SIGNAL_COLOR = { buy: '#22c55e', sell: '#ef4444', hold: '#f59e0b' }

function rsiColor(v) {
  if (v == null) return 'var(--muted)'
  if (v < 30) return '#22c55e'
  if (v > 70) return '#ef4444'
  return 'var(--text)'
}

// onResult callback lets App.jsx pass the result to TutorPanel
export default function PredictionPanel({ points, onResult }) {
  const [result, setResult] = useState(null)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    setError(null)
    if (!computeSignals || !points || points.length < 30) {
      setResult(null)
      onResult?.(null)
      return
    }
    try {
      const closes = points.map(p => p.close).filter(v => v != null && !isNaN(v) && v > 0)
      if (closes.length < 30) { setResult(null); onResult?.(null); return }
      const sig = computeSignals(closes)
      setResult(sig)
      onResult?.(sig)
    } catch (err) {
      console.error('Indicator error:', err)
      setError(err.message)
      setResult(null)
      onResult?.(null)
    }
  }, [points])

  if (!computeSignals) return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Technical Analysis — live signals</div>
      <div className={styles.noData}>Add <code>src/utils/indicators.js</code> to enable signals.</div>
    </div>
  )
  if (error) return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Technical Analysis — live signals</div>
      <div className={`${styles.noData} ${styles.noDataError}`}>Could not compute signals: {error}</div>
    </div>
  )
  if (!result) return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Technical Analysis — live signals</div>
      <div className={styles.noData}>
        {!points || points.length === 0
          ? 'Load a stock to see signals.'
          : `Need at least 30 data points (have ${points.length}). Try a longer time range.`}
      </div>
    </div>
  )

  const { action, confidence, score, maxScore, reasons, values: v } = result
  const ast      = ACTION_STYLE[action] ?? ACTION_STYLE.HOLD
  const scorePct = Math.round(((score + maxScore) / (maxScore * 2)) * 100)

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Technical Analysis — live signals</div>

      <div className={styles.gaugesRow}>
        <div className={styles.gauge}>
          <div className={styles.gaugeLabel}>RSI (14)</div>
          <div className={styles.gaugeVal} style={{ color: rsiColor(v.rsi) }}>{v.rsi?.toFixed(1) ?? '—'}</div>
          <div className={styles.gaugeSub}>{v.rsi == null ? '—' : v.rsi < 30 ? 'Oversold' : v.rsi > 70 ? 'Overbought' : 'Neutral'}</div>
        </div>
        <div className={styles.gauge}>
          <div className={styles.gaugeLabel}>MACD Hist</div>
          <div className={styles.gaugeVal} style={{ color: (v.macdHist ?? 0) > 0 ? '#22c55e' : '#ef4444' }}>
            {v.macdHist?.toFixed(3) ?? '—'}
          </div>
          <div className={styles.gaugeSub}>{(v.macdHist ?? 0) > 0 ? 'Bullish' : 'Bearish'}</div>
        </div>
        <div className={styles.gauge}>
          <div className={styles.gaugeLabel}>EMA 9 / 21</div>
          <div className={styles.gaugeVal} style={{ fontSize: 13, color: (v.ema9 ?? 0) > (v.ema21 ?? 0) ? '#22c55e' : '#ef4444' }}>
            {v.ema9?.toFixed(2) ?? '—'} / {v.ema21?.toFixed(2) ?? '—'}
          </div>
          <div className={styles.gaugeSub}>{(v.ema9 ?? 0) > (v.ema21 ?? 0) ? 'Uptrend' : 'Downtrend'}</div>
        </div>
        <div className={styles.gauge}>
          <div className={styles.gaugeLabel}>Bollinger</div>
          <div className={styles.gaugeVal} style={{ fontSize: 13 }}>
            {v.bbLower?.toFixed(2) ?? '—'} – {v.bbUpper?.toFixed(2) ?? '—'}
          </div>
          <div className={styles.gaugeSub}>Mid {v.bbMiddle?.toFixed(2) ?? '—'}</div>
        </div>
      </div>

      <div className={styles.topRow}>
        <div className={styles.verdictCard} style={{ background: ast.bg, border: `1px solid ${ast.border}` }}>
          <div>
            <div className={styles.action} style={{ color: ast.color }}>{action}</div>
            <div className={styles.confidenceText} style={{ color: ast.color }}>{confidence} signal</div>
          </div>
          <div className={styles.scoreBar}>
            <div className={styles.scoreLabel} style={{ color: ast.color }}>Composite score</div>
            <div className={styles.scoreTrack}>
              <div className={styles.scoreFill} style={{ width: scorePct + '%', background: ast.color }} />
            </div>
            <div className={styles.scoreNum} style={{ color: ast.color }}>
              {score > 0 ? '+' : ''}{score} / {maxScore}
            </div>
          </div>
        </div>

        <div className={styles.reasonsCard}>
          {(reasons ?? []).map((r, i) => (
            <div key={i} className={styles.reasonRow}>
              <span className={styles.badge}
                style={{ background: `${SIGNAL_COLOR[r.signal] ?? '#888'}20`, color: SIGNAL_COLOR[r.signal] ?? '#888' }}>
                {r.signal}
              </span>
              <div>
                <div className={styles.indName}>{r.indicator}</div>
                <div className={styles.detail}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.disclaimer}>
        Signals are generated from RSI, MACD, Bollinger Bands, and EMA crossovers on live price data.
        Educational purposes only — not financial advice.
      </div>
    </div>
  )
}
