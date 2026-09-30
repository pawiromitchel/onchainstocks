import { m, type Variants } from 'motion/react'
import { useState } from 'react'
import { isAddress } from 'viem'
import { viewWallet } from '../lib/route'

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function Landing({ onConnect }: { onConnect: () => void }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

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
    <m.main className="hero" variants={container} initial="hidden" animate="show">
      <m.span className="tag" variants={item}><i className="dot-base" />Coinbase-issued tokenized stocks · Base only</m.span>
      <m.h1 variants={item}>Only your stocks. <em>Nothing else.</em></m.h1>
      <m.p className="lede" variants={item}>
        Connect any EVM wallet and see your Coinbase tokenized stock balances on Base in one clean list, with a buy
        link next to each one. Other chains and other issuers are not supported.
      </m.p>
      <m.div className="hero-cta" variants={item}>
        <button className="btn btn-lg" onClick={onConnect}>Connect wallet</button>
        <p className="fine">Read-only. We never ask you to sign<br />anything until you choose to swap.</p>
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
      </m.form>
    </m.main>
  )
}
