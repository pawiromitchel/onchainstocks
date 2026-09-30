// DexScreener takes at most 30 token addresses per request. Shared by the app (useQuotes) and
// vite.config.ts, which starts these requests from index.html before the app has loaded.
export function quoteUrls(addresses: string[]): string[] {
  const urls: string[] = []
  for (let i = 0; i < addresses.length; i += 30) {
    urls.push(`https://api.dexscreener.com/tokens/v1/base/${addresses.slice(i, i + 30).join(',')}`)
  }
  return urls
}
