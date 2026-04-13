import React, { useRef, useEffect, useState } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'
import { sma, detectSupportResistance, calcFibonacci, detectElliottWaves } from '../utils/indicators.js'
import styles from './PriceChart.module.css'

const COLORS = {
  bg:          '#13161c',
  grid:        '#1e2130',
  text:        '#64748b',
  border:      '#2a2d38',
  up:          '#22c55e',
  down:        '#ef4444',
  volUp:       'rgba(34,197,94,0.4)',
  volDown:     'rgba(239,68,68,0.4)',
  sma20:       '#3b82f6',
  sma50:       '#f59e0b',
  sma200:      '#a855f7',
  support:     '#22c55e',
  resistance:  '#ef4444',
  fib:         '#f59e0b',
  elliott:     '#f59e0b',
}

function buildChartOptions(width, height) {
  return {
    width, height,
    layout:    { background: { color: COLORS.bg }, textColor: COLORS.text },
    grid:      { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: COLORS.border, scaleMargins: { top: 0.08, bottom: 0.24 } },
    timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false, rightOffset: 5 },
  }
}

export default function PriceChart({ points, isUp, rangeKey }) {
  const containerRef  = useRef(null)
  const chartRef      = useRef(null)
  const seriesRef     = useRef({})
  const priceLineRefs = useRef([])

  const [overlays, setOverlays] = useState({ ma: true, sr: true, fib: false, ew: false })
  const [legend,   setLegend]   = useState(null)

  const toggleOverlay = key => setOverlays(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Init chart once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const w = containerRef.current.clientWidth
    const h = 420

    const chart = createChart(containerRef.current, buildChartOptions(w, h))
    chartRef.current = chart

    // Candlestick series
    const candle = chart.addCandlestickSeries({
      upColor: COLORS.up, downColor: COLORS.down,
      borderUpColor: COLORS.up, borderDownColor: COLORS.down,
      wickUpColor: COLORS.up, wickDownColor: COLORS.down,
    })

    // Volume overlay (bottom 22%)
    const volume = chart.addHistogramSeries({
      priceScaleId: 'vol',
      priceFormat:  { type: 'volume' },
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    })

    // MA lines
    const ma20  = chart.addLineSeries({ color: COLORS.sma20,  lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    const ma50  = chart.addLineSeries({ color: COLORS.sma50,  lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    const ma200 = chart.addLineSeries({ color: COLORS.sma200, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })

    seriesRef.current = { candle, volume, ma20, ma50, ma200 }

    // Crosshair legend
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData) { setLegend(null); return }
      const d = param.seriesData.get(candle)
      if (d) setLegend(d)
    })

    // Responsive resize
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0 && chartRef.current) chartRef.current.applyOptions({ width: w })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // ── Update data when points / overlays change ──────────────────────────────
  useEffect(() => {
    const s = seriesRef.current
    if (!s.candle || points.length === 0) return

    const closes  = points.map(p => p.close)
    const isIntra = ['1D','5D'].includes(rangeKey)

    // Candle data
    const candleData = points.map(p => ({
      time:  p.lwTime,
      open:  p.open  ?? p.close,
      high:  p.high  ?? p.close,
      low:   p.low   ?? p.close,
      close: p.close,
    }))
    s.candle.setData(candleData)

    // Volume
    const volData = points.map(p => ({
      time:  p.lwTime,
      value: p.volume || 0,
      color: (p.close >= (p.open ?? p.close)) ? COLORS.volUp : COLORS.volDown,
    }))
    s.volume.setData(volData)

    // ── MAs ──────────────────────────────────────────────────────────────────
    const toSeries = (vals) => vals
      .map((v, i) => v != null ? { time: points[i].lwTime, value: v } : null)
      .filter(Boolean)

    if (overlays.ma) {
      s.ma20.setData(toSeries(sma(closes, 20)))
      s.ma50.setData(toSeries(sma(closes, 50)))
      s.ma200.setData(toSeries(sma(closes, 200)))
    } else {
      s.ma20.setData([]); s.ma50.setData([]); s.ma200.setData([])
    }

    // ── Remove old price lines ────────────────────────────────────────────────
    priceLineRefs.current.forEach(pl => { try { s.candle.removePriceLine(pl) } catch {} })
    priceLineRefs.current = []

    const addLine = (price, color, title, dashed = false) => {
      const pl = s.candle.createPriceLine({
        price, color, lineWidth: 1, lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true, title,
      })
      priceLineRefs.current.push(pl)
    }

    // ── S&R ───────────────────────────────────────────────────────────────────
    if (overlays.sr) {
      detectSupportResistance(closes).forEach(l => {
        addLine(l.price, l.type === 'support' ? COLORS.support : COLORS.resistance,
          l.type === 'support' ? 'S' : 'R', true)
      })
    }

    // ── Fibonacci ─────────────────────────────────────────────────────────────
    if (overlays.fib) {
      const fib = calcFibonacci(closes)
      if (fib) {
        fib.levels.forEach(l => addLine(l.price, COLORS.fib, `Fib ${l.label}`, true))
      }
    }

    // ── Elliott Wave markers ──────────────────────────────────────────────────
    if (overlays.ew) {
      const ew = detectElliottWaves(closes)
      if (ew) {
        const markers = ew.pivots.map((piv, i) => {
          const pt = points[piv.idx]
          if (!pt) return null
          return {
            time:     pt.lwTime,
            position: piv.type === 'high' ? 'aboveBar' : 'belowBar',
            color:    COLORS.elliott,
            shape:    piv.type === 'high' ? 'arrowDown' : 'arrowUp',
            text:     ew.labels?.[i] ?? String(i+1),
          }
        }).filter(Boolean).sort((a,b) => {
          // Sort markers by time for Lightweight Charts requirement
          const ta = typeof a.time === 'number' ? a.time : new Date(a.time).getTime()
          const tb = typeof b.time === 'number' ? b.time : new Date(b.time).getTime()
          return ta - tb
        })
        s.candle.setMarkers(markers)

        // Add wave 5 target as price line
        if (ew.targets?.equal) addLine(ew.targets.equal, COLORS.elliott, 'EW Target', true)
      } else {
        s.candle.setMarkers([])
      }
    } else {
      s.candle.setMarkers([])
    }

  }, [points, rangeKey, overlays])

  const OverlayBtn = ({ k, label, color }) => (
    <button
      onClick={() => toggleOverlay(k)}
      className={`${styles.overlayBtn} ${overlays[k] ? styles.overlayBtnOn : ''}`}
      style={overlays[k] ? { borderColor: color, color } : {}}
    >
      {label}
    </button>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.legend}>
          {legend
            ? <>
                <span>O <b>${legend.open?.toFixed(2)}</b></span>
                <span>H <b>${legend.high?.toFixed(2)}</b></span>
                <span>L <b>${legend.low?.toFixed(2)}</b></span>
                <span>C <b>${legend.close?.toFixed(2)}</b></span>
              </>
            : <span className={styles.legendHint}>Hover chart for OHLC</span>
          }
        </div>
        <div className={styles.overlays}>
          <OverlayBtn k="ma"  label="MA 20/50/200"    color={COLORS.sma20}      />
          <OverlayBtn k="sr"  label="Support/Resist"  color={COLORS.support}    />
          <OverlayBtn k="fib" label="Fibonacci"        color={COLORS.fib}        />
          <OverlayBtn k="ew"  label="Elliott Wave"     color={COLORS.elliott}    />
        </div>
      </div>

      <div className={styles.canvasWrap} ref={containerRef}>
        {points.length === 0 && <div className={styles.empty}>No data loaded yet</div>}
      </div>

      <div className={styles.maLegend}>
        <span style={{ color: COLORS.sma20  }}>■ SMA 20</span>
        <span style={{ color: COLORS.sma50  }}>■ SMA 50</span>
        <span style={{ color: COLORS.sma200 }}>■ SMA 200</span>
        <span style={{ color: COLORS.support    }}>— Support</span>
        <span style={{ color: COLORS.resistance }}>— Resistance</span>
        <span style={{ color: COLORS.fib        }}>— Fibonacci</span>
        <span style={{ color: COLORS.elliott    }}>↑↓ Elliott Wave</span>
      </div>
    </div>
  )
}
