import type { Address } from 'viem'

export type Stock = {
  symbol: string
  name: string
  address: Address
  mono: string
  /** tile color on light / dark themes */
  light: string
  dark: string
}

// Coinbase tokenized stocks on Base. Source: https://www.base.org/stocks
// Addresses and symbols were cross-checked against on-chain symbol() and DexScreener.
// Only tokens on this allowlist are ever read, so look-alike tokens cannot show up.
export const STOCKS: Stock[] = [
  { symbol: 'NVDAc', name: 'NVIDIA', address: '0xb20000000000000000000078ee7ce2fe4908108c', mono: 'N', light: '#4f7a0a', dark: '#9be04a' },
  { symbol: 'METAc', name: 'Meta', address: '0xb2000000000000000000008bc8786b856e61707c', mono: 'M', light: '#1f3a5f', dark: '#6ea8ff' },
  { symbol: 'AAPLc', name: 'Apple', address: '0xb200000000000000000000c2e324d24d7eecd1fb', mono: 'A', light: '#4a4f57', dark: '#c4c9d1' },
  { symbol: 'GOOGLc', name: 'Alphabet', address: '0xb2000000000000000000002d0ba3164cc74f58b7', mono: 'G', light: '#7a3b69', dark: '#d98bd0' },
  { symbol: 'AMZNc', name: 'Amazon', address: '0xb200000000000000000000d9192b6b456483c2e8', mono: 'A', light: '#8a5a00', dark: '#ffb347' },
  { symbol: 'MSFTc', name: 'Microsoft', address: '0xb200000000000000000000ab99cfa739e253872b', mono: 'M', light: '#0f6b73', dark: '#4fd1c5' },
  { symbol: 'MSTRc', name: 'Strategy', address: '0xb2000000000000000000004884b426556b92883d', mono: 'S', light: '#a3342c', dark: '#ff7b72' },
  { symbol: 'SNDKc', name: 'SanDisk', address: '0xb200000000000000000000397293cb8cda9a10c5', mono: 'S', light: '#8a2f52', dark: '#ff7fa8' },
  { symbol: 'SPCXc', name: 'SpaceX', address: '0xb2000000000000000000007b9fcbd005511acbd5', mono: 'S', light: '#3d4f8a', dark: '#8fa2ff' },
  { symbol: 'TSLAc', name: 'Tesla', address: '0xb2000000000000000000001e800a7f5189430cd0', mono: 'T', light: '#b3401a', dark: '#ff8a5c' },
]
