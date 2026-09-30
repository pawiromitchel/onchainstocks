import { useSyncExternalStore } from 'react'

// Hash routing keeps this a plain static site:
//   #/                    landing (or the connected portfolio)
//   #/stocks              every Coinbase stock token with its DEX price
//   #/stock/<SYMBOL>      one stock: price, liquidity, contract, venues
//   #/about               FAQ
//   #/view/<0x | name.eth> someone's portfolio, view only
export type Route =
  | { name: 'home' }
  | { name: 'stocks' }
  | { name: 'stock'; symbol: string }
  | { name: 'about' }
  | { name: 'view'; target: string }

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function parseRoute(hash: string): Route {
  const [, page, arg] = hash.match(/^#\/([^/]*)\/?(.*)$/) ?? []
  const value = arg ? decodeURIComponent(arg) : ''
  if (page === 'stocks') return { name: 'stocks' }
  if (page === 'about') return { name: 'about' }
  if (page === 'stock' && value) return { name: 'stock', symbol: value }
  if (page === 'view' && value) return { name: 'view', target: value }
  return { name: 'home' }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseRoute(hash)
}

export const stockHref = (symbol: string) => `#/stock/${encodeURIComponent(symbol)}`
export const viewHref = (target: string) => `#/view/${encodeURIComponent(target)}`

export function viewWallet(target: string) {
  window.location.hash = `/view/${encodeURIComponent(target)}`
}

export function leaveView() {
  history.pushState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
