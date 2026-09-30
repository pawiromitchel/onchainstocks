import { useQuery } from '@tanstack/react-query'
import { STOCKS, type Stock } from '../tokens'

export type Quote = { price: number; change: number | null; liquidity: number }

// Below this pool size a quoted price is easy to move, so the UI flags it.
export const THIN_LIQUIDITY_USD = 25_000

type Pair = {
  baseToken: { address: string }
  priceUsd?: string
  priceChange?: { h24?: number }
  liquidity?: { usd?: number }
}

// DexScreener takes at most 30 addresses per request.
async function fetchPairs(addresses: string[]): Promise<Pair[]> {
  const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${addresses.join(',')}`)
  if (!res.ok) throw new Error(`Price API returned ${res.status}`)
  return res.json()
}

async function fetchQuotes(): Promise<Record<string, Quote>> {
  const addrs = STOCKS.map((s) => s.address)
  const chunks: string[][] = []
  for (let i = 0; i < addrs.length; i += 30) chunks.push(addrs.slice(i, i + 30))
  const pairs = (await Promise.all(chunks.map(fetchPairs))).flat()

  // Several pools can exist per token; the deepest one is the most trustworthy price.
  const out: Record<string, Quote> = {}
  for (const p of pairs) {
    const key = p.baseToken.address.toLowerCase()
    const liquidity = p.liquidity?.usd ?? 0
    const price = Number(p.priceUsd)
    if (!price || (out[key] && out[key].liquidity >= liquidity)) continue
    out[key] = { price, change: p.priceChange?.h24 ?? null, liquidity }
  }
  return out
}

export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: fetchQuotes,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
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
