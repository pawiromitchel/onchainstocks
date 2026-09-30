import type { Address } from 'viem'
import raw from './stocks.json'

export type Stock = {
  symbol: string
  name: string
  address: Address
  decimals: number
  icon: string | null
  mono: string
  /** tile / chart color on light and dark themes */
  light: string
  dark: string
}

// The token list is the official Coinbase tokenized stocks API, snapshotted into
// stocks.json by `npm run sync` (runs on every build, and daily in CI).
// Only addresses on this allowlist are ever read, so look-alike tokens cannot show up.

// Hand-picked colors for the original launch set; everything else gets a stable hue from its ticker.
const CURATED: Record<string, { name: string; light: string; dark: string }> = {
  NVDAc: { name: 'NVIDIA', light: '#4f7a0a', dark: '#9be04a' },
  METAc: { name: 'Meta', light: '#1f3a5f', dark: '#6ea8ff' },
  AAPLc: { name: 'Apple', light: '#4a4f57', dark: '#c4c9d1' },
  GOOGLc: { name: 'Alphabet', light: '#7a3b69', dark: '#d98bd0' },
  AMZNc: { name: 'Amazon', light: '#8a5a00', dark: '#ffb347' },
  MSFTc: { name: 'Microsoft', light: '#0f6b73', dark: '#4fd1c5' },
  MSTRc: { name: 'Strategy', light: '#a3342c', dark: '#ff7b72' },
  SNDKc: { name: 'SanDisk', light: '#8a2f52', dark: '#ff7fa8' },
  SPCXc: { name: 'SpaceX', light: '#3d4f8a', dark: '#8fa2ff' },
  TSLAc: { name: 'Tesla', light: '#b3401a', dark: '#ff8a5c' },
}

function hue(symbol: string) {
  let h = 0
  for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

// "Advanced Micro Devices, Inc." -> "Advanced Micro Devices"
function shortName(name: string) {
  let n = name.trim()
  const suffix = /[,\s]+(Inc\.?|Corporation|Corp\.?|Co\.?|Company|Ltd\.?|Holdings?,? Inc\.?|Group|& Co\.?)$/i
  while (suffix.test(n)) n = n.replace(suffix, '')
  return n
}

export const STOCKS: Stock[] = raw.map((t) => {
  const c = CURATED[t.symbol]
  const h = hue(t.symbol)
  return {
    symbol: t.symbol,
    name: c?.name ?? shortName(t.name),
    address: t.address as Address,
    decimals: t.decimals,
    icon: t.icon,
    mono: (c?.name ?? t.name)[0].toUpperCase(),
    light: c?.light ?? `hsl(${h} 55% 32%)`,
    dark: c?.dark ?? `hsl(${h} 70% 68%)`,
  }
})
