import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import { usePortfolio, type Row } from '../hooks/usePortfolio'
import { fmtAmount, fmtChange, fmtUsd } from '../lib/format'
import { CountUp } from './CountUp'
import { primaryVenue, swapHome, VENUES } from '../lib/venues'

function Tile({ row, size = 44 }: { row: Row; size?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={row.stock.icon && !failed ? 'tile tile-icon' : 'tile'}
      style={{ '--cl': row.stock.light, '--cd': row.stock.dark, width: size, height: size } as React.CSSProperties}
      aria-hidden="true"
    >
      {row.stock.icon && !failed ? (
        <img src={row.stock.icon} alt="" onError={() => setFailed(true)} loading="lazy" />
      ) : (
        row.stock.mono
      )}
      <i className="tile-base"><i /></i>
    </span>
  )
}

const changeClass = (c: number | null) => (c === null ? '' : c >= 0 ? 'up' : 'down')

function VenueMenu({ row }: { row: Row }) {
  return (
    <m.div
      className="menu"
      role="menu"
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="menu-title">Swap {row.stock.symbol} on</div>
      {VENUES.map((v) => (
        <a key={v.id} role="menuitem" href={v.url(row.stock)} target="_blank" rel="noreferrer noopener">
          {v.name}
          <span className={v.id === 'aerodrome' ? 'note up' : 'note'}>{v.note}</span>
        </a>
      ))}
      {row.thin && <p className="menu-warn">Thin liquidity for {row.stock.symbol}. Expect heavy slippage on larger swaps.</p>}
    </m.div>
  )
}

function Holding({ row, viewOnly, index }: { row: Row; viewOnly: boolean; index: number }) {
  const [open, setOpen] = useState(false)
  const actions = useRef<HTMLDivElement>(null)

  // Close the venue menu on Escape or a click elsewhere.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => {
      if (!actions.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <m.div
      className={`row ${viewOnly ? 'row-view' : ''}`}
      data-testid="holding"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 10) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="asset">
        <Tile row={row} />
        <div>
          <div className="sym">{row.stock.symbol}</div>
          <div className="sub">{row.stock.name} · Base</div>
        </div>
      </div>
      <div className="cell price" data-label="Price">
        {row.price === null ? '—' : fmtUsd(row.price)}
        {row.thin && <span className="thin" title="Thin liquidity, price may be unreliable">thin</span>}
      </div>
      <div className={`cell chg ${changeClass(row.change)}`} data-label="24h">{fmtChange(row.change)}</div>
      <div className="cell bal" data-label="Balance">{fmtAmount(row.amount)}</div>
      <div className="cell value">{row.price === null ? '—' : fmtUsd(row.value)}</div>
      {!viewOnly && (
        <div className="actions" ref={actions}>
          {row.tradable ? (
            <a className="btn" href={primaryVenue.url(row.stock)} target="_blank" rel="noreferrer noopener">Buy more</a>
          ) : (
            <span className="sub no-pool">No DEX pool yet</span>
          )}
          <button
            className="icon-btn"
            aria-label={`More venues to swap ${row.stock.symbol}`}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <AnimatePresence>{open && <VenueMenu row={row} />}</AnimatePresence>
        </div>
      )}
    </m.div>
  )
}

const FIRST_SHOWN = 8

export function Portfolio({ address, viewOnly }: { address: Address; viewOnly: boolean }) {
  const p = usePortfolio(address)
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? p.notHeld : p.notHeld.slice(0, FIRST_SHOWN)
  const total = p.total
  const up = p.delta >= 0

  return (
    <main>
      <section className="summary">
        <div className="summary-main">
          <div className="eyebrow">Stock portfolio value</div>
          <div className="total">{p.loading ? '…' : <CountUp value={total} />}</div>
          {p.held.length > 0 && p.pricesReady && (
            <div className={`delta ${up ? 'up' : 'down'}`}>
              {up ? '▲ +' : '▼ −'}{fmtUsd(Math.abs(p.delta))} ({up ? '+' : '−'}{Math.abs(p.deltaPct).toFixed(2)}%) <span>past 24h</span>
            </div>
          )}
          {p.held.length > 0 && total > 0 && (
            <>
              <div className="alloc" role="img" aria-label="Allocation by stock">
                {p.held.map((r, i) => (
                  <m.i
                    key={r.stock.symbol}
                    className="seg"
                    style={{ '--cl': r.stock.light, '--cd': r.stock.dark } as React.CSSProperties}
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.value / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}
              </div>
              <ul className="legend">
                {p.held.map((r) => (
                  <li key={r.stock.symbol}>
                    <i className="seg sw" style={{ '--cl': r.stock.light, '--cd': r.stock.dark } as React.CSSProperties} />
                    {r.stock.symbol} {((r.value / total) * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <aside className="summary-side">
          {viewOnly ? (
            <>
              <h2>Read-only snapshot</h2>
              <p>Balances for Coinbase-issued stock tokens on Base. Other assets and other chains are not shown. Nothing here can move funds.</p>
            </>
          ) : (
            <>
              <h2>Buy or swap into a stock</h2>
              <p>Shows only stock tokens issued by Coinbase, on Base. Other assets and other chains are not shown.</p>
              <a className="btn btn-lg" href={swapHome} target="_blank" rel="noreferrer noopener">
                Choose a stock to buy
              </a>
            </>
          )}
        </aside>
      </section>

      {p.error && <p className="form-error" role="alert">Could not load data: {p.error.message.split('\n')[0]}</p>}

      <section className="block">
        <div className="block-head">
          <h2>{viewOnly ? 'Stocks held' : 'Your stocks'} <span className="count">{p.held.length} of {p.totalCount}</span></h2>
          <span className="sub">Sorted by value</span>
        </div>

        {p.loading ? (
          <p className="empty">Loading balances from Base…</p>
        ) : p.held.length === 0 ? (
          <p className="empty">No Coinbase tokenized stocks in this wallet on Base.</p>
        ) : (
          <div className="table" role="table">
            <div className={`row head ${viewOnly ? 'row-view' : ''}`} role="row">
              <div>Asset</div><div>Price</div><div>24h</div><div>Balance</div><div>Value</div>{!viewOnly && <div />}
            </div>
            {p.held.map((r, i) => <Holding key={r.stock.symbol} row={r} viewOnly={viewOnly} index={i} />)}
          </div>
        )}
      </section>

      {!viewOnly && p.notHeld.length > 0 && !p.loading && (
        <section className="block">
          <h2>Not in your wallet yet</h2>
          <div className="cards">
            {shown.map((r, i) => (
              <m.div
                className="card"
                key={r.stock.symbol}
                data-testid="buy-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 7) * 0.04 }}
              >
                <div className="card-top">
                  <Tile row={r} size={36} />
                  <div>
                    <div className="sym">{r.stock.symbol}</div>
                    <div className="sub">{r.stock.name}</div>
                  </div>
                  <div className="card-price">{r.price === null ? '—' : fmtUsd(r.price)}</div>
                </div>
                <a className="btn btn-outline" href={primaryVenue.url(r.stock)} target="_blank" rel="noreferrer noopener">Buy {r.stock.symbol}</a>
              </m.div>
            ))}
          </div>
          {p.notHeld.length > FIRST_SHOWN && (
            <button className="btn btn-outline more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${p.notHeld.length} stocks`}
            </button>
          )}
        </section>
      )}
    </main>
  )
}
