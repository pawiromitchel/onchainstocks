const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const fmtUsd = (n: number) => usd.format(n)

export function fmtAmount(n: number) {
  if (n === 0) return '0'
  if (n < 0.0001) return '<0.0001'
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 4 : 3 })
}

export function fmtChange(n: number | null) {
  if (n === null) return '—'
  return `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })

/** Pool sizes: "$1.2M", "$840K". */
export const fmtCompactUsd = (n: number) => (n < 1000 ? `$${Math.round(n)}` : compact.format(n))

/** Dollar moves too small for cents ("+$0.00" looks broken) get shown as "<$0.01". */
export const fmtUsdMove = (n: number) => (n > 0 && n < 0.005 ? '<$0.01' : usd.format(n))

export function fmtAgo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return `${Math.floor(s / 3600)} h ago`
}

export const changeClass = (c: number | null) => (c === null ? '' : c >= 0 ? 'up' : 'down')
