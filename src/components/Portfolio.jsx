import React, { useState, useEffect } from 'react'
import { fetchStockData } from '../utils/stockApi.js'
import styles from './Portfolio.module.css'

const KEY = 'stockai_portfolio'

export default function Portfolio() {
  const [holdings,  setHoldings]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
  })
  const [prices,    setPrices]    = useState({})
  const [form,      setForm]      = useState({ symbol:'', shares:'', avgCost:'' })
  const [formErr,   setFormErr]   = useState('')
  const [open,      setOpen]      = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(holdings)) }, [holdings])

  const refreshPrices = async () => {
    if (holdings.length === 0) return
    setRefreshing(true)
    const results = {}
    await Promise.allSettled(holdings.map(async h => {
      try {
        const { points } = await fetchStockData(h.symbol, '1D')
        results[h.symbol] = points[points.length-1]?.close ?? null
      } catch { results[h.symbol] = null }
    }))
    setPrices(results)
    setRefreshing(false)
  }

  useEffect(() => { if (holdings.length > 0) refreshPrices() }, [holdings.length])

  const addHolding = () => {
    const sym    = form.symbol.trim().toUpperCase()
    const shares = parseFloat(form.shares)
    const cost   = parseFloat(form.avgCost)
    if (!sym)           { setFormErr('Enter a ticker symbol'); return }
    if (isNaN(shares) || shares <= 0) { setFormErr('Enter a valid share count'); return }
    if (isNaN(cost)  || cost   <= 0) { setFormErr('Enter a valid average cost'); return }
    if (holdings.find(h => h.symbol === sym)) { setFormErr(sym + ' already in portfolio'); return }
    setHoldings(prev => [...prev, { symbol:sym, shares, avgCost:cost }])
    setForm({ symbol:'', shares:'', avgCost:'' })
    setFormErr('')
  }

  const remove = (sym) => {
    setHoldings(prev => prev.filter(h => h.symbol !== sym))
    setPrices(prev => { const n={...prev}; delete n[sym]; return n })
  }

  const totalCost  = holdings.reduce((a,h) => a + h.shares * h.avgCost, 0)
  const totalValue = holdings.reduce((a,h) => {
    const p = prices[h.symbol]
    return p ? a + h.shares * p : a
  }, 0)
  const totalPnL   = totalValue - totalCost
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0
  const hasValue   = Object.keys(prices).length > 0

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow} onClick={() => setOpen(o=>!o)}>
        <span className={styles.title}>Portfolio Tracker</span>
        <div className={styles.titleRight}>
          {hasValue && (
            <span style={{ color: totalPnL >= 0 ? 'var(--green)' : 'var(--red)', fontSize:13, fontFamily:'var(--font-mono)' }}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%)
            </span>
          )}
          <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <>
          {/* Add form */}
          <div className={styles.addForm}>
            <input placeholder="Symbol" value={form.symbol}
              onChange={e => setForm(p=>({...p,symbol:e.target.value.toUpperCase()}))}
              onKeyDown={e => e.key==='Enter' && addHolding()}
              className={styles.formInput} style={{width:80}}
            />
            <input placeholder="Shares" type="number" min="0" value={form.shares}
              onChange={e => setForm(p=>({...p,shares:e.target.value}))}
              className={styles.formInput} style={{width:90}}
            />
            <input placeholder="Avg cost $" type="number" min="0" value={form.avgCost}
              onChange={e => setForm(p=>({...p,avgCost:e.target.value}))}
              className={styles.formInput} style={{width:110}}
            />
            <button onClick={addHolding} className={styles.addBtn}>Add</button>
            <button onClick={refreshPrices} disabled={refreshing} className={styles.refreshBtn}>
              {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
            </button>
          </div>
          {formErr && <div className={styles.formErr}>{formErr}</div>}

          {holdings.length === 0
            ? <div className={styles.empty}>No holdings yet — add a stock above to start tracking</div>
            : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Symbol</th><th>Shares</th><th>Avg Cost</th>
                      <th>Cur Price</th><th>Mkt Value</th><th>P&L</th><th>P&L %</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => {
                      const curP   = prices[h.symbol] ?? null
                      const value  = curP ? h.shares * curP : null
                      const pnl    = curP ? h.shares * (curP - h.avgCost) : null
                      const pnlPct = curP ? ((curP - h.avgCost) / h.avgCost) * 100 : null
                      const color  = pnl === null ? 'var(--muted)' : pnl >= 0 ? 'var(--green)' : 'var(--red)'
                      return (
                        <tr key={h.symbol}>
                          <td className={styles.symCell}>{h.symbol}</td>
                          <td>{h.shares}</td>
                          <td>${h.avgCost.toFixed(2)}</td>
                          <td>{curP ? '$'+curP.toFixed(2) : '—'}</td>
                          <td>{value ? '$'+value.toFixed(2) : '—'}</td>
                          <td style={{color}}>{pnl !== null ? (pnl>=0?'+':'')+'$'+pnl.toFixed(2) : '—'}</td>
                          <td style={{color}}>{pnlPct !== null ? (pnlPct>=0?'+':'')+pnlPct.toFixed(2)+'%' : '—'}</td>
                          <td><button onClick={()=>remove(h.symbol)} className={styles.removeBtn}>×</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {hasValue && (
                    <tfoot>
                      <tr>
                        <td colSpan={4} className={styles.totalLabel}>Total</td>
                        <td>${totalValue.toFixed(2)}</td>
                        <td style={{color: totalPnL>=0?'var(--green)':'var(--red)'}}>
                          {totalPnL>=0?'+':''}${totalPnL.toFixed(2)}
                        </td>
                        <td style={{color: totalPnL>=0?'var(--green)':'var(--red)'}}>
                          {totalPnLPct>=0?'+':''}{totalPnLPct.toFixed(2)}%
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
        </>
      )}
    </div>
  )
}
