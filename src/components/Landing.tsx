import { useState } from 'react'
import { isAddress } from 'viem'
import { viewWallet } from '../lib/route'

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
    <main className="hero">
      <span className="tag"><i className="dot-base" />Coinbase-issued tokenized stocks · Base only</span>
      <h1>Only your stocks. <em>Nothing else.</em></h1>
      <p className="lede">
        Connect any EVM wallet and see your Coinbase tokenized stock balances on Base in one clean list, with a buy
        link next to each one. Other chains and other issuers are not supported.
      </p>
      <div className="hero-cta">
        <button className="btn btn-lg" onClick={onConnect}>Connect wallet</button>
        <p className="fine">Read-only. We never ask you to sign<br />anything until you choose to swap.</p>
      </div>

      <form className="lookup" onSubmit={submit}>
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
      </form>
    </main>
  )
}
