// ─── SMA ─────────────────────────────────────────────────────────────────────
export function sma(data, period) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    const slice = data.slice(i - period + 1, i + 1)
    result.push(slice.reduce((a, b) => a + b, 0) / period)
  }
  return result
}

// ─── EMA ─────────────────────────────────────────────────────────────────────
export function ema(data, period) {
  const k = 2 / (period + 1)
  const result = []
  let prev = null
  for (let i = 0; i < data.length; i++) {
    if (data[i] == null) { result.push(null); continue }
    if (prev === null) {
      if (i < period - 1) { result.push(null); continue }
      const seed = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      prev = seed
      result.push(parseFloat(seed.toFixed(4)))
      continue
    }
    prev = data[i] * k + prev * (1 - k)
    result.push(parseFloat(prev.toFixed(4)))
  }
  return result
}

// ─── RSI ─────────────────────────────────────────────────────────────────────
export function rsi(data, period = 14) {
  const result = Array(data.length).fill(null)
  if (data.length < period + 1) return result
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const d = data[i] - data[i - 1]
    if (d >= 0) gains += d; else losses += Math.abs(d)
  }
  let ag = gains / period, al = losses / period
  const calc = (ag, al) => al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  result[period] = parseFloat(calc(ag, al).toFixed(2))
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1]
    ag = (ag * (period - 1) + Math.max(d, 0)) / period
    al = (al * (period - 1) + Math.max(-d, 0)) / period
    result[i] = parseFloat(calc(ag, al).toFixed(2))
  }
  return result
}

// ─── MACD ────────────────────────────────────────────────────────────────────
export function macd(data, fast = 12, slow = 26, signal = 9) {
  const emaFast  = ema(data, fast)
  const emaSlow  = ema(data, slow)
  const macdLine = emaFast.map((v, i) =>
    v != null && emaSlow[i] != null ? parseFloat((v - emaSlow[i]).toFixed(4)) : null)
  const signalLine = ema(macdLine.map(v => v ?? 0), signal)
  const histogram  = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? parseFloat((v - signalLine[i]).toFixed(4)) : null)
  return { macdLine, signalLine, histogram }
}

// ─── Bollinger Bands ─────────────────────────────────────────────────────────
export function bollingerBands(data, period = 20, stdDev = 2) {
  const middle = sma(data, period)
  const upper = [], lower = []
  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); continue }
    const slice = data.slice(i - period + 1, i + 1)
    const variance = slice.reduce((acc, v) => acc + Math.pow(v - middle[i], 2), 0) / period
    const sd = Math.sqrt(variance)
    upper.push(parseFloat((middle[i] + stdDev * sd).toFixed(4)))
    lower.push(parseFloat((middle[i] - stdDev * sd).toFixed(4)))
  }
  return { upper, middle, lower }
}

// ─── Support & Resistance ────────────────────────────────────────────────────
export function detectSupportResistance(closes) {
  if (closes.length < 20) return []
  const win = Math.max(5, Math.floor(closes.length / 15))
  const rawLevels = []

  for (let i = win; i < closes.length - win; i++) {
    const slice = closes.slice(i - win, i + win + 1)
    const center = closes[i]
    const isHigh = center === Math.max(...slice)
    const isLow  = center === Math.min(...slice)
    if (isHigh) rawLevels.push({ price: center, type: 'resistance' })
    if (isLow)  rawLevels.push({ price: center, type: 'support' })
  }

  // Cluster nearby levels (within 0.6%)
  const clustered = []
  const used = new Set()
  for (let i = 0; i < rawLevels.length; i++) {
    if (used.has(i)) continue
    const group = [rawLevels[i]]
    used.add(i)
    for (let j = i + 1; j < rawLevels.length; j++) {
      if (used.has(j)) continue
      if (Math.abs(rawLevels[j].price - rawLevels[i].price) / rawLevels[i].price < 0.006) {
        group.push(rawLevels[j]); used.add(j)
      }
    }
    const avgPrice = group.reduce((a, b) => a + b.price, 0) / group.length
    const resCount = group.filter(l => l.type === 'resistance').length
    clustered.push({
      price: parseFloat(avgPrice.toFixed(2)),
      type: resCount >= group.length / 2 ? 'resistance' : 'support',
      strength: group.length
    })
  }

  const currentPrice = closes[closes.length - 1]
  return clustered
    .filter(l => {
      const pct = Math.abs(l.price - currentPrice) / currentPrice
      return pct > 0.002 && pct < 0.15 // between 0.2% and 15% of current price
    })
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8)
    .sort((a, b) => a.price - b.price)
}

