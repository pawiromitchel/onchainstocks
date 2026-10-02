// Price history comes from GeckoTerminal (free, allows browser calls). DexScreener has none.
export type Range = '7d' | '30d'
export type Point = { t: number; price: number }

// 7D: hourly closes (168 points). 30D: 4-hour closes (180 points).
export const RANGES: Record<Range, { label: string; aggregate: number; limit: number; note: string }> = {
  '7d': { label: '7D', aggregate: 1, limit: 168, note: 'Hourly closes' },
  '30d': { label: '30D', aggregate: 4, limit: 180, note: '4-hour closes' },
}

export const historyUrl = (pool: string, range: Range) =>
  `https://api.geckoterminal.com/api/v2/networks/base/pools/${pool}/ohlcv/hour?aggregate=${RANGES[range].aggregate}&limit=${RANGES[range].limit}`

type Response = { data?: { attributes?: { ohlcv_list?: number[][] } } }

export async function fetchHistory(pool: string, range: Range): Promise<Point[]> {
  const res = await fetch(historyUrl(pool, range))
  if (!res.ok) throw new Error(`History API returned ${res.status}`)
  const list = ((await res.json()) as Response).data?.attributes?.ohlcv_list ?? []
  // Candles arrive newest first as [time, open, high, low, close, volume].
  return list
    .filter((c) => c[4] > 0)
    .map((c) => ({ t: c[0] * 1000, price: c[4] }))
    .sort((a, b) => a.t - b.t)
}
