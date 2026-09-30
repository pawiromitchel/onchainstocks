import { queryOptions, useQuery } from '@tanstack/react-query'
import { quoteUrls } from '../lib/dexscreener'
import { STOCKS, type Stock } from '../tokens'

declare global {
  interface Window {
    /** Price requests started by an inline script in index.html (see vite.config.ts). */
    __quotes?: Promise<unknown[]>
  }
}

export type Quote = { price: number; change: number | null; liquidity: number }

// Below this pool size a quoted price is easy to move, so the UI flags it.
export const THIN_LIQUIDITY_USD = 25_000

type Pair = {
  baseToken: { address: string }
  priceUsd?: string
  priceChange?: { h24?: number }
  liquidity?: { usd?: number }
}

async function fetchPairs(url: string): Promise<Pair[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Price API returned ${res.status}`)
  return res.json()
}

// The first load reuses the requests index.html already started; later refreshes fetch as usual.
async function loadPairs(): Promise<Pair[][]> {
  const early = window.__quotes as Promise<Pair[][]> | undefined
  window.__quotes = undefined
  if (early) {
    try {
      return await early
    } catch {
      /* fall through and try again */
    }
  }
  return Promise.all(quoteUrls(STOCKS.map((s) => s.address)).map(fetchPairs))
}

// The last prices are kept in the browser so a repeat visit shows numbers at once (with their
// age in the freshness line) while fresh ones load. Older than an hour is not worth showing.
const CACHE_KEY = 'quotes-cache'
const CACHE_MAX_AGE = 60 * 60_000

function readCache(): { at: number; data: Record<string, Quote> } | undefined {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    return c && typeof c.at === 'number' && Date.now() - c.at < CACHE_MAX_AGE ? c : undefined
  } catch {
    return undefined
  }
}

function writeCache(data: Record<string, Quote>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* storage can be full or blocked; the cache is only a head start */
  }
}

async function fetchQuotes(): Promise<Record<string, Quote>> {
  const pairs = (await loadPairs()).flat()

  // Several pools can exist per token; the deepest one is the most trustworthy price.
  const out: Record<string, Quote> = {}
  for (const p of pairs) {
    const key = p.baseToken.address.toLowerCase()
    const liquidity = p.liquidity?.usd ?? 0
    const price = Number(p.priceUsd)
    if (!price || (out[key] && out[key].liquidity >= liquidity)) continue
    out[key] = { price, change: p.priceChange?.h24 ?? null, liquidity }
  }
  writeCache(out)
  return out
}

const cached = readCache()

export const quotesQuery = queryOptions({
  queryKey: ['quotes'],
  queryFn: fetchQuotes,
  refetchInterval: 60_000,
  staleTime: 30_000,
  // Cached prices are older than staleTime, so they are shown and refetched right away.
  initialData: cached?.data,
  initialDataUpdatedAt: cached?.at,
})

export function useQuotes() {
  return useQuery(quotesQuery)
}

export type MarketRow = {
  stock: Stock
  price: number | null
  change: number | null
  liquidity: number
  thin: boolean
  /** has a DEX pool, so there is somewhere to buy it */
  tradable: boolean
}

export function toMarketRow(stock: Stock, q: Quote | undefined): MarketRow {
  return {
    stock,
    price: q?.price ?? null,
    change: q?.change ?? null,
    liquidity: q?.liquidity ?? 0,
    thin: !!q && q.liquidity < THIN_LIQUIDITY_USD,
    tradable: !!q,
  }
}

/** Every stock on the allowlist with its quote, deepest pools first; stocks without a pool go last. */
export function useMarket() {
  const quotes = useQuotes()
  const rows = quotes.data
    ? STOCKS.map((s) => toMarketRow(s, quotes.data[s.address])).sort((a, b) => b.liquidity - a.liquidity)
    : undefined
  return {
    rows,
    loading: quotes.isLoading,
    error: quotes.error,
    updatedAt: quotes.dataUpdatedAt,
    refetch: quotes.refetch,
    fetching: quotes.isFetching,
  }
}
