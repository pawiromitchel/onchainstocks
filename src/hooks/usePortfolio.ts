import { erc20Abi, formatUnits, type Address } from 'viem'
import { base } from 'wagmi/chains'
import { useReadContracts } from 'wagmi'
import { STOCKS } from '../tokens'
import { toMarketRow, useQuotes, type MarketRow } from './useQuotes'

export type Row = MarketRow & {
  amount: number
  value: number
}

export function usePortfolio(owner: Address | undefined) {
  const quotes = useQuotes()

  const balances = useReadContracts({
    allowFailure: false,
    query: { enabled: !!owner, refetchInterval: 30_000 },
    contracts: STOCKS.map(
      (s) => ({ chainId: base.id, address: s.address, abi: erc20Abi, functionName: 'balanceOf', args: [owner!] }) as const,
    ),
  })

  let rows: Row[] | undefined
  if (balances.data) {
    rows = STOCKS.map((stock, i) => {
      const amount = Number(formatUnits(balances.data[i] as bigint, stock.decimals))
      const m = toMarketRow(stock, quotes.data?.[stock.address])
      return { ...m, amount, value: m.price === null ? 0 : amount * m.price }
    })
  }

  const held = rows?.filter((r) => r.amount > 0).sort((a, b) => b.value - a.value) ?? []
  // Only offer stocks that can actually be bought, deepest pools first.
  const notHeld = (rows?.filter((r) => r.amount === 0 && r.tradable) ?? []).sort((a, b) => b.liquidity - a.liquidity)
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
    totalCount: STOCKS.length,
    total,
    delta,
    deltaPct: prev > 0 ? (delta / prev) * 100 : 0,
    // The older of the two sources is what the screen is really showing.
    updatedAt: Math.min(balances.dataUpdatedAt || Infinity, quotes.dataUpdatedAt || Infinity),
    fetching: balances.isFetching || quotes.isFetching,
    refresh: () => Promise.all([balances.refetch(), quotes.refetch()]),
  }
}