// ─── Fibonacci Retracement ───────────────────────────────────────────────────
export function calcFibonacci(closes) {
  if (closes.length < 10) return null
  const recent = closes.slice(-Math.min(closes.length, 60))
  const high = Math.max(...recent)
  const low  = Math.min(...recent)
  const range = high - low
  if (range === 0) return null
  return {
    high, low,
    levels: [
      { ratio: 0,     price: high,                 label: '0%'    },
      { ratio: 0.236, price: high - range * 0.236, label: '23.6%' },
      { ratio: 0.382, price: high - range * 0.382, label: '38.2%' },
      { ratio: 0.5,   price: high - range * 0.5,   label: '50%'   },
      { ratio: 0.618, price: high - range * 0.618, label: '61.8%' },
      { ratio: 0.786, price: high - range * 0.786, label: '78.6%' },
      { ratio: 1,     price: low,                  label: '100%'  },
    ]
  }
}

// ─── ZigZag (Elliott Wave helper) ────────────────────────────────────────────
function zigzag(data, threshold = 0.03) {
  const pivots = []
  let trend = null
  let curHigh = data[0], curHighIdx = 0
  let curLow  = data[0], curLowIdx  = 0

  for (let i = 1; i < data.length; i++) {
    const v = data[i]
    if (trend === null) {
      if (v > curHigh) { curHigh = v; curHighIdx = i }
      if (v < curLow)  { curLow  = v; curLowIdx  = i }
      const up   = (curHigh - curLow)  / curLow
      const down = (curHigh - curLow)  / curHigh
      if (up >= threshold) {
        pivots.push({ idx: curLowIdx,  value: curLow,  type: 'low'  })
        trend = 'up'; curHigh = v; curHighIdx = i
      } else if (down >= threshold) {
        pivots.push({ idx: curHighIdx, value: curHigh, type: 'high' })
        trend = 'down'; curLow = v; curLowIdx = i
      }
    } else if (trend === 'up') {
      if (v >= curHigh) { curHigh = v; curHighIdx = i }
      else if ((curHigh - v) / curHigh >= threshold) {
        pivots.push({ idx: curHighIdx, value: curHigh, type: 'high' })
        trend = 'down'; curLow = v; curLowIdx = i
      }
    } else {
      if (v <= curLow) { curLow = v; curLowIdx = i }
      else if ((v - curLow) / curLow >= threshold) {
        pivots.push({ idx: curLowIdx, value: curLow, type: 'low' })
        trend = 'up'; curHigh = v; curHighIdx = i
      }
    }
  }
  if (trend === 'up')   pivots.push({ idx: curHighIdx, value: curHigh, type: 'high' })
  if (trend === 'down') pivots.push({ idx: curLowIdx,  value: curLow,  type: 'low'  })
  return pivots
}

function validateImpulse(pivots) {
  if (pivots.length < 6) return null
  const isUp = pivots[0].type === 'low'
  // Validate alternating pattern
  for (let i = 0; i < 6; i++) {
    const exp = isUp ? (i % 2 === 0 ? 'low' : 'high') : (i % 2 === 0 ? 'high' : 'low')
    if (pivots[i].type !== exp) return null
  }
  const [p0,p1,p2,p3,p4,p5] = pivots.slice(0,6).map(p => p.value)
  const w1 = Math.abs(p1-p0), w2 = Math.abs(p2-p1)
  const w3 = Math.abs(p3-p2), w4 = Math.abs(p4-p3)
  const w5 = Math.abs(p5-p4)
  // Elliott rules
  if (w2/w1 >= 1.0)           return null  // W2 < 100% of W1
  if (w3 < w1 && w3 < w5)    return null  // W3 not shortest
  if (isUp  && p4 <= p1)      return null  // W4 no overlap
  if (!isUp && p4 >= p1)      return null

  let confidence = 0.4
  const w3w1 = w3/w1, w2r = w2/w1, w4r = w4/w3, w5w1 = w5/w1
  if (w3w1 >= 1.5 && w3w1 <= 1.8)   confidence += 0.2
  else if (w3w1 >= 1.2)              confidence += 0.08
  if (w2r >= 0.382 && w2r <= 0.618)  confidence += 0.15
  else if (w2r >= 0.236)             confidence += 0.05
  if (w4r >= 0.236 && w4r <= 0.382)  confidence += 0.12
  if (Math.abs(w5w1 - 1.0) < 0.12)  confidence += 0.1
  else if (Math.abs(w5w1 - 0.618) < 0.1) confidence += 0.05

  const w5start = p4
  return {
    type: 'impulse',
    direction: isUp ? 'up' : 'down',
    pivots: pivots.slice(0,6),
    labels: ['①','②','③','④','⑤'],
    targets: {
      equal:    parseFloat((isUp ? w5start+w1     : w5start-w1    ).toFixed(2)),
      fib618:   parseFloat((isUp ? w5start+w1*0.618: w5start-w1*0.618).toFixed(2)),
      extended: parseFloat((isUp ? w5start+w1*1.618: w5start-w1*1.618).toFixed(2)),
    },
    fibRatios: { w3w1: w3w1.toFixed(3), w2r: w2r.toFixed(3), w4r: w4r.toFixed(3), w5w1: w5w1.toFixed(3) },
    confidence: Math.min(confidence, 0.95),
    signal: isUp ? 'Wave 5 buy — final impulse up' : 'Wave 5 sell — final impulse down',
    currentWave: 5,
  }
}

