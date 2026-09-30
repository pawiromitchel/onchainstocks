import { m, type Variants } from 'motion/react'
import { useState } from 'react'
import { isAddress } from 'viem'
import { shortAddr } from '../lib/format'
import { forgetLookups, recentLookups } from '../lib/recent'
import { viewHref, viewWallet } from '../lib/route'
import { STOCKS } from '../tokens'
import { MarketTable } from './Market'

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item: Variants = {
  hidden: { opacity: 0.001, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

const STEPS = [
  ['Connect or look up', 'Any EVM wallet, or paste an address or ENS name to look without connecting.'],
  ['See only stock tokens', `Balances for the ${STOCKS.length} Coinbase-issued stock tokens on Base. Nothing else is read.`],
  ['Buy on an exchange', 'Each stock links to Aerodrome and other DEXs. You confirm the swap on their site.'],
]

export function Landing({ onConnect }: { onConnect: () => void }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState(recentLookups)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!isAddress(q, { strict: false }) && !/^[^\s.]+(\.[^\s.]+)+$/.test(q)) {
      setError('Enter a 0x address or an ENS name like name.eth')
      return
    }
    setError('')
    viewWallet(q)
  }

  return (
    <main>
      <m.div className="hero-grid" variants={container} initial="hidden" animate="show">
        <div className="hero">
          <m.span className="tag" variants={item}><i className="dot-base" />Coinbase-issued tokenized stocks · Base only</m.span>
          <m.h1 variants={item}>Only your stocks. <em>Nothing else.</em></m.h1>
          <m.p className="lede" variants={item}>
            Connect any EVM wallet and see your Coinbase tokenized stock balances on Base in one clean list, with a buy
            link next to each one. Other chains and other issuers are not supported.
          </m.p>
          <m.div className="hero-cta" variants={item}>
            <button className="btn btn-lg" onClick={onConnect}>Connect wallet</button>
            <p className="fine">Read-only. This site never asks for signatures<br />or approvals. Swaps happen on the exchange.</p>
          </m.div>

          <m.form className="lookup" onSubmit={submit} variants={item}>
            <label htmlFor="lookup">Or look up any wallet, view only</label>
            <div className="lookup-row">
              <input
                id="lookup"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="0x… or name.eth"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? 'lookup-error' : undefined}
              />
              <button className="btn btn-outline" type="submit">View portfolio</button>
            </div>
            {error && <p id="lookup-error" className="form-error" role="alert">{error}</p>}
            {recent.length > 0 && (
              <div className="recent">
                <span className="sub">Recent</span>
                {recent.map((t) => (
                  <a key={t} href={viewHref(t)}>{isAddress(t, { strict: false }) ? shortAddr(t) : t}</a>
                ))}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    forgetLookups()
                    setRecent([])
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </m.form>
        </div>

        <m.aside className="how" variants={item} aria-labelledby="how-title">
          <h2 id="how-title">How it works</h2>
          <ol>
            {STEPS.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <a className="more-link" href="#/about">Questions? Read the FAQ →</a>
        </m.aside>
      </m.div>

      <section className="block">
        <div className="block-head">
          <h2>Deepest pools on Base</h2>
          <a className="more-link" href="#/stocks">See all {STOCKS.length} stocks →</a>
        </div>
        <MarketTable limit={8} />
      </section>
    </main>
  )
}
