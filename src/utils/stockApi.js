const PROXY = 'https://corsproxy.io/?'

export const TIME_RANGES = [
  { key:'1D',  label:'1D',  interval:'5m',  range:'1d',  fmt:'time'     },
  { key:'5D',  label:'5D',  interval:'30m', range:'5d',  fmt:'datetime' },
  { key:'1M',  label:'1M',  interval:'1d',  range:'1mo', fmt:'date'     },
  { key:'3M',  label:'3M',  interval:'1d',  range:'3mo', fmt:'date'     },
  { key:'6M',  label:'6M',  interval:'1d',  range:'6mo', fmt:'date'     },
  { key:'YTD', label:'YTD', interval:'1d',  range:'ytd', fmt:'date'     },
  { key:'1Y',  label:'1Y',  interval:'1wk', range:'1y',  fmt:'date'     },
  { key:'2Y',  label:'2Y',  interval:'1wk', range:'2y',  fmt:'date'     },
  { key:'5Y',  label:'5Y',  interval:'1mo', range:'5y',  fmt:'month'    },
  { key:'MAX', label:'MAX', interval:'1mo', range:'max', fmt:'year'     },
]

export const DEFAULT_RANGE = '1D'

function formatLabel(ts, fmt) {
  const d = new Date(ts * 1000)
  if (fmt === 'time')     return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
  if (fmt === 'datetime') return d.toLocaleDateString([], { month:'short', day:'numeric' }) + ' ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
  if (fmt === 'date')     return d.toLocaleDateString([], { month:'short', day:'numeric' })
  if (fmt === 'month')    return d.toLocaleDateString([], { month:'short', year:'2-digit' })
  if (fmt === 'year')     return '' + d.getFullYear()
  return d.toLocaleDateString()
}

// Returns 'YYYY-MM-DD' string for daily+ ranges (Lightweight Charts handles these better)
function toLWTime(ts, isIntraday) {
  if (isIntraday) return ts
  const d = new Date(ts * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
}

export async function fetchStockData(symbol, rangeKey = DEFAULT_RANGE) {
  const cfg = TIME_RANGES.find(r => r.key === rangeKey) || TIME_RANGES[0]
  const isIntraday = ['1D','5D'].includes(rangeKey)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${cfg.interval}&range=${cfg.range}`
  const res = await fetch(PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`HTTP ${res.status} — could not fetch ${symbol}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(json?.chart?.error?.description || 'No data returned')

  const meta = result.meta
  const timestamps = result.timestamp || []
  const q = result.indicators?.quote?.[0] || {}

  // Deduplicate by lwTime to prevent Lightweight Charts errors
  const seen = new Set()
  const points = timestamps
    .map((t, i) => {
      const lwTime = toLWTime(t, isIntraday)
      return {
        time:      formatLabel(t, cfg.fmt),
        timestamp: t,
        lwTime,
        close:  q.close?.[i],
        open:   q.open?.[i],
        high:   q.high?.[i],
        low:    q.low?.[i],
        volume: q.volume?.[i],
      }
    })
    .filter(p => {
      if (p.close == null || isNaN(p.close)) return false
      if (seen.has(p.lwTime)) return false
      seen.add(p.lwTime)
      return true
    })

  if (points.length === 0) throw new Error('No price data available (market may be closed)')
  return { meta, points, rangeKey }
}

export async function fetchNews(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=8&enableFuzzyQuery=false&enableCb=false`
    const res = await fetch(PROXY + encodeURIComponent(url))
    if (!res.ok) return []
    const json = await res.json()
    return (json?.news || []).map(n => ({
      title:     n.title,
      link:      n.link,
      publisher: n.publisher,
      time:      n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toLocaleDateString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
        : '',
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
    }))
  } catch { return [] }
}

export function calcStats(points, meta) {
  const last      = points[points.length - 1]
  const prevClose = meta.chartPreviousClose || meta.previousClose || points[0].open || last.close
  const change    = last.close - prevClose
  const changePct = (change / prevClose) * 100
  const allHighs  = points.map(p => p.high).filter(Boolean)
  const allLows   = points.map(p => p.low).filter(Boolean)
  const totalVol  = points.reduce((a, p) => a + (p.volume||0), 0)
  return {
    price: last.close, prevClose, change, changePct,
    open: points[0].open,
    high: allHighs.length ? Math.max(...allHighs) : null,
    low:  allLows.length  ? Math.min(...allLows)  : null,
    volume: totalVol, isUp: change >= 0,
  }
}

export const fmtPrice  = n => n == null ? '—' : '$' + n.toFixed(2)
export const fmtVolume = n => {
  if (!n) return '—'
  if (n >= 1e9) return (n/1e9).toFixed(2)+'B'
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
  return n.toString()
}
export const fmtChange = (change, pct) => {
  const s = change >= 0 ? '+' : ''
  return `${s}${change.toFixed(2)} (${s}${pct.toFixed(2)}%)`
}
