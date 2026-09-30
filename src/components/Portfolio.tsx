import { useState } from 'react'
import type { Address } from 'viem'
import { usePortfolio, type Row } from '../hooks/usePortfolio'
import { fmtAmount, fmtChange, fmtUsd } from '../lib/format'
import { primaryVenue, swapHome, VENUES } from '../lib/venues'

function Tile({ row, size = 44 }: { row: Row; size?: number }) {
  return (
    <span
      className="tile"
      style={{ '--cl': row.stock.light, '--cd': row.stock.dark, width: size, height: size } as React.CSSProperties}
      aria-hidden="true"
    >
      {row.stock.mono}
      <i className="tile-base"><i /></i>
    </span>
  )
}

const changeClass = (c: number | null) => (c === null ? '' : c >= 0 ? 'up' : 'down')

function VenueMenu({ row }: { row: Row }) {
  return (
    <div className="menu" role="menu">
      <div className="menu-title">Swap {row.stock.symbol} on</div>
      {VENUES.map((v) => (
        <a key={v.id} role="menuitem" href={v.url(row.stock)} target="_blank" rel="noreferrer noopener">
          {v.name}
          <span className={v.id === 'aerodrome' ? 'note up' : 'note'}>{v.note}</span>
        </a>
      ))}
      {row.thin && <p className="menu-warn">Thin liquidity for {row.stock.symbol}. Expect heavy slippage on larger swaps.</p>}
    </div>
  )
}

function Holding({ row, viewOnly }: { row: Row; viewOnly: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`row ${viewOnly ? 'row-view' : ''}`}>
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
      <div className={`cell ${changeClass(row.change)}`} data-label="24h">{fmtChange(row.change)}</div>
      <div className="cell" data-label="Balance">{fmtAmount(row.amount)}</div>
      <div className="cell value" data-label="Value">{row.price === null ? '—' : fmtUsd(row.value)}</div>
      {!viewOnly && (
        <div className="actions">
          <a className="btn" href={primaryVenue.url(row.stock)} target="_blank" rel="noreferrer noopener">Buy more</a>
          <button
            className="icon-btn"
            aria-label={`More venues to swap ${row.stock.symbol}`}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {open && <VenueMenu row={row} />}
        </div>
      )}
    </div>
  )
}

export function Portfolio({ address, viewOnly }: { address: Address; viewOnly: boolean }) {
  const p = usePortfolio(address)
  const total = p.total
  const up = p.delta >= 0

  return (
    <main>
      <section className="summary">
        <div className="summary-main">
          <div className="eyebrow">Stock portfolio value</div>
          <div className="total">{p.loading ? '…' : fmtUsd(total)}</div>
          {p.held.length > 0 && p.pricesReady && (
            <div className={`delta ${up ? 'up' : 'down'}`}>
              {up ? '▲ +' : '▼ −'}{fmtUsd(Math.abs(p.delta))} ({up ? '+' : '−'}{Math.abs(p.deltaPct).toFixed(2)}%) <span>past 24h</span>
            </div>
          )}
          {p.held.length > 0 && total > 0 && (
            <>
              <div className="alloc" role="img" aria-label="Allocation by stock">
                {p.held.map((r) => (
                  <i key={r.stock.symbol} className="seg" style={{ width: `${(r.value / total) * 100}%`, '--cl': r.stock.light, '--cd': r.stock.dark } as React.CSSProperties} />
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
          <h2>{viewOnly ? 'Stocks held' : 'Your stocks'} <span className="count">{p.held.length} of 10</span></h2>
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
            {p.held.map((r) => <Holding key={r.stock.symbol} row={r} viewOnly={viewOnly} />)}
          </div>
        )}
      </section>

      {!viewOnly && p.notHeld.length > 0 && !p.loading && (
        <section className="block">
          <h2>Not in your wallet yet</h2>
          <div className="cards">
            {p.notHeld.map((r) => (
              <div className="card" key={r.stock.symbol}>
                <div className="card-top">
                  <Tile row={r} size={36} />
                  <div>
                    <div className="sym">{r.stock.symbol}</div>
                    <div className="sub">{r.stock.name}</div>
                  </div>
                  <div className="card-price">{r.price === null ? '—' : fmtUsd(r.price)}</div>
                </div>
                <a className="btn btn-outline" href={primaryVenue.url(r.stock)} target="_blank" rel="noreferrer noopener">Buy {r.stock.symbol}</a>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
