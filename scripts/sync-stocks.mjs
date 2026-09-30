// Pulls the official list of Coinbase tokenized stocks into src/stocks.json.
// The API sends no CORS headers, so the browser can't call it; we snapshot it at build time.
// If the API is unreachable, the existing snapshot is kept and the build continues.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'

const API = 'https://api.coinbase.com/v1/tokenized-stocks'
const OUT = new URL('../src/stocks.json', import.meta.url)

try {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { tokens } = await res.json()
  if (!Array.isArray(tokens) || tokens.length === 0) throw new Error('empty token list')

  const stocks = tokens
    .map((t) => ({
      symbol: t.symbol,
      name: t.name,
      address: t.contract_address.toLowerCase(),
      decimals: t.decimals,
      icon: t.icon_url ?? null,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol))

  mkdirSync(new URL('../src/', import.meta.url), { recursive: true })
  writeFileSync(OUT, JSON.stringify(stocks, null, 2) + '\n')
  console.log(`Synced ${stocks.length} tokenized stocks`)
} catch (err) {
  if (existsSync(OUT)) {
    console.warn(`Stock sync failed (${err.message}); keeping existing src/stocks.json`)
  } else {
    console.error(`Stock sync failed and no snapshot exists: ${err.message}`)
    process.exit(1)
  }
}
