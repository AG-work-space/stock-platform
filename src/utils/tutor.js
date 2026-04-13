// ─── Plain-English Tutor Engine ───────────────────────────────────────────────
// Takes the computed signal result and Elliott Wave result,
// returns beginner-friendly explanations for every decision.

export function buildTutorContent(result, elliottWave, stats) {
  if (!result) return null

  const { action, confidence, score, maxScore, values: v, reasons } = result
  const price = stats?.price

  const sections = []

  // ── 1. Overall verdict ─────────────────────────────────────────────────────
  const verdictText = {
    BUY: {
      Strong:   `The platform sees strong buying conditions right now. Multiple indicators are aligned and pointing upward — this is one of the clearer buy signals you can get from technical analysis.`,
      Moderate: `There are more reasons to buy than to sell right now, but not every indicator agrees. Think of it as a cautious green light rather than a full green.`,
    },
    SELL: {
      Strong:   `Several indicators are flashing warning signs at the same time. The platform sees more risk than opportunity here — this is a reasonably strong signal to reduce exposure.`,
      Moderate: `There are more reasons to be cautious than optimistic. Not a panic signal, but the data leans toward selling or at least not buying more right now.`,
    },
    HOLD: {
      Neutral:  `The indicators are mixed or neutral. Some say buy, some say sell, and they roughly cancel each other out. In this situation, doing nothing is often the wisest choice — wait for a clearer signal.`,
    },
  }
  sections.push({
    title:   'The overall verdict',
    icon:    action === 'BUY' ? '📈' : action === 'SELL' ? '📉' : '⏸',
    content: verdictText[action]?.[confidence] ?? `The platform scored this stock ${score > 0 ? '+' : ''}${score} out of a maximum of ${maxScore}. A positive score leans toward buying, negative toward selling, near zero means hold.`,
  })

  // ── 2. Score explained ─────────────────────────────────────────────────────
  const scorePct = Math.round(((score + maxScore) / (maxScore * 2)) * 100)
  const bullReasons = reasons.filter(r => r.signal === 'buy')
  const bearReasons = reasons.filter(r => r.signal === 'sell')
  const holdReasons = reasons.filter(r => r.signal === 'hold')

  let scoreExplain = `The score is calculated by running 4 independent indicators and tallying their votes. `
  if (bullReasons.length > 0) scoreExplain += `${bullReasons.length} indicator${bullReasons.length > 1 ? 's' : ''} voted BUY (${bullReasons.map(r => r.indicator).join(', ')}). `
  if (bearReasons.length > 0) scoreExplain += `${bearReasons.length} voted SELL (${bearReasons.map(r => r.indicator).join(', ')}). `
  if (holdReasons.length > 0) scoreExplain += `${holdReasons.length} voted HOLD (${holdReasons.map(r => r.indicator).join(', ')}). `
  scoreExplain += `Think of it like asking 4 analysts for their opinion — the majority view wins.`

  sections.push({ title: 'How the score is calculated', icon: '🗳', content: scoreExplain })

  // ── 3. RSI explained ──────────────────────────────────────────────────────
  if (v.rsi != null) {
    const rsiReason = reasons.find(r => r.indicator === 'RSI')
    let rsiExplain = `RSI stands for Relative Strength Index. Think of it as a thermometer for how "heated" or "cooled" a stock is. It runs on a scale of 0 to 100.\n\n`

    if (v.rsi < 30) {
      rsiExplain += `Right now RSI is ${v.rsi.toFixed(1)}, which is below 30. This is like a shop putting everything on deep discount — the stock has been sold off so heavily that it may be oversold. Historically, stocks in this zone tend to bounce back. This is a buy signal.`
    } else if (v.rsi < 45) {
      rsiExplain += `RSI is ${v.rsi.toFixed(1)}, in slightly oversold territory. The stock has been under selling pressure but hasn't hit extreme levels. A mild buy lean.`
    } else if (v.rsi > 70) {
      rsiExplain += `RSI is ${v.rsi.toFixed(1)}, above 70. This is like a shop that has raised prices so high that fewer people want to buy. The stock has rallied strongly and may be due for a pullback. This is a sell / caution signal.`
    } else if (v.rsi > 55) {
      rsiExplain += `RSI is ${v.rsi.toFixed(1)}, slightly elevated. The stock has some upward momentum but isn't dangerously overbought yet. A mild sell lean.`
    } else {
      rsiExplain += `RSI is ${v.rsi.toFixed(1)}, right in the middle zone (45–55). This means the stock is neither overheated nor oversold — buyers and sellers are roughly balanced. No strong signal.`
    }

    sections.push({ title: 'RSI — the temperature gauge', icon: '🌡', content: rsiExplain })
  }

  // ── 4. MACD explained ─────────────────────────────────────────────────────
  if (v.macdHist != null) {
    const macdReason = reasons.find(r => r.indicator === 'MACD')
    let macdExplain = `MACD (Moving Average Convergence Divergence) measures whether momentum is building or fading. Imagine two runners on a track — a fast one and a slow one. When the fast runner pulls ahead, momentum is picking up (bullish). When the slow runner closes the gap, momentum is fading (bearish).\n\n`

    if (macdReason?.signal === 'buy' && macdReason.detail.includes('crossover')) {
      macdExplain += `Right now the fast runner just overtook the slow one — this is called a bullish crossover. It means buying pressure is accelerating and is a meaningful buy signal.`
    } else if (macdReason?.signal === 'sell' && macdReason.detail.includes('crossover')) {
      macdExplain += `The slow runner just overtook the fast one — a bearish crossover. Selling pressure is accelerating and this is a meaningful sell signal.`
    } else if (v.macdHist > 0) {
      macdExplain += `The histogram (the gap between the two runners) is positive at ${v.macdHist.toFixed(3)}, meaning the fast runner is still ahead. Momentum is currently bullish, but no crossover just happened.`
    } else {
      macdExplain += `The histogram is negative at ${v.macdHist.toFixed(3)}, meaning the slow runner is ahead. Momentum is currently bearish, suggesting selling pressure.`
    }

    sections.push({ title: 'MACD — the momentum meter', icon: '🏃', content: macdExplain })
  }

  // ── 5. Bollinger Bands explained ─────────────────────────────────────────
  if (v.bbUpper != null && v.bbLower != null) {
    const bbReason = reasons.find(r => r.indicator === 'Bollinger')
    const pctB = price ? ((price - v.bbLower) / (v.bbUpper - v.bbLower) * 100).toFixed(0) : null

    let bbExplain = `Bollinger Bands draw a "normal price channel" around a stock — an upper boundary, a midpoint, and a lower boundary. The channel widens when the stock is volatile and narrows when it's calm.\n\n`
    bbExplain += `Right now the channel runs from $${v.bbLower?.toFixed(2)} (lower band) to $${v.bbUpper?.toFixed(2)} (upper band), with the midpoint at $${v.bbMiddle?.toFixed(2)}.\n\n`

    if (bbReason?.signal === 'buy' && pctB && parseInt(pctB) < 20) {
      bbExplain += `The current price is near the lower band (${pctB}% of the way across the channel). This is like a rubber band being stretched to its lower limit — it tends to snap back toward the middle. This is a buy signal.`
    } else if (bbReason?.signal === 'sell' && pctB && parseInt(pctB) > 80) {
      bbExplain += `The price is near the upper band (${pctB}% across the channel). Like a rubber band stretched to its upper limit, it tends to pull back. This is a sell / caution signal.`
    } else {
      bbExplain += `The price is in the middle of the channel (${pctB}% across). Neither stretched high nor low — no strong directional signal from Bollinger Bands.`
    }

    sections.push({ title: 'Bollinger Bands — the price channel', icon: '📏', content: bbExplain })
  }

  // ── 6. EMA Crossover explained ────────────────────────────────────────────
  if (v.ema9 != null && v.ema21 != null) {
    const emaReason = reasons.find(r => r.indicator === 'EMA')
    let emaExplain = `EMA stands for Exponential Moving Average. Think of it like tracking someone's walking speed — a 9-day EMA reacts quickly (like looking at the last few steps), while a 21-day EMA is slower (like looking at the last few minutes of walking).\n\n`
    emaExplain += `EMA9 is currently $${v.ema9.toFixed(2)} and EMA21 is $${v.ema21.toFixed(2)}.\n\n`

    if (emaReason?.detail?.includes('Golden cross')) {
      emaExplain += `The fast line just crossed above the slow line — this is called a "Golden Cross" and is considered one of the strongest buy signals in technical analysis. It means short-term momentum has shifted upward.`
    } else if (emaReason?.detail?.includes('Death cross')) {
      emaExplain += `The fast line just crossed below the slow line — a "Death Cross." This is one of the strongest sell signals, indicating short-term momentum has shifted downward.`
    } else if (v.ema9 > v.ema21) {
      emaExplain += `The fast line is above the slow line, which means the stock is in a short-term uptrend. The person is walking faster than their average — a buy-leaning signal.`
    } else {
      emaExplain += `The fast line is below the slow line, which means the stock is in a short-term downtrend. The person is slowing down below their average — a sell-leaning signal.`
    }

    sections.push({ title: 'EMA Crossover — the trend tracker', icon: '🚶', content: emaExplain })
  }

  // ── 7. Support & Resistance ───────────────────────────────────────────────
  if (price) {
    sections.push({
      title:   'Support & Resistance — the price floors and ceilings',
      icon:    '🏗',
      content: `Support levels are price points where a stock has repeatedly stopped falling and bounced back up — like a floor. Resistance levels are where it has repeatedly stopped rising and pulled back — like a ceiling.\n\nThese levels are shown as dashed lines on the chart. If the current price ($${price.toFixed(2)}) is near a support level, that may be a good buying zone. If it's near a resistance level, the stock may struggle to break through, which is a caution sign.\n\nThese levels are not guarantees — they are zones where the market has historically shown interest, and breaking through them can lead to big moves in either direction.`,
    })
  }

  // ── 8. Fibonacci explained ────────────────────────────────────────────────
  sections.push({
    title:   'Fibonacci — the mathematical price targets',
    icon:    '🌀',
    content: `Fibonacci retracement levels come from a famous mathematical sequence that appears throughout nature (like the spiral of a shell). Traders have found that after a big price move, stocks tend to retrace (pull back or recover) to specific percentage levels: 23.6%, 38.2%, 50%, 61.8%, and 78.6%.\n\nFor example, if a stock rises $100, it often pulls back to the 38.2% level ($38.20) or the 61.8% level ($61.80) before continuing upward. These levels are shown as yellow dashed lines on the chart.\n\nWhen the current price is near a Fibonacci level, it often acts as support or resistance — making it a useful zone to watch for potential reversals.`,
  })

  // ── 9. Elliott Wave explained ─────────────────────────────────────────────
  if (elliottWave) {
    const ewConf = Math.round(elliottWave.confidence * 100)
    let ewExplain = `Elliott Wave Theory says stock prices move in predictable patterns of waves — 5 waves in the direction of the main trend, then 3 corrective waves.\n\n`

    if (elliottWave.type === 'impulse') {
      ewExplain += `The algorithm detected what looks like a 5-wave impulse pattern (${elliottWave.direction === 'up' ? 'upward' : 'downward'} trend) with ${ewConf}% confidence. `
      ewExplain += `Waves 1, 3, and 5 move in the trend direction. Waves 2 and 4 are pullbacks.\n\n`
      ewExplain += `The arrows on the chart label each wave. `
      if (elliottWave.targets?.equal) {
        ewExplain += `Based on Fibonacci ratios, the projected target for Wave 5 is around $${elliottWave.targets.equal}. `
      }
      ewExplain += `\n\nThe signal is: "${elliottWave.signal}"`
    } else {
      ewExplain += `The algorithm detected an A-B-C corrective pattern (${elliottWave.direction === 'up' ? 'upward' : 'downward'}) with ${ewConf}% confidence. `
      ewExplain += `After a main trend, prices often correct in 3 waves labeled A, B, C. Wave A is the first move against the trend, B is a partial recovery, and C completes the correction.\n\n`
      if (elliottWave.targets?.primary) {
        ewExplain += `The projected end of Wave C is around $${elliottWave.targets.primary}. `
      }
      ewExplain += `\n\nThe signal is: "${elliottWave.signal}"`
    }

    ewExplain += `\n\n⚠ Elliott Wave is one of the most subjective tools in trading. A ${ewConf}% confidence means the price action fits the pattern rules, but patterns can always be redrawn as new data arrives. Use it as one input among several, never alone.`

    sections.push({ title: 'Elliott Wave — the wave pattern', icon: '🌊', content: ewExplain })
  } else {
    sections.push({
      title:   'Elliott Wave — no pattern detected yet',
      icon:    '🌊',
      content: `The Elliott Wave algorithm scans the price history for 5-wave impulse or 3-wave corrective patterns. No clear pattern was detected in the current data.\n\nThis is actually normal — clear Elliott Wave patterns don't always exist. When the algorithm does find one, numbered arrows (① ② ③ ④ ⑤ or A B C) will appear on the candles and a projected target price line will be drawn.\n\nTry switching to a longer time range (1M, 3M, 6M) — Elliott Waves are clearer over larger price moves.`,
    })
  }

  // ── 10. Disclaimer ────────────────────────────────────────────────────────
  sections.push({
    title:   'Important — this is not financial advice',
    icon:    '⚖',
    content: `Everything you see on this platform is based on technical analysis — the study of price patterns and statistics. Technical analysis is one tool among many. It does not predict the future.\n\nBefore making any investment decision, consider: your personal financial situation, the company's fundamentals (earnings, revenue, debt), the broader market environment, and ideally the advice of a qualified financial advisor.\n\nPast patterns do not guarantee future results.`,
    isWarning: true,
  })

  return sections
}
