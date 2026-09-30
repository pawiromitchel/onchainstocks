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
