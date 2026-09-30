// Wallets looked up view-only, newest first. Per browser only; storage can be blocked, so every access is guarded.
const KEY = 'recent-lookups'
const MAX = 5

export function recentLookups(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function rememberLookup(target: string) {
  try {
    const rest = recentLookups().filter((t) => t.toLowerCase() !== target.toLowerCase())
    localStorage.setItem(KEY, JSON.stringify([target, ...rest].slice(0, MAX)))
  } catch {
    /* ignore */
  }
}

export function forgetLookups() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
