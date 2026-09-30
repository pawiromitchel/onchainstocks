import { useQuery } from '@tanstack/react-query'
import { erc20Abi, formatUnits, type Address } from 'viem'
import { base } from 'wagmi/chains'
import { useReadContracts } from 'wagmi'
import { STOCKS, type Stock } from '../tokens'

type Quote = { price: number; change: number | null; liquidity: number }

// Below this pool size a quoted price is easy to move, so the UI flags it.
export const THIN_LIQUIDITY_USD = 25_000

async function fetchQuotes(): Promise<Record<string, Quote>> {
  const addrs = STOCKS.map((s) => s.address).join(',')
  const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${addrs}`)
  if (!res.ok) throw new Error(`Price API returned ${res.status}`)
  const pairs: Array<{
    baseToken: { address: string }
    priceUsd?: string
    priceChange?: { h24?: number }
    liquidity?: { usd?: number }
  }> = await res.json()

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

export type Row = {
  stock: Stock
  amount: number
  price: number | null
  change: number | null
  value: number
  thin: boolean
}

export function usePortfolio(owner: Address | undefined) {
  const quotes = useQuery({
    queryKey: ['quotes'],
    queryFn: fetchQuotes,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const balances = useReadContracts({
    allowFailure: false,
    query: { enabled: !!owner, refetchInterval: 30_000 },
    contracts: STOCKS.flatMap((s) => [
      { chainId: base.id, address: s.address, abi: erc20Abi, functionName: 'balanceOf', args: [owner!] } as const,
      { chainId: base.id, address: s.address, abi: erc20Abi, functionName: 'decimals' } as const,
    ]),
  })

  let rows: Row[] | undefined
  if (balances.data) {
    rows = STOCKS.map((stock, i) => {
      const raw = balances.data[i * 2] as bigint
      const decimals = balances.data[i * 2 + 1] as number
      const amount = Number(formatUnits(raw, decimals))
      const q = quotes.data?.[stock.address]
      const price = q?.price ?? null
      return {
        stock,
        amount,
        price,
        change: q?.change ?? null,
        value: price === null ? 0 : amount * price,
        thin: !!q && q.liquidity < THIN_LIQUIDITY_USD,
      }
    })
  }

  const held = rows?.filter((r) => r.amount > 0).sort((a, b) => b.value - a.value) ?? []
  const notHeld = rows?.filter((r) => r.amount === 0) ?? []
  const total = held.reduce((sum, r) => sum + r.value, 0)
  // 24h move in dollars: value now minus value a day ago, from each token's own % change.
  const delta = held.reduce(
    (sum, r) => (r.change === null ? sum : sum + r.value - r.value / (1 + r.change / 100)),
    0,
  )
  const prev = total - delta

  return {
    loading: !!owner && balances.isLoading,
    error: balances.error ?? quotes.error ?? null,
    pricesReady: !!quotes.data,
    held,
    notHeld,
    total,
    delta,
    deltaPct: prev > 0 ? (delta / prev) * 100 : 0,
  }
}
