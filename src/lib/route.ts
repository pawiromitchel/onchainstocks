import { useSyncExternalStore } from 'react'

// Hash routing keeps this a plain static site: #/view/<0x address | name.eth>
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useViewTarget(): string | null {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const m = hash.match(/^#\/view\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

export function viewWallet(target: string) {
  window.location.hash = `/view/${encodeURIComponent(target)}`
}

export function leaveView() {
  history.pushState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