function validateCorrection(pivots) {
  if (pivots.length < 4) return null
  const isABC_down = pivots[0].type === 'high'
  for (let i = 0; i < 4; i++) {
    const exp = isABC_down ? (i%2===0?'high':'low') : (i%2===0?'low':'high')
    if (pivots[i].type !== exp) return null
  }
  const [p0,p1,p2,p3] = pivots.slice(0,4).map(p => p.value)
  const wA = Math.abs(p1-p0), wB = Math.abs(p2-p1), wC = Math.abs(p3-p2)
  const bRet = wB/wA
  if (bRet < 0.382 || bRet > 0.886) return null

  let confidence = 0.3
  if (bRet >= 0.5 && bRet <= 0.786) confidence += 0.2
  const cARatio = wC/wA
  if (Math.abs(cARatio-1.0) < 0.12)   confidence += 0.15
  else if (Math.abs(cARatio-1.618)<0.15) confidence += 0.1

  const cTarget = isABC_down ? p2-wA : p2+wA
  return {
    type: 'correction',
    direction: isABC_down ? 'down' : 'up',
    pivots: pivots.slice(0,4),
    labels: ['A','B','C'],
    targets: { primary: parseFloat(cTarget.toFixed(2)) },
    fibRatios: { bRet: bRet.toFixed(3), cARatio: cARatio.toFixed(3) },
    confidence: Math.min(confidence, 0.88),
    signal: isABC_down ? 'ABC correction — potential buy at C' : 'ABC correction — potential sell at C',
    currentWave: 'C',
  }
}

// ─── Elliott Wave Detection ──────────────────────────────────────────────────
export function detectElliottWaves(closes) {
  if (closes.length < 40) return null

  const clean = closes.filter(v => v != null && !isNaN(v))
  if (clean.length < 40) return null

  const range   = Math.max(...clean) - Math.min(...clean)
  const avgP    = clean.reduce((a,b)=>a+b,0)/clean.length
  const thresh  = Math.max(0.025, Math.min(0.08, (range/avgP)/5))
  const pivots  = zigzag(clean, thresh)
  if (pivots.length < 4) return null

  const candidates = []
  const recent = pivots.slice(-12)

  // Try 5-wave impulse from different starting pivots
  for (let s = 0; s <= Math.max(0, recent.length-6); s++) {
    const r = validateImpulse(recent.slice(s))
    if (r) candidates.push(r)
  }
  // Try 3-wave correction
  for (let s = 0; s <= Math.max(0, recent.length-4); s++) {
    const r = validateCorrection(recent.slice(s))
    if (r) candidates.push(r)
  }

  if (candidates.length === 0) return null
  candidates.sort((a,b) => b.confidence - a.confidence)
  return candidates[0]
}

