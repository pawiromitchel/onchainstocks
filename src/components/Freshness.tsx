import { useEffect, useState } from 'react'
import { fmtAgo } from '../lib/format'

// "Updated 12s ago" plus a manual refresh, so a price screen never looks frozen.
export function Freshness({ updatedAt, fetching, onRefresh }: { updatedAt: number; fetching: boolean; onRefresh: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(id)
  }, [])

  const known = Number.isFinite(updatedAt) && updatedAt > 0
  return (
    <div className="fresh">
      <span data-testid="freshness">{fetching ? 'Updating…' : known ? `Updated ${fmtAgo(now - updatedAt)}` : 'Loading…'}</span>
      <button className="icon-btn sm" onClick={onRefresh} disabled={fetching} aria-label="Refresh prices and balances">
        <svg className={fetching ? 'spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
      </button>
    </div>
  )
}
