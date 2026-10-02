import type { Address } from 'viem'
import { useMarket, useQuotes } from '../hooks/useQuotes'
import { usePortfolio } from '../hooks/usePortfolio'
import { changeClass, fmtAmount, fmtChange, fmtCompactUsd, fmtUsd } from '../lib/format'
import { VENUES } from '../lib/venues'
import { STOCKS, type Stock } from '../tokens'
import { CopyButton } from './CopyButton'
import { PriceChart } from './PriceChart'
import { Tile } from './Tile'

function YourPosition({ stock, owner }: { stock: Stock; owner: Address }) {
  const p = usePortfolio(owner)
  if (p.loading) return null
  const row = p.held.find((r) => r.stock.symbol === stock.symbol)
  return (
    <div className="stat">
      <div className="eyebrow">In your wallet</div>
      <div className="stat-value">{row ? fmtAmount(row.amount) : '0'} <span className="sub">{stock.symbol}</span></div>
      {row && row.price !== null && <div className="sub">≈ {fmtUsd(row.value)}</div>}
    </div>
  )
}

export function StockPage({ symbol, owner }: { symbol: string; owner?: Address }) {
  const stock = STOCKS.find((s) => s.symbol.toLowerCase() === symbol.toLowerCase())
  const market = useMarket()
  const quotes = useQuotes()

  if (!stock) {
    return (
      <main>
        <section className="page-head">
          <h1>Not a Coinbase stock token</h1>
          <p className="lede">“{symbol}” is not on the list of Coinbase-issued stock tokens on Base.</p>
          <a className="btn btn-outline" href="#/stocks">See all stocks</a>
        </section>
      </main>
    )
  }

  const row = market.rows?.find((r) => r.stock.symbol === stock.symbol)
  const scan = `https://basescan.org/token/${stock.address}`

  return (
    <main>
      <a className="back" href="#/stocks">← All stocks</a>
      <section className="stock-head">
        <Tile stock={stock} size={64} />
        <div>
          <div className="eyebrow">Coinbase-issued · Base</div>
          <h1>{stock.name} <span className="ticker">{stock.symbol}</span></h1>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="eyebrow">DEX price</div>
          <div className="stat-value serif" data-testid="stock-price">
            {market.loading ? '…' : row?.price == null ? '—' : fmtUsd(row.price)}
          </div>
          {row && <div className={`delta ${changeClass(row.change)}`}>{fmtChange(row.change)} <span>past 24h</span></div>}
        </div>
        <div className="stat">
          <div className="eyebrow">Pool liquidity</div>
          <div className="stat-value">{row?.tradable ? fmtCompactUsd(row.liquidity) : '—'}</div>
          {row?.thin && <div className="down small">Thin liquidity. Expect heavy slippage on larger swaps.</div>}
          {row && !row.tradable && <div className="sub">No DEX pool yet, so there is no price and nowhere to buy.</div>}
        </div>
        {owner && <YourPosition stock={stock} owner={owner} />}
      </section>

      {row?.tradable && <PriceChart pool={quotes.data?.[stock.address]?.pool} symbol={stock.symbol} />}

      {row?.tradable && (
        <section className="block">
          <h2>Where to swap {stock.symbol}</h2>
          <p className="sub">Links open the exchange with USDC in and {stock.symbol} out. You confirm everything on their site.</p>
          <ul className="venues">
            {VENUES.map((v) => (
              <li key={v.id}>
                <span className="venue-name">{v.name}</span>
                <span className={v.id === 'aerodrome' ? 'note up' : 'note'}>{v.note}</span>
                <a className="btn btn-outline" href={v.url(stock)} target="_blank" rel="noreferrer noopener" aria-label={`Swap ${stock.symbol} on ${v.name}`}>
                  Open
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="block">
        <h2>Contract</h2>
        <div className="contract">
          <code data-testid="contract">{stock.address}</code>
          <div className="contract-actions">
            <CopyButton text={stock.address} label="Copy address" />
            <a className="btn btn-outline" href={scan} target="_blank" rel="noreferrer noopener">BaseScan</a>
          </div>
        </div>
        <p className="sub">
          Check this address before you swap. Tokens with the same name at other addresses are not issued by Coinbase.
          {' '}{stock.decimals} decimals. Not financial advice.
        </p>
      </section>
    </main>
  )
}