// ─── Composite Signal Engine ──────────────────────────────────────────────────
export function computeSignals(closes) {
  if (closes.length < 30) return null
  const clean = closes.filter(v => v != null && !isNaN(v) && v > 0)
  if (clean.length < 30) return null

  const rsiVals  = rsi(clean, 14)
  const macdData = macd(clean, 12, 26, 9)
  const bbData   = bollingerBands(clean, 20, 2)
  const ema9     = ema(clean, 9)
  const ema21    = ema(clean, 21)
  const last = clean.length - 1, prev = last - 1

  const curRsi   = rsiVals[last]
  const curMacd  = macdData.macdLine[last]
  const prevMacd = macdData.macdLine[prev]
  const curSig   = macdData.signalLine[last]
  const prevSig  = macdData.signalLine[prev]
  const curHist  = macdData.histogram[last]
  const price    = clean[last]
  const bb       = { upper: bbData.upper[last], middle: bbData.middle[last], lower: bbData.lower[last] }
  const curE9    = ema9[last],  prevE9  = ema9[prev]
  const curE21   = ema21[last], prevE21 = ema21[prev]

  let score = 0
  const reasons = []

  // RSI
  if (curRsi !== null) {
    if      (curRsi < 30) { score += 2; reasons.push({ indicator:'RSI', signal:'buy',  detail:`RSI ${curRsi.toFixed(1)} — oversold, bounce likely` }) }
    else if (curRsi < 45) { score += 1; reasons.push({ indicator:'RSI', signal:'buy',  detail:`RSI ${curRsi.toFixed(1)} — leaning oversold` }) }
    else if (curRsi > 70) { score -= 2; reasons.push({ indicator:'RSI', signal:'sell', detail:`RSI ${curRsi.toFixed(1)} — overbought, pullback risk` }) }
    else if (curRsi > 55) { score -= 1; reasons.push({ indicator:'RSI', signal:'sell', detail:`RSI ${curRsi.toFixed(1)} — leaning overbought` }) }
    else                  {             reasons.push({ indicator:'RSI', signal:'hold', detail:`RSI ${curRsi.toFixed(1)} — neutral zone` }) }
  }
  // MACD
  if (curMacd !== null && curSig !== null) {
    const bullX = prevMacd < prevSig && curMacd > curSig
    const bearX = prevMacd > prevSig && curMacd < curSig
    if      (bullX)                              { score += 2; reasons.push({ indicator:'MACD', signal:'buy',  detail:'Bullish crossover — momentum turning up' }) }
    else if (bearX)                              { score -= 2; reasons.push({ indicator:'MACD', signal:'sell', detail:'Bearish crossover — momentum turning down' }) }
    else if (curHist > 0 && curHist > (macdData.histogram[prev]??0)) { score += 1; reasons.push({ indicator:'MACD', signal:'buy',  detail:'Histogram expanding above zero — bullish' }) }
    else if (curHist < 0 && curHist < (macdData.histogram[prev]??0)) { score -= 1; reasons.push({ indicator:'MACD', signal:'sell', detail:'Histogram expanding below zero — bearish' }) }
    else                                         {             reasons.push({ indicator:'MACD', signal:'hold', detail:`Histogram ${curHist?.toFixed(3)} — no strong signal` }) }
  }
  // Bollinger
  if (bb.upper && bb.lower && bb.middle) {
    const pctB = (price - bb.lower) / (bb.upper - bb.lower)
    if      (pctB < 0.05) { score += 2; reasons.push({ indicator:'Bollinger', signal:'buy',  detail:`Price near lower band ($${bb.lower.toFixed(2)}) — oversold` }) }
    else if (pctB < 0.2)  { score += 1; reasons.push({ indicator:'Bollinger', signal:'buy',  detail:`Price in lower zone, mid $${bb.middle.toFixed(2)}` }) }
    else if (pctB > 0.95) { score -= 2; reasons.push({ indicator:'Bollinger', signal:'sell', detail:`Price near upper band ($${bb.upper.toFixed(2)}) — overbought` }) }
    else if (pctB > 0.8)  { score -= 1; reasons.push({ indicator:'Bollinger', signal:'sell', detail:`Price in upper zone, mid $${bb.middle.toFixed(2)}` }) }
    else                  {             reasons.push({ indicator:'Bollinger', signal:'hold', detail:`Price mid-band, range $${bb.lower.toFixed(2)}–$${bb.upper.toFixed(2)}` }) }
  }
  // EMA crossover
  if (curE9 && curE21 && prevE9 && prevE21) {
    const golden = prevE9 <= prevE21 && curE9 > curE21
    const death  = prevE9 >= prevE21 && curE9 < curE21
    if      (golden)          { score += 2; reasons.push({ indicator:'EMA', signal:'buy',  detail:'Golden cross (EMA9 > EMA21) — strong buy signal' }) }
    else if (death)           { score -= 2; reasons.push({ indicator:'EMA', signal:'sell', detail:'Death cross (EMA9 < EMA21) — strong sell signal' }) }
    else if (curE9 > curE21)  { score += 1; reasons.push({ indicator:'EMA', signal:'buy',  detail:`EMA9 ($${curE9.toFixed(2)}) above EMA21 — uptrend` }) }
    else                      { score -= 1; reasons.push({ indicator:'EMA', signal:'sell', detail:`EMA9 ($${curE9.toFixed(2)}) below EMA21 — downtrend` }) }
  }

  const maxScore = 8
  const pct = score / maxScore
  let action, confidence
  if      (pct >= 0.5)  { action='BUY';  confidence='Strong' }
  else if (pct >= 0.25) { action='BUY';  confidence='Moderate' }
  else if (pct <= -0.5) { action='SELL'; confidence='Strong' }
  else if (pct <= -0.25){ action='SELL'; confidence='Moderate' }
  else                  { action='HOLD'; confidence='Neutral' }

  return {
    action, confidence, score, maxScore, reasons,
    values: {
      rsi: curRsi, macd: curMacd, macdSignal: curSig, macdHist: curHist,
      bbUpper: bb.upper, bbMiddle: bb.middle, bbLower: bb.lower,
      ema9: curE9, ema21: curE21,
    }
  }
}
