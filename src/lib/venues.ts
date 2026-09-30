import type { Stock } from '../tokens'

export type Venue = { id: string; name: string; note: string; url: (s: Stock) => string }

const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'

// Deep links put the stock token in the output slot. Formats follow each venue's
// public URL scheme; click-test them after changing anything here.
export const VENUES: Venue[] = [
  { id: 'aerodrome', name: 'Aerodrome', note: 'Deepest liquidity', url: (s) => `https://aerodrome.finance/swap?from=${BASE_USDC}&to=${s.address}` },
  { id: 'uniswap', name: 'Uniswap', note: 'Base', url: (s) => `https://app.uniswap.org/swap?chain=base&inputCurrency=${BASE_USDC}&outputCurrency=${s.address}` },
  { id: 'matcha', name: 'Matcha', note: 'Aggregator', url: (s) => `https://matcha.xyz/tokens/base/${s.address}` },
  { id: '1inch', name: '1inch', note: 'Aggregator', url: (s) => `https://app.1inch.io/#/8453/simple/swap/${BASE_USDC}/${s.address}` },
  { id: 'cow', name: 'CoW Swap', note: 'MEV protected', url: (s) => `https://swap.cow.fi/#/8453/swap/${BASE_USDC}/${s.address}` },
]

export const primaryVenue = VENUES[0]
