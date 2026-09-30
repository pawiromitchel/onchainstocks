# onchainstocks

Onchain Stocks: a stock-only portfolio viewer for [Coinbase tokenized stocks on Base](https://www.base.org/stocks).

- Connect MetaMask, Rabby or any other EVM wallet and see your balances of every Coinbase-issued stock token on Base (40 at the time of writing).
- Buy or swap links per stock (Aerodrome first, plus Uniswap, Matcha, 1inch and CoW Swap).
- **View-only mode:** paste any `0x` address or `name.eth` to look up a wallet. No buy buttons, nothing to sign. Shareable as `#/view/<address or ens>`.
- Light and OLED dark themes, with [Motion](https://motion.dev) animations that respect the visitor's reduced-motion setting.
- Fully static: no backend, no database. Balances are read straight from Base, prices from DexScreener.

## Develop

```bash
npm install
npm run dev
```

Optional environment variables (for example in `.env.local`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_BASE_RPC` | Base RPC endpoint | `https://base-rpc.publicnode.com` |
| `VITE_MAINNET_RPC` | Ethereum mainnet RPC, used only for ENS | `https://ethereum-rpc.publicnode.com` |

The public RPCs are rate limited. For heavy use, point these at your own Alchemy, Infura or QuickNode key. Note that any `VITE_` value ends up in the public bundle.

## Test

```bash
npm run test:e2e
```

Playwright drives a real Chromium on a desktop and a phone viewport. A fake EIP-6963 wallet stands in for MetaMask or Rabby, and the Base RPC and DexScreener are mocked, so the suite is fast, deterministic and needs no network. It covers connect, disconnect, reconnect on reload, view-only lookup, the venue menu, the expandable stock list, theme persistence, horizontal overflow and animation completion. CI runs it on every push and pull request (`.github/workflows/test.yml`). Failed runs upload traces.

Not covered: ENS resolution against the real mainnet, and whether each exchange's deep link still opens the right pair. Check those by hand.

## Deploy to GitHub Pages

Three workflows live in `.github/workflows/`:

| Workflow | Runs | Does |
| --- | --- | --- |
| `test.yml` | every PR and push to `main` | type check, lint, Playwright e2e |
| `deploy.yml` | every push to `main` (so, when a PR is merged) and on demand | `npm run build`, then publishes `dist/` to the `gh-pages` branch |
| `sync-stocks.yml` | daily at 05:17 UTC and on demand | refreshes `src/stocks.json`; if it changed, commits it and triggers `deploy.yml` |

One-time setup: repo **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root** (the branch appears after the first deploy run). Also make sure **Settings → Actions → General → Workflow permissions** allows read and write.

The build uses a relative base path and hash routing, so it works at `https://onchainstocks.pawiromitchel.com/` (custom domain, set by the `cname` input in `deploy.yml`) or on any other path, such as `https://pawiromitchel.github.io/onchainstocks/`, without changes. DNS: a `CNAME` record `onchainstocks` -> `pawiromitchel.github.io` (Cloudflare proxy off until GitHub issues the certificate). If you protect `main`, allow the Actions bot to push, or the sync commit will fail. Consider making the `test` check required before merging.

## How it works

- `src/stocks.json` is a snapshot of the official [Coinbase tokenized stocks API](https://docs.base.org/sdks/tokenized-stocks/api-reference/list-tokenized-stocks) (`npm run sync`; the `sync-stocks.yml` workflow runs it daily). The API sends no CORS headers, so the browser can't call it directly. The daily sync workflow commits `src/stocks.json` when it changed and redeploys, so new listings appear without a code change.
- `src/tokens.ts` turns that snapshot into the allowlist of token addresses. Nothing outside it is ever read.
- `src/hooks/usePortfolio.ts` multicalls `balanceOf` on Base, and pulls prices and 24h change from the deepest DEX pool per token. Pools under $25k liquidity are flagged as thin (for example MSTRc and TSLAc at the time of writing). Stocks with no DEX pool yet have no buy button.
- `src/lib/venues.ts` builds the swap deep links. Click-test them if you change them.

## Caveats

- Prices are DEX pool prices, not stock exchange prices. They can drift from the real market, especially outside market hours.
- Tokenized stocks are not available in all regions. Not financial advice.
