import { m } from 'motion/react'
import { useState } from 'react'
import { useMarket, type MarketRow } from '../hooks/useQuotes'
import { changeClass, fmtChange, fmtCompactUsd, fmtUsd } from '../lib/format'
import { stockHref } from '../lib/route'
import { primaryVenue } from '../lib/venues'
import { STOCKS } from '../tokens'
import { Freshness } from './Freshness'
import { Tile } from './Tile'

type SortKey = 'symbol' | 'price' | 'change' | 'liquidity'
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'symbol', label: 'Asset' },
  { key: 'price', label: 'Price' },
  { key: 'change', label: '24h' },
  { key: 'liquidity', label: 'Liquidity' },
]

function sortRows(rows: MarketRow[], key: SortKey, desc: boolean) {
  const val = (r: MarketRow) => (key === 'symbol' ? r.stock.symbol : key === 'liquidity' ? r.liquidity : r[key])
  return [...rows].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    // Stocks without a price always sink to the bottom, whatever the direction.
    if (x === null) return y === null ? 0 : 1
    if (y === null) return -1
    const cmp = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)
    return desc ? -cmp : cmp
  })
}

function MarketItem({ row, index }: { row: MarketRow; index: number }) {
  return (
    <m.div
      className="row row-market"
      role="row"
      data-testid="market-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.03 }}
    >
      <div className="asset-cell" role="cell">
        <a className="asset" href={stockHref(row.stock.symbol)}>
          <Tile stock={row.stock} size={40} />
          <div>
            <div className="sym">{row.stock.symbol}</div>
            <div className="sub">{row.stock.name}</div>
          </div>
        </a>
      </div>
      <div className="cell price" role="cell" data-label="Price">{row.price === null ? '—' : fmtUsd(row.price)}</div>
      <div className={`cell chg ${changeClass(row.change)}`} role="cell" data-label="24h">{fmtChange(row.change)}</div>
      <div className="cell liq" role="cell" data-label="Liquidity">
        {row.tradable ? fmtCompactUsd(row.liquidity) : '—'}
        {row.thin && <span className="thin" title="Thin liquidity, price may be unreliable">thin</span>}
      </div>
      <div className="actions" role="cell">
        {row.tradable ? (
          <a
            className="btn btn-outline"
            href={primaryVenue.url(row.stock)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Buy ${row.stock.symbol} on ${primaryVenue.name}`}
          >
            Buy
          </a>
        ) : (
          <span className="sub no-pool">No pool yet</span>
        )}
      </div>
    </m.div>
  )
}

/** The stock list. With `limit` it is a short, fixed preview (landing page); without, a sortable, searchable table. */
export function MarketTable({ limit }: { limit?: number }) {
  const market = useMarket()
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'liquidity', desc: true })
  const [query, setQuery] = useState('')
  const preview = limit !== undefined

  if (market.error) return <p className="form-error" role="alert">Could not load prices: {market.error.message.split('\n')[0]}</p>
  if (!market.rows) return <p className="empty">Loading prices from Base…</p>

  const q = query.trim().toLowerCase()
  let rows = preview ? market.rows : sortRows(market.rows, sort.key, sort.desc)
  if (q) rows = rows.filter((r) => r.stock.symbol.toLowerCase().includes(q) || r.stock.name.toLowerCase().includes(q))
  if (preview) rows = rows.slice(0, limit)

  function toggle(key: SortKey) {
    // Text sorts A→Z first, numbers biggest first.
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'symbol' }))
  }

  return (
    <>
      {!preview && (
        <div className="market-tools">
          <label className="search">
            <span className="visually-hidden">Search stocks</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ticker or company"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {/* The column headers are hidden on phones, so they sort from here. */}
          <label className="sort-select">
            <span className="sub">Sort</span>
            <select
              value={`${sort.key}:${sort.desc ? 'desc' : 'asc'}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':')
                setSort({ key: key as SortKey, desc: dir === 'desc' })
              }}
            >
              <option value="liquidity:desc">Deepest pool</option>
              <option value="change:desc">Biggest gain 24h</option>
              <option value="change:asc">Biggest loss 24h</option>
              <option value="price:desc">Highest price</option>
              <option value="symbol:asc">Ticker A–Z</option>
            </select>
          </label>
          <Freshness updatedAt={market.updatedAt} fetching={market.fetching} onRefresh={() => market.refetch()} />
        </div>
      )}
      {rows.length === 0 ? (
        <p className="empty">No Coinbase stock token matches “{query}”.</p>
      ) : (
        <div className="table" role="table" aria-label="Coinbase tokenized stocks on Base">
          <div className="row row-market head" role="row">
            {COLUMNS.map((c) =>
              preview ? (
                <div key={c.key} role="columnheader">{c.label}</div>
              ) : (
                <div
                  key={c.key}
                  role="columnheader"
                  aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                >
                  <button className="sort" onClick={() => toggle(c.key)}>
                    {c.label}
                    <span aria-hidden="true">{sort.key === c.key ? (sort.desc ? ' ↓' : ' ↑') : ''}</span>
                  </button>
                </div>
              ),
            )}
            <div role="columnheader"><span className="visually-hidden">Buy</span></div>
          </div>
          {rows.map((r, i) => <MarketItem key={r.stock.symbol} row={r} index={i} />)}
        </div>
      )}
    </>
  )
}

export function MarketPage() {
  return (
    <main>
      <section className="page-head">
        <div className="eyebrow">Coinbase-issued · Base only</div>
        <h1>All {STOCKS.length} tokenized stocks</h1>
        <p className="lede">
          Every stock token Coinbase has issued on Base, priced from its deepest on-chain DEX pool. Pools under
          $25K are marked thin: their price moves easily and can differ from the stock market.
        </p>
      </section>
      <section className="block">
        <MarketTable />
      </section>
    </main>
  )
}
